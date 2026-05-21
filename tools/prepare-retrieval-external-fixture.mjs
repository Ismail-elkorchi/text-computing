import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const SOURCE = {
  datasetId: "beir/nfcorpus",
  datasetVersion: "beir-nfcorpus-md5-a89dba18a62ef92f7d323ec890a0d38d",
  split: "test",
  license: "cc-by-sa-4.0",
  sourceUrl: "https://public.ukp.informatik.tu-darmstadt.de/thakur/BEIR/datasets/nfcorpus.zip",
  md5: "a89dba18a62ef92f7d323ec890a0d38d",
};

const QUERIES = ["PLAIN-2", "PLAIN-23"];
const DOCUMENTS = ["MED-10", "MED-14", "MED-118", "MED-2427", "MED-2651"];

function sha256Json(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function normalizeTokens(text) {
  return text
    .normalize("NFC")
    .toLocaleLowerCase("und")
    .split(/[^\p{Letter}\p{Number}]+/u)
    .filter((token) => token.length > 0);
}

function jsonLines(text) {
  return text
    .trim()
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function parseQrels(text) {
  return text
    .trim()
    .split(/\r?\n/u)
    .slice(1)
    .map((line) => {
      const [queryId, docId, grade] = line.split("\t");
      return { queryId, docId, grade: Number.parseInt(grade ?? "0", 10) };
    });
}

async function downloadZipBytes() {
  const response = await fetch(SOURCE.sourceUrl);
  if (!response.ok || response.body === null) {
    throw new Error(`download failed: ${SOURCE.sourceUrl} (${response.status})`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const md5 = createHash("md5").update(bytes).digest("hex");
  if (md5 !== SOURCE.md5) {
    throw new Error(`download checksum mismatch: ${md5} != ${SOURCE.md5}`);
  }
  return bytes;
}

function unzipText(zipBytes, innerPath) {
  return execFileSync("python3", ["-c", "import io, sys, zipfile; print(zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())).read(sys.argv[1]).decode('utf-8'), end='')", innerPath], {
    input: zipBytes,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
}

function buildArtifacts({ corpusRows, queryRows, qrelsRows }) {
  const corpusById = new Map(corpusRows.map((entry) => [entry._id, entry]));
  const queryById = new Map(queryRows.map((entry) => [entry._id, entry]));
  const documents = DOCUMENTS.map((id) => {
    const source = corpusById.get(id);
    if (source === undefined) throw new Error(`missing source document ${id}`);
    const title = source.title || source.text;
    return {
      id,
      tokens: normalizeTokens(title),
      metadata: {
        language: "en",
        genre: "external-reference",
        title,
        license: SOURCE.license,
        sourceDataset: SOURCE.datasetId,
        sourceDocumentId: id,
      },
    };
  });
  const querySet = new Set(QUERIES);
  const docSet = new Set(DOCUMENTS);
  const judgments = QUERIES.map((queryId) => {
    const positives = qrelsRows
      .filter((entry) => entry.queryId === queryId && docSet.has(entry.docId) && entry.grade > 0)
      .map((entry) => ({ docId: entry.docId, grade: entry.grade }));
    const ratedDocIds = new Set(positives.map((entry) => entry.docId));
    const controls = DOCUMENTS.filter((docId) => !ratedDocIds.has(docId))
      .slice(0, 2)
      .map((docId) => ({ docId, grade: 0 }));
    if (positives.length === 0) throw new Error(`no positive qrels for ${queryId}`);
    return { queryId, ratings: [...positives, ...controls] };
  });
  for (const queryId of querySet) {
    if (queryById.get(queryId) === undefined) throw new Error(`missing source query ${queryId}`);
  }
  return {
    corpus: {
      id: "corpus-retrieval-beir-nfcorpus-title-subset",
      description: "BEIR NFCorpus title-token subset with external qrels for deterministic retrieval checks.",
      license: SOURCE.license,
      provenance: `${SOURCE.datasetId} ${SOURCE.split} subset from ${SOURCE.sourceUrl}`,
      contentHash: `sha256:${sha256Json(documents)}`,
      thresholds: {
        minDocuments: documents.length,
        minTokens: 50,
        minQueries: QUERIES.length,
        maxSerializedIndexBytes: 50000,
      },
      documents,
    },
    expectedQueries: QUERIES.map((queryId) => ({
      id: queryId,
      raw: queryById.get(queryId).text,
    })),
    qrels: {
      schemaVersion: 1,
      taskId: "nlp-retrieval",
      corpusId: "corpus-retrieval-beir-nfcorpus-title-subset",
      source: {
        datasetId: SOURCE.datasetId,
        datasetVersion: SOURCE.datasetVersion,
        split: SOURCE.split,
        license: SOURCE.license,
        sourceUrl: SOURCE.sourceUrl,
        checksum: `sha256:${sha256Json(judgments)}`,
      },
      judgments,
    },
  };
}

if (process.argv.includes("--write")) {
  throw new Error("write mode is intentionally unsupported; redirect stdout to the target fixture path");
}

const zipBytes = await downloadZipBytes();

const artifacts = buildArtifacts({
  corpusRows: jsonLines(unzipText(zipBytes, "nfcorpus/corpus.jsonl")),
  queryRows: jsonLines(unzipText(zipBytes, "nfcorpus/queries.jsonl")),
  qrelsRows: parseQrels(unzipText(zipBytes, "nfcorpus/qrels/test.tsv")),
});

console.log(JSON.stringify(artifacts, null, 2));

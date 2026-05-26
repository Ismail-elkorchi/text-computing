import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const WRITE_ARG_INDEX = process.argv.indexOf("--write");
const WRITE_PATH = WRITE_ARG_INDEX === -1 ? undefined : process.argv[WRITE_ARG_INDEX + 1];
const ARCHIVE_PATH = process.env.TEXT_COMPUTING_UD_TGZ;

if (!ARCHIVE_PATH) {
  console.error("Set TEXT_COMPUTING_UD_TGZ to a UD treebank archive before deriving aggregate evidence.");
  process.exit(1);
}

if (!existsSync(ARCHIVE_PATH)) {
  console.error("TEXT_COMPUTING_UD_TGZ does not point to an existing archive.");
  process.exit(1);
}

const { segmentSentencesUAX29, segmentWordsUAX29 } = await import(
  pathToFileURL(path.join(ROOT, "packages/textfacts/dist/src/segment/mod.js")).href
);
const textfactsPackage = JSON.parse(
  await readFile(path.join(ROOT, "packages/textfacts/package.json"), "utf8"),
);

function sha256File(filePath) {
  const output = execFileSync("sha256sum", [filePath], { encoding: "utf8" });
  return output.trim().split(/\s+/)[0];
}

function listConlluFiles(root) {
  const output = execFileSync("find", [root, "-type", "f", "-name", "*.conllu", "-print"], {
    encoding: "utf8",
  });
  return output.trim().length === 0 ? [] : output.trim().split("\n").sort();
}

function createEmptyAggregate() {
  return {
    conlluFiles: 0,
    treebanks: 0,
    sentenceTexts: 0,
    codeUnits: 0,
    udTokenRows: 0,
    udMultiwordTokenRows: 0,
    uax29WordSegments: 0,
    uax29SentenceSegments: 0,
    sentenceSegmentMismatchCount: 0,
  };
}

function createEmptySentenceAggregate() {
  return {
    sentenceTexts: 0,
    codeUnits: 0,
    uax29WordSegments: 0,
    uax29SentenceSegments: 0,
    sentenceSegmentMismatchCount: 0,
  };
}

function addAggregate(target, delta) {
  for (const key of Object.keys(target)) target[key] += delta[key] ?? 0;
}

const SCRIPT_TESTS = [
  ["Arabic", /\p{Script=Arabic}/u],
  ["Armenian", /\p{Script=Armenian}/u],
  ["Bengali", /\p{Script=Bengali}/u],
  ["Cyrillic", /\p{Script=Cyrillic}/u],
  ["Devanagari", /\p{Script=Devanagari}/u],
  ["Ethiopic", /\p{Script=Ethiopic}/u],
  ["Georgian", /\p{Script=Georgian}/u],
  ["Greek", /\p{Script=Greek}/u],
  ["Han", /\p{Script=Han}/u],
  ["Hangul", /\p{Script=Hangul}/u],
  ["Hebrew", /\p{Script=Hebrew}/u],
  ["Hiragana", /\p{Script=Hiragana}/u],
  ["Katakana", /\p{Script=Katakana}/u],
  ["Khmer", /\p{Script=Khmer}/u],
  ["Lao", /\p{Script=Lao}/u],
  ["Latin", /\p{Script=Latin}/u],
  ["Thai", /\p{Script=Thai}/u],
];

function dominantScript(text) {
  const counts = new Map();
  for (const char of text) {
    if (!/\p{Letter}/u.test(char)) continue;
    const match = SCRIPT_TESTS.find(([, pattern]) => pattern.test(char));
    const script = match?.[0] ?? "Other";
    counts.set(script, (counts.get(script) ?? 0) + 1);
  }
  if (counts.size === 0) return "Unknown";
  return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0][0];
}

function boundaryRegime(text, script) {
  if (script === "Arabic" || script === "Hebrew") return "right-to-left";
  if (["Han", "Hiragana", "Katakana", "Hangul"].includes(script)) return "cjk";
  if (["Thai", "Lao", "Khmer"].includes(script)) return "southeast-asian-no-space";
  const letters = [...text].filter((char) => /\p{Letter}/u.test(char)).length;
  const spaces = [...text].filter((char) => /\s/u.test(char)).length;
  if (letters > 0 && spaces / letters < 0.02) return "no-space";
  const scripts = new Set([...text].map((char) => dominantScript(char)).filter((value) => value !== "Unknown"));
  if (scripts.size > 1) return "mixed-script";
  return "space-delimited";
}

function parseConllu(text) {
  const sentenceTexts = [];
  let udTokenRows = 0;
  let udMultiwordTokenRows = 0;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("# text = ")) sentenceTexts.push(line.slice("# text = ".length));
    if (line.startsWith("#") || line.trim() === "") continue;
    const [id] = line.split("\t");
    if (/^\d+$/.test(id)) udTokenRows += 1;
    if (/^\d+-\d+$/.test(id)) udMultiwordTokenRows += 1;
  }
  return { sentenceTexts, udTokenRows, udMultiwordTokenRows };
}

const tempParent = process.env.TEXT_COMPUTING_TMPDIR ?? tmpdir();
const tempRoot = await mkdtemp(path.join(tempParent, "text-computing-ud-"));
try {
  execFileSync("tar", ["-xzf", ARCHIVE_PATH, "-C", tempRoot], { stdio: "ignore" });
  const conlluFiles = listConlluFiles(tempRoot);
  const aggregate = createEmptyAggregate();
  const scriptAggregates = new Map();
  const regimeAggregates = new Map();
  const treebanks = new Set();

  aggregate.conlluFiles = conlluFiles.length;
  for (const filePath of conlluFiles) {
    const relative = path.relative(tempRoot, filePath);
    const treebank = relative.split(path.sep).find((part) => part.startsWith("UD_"));
    if (treebank) treebanks.add(treebank);
    const parsed = parseConllu(await readFile(filePath, "utf8"));
    aggregate.udTokenRows += parsed.udTokenRows;
    aggregate.udMultiwordTokenRows += parsed.udMultiwordTokenRows;

    for (const sentenceText of parsed.sentenceTexts) {
      const script = dominantScript(sentenceText);
      const regime = boundaryRegime(sentenceText, script);
      const wordSegments = [...segmentWordsUAX29(sentenceText)].length;
      const sentenceSegments = [...segmentSentencesUAX29(sentenceText)].length;
      const delta = createEmptyAggregate();
      delta.sentenceTexts = 1;
      delta.codeUnits = sentenceText.length;
      delta.uax29WordSegments = wordSegments;
      delta.uax29SentenceSegments = sentenceSegments;
      delta.sentenceSegmentMismatchCount = sentenceSegments === 1 ? 0 : 1;
      addAggregate(aggregate, delta);
      if (!scriptAggregates.has(script)) scriptAggregates.set(script, createEmptySentenceAggregate());
      if (!regimeAggregates.has(regime)) regimeAggregates.set(regime, createEmptySentenceAggregate());
      addAggregate(scriptAggregates.get(script), delta);
      addAggregate(regimeAggregates.get(regime), delta);
    }
  }

  aggregate.treebanks = treebanks.size;
  const report = {
    schemaVersion: 1,
    taskId: "nlp-tokenization-sbd",
    reportId: "tokenization-sbd-corpus-aggregate:ud-2.18",
    generatedAt: "2026-05-20T00:00:00.000Z",
    producer: {
      package: "@ismail-elkorchi/textfacts",
      version: textfactsPackage.version,
      algorithm: "UAX29.Word+UAX29.Sentence aggregate",
    },
    corpus: {
      id: "ud-2.18-full-release",
      name: "Universal Dependencies",
      version: "2.18",
      sourceUrl: "https://universaldependencies.org/download.html",
      licenseRef: "https://lindat.mff.cuni.cz/repository/static/license-ud-2.18.html",
      rawTextPublished: false,
      archive: {
        filename: "ud-treebanks-v2.18.tgz",
        sizeBytes: 684056893,
        md5: "e9bfd544a48eac63ea3bb41e80c78813",
        sha256: sha256File(ARCHIVE_PATH),
      },
    },
    aggregate,
    byScript: [...scriptAggregates.entries()]
      .map(([id, row]) => ({ id, sentenceAggregate: row }))
      .sort(
        (left, right) =>
          right.sentenceAggregate.sentenceTexts - left.sentenceAggregate.sentenceTexts ||
          left.id.localeCompare(right.id),
      ),
    byBoundaryRegime: [...regimeAggregates.entries()]
      .map(([id, row]) => ({ id, sentenceAggregate: row }))
      .sort(
        (left, right) =>
          right.sentenceAggregate.sentenceTexts - left.sentenceAggregate.sentenceTexts ||
          left.id.localeCompare(right.id),
      ),
    limitations: [
      "This report publishes aggregate counts only; raw corpus text is not included.",
      "UAX #29 word and sentence segmentation is Unicode boundary behavior, not language-specific tokenization.",
      "Universal Dependencies sentence text is used as an external corpus signal; it is not a public support statement for every included language.",
    ],
  };

  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (WRITE_PATH) {
    await writeFile(path.join(ROOT, WRITE_PATH), serialized);
  } else {
    process.stdout.write(serialized);
  }
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

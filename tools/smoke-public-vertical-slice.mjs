import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REQUIRED_PACKAGES = [
	"@ismail-elkorchi/textfacts",
	"@ismail-elkorchi/textdoc",
	"@ismail-elkorchi/textpack",
	"@ismail-elkorchi/textrules",
	"@ismail-elkorchi/textpipeline",
	"@ismail-elkorchi/textprotocol",
	"@ismail-elkorchi/textconformance",
	"@ismail-elkorchi/textlab",
];
const RAW_TEXT = "Alice visits Paris. Bob visits Paris.";

function fail(message, details) {
	console.error(message);
	if (details !== undefined) console.error(JSON.stringify(details, null, 2));
	process.exit(1);
}

function expect(condition, message, details) {
	if (!condition) fail(message, details);
}

async function run(command, args, options = {}) {
	try {
		return await execFileAsync(command, args, {
			cwd: ROOT,
			maxBuffer: 1024 * 1024 * 20,
			...options,
			env: {
				...process.env,
				npm_config_audit: "false",
				npm_config_fund: "false",
				...options.env,
			},
		});
	} catch (error) {
		fail(`Command failed: ${command} ${args.join(" ")}`, {
			code: error.code,
			stdout: error.stdout,
			stderr: error.stderr,
		});
	}
}

async function packWorkspace(packageName, tarballDir) {
	const { stdout } = await run("npm", [
		"pack",
		"--json",
		"--workspace",
		packageName,
		"--pack-destination",
		tarballDir,
	]);

	let report;
	try {
		report = JSON.parse(stdout);
	} catch (error) {
		fail(`npm pack output for ${packageName} was not JSON.`, {
			error: String(error),
			stdout: stdout.slice(0, 1000),
		});
	}
	expect(
		Array.isArray(report) && report.length === 1,
		`${packageName} pack must emit one report.`,
		report,
	);
	const [entry] = report;
	expect(
		entry.name === packageName,
		`${packageName} pack report name mismatch.`,
		entry,
	);
	expect(
		typeof entry.filename === "string" && entry.filename.length > 0,
		`${packageName} pack report lacks filename.`,
		entry,
	);
	return path.join(tarballDir, entry.filename);
}

async function writeConsumerScript(consumerRoot) {
	const script = String.raw`
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalize } from "@ismail-elkorchi/textfacts/normalize";
import { segmentSentencesUAX29, segmentWordsUAX29 } from "@ismail-elkorchi/textfacts/segment";
import { isTextDocDocumentV1, textDocDocumentPayloadKind } from "@ismail-elkorchi/textdoc";
import { loadTextPackResources, textPackManifestSchemaVersion } from "@ismail-elkorchi/textpack";
import {
  analyzeRuleBackedNer,
  createTextRulesEntityResourcesFromLoadedPack,
} from "@ismail-elkorchi/textrules";
import { runTextPipeline, textPipelineTracePayloadKind } from "@ismail-elkorchi/textpipeline";
import {
  checkTextProtocolResultEnvelopeCompatibility,
  isTextProtocolResultEnvelopeForPayloadKind,
  resultEnvelopeSchemaId,
  resultEnvelopeSchemaVersion,
  textProtocolPayloadKindTextconformanceReportV1,
  textProtocolPayloadKindTextdocDocumentV1,
  textProtocolPayloadKindTextpipelineTraceV1,
  textProtocolPayloadKindVerticalSliceResultV1,
} from "@ismail-elkorchi/textprotocol";
import { isTextConformanceReportV1, runTextConformanceChecks } from "@ismail-elkorchi/textconformance";
import { inspectTextdocAnnotations } from "@ismail-elkorchi/textlab";

const rawText = process.argv[2] ?? "Alice visits Paris. Bob visits Paris.";
const workspaceRoot = path.resolve(process.env.TEXT_COMPUTING_WORKSPACE_ROOT ?? "");
const consumerRoot = path.resolve(process.env.TEXT_COMPUTING_CONSUMER_ROOT ?? "");
const sliceId = "public-vertical-slice-0.1";
const generatedAt = "1970-01-01T00:00:00.000Z";

function fail(message, details) {
  const error = new Error(message);
  if (details !== undefined) error.details = details;
  throw error;
}

function expect(condition, message, details) {
  if (!condition) fail(message, details);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function resolveImport(specifier) {
  const resolvedUrl = import.meta.resolve(specifier);
  const resolvedPath = fileURLToPath(resolvedUrl);
  const normalizedResolved = path.resolve(resolvedPath);
  expect(!normalizedResolved.startsWith(workspaceRoot + path.sep), "Import resolved into workspace.", {
    specifier,
    resolvedPath: normalizedResolved,
    workspaceRoot,
  });
  expect(normalizedResolved.startsWith(path.join(consumerRoot, "node_modules") + path.sep), "Import did not resolve through consumer node_modules.", {
    specifier,
    resolvedPath: normalizedResolved,
    consumerRoot,
  });
  expect(!normalizedResolved.includes("/private/"), "Import resolved through a private path.", {
    specifier,
    resolvedPath: normalizedResolved,
  });
  return normalizedResolved;
}

function spanText(text, span) {
  return text.slice(span.startCU, span.endCU);
}

function tokenAnnotationsFromSegments(text, wordSpans) {
  return wordSpans.map((span, index) => ({
    id: "token-" + (index + 1),
    kind: "token",
    tokenKind: "uax29-word-boundary-token",
    lifecycle: { state: "active" },
    targets: [{ kind: "span", startCU: span.startCU, endCU: span.endCU }],
    text: spanText(text, span),
    provenance: {
      source: { id: "input:public-vertical-slice-0.1", sha256: sha256(text) },
      references: [{ kind: "textfacts-segmentation", id: "UAX29.Word:Unicode-17.0.0" }],
    },
  }));
}

function sentenceAnnotationsFromSegments(text, sentenceSpans) {
  return sentenceSpans.map((span, index) => ({
    id: "sentence-" + (index + 1),
    kind: "sentence",
    sentenceKind: "uax29-sentence",
    lifecycle: { state: "active" },
    targets: [{ kind: "span", startCU: span.startCU, endCU: span.endCU }],
    text: spanText(text, span),
    provenance: {
      source: { id: "input:public-vertical-slice-0.1", sha256: sha256(text) },
      references: [{ kind: "textfacts-segmentation", id: "UAX29.Sentence:Unicode-17.0.0" }],
    },
  }));
}

function createDocument(text) {
  const wordSpans = [...segmentWordsUAX29(text)];
  const sentenceSpans = [...segmentSentencesUAX29(text)];
  const tokenAnnotations = tokenAnnotationsFromSegments(text, wordSpans);
  const sentenceAnnotations = sentenceAnnotationsFromSegments(text, sentenceSpans);
  const document = {
    schemaVersion: 1,
    documentId: "doc:public-vertical-slice-0.1",
    revision: "textfacts-uax29-v1",
    textLengthCU: text.length,
    text,
    source: { id: "input:public-vertical-slice-0.1", sha256: sha256(text) },
    unicodeVersion: "17.0.0",
    units: { text: "utf16-code-unit" },
    views: [
      {
        id: "source-view",
        kind: "source",
        description: "Raw text source and textfacts UAX29 token/sentence spans.",
      },
    ],
    layers: [
      {
        id: "tokens",
        kind: "token",
        viewId: "source-view",
        annotations: tokenAnnotations,
        notes: ["Generated from @ismail-elkorchi/textfacts/segment UAX29 word boundaries."],
      },
      {
        id: "sentences",
        kind: "sentence",
        viewId: "source-view",
        annotations: sentenceAnnotations,
        notes: ["Generated from @ismail-elkorchi/textfacts/segment UAX29 sentence boundaries."],
      },
    ],
    notes: ["Public Vertical Slice 0.1 smoke fixture."],
  };
  expect(isTextDocDocumentV1(document), "Initial textdoc document is invalid.", document);
  return document;
}

function createFixturePack() {
  const manifest = {
    schemaVersion: textPackManifestSchemaVersion,
    packId: "pack:public-vertical-slice-0.1",
    packageName: "@ismail-elkorchi/textpack-public-vertical-slice",
    version: "0.0.0-fixture",
    resources: [
      {
        resourceId: "gazetteer-public-vertical-slice",
        lookupKey: "gazetteer.public-vertical-slice.entities",
        kind: "gazetteer",
        path: "resources/entities.tsv",
        language: "en",
        overlayPrecedence: 10,
        licenseId: "license:cc0-1.0",
        provenanceId: "provenance:repository-fixture",
      },
    ],
    licenses: [
      {
        id: "license:cc0-1.0",
        spdx: "CC0-1.0",
        attribution: "Repository-authored public smoke fixture.",
      },
    ],
    provenance: [
      {
        id: "provenance:repository-fixture",
        origin: "Repository-authored public smoke fixture.",
        version: "0.1",
        createdBy: "text-computing maintainers",
      },
    ],
    entrypoints: { manifest: "pack.manifest.json", resourceRoot: "resources/" },
    tests: {
      smoke: ["external-consumer-smoke"],
      lookup: ["exact-entity-lookup"],
      overlay: ["single-resource-no-overlay"],
    },
    notes: ["Exact fixture resource for Public Vertical Slice 0.1."],
  };
  const contents = {
    "resources/entities.tsv": [
      "Alice\tPER\tid=person-alice",
      "Bob\tPER\tid=person-bob",
      "Paris\tLOC\tid=place-paris",
    ].join("\n"),
  };
  return { manifest, contents };
}

function createEnvelope(payloadKind, producerPackage, producerVersion, payload, references = []) {
  const envelope = {
    schemaId: resultEnvelopeSchemaId,
    schemaVersion: resultEnvelopeSchemaVersion,
    producer: {
      package: producerPackage,
      version: producerVersion,
    },
    payloadKind,
    payload,
    provenance: {
      source: { id: "input:public-vertical-slice-0.1", sha256: sha256(rawText) },
      references,
    },
    claimBoundary: "Public Vertical Slice 0.1 fixture-only package interoperation smoke.",
    limitations: [
      "This smoke proves external installability and package interoperation for one fixture only.",
      "It does not claim broad task, corpus, language, parser, retrieval, model, or ingestion support.",
    ],
  };
  expect(isTextProtocolResultEnvelopeForPayloadKind(envelope, payloadKind), "Envelope payload kind guard failed.", {
    payloadKind,
    envelope,
  });
  const compatibility = checkTextProtocolResultEnvelopeCompatibility(envelope, {
    expectedPayloadKind: payloadKind,
    expectedProducerPackage: producerPackage,
    requireProvenance: true,
    requireClaimBoundary: true,
    requireLimitations: true,
  });
  expect(compatibility.ok, "Envelope compatibility failed.", compatibility);
  return envelope;
}

const importSpecifiers = [
  "@ismail-elkorchi/textfacts/normalize",
  "@ismail-elkorchi/textfacts/segment",
  "@ismail-elkorchi/textdoc",
  "@ismail-elkorchi/textpack",
  "@ismail-elkorchi/textrules",
  "@ismail-elkorchi/textpipeline",
  "@ismail-elkorchi/textprotocol",
  "@ismail-elkorchi/textconformance",
  "@ismail-elkorchi/textlab",
];
const imports = Object.fromEntries(importSpecifiers.map((specifier) => [specifier, resolveImport(specifier)]));
expect(textDocDocumentPayloadKind === textProtocolPayloadKindTextdocDocumentV1, "textdoc payload kind does not match textprotocol registry.");
expect(textPipelineTracePayloadKind === textProtocolPayloadKindTextpipelineTraceV1, "textpipeline payload kind does not match textprotocol registry.");

const normalizedText = normalize(rawText, "NFC");
const initialDocument = createDocument(normalizedText);
const { manifest, contents } = createFixturePack();
const loadedPack = loadTextPackResources(
  [manifest],
  { kind: "gazetteer", language: "en" },
  contents,
);
expect(loadedPack.diagnostics.length === 0, "textpack resource loading emitted diagnostics.", loadedPack.diagnostics);
expect(loadedPack.resources.length === 1, "textpack must load one fixture resource.", loadedPack);

const entityResources = createTextRulesEntityResourcesFromLoadedPack(loadedPack.resources);
expect(entityResources.diagnostics.length === 0, "textrules resource conversion emitted diagnostics.", entityResources.diagnostics);
expect(entityResources.resources.length === 1, "textrules must create one entity resource.", entityResources);

const processor = {
  descriptor: {
    id: "textrules.resource-backed-entities",
    version: "0.0.0",
    requires: {
      layers: ["tokens", "sentences"],
      packs: [manifest.packId],
    },
    emits: {
      views: ["analysis-view"],
      layers: ["entities"],
    },
    purity: "pure",
    parallelSafe: true,
  },
  run(document) {
    return analyzeRuleBackedNer(
      {
        document,
        languageHint: "en",
      },
      entityResources.resources,
    );
  },
};

const pipelineRun = runTextPipeline(initialDocument, [processor], { packs: [manifest.packId] });
const entityLayer = pipelineRun.document.layers.find((layer) => layer.id === "entities");
expect(entityLayer !== undefined, "Pipeline did not emit an entities layer.", pipelineRun.document.layers);
expect(entityLayer.annotations.length === 4, "Expected four entity annotations for the smoke fixture.", entityLayer);
expect(
  entityLayer.annotations.every((annotation) =>
    annotation.provenance?.references?.some((reference) => reference.kind === "textpack-resource")
  ),
  "Every entity annotation must reference a textpack resource.",
  entityLayer.annotations,
);

const textdocEnvelope = createEnvelope(
  textProtocolPayloadKindTextdocDocumentV1,
  "@ismail-elkorchi/textdoc",
  "0.0.0",
  pipelineRun.document,
  [{ kind: "textpack", id: manifest.packId }],
);
const traceEnvelope = createEnvelope(
  textProtocolPayloadKindTextpipelineTraceV1,
  "@ismail-elkorchi/textpipeline",
  "0.0.0",
  pipelineRun.trace,
  [{ kind: "processor", id: processor.descriptor.id }],
);

const conformanceReport = runTextConformanceChecks(
  [
    {
      checkId: "document-valid",
      evidenceRefs: ["textdoc-document-v1"],
      run: () => (isTextDocDocumentV1(pipelineRun.document) ? "pass" : "fail"),
    },
    {
      checkId: "entities-from-fixture-resource",
      evidenceRefs: [manifest.resources[0].resourceId],
      run: () => (entityLayer.annotations.length === 4 ? "pass" : "fail"),
    },
    {
      checkId: "pipeline-trace-applied",
      evidenceRefs: [processor.descriptor.id],
      run: () =>
        pipelineRun.trace.entries.length === 1 && pipelineRun.trace.entries[0]?.status === "applied"
          ? "pass"
          : "fail",
    },
    {
      checkId: "protocol-envelopes-compatible",
      evidenceRefs: [resultEnvelopeSchemaId],
      run: () => {
        const documentOk = checkTextProtocolResultEnvelopeCompatibility(textdocEnvelope, {
          expectedPayloadKind: textProtocolPayloadKindTextdocDocumentV1,
          requireProvenance: true,
          requireClaimBoundary: true,
          requireLimitations: true,
        }).ok;
        const traceOk = checkTextProtocolResultEnvelopeCompatibility(traceEnvelope, {
          expectedPayloadKind: textProtocolPayloadKindTextpipelineTraceV1,
          requireProvenance: true,
          requireClaimBoundary: true,
          requireLimitations: true,
        }).ok;
        return documentOk && traceOk ? "pass" : "fail";
      },
    },
  ],
  {
    reportId: "report:public-vertical-slice-0.1",
    subject: {
      kind: "pipeline",
      id: sliceId,
      version: "0.1",
    },
    generatedAt,
    notes: ["External-consumer tarball smoke report."],
  },
);
expect(isTextConformanceReportV1(conformanceReport), "Conformance report guard failed.", conformanceReport);
expect(conformanceReport.summary.fail === 0, "Conformance report contains failed checks.", conformanceReport);

const reportEnvelope = createEnvelope(
  textProtocolPayloadKindTextconformanceReportV1,
  "@ismail-elkorchi/textconformance",
  "0.0.0",
  conformanceReport,
  [{ kind: "conformance-report", id: conformanceReport.reportId }],
);
const inspection = inspectTextdocAnnotations(pipelineRun.document);

const output = {
  schemaVersion: 1,
  sliceId,
  input: { rawText },
  textfacts: {
    normalizedText,
    wordSpans: [...segmentWordsUAX29(normalizedText)],
    sentenceSpans: [...segmentSentencesUAX29(normalizedText)],
  },
  textdoc: {
    payloadKind: textDocDocumentPayloadKind,
    document: pipelineRun.document,
  },
  textpack: {
    resources: loadedPack.resources.map((resource) => ({
      packId: resource.resource.packId,
      resourceId: resource.resource.resourceId,
      lookupKey: resource.resource.lookupKey,
      provenanceId: resource.resource.provenanceId,
      entryCount: resource.entries.length,
    })),
  },
  textrules: {
    annotations: entityLayer.annotations.map((annotation) => ({
      id: annotation.id,
      label: annotation.label,
      text: annotation.text,
      targets: annotation.targets,
      provenance: annotation.provenance,
    })),
  },
  textpipeline: {
    payloadKind: textPipelineTracePayloadKind,
    trace: pipelineRun.trace,
  },
  textprotocol: {
    payloadKinds: [
      textProtocolPayloadKindTextdocDocumentV1,
      textProtocolPayloadKindTextpipelineTraceV1,
      textProtocolPayloadKindTextconformanceReportV1,
      textProtocolPayloadKindVerticalSliceResultV1,
    ],
    envelopes: [textdocEnvelope, traceEnvelope, reportEnvelope],
  },
  textconformance: {
    report: conformanceReport,
  },
  textlab: {
    inspection,
  },
  imports,
};
const verticalSliceEnvelope = createEnvelope(
  textProtocolPayloadKindVerticalSliceResultV1,
  "text-computing",
  "0.0.0",
  {
    schemaVersion: 1,
    sliceId,
    documentId: pipelineRun.document.documentId,
    entityAnnotationCount: entityLayer.annotations.length,
    conformanceSummary: conformanceReport.summary,
  },
  [
    { kind: "result-envelope", id: textProtocolPayloadKindTextdocDocumentV1 },
    { kind: "result-envelope", id: textProtocolPayloadKindTextpipelineTraceV1 },
    { kind: "result-envelope", id: textProtocolPayloadKindTextconformanceReportV1 },
  ],
);
output.textprotocol.envelopes = [...output.textprotocol.envelopes, verticalSliceEnvelope];

console.log(JSON.stringify(output));
`;
	await writeFile(path.join(consumerRoot, "smoke.mjs"), script);
}

async function main() {
	const tempRoot = await mkdtemp(
		path.join(tmpdir(), "text-computing-vertical-slice-"),
	);
	const tarballDir = path.join(tempRoot, "tarballs");
	const consumerRoot = path.join(tempRoot, "consumer");
	try {
		await mkdir(tarballDir, { recursive: true });
		await mkdir(consumerRoot, { recursive: true });
		const tarballs = [];
		for (const packageName of REQUIRED_PACKAGES) {
			tarballs.push(await packWorkspace(packageName, tarballDir));
		}

		await writeFile(
			path.join(consumerRoot, "package.json"),
			JSON.stringify(
				{
					name: "text-computing-public-vertical-slice-consumer",
					version: "0.0.0",
					private: true,
					type: "module",
				},
				null,
				2,
			),
		);
		await run(
			"npm",
			["install", "--ignore-scripts", "--no-audit", "--no-fund", ...tarballs],
			{
				cwd: consumerRoot,
			},
		);
		await writeConsumerScript(consumerRoot);
		const { stdout } = await run("node", ["smoke.mjs", RAW_TEXT], {
			cwd: consumerRoot,
			env: {
				TEXT_COMPUTING_WORKSPACE_ROOT: ROOT,
				TEXT_COMPUTING_CONSUMER_ROOT: consumerRoot,
			},
		});
		let output;
		try {
			output = JSON.parse(stdout);
		} catch (error) {
			fail("External-consumer smoke output was not JSON.", {
				error: String(error),
				stdout,
			});
		}

		expect(
			output.schemaVersion === 1,
			"Smoke output schemaVersion mismatch.",
			output,
		);
		expect(
			output.sliceId === "public-vertical-slice-0.1",
			"Smoke output slice id mismatch.",
			output,
		);
		expect(
			output.input?.rawText === RAW_TEXT,
			"Smoke output raw text mismatch.",
			output.input,
		);
		expect(
			output.textfacts?.normalizedText === RAW_TEXT,
			"Smoke output normalized text mismatch.",
			output.textfacts,
		);
		expect(
			output.textdoc?.document?.layers?.some(
				(layer) => layer.id === "tokens",
			) === true,
			"Smoke output lacks token layer.",
			output.textdoc,
		);
		expect(
			output.textdoc?.document?.layers?.some(
				(layer) => layer.id === "sentences",
			) === true,
			"Smoke output lacks sentence layer.",
			output.textdoc,
		);
		expect(
			JSON.stringify(output.textfacts.wordSpans) ===
				JSON.stringify([
					{ startCU: 0, endCU: 5 },
					{ startCU: 5, endCU: 6 },
					{ startCU: 6, endCU: 12 },
					{ startCU: 12, endCU: 13 },
					{ startCU: 13, endCU: 18 },
					{ startCU: 18, endCU: 19 },
					{ startCU: 19, endCU: 20 },
					{ startCU: 20, endCU: 23 },
					{ startCU: 23, endCU: 24 },
					{ startCU: 24, endCU: 30 },
					{ startCU: 30, endCU: 31 },
					{ startCU: 31, endCU: 36 },
					{ startCU: 36, endCU: 37 },
				]),
			"Smoke output word spans drifted.",
			output.textfacts.wordSpans,
		);
		expect(
			JSON.stringify(output.textfacts.sentenceSpans) ===
				JSON.stringify([
					{ startCU: 0, endCU: 20 },
					{ startCU: 20, endCU: 37 },
				]),
			"Smoke output sentence spans drifted.",
			output.textfacts.sentenceSpans,
		);
		expect(
			output.textpack?.resources?.length === 1,
			"Smoke output textpack resource count mismatch.",
			output.textpack,
		);
		expect(
			output.textrules?.annotations?.length === 4,
			"Smoke output entity count mismatch.",
			output.textrules,
		);
		expect(
			output.textpipeline?.trace?.entries?.length === 1 &&
				output.textpipeline.trace.entries[0]?.status === "applied",
			"Smoke output pipeline trace mismatch.",
			output.textpipeline,
		);
		expect(
			output.textconformance?.report?.summary?.fail === 0,
			"Smoke output conformance failures.",
			output.textconformance,
		);
		expect(
			output.textprotocol?.envelopes?.length === 4,
			"Smoke output envelope count mismatch.",
			output.textprotocol,
		);
		expect(
			Object.keys(output.imports ?? {}).length === 9,
			"Smoke output import proof count mismatch.",
			output.imports,
		);

		console.log("Public Vertical Slice 0.1 external-consumer smoke OK.");
	} finally {
		if (process.env.TEXT_COMPUTING_KEEP_SMOKE_TEMP !== "1") {
			await rm(tempRoot, { recursive: true, force: true });
		} else {
			console.log(`Kept smoke temp directory: ${tempRoot}`);
		}
	}
}

await main();

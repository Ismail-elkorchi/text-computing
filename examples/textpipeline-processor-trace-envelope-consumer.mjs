#!/usr/bin/env node
import {
  addTextDocLayerV1,
  createTextDocDocumentFromTextSync,
} from "@ismail-elkorchi/textdoc";
import {
  createTextPipelineProcessorTraceEnvelopeV1,
  isTextPipelineProcessorTraceEnvelopeV1,
  runTextPipelineAsync,
  packageName as textpipelinePackageName,
} from "@ismail-elkorchi/textpipeline";
import {
  isTextProtocolProcessorTraceV1,
  parseTextProtocolSchemaFamilyEnvelopeJson,
  serializeTextProtocolSchemaFamilyEnvelopeJson,
} from "@ismail-elkorchi/textprotocol";
import { inspectTextProtocolSchemaFamilyEnvelope } from "@ismail-elkorchi/textlab";

const document = createTextDocDocumentFromTextSync("Processor trace exchange.", {
  documentId: "example:textpipeline-processor-trace",
  sourceId: "example:textpipeline-processor-trace",
}).document;

const processor = {
  descriptor: {
    id: "example-extension-layer",
    version: "1.0.0",
    emits: {
      layers: ["example-extension-layer"],
    },
    purity: "pure",
    parallelSafe: true,
  },
  run(inputDocument) {
    return {
      document: addTextDocLayerV1(
        inputDocument,
        {
          id: "example-extension-layer",
          kind: "extension",
          viewId: "source-view",
          annotations: [],
        },
        { revision: `${inputDocument.revision}>example-extension-layer` },
      ),
    };
  },
};

const cacheStore = new Map();
const cache = {
  get(key) {
    return cacheStore.get(key);
  },
  set(key, value) {
    cacheStore.set(key, value);
  },
};

await runTextPipelineAsync(document, [processor], {}, { cache });
const cachedRun = await runTextPipelineAsync(document, [processor], {}, { cache });
if (cachedRun.trace.entries[0]?.status !== "cached") {
  throw new Error("example trace should include a cached processor entry");
}

const envelope = createTextPipelineProcessorTraceEnvelopeV1(cachedRun.trace, "0.1.0", {
  provenance: {
    references: [{ kind: "example", id: "textpipeline-processor-trace-envelope-consumer" }],
  },
  limitations: ["The example demonstrates local processor-trace schema-family exchange."],
});
if (!isTextPipelineProcessorTraceEnvelopeV1(envelope)) {
  throw new Error("textpipeline processor-trace envelope is invalid");
}

const transport = serializeTextProtocolSchemaFamilyEnvelopeJson(envelope, {
  expectedFamily: "processor-trace",
  expectedProducerPackage: textpipelinePackageName,
  requireProvenance: true,
  requireLimitations: true,
});
const parsedEnvelope = parseTextProtocolSchemaFamilyEnvelopeJson(transport, {
  expectedProducerPackage: textpipelinePackageName,
  requireProvenance: true,
  requireLimitations: true,
});
if (!isTextProtocolProcessorTraceV1(parsedEnvelope)) {
  throw new Error("textprotocol processor-trace envelope did not round trip");
}

console.log(JSON.stringify({
  documentId: parsedEnvelope.payload.documentId,
  cachePolicy: parsedEnvelope.payload.cachePolicy,
  statuses: parsedEnvelope.payload.entries.map((entry) => entry.status),
  cacheKeys: parsedEnvelope.payload.entries.flatMap((entry) => entry.cacheKey ?? []),
  transport: {
    mediaType: transport.mediaType,
    family: transport.family,
    bodyLength: transport.body.length,
  },
  inspection: inspectTextProtocolSchemaFamilyEnvelope(parsedEnvelope),
}, null, 2));

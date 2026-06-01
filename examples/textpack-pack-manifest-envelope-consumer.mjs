#!/usr/bin/env node
import {
  createTextPackManifest,
  isTextPackManifestV1,
  packageName as textpackPackageName,
  validateTextPackManifestGovernance,
} from "@ismail-elkorchi/textpack";
import {
  checkTextProtocolSchemaFamilyEnvelope,
  parseTextProtocolSchemaFamilyEnvelopeJson,
  serializeTextProtocolSchemaFamilyEnvelopeJson,
  textProtocolPackManifestSchemaId,
  textProtocolSchemaVersion,
} from "@ismail-elkorchi/textprotocol";
import { inspectTextProtocolSchemaFamilyEnvelope } from "@ismail-elkorchi/textlab";

const manifest = createTextPackManifest({
  id: "pack:example-manifest-envelope",
  packageName: "@example/textpack-manifest-envelope",
  version: "0.1.0",
  kind: ["language"],
  targets: {
    languages: ["en"],
    scripts: ["Latn"],
    profiles: ["uax29-default"],
  },
  resources: {
    stopwords: ["resources/stopwords.en.txt"],
  },
  provides: {
    stopwords: ["stopwords-en-example"],
  },
  licenses: {
    code: ["MIT"],
    data: ["CC0-1.0"],
  },
  provenance: {
    sources: ["example:textpack-pack-manifest-envelope-consumer"],
    generated: false,
  },
  tests: {
    smoke: ["resources/stopwords.en.txt"],
    negative: ["negative:no-implicit-registry"],
    representative: ["representative:english-stopwords"],
  },
});
if (!isTextPackManifestV1(manifest)) {
  throw new Error("textpack manifest is invalid");
}
const governance = validateTextPackManifestGovernance(manifest);
if (!governance.ok) {
  throw new Error(JSON.stringify(governance.diagnostics));
}

const validationOptions = {
  expectedFamily: "pack-manifest",
  expectedProducerPackage: textpackPackageName,
  requireProvenance: true,
  requireLimitations: true,
  externallyValidatedFamilies: ["pack-manifest"],
};
const envelope = {
  schemaId: textProtocolPackManifestSchemaId,
  schemaVersion: textProtocolSchemaVersion,
  producer: {
    package: textpackPackageName,
    version: "0.1.0",
  },
  payload: manifest,
  provenance: {
    references: [{ kind: "example", id: "textpack-pack-manifest-envelope-consumer" }],
  },
  limitations: ["The example validates the manifest with textpack before textprotocol transport."],
};
const compatibility = checkTextProtocolSchemaFamilyEnvelope(envelope, validationOptions);
if (!compatibility.ok) {
  throw new Error(JSON.stringify(compatibility.diagnostics));
}

const transport = serializeTextProtocolSchemaFamilyEnvelopeJson(envelope, validationOptions);
const parsedEnvelope = parseTextProtocolSchemaFamilyEnvelopeJson(transport, validationOptions);
if (!isTextPackManifestV1(parsedEnvelope.payload)) {
  throw new Error("parsed pack-manifest envelope did not preserve a valid textpack manifest");
}
const parsedGovernance = validateTextPackManifestGovernance(parsedEnvelope.payload);
if (!parsedGovernance.ok) {
  throw new Error(JSON.stringify(parsedGovernance.diagnostics));
}

console.log(JSON.stringify({
  packId: parsedEnvelope.payload.id,
  resourceFamilies: Object.keys(parsedEnvelope.payload.resources).sort((left, right) => left.localeCompare(right)),
  compatibilityDiagnostics: compatibility.diagnostics.map((entry) => `${entry.code}:${entry.severity}`),
  transport: {
    mediaType: transport.mediaType,
    family: transport.family,
    bodyLength: transport.body.length,
  },
  inspection: inspectTextProtocolSchemaFamilyEnvelope(parsedEnvelope, validationOptions),
}, null, 2));

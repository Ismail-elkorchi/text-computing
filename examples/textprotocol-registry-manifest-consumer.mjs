import {
  createTextProtocolRegistryManifestV1,
  isTextProtocolRegistryManifestV1,
  parseTextProtocolRegistryManifestJson,
  serializeTextProtocolRegistryManifestJson,
} from "@ismail-elkorchi/textprotocol";

const manifest = createTextProtocolRegistryManifestV1({
  producerVersion: "0.1.0",
  limitations: [
    "This example reports registered descriptors; externally owned schema payloads still require owner validation.",
  ],
});

if (!isTextProtocolRegistryManifestV1(manifest)) {
  throw new Error("textprotocol registry manifest is invalid");
}

const transport = serializeTextProtocolRegistryManifestJson(manifest);
const parsed = parseTextProtocolRegistryManifestJson(transport);
if (serializeTextProtocolRegistryManifestJson(parsed).body !== transport.body) {
  throw new Error("textprotocol registry manifest transport is not deterministic");
}

console.log(JSON.stringify({
  producer: parsed.producer.package,
  payloadKindCount: parsed.summary.payloadKindCount,
  schemaFamilyCount: parsed.summary.schemaFamilyCount,
  externallyOwnedSchemaFamilyCount: parsed.summary.externallyOwnedSchemaFamilyCount,
  mediaType: transport.mediaType,
}, null, 2));

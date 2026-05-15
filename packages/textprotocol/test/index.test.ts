import {
  isTextProtocolDiagnostic,
  isTextProtocolResultEnvelopeV1,
  packageName,
  resultEnvelopeSchemaId,
  resultEnvelopeSchemaVersion,
} from "../src/index.ts";

const expectedPackageName: typeof packageName = "@ismail-elkorchi/textprotocol";

const validEnvelope = {
  schemaId: resultEnvelopeSchemaId,
  schemaVersion: resultEnvelopeSchemaVersion,
  producer: {
    package: packageName,
    version: "0.0.0",
  },
  payloadKind: "textprotocol:test",
  payload: {
    ok: true,
  },
  diagnostics: [
    {
      code: "textprotocol.test",
      severity: "info",
      message: "test diagnostic",
    },
  ],
};

if (!isTextProtocolResultEnvelopeV1(validEnvelope)) {
  throw new Error("valid result envelope should satisfy the runtime guard");
}

if (!isTextProtocolDiagnostic(validEnvelope.diagnostics[0])) {
  throw new Error("valid diagnostic should satisfy the runtime guard");
}

if (
  isTextProtocolResultEnvelopeV1({
    ...validEnvelope,
    producer: {
      package: "",
      version: "0.0.0",
    },
  })
) {
  throw new Error("result envelope should reject empty producer package names");
}

if (
  isTextProtocolDiagnostic({
    code: "bad",
    severity: "fatal",
  })
) {
  throw new Error("diagnostic guard should reject unknown severities");
}

void expectedPackageName;

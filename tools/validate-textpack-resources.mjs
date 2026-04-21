import Ajv from "ajv";
import { access, readFile } from "node:fs/promises";

const ajv = new Ajv({ allErrors: true, strict: true });

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function normalizeToken(value) {
  return value.trim().toLowerCase();
}

function pushError(errors, code, message) {
  errors.push({ code, message });
}

async function ensurePathExists(path) {
  await access(path);
}

function validateManifestSemantics(manifest) {
  const errors = [];

  const licenseIds = new Set();
  for (const license of manifest.licenses) {
    if (licenseIds.has(license.id)) {
      pushError(errors, "duplicate-license-id", `Duplicate license id ${license.id}.`);
    }
    licenseIds.add(license.id);
  }

  const provenanceIds = new Set();
  for (const record of manifest.provenance) {
    if (provenanceIds.has(record.id)) {
      pushError(errors, "duplicate-provenance-id", `Duplicate provenance id ${record.id}.`);
    }
    provenanceIds.add(record.id);
  }

  const resourceIds = new Set();
  for (const resource of manifest.resources) {
    if (resourceIds.has(resource.resourceId)) {
      pushError(
        errors,
        "duplicate-resource-id",
        `Duplicate resource id ${resource.resourceId} in ${manifest.packId}.`,
      );
    }
    resourceIds.add(resource.resourceId);

    if (!licenseIds.has(resource.licenseId)) {
      pushError(
        errors,
        "missing-license-ref",
        `Resource ${resource.resourceId} references missing license ${resource.licenseId}.`,
      );
    }

    if (!provenanceIds.has(resource.provenanceId)) {
      pushError(
        errors,
        "missing-provenance-ref",
        `Resource ${resource.resourceId} references missing provenance ${resource.provenanceId}.`,
      );
    }
  }

  return errors;
}

function resolveResources(manifests, request) {
  const requestLanguage =
    request.language === undefined ? undefined : normalizeToken(request.language);
  const requestProfile =
    request.profile === undefined ? undefined : normalizeToken(request.profile);
  const resources = [];
  const diagnostics = [];

  for (const manifest of manifests) {
    const licensesById = new Map(manifest.licenses.map((license) => [license.id, license]));
    const provenanceById = new Map(manifest.provenance.map((record) => [record.id, record]));

    for (const resource of manifest.resources) {
      if (resource.kind !== request.kind) continue;

      const resourceLanguage =
        resource.language === undefined ? undefined : normalizeToken(resource.language);
      const resourceProfiles = [...(resource.profiles ?? [])].map((entry) => normalizeToken(entry));

      if (
        requestLanguage !== undefined &&
        resourceLanguage !== undefined &&
        requestLanguage !== resourceLanguage
      ) {
        diagnostics.push({
          code: "language-mismatch",
          resourceId: resource.resourceId,
          packId: manifest.packId,
        });
        continue;
      }

      if (requestProfile !== undefined) {
        if (resourceProfiles.length > 0 && !resourceProfiles.includes(requestProfile)) {
          diagnostics.push({
            code: "profile-mismatch",
            resourceId: resource.resourceId,
            packId: manifest.packId,
          });
          continue;
        }
      } else if (resourceProfiles.length > 0) {
        continue;
      }

      const license = licensesById.get(resource.licenseId);
      const provenance = provenanceById.get(resource.provenanceId);
      if (!license || !provenance) continue;

      resources.push({
        packId: manifest.packId,
        packageName: manifest.packageName,
        version: manifest.version,
        resourceId: resource.resourceId,
        lookupKey: resource.lookupKey,
        kind: resource.kind,
        path: resource.path,
        overlayPrecedence: resource.overlayPrecedence,
        license,
        provenance,
        ...(resource.language ? { language: resource.language } : {}),
        ...(resource.profiles ? { profiles: resource.profiles } : {}),
      });
    }
  }

  resources.sort((left, right) => {
    return (
      right.overlayPrecedence - left.overlayPrecedence ||
      left.packId.localeCompare(right.packId) ||
      left.resourceId.localeCompare(right.resourceId)
    );
  });

  for (let index = 0; index < resources.length; index += 1) {
    const left = resources[index];
    if (!left) continue;
    for (let otherIndex = index + 1; otherIndex < resources.length; otherIndex += 1) {
      const right = resources[otherIndex];
      if (!right) continue;
      if (
        normalizeToken(left.lookupKey) === normalizeToken(right.lookupKey) &&
        left.overlayPrecedence === right.overlayPrecedence
      ) {
        diagnostics.push({
          code: "overlay-conflict",
          resourceId: right.resourceId,
          packId: right.packId,
        });
      }
    }
  }

  return { resources, diagnostics };
}

const manifestSchema = await readJson("schemas/textpack-manifest-v1.schema.json");
const validateManifest = ajv.compile(manifestSchema);

const validManifestPaths = [
  "fixtures/textpack/manifests/textpack-en-core.json",
  "fixtures/textpack/manifests/textpack-en-legal.json",
];
const validManifests = [];

for (const manifestPath of validManifestPaths) {
  const manifest = await readJson(manifestPath);
  if (!validateManifest(manifest)) {
    console.error(`${manifestPath} failed schemas/textpack-manifest-v1.schema.json`);
    console.error(JSON.stringify(validateManifest.errors, null, 2));
    process.exit(1);
  }

  const semanticErrors = validateManifestSemantics(manifest);
  if (semanticErrors.length > 0) {
    console.error(`${manifestPath} failed semantic validation`);
    console.error(JSON.stringify(semanticErrors, null, 2));
    process.exit(1);
  }

  for (const resource of manifest.resources) {
    await ensurePathExists(resource.path);
  }

  validManifests.push(manifest);
}

const legalStopwordsLookup = resolveResources(validManifests, {
  kind: "stopwords",
  language: "en",
  profile: "legal",
});

if (
  legalStopwordsLookup.resources.map((entry) => entry.resourceId).join(",") !==
  "stopwords-en-legal,stopwords-en-core"
) {
  console.error("Deterministic stopword overlay ordering failed for the legal profile.");
  console.error(JSON.stringify(legalStopwordsLookup, null, 2));
  process.exit(1);
}

if (
  legalStopwordsLookup.resources[0]?.provenance.id !== "prov-hand-curated" ||
  legalStopwordsLookup.resources[0]?.license.id !== "license-cc0"
) {
  console.error("Resolved resources must retain provenance and license metadata.");
  console.error(JSON.stringify(legalStopwordsLookup, null, 2));
  process.exit(1);
}

const profileMismatchLookup = resolveResources(validManifests, {
  kind: "gazetteer",
  language: "en",
  profile: "medical",
});
if (!profileMismatchLookup.diagnostics.some((entry) => entry.code === "profile-mismatch")) {
  console.error("Expected a profile-mismatch diagnostic for the medical gazetteer request.");
  console.error(JSON.stringify(profileMismatchLookup, null, 2));
  process.exit(1);
}

const languageMismatchLookup = resolveResources(validManifests, {
  kind: "stopwords",
  language: "fr",
  profile: "legal",
});
if (!languageMismatchLookup.diagnostics.some((entry) => entry.code === "language-mismatch")) {
  console.error("Expected a language-mismatch diagnostic for the French stopword request.");
  console.error(JSON.stringify(languageMismatchLookup, null, 2));
  process.exit(1);
}

const invalidSemanticCases = [
  {
    path: "fixtures/textpack/invalid/duplicate-resource-id.json",
    expectedCode: "duplicate-resource-id",
  },
  {
    path: "fixtures/textpack/invalid/missing-provenance.json",
    expectedCode: "missing-provenance-ref",
  },
  {
    path: "fixtures/textpack/invalid/missing-license.json",
    expectedCode: "missing-license-ref",
  },
];

for (const invalidCase of invalidSemanticCases) {
  const manifest = await readJson(invalidCase.path);
  if (!validateManifest(manifest)) {
    console.error(`${invalidCase.path} must remain schema-valid so semantic checks can falsify it.`);
    console.error(JSON.stringify(validateManifest.errors, null, 2));
    process.exit(1);
  }
  const semanticErrors = validateManifestSemantics(manifest);
  if (!semanticErrors.some((entry) => entry.code === invalidCase.expectedCode)) {
    console.error(`${invalidCase.path} did not trigger ${invalidCase.expectedCode}.`);
    console.error(JSON.stringify(semanticErrors, null, 2));
    process.exit(1);
  }
}

const overlayConflictManifests = [
  await readJson("fixtures/textpack/invalid/overlay-conflict-a.json"),
  await readJson("fixtures/textpack/invalid/overlay-conflict-b.json"),
];
for (const manifest of overlayConflictManifests) {
  if (!validateManifest(manifest)) {
    console.error("Overlay conflict manifests must remain schema-valid.");
    console.error(JSON.stringify(validateManifest.errors, null, 2));
    process.exit(1);
  }
}
const overlayConflictLookup = resolveResources(overlayConflictManifests, {
  kind: "stopwords",
  language: "en",
});
if (!overlayConflictLookup.diagnostics.some((entry) => entry.code === "overlay-conflict")) {
  console.error("Expected an overlay-conflict diagnostic.");
  console.error(JSON.stringify(overlayConflictLookup, null, 2));
  process.exit(1);
}

console.log("Textpack resource fixtures OK.");

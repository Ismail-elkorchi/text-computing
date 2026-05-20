import type { TextPackManifestV1 } from "@ismail-elkorchi/textpack";

export const textPackFrCoreManifest: TextPackManifestV1 = {
  "manifestVersion": "1.0.0",
  "id": "pack:fr-core",
  "packageName": "@ismail-elkorchi/textpack-fr-core",
  "version": "0.1.0",
  "kind": [
    "language"
  ],
  "targets": {
    "languages": [
      "fr"
    ],
    "scripts": [
      "Latn"
    ]
  },
  "engines": {
    "@ismail-elkorchi/textpack": "^0.1.0"
  },
  "externalData": {
    "unicode": "17.0.0"
  },
  "capabilities": {
    "stopwords": true,
    "lexicons": true,
    "tagsets": true,
    "morphology": true,
    "benchmarks": true
  },
  "resources": {
    "stopwords": [
      "resources/stopwords.fr.basic.txt"
    ],
    "lexicons": [
      "resources/lexicon.fr.simple.tsv"
    ],
    "tagsets": [
      "resources/tagset.ud-lite.tsv"
    ],
    "morphology": [
      "resources/morph.fr.simple.tsv"
    ],
    "benchmarks": [
      "resources/benchmark.smoke.txt"
    ]
  },
  "provides": {
    "stopwords": [
      "stopwords-fr-core"
    ],
    "lexicons": [
      "lexicon-fr-core"
    ],
    "tagsets": [
      "tagset-fr-ud-lite"
    ],
    "morphology": [
      "morph-fr-core"
    ],
    "benchmarks": [
      "benchmark-fr-smoke"
    ]
  },
  "entrypoints": {
    "manifest": "./pack.manifest.json",
    "load": "./dist/index.js"
  },
  "licenses": {
    "code": [
      "MIT"
    ],
    "data": [
      "CC0-1.0"
    ]
  },
  "provenance": {
    "sources": [
      "repo:packages/textpack-fr-core/resources"
    ],
    "generated": false,
    "createdBy": [
      "text-computing"
    ]
  },
  "tests": {
    "smoke": [
      "test/smoke.mjs"
    ],
    "negative": [
      "test/negative.mjs"
    ],
    "representative": [
      "test/representative.mjs"
    ]
  },
  "reviewState": "candidate",
  "composition": {
    "overlayPrecedence": 10
  },
  "limitations": [
    "Reference fixture pack for French resource loading; it is not broad language coverage."
  ]
} as const;

export function loadTextPackFrCoreManifest(): TextPackManifestV1 {
  return textPackFrCoreManifest;
}

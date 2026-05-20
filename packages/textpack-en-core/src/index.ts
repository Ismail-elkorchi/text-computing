import type { TextPackManifestV1 } from "@ismail-elkorchi/textpack";

export const textPackEnCoreManifest: TextPackManifestV1 = {
  "manifestVersion": "1.0.0",
  "id": "pack:en-core",
  "packageName": "@ismail-elkorchi/textpack-en-core",
  "version": "0.1.0",
  "kind": [
    "language"
  ],
  "targets": {
    "languages": [
      "en"
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
    "rules": true,
    "lexicons": true,
    "tagsets": true,
    "morphology": true,
    "benchmarks": true
  },
  "resources": {
    "stopwords": [
      "resources/stopwords.en.basic.txt"
    ],
    "rules": [
      "resources/abbrev.en.common.txt"
    ],
    "lexicons": [
      "resources/lexicon.en.simple.tsv"
    ],
    "tagsets": [
      "resources/tagset.ud-lite.tsv"
    ],
    "morphology": [
      "resources/morph.en.simple.tsv"
    ],
    "benchmarks": [
      "resources/benchmark.smoke.txt"
    ]
  },
  "provides": {
    "stopwords": [
      "stopwords-en-core"
    ],
    "rules": [
      "abbrev-en-core"
    ],
    "lexicons": [
      "lexicon-en-core"
    ],
    "tagsets": [
      "tagset-ud-lite"
    ],
    "morphology": [
      "morph-en-core"
    ],
    "benchmarks": [
      "benchmark-en-smoke"
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
      "repo:packages/textpack-en-core/resources"
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
  "reviewState": "reference",
  "composition": {
    "overlayPrecedence": 10
  },
  "limitations": [
    "Reference fixture pack for English resource loading; it is not broad language coverage."
  ]
} as const;

export function loadTextPackEnCoreManifest(): TextPackManifestV1 {
  return textPackEnCoreManifest;
}

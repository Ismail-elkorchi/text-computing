import type { TextPackManifestV1 } from "@ismail-elkorchi/textpack";

export const textPackEnLegalManifest: TextPackManifestV1 = {
  "manifestVersion": "1.0.0",
  "id": "pack:en-legal",
  "packageName": "@ismail-elkorchi/textpack-en-legal",
  "version": "0.1.0",
  "kind": [
    "language",
    "domain"
  ],
  "targets": {
    "languages": [
      "en"
    ],
    "scripts": [
      "Latn"
    ],
    "domains": [
      "legal"
    ],
    "profiles": [
      "legal"
    ]
  },
  "engines": {
    "@ismail-elkorchi/textpack": "^0.1.0"
  },
  "externalData": {
    "unicode": "17.0.0"
  },
  "capabilities": {
    "profiles": true,
    "rules": true,
    "lexicons": true,
    "stopwords": true,
    "gazetteers": true,
    "tagsets": true,
    "morphology": true,
    "transducers": true,
    "structures": true,
    "benchmarks": true
  },
  "resources": {
    "profiles": [
      "resources/profile.en.legal.txt"
    ],
    "rules": [
      "resources/rule.en.legal.txt"
    ],
    "lexicons": [
      "resources/lexicon.en.legal.tsv"
    ],
    "stopwords": [
      "resources/stopwords.en.legal.txt"
    ],
    "gazetteers": [
      "resources/gazetteer.en.legal.tsv"
    ],
    "tagsets": [
      "resources/tagset.legal-lite.tsv"
    ],
    "morphology": [
      "resources/morph.en.legal.tsv"
    ],
    "transducers": [
      "resources/transducer.en.legal.txt"
    ],
    "structures": [
      "resources/structure.en.legal.txt"
    ],
    "benchmarks": [
      "resources/benchmark.legal-smoke.txt"
    ]
  },
  "provides": {
    "profiles": [
      "profile-en-legal"
    ],
    "rules": [
      "rule-en-legal"
    ],
    "lexicons": [
      "lexicon-en-legal"
    ],
    "stopwords": [
      "stopwords-en-legal"
    ],
    "gazetteers": [
      "gazetteer-en-legal"
    ],
    "tagsets": [
      "tagset-en-legal-lite"
    ],
    "morphology": [
      "morph-en-legal"
    ],
    "transducers": [
      "transducer-en-legal"
    ],
    "structures": [
      "structure-en-legal"
    ],
    "benchmarks": [
      "benchmark-en-legal-smoke"
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
      "repo:packages/textpack-en-legal/resources"
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
    "overlayPrecedence": 50
  },
  "limitations": [
    "Reference legal-domain resource pack with every textpack resource family for deterministic package workflows; it is not comprehensive legal-domain coverage."
  ]
} as const;

export function loadTextPackEnLegalManifest(): TextPackManifestV1 {
  return textPackEnLegalManifest;
}

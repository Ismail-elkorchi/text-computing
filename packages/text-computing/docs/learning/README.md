# @ismail-elkorchi/text-computing/learning

Classical statistical NLP and local model training in Text Computing.

`/learning` owns sparse feature extraction, vectorization, classical classifiers, sequence
taggers, n-gram language models, LDA topic models, clustering, non-neural task wrappers, extractive
summaries, and statistical `/document` annotations.

Use this module directly with caller-owned examples, features, and models.
Training and inference are normal library operations; no pack is required.

## Install

```sh
npm install @ismail-elkorchi/text-computing
```

## Imports

```ts
import { trainClassifier } from "@ismail-elkorchi/text-computing/learning";
import { extractFeatures } from "@ismail-elkorchi/text-computing/learning/features";
import { trainSequenceTagger } from "@ismail-elkorchi/text-computing/learning/sequence";
import { trainNgramLanguageModel } from "@ismail-elkorchi/text-computing/learning/lm";
```

The package exposes a root entrypoint and focused subpaths:
`features`, `vectorize`, `classify`, `sequence`, `hmm`, `crf`, `maxent`, `perceptron`, `lm`,
`topic`, `cluster`, `tagger`, `parser`, and `summary`.

## Example

```ts
import { classify, trainClassifier, transformVectorizer } from "@ismail-elkorchi/text-computing/learning";

const classifier = trainClassifier(
  [
    { id: "p1", label: "positive", features: { bias: 1, "token=clear": 1 } },
    { id: "n1", label: "negative", features: { bias: 1, "token=unclear": 1 } },
  ],
  { kind: "naive-bayes" },
);

const matrix = transformVectorizer(classifier.vectorizer, [
  { id: "probe", features: { bias: 1, "token=clear": 1 } },
]);

const result = classify(classifier, {
  ids: matrix.columnIds,
  values: matrix.values,
  featureSpaceId: classifier.featureSpaceId,
});
```

## Boundaries

Runtime code does not read files, fetch data, discover packs, or load hidden models. Resource data is
caller-owned and explicit. This module composes with Unicode processing, documents, lexicons, and finite-state operations in the same library.

All models and public outputs are deterministic for the same inputs and options. Serializable model
metadata, annotation values, scores, and diagnostics must be I-JSON safe.

# @ismail-elkorchi/textclassical

Deterministic classical statistical NLP for the text-computing runtime packages.

`textclassical` owns sparse feature extraction, vectorization, classical classifiers, sequence
taggers, n-gram language models, LDA topic models, clustering, non-neural task wrappers, extractive
summaries, and statistical `textdoc` annotations.

## Install

```sh
npm install @ismail-elkorchi/textclassical
```

## Imports

```ts
import { trainClassifier } from "@ismail-elkorchi/textclassical";
import { extractFeatures } from "@ismail-elkorchi/textclassical/features";
import { trainSequenceTagger } from "@ismail-elkorchi/textclassical/sequence";
import { trainNgramLanguageModel } from "@ismail-elkorchi/textclassical/lm";
```

The package exposes only the final root entrypoint and the section 13 focused subpaths:
`features`, `vectorize`, `classify`, `sequence`, `hmm`, `crf`, `maxent`, `perceptron`, `lm`,
`topic`, `cluster`, `tagger`, `parser`, and `summary`.

## Example

```ts
import { classify, trainClassifier, transformVectorizer } from "@ismail-elkorchi/textclassical";

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
caller-owned and explicit. The package depends on `textfacts`, `textdoc`, `textlex`, and `textfst`;
it does not depend on `textrules`, `textnorm`, or higher runtime packages.

All models and public outputs are deterministic for the same inputs and options. Serializable model
metadata, annotation values, scores, and diagnostics must be I-JSON safe.

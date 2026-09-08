# Classify

`trainClassifier` supports `naive-bayes`, `maxent`, `perceptron`, `averaged-perceptron`,
`linear-svm`, and `logistic-regression`.

`classify` scores a final `FeatureVector`. `classifyDocument` extracts features from a
`TextDocument` and returns a new document with a final `classification.*` annotation layer.

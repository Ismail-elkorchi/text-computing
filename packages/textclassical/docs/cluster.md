# Cluster

`clusterDocuments` clusters supplied sparse matrices. The package does not store corpora or own
corpus query behavior. K-means uses seeded k-means++ initialization, recomputes centroids until
assignments converge, and retains a previous centroid if a cluster becomes empty. Cluster ids and
assignments are deterministic.

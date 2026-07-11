# Facet

`facet` and `facets` compute deterministic bucket counts over metadata keys or indexed field values.

Facet requests support top-N limits, missing buckets, and numeric range buckets. Bucket ordering is count descending and then code-point value order.

Facets attached to search results are computed over the post-query, post-filter hit set before result
pagination.

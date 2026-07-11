function tokenizeLicenseExpression(expression) {
	if (typeof expression !== "string" || expression.trim().length === 0) {
		throw new Error("license expression must be a non-empty string");
	}
	const tokens =
		expression.match(/\(|\)|\bAND\b|\bOR\b|\bWITH\b|[^\s()]+/gu) ?? [];
	if (tokens.join(" ").replace(/\s+/gu, " ").trim().length === 0) {
		throw new Error("license expression does not contain a license identifier");
	}
	return tokens;
}

function combineAlternatives(left, right) {
	const combined = [];
	for (const leftAlternative of left) {
		for (const rightAlternative of right) {
			combined.push(new Set([...leftAlternative, ...rightAlternative]));
		}
	}
	return combined;
}

function licenseAlternatives(expression) {
	const tokens = tokenizeLicenseExpression(expression);
	let index = 0;

	function primary() {
		const token = tokens[index];
		if (token === "(") {
			index += 1;
			const alternatives = disjunction();
			if (tokens[index] !== ")") {
				throw new Error(
					`license expression ${expression} has an unmatched parenthesis`,
				);
			}
			index += 1;
			return alternatives;
		}
		if (
			token === undefined ||
			token === ")" ||
			token === "AND" ||
			token === "OR" ||
			token === "WITH"
		) {
			throw new Error(
				`license expression ${expression} has an unexpected token`,
			);
		}
		index += 1;
		const terms = new Set([token]);
		if (tokens[index] === "WITH") {
			index += 1;
			const exception = tokens[index];
			if (
				exception === undefined ||
				["(", ")", "AND", "OR", "WITH"].includes(exception)
			) {
				throw new Error(
					`license expression ${expression} has an invalid exception`,
				);
			}
			terms.add(exception);
			index += 1;
		}
		return [terms];
	}

	function conjunction() {
		let alternatives = primary();
		while (tokens[index] === "AND") {
			index += 1;
			alternatives = combineAlternatives(alternatives, primary());
		}
		return alternatives;
	}

	function disjunction() {
		let alternatives = conjunction();
		while (tokens[index] === "OR") {
			index += 1;
			alternatives = [...alternatives, ...conjunction()];
		}
		return alternatives;
	}

	const alternatives = disjunction();
	if (index !== tokens.length) {
		throw new Error(
			`license expression ${expression} has an unexpected token ${tokens[index]}`,
		);
	}
	return alternatives;
}

export function licenseExpressionCovers(
	aggregateExpression,
	requiredExpression,
) {
	const aggregateAlternatives = licenseAlternatives(aggregateExpression);
	const requiredAlternatives = licenseAlternatives(requiredExpression);
	return aggregateAlternatives.every((aggregate) =>
		requiredAlternatives.some((required) =>
			[...required].every((term) => aggregate.has(term)),
		),
	);
}

export function missingLicenseObligations(aggregateExpression, sources) {
	return sources
		.filter(
			(source) =>
				!licenseExpressionCovers(aggregateExpression, source.licenseExpression),
		)
		.map((source) => ({
			sourceId: source.sourceId,
			licenseExpression: source.licenseExpression,
		}));
}

export function assertLicenseClosure(
	aggregateExpression,
	sources,
	label = "package",
) {
	const missing = missingLicenseObligations(aggregateExpression, sources);
	if (missing.length === 0) return;
	throw new Error(
		`${label} aggregate license ${aggregateExpression} does not cover:\n${missing
			.map((source) => `${source.sourceId}: ${source.licenseExpression}`)
			.join("\n")}`,
	);
}

function timestamp(value, label) {
	if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/u.test(value)) {
		throw new Error(`${label} must be an ISO-8601 timestamp`);
	}
	const parsed = Date.parse(value);
	if (!Number.isFinite(parsed)) {
		throw new Error(`${label} must be an ISO-8601 timestamp`);
	}
	return parsed;
}

export function assertGenerationChronology(generatedAt, snapshots) {
	const generatedTimestamp = timestamp(generatedAt, "forge generatedAt");
	const futureSnapshots = [];
	for (const snapshot of snapshots) {
		const retrievedTimestamp = timestamp(
			snapshot.retrievedAt,
			`${snapshot.snapshotId} retrievedAt`,
		);
		if (retrievedTimestamp > generatedTimestamp) {
			futureSnapshots.push(
				`${snapshot.snapshotId} was retrieved at ${snapshot.retrievedAt}`,
			);
		}
	}
	if (futureSnapshots.length === 0) return;
	throw new Error(
		`forge generatedAt ${generatedAt} precedes snapshot acquisition:\n${futureSnapshots.join("\n")}`,
	);
}

export function assertWikidataExtractLineage({
	metadata,
	snapshot,
	generatedAt,
	label = "Wikidata extract",
}) {
	const defects = [];
	if (metadata.sourceId !== snapshot.sourceId) {
		defects.push("sourceId does not match its snapshot");
	}
	if (metadata.acquisitionMethod !== "wikidata-query-service") {
		defects.push("acquisitionMethod must be wikidata-query-service");
	}
	if (metadata.derivedFromDumpArtifact !== false) {
		defects.push("derivedFromDumpArtifact must explicitly be false");
	}
	if (Object.hasOwn(metadata, "version")) {
		defects.push(
			"version is ambiguous for a live-query extract; record dump metadata separately",
		);
	}
	try {
		const endpoint = new URL(metadata.endpoint);
		if (
			endpoint.protocol !== "https:" ||
			endpoint.hostname !== "query.wikidata.org"
		) {
			defects.push(
				"endpoint must be the HTTPS Wikidata Query Service endpoint",
			);
		}
	} catch {
		defects.push("endpoint must be a valid URL");
	}
	let extractTimestamp;
	let snapshotTimestamp;
	let generationTimestamp;
	try {
		extractTimestamp = timestamp(metadata.retrievedAt, `${label} retrievedAt`);
	} catch (error) {
		defects.push(error.message);
	}
	try {
		snapshotTimestamp = timestamp(
			snapshot.retrievedAt,
			`${snapshot.snapshotId} retrievedAt`,
		);
	} catch (error) {
		defects.push(error.message);
	}
	try {
		generationTimestamp = timestamp(generatedAt, "forge generatedAt");
	} catch (error) {
		defects.push(error.message);
	}
	if (
		extractTimestamp !== undefined &&
		snapshotTimestamp !== undefined &&
		extractTimestamp > snapshotTimestamp
	) {
		defects.push("extract retrieval occurs after its enclosing snapshot");
	}
	if (
		extractTimestamp !== undefined &&
		generationTimestamp !== undefined &&
		extractTimestamp > generationTimestamp
	) {
		defects.push("extract retrieval occurs after forge generation");
	}
	if (defects.length === 0) return;
	throw new Error(`${label} lineage failed:\n${defects.join("\n")}`);
}

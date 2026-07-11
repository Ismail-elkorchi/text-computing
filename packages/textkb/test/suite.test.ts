import assert from "node:assert/strict";
import test from "node:test";
import { createDocument } from "@ismail-elkorchi/textdoc";
import { nfkcCaseFold } from "@ismail-elkorchi/textfacts/casefold";

import {
	annotateOntologyGazetteer,
	candidateConcepts,
	candidateEntities,
	candidateSenses,
	cohesionFeatures,
	createKnowledgeBase,
	disambiguateSense,
	entityLinkerFromPack,
	knowledgeBaseFromPack,
	knowledgeBaseMentionKeyLengthsFromPack,
	knowledgeBaseSliceFromPack,
	lexicalChains,
	linkEntities,
	linkTerms,
	normalizeKnowledgeBaseMention,
	ontologyGazetteer,
	parseAliasRows,
	parseEntityRows,
	parseRelationRows,
	querySemanticRelations,
	scoreDisambiguation,
	thesaurusRelations,
	traverseSemanticRelations,
} from "../dist/index.js";
import { badSpanDocument, fixtureDocument } from "./fixtures/documents.ts";
import { fixtureKb } from "./fixtures/kb.ts";

async function sha256(text: string): Promise<string> {
	const bytes = new TextEncoder().encode(text);
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

async function fileBackedTextResource(path: string, text: string) {
	return {
		kind: "file-backed-resource",
		packageName: "@ismail-elkorchi/textpack-kb-test",
		packageRoot: "file:///fixture/",
		path,
		encoding: "utf8",
		checksum: `sha256:${await sha256(text)}`,
		byteLength: new TextEncoder().encode(text).byteLength,
	} as const;
}

function textResourceReader(
	records: Readonly<Record<string, string>>,
	onRead?: (path: string) => void,
) {
	return {
		readText({
			descriptor,
		}: {
			readonly descriptor: { readonly path: string };
		}): string {
			onRead?.(descriptor.path);
			const text = records[descriptor.path];
			if (text === undefined) {
				throw new Error(`missing fixture resource ${descriptor.path}`);
			}
			return text;
		},
	};
}

async function gzipBase64(text: string): Promise<string> {
	const bytes = new TextEncoder().encode(text);
	const compressed = new Uint8Array(
		await new Response(
			new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip")),
		).arrayBuffer(),
	);
	let binary = "";
	for (const byte of compressed) binary += String.fromCharCode(byte);
	return btoa(binary);
}

async function bucketedLookupIndex(
	text: string,
	keyColumns: readonly string[],
): Promise<{
	readonly text: string;
	readonly sourceRowCount: number;
	readonly recordCount: number;
	readonly rowReferenceCount: number;
	readonly fuzzyColumns: readonly string[];
	readonly patternColumns: readonly string[];
	readonly indexedResourceTextByteLength: number;
	readonly lookupIndexShippedByteLength: number;
	readonly storageBudgetByteLength: number;
	readonly storageSizeRatio: number;
	readonly maximumBucketByteLength: number;
}> {
	const headerEnd = text.indexOf("\n");
	const columns = text.slice(0, headerEnd).split("\t");
	const indexes = keyColumns.map((column) => ({
		column,
		index: columns.indexOf(column),
	}));
	const rowsByKey = new Map<string, number[]>();
	const rowLines: string[] = [];
	let start = headerEnd + 1;
	let order = 0;
	while (start < text.length) {
		const newline = text.indexOf("\n", start);
		const end = newline === -1 ? text.length : newline;
		const row = text.slice(start, end);
		if (row.length > 0) {
			const cells = row.split("\t");
			rowLines.push(row);
			for (const { column, index } of indexes) {
				const values =
					column === "forms"
						? (cells[index] ?? "").split(/[|, ]/u)
						: [cells[index] ?? ""];
				for (const value of values) {
					const key = nfkcCaseFold(value);
					if (key.length === 0 || key === "-") continue;
					const scopedKey = `${column}\u0000${key}`;
					rowsByKey.set(scopedKey, [
						...(rowsByKey.get(scopedKey) ?? []),
						order,
					]);
				}
			}
			order += 1;
		}
		if (newline === -1) break;
		start = newline + 1;
	}
	const sortedKeyRows = [...rowsByKey.entries()].sort(([left], [right]) =>
		left < right ? -1 : left > right ? 1 : 0,
	);
	const keyText = `${sortedKeyRows
		.map(([key, rows]) => {
			let previous = 0;
			const deltas = [...new Set(rows)].map((row, index) => {
				const delta = index === 0 ? row : row - previous;
				previous = row;
				return delta.toString(36);
			});
			return `${key}\t${deltas.join(",")}`;
		})
		.join("\n")}\n`;
	const rowText = `${rowLines.join("\n")}\n`;
	const keyEncoded = await gzipBase64(keyText);
	const rowEncoded = await gzipBase64(rowText);
	const descriptor = async (offset: number, encoded: string, raw: string) => ({
		offset,
		length: encoded.length,
		textByteLength: new TextEncoder().encode(raw).byteLength,
		textChecksum: `sha256:${await sha256(raw)}`,
	});
	const fuzzyEntries = [...rowsByKey.entries()]
		.flatMap(([scopedKey]) => {
			const separator = scopedKey.indexOf("\u0000");
			const column = scopedKey.slice(0, separator);
			if (column !== "alias" && column !== "label") return [];
			const key = scopedKey.slice(separator + 1);
			return [
				{
					column,
					codePointLength: Array.from(key).length,
					key,
				},
			];
		})
		.sort(
			(left, right) =>
				left.column.localeCompare(right.column) ||
				left.codePointLength - right.codePointLength ||
				left.key.localeCompare(right.key),
		);
	const fuzzyGroups = new Map<
		string,
		{
			readonly column: string;
			readonly codePointLength: number;
			rows: string[];
		}
	>();
	for (const entry of fuzzyEntries) {
		const groupKey = `${entry.column}\u0000${String(entry.codePointLength)}`;
		const group = fuzzyGroups.get(groupKey) ?? {
			column: entry.column,
			codePointLength: entry.codePointLength,
			rows: [],
		};
		group.rows.push(entry.key);
		fuzzyGroups.set(groupKey, group);
	}
	const fuzzyPayloads = await Promise.all(
		[...fuzzyGroups.values()].map(async (group) => {
			const raw = `${group.rows.join("\n")}\n`;
			return { ...group, raw, encoded: await gzipBase64(raw) };
		}),
	);
	let fuzzyOffset = keyEncoded.length + rowEncoded.length;
	const fuzzyBuckets = [];
	for (const payload of fuzzyPayloads) {
		fuzzyBuckets.push({
			column: payload.column,
			codePointLength: payload.codePointLength,
			...(await descriptor(fuzzyOffset, payload.encoded, payload.raw)),
		});
		fuzzyOffset += payload.encoded.length;
	}
	const directory = {
		bucketCount: 1,
		sourceRowCount: order,
		sourceColumns: columns,
		keyBuckets: [
			{
				firstKey: sortedKeyRows[0]?.[0] ?? "",
				lastKey: sortedKeyRows.at(-1)?.[0] ?? "",
				...(await descriptor(0, keyEncoded, keyText)),
			},
		],
		rowBuckets: [
			{
				firstRowOrder: 0,
				rowCount: order,
				...(await descriptor(keyEncoded.length, rowEncoded, rowText)),
			},
		],
		fuzzyBuckets,
		patternBuckets: [],
	};
	const indexText = `textpack.lookup-index.bucketed-rows.v1\n${JSON.stringify(directory)}\n${keyEncoded}${rowEncoded}${fuzzyPayloads.map((payload) => payload.encoded).join("")}`;
	const indexedResourceTextByteLength = new TextEncoder().encode(
		text,
	).byteLength;
	const lookupIndexShippedByteLength = new TextEncoder().encode(
		indexText,
	).byteLength;
	const maximumBucketByteLength = Math.max(
		keyEncoded.length,
		rowEncoded.length,
		...fuzzyPayloads.map((payload) => payload.encoded.length),
	);
	return {
		text: indexText,
		sourceRowCount: order,
		recordCount: rowsByKey.size,
		rowReferenceCount: [...rowsByKey.values()].reduce(
			(total, rows) => total + new Set(rows).size,
			0,
		),
		fuzzyColumns: [...new Set(fuzzyEntries.map((entry) => entry.column))],
		patternColumns: [],
		indexedResourceTextByteLength,
		lookupIndexShippedByteLength,
		storageBudgetByteLength: Math.max(
			Math.ceil(indexedResourceTextByteLength * 1.3),
			indexedResourceTextByteLength + 32 * 1024,
		),
		storageSizeRatio:
			lookupIndexShippedByteLength / indexedResourceTextByteLength,
		maximumBucketByteLength,
	};
}

async function fixtureLookupMetadata(
	index: Awaited<ReturnType<typeof bucketedLookupIndex>>,
	sourceResourceId: string,
	sourceText: string,
	keyColumns: readonly string[],
) {
	return {
		indexFormat: "normalized-key-bucketed-rows-v1",
		indexedResourceId: sourceResourceId,
		indexedResourceSchemaId: "textkb.knowledge-base.rows.v1",
		indexedResourceTextChecksum: `sha256:${await sha256(sourceText)}`,
		keyNormalization: "NFKC-casefold-Unicode-17",
		keyColumns,
		emptyKeyColumns: [],
		fuzzyColumns: index.fuzzyColumns,
		patternColumns: index.patternColumns,
		bucketCount: 1,
		sourceRowCount: index.sourceRowCount,
		recordCount: index.recordCount,
		rowReferenceCount: index.rowReferenceCount,
		indexedResourceTextByteLength: index.indexedResourceTextByteLength,
		lookupIndexShippedByteLength: index.lookupIndexShippedByteLength,
		storageBudgetByteLength: index.storageBudgetByteLength,
		storageSizeRatio: index.storageSizeRatio,
		maximumBucketByteLength: index.maximumBucketByteLength,
	};
}

function kbCapabilitySlots(resourceId: string) {
	return [
		{
			slot: "kb",
			status: "task-supported" as const,
			tier: "lookup" as const,
			resourceIds: [resourceId],
			bindings: [
				{
					role: "primary" as const,
					resourceId,
					schemaId: "textkb.knowledge-base.v1",
					required: true,
					ownerPackage: "@ismail-elkorchi/textkb" as const,
				},
			],
		},
	];
}

test("creates immutable knowledge bases and validates records", () => {
	const kb = fixtureKb();
	assert.equal(kb.id, "kb-demo");
	assert.equal(kb.entities.size, 2);
	assert.equal(kb.concepts.size, 2);
	assert.equal(kb.senses.size, 2);
	assert.ok(kb.aliases.keys.includes("acme"));
	assert.throws(
		() =>
			createKnowledgeBase({
				entities: [
					{ id: "Q1", labels: { en: ["A"] } },
					{ id: "Q1", labels: { en: ["B"] } },
				],
			}),
		/TEXTKB_DUPLICATE_ID/,
	);
	assert.throws(
		() =>
			createKnowledgeBase({
				metadata: { when: new Date() },
			}),
		/TEXTKB_JSON_VALUE/,
	);
	class Metadata {
		readonly source = "fixture";
	}
	assert.throws(
		() =>
			createKnowledgeBase({
				metadata: new Metadata(),
			}),
		/TEXTKB_JSON_VALUE/,
	);
	assert.throws(
		() =>
			createKnowledgeBase({
				entities: [{ id: "Q1", labels: { en: ["A"] } }],
				aliases: [{ alias: "missing", targetKind: "entity", targetId: "Q2" }],
			}),
		/TEXTKB_ALIAS_TARGET/,
	);
});

test("loads caller-provided rows without filesystem discovery", () => {
	const entities = parseEntityRows(
		["Q1\tlabel=Acme Corp\ttype=Organization", "Q2\tlabel=Paris\ttype=Place"],
		{ language: "en" },
	);
	const aliases = parseAliasRows(["Acme\tkb=Q1", "Paris\tkb=Q2"]);
	const relations = parseRelationRows(["Organization locatedIn Place"]);
	const kb = createKnowledgeBase({
		id: "rows",
		entities,
		aliases,
		relations,
		allowExternalRelationEndpoints: true,
	});
	assert.equal(kb.entities.records.Q1?.labels.en?.[0], "Acme Corp");
	assert.equal(candidateEntities(kb, "Acme")[0]?.entityId, "Q1");
	assert.equal(querySemanticRelations(kb, { type: "locatedIn" }).length, 1);
});

test("generates deterministic entity concept and sense candidates", () => {
	const kb = fixtureKb();
	assert.deepEqual(
		candidateEntities(kb, "Acme", {
			language: "en",
			contextText: "Acme signed a contract in Paris.",
		}).map((candidate) => [candidate.entityId, candidate.rank]),
		[["Q1", 1]],
	);
	assert.equal(
		candidateConcepts(kb, "agreement", {
			targetTypes: ["legal", "general"],
			corpusCounts: { C1: 9, C2: 1 },
		})[0]?.conceptId,
		"C1",
	);
	assert.equal(
		candidateSenses(kb, "contract", {
			pos: "noun",
			contextText: "The contract was signed.",
		})[0]?.senseId,
		"S1",
	);
	assert.equal(
		scoreDisambiguation({
			aliasScore: 1,
			prior: 0.5,
			contextOverlap: 0.25,
		}),
		1.175,
	);
});

test("canonical WordNet textpack resources become a runtime knowledge base", async () => {
	const pack = {
		manifest: {
			id: "pack:wordnet-en-fixture",
			packageName: "@ismail-elkorchi/textpack-wordnet-en-fixture",
			resources: [
				{
					id: "wordnet-en-senses",
					kind: "knowledge-base" as const,
					format: "tsv",
					schemaId: "textkb.knowledge-base.rows.v1",
				},
				{
					id: "wordnet-en-synsets",
					kind: "knowledge-base" as const,
					format: "tsv",
					schemaId: "textkb.knowledge-base.rows.v1",
				},
				{
					id: "wordnet-en-relations",
					kind: "knowledge-base" as const,
					format: "tsv",
					schemaId: "textkb.knowledge-base.rows.v1",
				},
				{
					id: "wordnet-en-kb-canonical",
					kind: "knowledge-base" as const,
					format: "json",
					schemaId: "textkb.knowledge-base.v1",
				},
			],
			capabilitySlots: kbCapabilitySlots("wordnet-en-kb-canonical"),
		},
		resources: {
			"wordnet-en-senses": [
				"senseId\tentryId\tlemma\tpartOfSpeech\tsynsetId\tsubcat",
				"oewn-contract__1\toewn-contract-n\tcontract\tn\toewn-synset-contract\t",
				"oewn-agreement__1\toewn-agreement-n\tagreement\tn\toewn-synset-agreement\t",
			].join("\n"),
			"wordnet-en-synsets": [
				"synsetId\tili\tpartOfSpeech\tlexfile\tmembers\tdefinition\texampleCount",
				"oewn-synset-contract\ti1\tn\tnoun.communication\toewn-contract-n\ta binding agreement\t0",
				"oewn-synset-agreement\ti2\tn\tnoun.communication\toewn-agreement-n\ta negotiated arrangement\t0",
			].join("\n"),
			"wordnet-en-relations": [
				"scope\tsourceId\tpredicateId\ttargetId",
				"synset\toewn-synset-contract\thypernymy\toewn-synset-agreement",
			].join("\n"),
			"wordnet-en-kb-canonical": JSON.stringify({
				schemaVersion: "1",
				kind: "knowledge-base",
				kbId: "wordnet-en-kb",
				languageTags: ["en"],
				resourceRefs: [
					{ resourceId: "wordnet-en-senses", role: "senses" },
					{ resourceId: "wordnet-en-synsets", role: "synsets" },
					{ resourceId: "wordnet-en-relations", role: "relations" },
				],
			}),
		},
	};
	const kb = await knowledgeBaseFromPack(pack as never);
	assert.equal(kb.concepts.size, 2);
	assert.equal(candidateSenses(kb, "contract")[0]?.senseId, "oewn-contract__1");
	assert.equal(querySemanticRelations(kb, { type: "hypernymy" }).length, 1);
});

test("entity linker facade uses canonical knowledge-base textpacks", async () => {
	const pack = {
		manifest: {
			id: "pack:wikidata-fr-fixture",
			packageName: "@ismail-elkorchi/textpack-wikidata-fr-fixture",
			resources: [
				{
					id: "wikidata-fr-kb-canonical",
					kind: "knowledge-base" as const,
					format: "json",
					schemaId: "textkb.knowledge-base.v1",
				},
			],
			capabilitySlots: kbCapabilitySlots("wikidata-fr-kb-canonical"),
		},
		resources: {
			"wikidata-fr-kb-canonical": JSON.stringify({
				schemaVersion: "1",
				kind: "knowledge-base",
				kbId: "wikidata-fr",
				languageTags: ["fr"],
				entities: [
					{
						entityId: "Q90",
						typeIds: ["Q515"],
						labels: [{ languageTag: "fr", value: "Paris" }],
						aliases: [{ languageTag: "fr", value: "Paris" }],
					},
				],
			}),
		},
	};
	const linker = await entityLinkerFromPack(pack as never, {
		linkOptions: { language: "fr" },
	});
	assert.equal(linker.candidates("Paris")[0]?.entityId, "Q90");
});

test("canonical WordNet loader is language-neutral", async () => {
	const pack = {
		manifest: {
			id: "pack:wordnet-ar-fixture",
			packageName: "@ismail-elkorchi/textpack-wordnet-ar-fixture",
			resources: [
				{
					id: "wordnet-ar-senses",
					kind: "knowledge-base" as const,
					format: "tsv",
					schemaId: "textkb.knowledge-base.rows.v1",
				},
				{
					id: "wordnet-ar-synsets",
					kind: "knowledge-base" as const,
					format: "tsv",
					schemaId: "textkb.knowledge-base.rows.v1",
				},
				{
					id: "wordnet-ar-relations",
					kind: "knowledge-base" as const,
					format: "tsv",
					schemaId: "textkb.knowledge-base.rows.v1",
				},
				{
					id: "wordnet-ar-kb-canonical",
					kind: "knowledge-base" as const,
					format: "json",
					schemaId: "textkb.knowledge-base.v1",
				},
			],
			capabilitySlots: kbCapabilitySlots("wordnet-ar-kb-canonical"),
		},
		resources: {
			"wordnet-ar-senses": [
				"senseId\tentryId\tlemma\tpartOfSpeech\tsynsetId\tsubcat",
				"awn-kitab__1\tawn-kitab-n\tkitab\tn\tawn-synset-kitab\t",
			].join("\n"),
			"wordnet-ar-synsets": [
				"synsetId\tili\tpartOfSpeech\tlexfile\tmembers\tdefinition\texampleCount",
				"awn-synset-kitab\ti1\tn\tnoun.communication\tawn-kitab-n\tbook\t0",
			].join("\n"),
			"wordnet-ar-relations": [
				"scope\tsourceId\tpredicateId\ttargetId",
				"synset\tawn-synset-kitab\thypernymy\tawn-synset-object",
			].join("\n"),
			"wordnet-ar-kb-canonical": JSON.stringify({
				schemaVersion: "1",
				kind: "knowledge-base",
				kbId: "wordnet-ar-kb",
				languageTags: ["ar"],
				resourceRefs: [
					{ resourceId: "wordnet-ar-senses", role: "senses" },
					{ resourceId: "wordnet-ar-synsets", role: "synsets" },
					{ resourceId: "wordnet-ar-relations", role: "relations" },
				],
			}),
		},
	};
	const kb = await knowledgeBaseFromPack(pack as never);
	assert.equal(kb.senses.records["awn-kitab__1"]?.language, "ar");
	assert.equal(
		kb.concepts.records["awn-synset-kitab"]?.labels.ar?.[0],
		"kitab",
	);
	assert.equal(querySemanticRelations(kb, { type: "hypernymy" }).length, 1);
});

test("canonical KB textpack loader materializes file-backed resources", async () => {
	const resourceTexts = {
		"resources/wordnet-en-senses.tsv": [
			"senseId\tentryId\tlemma\tpartOfSpeech\tsynsetId\tsubcat",
			"oewn-contract__1\toewn-contract-n\tcontract\tn\toewn-synset-contract\t",
		].join("\n"),
		"resources/wordnet-en-synsets.tsv": [
			"synsetId\tili\tpartOfSpeech\tlexfile\tmembers\tdefinition\texampleCount",
			"oewn-synset-contract\ti1\tn\tnoun.communication\toewn-contract-n\ta binding agreement\t0",
		].join("\n"),
		"resources/wordnet-en-relations.tsv": [
			"scope\tsourceId\tpredicateId\ttargetId",
			"synset\toewn-synset-contract\thypernymy\toewn-synset-agreement",
		].join("\n"),
		"resources/wordnet-en-kb.json": JSON.stringify({
			schemaVersion: "1",
			kind: "knowledge-base",
			kbId: "wordnet-en-kb",
			languageTags: ["en"],
			resourceRefs: [
				{ resourceId: "wordnet-en-senses", role: "senses" },
				{ resourceId: "wordnet-en-synsets", role: "synsets" },
				{ resourceId: "wordnet-en-relations", role: "relations" },
			],
		}),
	};
	const pack = {
		manifest: {
			id: "pack:wordnet-en-file-fixture",
			packageName: "@ismail-elkorchi/textpack-wordnet-en-file-fixture",
			resources: [
				{
					id: "wordnet-en-senses",
					kind: "knowledge-base" as const,
					format: "tsv",
					schemaId: "textkb.knowledge-base.rows.v1",
				},
				{
					id: "wordnet-en-synsets",
					kind: "knowledge-base" as const,
					format: "tsv",
					schemaId: "textkb.knowledge-base.rows.v1",
				},
				{
					id: "wordnet-en-relations",
					kind: "knowledge-base" as const,
					format: "tsv",
					schemaId: "textkb.knowledge-base.rows.v1",
				},
				{
					id: "wordnet-en-kb-canonical",
					kind: "knowledge-base" as const,
					format: "json",
					schemaId: "textkb.knowledge-base.v1",
				},
			],
			capabilitySlots: kbCapabilitySlots("wordnet-en-kb-canonical"),
		},
		resources: {
			"wordnet-en-senses": await fileBackedTextResource(
				"resources/wordnet-en-senses.tsv",
				resourceTexts["resources/wordnet-en-senses.tsv"],
			),
			"wordnet-en-synsets": await fileBackedTextResource(
				"resources/wordnet-en-synsets.tsv",
				resourceTexts["resources/wordnet-en-synsets.tsv"],
			),
			"wordnet-en-relations": await fileBackedTextResource(
				"resources/wordnet-en-relations.tsv",
				resourceTexts["resources/wordnet-en-relations.tsv"],
			),
			"wordnet-en-kb-canonical": await fileBackedTextResource(
				"resources/wordnet-en-kb.json",
				resourceTexts["resources/wordnet-en-kb.json"],
			),
		},
	};
	const reader = textResourceReader(resourceTexts);
	const kb = await knowledgeBaseFromPack(pack as never, { reader });
	assert.equal(candidateSenses(kb, "contract")[0]?.senseId, "oewn-contract__1");
});

test("canonical Wikidata textpack resources become a runtime knowledge base", async () => {
	const aliasText =
		"entityId\tlanguageTag\talias\nhttp://www.wikidata.org/entity/Q90\tfr\tVille de Paris\nhttp://www.wikidata.org/entity/Q90\tfr\tStraße\n";
	const entityText = `${[
		"entityId\tlanguageTag\tlabel\tdescription\ttypeId\ttypeLabel\tsitelinks\twikiUrl",
		"http://www.wikidata.org/entity/Q90\tfr\tParis\tcapitale de la France\tQ515\tville\t120\thttps://fr.wikipedia.org/wiki/Paris",
	].join("\n")}\n`;
	const relationText =
		"sourceId\tpredicateId\ttargetId\trelationLabel\nhttp://www.wikidata.org/entity/Q90\tP31\thttp://www.wikidata.org/entity/Q515\tinstance de\n";
	const aliasIndex = await bucketedLookupIndex(aliasText, ["alias"]);
	const entityIndex = await bucketedLookupIndex(entityText, [
		"entityId",
		"label",
	]);
	const relationIndex = await bucketedLookupIndex(relationText, [
		"sourceId",
		"targetId",
	]);
	const resourceTexts = {
		"resources/wikidata-fr-entities.indexed-table.v1.txt": entityIndex.text,
		"resources/wikidata-fr-aliases.indexed-table.v1.txt": aliasIndex.text,
		"resources/wikidata-fr-relations.indexed-table.v1.txt": relationIndex.text,
		"resources/wikidata-fr-kb-canonical.json": JSON.stringify({
			schemaVersion: "1",
			kind: "knowledge-base",
			kbId: "wikidata-fr-kb",
			languageTags: ["fr"],
			resourceRefs: [
				{ resourceId: "wikidata-fr-entities", role: "entities" },
				{
					resourceId: "wikidata-fr-entities-lookup-index",
					role: "lookup-index",
				},
				{ resourceId: "wikidata-fr-aliases", role: "aliases" },
				{
					resourceId: "wikidata-fr-aliases-lookup-index",
					role: "lookup-index",
				},
				{ resourceId: "wikidata-fr-relations", role: "relations" },
				{
					resourceId: "wikidata-fr-relations-lookup-index",
					role: "lookup-index",
				},
			],
		}),
	};
	const pack = {
		manifest: {
			id: "pack:wikidata-fr-file-fixture",
			packageName: "@ismail-elkorchi/textpack-wikidata-fr-file-fixture",
			resources: [
				{
					id: "wikidata-fr-entities",
					kind: "knowledge-base" as const,
					path: "resources/wikidata-fr-entities.indexed-table.v1.txt",
					format: "textpack-indexed-table-v1",
					schemaId: "textkb.knowledge-base.rows.v1",
					metadata: {
						lookupIndexResourceId: "wikidata-fr-entities-lookup-index",
					},
				},
				{
					id: "wikidata-fr-entities-lookup-index",
					kind: "dataset" as const,
					path: "resources/wikidata-fr-entities.indexed-table.v1.txt",
					format: "textpack-indexed-table-v1",
					schemaId: "textpack.lookup-index.v1",
					metadata: await fixtureLookupMetadata(
						entityIndex,
						"wikidata-fr-entities",
						entityText,
						["entityId", "label"],
					),
				},
				{
					id: "wikidata-fr-aliases",
					kind: "knowledge-base" as const,
					path: "resources/wikidata-fr-aliases.indexed-table.v1.txt",
					format: "textpack-indexed-table-v1",
					schemaId: "textkb.knowledge-base.rows.v1",
					metadata: {
						lookupIndexResourceId: "wikidata-fr-aliases-lookup-index",
					},
				},
				{
					id: "wikidata-fr-aliases-lookup-index",
					kind: "dataset" as const,
					path: "resources/wikidata-fr-aliases.indexed-table.v1.txt",
					format: "textpack-indexed-table-v1",
					schemaId: "textpack.lookup-index.v1",
					metadata: await fixtureLookupMetadata(
						aliasIndex,
						"wikidata-fr-aliases",
						aliasText,
						["alias"],
					),
				},
				{
					id: "wikidata-fr-relations",
					kind: "knowledge-base" as const,
					path: "resources/wikidata-fr-relations.indexed-table.v1.txt",
					format: "textpack-indexed-table-v1",
					schemaId: "textkb.knowledge-base.rows.v1",
					metadata: {
						lookupIndexResourceId: "wikidata-fr-relations-lookup-index",
					},
				},
				{
					id: "wikidata-fr-relations-lookup-index",
					kind: "dataset" as const,
					path: "resources/wikidata-fr-relations.indexed-table.v1.txt",
					format: "textpack-indexed-table-v1",
					schemaId: "textpack.lookup-index.v1",
					metadata: await fixtureLookupMetadata(
						relationIndex,
						"wikidata-fr-relations",
						relationText,
						["sourceId", "targetId"],
					),
				},
				{
					id: "wikidata-fr-kb-canonical",
					kind: "knowledge-base" as const,
					format: "json",
					schemaId: "textkb.knowledge-base.v1",
				},
			],
			capabilitySlots: kbCapabilitySlots("wikidata-fr-kb-canonical"),
		},
		resources: {
			"wikidata-fr-aliases": await fileBackedTextResource(
				"resources/wikidata-fr-aliases.indexed-table.v1.txt",
				aliasIndex.text,
			),
			"wikidata-fr-aliases-lookup-index": await fileBackedTextResource(
				"resources/wikidata-fr-aliases.indexed-table.v1.txt",
				aliasIndex.text,
			),
			"wikidata-fr-entities-lookup-index": await fileBackedTextResource(
				"resources/wikidata-fr-entities.indexed-table.v1.txt",
				entityIndex.text,
			),
			"wikidata-fr-entities": await fileBackedTextResource(
				"resources/wikidata-fr-entities.indexed-table.v1.txt",
				entityIndex.text,
			),
			"wikidata-fr-kb-canonical": await fileBackedTextResource(
				"resources/wikidata-fr-kb-canonical.json",
				resourceTexts["resources/wikidata-fr-kb-canonical.json"],
			),
			"wikidata-fr-relations": await fileBackedTextResource(
				"resources/wikidata-fr-relations.indexed-table.v1.txt",
				relationIndex.text,
			),
			"wikidata-fr-relations-lookup-index": await fileBackedTextResource(
				"resources/wikidata-fr-relations.indexed-table.v1.txt",
				relationIndex.text,
			),
		},
	};
	const targetedReads: string[] = [];
	const targetedReader = textResourceReader(resourceTexts, (path) => {
		targetedReads.push(path);
	});
	const targetedSlice = await knowledgeBaseSliceFromPack(pack as never, {
		reader: targetedReader,
		mentions: ["Ville de Paris"],
		language: "fr",
	});
	assert.equal(targetedSlice.entities.records.Q90?.id, "Q90");
	assert.equal(normalizeKnowledgeBaseMention("Straße"), "strasse");
	assert.deepEqual(
		(
			await knowledgeBaseMentionKeyLengthsFromPack(pack as never, {
				reader: targetedReader,
				language: "fr",
			})
		).codePointLengths,
		[5, 7, 14],
	);
	assert.equal(
		targetedReads.some(
			(path) => path.endsWith(".tsv") && !path.includes("lookup-index"),
		),
		false,
	);
	const fuzzySlice = await knowledgeBaseSliceFromPack(pack as never, {
		reader: targetedReader,
		mentions: ["Strase"],
		language: "fr",
		maxEditDistance: 2,
	});
	assert.equal(
		candidateEntities(fuzzySlice, "Strase", {
			language: "fr",
			maxEditDistance: 2,
		})[0]?.entityId,
		"Q90",
	);
	const reader = textResourceReader(resourceTexts);
	const kb = await knowledgeBaseFromPack(pack as never, { reader });
	assert.equal(kb.entities.records.Q90?.labels.fr?.[0], "Paris");
	assert.equal(
		kb.entities.records.Q90?.metadata?.sourceEntityId,
		"http://www.wikidata.org/entity/Q90",
	);
	assert.equal(candidateEntities(kb, "Ville de Paris")[0]?.entityId, "Q90");
	assert.equal(
		querySemanticRelations(kb, { type: "P31" })[0]?.targetId,
		"Q515",
	);
	assert.equal(await knowledgeBaseFromPack(pack as never, { reader }), kb);
	const slice = await knowledgeBaseSliceFromPack(pack as never, {
		reader,
		mentions: ["Ville de Paris"],
		language: "fr",
	});
	assert.equal(slice.entities.records.Q90?.id, "Q90");
	const casefoldSlice = await knowledgeBaseSliceFromPack(pack as never, {
		reader,
		mentions: ["STRASSE"],
		language: "fr",
	});
	assert.equal(casefoldSlice.entities.records.Q90?.id, "Q90");
	const repeatedSlice = await knowledgeBaseSliceFromPack(pack as never, {
		reader,
		mentions: ["Ville de Paris"],
		language: "fr",
	});
	assert.notEqual(repeatedSlice, slice);
	assert.deepEqual(repeatedSlice, slice);
});

test("links entities terms and senses while preserving source annotations", () => {
	const kb = fixtureKb();
	const doc = fixtureDocument();
	const linkedEntities = linkEntities(doc, kb, {
		sourceLayerIds: ["entity.mention"],
		mentionSource: "annotations",
		keepAlternatives: true,
	});
	assert.notEqual(linkedEntities, doc);
	assert.equal(
		linkedEntities.layers["entity.mention"]?.annotations["ent-acme"]?.features
			?.source,
		"fixture",
	);
	assert.equal(
		linkedEntities.layers["entity.mention"]?.annotations["ent-acme"]
			?.alternatives?.length,
		1,
	);
	const entityLinks = Object.values(
		linkedEntities.layers["link.entity"]?.annotations ?? {},
	);
	assert.equal(entityLinks.length, 1);
	assert.equal(entityLinks[0]?.evidence.mode, "kb");
	const entityLinkValue = entityLinks[0]?.value as {
		readonly entityId?: string;
		readonly entityTypes?: readonly string[];
		readonly aliasMatchKind?: string;
		readonly matchKind?: string;
	};
	assert.equal(entityLinkValue.entityId, "Q1");
	assert.deepEqual(entityLinkValue.entityTypes, ["Organization"]);
	assert.equal(entityLinkValue.aliasMatchKind, "alias");
	assert.equal(entityLinkValue.matchKind, "exact");

	const linkedTerms = linkTerms(linkedEntities, kb, {
		sourceLayerIds: ["term.candidate"],
		mentionSource: "annotations",
	});
	const termLinks = Object.values(
		linkedTerms.layers["term.link"]?.annotations ?? {},
	);
	assert.equal(termLinks.length, 1);
	assert.equal((termLinks[0]?.value as { conceptId?: string }).conceptId, "C1");

	const linkedSenses = disambiguateSense(linkedTerms, kb, {
		tokenLayerIds: ["token.word"],
		language: "en",
	});
	const senseLinks = Object.values(
		linkedSenses.layers["sense.link"]?.annotations ?? {},
	);
	assert.ok(
		senseLinks.some(
			(annotation) =>
				(annotation.value as { senseId?: string }).senseId === "S1",
		),
	);
});

test("links normalized aliases with language filtering and longest spans", () => {
	const kb = createKnowledgeBase({
		id: "kb-multilingual-aliases",
		entities: [
			{ id: "Q-DE", labels: { de: ["Straße"] } },
			{ id: "Q-ROMA-EN", labels: { en: ["Roma"] } },
			{ id: "Q-ROMA-FR", labels: { fr: ["Roma"] } },
			{ id: "Q-NY", labels: { en: ["New York"] } },
			{ id: "Q-YORK", labels: { en: ["York"] } },
			{
				id: "Q-FR",
				labels: { fr: ["France"] },
				aliases: { fr: ["La France"] },
			},
			{ id: "Q-A", labels: { en: ["A"] } },
		],
	});
	assert.deepEqual(
		candidateEntities(kb, "Roma", { language: "fr" }).map(
			(candidate) => candidate.entityId,
		),
		["Q-ROMA-FR"],
	);
	const street = linkEntities(createDocument("STRASSE", { id: "street" }), kb, {
		language: "de",
	});
	assert.equal(
		Object.values(street.layers["link.entity"]?.annotations ?? {}).length,
		1,
	);
	const city = linkEntities(createDocument("New York", { id: "city" }), kb, {
		language: "en",
	});
	const links = Object.values(city.layers["link.entity"]?.annotations ?? {});
	assert.equal(links.length, 1);
	assert.equal((links[0]?.value as { entityId?: string }).entityId, "Q-NY");
	const country = linkEntities(
		createDocument("Je visite la France.", { id: "country" }),
		kb,
		{ language: "fr" },
	);
	const countryLinks = Object.values(
		country.layers["link.entity"]?.annotations ?? {},
	);
	assert.equal(countryLinks.length, 1);
	assert.deepEqual(countryLinks[0]?.spans[0]?.span, {
		start: 13,
		end: 19,
		unit: "utf16-code-unit",
	});
	assert.equal(
		(countryLinks[0]?.value as { entityId?: string }).entityId,
		"Q-FR",
	);
	const supplementaryBoundary = linkEntities(
		createDocument("A𐐀", { id: "supplementary-boundary" }),
		kb,
		{ language: "en" },
	);
	assert.equal(
		Object.values(
			supplementaryBoundary.layers["link.entity"]?.annotations ?? {},
		).length,
		0,
	);
});

test("rejects non-UTF-16 spans before slicing text", () => {
	assert.throws(
		() =>
			linkEntities(badSpanDocument(), fixtureKb(), {
				sourceLayerIds: ["entity.mention"],
			}),
		/TEXTKB_SPAN_UNIT/,
	);
});

test("queries relations ontology gazetteers thesaurus and cohesion features", () => {
	const kb = fixtureKb();
	assert.equal(
		querySemanticRelations(kb, { sourceId: "Q1", type: "locatedIn" })[0]
			?.targetId,
		"Q2",
	);
	assert.equal(
		traverseSemanticRelations(kb, "C1", {
			types: ["equivalent-concept"],
			maxDepth: 1,
		})[0]?.endId,
		"C2",
	);
	assert.equal(thesaurusRelations(kb, "C1").length, 2);
	const matches = ontologyGazetteer(fixtureDocument(), kb, {
		targetTypes: ["Organization"],
	});
	assert.equal(matches[0]?.targetId, "Q1");
	const gazetteerDoc = annotateOntologyGazetteer(fixtureDocument(), kb, {
		targetTypes: ["Place"],
	});
	assert.equal(
		Object.values(gazetteerDoc.layers["kb.gazetteer"]?.annotations ?? {})
			.length,
		1,
	);
	const chains = lexicalChains(kb, ["C1", "C2"], {
		relationTypes: ["related-term", "equivalent-concept"],
	});
	assert.equal(chains.length, 1);
	assert.deepEqual(cohesionFeatures(chains), {
		chainCount: 1,
		cohesionScore: 1,
		maxChainLength: 2,
		meanChainLength: 2,
		memberCount: 2,
	});
});

function xmlDecode(value) {
	return value
		.replace(/&#x([0-9a-f]+);/giu, (_, hex) =>
			String.fromCodePoint(Number.parseInt(hex, 16)),
		)
		.replace(/&#([0-9]+);/gu, (_, code) =>
			String.fromCodePoint(Number.parseInt(code, 10)),
		)
		.replace(/&quot;/gu, '"')
		.replace(/&apos;/gu, "'")
		.replace(/&lt;/gu, "<")
		.replace(/&gt;/gu, ">")
		.replace(/&amp;/gu, "&");
}

function xmlAttributes(text) {
	const attributes = {};
	for (const match of text.matchAll(
		/([A-Za-z_:][-A-Za-z0-9_:.]*)="([^"]*)"/gu,
	)) {
		attributes[match[1]] = xmlDecode(match[2]);
	}
	return attributes;
}

function firstXmlText(body, tagName) {
	const pattern = new RegExp(
		`<${tagName}\\b[^>]*>([\\s\\S]*?)</${tagName}>`,
		"u",
	);
	const match = body.match(pattern);
	if (match === null) return "";
	return xmlDecode(
		match[1]
			.replace(/<[^>]+>/gu, " ")
			.replace(/\s+/gu, " ")
			.trim(),
	);
}

function countXmlTags(body, tagName) {
	const pattern = new RegExp(`<${tagName}\\b`, "gu");
	return [...body.matchAll(pattern)].length;
}

function compareRelationRows(left, right) {
	const scopeDelta = left[0].localeCompare(right[0]);
	if (scopeDelta !== 0) return scopeDelta;
	const sourceDelta = left[1].localeCompare(right[1]);
	if (sourceDelta !== 0) return sourceDelta;
	const typeDelta = left[2].localeCompare(right[2]);
	if (typeDelta !== 0) return typeDelta;
	return left[3].localeCompare(right[3]);
}

export function parseWordnetLmf(xml) {
	const lexicalEntryRows = [];
	const senseRows = [];
	const relationRows = [];
	const synsetRows = [];

	for (const match of xml.matchAll(
		/<LexicalEntry\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/LexicalEntry>/gu,
	)) {
		const entryId = xmlDecode(match[1]);
		const body = match[2];
		// LMF permits Lemma to contain Form children. Matching only self-closing
		// Lemma elements silently discarded the attributes of those entries.
		const lemmaMatch = body.match(/<Lemma\b([^>]*?)(?:\/>|>)/u);
		const lemmaAttrs = lemmaMatch === null ? {} : xmlAttributes(lemmaMatch[1]);
		const lemma = lemmaAttrs.writtenForm ?? "";
		const partOfSpeech = lemmaAttrs.partOfSpeech ?? "";
		lexicalEntryRows.push([entryId, lemma, partOfSpeech]);
		for (const senseMatch of body.matchAll(
			/<Sense\b([^>]*?)(?:\/>|>([\s\S]*?)<\/Sense>)/gu,
		)) {
			const senseAttrs = xmlAttributes(senseMatch[1]);
			const senseId = senseAttrs.id ?? "";
			senseRows.push([
				senseId,
				entryId,
				lemma,
				partOfSpeech,
				senseAttrs.synset ?? "",
				senseAttrs.subcat ?? "",
			]);
			const senseBody = senseMatch[2] ?? "";
			for (const relationMatch of senseBody.matchAll(
				/<SenseRelation\b([^>]*)\/>/gu,
			)) {
				const relationAttrs = xmlAttributes(relationMatch[1]);
				relationRows.push([
					"sense",
					senseId,
					relationAttrs.relType ?? "",
					relationAttrs.target ?? "",
				]);
			}
		}
	}

	for (const match of xml.matchAll(/<Synset\b([^>]*)>([\s\S]*?)<\/Synset>/gu)) {
		const attrs = xmlAttributes(match[1]);
		const body = match[2];
		const synsetId = attrs.id ?? "";
		synsetRows.push([
			synsetId,
			attrs.ili ?? "",
			attrs.partOfSpeech ?? "",
			attrs.lexfile ?? "",
			attrs.members ?? "",
			firstXmlText(body, "Definition"),
			countXmlTags(body, "Example"),
		]);
		for (const relationMatch of body.matchAll(
			/<SynsetRelation\b([^>]*)\/>/gu,
		)) {
			const relationAttrs = xmlAttributes(relationMatch[1]);
			relationRows.push([
				"synset",
				synsetId,
				relationAttrs.relType ?? "",
				relationAttrs.target ?? "",
			]);
		}
	}

	lexicalEntryRows.sort((left, right) => left[0].localeCompare(right[0]));
	senseRows.sort((left, right) => left[0].localeCompare(right[0]));
	synsetRows.sort((left, right) => left[0].localeCompare(right[0]));
	relationRows.sort(compareRelationRows);
	return { lexicalEntryRows, senseRows, synsetRows, relationRows };
}

function requiredCell(row, index, label, rowId, defects) {
	if (typeof row[index] !== "string" || row[index].trim().length === 0) {
		defects.push(
			`${label} ${rowId || "<missing-id>"} has an empty required field`,
		);
	}
}

function duplicateIds(rows, label, defects) {
	const ids = new Set();
	for (const row of rows) {
		const id = row[0] ?? "";
		if (id.length === 0) continue;
		if (ids.has(id)) defects.push(`${label} ${id} is duplicated`);
		ids.add(id);
	}
	return ids;
}

export function wordnetSemanticDefects({
	lexicalEntryRows,
	senseRows,
	synsetRows,
	relationRows,
}) {
	const defects = [];
	const entriesById = new Map();
	for (const row of lexicalEntryRows) {
		const rowId = row[0] ?? "";
		requiredCell(row, 0, "lexical entry", rowId, defects);
		requiredCell(row, 1, "lexical entry lemma for", rowId, defects);
		requiredCell(row, 2, "lexical entry part of speech for", rowId, defects);
		if (rowId.length > 0) entriesById.set(rowId, row);
	}
	duplicateIds(lexicalEntryRows, "lexical entry", defects);

	const synsetIds = duplicateIds(synsetRows, "synset", defects);
	for (const row of synsetRows) {
		const rowId = row[0] ?? "";
		requiredCell(row, 0, "synset", rowId, defects);
		requiredCell(row, 2, "synset part of speech for", rowId, defects);
		for (const entryId of (row[4] ?? "").trim().split(/\s+/u)) {
			if (entryId.length > 0 && !entriesById.has(entryId)) {
				defects.push(
					`synset ${rowId || "<missing-id>"} member ${entryId} references an unknown lexical entry`,
				);
			}
		}
	}

	const senseIds = duplicateIds(senseRows, "sense", defects);
	for (const row of senseRows) {
		const senseId = row[0] ?? "";
		for (const index of [0, 1, 2, 3, 4]) {
			requiredCell(row, index, "sense", senseId, defects);
		}
		const entry = entriesById.get(row[1] ?? "");
		if (entry === undefined) {
			defects.push(
				`sense ${senseId || "<missing-id>"} references an unknown lexical entry`,
			);
		} else if (entry[1] !== row[2] || entry[2] !== row[3]) {
			defects.push(
				`sense ${senseId || "<missing-id>"} lemma or part of speech disagrees with its lexical entry`,
			);
		}
		if (!synsetIds.has(row[4] ?? "")) {
			defects.push(
				`sense ${senseId || "<missing-id>"} references an unknown synset`,
			);
		}
	}

	for (const row of relationRows) {
		const rowId = row[1] ?? "";
		const scope = row[0];
		if (scope !== "sense" && scope !== "synset") {
			defects.push(`relation ${rowId || "<missing-id>"} has an invalid scope`);
		}
		for (const index of [1, 2, 3]) {
			requiredCell(row, index, "relation", rowId, defects);
		}
		const scopedIds = scope === "sense" ? senseIds : synsetIds;
		if ((scope === "sense" || scope === "synset") && rowId.length > 0) {
			if (!scopedIds.has(rowId)) {
				defects.push(
					`${scope} relation source ${rowId} references an unknown ${scope}`,
				);
			}
			const targetId = row[3] ?? "";
			if (targetId.length > 0 && !scopedIds.has(targetId)) {
				defects.push(
					`${scope} relation target ${targetId} references an unknown ${scope}`,
				);
			}
		}
	}

	return defects;
}

export function assertWordnetSemanticIntegrity(tables, label = "WordNet") {
	const defects = wordnetSemanticDefects(tables);
	if (defects.length === 0) return;
	const displayed = defects.slice(0, 20);
	const remainder = defects.length - displayed.length;
	const suffix = remainder > 0 ? `\n... and ${remainder} more defects` : "";
	throw new Error(
		`${label} semantic integrity failed (${defects.length} defects):\n${displayed.join("\n")}${suffix}`,
	);
}

function tsvRows(text, expectedHeader, label) {
	const lines = text.replace(/\r\n/gu, "\n").replace(/\r/gu, "\n").split("\n");
	if (lines.at(-1) === "") lines.pop();
	const header = lines.shift()?.split("\t") ?? [];
	if (header.join("\t") !== expectedHeader.join("\t")) {
		throw new Error(`${label} has an unexpected TSV header`);
	}
	return lines.map((line) => line.split("\t"));
}

export function parseWordnetTsvTables({
	lexicalEntriesText,
	sensesText,
	synsetsText,
	relationsText,
}) {
	return {
		lexicalEntryRows: tsvRows(
			lexicalEntriesText,
			["entryId", "lemma", "partOfSpeech"],
			"WordNet lexical entries",
		),
		senseRows: tsvRows(
			sensesText,
			["senseId", "entryId", "lemma", "partOfSpeech", "synsetId", "subcat"],
			"WordNet senses",
		),
		synsetRows: tsvRows(
			synsetsText,
			[
				"synsetId",
				"ili",
				"partOfSpeech",
				"lexfile",
				"members",
				"definition",
				"exampleCount",
			],
			"WordNet synsets",
		),
		relationRows: tsvRows(
			relationsText,
			["scope", "sourceId", "predicateId", "targetId"],
			"WordNet relations",
		),
	};
}

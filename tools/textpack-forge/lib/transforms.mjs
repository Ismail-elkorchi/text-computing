import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";

import { assertWikidataExtractLineage } from "./policy-integrity.mjs";
import {
	assertWordnetSemanticIntegrity,
	parseWordnetLmf,
} from "./wordnet-lmf.mjs";

const ROOT = path.resolve(new URL("../../..", import.meta.url).pathname);

function expect(condition, message, details) {
	if (condition) return;
	throw new Error(details === undefined ? message : `${message}\n${details}`);
}

function sha256(text) {
	return `sha256:${createHash("sha256").update(text).digest("hex")}`;
}

function sorted(values) {
	return [...values].sort((left, right) => left.localeCompare(right));
}

function uniqueSorted(values) {
	return sorted(new Set(values));
}

function sortJson(value) {
	if (Array.isArray(value)) return value.map((entry) => sortJson(entry));
	if (value === null || typeof value !== "object") return value;
	const output = {};
	for (const key of Object.keys(value).sort())
		output[key] = sortJson(value[key]);
	return output;
}

function stableJson(value) {
	return `${JSON.stringify(sortJson(value), null, 2)}\n`;
}

function tsvCell(value) {
	return String(value ?? "")
		.replace(/\r?\n/gu, " ")
		.replace(/\t/gu, " ")
		.trim();
}

function tsvFile(header, rows) {
	return `${[header, ...rows]
		.map((row) => row.map((cell) => tsvCell(cell)).join("\t"))
		.join("\n")}\n`;
}

function outputFor(resourceSpec, resourceId, text) {
	const output = resourceSpec.outputs.find(
		(candidate) => candidate.resourceId === resourceId,
	);
	if (output === undefined) {
		throw new Error(
			`${resourceSpec.resourceSpecId} does not declare output ${resourceId}.`,
		);
	}
	return {
		id: output.resourceId,
		kind: output.kind,
		path: output.path,
		text,
	};
}

function requiredInput(inputs, basename, resourceSpec) {
	const text = inputs.get(basename);
	if (text === undefined) {
		throw new Error(`${resourceSpec.resourceSpecId} missing ${basename}.`);
	}
	return text;
}

function incrementWordnetCount(counts, key) {
	counts.set(key, (counts.get(key) ?? 0) + 1);
}

function sortedWordnetCountRows(counts) {
	return [...counts].sort(([left], [right]) => left.localeCompare(right));
}

function transformWordnetLmf(resourceSpec, inputs, config) {
	const xml = requiredInput(inputs, config.inputFileName, resourceSpec);
	const ids = {
		kbCanonical: `${config.resourcePrefix}-kb-canonical`,
		lexicalEntries: `${config.resourcePrefix}-lexical-entries`,
		lexiconCanonical: `${config.resourcePrefix}-lexicon-canonical`,
		quality: `${config.resourcePrefix}-quality`,
		qualityProfile: `${config.resourcePrefix}-quality-profile`,
		relations: `${config.resourcePrefix}-relations`,
		senses: `${config.resourcePrefix}-senses`,
		synsets: `${config.resourcePrefix}-synsets`,
	};
	const tables = parseWordnetLmf(xml);
	assertWordnetSemanticIntegrity(tables, config.sourceLabel);
	const { lexicalEntryRows, senseRows, relationRows, synsetRows } = tables;
	const lexicalPosCounts = new Map();
	const relationTypeCounts = new Map();
	for (const row of lexicalEntryRows) {
		incrementWordnetCount(lexicalPosCounts, row[2]);
	}
	for (const row of relationRows) {
		incrementWordnetCount(relationTypeCounts, `${row[0]}:${row[2]}`);
	}

	const summary = {
		schemaVersion: "1",
		sourceId: config.sourceId,
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		lexicalEntryCount: lexicalEntryRows.length,
		lexicalEntrySemanticIntegrityRatio: 1,
		senseCount: senseRows.length,
		senseSemanticIntegrityRatio: 1,
		synsetCount: synsetRows.length,
		relationCount: relationRows.length,
		lexicalEntriesByPartOfSpeech: Object.fromEntries(
			sortedWordnetCountRows(lexicalPosCounts),
		),
		relationsByType: Object.fromEntries(
			sortedWordnetCountRows(relationTypeCounts),
		),
		recordsAccepted:
			lexicalEntryRows.length +
			senseRows.length +
			synsetRows.length +
			relationRows.length,
		recordsRejected: 0,
		warnings: [],
	};
	const canonicalLexicon = {
		schemaVersion: "1",
		kind: "lexicon",
		lexiconId: config.lexiconId,
		languageTag: config.languageTag,
		script: config.script,
		entryCount: lexicalEntryRows.length,
		resourceRefs: [
			{
				resourceId: ids.lexicalEntries,
				role: "entries",
				recordCount: lexicalEntryRows.length,
			},
		],
	};
	const canonicalKb = {
		schemaVersion: "1",
		kind: "knowledge-base",
		kbId: config.kbId,
		languageTags: [config.languageTag],
		entityCount: synsetRows.length + senseRows.length,
		relationCount: relationRows.length,
		resourceRefs: [
			{
				resourceId: ids.senses,
				role: "senses",
				recordCount: senseRows.length,
			},
			{
				resourceId: ids.synsets,
				role: "synsets",
				recordCount: synsetRows.length,
			},
			{
				resourceId: ids.relations,
				role: "relations",
				recordCount: relationRows.length,
			},
		],
	};
	const canonicalQuality = {
		schemaVersion: "1",
		kind: "quality-profile",
		profileId: config.qualityProfileId,
		languageTag: config.languageTag,
		script: config.script,
		diagnostics: [
			{
				diagnosticId: `${config.resourcePrefix}-transform-warnings`,
				task: "kb.transform",
				severity: "info",
				message: `${config.sourceLabel} transform completed without rejected records.`,
				metadata: { warningCount: summary.warnings.length },
			},
		],
		metrics: [
			{
				metricId: "lexical-entry-semantic-integrity-ratio",
				name: "lexicalEntrySemanticIntegrityRatio",
				value: summary.lexicalEntrySemanticIntegrityRatio,
				unit: "ratio",
			},
			{
				metricId: "sense-semantic-integrity-ratio",
				name: "senseSemanticIntegrityRatio",
				value: summary.senseSemanticIntegrityRatio,
				unit: "ratio",
			},
			{
				metricId: "lexical-entry-count",
				name: "lexicalEntryCount",
				value: lexicalEntryRows.length,
				unit: "records",
			},
			{
				metricId: "sense-count",
				name: "senseCount",
				value: senseRows.length,
				unit: "records",
			},
			{
				metricId: "relation-count",
				name: "relationCount",
				value: relationRows.length,
				unit: "records",
			},
		],
		thresholds: [],
		evaluationRecordIds: [],
	};

	return [
		outputFor(
			resourceSpec,
			ids.lexicalEntries,
			tsvFile(["entryId", "lemma", "partOfSpeech"], lexicalEntryRows),
		),
		outputFor(
			resourceSpec,
			ids.senses,
			tsvFile(
				["senseId", "entryId", "lemma", "partOfSpeech", "synsetId", "subcat"],
				senseRows,
			),
		),
		outputFor(
			resourceSpec,
			ids.synsets,
			tsvFile(
				[
					"synsetId",
					"ili",
					"partOfSpeech",
					"lexfile",
					"members",
					"definition",
					"exampleCount",
				],
				synsetRows,
			),
		),
		outputFor(
			resourceSpec,
			ids.relations,
			tsvFile(["scope", "sourceId", "predicateId", "targetId"], relationRows),
		),
		outputFor(resourceSpec, ids.quality, stableJson(summary)),
		outputFor(resourceSpec, ids.lexiconCanonical, stableJson(canonicalLexicon)),
		outputFor(resourceSpec, ids.kbCanonical, stableJson(canonicalKb)),
		outputFor(resourceSpec, ids.qualityProfile, stableJson(canonicalQuality)),
	];
}

export function transformOpenEnglishWordnetLmf(resourceSpec, inputs) {
	return transformWordnetLmf(resourceSpec, inputs, {
		inputFileName: "english-wordnet-2025.xml.gz",
		kbId: "wordnet-en-kb",
		languageTag: "en",
		lexiconId: "wordnet-en-lexicon",
		qualityProfileId: "wordnet-en-quality",
		resourcePrefix: "wordnet-en",
		script: "Latn",
		sourceId: "source:wordnet:open-english-2025",
		sourceLabel: "Open English WordNet",
	});
}

export function transformArabicWordnetLmf(resourceSpec, inputs) {
	return transformWordnetLmf(resourceSpec, inputs, {
		inputFileName: "awn4.xml.gz",
		kbId: "wordnet-ar-kb",
		languageTag: "ar",
		lexiconId: "wordnet-ar-lexicon",
		qualityProfileId: "wordnet-ar-quality",
		resourcePrefix: "wordnet-ar",
		script: "Arab",
		sourceId: "source:wordnet:arabic-v4.1.0",
		sourceLabel: "Arabic WordNet 4.1.0",
	});
}

function parseIanaRegistry(text) {
	const blocks = text.split(/\n%%\n/u);
	const fileDateMatch = blocks[0].match(/^File-Date:\s*(.+)$/mu);
	const records = [];
	for (const block of blocks.slice(1)) {
		const fields = new Map();
		let currentKey;
		for (const line of block.split(/\r?\n/u)) {
			if (line.trim().length === 0) continue;
			if (/^\s/u.test(line) && currentKey !== undefined) {
				const values = fields.get(currentKey);
				values[values.length - 1] = `${values.at(-1)} ${line.trim()}`;
				continue;
			}
			const match = line.match(/^([^:]+):\s*(.*)$/u);
			if (match === null) continue;
			currentKey = match[1];
			const values = fields.get(currentKey) ?? [];
			values.push(match[2]);
			fields.set(currentKey, values);
		}
		if (!fields.has("Type")) continue;
		const value = (key) => (fields.get(key) ?? []).join(" | ");
		records.push({
			type: value("Type"),
			subtag: value("Subtag"),
			tag: value("Tag"),
			description: value("Description"),
			added: value("Added"),
			deprecated: value("Deprecated"),
			preferredValue: value("Preferred-Value"),
			suppressScript: value("Suppress-Script"),
			macrolanguage: value("Macrolanguage"),
			scope: value("Scope"),
			prefix: value("Prefix"),
		});
	}
	const typeOrder = new Map(
		[
			"language",
			"extlang",
			"script",
			"region",
			"variant",
			"grandfathered",
			"redundant",
		].map((type, index) => [type, index]),
	);
	records.sort((left, right) => {
		const typeDelta =
			(typeOrder.get(left.type) ?? 99) - (typeOrder.get(right.type) ?? 99);
		if (typeDelta !== 0) return typeDelta;
		return (left.subtag || left.tag).localeCompare(right.subtag || right.tag);
	});
	return {
		fileDate: fileDateMatch?.[1] ?? "unknown",
		records,
	};
}

function transformIanaLanguageRegistry(resourceSpec, inputs) {
	const input = inputs.get("language-subtag-registry.txt");
	expect(
		input !== undefined,
		`${resourceSpec.resourceSpecId} missing IANA input.`,
	);
	const registry = parseIanaRegistry(input);
	const rows = registry.records.map((record) => [
		record.type,
		record.subtag,
		record.tag,
		record.preferredValue,
		record.suppressScript,
		record.macrolanguage,
		record.scope,
		record.deprecated,
		record.added,
		record.prefix,
		record.description,
	]);
	const countsByType = {};
	for (const record of registry.records) {
		countsByType[record.type] = (countsByType[record.type] ?? 0) + 1;
	}
	const deprecatedRecordCount = registry.records.filter(
		(record) => record.deprecated.length > 0,
	).length;
	const summary = {
		schemaVersion: "1",
		source: "IANA Language Subtag Registry",
		fileDate: registry.fileDate,
		recordCount: registry.records.length,
		deprecatedRecordCount,
		countsByType: sortJson(countsByType),
	};
	return [
		outputFor(
			resourceSpec,
			"bcp47-language-subtags",
			tsvFile(
				[
					"type",
					"subtag",
					"tag",
					"preferredValue",
					"suppressScript",
					"macrolanguage",
					"scope",
					"deprecated",
					"added",
					"prefix",
					"description",
				],
				rows,
			),
		),
		outputFor(
			resourceSpec,
			"bcp47-language-registry-summary",
			stableJson(summary),
		),
	];
}

function stripUnicodeDataLine(line) {
	const hashIndex = line.indexOf("#");
	const body = hashIndex === -1 ? line : line.slice(0, hashIndex);
	const comment = hashIndex === -1 ? "" : line.slice(hashIndex + 1).trim();
	return { body: body.trim(), comment };
}

function parseCodePointRange(range) {
	const [start, end = start] = range.split("..");
	return {
		start,
		end,
		startValue: Number.parseInt(start, 16),
		endValue: Number.parseInt(end, 16),
	};
}

function parseUnicodeRangeFile(text) {
	const rows = [];
	for (const line of text.split(/\r?\n/u)) {
		const { body, comment } = stripUnicodeDataLine(line);
		if (body.length === 0) continue;
		const [rangeText, value] = body.split(";").map((part) => part.trim());
		if (rangeText === undefined || value === undefined) continue;
		const range = parseCodePointRange(rangeText);
		rows.push({ ...range, value, comment });
	}
	rows.sort((left, right) => left.startValue - right.startValue);
	return rows;
}

function parsePropertyValueAliases(text) {
	const rows = [];
	for (const line of text.split(/\r?\n/u)) {
		const { body } = stripUnicodeDataLine(line);
		if (body.length === 0) continue;
		const fields = body.split(";").map((field) => field.trim());
		if (fields.length < 3) continue;
		const [property, alias, longName, ...otherAliases] = fields;
		rows.push({
			property,
			alias,
			longName,
			otherAliases: otherAliases.join(" "),
		});
	}
	rows.sort((left, right) => {
		const propertyDelta = left.property.localeCompare(right.property);
		if (propertyDelta !== 0) return propertyDelta;
		return left.alias.localeCompare(right.alias);
	});
	return rows;
}

function transformUnicode17Core(resourceSpec, inputs) {
	const blocksText = inputs.get("Blocks.txt");
	const aliasesText = inputs.get("PropertyValueAliases.txt");
	const scriptsText = inputs.get("Scripts.txt");
	expect(
		blocksText !== undefined,
		`${resourceSpec.resourceSpecId} missing Blocks.txt.`,
	);
	expect(
		aliasesText !== undefined,
		`${resourceSpec.resourceSpecId} missing PropertyValueAliases.txt.`,
	);
	expect(
		scriptsText !== undefined,
		`${resourceSpec.resourceSpecId} missing Scripts.txt.`,
	);
	const blocks = parseUnicodeRangeFile(blocksText);
	const scripts = parseUnicodeRangeFile(scriptsText);
	const aliases = parsePropertyValueAliases(aliasesText);
	const summary = {
		schemaVersion: "1",
		source: "Unicode Character Database",
		version: "17.0.0",
		blockRangeCount: blocks.length,
		scriptRangeCount: scripts.length,
		propertyValueAliasCount: aliases.length,
	};
	return [
		outputFor(
			resourceSpec,
			"unicode-17-blocks",
			tsvFile(
				["start", "end", "block", "comment"],
				blocks.map((row) => [row.start, row.end, row.value, row.comment]),
			),
		),
		outputFor(
			resourceSpec,
			"unicode-17-property-value-aliases",
			tsvFile(
				["property", "alias", "longName", "otherAliases"],
				aliases.map((row) => [
					row.property,
					row.alias,
					row.longName,
					row.otherAliases,
				]),
			),
		),
		outputFor(
			resourceSpec,
			"unicode-17-scripts",
			tsvFile(
				["start", "end", "script", "comment"],
				scripts.map((row) => [row.start, row.end, row.value, row.comment]),
			),
		),
		outputFor(resourceSpec, "unicode-17-core-summary", stableJson(summary)),
	];
}

function transformCldrCoreFoundation(resourceSpec, inputs) {
	const aliasesText = inputs.get("aliases.json");
	const likelySubtagsText = inputs.get("likelySubtags.json");
	const scriptDataText = inputs.get("scriptData.json");
	expect(
		aliasesText !== undefined,
		`${resourceSpec.resourceSpecId} missing aliases.json.`,
	);
	expect(
		likelySubtagsText !== undefined,
		`${resourceSpec.resourceSpecId} missing likelySubtags.json.`,
	);
	expect(
		scriptDataText !== undefined,
		`${resourceSpec.resourceSpecId} missing scriptData.json.`,
	);
	const aliases = JSON.parse(aliasesText);
	const likelySubtags = JSON.parse(likelySubtagsText);
	const scriptData = JSON.parse(scriptDataText);
	const likely = Object.entries(likelySubtags.supplemental.likelySubtags)
		.map(([source, target]) => [source, target])
		.sort((left, right) => left[0].localeCompare(right[0]));
	const aliasRows = [];
	for (const [kind, entries] of Object.entries(
		aliases.supplemental.metadata.alias,
	)) {
		for (const [code, alias] of Object.entries(entries)) {
			aliasRows.push([
				kind.replace(/Alias$/u, ""),
				code,
				alias._replacement ?? "",
				alias._reason ?? "",
			]);
		}
	}
	aliasRows.sort((left, right) => {
		const kindDelta = left[0].localeCompare(right[0]);
		if (kindDelta !== 0) return kindDelta;
		return left[1].localeCompare(right[1]);
	});
	const scriptRows = [];
	for (const [variantKind, scripts] of Object.entries(
		scriptData.supplemental.scriptData.scriptVariants,
	)) {
		for (const [script, detail] of Object.entries(scripts)) {
			scriptRows.push([variantKind, script, (detail._base ?? []).join(" ")]);
		}
	}
	scriptRows.sort((left, right) => {
		const kindDelta = left[0].localeCompare(right[0]);
		if (kindDelta !== 0) return kindDelta;
		return left[1].localeCompare(right[1]);
	});
	const summary = {
		schemaVersion: "1",
		source: "Unicode CLDR Core",
		cldrVersion: likelySubtags.supplemental.version._cldrVersion,
		unicodeVersion: likelySubtags.supplemental.version._unicodeVersion,
		likelySubtagCount: likely.length,
		aliasCount: aliasRows.length,
		scriptVariantCount: scriptRows.length,
	};
	return [
		outputFor(
			resourceSpec,
			"cldr-48-likely-subtags",
			tsvFile(["source", "target"], likely),
		),
		outputFor(
			resourceSpec,
			"cldr-48-locale-aliases",
			tsvFile(["kind", "code", "replacement", "reason"], aliasRows),
		),
		outputFor(
			resourceSpec,
			"cldr-48-script-data",
			tsvFile(["variantKind", "script", "baseScripts"], scriptRows),
		),
		outputFor(resourceSpec, "cldr-48-core-summary", stableJson(summary)),
	];
}

const englishCoreFunctionWordPos = new Set(["c", "d", "pn", "pp", "s"]);

function transformEnglishCoreProfile(resourceSpec, inputs) {
	const ianaText = requiredInput(
		inputs,
		"language-subtag-registry.txt",
		resourceSpec,
	);
	const generalCategoryText = requiredInput(
		inputs,
		"DerivedGeneralCategory.txt",
		resourceSpec,
	);
	const scriptsText = requiredInput(inputs, "Scripts.txt", resourceSpec);
	const graphemeText = requiredInput(
		inputs,
		"GraphemeBreakProperty.txt",
		resourceSpec,
	);
	const wordText = requiredInput(inputs, "WordBreakProperty.txt", resourceSpec);
	const sentenceText = requiredInput(
		inputs,
		"SentenceBreakProperty.txt",
		resourceSpec,
	);
	const likelySubtagsText = requiredInput(
		inputs,
		"likelySubtags.json",
		resourceSpec,
	);
	const scriptDataText = requiredInput(inputs, "scriptData.json", resourceSpec);
	const enUsWordlistText = requiredInput(inputs, "en_US.txt", resourceSpec);
	const scowlText = requiredInput(inputs, "scowl.txt", resourceSpec);

	const registry = parseIanaRegistry(ianaText);
	const englishRecord = registry.records.find(
		(record) => record.type === "language" && record.subtag === "en",
	);
	expect(
		englishRecord !== undefined,
		`${resourceSpec.resourceSpecId} expected IANA language subtag en.`,
	);
	const likelySubtags = JSON.parse(likelySubtagsText);
	const likelySubtag = likelySubtags.supplemental.likelySubtags.en;
	expect(
		likelySubtag === "en-Latn-US",
		`${resourceSpec.resourceSpecId} expected CLDR likely subtag en -> en-Latn-US.`,
		likelySubtag,
	);
	const scriptData = JSON.parse(scriptDataText);
	const scripts = parseUnicodeRangeFile(scriptsText);
	const generalCategories = parseUnicodeRangeFile(generalCategoryText);
	const graphemeRows = parseUnicodeRangeFile(graphemeText);
	const wordRows = parseUnicodeRangeFile(wordText);
	const sentenceRows = parseUnicodeRangeFile(sentenceText);
	const enUsWordlist = parseWordlist(enUsWordlistText);
	const latinScriptRanges = scripts.filter((row) => row.value === "Latin");
	const punctuationRows = generalCategories.filter((row) =>
		row.value.startsWith("P"),
	);
	const scriptVariantRows = [];
	for (const [variantKind, scriptEntries] of Object.entries(
		scriptData.supplemental.scriptData.scriptVariants,
	)) {
		if (Object.hasOwn(scriptEntries, "Latn")) {
			scriptVariantRows.push({
				variantKind,
				baseScripts: (scriptEntries.Latn._base ?? []).join(" "),
			});
		}
	}
	scriptVariantRows.sort((left, right) =>
		left.variantKind.localeCompare(right.variantKind),
	);

	const abbreviationRows = [];
	const functionWordRows = [];
	let sourceLineNumber = 0;
	let scowlRecordsRejected = 0;
	for (const line of scowlText.split(/\r?\n/u)) {
		sourceLineNumber += 1;
		const trimmed = line.trim();
		if (trimmed.length === 0 || trimmed.startsWith("#")) continue;
		const record = splitScowlLine(trimmed);
		if (record === undefined) {
			scowlRecordsRejected += 1;
			continue;
		}
		const { size, tags } = parseScowlInfo(record.scowlInfo);
		const parsedLemma = parseScowlLemmaInfo(record.lemmaInfo, "");
		if (parsedLemma.lemma.length === 0 || size.length === 0) {
			scowlRecordsRejected += 1;
			continue;
		}
		const numericSize = Number.parseInt(size, 10);
		const row = [
			parsedLemma.lemma,
			size,
			tags,
			parsedLemma.partOfSpeech,
			parsedLemma.posClass,
			sourceLineNumber,
			record.scowlInfo,
		];
		if (
			parsedLemma.partOfSpeech === "abbr" ||
			parsedLemma.posClass.split(/[/?]/u).includes("abbr")
		) {
			abbreviationRows.push(row);
		}
		if (
			englishCoreFunctionWordPos.has(parsedLemma.partOfSpeech) &&
			Number.isFinite(numericSize) &&
			numericSize <= 60
		) {
			functionWordRows.push(row);
		}
	}
	abbreviationRows.sort((left, right) => {
		const lemmaDelta = String(left[0]).localeCompare(String(right[0]));
		if (lemmaDelta !== 0) return lemmaDelta;
		return Number(left[5]) - Number(right[5]);
	});
	functionWordRows.sort((left, right) => {
		const lemmaDelta = String(left[0]).localeCompare(String(right[0]));
		if (lemmaDelta !== 0) return lemmaDelta;
		return Number(left[5]) - Number(right[5]);
	});

	const languageProfile = {
		schemaVersion: "1",
		kind: "language-core-profile",
		profileId: "en-modern-typed-core",
		languageTag: "en",
		languageName: englishRecord.description,
		script: "Latn",
		defaultRegion: "US",
		likelySubtag,
		iana: {
			fileDate: registry.fileDate,
			added: englishRecord.added,
			suppressScript: englishRecord.suppressScript,
			scope: englishRecord.scope,
		},
		orthography: {
			defaultScript: "Latn",
			latinScriptRangeCount: latinScriptRanges.length,
			scriptVariants: scriptVariantRows,
			regionalWordlist: {
				profileId: "en_US",
				wordCount: enUsWordlist.words.length,
			},
		},
		coreResources: {
			orthographyResourceId: "en-core-orthography",
			punctuationResourceId: "en-core-punctuation",
			abbreviationResourceId: "en-core-abbreviations",
			functionWordResourceId: "en-core-function-words",
			basicSegmentationResourceId: "en-core-basic-segmentation",
		},
		sourceIds: resourceSpec.sourceIds,
	};
	const basicSegmentation = {
		schemaVersion: "1",
		kind: "segmentation-profile",
		profileId: "en-core-uax29-basic-segmentation",
		languageTag: "en",
		script: "Latn",
		granularity: "word",
		schemes: [
			{
				schemeId: "uax29-grapheme",
				description: "Unicode UAX #29 grapheme break property baseline.",
				fields: [{ order: 1, name: "unicodeBreakProperty" }],
			},
			{
				schemeId: "uax29-word",
				description: "Unicode UAX #29 word break property baseline.",
				fields: [{ order: 1, name: "unicodeBreakProperty" }],
			},
			{
				schemeId: "uax29-sentence",
				description: "Unicode UAX #29 sentence break property baseline.",
				fields: [{ order: 1, name: "unicodeBreakProperty" }],
			},
		],
		rules: [
			{
				ruleId: "en-core-uax29-baseline",
				operation: "label",
				priority: 10,
				pattern: "UAX29:grapheme-word-sentence",
				label: "basic-boundary-profile",
				conditions: {
					sourceIds: ["source:unicode:ucd", "source:unicode:cldr-core"],
					likelySubtag,
					graphemeRangeCount: graphemeRows.length,
					wordRangeCount: wordRows.length,
					sentenceRangeCount: sentenceRows.length,
				},
			},
		],
		dictionaryRefs: [],
	};
	const quality = {
		schemaVersion: "1",
		sourceIds: resourceSpec.sourceIds,
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		languageTag: "en",
		script: "Latn",
		likelySubtag,
		ianaFileDate: registry.fileDate,
		ianaSuppressScript: englishRecord.suppressScript,
		latinScriptRangeCount: latinScriptRanges.length,
		punctuationRangeCount: punctuationRows.length,
		abbreviationCount: abbreviationRows.length,
		functionWordCount: functionWordRows.length,
		enUsWordCount: enUsWordlist.words.length,
		graphemeRangeCount: graphemeRows.length,
		wordRangeCount: wordRows.length,
		sentenceRangeCount: sentenceRows.length,
		scriptVariantCount: scriptVariantRows.length,
		recordsAccepted:
			latinScriptRanges.length +
			punctuationRows.length +
			abbreviationRows.length +
			functionWordRows.length,
		recordsRejected: scowlRecordsRejected + enUsWordlist.rejected,
		warnings: [
			"SCOWLv2 abbreviation rows are source POS records, not a sentence-boundary disambiguation model.",
			"Function-word rows are SCOWLv2 closed-class POS records with SCOWL size <= 60; they are stoplist candidates, not a corpus-frequency stopword model.",
			"Basic segmentation is a Unicode UAX #29 baseline; richer English segmentation remains in textpack-en-segmentation.",
		],
	};
	const canonicalQuality = {
		schemaVersion: "1",
		kind: "quality-profile",
		profileId: "en-core-quality",
		languageTag: "en",
		script: "Latn",
		diagnostics: [
			{
				diagnosticId: "en-core-source-scope",
				task: "core.profile",
				severity: "info",
				message:
					"English core resources are generated from IANA, Unicode, CLDR, ESDB, and SCOWLv2 snapshots with scope-limited core profile claims.",
				metadata: {
					likelySubtag,
					sourceIds: resourceSpec.sourceIds,
				},
			},
		],
		metrics: [
			{
				metricId: "latin-script-range-count",
				name: "latinScriptRangeCount",
				value: quality.latinScriptRangeCount,
				unit: "ranges",
			},
			{
				metricId: "punctuation-range-count",
				name: "punctuationRangeCount",
				value: quality.punctuationRangeCount,
				unit: "ranges",
			},
			{
				metricId: "abbreviation-count",
				name: "abbreviationCount",
				value: quality.abbreviationCount,
				unit: "rows",
			},
			{
				metricId: "function-word-count",
				name: "functionWordCount",
				value: quality.functionWordCount,
				unit: "rows",
			},
			{
				metricId: "records-rejected",
				name: "recordsRejected",
				value: quality.recordsRejected,
				unit: "records",
			},
		],
		thresholds: [],
		evaluationRecordIds: [],
	};

	return [
		outputFor(
			resourceSpec,
			"en-core-language-profile",
			stableJson(languageProfile),
		),
		outputFor(
			resourceSpec,
			"en-core-orthography",
			tsvFile(
				["start", "end", "script", "comment"],
				latinScriptRanges.map((row) => [
					row.start,
					row.end,
					row.value,
					row.comment,
				]),
			),
		),
		outputFor(
			resourceSpec,
			"en-core-punctuation",
			tsvFile(
				["start", "end", "generalCategory", "comment"],
				punctuationRows.map((row) => [
					row.start,
					row.end,
					row.value,
					row.comment,
				]),
			),
		),
		outputFor(
			resourceSpec,
			"en-core-abbreviations",
			tsvFile(
				[
					"entry",
					"scowlSize",
					"tags",
					"partOfSpeech",
					"posClass",
					"sourceLineNumber",
					"scowlInfo",
				],
				abbreviationRows,
			),
		),
		outputFor(
			resourceSpec,
			"en-core-function-words",
			tsvFile(
				[
					"entry",
					"scowlSize",
					"tags",
					"partOfSpeech",
					"posClass",
					"sourceLineNumber",
					"scowlInfo",
				],
				functionWordRows,
			),
		),
		outputFor(
			resourceSpec,
			"en-core-basic-segmentation",
			stableJson(basicSegmentation),
		),
		outputFor(resourceSpec, "en-core-quality", stableJson(quality)),
		outputFor(
			resourceSpec,
			"en-core-quality-profile",
			stableJson(canonicalQuality),
		),
	];
}

function transformFrenchCoreProfile(resourceSpec, inputs) {
	const ianaText = requiredInput(
		inputs,
		"language-subtag-registry.txt",
		resourceSpec,
	);
	const generalCategoryText = requiredInput(
		inputs,
		"DerivedGeneralCategory.txt",
		resourceSpec,
	);
	const scriptsText = requiredInput(inputs, "Scripts.txt", resourceSpec);
	const graphemeText = requiredInput(
		inputs,
		"GraphemeBreakProperty.txt",
		resourceSpec,
	);
	const wordText = requiredInput(inputs, "WordBreakProperty.txt", resourceSpec);
	const sentenceText = requiredInput(
		inputs,
		"SentenceBreakProperty.txt",
		resourceSpec,
	);
	const likelySubtagsText = requiredInput(
		inputs,
		"likelySubtags.json",
		resourceSpec,
	);
	const scriptDataText = requiredInput(inputs, "scriptData.json", resourceSpec);

	const registry = parseIanaRegistry(ianaText);
	const frenchRecord = registry.records.find(
		(record) => record.type === "language" && record.subtag === "fr",
	);
	expect(
		frenchRecord !== undefined,
		`${resourceSpec.resourceSpecId} expected IANA language subtag fr.`,
	);
	const likelySubtags = JSON.parse(likelySubtagsText);
	const likelySubtag = likelySubtags.supplemental.likelySubtags.fr;
	expect(
		likelySubtag === "fr-Latn-FR",
		`${resourceSpec.resourceSpecId} expected CLDR likely subtag fr -> fr-Latn-FR.`,
		likelySubtag,
	);
	const scriptData = JSON.parse(scriptDataText);
	const scripts = parseUnicodeRangeFile(scriptsText);
	const generalCategories = parseUnicodeRangeFile(generalCategoryText);
	const graphemeRows = parseUnicodeRangeFile(graphemeText);
	const wordRows = parseUnicodeRangeFile(wordText);
	const sentenceRows = parseUnicodeRangeFile(sentenceText);
	const latinScriptRanges = scripts.filter((row) => row.value === "Latin");
	const punctuationRows = generalCategories.filter((row) =>
		row.value.startsWith("P"),
	);
	const scriptVariantRows = [];
	for (const [variantKind, scriptEntries] of Object.entries(
		scriptData.supplemental.scriptData.scriptVariants,
	)) {
		if (Object.hasOwn(scriptEntries, "Latn")) {
			scriptVariantRows.push({
				variantKind,
				baseScripts: (scriptEntries.Latn._base ?? []).join(" "),
			});
		}
	}
	scriptVariantRows.sort((left, right) =>
		left.variantKind.localeCompare(right.variantKind),
	);

	const languageProfile = {
		schemaVersion: "1",
		kind: "language-core-profile",
		profileId: "fr-modern-typed-core",
		languageTag: "fr",
		languageName: frenchRecord.description,
		script: "Latn",
		defaultRegion: "FR",
		likelySubtag,
		iana: {
			fileDate: registry.fileDate,
			added: frenchRecord.added,
			suppressScript: frenchRecord.suppressScript,
			scope: frenchRecord.scope,
		},
		orthography: {
			defaultScript: "Latn",
			latinScriptRangeCount: latinScriptRanges.length,
			scriptVariants: scriptVariantRows,
		},
		coreResources: {
			orthographyResourceId: "fr-core-orthography",
			punctuationResourceId: "fr-core-punctuation",
			basicSegmentationResourceId: "fr-core-basic-segmentation",
		},
		sourceIds: resourceSpec.sourceIds,
	};
	const basicSegmentation = {
		schemaVersion: "1",
		kind: "segmentation-profile",
		profileId: "fr-core-uax29-basic-segmentation",
		languageTag: "fr",
		script: "Latn",
		granularity: "word",
		schemes: [
			{
				schemeId: "uax29-grapheme",
				description: "Unicode UAX #29 grapheme break property baseline.",
				fields: [{ order: 1, name: "unicodeBreakProperty" }],
			},
			{
				schemeId: "uax29-word",
				description: "Unicode UAX #29 word break property baseline.",
				fields: [{ order: 1, name: "unicodeBreakProperty" }],
			},
			{
				schemeId: "uax29-sentence",
				description: "Unicode UAX #29 sentence break property baseline.",
				fields: [{ order: 1, name: "unicodeBreakProperty" }],
			},
		],
		rules: [
			{
				ruleId: "fr-core-uax29-baseline",
				operation: "label",
				priority: 10,
				pattern: "UAX29:grapheme-word-sentence",
				label: "basic-boundary-profile",
				conditions: {
					sourceIds: ["source:unicode:ucd", "source:unicode:cldr-core"],
					likelySubtag,
					graphemeRangeCount: graphemeRows.length,
					wordRangeCount: wordRows.length,
					sentenceRangeCount: sentenceRows.length,
				},
			},
		],
		dictionaryRefs: [],
	};
	const quality = {
		schemaVersion: "1",
		sourceIds: resourceSpec.sourceIds,
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		languageTag: "fr",
		script: "Latn",
		likelySubtag,
		ianaFileDate: registry.fileDate,
		ianaSuppressScript: frenchRecord.suppressScript,
		latinScriptRangeCount: latinScriptRanges.length,
		punctuationRangeCount: punctuationRows.length,
		graphemeRangeCount: graphemeRows.length,
		wordRangeCount: wordRows.length,
		sentenceRangeCount: sentenceRows.length,
		scriptVariantCount: scriptVariantRows.length,
		recordsAccepted: latinScriptRanges.length + punctuationRows.length,
		recordsRejected: 0,
		warnings: [
			"French core currently uses only IANA, Unicode, and CLDR source-backed resources.",
			"French abbreviations, stoplists, lexical entries, morphology, elision/contraction rules, syntax, KB, corpus, and parallel resources remain out of scope until exact source activation.",
			"Basic segmentation is a Unicode UAX #29 baseline; richer French segmentation remains in textpack-fr-segmentation.",
		],
	};
	const canonicalQuality = {
		schemaVersion: "1",
		kind: "quality-profile",
		profileId: "fr-core-quality",
		languageTag: "fr",
		script: "Latn",
		diagnostics: [
			{
				diagnosticId: "fr-core-source-scope",
				task: "core.profile",
				severity: "info",
				message:
					"French core resources are generated from IANA, Unicode, and CLDR snapshots with scope-limited core profile claims.",
				metadata: {
					likelySubtag,
					sourceIds: resourceSpec.sourceIds,
				},
			},
		],
		metrics: [
			{
				metricId: "latin-script-range-count",
				name: "latinScriptRangeCount",
				value: quality.latinScriptRangeCount,
				unit: "ranges",
			},
			{
				metricId: "punctuation-range-count",
				name: "punctuationRangeCount",
				value: quality.punctuationRangeCount,
				unit: "ranges",
			},
			{
				metricId: "records-rejected",
				name: "recordsRejected",
				value: quality.recordsRejected,
				unit: "records",
			},
		],
		thresholds: [],
		evaluationRecordIds: [],
	};

	return [
		outputFor(
			resourceSpec,
			"fr-core-language-profile",
			stableJson(languageProfile),
		),
		outputFor(
			resourceSpec,
			"fr-core-orthography",
			tsvFile(
				["start", "end", "script", "comment"],
				latinScriptRanges.map((row) => [
					row.start,
					row.end,
					row.value,
					row.comment,
				]),
			),
		),
		outputFor(
			resourceSpec,
			"fr-core-punctuation",
			tsvFile(
				["start", "end", "generalCategory", "comment"],
				punctuationRows.map((row) => [
					row.start,
					row.end,
					row.value,
					row.comment,
				]),
			),
		),
		outputFor(
			resourceSpec,
			"fr-core-basic-segmentation",
			stableJson(basicSegmentation),
		),
		outputFor(resourceSpec, "fr-core-quality", stableJson(quality)),
		outputFor(
			resourceSpec,
			"fr-core-quality-profile",
			stableJson(canonicalQuality),
		),
	];
}

function transformArabicCoreProfile(resourceSpec, inputs) {
	const ianaText = requiredInput(
		inputs,
		"language-subtag-registry.txt",
		resourceSpec,
	);
	const generalCategoryText = requiredInput(
		inputs,
		"DerivedGeneralCategory.txt",
		resourceSpec,
	);
	const scriptsText = requiredInput(inputs, "Scripts.txt", resourceSpec);
	const graphemeText = requiredInput(
		inputs,
		"GraphemeBreakProperty.txt",
		resourceSpec,
	);
	const wordText = requiredInput(inputs, "WordBreakProperty.txt", resourceSpec);
	const sentenceText = requiredInput(
		inputs,
		"SentenceBreakProperty.txt",
		resourceSpec,
	);
	const likelySubtagsText = requiredInput(
		inputs,
		"likelySubtags.json",
		resourceSpec,
	);
	const scriptDataText = requiredInput(inputs, "scriptData.json", resourceSpec);

	const registry = parseIanaRegistry(ianaText);
	const arabicRecord = registry.records.find(
		(record) => record.type === "language" && record.subtag === "ar",
	);
	expect(
		arabicRecord !== undefined,
		`${resourceSpec.resourceSpecId} expected IANA language subtag ar.`,
	);
	const likelySubtags = JSON.parse(likelySubtagsText);
	const likelySubtag = likelySubtags.supplemental.likelySubtags.ar;
	expect(
		likelySubtag === "ar-Arab-EG",
		`${resourceSpec.resourceSpecId} expected CLDR likely subtag ar -> ar-Arab-EG.`,
		likelySubtag,
	);
	const scriptData = JSON.parse(scriptDataText);
	const scripts = parseUnicodeRangeFile(scriptsText);
	const generalCategories = parseUnicodeRangeFile(generalCategoryText);
	const graphemeRows = parseUnicodeRangeFile(graphemeText);
	const wordRows = parseUnicodeRangeFile(wordText);
	const sentenceRows = parseUnicodeRangeFile(sentenceText);
	const arabicScriptRanges = scripts.filter((row) => row.value === "Arabic");
	const punctuationRows = generalCategories.filter((row) =>
		row.value.startsWith("P"),
	);
	const scriptVariantRows = [];
	for (const [variantKind, scriptEntries] of Object.entries(
		scriptData.supplemental.scriptData.scriptVariants,
	)) {
		if (Object.hasOwn(scriptEntries, "Arab")) {
			scriptVariantRows.push({
				variantKind,
				baseScripts: (scriptEntries.Arab._base ?? []).join(" "),
			});
		}
	}
	scriptVariantRows.sort((left, right) =>
		left.variantKind.localeCompare(right.variantKind),
	);

	const languageProfile = {
		schemaVersion: "1",
		kind: "language-core-profile",
		profileId: "ar-modern-typed-core",
		languageTag: "ar",
		languageName: arabicRecord.description,
		script: "Arab",
		defaultRegion: "EG",
		likelySubtag,
		iana: {
			fileDate: registry.fileDate,
			added: arabicRecord.added,
			suppressScript: arabicRecord.suppressScript,
			scope: arabicRecord.scope,
		},
		orthography: {
			defaultScript: "Arab",
			arabicScriptRangeCount: arabicScriptRanges.length,
			scriptVariants: scriptVariantRows,
		},
		coreResources: {
			orthographyResourceId: "ar-core-orthography",
			punctuationResourceId: "ar-core-punctuation",
			basicSegmentationResourceId: "ar-core-basic-segmentation",
		},
		sourceIds: resourceSpec.sourceIds,
	};
	const basicSegmentation = {
		schemaVersion: "1",
		kind: "segmentation-profile",
		profileId: "ar-core-uax29-basic-segmentation",
		languageTag: "ar",
		script: "Arab",
		granularity: "word",
		schemes: [
			{
				schemeId: "uax29-grapheme",
				description: "Unicode UAX #29 grapheme break property baseline.",
				fields: [{ order: 1, name: "unicodeBreakProperty" }],
			},
			{
				schemeId: "uax29-word",
				description: "Unicode UAX #29 word break property baseline.",
				fields: [{ order: 1, name: "unicodeBreakProperty" }],
			},
			{
				schemeId: "uax29-sentence",
				description: "Unicode UAX #29 sentence break property baseline.",
				fields: [{ order: 1, name: "unicodeBreakProperty" }],
			},
		],
		rules: [
			{
				ruleId: "ar-core-uax29-baseline",
				operation: "label",
				priority: 10,
				pattern: "UAX29:grapheme-word-sentence",
				label: "basic-boundary-profile",
				conditions: {
					sourceIds: ["source:unicode:ucd", "source:unicode:cldr-core"],
					likelySubtag,
					graphemeRangeCount: graphemeRows.length,
					wordRangeCount: wordRows.length,
					sentenceRangeCount: sentenceRows.length,
				},
			},
		],
		dictionaryRefs: [],
	};
	const quality = {
		schemaVersion: "1",
		sourceIds: resourceSpec.sourceIds,
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		languageTag: "ar",
		script: "Arab",
		likelySubtag,
		ianaFileDate: registry.fileDate,
		ianaSuppressScript: arabicRecord.suppressScript,
		arabicScriptRangeCount: arabicScriptRanges.length,
		punctuationRangeCount: punctuationRows.length,
		graphemeRangeCount: graphemeRows.length,
		wordRangeCount: wordRows.length,
		sentenceRangeCount: sentenceRows.length,
		scriptVariantCount: scriptVariantRows.length,
		recordsAccepted: arabicScriptRanges.length + punctuationRows.length,
		recordsRejected: 0,
		warnings: [
			"Arabic core currently uses only IANA, Unicode, and CLDR source-backed resources.",
			"Arabic lexicon, morphology, clitic segmentation, syntax, KB, search, corpus, and parallel resources remain out of scope until exact source activation.",
			"Basic segmentation is a Unicode UAX #29 baseline; richer Arabic MSA tokenization resources remain in textpack-ar-segmentation.",
		],
	};
	const canonicalQuality = {
		schemaVersion: "1",
		kind: "quality-profile",
		profileId: "ar-core-quality",
		languageTag: "ar",
		script: "Arab",
		diagnostics: [
			{
				diagnosticId: "ar-core-source-scope",
				task: "core.profile",
				severity: "info",
				message:
					"Arabic core resources are generated from IANA, Unicode, and CLDR snapshots with scope-limited core profile claims.",
				metadata: {
					likelySubtag,
					sourceIds: resourceSpec.sourceIds,
				},
			},
		],
		metrics: [
			{
				metricId: "arabic-script-range-count",
				name: "arabicScriptRangeCount",
				value: quality.arabicScriptRangeCount,
				unit: "ranges",
			},
			{
				metricId: "punctuation-range-count",
				name: "punctuationRangeCount",
				value: quality.punctuationRangeCount,
				unit: "ranges",
			},
			{
				metricId: "records-rejected",
				name: "recordsRejected",
				value: quality.recordsRejected,
				unit: "records",
			},
		],
		thresholds: [],
		evaluationRecordIds: [],
	};

	return [
		outputFor(
			resourceSpec,
			"ar-core-language-profile",
			stableJson(languageProfile),
		),
		outputFor(
			resourceSpec,
			"ar-core-orthography",
			tsvFile(
				["start", "end", "script", "comment"],
				arabicScriptRanges.map((row) => [
					row.start,
					row.end,
					row.value,
					row.comment,
				]),
			),
		),
		outputFor(
			resourceSpec,
			"ar-core-punctuation",
			tsvFile(
				["start", "end", "generalCategory", "comment"],
				punctuationRows.map((row) => [
					row.start,
					row.end,
					row.value,
					row.comment,
				]),
			),
		),
		outputFor(
			resourceSpec,
			"ar-core-basic-segmentation",
			stableJson(basicSegmentation),
		),
		outputFor(resourceSpec, "ar-core-quality", stableJson(quality)),
		outputFor(
			resourceSpec,
			"ar-core-quality-profile",
			stableJson(canonicalQuality),
		),
	];
}

export const unicodeCldrLatinProfiles = {
	en: {
		languageTag: "en",
		languageName: "English",
		script: "Latn",
		likelySubtag: "en-Latn-US",
		scopeLabel: "modern typed English",
		defaultProfileLabel: "modern English Latin-script",
		normalizationProfileId: "en-modern-typed-unicode-normalization",
		normalizationQualityProfileId: "en-normalization-quality",
		likelySubtagRuleId: "cldr-english-latn-likely-subtag",
		normalizationOutputIds: {
			rules: "en-normalization-rules",
			profile: "en-normalization-profile",
			quality: "en-normalization-quality",
			qualityProfile: "en-normalization-quality-profile",
		},
		segmentationOutputIds: {
			boundaryProperties: "en-segmentation-boundary-properties",
			grapheme: "en-grapheme-segmentation-profile",
			word: "en-word-segmentation-profile",
			sentence: "en-sentence-segmentation-profile",
			quality: "en-segmentation-quality",
			qualityProfile: "en-segmentation-quality-profile",
		},
		segmentationProfileIds: {
			grapheme: "en-modern-typed-unicode-grapheme-segmentation",
			word: "en-modern-typed-unicode-word-segmentation",
			sentence: "en-modern-typed-unicode-sentence-segmentation",
		},
		sentenceBoundaryExceptions: [
			"Dr.",
			"Mr.",
			"Mrs.",
			"Ms.",
			"Prof.",
			"Sr.",
			"Jr.",
		],
	},
	fr: {
		languageTag: "fr",
		languageName: "French",
		script: "Latn",
		likelySubtag: "fr-Latn-FR",
		scopeLabel: "modern typed French",
		defaultProfileLabel: "modern French Latin-script",
		normalizationProfileId: "fr-modern-typed-unicode-normalization",
		normalizationQualityProfileId: "fr-normalization-quality",
		likelySubtagRuleId: "cldr-french-latn-likely-subtag",
		normalizationOutputIds: {
			rules: "fr-normalization-rules",
			profile: "fr-normalization-profile",
			quality: "fr-normalization-quality",
			qualityProfile: "fr-normalization-quality-profile",
		},
		segmentationOutputIds: {
			boundaryProperties: "fr-segmentation-boundary-properties",
			grapheme: "fr-grapheme-segmentation-profile",
			word: "fr-word-segmentation-profile",
			sentence: "fr-sentence-segmentation-profile",
			quality: "fr-segmentation-quality",
			qualityProfile: "fr-segmentation-quality-profile",
		},
		segmentationProfileIds: {
			grapheme: "fr-modern-typed-unicode-grapheme-segmentation",
			word: "fr-modern-typed-unicode-word-segmentation",
			sentence: "fr-modern-typed-unicode-sentence-segmentation",
		},
		elisionPrefixes: [
			"l",
			"n",
			"d",
			"j",
			"qu",
			"c",
			"s",
			"m",
			"t",
			"jusqu",
			"lorsqu",
			"puisqu",
			"quoiqu",
		],
		sentenceBoundaryExceptions: ["M.", "Mme.", "Mlle.", "Dr.", "Pr."],
	},
};

const frenchSurfaceContractionForms = ["au", "aux", "des", "du"];
const frenchSurfaceEvidenceMinimumCount = 25;
const frenchSurfaceGoldCaseLimit = 24;

function normalizeFrenchApostrophes(value) {
	return value.normalize("NFC").replaceAll("’", "'");
}

function frenchLookupFold(value) {
	return normalizeFrenchApostrophes(value)
		.toLocaleLowerCase("fr")
		.normalize("NFD")
		.replace(/\p{Mark}+/gu, "")
		.normalize("NFC");
}

function frenchSurfaceTokens(text, elisionPrefixes = new Set()) {
	const tokens = [];
	for (const match of text.matchAll(
		/[\p{Letter}\p{Mark}]+(?:['’][\p{Letter}\p{Mark}]+)?|\p{Number}+|[^\s]/gu,
	)) {
		const token = match[0];
		const apostropheIndex = token.search(/['’]/u);
		if (apostropheIndex > 0) {
			const prefix = token.slice(0, apostropheIndex).toLocaleLowerCase("fr");
			if (elisionPrefixes.has(prefix)) {
				tokens.push(token.slice(0, apostropheIndex + 1));
				tokens.push(token.slice(apostropheIndex + 1));
				continue;
			}
		}
		tokens.push(token);
	}
	return tokens;
}

function frenchAbbreviationCandidate(value) {
	if (!/^[\p{Letter}]{1,5}\.$/u.test(value)) return false;
	const stem = value.slice(0, -1);
	return stem === stem.toLocaleUpperCase("fr") || stem.length <= 3;
}

function deriveFrenchTatoebaSurfaceEvidence(resourceSpec, inputs) {
	const text = readBzip2Input(
		inputs,
		"fra_sentences_detailed.tsv.bz2",
		resourceSpec,
	);
	const apostropheCounts = new Map();
	const prefixCounts = new Map();
	const prefixApostropheCounts = new Map();
	const contractionCounts = new Map(
		frenchSurfaceContractionForms.map((form) => [form, 0]),
	);
	const abbreviationCounts = new Map();
	const prefixExamples = new Map();
	const contractionExamples = new Map();
	const abbreviationExamples = new Map();
	let sentenceRowCount = 0;
	let elisionObservationCount = 0;
	let contractionObservationCount = 0;
	let abbreviationObservationCount = 0;

	for (const line of text.split("\n")) {
		if (line.length === 0) continue;
		const cells = line.split("\t");
		if (cells.length < 3 || cells[1] !== "fra") continue;
		const sentenceId = cells[0];
		const sentenceText = cells[2];
		if (sentenceId === undefined || sentenceText === undefined) continue;
		sentenceRowCount += 1;
		for (const match of sentenceText.matchAll(
			/\b([\p{Letter}\p{Mark}]+)(['’])(?=[\p{Letter}\p{Mark}])/gu,
		)) {
			const prefix = match[1].toLocaleLowerCase("fr");
			const apostrophe = match[2];
			incrementCount(prefixCounts, prefix);
			incrementCount(apostropheCounts, apostrophe);
			incrementCount(prefixApostropheCounts, `${prefix}\u0000${apostrophe}`);
			elisionObservationCount += 1;
			if (!prefixExamples.has(prefix)) {
				prefixExamples.set(prefix, { sentenceId, text: sentenceText });
			}
		}
		for (const match of sentenceText.matchAll(
			/\b[\p{Letter}\p{Mark}.]+\b\.?/gu,
		)) {
			const token = match[0];
			const folded = token.toLocaleLowerCase("fr").replace(/\.$/u, "");
			if (frenchSurfaceContractionForms.includes(folded)) {
				incrementCount(contractionCounts, folded);
				contractionObservationCount += 1;
				if (!contractionExamples.has(folded)) {
					contractionExamples.set(folded, { sentenceId, text: sentenceText });
				}
			}
			if (frenchAbbreviationCandidate(token)) {
				incrementCount(abbreviationCounts, token);
				abbreviationObservationCount += 1;
				if (!abbreviationExamples.has(token)) {
					abbreviationExamples.set(token, { sentenceId, text: sentenceText });
				}
			}
		}
	}

	const observedElisionRows = sortedCountRows(prefixCounts)
		.filter(([, count]) => count >= frenchSurfaceEvidenceMinimumCount)
		.map(([prefix, count]) => {
			const apostropheRows = [...prefixApostropheCounts.entries()]
				.filter(([key]) => key.startsWith(`${prefix}\u0000`))
				.map(([key, apostropheCount]) => [
					key.slice(key.indexOf("\u0000") + 1),
					apostropheCount,
				])
				.sort(
					(left, right) =>
						right[1] - left[1] || left[0].localeCompare(right[0]),
				);
			const example = prefixExamples.get(prefix);
			return {
				prefix,
				count,
				apostrophes: apostropheRows
					.map(
						([apostrophe, apostropheCount]) =>
							`${apostrophe}:${apostropheCount}`,
					)
					.join(" "),
				exampleSentenceId: example?.sentenceId ?? "",
			};
		});
	const observedContractionRows = sortedCountRows(contractionCounts)
		.filter(([, count]) => count > 0)
		.map(([form, count]) => {
			const example = contractionExamples.get(form);
			return {
				form,
				count,
				exampleSentenceId: example?.sentenceId ?? "",
			};
		});
	const observedAbbreviationRows = sortedCountRows(abbreviationCounts)
		.filter(([, count]) => count >= frenchSurfaceEvidenceMinimumCount)
		.map(([form, count]) => {
			const example = abbreviationExamples.get(form);
			return {
				form,
				count,
				exampleSentenceId: example?.sentenceId ?? "",
			};
		});
	const elisionPrefixSet = new Set(
		observedElisionRows.map((row) => row.prefix),
	);
	const normalizationGoldCases = [
		...observedElisionRows
			.slice(0, frenchSurfaceGoldCaseLimit / 2)
			.map((row) => {
				const example = prefixExamples.get(row.prefix);
				const input = example?.text ?? "";
				return {
					caseId: `fr-normalization-elision-${row.prefix}`,
					source: "source:tatoeba:weekly-french-2026-06-06",
					sourceSentenceId: example?.sentenceId ?? "",
					category: "elision-apostrophe",
					input,
					expectedNfcCasefoldApostrophe:
						normalizeFrenchApostrophes(input).toLocaleLowerCase("fr"),
					expectedLookupFold: frenchLookupFold(input),
				};
			}),
		...observedContractionRows
			.slice(0, frenchSurfaceGoldCaseLimit / 2)
			.map((row) => {
				const example = contractionExamples.get(row.form);
				const input = example?.text ?? "";
				return {
					caseId: `fr-normalization-contraction-${row.form}`,
					source: "source:tatoeba:weekly-french-2026-06-06",
					sourceSentenceId: example?.sentenceId ?? "",
					category: "contraction-surface-form",
					input,
					expectedNfcCasefoldApostrophe:
						normalizeFrenchApostrophes(input).toLocaleLowerCase("fr"),
					expectedLookupFold: frenchLookupFold(input),
					recognizedSurfaceForm: row.form,
				};
			}),
	].slice(0, frenchSurfaceGoldCaseLimit);
	const segmentationGoldCases = [
		...observedElisionRows
			.slice(0, frenchSurfaceGoldCaseLimit / 2)
			.map((row) => {
				const example = prefixExamples.get(row.prefix);
				const input = example?.text ?? "";
				return {
					caseId: `fr-segmentation-elision-${row.prefix}`,
					source: "source:tatoeba:weekly-french-2026-06-06",
					sourceSentenceId: example?.sentenceId ?? "",
					category: "elision-apostrophe",
					input,
					expectedTokens: frenchSurfaceTokens(input, elisionPrefixSet),
				};
			}),
		...observedAbbreviationRows
			.slice(0, frenchSurfaceGoldCaseLimit / 4)
			.map((row) => {
				const example = abbreviationExamples.get(row.form);
				const input = example?.text ?? "";
				return {
					caseId: `fr-segmentation-abbreviation-${row.form.replace(/\.$/u, "")}`,
					source: "source:tatoeba:weekly-french-2026-06-06",
					sourceSentenceId: example?.sentenceId ?? "",
					category: "abbreviation-period",
					input,
					expectedTokens: frenchSurfaceTokens(input, elisionPrefixSet),
				};
			}),
	].slice(0, frenchSurfaceGoldCaseLimit);
	return {
		sentenceRowCount,
		apostropheCounts: Object.fromEntries(sortedCountRows(apostropheCounts)),
		elisionObservationCount,
		contractionObservationCount,
		abbreviationObservationCount,
		elisionPrefixRows: observedElisionRows,
		contractionRows: observedContractionRows,
		abbreviationRows: observedAbbreviationRows,
		normalizationGoldCases,
		segmentationGoldCases,
	};
}

function transformUnicodeCldrNormalizationProfile(
	resourceSpec,
	inputs,
	config,
) {
	const aliasesText = inputs.get("aliases.json");
	const likelySubtagsText = inputs.get("likelySubtags.json");
	const propertyValueAliasesText = inputs.get("PropertyValueAliases.txt");
	expect(
		aliasesText !== undefined,
		`${resourceSpec.resourceSpecId} missing aliases.json.`,
	);
	expect(
		likelySubtagsText !== undefined,
		`${resourceSpec.resourceSpecId} missing likelySubtags.json.`,
	);
	expect(
		propertyValueAliasesText !== undefined,
		`${resourceSpec.resourceSpecId} missing PropertyValueAliases.txt.`,
	);
	const aliases = JSON.parse(aliasesText);
	const likelySubtags = JSON.parse(likelySubtagsText);
	const propertyAliases = parsePropertyValueAliases(propertyValueAliasesText);
	const likelySubtag =
		likelySubtags.supplemental.likelySubtags[config.languageTag];
	expect(
		likelySubtag === config.likelySubtag,
		`${resourceSpec.resourceSpecId} expected CLDR likely subtag ${config.languageTag} -> ${config.likelySubtag}.`,
		likelySubtag,
	);
	const nfcQuickCheckAliases = propertyAliases.filter(
		(row) => row.property === "NFC_QC",
	);
	const caseAliasRows = propertyAliases.filter((row) =>
		["Cased", "CI", "CWCF", "CWCM", "CWKCF"].includes(row.property),
	);
	const aliasKinds = Object.keys(aliases.supplemental.metadata.alias).sort();
	const rules = [
		{
			ruleId: "unicode-nfc-compose",
			operation: "compose",
			priority: 10,
			note: `Use Unicode NFC canonical composition for stored and comparable ${config.scopeLabel} text.`,
		},
		{
			ruleId: "unicode-casefold-for-lookup",
			operation: "casefold",
			priority: 20,
			note: "Use Unicode casefolding for lookup/search normalization while preserving source text elsewhere.",
		},
		{
			ruleId: config.likelySubtagRuleId,
			operation: "map",
			priority: 30,
			input: config.languageTag,
			output: likelySubtag,
			note: `Use CLDR likely-subtag context for the default ${config.defaultProfileLabel} profile.`,
		},
	];
	const frenchSurfaceEvidence =
		config.languageTag === "fr"
			? deriveFrenchTatoebaSurfaceEvidence(resourceSpec, inputs)
			: undefined;
	if (frenchSurfaceEvidence !== undefined) {
		rules.push(
			{
				ruleId: "french-apostrophe-normalize-for-lookup",
				operation: "replace",
				priority: 40,
				input: "’",
				output: "'",
				note: "Normalize French straight and typographic apostrophes for lookup while preserving source text in document storage.",
				evidenceResourceId: "fr-normalization-elision-prefixes",
			},
			{
				ruleId: "french-observed-elision-boundary-policy",
				operation: "map",
				priority: 50,
				pattern: "\\b(prefix)['’](letter)",
				note: "Recognize observed French elision prefixes from the pinned Tatoeba French sentence snapshot for lookup and token-boundary policy.",
				evidenceResourceId: "fr-normalization-elision-prefixes",
			},
			{
				ruleId: "french-observed-contraction-surface-policy",
				operation: "map",
				priority: 60,
				pattern: "\\b(au|aux|des|du)\\b",
				note: "Recognize observed French contraction surface forms from the pinned Tatoeba French sentence snapshot.",
				evidenceResourceId: "fr-normalization-contraction-forms",
			},
			{
				ruleId: "french-accent-fold-for-search-lookup",
				operation: "strip-diacritic",
				priority: 70,
				pattern: "NFD:Mark+",
				note: "Expose a lookup-only accent-folding policy for French search analyzers; source text normalization remains NFC.",
				evidenceResourceId: "fr-normalization-gold-cases",
			},
		);
	}
	const canonicalNormalization = {
		schemaVersion: "1",
		kind: "normalization-profile",
		profileId: config.normalizationProfileId,
		languageTag: config.languageTag,
		script: config.script,
		unicodeNormalization: "NFC",
		casePolicy: "casefold",
		rules: rules.map((rule) => ({
			ruleId: rule.ruleId,
			operation: rule.operation,
			priority: rule.priority,
			...(rule.input === undefined ? {} : { input: rule.input }),
			...(rule.output === undefined ? {} : { output: rule.output }),
			...(rule.pattern === undefined ? {} : { pattern: rule.pattern }),
			conditions: {
				scope: `${config.scopeLabel} normalization profile`,
				sourceIds: resourceSpec.sourceIds,
				note: rule.note,
				...(rule.evidenceResourceId === undefined
					? {}
					: { evidenceResourceId: rule.evidenceResourceId }),
			},
		})),
	};
	const summary = {
		schemaVersion: "1",
		sourceIds: resourceSpec.sourceIds,
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		languageTag: config.languageTag,
		script: config.script,
		likelySubtag,
		ruleCount: rules.length,
		nfcQuickCheckValueCount: nfcQuickCheckAliases.length,
		caseAliasRowCount: caseAliasRows.length,
		aliasKindCount: aliasKinds.length,
		aliasKinds,
		...(frenchSurfaceEvidence === undefined
			? {}
			: {
					tatoebaSentenceRowCount: frenchSurfaceEvidence.sentenceRowCount,
					apostropheCounts: frenchSurfaceEvidence.apostropheCounts,
					elisionPrefixCount: frenchSurfaceEvidence.elisionPrefixRows.length,
					elisionObservationCount:
						frenchSurfaceEvidence.elisionObservationCount,
					contractionFormCount: frenchSurfaceEvidence.contractionRows.length,
					contractionObservationCount:
						frenchSurfaceEvidence.contractionObservationCount,
					normalizationGoldCaseCount:
						frenchSurfaceEvidence.normalizationGoldCases.length,
				}),
		recordsAccepted: rules.length,
		recordsRejected: 0,
		warnings: [
			`This profile declares Unicode/CLDR-backed normalization policy for ${config.scopeLabel} text.`,
			frenchSurfaceEvidence === undefined
				? "It does not claim spelling correction, noisy-text cleanup, historical spelling normalization, transliteration, or corpus-derived normalization."
				: "It adds Tatoeba-observed French apostrophe, elision-prefix, contraction-surface, and lookup accent-fold evidence; spelling correction, noisy-text cleanup, historical spelling normalization, transliteration, and OCR cleanup remain outside this component.",
		],
	};
	const canonicalQuality = {
		schemaVersion: "1",
		kind: "quality-profile",
		profileId: config.normalizationQualityProfileId,
		languageTag: config.languageTag,
		script: config.script,
		diagnostics: [
			{
				diagnosticId: `${config.languageTag}-normalization-scope`,
				task: "normalization.profile",
				severity: "info",
				message: `Unicode/CLDR-backed profile for ${config.scopeLabel}; spelling correction and noisy-text normalization are out of scope.`,
				metadata: {
					likelySubtag,
					sourceIds: resourceSpec.sourceIds,
					...(frenchSurfaceEvidence === undefined
						? {}
						: {
								elisionPrefixCount:
									frenchSurfaceEvidence.elisionPrefixRows.length,
								contractionFormCount:
									frenchSurfaceEvidence.contractionRows.length,
								normalizationGoldCaseCount:
									frenchSurfaceEvidence.normalizationGoldCases.length,
							}),
				},
			},
		],
		metrics: [
			{
				metricId: "rule-count",
				name: "ruleCount",
				value: summary.ruleCount,
				unit: "rules",
			},
			{
				metricId: "nfc-quick-check-value-count",
				name: "nfcQuickCheckValueCount",
				value: summary.nfcQuickCheckValueCount,
				unit: "aliases",
			},
			{
				metricId: "case-alias-row-count",
				name: "caseAliasRowCount",
				value: summary.caseAliasRowCount,
				unit: "aliases",
			},
			{
				metricId: "records-rejected",
				name: "recordsRejected",
				value: summary.recordsRejected,
				unit: "records",
			},
			...(frenchSurfaceEvidence === undefined
				? []
				: [
						{
							metricId: "french-elision-prefix-count",
							name: "elisionPrefixCount",
							value: summary.elisionPrefixCount,
							unit: "prefixes",
						},
						{
							metricId: "french-contraction-form-count",
							name: "contractionFormCount",
							value: summary.contractionFormCount,
							unit: "forms",
						},
						{
							metricId: "french-normalization-gold-case-count",
							name: "normalizationGoldCaseCount",
							value: summary.normalizationGoldCaseCount,
							unit: "cases",
						},
					]),
		],
		thresholds: [],
		evaluationRecordIds: [],
	};
	return [
		outputFor(
			resourceSpec,
			config.normalizationOutputIds.rules,
			tsvFile(
				["ruleId", "operation", "priority", "input", "output", "note"],
				rules.map((rule) => [
					rule.ruleId,
					rule.operation,
					rule.priority,
					rule.input ?? "",
					rule.output ?? "",
					rule.note,
				]),
			),
		),
		...(frenchSurfaceEvidence === undefined
			? []
			: [
					outputFor(
						resourceSpec,
						"fr-normalization-elision-prefixes",
						tsvFile(
							[
								"prefix",
								"observedCount",
								"apostropheCounts",
								"exampleSentenceId",
							],
							frenchSurfaceEvidence.elisionPrefixRows.map((row) => [
								row.prefix,
								row.count,
								row.apostrophes,
								row.exampleSentenceId,
							]),
						),
					),
					outputFor(
						resourceSpec,
						"fr-normalization-contraction-forms",
						tsvFile(
							["form", "observedCount", "exampleSentenceId"],
							frenchSurfaceEvidence.contractionRows.map((row) => [
								row.form,
								row.count,
								row.exampleSentenceId,
							]),
						),
					),
					outputFor(
						resourceSpec,
						"fr-normalization-gold-cases",
						stableJson({
							schemaVersion: "1",
							kind: "normalization-gold-cases",
							languageTag: "fr",
							sourceIds: resourceSpec.sourceIds,
							cases: frenchSurfaceEvidence.normalizationGoldCases,
						}),
					),
				]),
		outputFor(
			resourceSpec,
			config.normalizationOutputIds.profile,
			stableJson(canonicalNormalization),
		),
		outputFor(
			resourceSpec,
			config.normalizationOutputIds.quality,
			stableJson(summary),
		),
		outputFor(
			resourceSpec,
			config.normalizationOutputIds.qualityProfile,
			stableJson(canonicalQuality),
		),
	];
}

function transformEnglishNormalizationProfile(resourceSpec, inputs) {
	return transformUnicodeCldrNormalizationProfile(
		resourceSpec,
		inputs,
		unicodeCldrLatinProfiles.en,
	);
}

function transformFrenchNormalizationProfile(resourceSpec, inputs) {
	return transformUnicodeCldrNormalizationProfile(
		resourceSpec,
		inputs,
		unicodeCldrLatinProfiles.fr,
	);
}

function unicodePropertyCounts(rows) {
	const counts = new Map();
	for (const row of rows) {
		counts.set(row.value, (counts.get(row.value) ?? 0) + 1);
	}
	return Object.fromEntries(sortedCountRows(counts));
}

function segmentationCanonicalProfile({
	profileId,
	granularity,
	schemeId,
	description,
	propertyCounts,
	rangeCount,
	likelySubtag,
	sourceIds,
	languageTag,
	script,
	scopeLabel,
	sentenceBoundaryExceptions,
}) {
	return {
		schemaVersion: "1",
		kind: "segmentation-profile",
		profileId,
		languageTag,
		script,
		granularity,
		schemes: [
			{
				schemeId,
				description,
				fields: [
					{ order: 1, name: "unicodeBreakProperty" },
					{ order: 2, name: "rangeCount" },
				],
			},
		],
		rules: [
			{
				ruleId: `${schemeId}-uax29-boundary-policy`,
				operation: "label",
				priority: 10,
				pattern: `UAX29:${granularity}`,
				label: `${granularity}-boundary`,
				conditions: {
					sourceIds,
					likelySubtag,
					rangeCount,
					propertyCounts,
					scope: `${scopeLabel} Unicode segmentation profile`,
				},
			},
		],
		dictionaryRefs: [],
		...(sentenceBoundaryExceptions === undefined
			? {}
			: { sentenceBoundaryExceptions }),
	};
}

function transformUnicodeCldrSegmentationProfile(resourceSpec, inputs, config) {
	const graphemeText = requiredInput(
		inputs,
		"GraphemeBreakProperty.txt",
		resourceSpec,
	);
	const wordText = requiredInput(inputs, "WordBreakProperty.txt", resourceSpec);
	const sentenceText = requiredInput(
		inputs,
		"SentenceBreakProperty.txt",
		resourceSpec,
	);
	const likelySubtagsText = requiredInput(
		inputs,
		"likelySubtags.json",
		resourceSpec,
	);
	const likelySubtags = JSON.parse(likelySubtagsText);
	const likelySubtag =
		likelySubtags.supplemental.likelySubtags[config.languageTag];
	expect(
		likelySubtag === config.likelySubtag,
		`${resourceSpec.resourceSpecId} expected CLDR likely subtag ${config.languageTag} -> ${config.likelySubtag}.`,
		likelySubtag,
	);
	const graphemeRows = parseUnicodeRangeFile(graphemeText);
	const wordRows = parseUnicodeRangeFile(wordText);
	const sentenceRows = parseUnicodeRangeFile(sentenceText);
	const summaries = [
		{
			granularity: "grapheme",
			rows: graphemeRows,
			counts: unicodePropertyCounts(graphemeRows),
			resourceId: config.segmentationOutputIds.grapheme,
			profileId: config.segmentationProfileIds.grapheme,
			schemeId: "unicode-uax29-grapheme",
			description:
				"Unicode UAX #29 extended grapheme cluster boundary profile.",
		},
		{
			granularity: "word",
			rows: wordRows,
			counts: unicodePropertyCounts(wordRows),
			resourceId: config.segmentationOutputIds.word,
			profileId: config.segmentationProfileIds.word,
			schemeId: "unicode-uax29-word",
			description: "Unicode UAX #29 word boundary profile.",
		},
		{
			granularity: "sentence",
			rows: sentenceRows,
			counts: unicodePropertyCounts(sentenceRows),
			resourceId: config.segmentationOutputIds.sentence,
			profileId: config.segmentationProfileIds.sentence,
			schemeId: "unicode-uax29-sentence",
			description: "Unicode UAX #29 sentence boundary profile.",
		},
	];
	const frenchSurfaceEvidence =
		config.languageTag === "fr"
			? deriveFrenchTatoebaSurfaceEvidence(resourceSpec, inputs)
			: undefined;
	const propertyRows = [];
	for (const summary of summaries) {
		for (const [property, rangeCount] of Object.entries(summary.counts)) {
			propertyRows.push([
				summary.granularity,
				property,
				rangeCount,
				likelySubtag,
			]);
		}
	}
	propertyRows.sort((left, right) => {
		const granularityDelta = left[0].localeCompare(right[0]);
		if (granularityDelta !== 0) return granularityDelta;
		return left[1].localeCompare(right[1]);
	});
	const quality = {
		schemaVersion: "1",
		sourceIds: resourceSpec.sourceIds,
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		languageTag: config.languageTag,
		script: config.script,
		likelySubtag,
		graphemeRangeCount: graphemeRows.length,
		wordRangeCount: wordRows.length,
		sentenceRangeCount: sentenceRows.length,
		propertyRows: propertyRows.length,
		propertyCountsByGranularity: Object.fromEntries(
			summaries.map((summary) => [summary.granularity, summary.counts]),
		),
		...(frenchSurfaceEvidence === undefined
			? {}
			: {
					tatoebaSentenceRowCount: frenchSurfaceEvidence.sentenceRowCount,
					elisionPrefixCount: frenchSurfaceEvidence.elisionPrefixRows.length,
					elisionObservationCount:
						frenchSurfaceEvidence.elisionObservationCount,
					contractionFormCount: frenchSurfaceEvidence.contractionRows.length,
					contractionObservationCount:
						frenchSurfaceEvidence.contractionObservationCount,
					abbreviationCandidateCount:
						frenchSurfaceEvidence.abbreviationRows.length,
					abbreviationObservationCount:
						frenchSurfaceEvidence.abbreviationObservationCount,
					segmentationGoldCaseCount:
						frenchSurfaceEvidence.segmentationGoldCases.length,
				}),
		recordsAccepted:
			graphemeRows.length + wordRows.length + sentenceRows.length,
		recordsRejected: 0,
		warnings: [
			`This profile declares Unicode UAX #29-backed grapheme, word, and sentence boundary resources for ${config.scopeLabel} text.`,
			frenchSurfaceEvidence === undefined
				? "It does not claim dictionary tokenization, sentence-abbreviation tailoring, social-text tokenization, historical segmentation, OCR segmentation, or language-composite coverage."
				: "It adds Tatoeba-observed French elision-prefix, contraction-surface, abbreviation-candidate, and token gold-case resources; social-text tokenization, historical segmentation, and OCR segmentation remain outside this component.",
		],
	};
	const frenchTokenProfile =
		frenchSurfaceEvidence === undefined
			? undefined
			: {
					schemaVersion: "1",
					kind: "segmentation-profile",
					profileId: "fr-modern-typed-french-token-segmentation",
					languageTag: "fr",
					script: "Latn",
					granularity: "token",
					schemes: [
						{
							schemeId: "french-observed-surface-token-policy",
							description:
								"French token policy backed by observed Tatoeba apostrophe, contraction, and abbreviation surface evidence plus Unicode UAX #29 boundaries.",
							fields: [
								{ order: 1, name: "unicodeBreakProperty" },
								{ order: 2, name: "observedSurfaceClass" },
								{ order: 3, name: "sourceCount" },
							],
						},
					],
					rules: [
						{
							ruleId: "fr-token-split-after-observed-elision-apostrophe",
							operation: "split",
							priority: 40,
							pattern: "\\b(prefix)['’](letter)",
							label: "elision-prefix-token",
							conditions: {
								sourceIds: resourceSpec.sourceIds,
								evidenceResourceId: "fr-segmentation-elision-prefixes",
								elisionPrefixCount:
									frenchSurfaceEvidence.elisionPrefixRows.length,
							},
						},
						{
							ruleId: "fr-token-label-observed-contraction-surface-form",
							operation: "label",
							priority: 50,
							pattern: "\\b(au|aux|des|du)\\b",
							label: "contraction-surface-form",
							conditions: {
								sourceIds: resourceSpec.sourceIds,
								evidenceResourceId: "fr-segmentation-contraction-forms",
								contractionFormCount:
									frenchSurfaceEvidence.contractionRows.length,
							},
						},
						{
							ruleId: "fr-token-no-boundary-inside-observed-abbreviation",
							operation: "no-boundary",
							priority: 60,
							pattern: "abbreviation-period",
							label: "abbreviation-period",
							conditions: {
								sourceIds: resourceSpec.sourceIds,
								evidenceResourceId: "fr-segmentation-abbreviations",
								abbreviationCandidateCount:
									frenchSurfaceEvidence.abbreviationRows.length,
							},
						},
					],
					elisionPrefixes: config.elisionPrefixes,
					dictionaryRefs: [],
				};
	const segmentationScopeMessage =
		frenchSurfaceEvidence === undefined
			? `Unicode/CLDR-backed boundary profile for ${config.scopeLabel}.`
			: `Unicode/CLDR-backed boundary profile for ${config.scopeLabel}, with source-derived French elision, contraction, abbreviation, and gold-case evidence.`;
	const canonicalQuality = {
		schemaVersion: "1",
		kind: "quality-profile",
		profileId: `${config.languageTag}-segmentation-quality`,
		languageTag: config.languageTag,
		script: config.script,
		diagnostics: [
			{
				diagnosticId: `${config.languageTag}-segmentation-scope`,
				task: "segmentation.profile",
				severity: "info",
				message: segmentationScopeMessage,
				metadata: {
					likelySubtag,
					sourceIds: resourceSpec.sourceIds,
					...(frenchSurfaceEvidence === undefined
						? {}
						: {
								elisionPrefixCount:
									frenchSurfaceEvidence.elisionPrefixRows.length,
								contractionFormCount:
									frenchSurfaceEvidence.contractionRows.length,
								abbreviationCandidateCount:
									frenchSurfaceEvidence.abbreviationRows.length,
								segmentationGoldCaseCount:
									frenchSurfaceEvidence.segmentationGoldCases.length,
							}),
				},
			},
		],
		metrics: [
			{
				metricId: "grapheme-range-count",
				name: "graphemeRangeCount",
				value: quality.graphemeRangeCount,
				unit: "ranges",
			},
			{
				metricId: "word-range-count",
				name: "wordRangeCount",
				value: quality.wordRangeCount,
				unit: "ranges",
			},
			{
				metricId: "sentence-range-count",
				name: "sentenceRangeCount",
				value: quality.sentenceRangeCount,
				unit: "ranges",
			},
			{
				metricId: "records-rejected",
				name: "recordsRejected",
				value: quality.recordsRejected,
				unit: "records",
			},
			...(frenchSurfaceEvidence === undefined
				? []
				: [
						{
							metricId: "french-elision-prefix-count",
							name: "elisionPrefixCount",
							value: quality.elisionPrefixCount,
							unit: "prefixes",
						},
						{
							metricId: "french-contraction-form-count",
							name: "contractionFormCount",
							value: quality.contractionFormCount,
							unit: "forms",
						},
						{
							metricId: "french-abbreviation-candidate-count",
							name: "abbreviationCandidateCount",
							value: quality.abbreviationCandidateCount,
							unit: "forms",
						},
						{
							metricId: "french-segmentation-gold-case-count",
							name: "segmentationGoldCaseCount",
							value: quality.segmentationGoldCaseCount,
							unit: "cases",
						},
					]),
		],
		thresholds: [],
		evaluationRecordIds: [],
	};
	return [
		outputFor(
			resourceSpec,
			config.segmentationOutputIds.boundaryProperties,
			tsvFile(
				["granularity", "property", "rangeCount", "likelySubtag"],
				propertyRows,
			),
		),
		...summaries.map((summary) =>
			outputFor(
				resourceSpec,
				summary.resourceId,
				stableJson(
					segmentationCanonicalProfile({
						profileId: summary.profileId,
						granularity: summary.granularity,
						schemeId: summary.schemeId,
						description: summary.description,
						propertyCounts: summary.counts,
						rangeCount: summary.rows.length,
						likelySubtag,
						sourceIds: resourceSpec.sourceIds,
						languageTag: config.languageTag,
						script: config.script,
						scopeLabel: config.scopeLabel,
						sentenceBoundaryExceptions:
							summary.granularity === "sentence"
								? config.sentenceBoundaryExceptions
								: undefined,
					}),
				),
			),
		),
		...(frenchSurfaceEvidence === undefined
			? []
			: [
					outputFor(
						resourceSpec,
						"fr-token-segmentation-profile",
						stableJson(frenchTokenProfile),
					),
					outputFor(
						resourceSpec,
						"fr-segmentation-elision-prefixes",
						tsvFile(
							[
								"prefix",
								"observedCount",
								"apostropheCounts",
								"exampleSentenceId",
							],
							frenchSurfaceEvidence.elisionPrefixRows.map((row) => [
								row.prefix,
								row.count,
								row.apostrophes,
								row.exampleSentenceId,
							]),
						),
					),
					outputFor(
						resourceSpec,
						"fr-segmentation-contraction-forms",
						tsvFile(
							["form", "observedCount", "exampleSentenceId"],
							frenchSurfaceEvidence.contractionRows.map((row) => [
								row.form,
								row.count,
								row.exampleSentenceId,
							]),
						),
					),
					outputFor(
						resourceSpec,
						"fr-segmentation-abbreviations",
						tsvFile(
							["form", "observedCount", "exampleSentenceId"],
							frenchSurfaceEvidence.abbreviationRows.map((row) => [
								row.form,
								row.count,
								row.exampleSentenceId,
							]),
						),
					),
					outputFor(
						resourceSpec,
						"fr-segmentation-gold-cases",
						stableJson({
							schemaVersion: "1",
							kind: "segmentation-gold-cases",
							languageTag: "fr",
							sourceIds: resourceSpec.sourceIds,
							cases: frenchSurfaceEvidence.segmentationGoldCases,
						}),
					),
				]),
		outputFor(
			resourceSpec,
			config.segmentationOutputIds.quality,
			stableJson(quality),
		),
		outputFor(
			resourceSpec,
			config.segmentationOutputIds.qualityProfile,
			stableJson(canonicalQuality),
		),
	];
}

function transformEnglishSegmentationProfile(resourceSpec, inputs) {
	return transformUnicodeCldrSegmentationProfile(
		resourceSpec,
		inputs,
		unicodeCldrLatinProfiles.en,
	);
}

function transformFrenchSegmentationProfile(resourceSpec, inputs) {
	return transformUnicodeCldrSegmentationProfile(
		resourceSpec,
		inputs,
		unicodeCldrLatinProfiles.fr,
	);
}

function camelSections(text) {
	const sections = new Map();
	let current = "";
	for (const line of text.split(/\r?\n/u)) {
		const header = line.match(/^###(.+?)###$/u);
		if (header !== null) {
			current = header[1].trim();
			if (!sections.has(current)) sections.set(current, []);
			continue;
		}
		if (current.length === 0 || line.length === 0) continue;
		sections.get(current)?.push(line);
	}
	return sections;
}

function splitFeatureToken(token) {
	const index = token.indexOf(":");
	if (index === -1) return undefined;
	return [token.slice(0, index), token.slice(index + 1)];
}

function parseFeatureString(text) {
	const features = {};
	for (const token of text.trim().split(/\s+/u)) {
		if (token.length === 0) continue;
		const pair = splitFeatureToken(token);
		if (pair === undefined) continue;
		features[pair[0]] = pair[1];
	}
	return features;
}

function incrementCount(counts, key, amount = 1) {
	counts.set(key, (counts.get(key) ?? 0) + amount);
}

function sortedCountRows(counts) {
	return [...counts.entries()].sort((left, right) => {
		const countDelta = right[1] - left[1];
		if (countDelta !== 0) return countDelta;
		return left[0].localeCompare(right[0]);
	});
}

const ARABIC_MORPH_FEATURE_ALIASES = new Map([
	["pos", "partOfSpeech"],
	["lex", "lexicalForm"],
	["diac", "diacritizedForm"],
	["bw", "buckwalter"],
	["stemcat", "stemCategory"],
	["source", "sourceType"],
	["d3seg", "d3Segmentation"],
	["atbseg", "atbSegmentation"],
	["d3tok", "d3Tokenization"],
	["atbtok", "atbTokenization"],
]);

function canonicalArabicMorphFeature(feature) {
	return ARABIC_MORPH_FEATURE_ALIASES.get(feature) ?? feature;
}

function canonicalArabicMorphFeatureBundle(features) {
	return Object.entries(features)
		.map(([feature, value]) => [canonicalArabicMorphFeature(feature), value])
		.sort((left, right) => left[0].localeCompare(right[0]))
		.map(([feature, value]) => `${feature}:${value}`)
		.join(" ");
}

function transformCamelMorphMsa(resourceSpec, inputs) {
	const text = requiredInput(inputs, "camel_morph_msa_v1.0.db", resourceSpec);
	const sections = camelSections(text);
	const defines = sections.get("DEFINES") ?? [];
	const defaults = sections.get("DEFAULTS") ?? [];
	const tokenizations = sections.get("TOKENIZATIONS") ?? [];
	const morphemeSections = ["PREFIXES", "STEMS", "SUFFIXES"];
	const compatibilitySections = ["TABLE AB", "TABLE BC", "TABLE AC"];
	const featureRows = [];
	for (const line of defines) {
		const parts = line.split(/\s+/u);
		if (parts[0] !== "DEFINE" || parts.length < 3) continue;
		const feature = canonicalArabicMorphFeature(parts[1]);
		const values = parts.slice(2).map((token) => {
			const pair = splitFeatureToken(token);
			return pair === undefined ? token : pair[1];
		});
		featureRows.push([feature, values.length, values.join(" ")]);
	}
	featureRows.sort((left, right) => left[0].localeCompare(right[0]));

	const defaultRows = [];
	for (const line of defaults) {
		const payload = line.replace(/^DEFAULT\s+/u, "");
		const features = parseFeatureString(payload);
		const pos = features.pos ?? "";
		for (const [feature, value] of Object.entries(features).sort(
			(left, right) => left[0].localeCompare(right[0]),
		)) {
			defaultRows.push([pos, canonicalArabicMorphFeature(feature), value]);
		}
	}

	const tokenizationRows = [];
	for (const line of tokenizations) {
		const parts = line.split(/\s+/u);
		if (parts[0] !== "TOKENIZATION") continue;
		parts.slice(1).forEach((field, index) => {
			tokenizationRows.push([index + 1, canonicalArabicMorphFeature(field)]);
		});
	}

	const morphemeRows = [];
	const morphemeCountsBySection = new Map();
	const morphemeCountsByPos = new Map();
	for (const section of morphemeSections) {
		const lines = sections.get(section) ?? [];
		for (const line of lines) {
			const [surface = "", category = "", ...rest] = line.split("\t");
			const featureText = rest.join(" ").trim();
			const features = parseFeatureString(featureText);
			incrementCount(morphemeCountsBySection, section);
			incrementCount(morphemeCountsByPos, features.pos ?? "");
			morphemeRows.push([
				section,
				surface,
				category,
				features.pos ?? "",
				features.lex ?? "",
				features.diac ?? "",
				features.bw ?? "",
				features.gloss ?? "",
				features.root ?? "",
				features.pattern ?? "",
				features.stem ?? "",
				features.stemcat ?? "",
				features.source ?? "",
				features.d3seg ?? "",
				features.atbseg ?? "",
				features.d3tok ?? "",
				features.atbtok ?? "",
				canonicalArabicMorphFeatureBundle(features),
			]);
		}
	}
	morphemeRows.sort((left, right) => {
		const sectionDelta = left[0].localeCompare(right[0]);
		if (sectionDelta !== 0) return sectionDelta;
		const categoryDelta = left[2].localeCompare(right[2]);
		if (categoryDelta !== 0) return categoryDelta;
		return left[1].localeCompare(right[1]);
	});

	const compatibilityRows = [];
	const compatibilityCounts = new Map();
	for (const section of compatibilitySections) {
		for (const line of sections.get(section) ?? []) {
			const [left = "", right = ""] = line.trim().split(/\s+/u);
			if (left.length === 0 || right.length === 0) continue;
			compatibilityRows.push([section.replace("TABLE ", ""), left, right]);
			incrementCount(compatibilityCounts, section);
		}
	}
	compatibilityRows.sort((left, right) => {
		const tableDelta = left[0].localeCompare(right[0]);
		if (tableDelta !== 0) return tableDelta;
		const leftDelta = left[1].localeCompare(right[1]);
		if (leftDelta !== 0) return leftDelta;
		return left[2].localeCompare(right[2]);
	});

	const summary = {
		schemaVersion: "1",
		sourceId: "source:camel:morph-msa-lrec-coling-2024",
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		featureCount: featureRows.length,
		defaultFeatureCount: defaultRows.length,
		tokenizationFieldCount: tokenizationRows.length,
		morphemeCount: morphemeRows.length,
		compatibilityCount: compatibilityRows.length,
		morphemeCountsBySection: Object.fromEntries(
			sortedCountRows(morphemeCountsBySection),
		),
		morphemeCountsByPos: Object.fromEntries(
			sortedCountRows(morphemeCountsByPos),
		),
		compatibilityCounts: Object.fromEntries(
			sortedCountRows(compatibilityCounts),
		),
		recordsAccepted:
			featureRows.length +
			defaultRows.length +
			tokenizationRows.length +
			morphemeRows.length +
			compatibilityRows.length,
		recordsRejected: 0,
		warnings: [],
	};
	const canonicalMorphology = {
		schemaVersion: "1",
		kind: "morphology",
		morphologyId: "ar-msa-camel-morphology",
		languageTag: "ar",
		script: "Arab",
		resourceRefs: [
			{
				resourceId: "ar-msa-camel-morph-features",
				role: "feature-inventory",
				recordCount: featureRows.length,
			},
			{
				resourceId: "ar-msa-camel-morph-defaults",
				role: "defaults",
				recordCount: defaultRows.length,
			},
			{
				resourceId: "ar-msa-camel-morph-morphemes",
				role: "morpheme-inventory",
				recordCount: morphemeRows.length,
			},
			{
				resourceId: "ar-msa-camel-morph-compatibility",
				role: "compatibility-table",
				recordCount: compatibilityRows.length,
			},
		],
		analyzers: [
			{
				analyzerId: "ar-msa-camel-lookup",
				type: "lookup",
				resourceIds: [
					"ar-msa-camel-morph-features",
					"ar-msa-camel-morph-defaults",
					"ar-msa-camel-morph-morphemes",
					"ar-msa-camel-morph-compatibility",
				],
				coverage: {
					morphemeCount: morphemeRows.length,
					compatibilityCount: compatibilityRows.length,
				},
			},
		],
		featureInventory: featureRows.map(([feature, count, values]) => ({
			feature,
			count,
			values: values.length === 0 ? [] : values.split(" "),
		})),
		morphemeSets: sortedCountRows(morphemeCountsBySection).map(
			([section, count]) => ({
				setId: `section:${section}`,
				section,
				count,
			}),
		),
		compatibilityTables: sortedCountRows(compatibilityCounts).map(
			([table, count]) => ({
				tableId: table,
				count,
			}),
		),
	};
	const canonicalSegmentation = {
		schemaVersion: "1",
		kind: "segmentation-profile",
		profileId: "ar-msa-camel-segmentation",
		languageTag: "ar",
		script: "Arab",
		granularity: "word",
		rules: [],
		dictionaryRefs: [],
	};
	const canonicalQuality = {
		schemaVersion: "1",
		kind: "quality-profile",
		profileId: "ar-msa-camel-morphology-quality",
		languageTag: "ar",
		script: "Arab",
		diagnostics: [
			{
				diagnosticId: "ar-msa-camel-transform-warnings",
				task: "morphology.transform",
				severity: "info",
				message:
					"CAMeL Morph MSA transform completed without rejected records.",
				metadata: {
					warningCount: summary.warnings.length,
				},
			},
		],
		metrics: [
			{
				metricId: "morpheme-count",
				name: "morphemeCount",
				value: morphemeRows.length,
				unit: "records",
			},
			{
				metricId: "compatibility-count",
				name: "compatibilityCount",
				value: compatibilityRows.length,
				unit: "records",
			},
			{
				metricId: "records-rejected",
				name: "recordsRejected",
				value: summary.recordsRejected,
				unit: "records",
			},
		],
		thresholds: [],
		evaluationRecordIds: [],
	};

	return [
		outputFor(
			resourceSpec,
			"ar-msa-camel-morph-features",
			tsvFile(["feature", "valueCount", "values"], featureRows),
		),
		outputFor(
			resourceSpec,
			"ar-msa-camel-morph-defaults",
			tsvFile(["partOfSpeech", "feature", "value"], defaultRows),
		),
		outputFor(
			resourceSpec,
			"ar-msa-camel-morph-tokenizations",
			tsvFile(["order", "field"], tokenizationRows),
		),
		outputFor(
			resourceSpec,
			"ar-msa-camel-morph-morphemes",
			tsvFile(
				[
					"section",
					"surface",
					"category",
					"partOfSpeech",
					"lexicalForm",
					"diacritizedForm",
					"buckwalter",
					"gloss",
					"root",
					"pattern",
					"stem",
					"stemCategory",
					"sourceType",
					"d3Segmentation",
					"atbSegmentation",
					"d3Tokenization",
					"atbTokenization",
					"featureBundle",
				],
				morphemeRows,
			),
		),
		outputFor(
			resourceSpec,
			"ar-msa-camel-morph-compatibility",
			tsvFile(["table", "leftCategory", "rightCategory"], compatibilityRows),
		),
		outputFor(resourceSpec, "ar-msa-camel-morph-quality", stableJson(summary)),
		outputFor(
			resourceSpec,
			"ar-msa-camel-morphology-canonical",
			stableJson(canonicalMorphology),
		),
		outputFor(
			resourceSpec,
			"ar-msa-camel-segmentation-canonical",
			stableJson(canonicalSegmentation),
		),
		outputFor(
			resourceSpec,
			"ar-msa-camel-quality-profile",
			stableJson(canonicalQuality),
		),
	];
}

function codePointLabel(character) {
	return `U+${character.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`;
}

const arabicNormalizationEquivalenceClasses = [
	{
		classId: "arabic-alef-variants",
		canonical: "\u0627",
		members: ["\u0627", "\u0622", "\u0623", "\u0625", "\u0671"],
	},
	{
		classId: "arabic-ya-variants",
		canonical: "\u064A",
		members: ["\u064A", "\u0649"],
	},
];

function transformArabicNormalizationProfile(resourceSpec, inputs) {
	const camelText = requiredInput(
		inputs,
		"camel_morph_msa_v1.0.db",
		resourceSpec,
	);
	const aliasesText = requiredInput(
		inputs,
		"PropertyValueAliases.txt",
		resourceSpec,
	);
	const likelySubtagsText = requiredInput(
		inputs,
		"likelySubtags.json",
		resourceSpec,
	);
	const sections = camelSections(camelText);
	const likelySubtags = JSON.parse(likelySubtagsText);
	const likelySubtag = likelySubtags.supplemental.likelySubtags.ar;
	expect(
		likelySubtag === "ar-Arab-EG",
		`${resourceSpec.resourceSpecId} expected CLDR likely subtag ar -> ar-Arab-EG.`,
		likelySubtag,
	);
	const propertyAliases = parsePropertyValueAliases(aliasesText);
	const nfcQuickCheckAliases = propertyAliases.filter(
		(row) => row.property === "NFC_QC",
	);
	const observedCodePoints = new Map();
	let observedFieldCount = 0;
	for (const section of ["PREFIXES", "STEMS", "SUFFIXES"]) {
		for (const line of sections.get(section) ?? []) {
			const [surface = "", , ...rest] = line.split("\t");
			const features = parseFeatureString(rest.join(" ").trim());
			for (const value of [
				surface,
				features.lex ?? "",
				features.diac ?? "",
				features.bw ?? "",
			]) {
				if (value.length === 0) continue;
				observedFieldCount += 1;
				for (const character of value) {
					observedCodePoints.set(
						character,
						(observedCodePoints.get(character) ?? 0) + 1,
					);
				}
			}
		}
	}
	const normalizationRules = [
		{
			ruleId: "unicode-nfc-compose",
			operation: "compose",
			priority: 10,
			note: "Use Unicode NFC canonical composition for stored and comparable Arabic MSA text.",
		},
		{
			ruleId: "unicode-casefold-for-lookup",
			operation: "casefold",
			priority: 20,
			note: "Use Unicode casefolding for lookup/search normalization while preserving source text elsewhere.",
		},
		{
			ruleId: "cldr-arab-likely-subtag",
			operation: "map",
			priority: 30,
			input: "ar",
			output: likelySubtag,
			note: "Use CLDR likely-subtag context for the default Arabic script profile.",
		},
		{
			ruleId: "arabic-delete-tatweel-for-lookup",
			operation: "delete",
			priority: 40,
			input: "\u0640",
			output: "",
			note: "Delete tatweel for lookup normalization.",
		},
		{
			ruleId: "arabic-strip-harakat-for-lookup",
			operation: "delete",
			priority: 50,
			pattern: "[\u064B-\u065F\u0670]",
			note: "Strip Arabic vowel marks and Quranic superscript alef for unvocalized lookup normalization.",
		},
	];
	for (const equivalenceClass of arabicNormalizationEquivalenceClasses) {
		for (const member of equivalenceClass.members) {
			if (member === equivalenceClass.canonical) continue;
			normalizationRules.push({
				ruleId: `${equivalenceClass.classId}-${codePointLabel(member).toLowerCase()}`,
				operation: "map",
				priority: 60,
				input: member,
				output: equivalenceClass.canonical,
				note: `Map ${equivalenceClass.classId} member ${codePointLabel(member)} to ${codePointLabel(equivalenceClass.canonical)} for lookup normalization.`,
			});
		}
	}
	const observedRows = [];
	const evidenceCharacters = new Set();
	for (const rule of normalizationRules) {
		if (rule.input !== undefined && rule.input.length === 1) {
			evidenceCharacters.add(rule.input);
		}
	}
	for (const equivalenceClass of arabicNormalizationEquivalenceClasses) {
		for (const member of equivalenceClass.members) {
			evidenceCharacters.add(member);
		}
	}
	for (const character of sorted([...evidenceCharacters])) {
		observedRows.push([
			codePointLabel(character),
			character,
			observedCodePoints.get(character) ?? 0,
		]);
	}
	const canonicalNormalization = {
		schemaVersion: "1",
		kind: "normalization-profile",
		profileId: "ar-msa-camel-unicode-normalization",
		languageTag: "ar",
		script: "Arab",
		unicodeNormalization: "NFC",
		casePolicy: "casefold",
		rules: normalizationRules.map((rule) => ({
			ruleId: rule.ruleId,
			operation: rule.operation,
			priority: rule.priority,
			...(rule.input === undefined ? {} : { input: rule.input }),
			...(rule.output === undefined ? {} : { output: rule.output }),
			...(rule.pattern === undefined ? {} : { pattern: rule.pattern }),
			conditions: {
				scope: "Arabic MSA lookup normalization profile",
				sourceIds: resourceSpec.sourceIds,
				likelySubtag,
				note: rule.note,
			},
		})),
		equivalenceClasses: arabicNormalizationEquivalenceClasses,
	};
	const summary = {
		schemaVersion: "1",
		sourceIds: resourceSpec.sourceIds,
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		languageTag: "ar",
		script: "Arab",
		likelySubtag,
		ruleCount: normalizationRules.length,
		equivalenceClassCount: arabicNormalizationEquivalenceClasses.length,
		observedEvidenceCodePointCount: observedRows.length,
		observedFieldCount,
		nfcQuickCheckValueCount: nfcQuickCheckAliases.length,
		recordsAccepted: normalizationRules.length + observedRows.length,
		recordsRejected: 0,
		warnings: [
			"This profile declares Unicode/CLDR and CAMeL MSA-backed Arabic lookup normalization policy.",
			"It does not claim dialectal Arabic normalization, Quranic/Classical Arabic policy, transliteration, spelling correction, OCR cleanup, or corpus-derived noisy-text normalization.",
		],
	};
	const canonicalQuality = {
		schemaVersion: "1",
		kind: "quality-profile",
		profileId: "ar-msa-normalization-quality",
		languageTag: "ar",
		script: "Arab",
		diagnostics: [
			{
				diagnosticId: "ar-normalization-scope",
				task: "normalization.profile",
				severity: "info",
				message:
					"Unicode/CLDR and CAMeL MSA-backed lookup profile; dialectal, Quranic/Classical, transliteration, OCR, and spelling-correction normalization are out of scope.",
				metadata: {
					likelySubtag,
					sourceIds: resourceSpec.sourceIds,
				},
			},
		],
		metrics: [
			{
				metricId: "rule-count",
				name: "ruleCount",
				value: summary.ruleCount,
				unit: "rules",
			},
			{
				metricId: "observed-evidence-code-point-count",
				name: "observedEvidenceCodePointCount",
				value: summary.observedEvidenceCodePointCount,
				unit: "codepoints",
			},
			{
				metricId: "records-rejected",
				name: "recordsRejected",
				value: summary.recordsRejected,
				unit: "records",
			},
		],
		thresholds: [],
		evaluationRecordIds: [],
	};
	return [
		outputFor(
			resourceSpec,
			"ar-normalization-rules",
			tsvFile(
				[
					"ruleId",
					"operation",
					"priority",
					"input",
					"output",
					"pattern",
					"note",
				],
				normalizationRules.map((rule) => [
					rule.ruleId,
					rule.operation,
					rule.priority,
					rule.input ?? "",
					rule.output ?? "",
					rule.pattern ?? "",
					rule.note,
				]),
			),
		),
		outputFor(
			resourceSpec,
			"ar-normalization-observed-codepoints",
			tsvFile(["codePoint", "character", "observedCount"], observedRows),
		),
		outputFor(
			resourceSpec,
			"ar-normalization-profile",
			stableJson(canonicalNormalization),
		),
		outputFor(resourceSpec, "ar-normalization-quality", stableJson(summary)),
		outputFor(
			resourceSpec,
			"ar-normalization-quality-profile",
			stableJson(canonicalQuality),
		),
	];
}

function transformArabicSearchProfile(resourceSpec, inputs) {
	const likelySubtags = JSON.parse(
		requiredInput(inputs, "likelySubtags.json", resourceSpec),
	);
	const likelySubtag = likelySubtags.supplemental.likelySubtags.ar;
	expect(
		likelySubtag === "ar-Arab-EG",
		`${resourceSpec.resourceSpecId} expected CLDR likely subtag ar -> ar-Arab-EG.`,
		likelySubtag,
	);

	const analyzer = {
		schemaVersion: "1",
		kind: "search-profile",
		analyzerId: "ar-msa-lookup-search-analyzer",
		languageTag: "ar",
		script: "Arab",
		tokenizer: {
			componentId: "unicode-word",
			type: "unicode-word-boundary",
			mode: "default",
		},
		tokenFilters: [
			{
				componentId: "arabic-strip-tatweel-and-harakat",
				type: "arabic-mark-policy",
				mode: "lookup-delete",
				options: {
					deleteTatweel: true,
					deleteHarakat: true,
				},
			},
		],
		fields: [
			{
				fieldName: "text",
				analyzerRole: "index",
			},
			{
				fieldName: "text",
				analyzerRole: "query",
			},
			{
				fieldName: "text",
				analyzerRole: "highlight",
			},
			{
				fieldName: "text",
				analyzerRole: "suggest",
			},
		],
	};

	const quality = {
		schemaVersion: "1",
		sourceIds: resourceSpec.sourceIds,
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		languageTag: "ar",
		script: "Arab",
		likelySubtag,
		analyzerProfileCount: 1,
		recordsAccepted: 1,
		recordsRejected: 0,
		warnings: [
			"The built-in analyzer executes Unicode word tokenization plus Arabic mark and tatweel removal.",
			"Morphology-aware tokenization, stemming, synonym expansion, persistent indexing, corpus-derived ranking, dialectal Arabic search, and Classical/Quranic Arabic search are outside this profile.",
		],
	};
	const canonicalQuality = {
		schemaVersion: "1",
		kind: "quality-profile",
		profileId: "ar-search-quality",
		languageTag: "ar",
		script: "Arab",
		diagnostics: [
			{
				diagnosticId: "ar-search-scope",
				task: "search.profile",
				severity: "info",
				message:
					"Arabic Unicode word and mark-normalization analyzer profile; morphology, synonyms, corpus ranking, dialectal search, and Classical/Quranic search are out of scope.",
				metadata: {
					likelySubtag,
					sourceIds: resourceSpec.sourceIds,
				},
			},
		],
		metrics: [
			{
				metricId: "analyzer-profile-count",
				name: "analyzerProfileCount",
				value: quality.analyzerProfileCount,
				unit: "profiles",
			},
			{
				metricId: "records-rejected",
				name: "recordsRejected",
				value: quality.recordsRejected,
				unit: "records",
			},
		],
		thresholds: [],
		evaluationRecordIds: [],
	};

	return [
		outputFor(resourceSpec, "ar-search-profile", stableJson(analyzer)),
		outputFor(resourceSpec, "ar-search-quality", stableJson(quality)),
		outputFor(
			resourceSpec,
			"ar-search-quality-profile",
			stableJson(canonicalQuality),
		),
	];
}

const WIKIDATA_DUMP_VERSION = "20260608";
const WIKIDATA_20260608_GZIP = {
	fileName: "wikidata-20260608-all.json.gz",
	sizeBytes: 142291512349,
	sourceUrl:
		"https://dumps.wikimedia.org/wikidatawiki/entities/20260608/wikidata-20260608-all.json.gz",
};

function checksumFromSidecar(text, fileName, algorithm) {
	for (const line of text.split(/\r?\n/u)) {
		const trimmed = line.trim();
		if (trimmed.length === 0) continue;
		const [value, candidate] = trimmed.split(/\s+/u);
		if (candidate === fileName) return `${algorithm}:${value}`;
	}
	throw new Error(`Missing ${algorithm} checksum for ${fileName}.`);
}

const WIKIDATA_ARTIFACT_CONFIG_BY_PACKAGE = new Map([
	[
		"@ismail-elkorchi/textpack-wikidata-ar",
		{
			languageName: "Arabic",
			languageTag: "ar",
			resourcePrefix: "wikidata-ar",
			script: "Arab",
		},
	],
	[
		"@ismail-elkorchi/textpack-wikidata-en",
		{
			languageName: "English",
			languageTag: "en",
			resourcePrefix: "wikidata-en",
			script: "Latn",
		},
	],
	[
		"@ismail-elkorchi/textpack-wikidata-fr",
		{
			languageName: "French",
			languageTag: "fr",
			resourcePrefix: "wikidata-fr",
			script: "Latn",
		},
	],
]);

function wikidataArtifactConfig(resourceSpec) {
	const config = WIKIDATA_ARTIFACT_CONFIG_BY_PACKAGE.get(
		resourceSpec.packageName,
	);
	expect(
		config !== undefined,
		`${resourceSpec.resourceSpecId} uses wikidata-main-artifact for unsupported package ${resourceSpec.packageName}.`,
	);
	const artifactId = `artifact:textpack-wikidata-${config.languageTag}:full:wikidata-entities-json:${WIKIDATA_DUMP_VERSION}`;
	return {
		...config,
		artifactId,
		kbId: `${config.resourcePrefix}-entity-kb`,
		kbResourceId: `${config.resourcePrefix}-kb-artifact`,
		qualityProfileId: `${config.resourcePrefix}-artifact-quality`,
		qualityResourceId: `${config.resourcePrefix}-quality`,
		qualityProfileResourceId: `${config.resourcePrefix}-quality-profile`,
	};
}

function canonicalizeWikidataEntityRows(text) {
	const lines = text.replace(/\r\n/gu, "\n").replace(/\r/gu, "\n").split("\n");
	const header = lines[0];
	expect(
		header !== undefined && header.length > 0,
		"Wikidata entity extract must contain a TSV header.",
	);
	const columns = header
		.split("\t")
		.map((column) =>
			/^[a-z]{2,3}wikiUrl$/u.test(column) ? "wikiUrl" : column,
		);
	expect(
		new Set(columns).size === columns.length,
		"Wikidata entity extract canonicalized header must not duplicate columns.",
	);
	lines[0] = columns.join("\t");
	return lines.join("\n");
}

function canonicalizeWikidataRelationRows(text) {
	const lines = text.replace(/\r\n/gu, "\n").replace(/\r/gu, "\n").split("\n");
	const header = lines[0];
	expect(
		header !== undefined && header.length > 0,
		"Wikidata relation extract must contain a TSV header.",
	);
	const columns = header.split("\t").map((column) => {
		if (column === "sourceEntityId") return "sourceId";
		if (column === "propertyId") return "predicateId";
		if (column === "targetEntityId") return "targetId";
		return column;
	});
	expect(
		new Set(columns).size === columns.length,
		"Wikidata relation extract canonicalized header must not duplicate columns.",
	);
	lines[0] = columns.join("\t");
	return lines.join("\n");
}

function transformWikidataMainArtifact(resourceSpec, inputs, context) {
	const config = wikidataArtifactConfig(resourceSpec);
	const sha1Sums = requiredInput(
		inputs,
		"wikidata-20260608-sha1sums.txt",
		resourceSpec,
	);
	const md5Sums = requiredInput(
		inputs,
		"wikidata-20260608-md5sums.txt",
		resourceSpec,
	);
	const sha1Checksum = checksumFromSidecar(
		sha1Sums,
		WIKIDATA_20260608_GZIP.fileName,
		"sha1",
	);
	const md5Checksum = checksumFromSidecar(
		md5Sums,
		WIKIDATA_20260608_GZIP.fileName,
		"md5",
	);
	const extractBasename = `wikidata-${config.languageTag}-core`;
	if (hasInputPath(inputs, `${extractBasename}-entities.tsv.gz`)) {
		const entities = requiredInput(
			inputs,
			`${extractBasename}-entities.tsv.gz`,
			resourceSpec,
		);
		const canonicalEntities = canonicalizeWikidataEntityRows(entities);
		const aliases = requiredInput(
			inputs,
			`${extractBasename}-aliases.tsv.gz`,
			resourceSpec,
		);
		const relations = requiredInput(
			inputs,
			`${extractBasename}-relations.tsv.gz`,
			resourceSpec,
		);
		const canonicalRelations = canonicalizeWikidataRelationRows(relations);
		const extractMetadata = JSON.parse(
			requiredInput(
				inputs,
				`${extractBasename}-extract-metadata.json`,
				resourceSpec,
			),
		);
		const snapshot = context.snapshotById.get(resourceSpec.snapshotIds[0]);
		expect(
			snapshot !== undefined,
			`${resourceSpec.resourceSpecId} is missing its Wikidata snapshot.`,
		);
		assertWikidataExtractLineage({
			metadata: extractMetadata,
			snapshot,
			generatedAt: context.generatedAt,
			label: `${config.languageName} Wikidata extract`,
		});
		const entityRowCount = extractMetadata.entityRowCount;
		const aliasRowCount = extractMetadata.aliasRowCount;
		const relationRowCount = extractMetadata.relationRowCount;
		const ids = {
			entities: `${config.resourcePrefix}-entities`,
			aliases: `${config.resourcePrefix}-aliases`,
			relations: `${config.resourcePrefix}-relations`,
			kb: `${config.resourcePrefix}-kb-canonical`,
		};
		const kbResource = {
			schemaVersion: "1",
			kind: "knowledge-base",
			kbId: config.kbId,
			languageTags: [config.languageTag],
			entityCount: entityRowCount,
			relationCount: relationRowCount,
			resourceRefs: [
				{
					resourceId: ids.entities,
					role: "entities",
					recordCount: entityRowCount,
				},
				{
					resourceId: ids.aliases,
					role: "aliases",
					recordCount: aliasRowCount,
				},
				{
					resourceId: ids.relations,
					role: "relations",
					recordCount: relationRowCount,
				},
			],
		};
		const summary = {
			schemaVersion: "1",
			sourceId: "source:wikidata:main",
			pipelineId: resourceSpec.pipelineId,
			pipelineVersion: resourceSpec.pipelineVersion,
			dumpArtifactVersion: WIKIDATA_DUMP_VERSION,
			extractId: extractMetadata.extractId,
			endpoint: extractMetadata.endpoint,
			extractRetrievedAt: extractMetadata.retrievedAt,
			acquisitionMethod: extractMetadata.acquisitionMethod,
			derivedFromDumpArtifact: extractMetadata.derivedFromDumpArtifact,
			entityRowCount,
			aliasRowCount,
			relationRowCount,
			recordsAccepted: entityRowCount + aliasRowCount + relationRowCount,
			recordsRejected: 0,
			sha1Checksum,
			md5Checksum,
			localResourceIds: [ids.entities, ids.aliases, ids.relations, ids.kb],
			warnings: [
				"Wikimedia publishes SHA-1 and MD5 sidecars for the full dump; the local extract files are pinned by SHA-256 in the forge snapshot.",
				"The local Wikidata extract is scoped to declared core entity classes and sitelink thresholds; it is not a full Wikidata entity dump.",
			],
		};
		const canonicalQuality = {
			schemaVersion: "1",
			kind: "quality-profile",
			profileId: `${config.resourcePrefix}-core-extract-quality`,
			languageTag: config.languageTag,
			script: config.script,
			diagnostics: [
				{
					diagnosticId: `${config.resourcePrefix}-local-core-extract`,
					task: "kb.materialization",
					severity: "info",
					message: `Wikidata ${config.languageName} core entity data is materialized as local canonical TSV resources for the declared extract scope.`,
					metadata: {
						extractId: extractMetadata.extractId,
						scope: extractMetadata.scope,
					},
				},
				{
					diagnosticId: `${config.resourcePrefix}-extract-scope`,
					task: "kb.coverage",
					severity: "info",
					message:
						"The extract scope is declared by class ids and sitelink thresholds; it does not claim complete Wikidata coverage.",
					metadata: {
						classes: extractMetadata.classes,
					},
				},
			],
			metrics: [
				{
					metricId: "entity-row-count",
					name: "entityRowCount",
					value: entityRowCount,
					unit: "rows",
				},
				{
					metricId: "alias-row-count",
					name: "aliasRowCount",
					value: aliasRowCount,
					unit: "rows",
				},
				{
					metricId: "relation-row-count",
					name: "relationRowCount",
					value: relationRowCount,
					unit: "rows",
				},
			],
			thresholds: [],
			evaluationRecordIds: [],
		};
		return [
			outputFor(resourceSpec, ids.entities, canonicalEntities),
			outputFor(resourceSpec, ids.aliases, aliases),
			outputFor(resourceSpec, ids.relations, canonicalRelations),
			outputFor(resourceSpec, ids.kb, stableJson(kbResource)),
			outputFor(resourceSpec, config.qualityResourceId, stableJson(summary)),
			outputFor(
				resourceSpec,
				config.qualityProfileResourceId,
				stableJson(canonicalQuality),
			),
		];
	}
	const kbResource = {
		schemaVersion: "1",
		kind: "knowledge-base",
		kbId: config.kbId,
		languageTags: [config.languageTag],
		resourceRefs: [
			{
				resourceId: config.artifactId,
				role: "entities",
			},
			{
				resourceId: config.artifactId,
				role: "labels",
			},
			{
				resourceId: config.artifactId,
				role: "aliases",
			},
			{
				resourceId: config.artifactId,
				role: "relations",
			},
			{
				resourceId: config.artifactId,
				role: "ontology",
			},
		],
	};
	const summary = {
		schemaVersion: "1",
		sourceId: "source:wikidata:main",
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		artifactId: config.artifactId,
		dumpArtifactVersion: WIKIDATA_DUMP_VERSION,
		sourceUrl: WIKIDATA_20260608_GZIP.sourceUrl,
		sizeBytes: WIKIDATA_20260608_GZIP.sizeBytes,
		sha1Checksum,
		md5Checksum,
		recordsAccepted: 2,
		recordsRejected: 0,
		warnings: [
			"Wikimedia publishes SHA-1 and MD5 sidecars for this dump; no upstream SHA-256 sidecar is available for the pinned artifact.",
			"The full Wikidata dump is artifact-backed; local KB lookup requires a generated language-specific extract.",
		],
	};
	const canonicalQuality = {
		schemaVersion: "1",
		kind: "quality-profile",
		profileId: config.qualityProfileId,
		languageTag: config.languageTag,
		script: config.script,
		diagnostics: [
			{
				diagnosticId: `${config.resourcePrefix}-explicit-artifact-fetch`,
				task: "kb.artifact",
				severity: "info",
				message: `Wikidata main entity data for ${config.languageName} KB consumers is exposed as an explicit artifact descriptor; local KB lookup requires a generated language-specific extract.`,
				metadata: {
					artifactId: config.artifactId,
					artifactPolicy: "fetch-explicit",
				},
			},
			{
				diagnosticId: `${config.resourcePrefix}-upstream-checksum-strength`,
				task: "kb.artifact",
				severity: "warning",
				message:
					"The upstream checksum sidecar for the pinned Wikidata artifact is SHA-1, not SHA-256.",
				metadata: {
					sha1Checksum,
					md5Checksum,
				},
			},
		],
		metrics: [
			{
				metricId: "artifact-size-bytes",
				name: "artifactSizeBytes",
				value: WIKIDATA_20260608_GZIP.sizeBytes,
				unit: "bytes",
			},
			{
				metricId: "upstream-sha1-sidecar-present",
				name: "upstreamSha1SidecarPresent",
				value: true,
				unit: "boolean",
			},
		],
		thresholds: [],
		evaluationRecordIds: [],
	};
	return [
		outputFor(resourceSpec, config.kbResourceId, stableJson(kbResource)),
		outputFor(resourceSpec, config.qualityResourceId, stableJson(summary)),
		outputFor(
			resourceSpec,
			config.qualityProfileResourceId,
			stableJson(canonicalQuality),
		),
	];
}

function tatoebaMetadata(resourceSpec, inputs, fileName) {
	const metadata = JSON.parse(requiredInput(inputs, fileName, resourceSpec));
	expect(
		Array.isArray(metadata.exports),
		`${resourceSpec.resourceSpecId} Tatoeba metadata must declare exports.`,
	);
	return metadata;
}

function requiredInputPath(inputs, basename, resourceSpec) {
	const relative = inputs.get(`${basename}:path`);
	expect(
		relative !== undefined,
		`${resourceSpec.resourceSpecId} missing ${basename} path.`,
	);
	return relative;
}

function hasInputPath(inputs, basename) {
	return inputs.has(`${basename}:path`);
}

function readBzip2Input(inputs, basename, resourceSpec) {
	const relative = requiredInputPath(inputs, basename, resourceSpec);
	const absolute = path.join(ROOT, relative);
	const child = spawnSync("bunzip2", ["-c", absolute], {
		encoding: "utf8",
		maxBuffer: 768 * 1024 * 1024,
	});
	expect(
		child.status === 0,
		`${resourceSpec.resourceSpecId} failed to decompress ${basename}.`,
		child.stderr?.toString("utf8").trim() ?? "",
	);
	return child.stdout.replace(/\r\n/gu, "\n").replace(/\r/gu, "\n");
}

function canonicalTatoebaCorpusTsv(text, artifact, config) {
	const rows = [
		[
			"sentenceId",
			"languageTag",
			"tatoebaLanguageCode",
			"text",
			"owner",
			"createdAt",
			"modifiedAt",
		],
	];
	let accepted = 0;
	let rejected = 0;
	for (const line of text.split("\n")) {
		if (line.length === 0) continue;
		const cells = line.split("\t");
		if (cells.length < 6) {
			rejected += 1;
			continue;
		}
		const [
			sentenceId,
			tatoebaLanguageCode,
			sentenceText,
			owner,
			createdAt,
			modifiedAt,
		] = cells;
		if (
			sentenceId === undefined ||
			tatoebaLanguageCode !== artifact.tatoebaLanguageCode ||
			sentenceText === undefined
		) {
			rejected += 1;
			continue;
		}
		rows.push([
			sentenceId,
			config.languageTag,
			tatoebaLanguageCode,
			sentenceText,
			owner ?? "",
			createdAt ?? "",
			modifiedAt ?? "",
		]);
		accepted += 1;
	}
	return {
		text: tsvFile(rows[0], rows.slice(1)),
		accepted,
		rejected,
	};
}

function canonicalTatoebaParallelTsv(text, artifact, config) {
	const rows = [
		[
			"sourceSentenceId",
			"targetSentenceId",
			"sourceLanguageTag",
			"targetLanguageTag",
			"sourceTatoebaLanguageCode",
			"targetTatoebaLanguageCode",
		],
	];
	let accepted = 0;
	let rejected = 0;
	for (const line of text.split("\n")) {
		if (line.length === 0) continue;
		const cells = line.split("\t");
		if (cells.length < 2) {
			rejected += 1;
			continue;
		}
		const [sourceSentenceId, targetSentenceId] = cells;
		if (sourceSentenceId === undefined || targetSentenceId === undefined) {
			rejected += 1;
			continue;
		}
		rows.push([
			sourceSentenceId,
			targetSentenceId,
			config.languageTag,
			artifact.targetLanguageTag,
			artifact.sourceTatoebaLanguageCode,
			artifact.targetTatoebaLanguageCode,
		]);
		accepted += 1;
	}
	return {
		text: tsvFile(rows[0], rows.slice(1)),
		accepted,
		rejected,
	};
}

function checksumValue(artifact) {
	return `sha256:${artifact.sha256}`;
}

function scriptForLanguageTag(languageTag) {
	if (languageTag === "ar") return "Arab";
	if (languageTag === "el" || languageTag === "grc") return "Grek";
	return "Latn";
}

function tatoebaArtifactDescriptor(artifact, sourceIds) {
	return {
		artifactId: artifact.artifactId,
		sourceIds,
		version: "2026-06-06",
		profile: "full",
		sizeBytes: artifact.sizeBytes,
		mediaType: "text/tab-separated-values",
		compression: "bzip2",
		checksum: {
			algorithm: "sha256",
			value: artifact.sha256,
		},
		licenseExpression: "CC-BY-2.0-FR",
		redistributionPolicy: "redistributable-with-attribution",
		retrieval: {
			kind: "https",
			uri: artifact.uri,
			instructions:
				"Fetch explicitly from Tatoeba weekly exports and verify the SHA-256 checksum before unpacking or indexing.",
		},
		cacheKey: `tatoeba-${artifact.fileName.replace(/[^a-z0-9]+/giu, "-").replace(/^-|-$/gu, "")}-2026-06-06`,
		expectedFiles: [
			{
				path: artifact.expectedPath,
				sizeBytes: artifact.sizeBytes,
				checksum: checksumValue(artifact),
			},
		],
	};
}

function transformTatoebaCorpusArtifact(resourceSpec, inputs, config) {
	const metadata = tatoebaMetadata(resourceSpec, inputs, config.metadataFile);
	const corpusArtifact = metadata.exports.find(
		(artifact) => artifact.role === "corpus",
	);
	expect(
		corpusArtifact !== undefined,
		`${resourceSpec.resourceSpecId} missing Tatoeba ${config.languageName} corpus artifact metadata.`,
	);
	if (!hasInputPath(inputs, corpusArtifact.fileName)) {
		const corpusResource = {
			schemaVersion: "1",
			kind: "corpus",
			corpusId: config.corpusId,
			languageTags: [config.languageTag],
			splits: ["full"],
			documents: [
				{
					documentId: config.documentId,
					languageTag: config.languageTag,
					script: config.script,
					split: "full",
					title: `Tatoeba ${config.languageName} detailed sentences weekly export 2026-06-06`,
					artifactId: corpusArtifact.artifactId,
					path: corpusArtifact.expectedPath,
					checksum: checksumValue(corpusArtifact),
					metadata: {
						sourceId: metadata.sourceId,
						tatoebaLanguageCode: corpusArtifact.tatoebaLanguageCode,
						rowCount: corpusArtifact.rowCount,
						lastModified: corpusArtifact.lastModified,
						etag: corpusArtifact.etag,
						licenseExpression: metadata.licenseExpression,
						artifactDescriptor: tatoebaArtifactDescriptor(
							corpusArtifact,
							resourceSpec.sourceIds,
						),
					},
				},
			],
		};
		const summary = {
			schemaVersion: "1",
			sourceId: metadata.sourceId,
			pipelineId: resourceSpec.pipelineId,
			pipelineVersion: resourceSpec.pipelineVersion,
			artifactId: corpusArtifact.artifactId,
			version: metadata.version,
			sourceUrl: corpusArtifact.uri,
			sizeBytes: corpusArtifact.sizeBytes,
			rowCount: corpusArtifact.rowCount,
			sha256Checksum: checksumValue(corpusArtifact),
			recordsAccepted: 1,
			recordsRejected: 0,
			warnings: [
				`The Tatoeba ${config.languageName} corpus is artifact-backed and must be fetched explicitly; it is not vendored in the npm package.`,
				"The detailed export includes contributor fields needed for attribution-aware downstream processing.",
			],
		};
		const qualityProfile = {
			schemaVersion: "1",
			kind: "quality-profile",
			profileId: `tatoeba-${config.resourcePrefix}-corpus-artifact-quality`,
			languageTag: config.languageTag,
			script: config.script,
			diagnostics: [
				{
					diagnosticId: `tatoeba-${config.resourcePrefix}-explicit-corpus-artifact-fetch`,
					task: "corpus.artifact",
					severity: "info",
					message: `Tatoeba ${config.languageName} sentence data is exposed as an explicit artifact descriptor; local corpus rows have not been materialized yet.`,
					metadata: {
						artifactId: corpusArtifact.artifactId,
						artifactPolicy: "fetch-explicit",
					},
				},
				{
					diagnosticId: `tatoeba-${config.resourcePrefix}-attribution-corpus-fields`,
					task: "corpus.license",
					severity: "info",
					message:
						"The pinned detailed sentence export preserves owner and timestamp fields for attribution-aware downstream use.",
					metadata: {
						licenseExpression: metadata.licenseExpression,
					},
				},
			],
			metrics: [
				{
					metricId: "sentence-row-count",
					name: "sentenceRowCount",
					value: corpusArtifact.rowCount,
					unit: "rows",
				},
				{
					metricId: "artifact-size-bytes",
					name: "artifactSizeBytes",
					value: corpusArtifact.sizeBytes,
					unit: "bytes",
				},
			],
			thresholds: [],
			evaluationRecordIds: [],
		};
		return [
			outputFor(
				resourceSpec,
				`${config.resourcePrefix}-tatoeba-corpus-artifact`,
				stableJson(corpusResource),
			),
			outputFor(
				resourceSpec,
				`${config.resourcePrefix}-tatoeba-corpus-quality`,
				stableJson(summary),
			),
			outputFor(
				resourceSpec,
				`${config.resourcePrefix}-tatoeba-corpus-quality-profile`,
				stableJson(qualityProfile),
			),
		];
	}
	const materialized = canonicalTatoebaCorpusTsv(
		readBzip2Input(inputs, corpusArtifact.fileName, resourceSpec),
		corpusArtifact,
		config,
	);
	expect(
		materialized.accepted === corpusArtifact.rowCount,
		`${resourceSpec.resourceSpecId} materialized ${materialized.accepted} ${config.languageName} Tatoeba corpus rows, expected ${corpusArtifact.rowCount}.`,
	);
	const rowChecksum = sha256(materialized.text);
	const sentenceResourceId = `${config.resourcePrefix}-tatoeba-corpus-sentences`;
	const sentenceOutput = resourceSpec.outputs.find(
		(output) => output.resourceId === sentenceResourceId,
	);
	expect(
		sentenceOutput !== undefined,
		`${resourceSpec.resourceSpecId} does not declare output ${sentenceResourceId}.`,
	);
	const corpusResource = {
		schemaVersion: "1",
		kind: "corpus",
		corpusId: config.corpusId,
		languageTags: [config.languageTag],
		splits: ["full"],
		documents: [
			{
				documentId: config.documentId,
				languageTag: config.languageTag,
				script: config.script,
				split: "full",
				title: `Tatoeba ${config.languageName} detailed sentences weekly export 2026-06-06`,
				artifactId: corpusArtifact.artifactId,
				path: sentenceOutput.path,
				checksum: rowChecksum,
				metadata: {
					sourceId: metadata.sourceId,
					sourceUrl: corpusArtifact.uri,
					tatoebaLanguageCode: corpusArtifact.tatoebaLanguageCode,
					rowCount: materialized.accepted,
					lastModified: corpusArtifact.lastModified,
					etag: corpusArtifact.etag,
					licenseExpression: metadata.licenseExpression,
					localResourceId: sentenceResourceId,
				},
			},
		],
	};
	const summary = {
		schemaVersion: "1",
		sourceId: metadata.sourceId,
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		artifactId: corpusArtifact.artifactId,
		version: metadata.version,
		sourceUrl: corpusArtifact.uri,
		sizeBytes: corpusArtifact.sizeBytes,
		rowCount: corpusArtifact.rowCount,
		materializedRowCount: materialized.accepted,
		localResourceId: sentenceResourceId,
		localResourceChecksum: rowChecksum,
		sha256Checksum: checksumValue(corpusArtifact),
		recordsAccepted: materialized.accepted,
		recordsRejected: materialized.rejected,
		warnings: [
			"The detailed export includes contributor fields needed for attribution-aware downstream processing.",
		],
	};
	const qualityProfile = {
		schemaVersion: "1",
		kind: "quality-profile",
		profileId: `tatoeba-${config.resourcePrefix}-corpus-materialized-quality`,
		languageTag: config.languageTag,
		script: config.script,
		diagnostics: [
			{
				diagnosticId: `tatoeba-${config.resourcePrefix}-local-corpus-rows`,
				task: "corpus.materialization",
				severity: "info",
				message: `Tatoeba ${config.languageName} sentence data is materialized as local canonical TSV rows.`,
				metadata: {
					artifactId: corpusArtifact.artifactId,
					resourceId: `${config.resourcePrefix}-tatoeba-corpus-sentences`,
					rowChecksum,
				},
			},
			{
				diagnosticId: `tatoeba-${config.resourcePrefix}-attribution-corpus-fields`,
				task: "corpus.license",
				severity: "info",
				message:
					"The pinned detailed sentence export preserves owner and timestamp fields for attribution-aware downstream use.",
				metadata: {
					licenseExpression: metadata.licenseExpression,
				},
			},
		],
		metrics: [
			{
				metricId: "sentence-row-count",
				name: "sentenceRowCount",
				value: materialized.accepted,
				unit: "rows",
			},
			{
				metricId: "rejected-row-count",
				name: "rejectedRowCount",
				value: materialized.rejected,
				unit: "rows",
			},
		],
		thresholds: [],
		evaluationRecordIds: [],
	};
	return [
		outputFor(resourceSpec, sentenceResourceId, materialized.text),
		outputFor(
			resourceSpec,
			`${config.resourcePrefix}-tatoeba-corpus-canonical`,
			stableJson(corpusResource),
		),
		outputFor(
			resourceSpec,
			`${config.resourcePrefix}-tatoeba-corpus-quality`,
			stableJson(summary),
		),
		outputFor(
			resourceSpec,
			`${config.resourcePrefix}-tatoeba-corpus-quality-profile`,
			stableJson(qualityProfile),
		),
	];
}

function transformTatoebaEnglishCorpusArtifact(resourceSpec, inputs) {
	return transformTatoebaCorpusArtifact(resourceSpec, inputs, {
		metadataFile: "tatoeba-en-artifacts.json",
		languageName: "English",
		languageTag: "en",
		script: "Latn",
		resourcePrefix: "en",
		corpusId: "tatoeba-en-2026-06-06",
		documentId: "tatoeba-eng-sentences-detailed-2026-06-06",
	});
}

function transformTatoebaArabicCorpusArtifact(resourceSpec, inputs) {
	return transformTatoebaCorpusArtifact(resourceSpec, inputs, {
		metadataFile: "tatoeba-ar-artifacts.json",
		languageName: "Arabic",
		languageTag: "ar",
		script: "Arab",
		resourcePrefix: "ar",
		corpusId: "tatoeba-ar-2026-06-06",
		documentId: "tatoeba-ara-sentences-detailed-2026-06-06",
	});
}

function transformTatoebaFrenchCorpusArtifact(resourceSpec, inputs) {
	return transformTatoebaCorpusArtifact(resourceSpec, inputs, {
		metadataFile: "tatoeba-fr-artifacts.json",
		languageName: "French",
		languageTag: "fr",
		script: "Latn",
		resourcePrefix: "fr",
		corpusId: "tatoeba-fr-2026-06-06",
		documentId: "tatoeba-fra-sentences-detailed-2026-06-06",
	});
}

function parallelResourceIdForTatoebaTarget(sourcePrefix, targetCode) {
	return `${sourcePrefix}-tatoeba-parallel-${targetCode}`;
}

function transformTatoebaParallelArtifact(resourceSpec, inputs, config) {
	const metadata = tatoebaMetadata(resourceSpec, inputs, config.metadataFile);
	const linkArtifacts = metadata.exports
		.filter((artifact) => artifact.role === "parallel-links")
		.sort((left, right) =>
			left.targetTatoebaLanguageCode.localeCompare(
				right.targetTatoebaLanguageCode,
			),
		);
	expect(
		linkArtifacts.length > 0,
		`${resourceSpec.resourceSpecId} missing Tatoeba ${config.languageName} parallel link metadata.`,
	);
	const allLinksMaterialized = linkArtifacts.every((artifact) =>
		hasInputPath(inputs, artifact.fileName),
	);
	const outputs = linkArtifacts.map((artifact) => {
		if (!hasInputPath(inputs, artifact.fileName)) {
			const descriptor = tatoebaArtifactDescriptor(
				artifact,
				resourceSpec.sourceIds,
			);
			const resource = {
				schemaVersion: "1",
				kind: "alignment-table",
				parallelId: `tatoeba-${config.resourcePrefix}-${artifact.targetLanguageTag}-2026-06-06`,
				languagePair: {
					sourceLanguage: config.languageTag,
					targetLanguage: artifact.targetLanguageTag,
					sourceScript: config.script,
					targetScript: scriptForLanguageTag(artifact.targetLanguageTag),
				},
				units: [
					{
						unitId: `${artifact.sourceTatoebaLanguageCode}-${artifact.targetTatoebaLanguageCode}-links-2026-06-06`,
						metadata: {
							sourceId: metadata.sourceId,
							artifactId: artifact.artifactId,
							path: artifact.expectedPath,
							checksum: checksumValue(artifact),
							rowCount: artifact.rowCount,
							lastModified: artifact.lastModified,
							etag: artifact.etag,
							licenseExpression: metadata.licenseExpression,
							artifactDescriptor: descriptor,
						},
					},
				],
			};
			return outputFor(
				resourceSpec,
				parallelResourceIdForTatoebaTarget(
					config.resourcePrefix,
					artifact.targetTatoebaLanguageCode,
				),
				stableJson(resource),
			);
		}
		const materialized = canonicalTatoebaParallelTsv(
			readBzip2Input(inputs, artifact.fileName, resourceSpec),
			artifact,
			config,
		);
		expect(
			materialized.accepted === artifact.rowCount,
			`${resourceSpec.resourceSpecId} materialized ${materialized.accepted} ${config.languageName}-${artifact.targetLanguageTag} Tatoeba parallel rows, expected ${artifact.rowCount}.`,
		);
		return outputFor(
			resourceSpec,
			parallelResourceIdForTatoebaTarget(
				config.resourcePrefix,
				artifact.targetTatoebaLanguageCode,
			),
			materialized.text,
		);
	});
	const totalRowCount = linkArtifacts.reduce(
		(total, artifact) => total + artifact.rowCount,
		0,
	);
	const totalArtifactBytes = linkArtifacts.reduce(
		(total, artifact) => total + artifact.sizeBytes,
		0,
	);
	const summary = {
		schemaVersion: "1",
		sourceId: metadata.sourceId,
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		version: metadata.version,
		languagePairCount: linkArtifacts.length,
		totalLinkRowCount: totalRowCount,
		totalArtifactBytes,
		artifactIds: linkArtifacts.map((artifact) => artifact.artifactId),
		languagePairs: linkArtifacts.map((artifact) => ({
			sourceLanguageTag: artifact.sourceLanguageTag,
			targetLanguageTag: artifact.targetLanguageTag,
			sourceTatoebaLanguageCode: artifact.sourceTatoebaLanguageCode,
			targetTatoebaLanguageCode: artifact.targetTatoebaLanguageCode,
			rowCount: artifact.rowCount,
			sizeBytes: artifact.sizeBytes,
			sha256Checksum: checksumValue(artifact),
			...(allLinksMaterialized
				? {
						localResourceId: parallelResourceIdForTatoebaTarget(
							config.resourcePrefix,
							artifact.targetTatoebaLanguageCode,
						),
					}
				: {}),
		})),
		recordsAccepted: allLinksMaterialized
			? totalRowCount
			: linkArtifacts.length,
		recordsRejected: 0,
		warnings: allLinksMaterialized
			? [
					"Link artifacts provide sentence-id alignment tables; sentence text must be resolved from compatible Tatoeba sentence exports.",
				]
			: [
					`Tatoeba ${config.languageName} parallel links are artifact-backed and must be fetched explicitly; they are not vendored in the npm package.`,
					"Link artifacts provide sentence-id alignment tables; sentence text must be resolved from compatible Tatoeba sentence exports.",
				],
	};
	const qualityProfile = {
		schemaVersion: "1",
		kind: "quality-profile",
		profileId: allLinksMaterialized
			? `tatoeba-${config.resourcePrefix}-parallel-materialized-quality`
			: `tatoeba-${config.resourcePrefix}-parallel-artifact-quality`,
		languageTag: config.languageTag,
		script: config.script,
		diagnostics: [
			{
				diagnosticId: allLinksMaterialized
					? `tatoeba-${config.resourcePrefix}-local-parallel-rows`
					: `tatoeba-${config.resourcePrefix}-explicit-parallel-artifact-fetch`,
				task: allLinksMaterialized
					? "parallel.materialization"
					: "parallel.artifact",
				severity: "info",
				message: allLinksMaterialized
					? `Tatoeba ${config.languageName} parallel alignments are materialized as local canonical TSV rows.`
					: `Tatoeba ${config.languageName} parallel alignments are exposed as explicit artifact descriptors; local alignment rows have not been materialized yet.`,
				metadata: {
					artifactIds: linkArtifacts.map((artifact) => artifact.artifactId),
					...(allLinksMaterialized
						? {
								resourceIds: linkArtifacts.map((artifact) =>
									parallelResourceIdForTatoebaTarget(
										config.resourcePrefix,
										artifact.targetTatoebaLanguageCode,
									),
								),
							}
						: { artifactPolicy: "fetch-explicit" }),
				},
			},
		],
		metrics: [
			{
				metricId: "language-pair-count",
				name: "languagePairCount",
				value: linkArtifacts.length,
				unit: "pairs",
			},
			{
				metricId: "parallel-link-row-count",
				name: "parallelLinkRowCount",
				value: totalRowCount,
				unit: "rows",
			},
			{
				metricId: "artifact-size-bytes",
				name: "artifactSizeBytes",
				value: totalArtifactBytes,
				unit: "bytes",
			},
		],
		thresholds: [],
		evaluationRecordIds: [],
	};
	return [
		...outputs,
		outputFor(
			resourceSpec,
			`${config.resourcePrefix}-tatoeba-parallel-quality`,
			stableJson(summary),
		),
		outputFor(
			resourceSpec,
			`${config.resourcePrefix}-tatoeba-parallel-quality-profile`,
			stableJson(qualityProfile),
		),
	];
}

function transformTatoebaEnglishParallelArtifact(resourceSpec, inputs) {
	return transformTatoebaParallelArtifact(resourceSpec, inputs, {
		metadataFile: "tatoeba-en-artifacts.json",
		languageName: "English",
		languageTag: "en",
		script: "Latn",
		resourcePrefix: "en",
	});
}

function transformTatoebaArabicParallelArtifact(resourceSpec, inputs) {
	return transformTatoebaParallelArtifact(resourceSpec, inputs, {
		metadataFile: "tatoeba-ar-artifacts.json",
		languageName: "Arabic",
		languageTag: "ar",
		script: "Arab",
		resourcePrefix: "ar",
	});
}

function transformTatoebaFrenchParallelArtifact(resourceSpec, inputs) {
	return transformTatoebaParallelArtifact(resourceSpec, inputs, {
		metadataFile: "tatoeba-fr-artifacts.json",
		languageName: "French",
		languageTag: "fr",
		script: "Latn",
		resourcePrefix: "fr",
	});
}

const esdbDefaultProfiles = [
	{
		profileId: "en_AU",
		languageTag: "en-AU",
		region: "AU",
		spelling: "Australian",
		sourceFile: "en_AU.txt",
	},
	{
		profileId: "en_CA",
		languageTag: "en-CA",
		region: "CA",
		spelling: "Canadian",
		sourceFile: "en_CA.txt",
	},
	{
		profileId: "en_GB_ise",
		languageTag: "en-GB",
		region: "GB",
		spelling: "British -ise",
		sourceFile: "en_GB-ise.txt",
	},
	{
		profileId: "en_GB_ize",
		languageTag: "en-GB",
		region: "GB",
		spelling: "British -ize",
		sourceFile: "en_GB-ize.txt",
	},
	{
		profileId: "en_US",
		languageTag: "en-US",
		region: "US",
		spelling: "American",
		sourceFile: "en_US.txt",
	},
];

function parseWordlist(text) {
	const words = [];
	const seen = new Set();
	let rejected = 0;
	let duplicateCount = 0;
	for (const line of text.split(/\r?\n/u)) {
		const word = line.trim();
		if (word.length === 0) continue;
		if (word.includes("\t")) {
			rejected += 1;
			continue;
		}
		if (seen.has(word)) {
			duplicateCount += 1;
			continue;
		}
		seen.add(word);
		words.push(word);
	}
	words.sort((left, right) => left.localeCompare(right));
	return { words, rejected, duplicateCount };
}

function transformEsdbWordlistDiff(resourceSpec, inputs) {
	const profileRows = [];
	const wordRows = [];
	const profileWordSets = [];
	const wordCountsByProfile = {};
	let recordsRejected = 0;
	let duplicateWithinProfileCount = 0;
	const uniqueWords = new Set();

	for (const profile of esdbDefaultProfiles) {
		const text = requiredInput(inputs, profile.sourceFile, resourceSpec);
		const parsed = parseWordlist(text);
		recordsRejected += parsed.rejected;
		duplicateWithinProfileCount += parsed.duplicateCount;
		const wordSet = new Set(parsed.words);
		profileWordSets.push(wordSet);
		wordCountsByProfile[profile.profileId] = parsed.words.length;
		profileRows.push([
			profile.profileId,
			profile.languageTag,
			profile.region,
			profile.spelling,
			profile.sourceFile,
			parsed.words.length,
		]);
		for (const word of parsed.words) {
			uniqueWords.add(word);
			wordRows.push([
				profile.profileId,
				profile.languageTag,
				profile.region,
				profile.spelling,
				word,
			]);
		}
	}

	wordRows.sort((left, right) => {
		const profileDelta = left[0].localeCompare(right[0]);
		if (profileDelta !== 0) return profileDelta;
		return left[4].localeCompare(right[4]);
	});
	profileRows.sort((left, right) => left[0].localeCompare(right[0]));

	let sharedWordCount = 0;
	for (const word of uniqueWords) {
		if (profileWordSets.every((wordSet) => wordSet.has(word))) {
			sharedWordCount += 1;
		}
	}

	const summary = {
		schemaVersion: "1",
		sourceId: "source:esdb:wordlist-diff-en-default-2026-02-25",
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		release: "rel-2026.02.25",
		profileCount: esdbDefaultProfiles.length,
		totalWordRows: wordRows.length,
		uniqueWordCount: uniqueWords.size,
		sharedWordCount,
		wordCountsByProfile: sortJson(wordCountsByProfile),
		duplicateWithinProfileCount,
		recordsAccepted: wordRows.length,
		recordsRejected,
		warnings: [
			"Generated wordlist outputs are spell-checker dictionaries, not a complete English lexical database.",
			"The built-in search analyzer performs Unicode word tokenization and casefolding; wordlist membership and suggestion filtering require explicit consumer logic.",
			"ESDB database internals are intentionally not used because the upstream schema is still unstable.",
		],
	};
	const canonicalLexicon = {
		schemaVersion: "1",
		kind: "lexicon",
		lexiconId: "en-esdb-default-wordlists",
		languageTag: "en",
		script: "Latn",
		entryCount: uniqueWords.size,
		resourceRefs: [
			{
				resourceId: "en-esdb-default-wordlists",
				role: "forms",
				recordCount: wordRows.length,
			},
		],
	};
	const canonicalSearchProfile = {
		schemaVersion: "1",
		kind: "search-profile",
		analyzerId: "en-esdb-default-wordlist-analyzer",
		languageTag: "en",
		script: "Latn",
		tokenizer: {
			componentId: "unicode-word",
			type: "unicode-word-boundary",
			mode: "default",
		},
		tokenFilters: [
			{
				componentId: "unicode-simple-casefold",
				type: "casefold",
				mode: "unicode-simple",
			},
		],
		fields: [
			{
				fieldName: "text",
				analyzerRole: "index",
			},
			{
				fieldName: "text",
				analyzerRole: "query",
			},
			{
				fieldName: "text",
				analyzerRole: "suggest",
			},
		],
	};
	const canonicalQuality = {
		schemaVersion: "1",
		kind: "quality-profile",
		profileId: "en-esdb-default-wordlist-quality",
		languageTag: "en",
		script: "Latn",
		diagnostics: [
			{
				diagnosticId: "en-esdb-source-scope",
				task: "lexicon.transform",
				severity: "info",
				message:
					"ESDB generated default wordlists provide spelling forms by regional profile, not full lexical semantics or inflection metadata.",
				metadata: {
					release: summary.release,
				},
			},
		],
		metrics: [
			{
				metricId: "profile-count",
				name: "profileCount",
				value: summary.profileCount,
				unit: "profiles",
			},
			{
				metricId: "total-word-rows",
				name: "totalWordRows",
				value: summary.totalWordRows,
				unit: "rows",
			},
			{
				metricId: "unique-word-count",
				name: "uniqueWordCount",
				value: summary.uniqueWordCount,
				unit: "words",
			},
			{
				metricId: "records-rejected",
				name: "recordsRejected",
				value: summary.recordsRejected,
				unit: "records",
			},
		],
		thresholds: [],
		evaluationRecordIds: [],
	};

	return [
		outputFor(
			resourceSpec,
			"en-esdb-default-wordlists",
			tsvFile(
				["profileId", "languageTag", "region", "spelling", "word"],
				wordRows,
			),
		),
		outputFor(
			resourceSpec,
			"en-esdb-default-profiles",
			tsvFile(
				[
					"profileId",
					"languageTag",
					"region",
					"spelling",
					"sourceFile",
					"wordCount",
				],
				profileRows,
			),
		),
		outputFor(
			resourceSpec,
			"en-esdb-wordlist-lexicon-canonical",
			stableJson(canonicalLexicon),
		),
		outputFor(
			resourceSpec,
			"en-esdb-wordlist-search-profile",
			stableJson(canonicalSearchProfile),
		),
		outputFor(resourceSpec, "en-esdb-wordlist-quality", stableJson(summary)),
		outputFor(
			resourceSpec,
			"en-esdb-wordlist-quality-profile",
			stableJson(canonicalQuality),
		),
	];
}

function splitScowlLine(line) {
	const firstSeparator = line.indexOf(": ");
	if (firstSeparator === -1) return undefined;
	const scowlInfo = line.slice(0, firstSeparator).trim();
	let rest = line.slice(firstSeparator + 2).trim();
	const secondSeparator = rest.indexOf(": ");
	if (secondSeparator !== -1) {
		const candidate = rest.slice(0, secondSeparator).trim();
		if (!candidate.includes("<")) {
			rest = rest.slice(secondSeparator + 2).trim();
		}
	}
	const formSeparator = rest.indexOf(": ");
	if (formSeparator === -1) {
		return { scowlInfo, lemmaInfo: rest, formsText: "" };
	}
	return {
		scowlInfo,
		lemmaInfo: rest.slice(0, formSeparator).trim(),
		formsText: rest.slice(formSeparator + 2).trim(),
	};
}

function parseScowlInfo(scowlInfo) {
	const sizeMatch = scowlInfo.match(/^([0-9]+)/u);
	return {
		size: sizeMatch === null ? "" : sizeMatch[1],
		tags: [...scowlInfo.matchAll(/\[([^\]]+)\]/gu)]
			.map((match) => match[1])
			.sort((left, right) => left.localeCompare(right))
			.join(" "),
	};
}

function parseScowlLemmaInfo(lemmaInfo, fallbackLemma) {
	const match = lemmaInfo.match(
		/^(.*?)\s*<([^>]*)>(?:\s*\{([^}]*)\})?(?:\s*\(([^)]*)\))?\s*$/u,
	);
	const rawLemma = (match?.[1] ?? lemmaInfo)
		.replace(/†/gu, "")
		.replace(/^!/u, "")
		.trim();
	const lemma =
		rawLemma === "-" && fallbackLemma.length > 0 ? fallbackLemma : rawLemma;
	const posSpec = match?.[2]?.trim() ?? "";
	const slashIndex = posSpec.indexOf("/");
	const partOfSpeech =
		(slashIndex === -1 ? posSpec : posSpec.slice(0, slashIndex)).trim() ||
		"unclassified";
	const posClass =
		slashIndex === -1 ? "" : posSpec.slice(slashIndex + 1).trim();
	return {
		lemma,
		partOfSpeech,
		posClass,
	};
}

function cleanScowlFormAlternative(value) {
	let form = value
		.trim()
		.replace(/^\(/u, "")
		.replace(/\)$/u, "")
		.replace(/†/gu, "")
		.trim();
	const variantSeparator = form.indexOf(": ");
	if (variantSeparator !== -1) {
		form = form.slice(variantSeparator + 2).trim();
	}
	form = form.replace(/-$/u, "").trim();
	if (form.length === 0 || form === "-") return undefined;
	return form;
}

function parseScowlDerivedForms(formsText) {
	const forms = [];
	for (const token of formsText.split(",")) {
		for (const alternative of token.split(/\s+\|\s+/u)) {
			const form = cleanScowlFormAlternative(alternative);
			if (form !== undefined) forms.push(form);
		}
	}
	return sorted(new Set(forms));
}

function transformScowlV2Inflection(resourceSpec, inputs) {
	const text = requiredInput(inputs, "scowl.txt", resourceSpec);
	const entryRows = [];
	const posCounts = new Map();
	const lemmaSet = new Set();
	const formSet = new Set();
	let groupIndex = 0;
	let inGroup = false;
	let groupLemma = "";
	let sourceLineNumber = 0;
	let parsedLineCount = 0;
	let derivedFormCount = 0;
	let recordsRejected = 0;

	function addEntry({
		scowlInfo,
		size,
		tags,
		lemma,
		form,
		formRole,
		partOfSpeech,
		posClass,
		rawDerivedForm,
	}) {
		const entryId = `scowl-v2-${String(entryRows.length + 1).padStart(7, "0")}`;
		entryRows.push([
			entryId,
			groupIndex,
			sourceLineNumber,
			size,
			tags,
			scowlInfo,
			lemma,
			form,
			formRole,
			partOfSpeech,
			posClass,
			rawDerivedForm,
		]);
		incrementCount(posCounts, `${partOfSpeech}\t${posClass}\t${formRole}`);
		lemmaSet.add(lemma);
		formSet.add(form);
	}

	for (const line of text.split(/\r?\n/u)) {
		sourceLineNumber += 1;
		const trimmed = line.trim();
		if (trimmed.length === 0) {
			if (inGroup) groupIndex += 1;
			inGroup = false;
			groupLemma = "";
			continue;
		}
		if (trimmed.startsWith("#")) continue;
		const record = splitScowlLine(trimmed);
		if (record === undefined) {
			recordsRejected += 1;
			continue;
		}
		const { size, tags } = parseScowlInfo(record.scowlInfo);
		const parsedLemma = parseScowlLemmaInfo(record.lemmaInfo, groupLemma);
		if (parsedLemma.lemma.length === 0 || size.length === 0) {
			recordsRejected += 1;
			continue;
		}
		inGroup = true;
		parsedLineCount += 1;
		if (!record.lemmaInfo.trim().startsWith("-"))
			groupLemma = parsedLemma.lemma;
		addEntry({
			scowlInfo: record.scowlInfo,
			size,
			tags,
			lemma: parsedLemma.lemma,
			form: parsedLemma.lemma,
			formRole: "lemma",
			partOfSpeech: parsedLemma.partOfSpeech,
			posClass: parsedLemma.posClass,
			rawDerivedForm: "",
		});
		for (const derivedForm of parseScowlDerivedForms(record.formsText)) {
			derivedFormCount += 1;
			addEntry({
				scowlInfo: record.scowlInfo,
				size,
				tags,
				lemma: parsedLemma.lemma,
				form: derivedForm,
				formRole: "derived",
				partOfSpeech: parsedLemma.partOfSpeech,
				posClass: parsedLemma.posClass,
				rawDerivedForm: derivedForm,
			});
		}
	}

	entryRows.sort((left, right) => {
		const lemmaDelta = left[6].localeCompare(right[6]);
		if (lemmaDelta !== 0) return lemmaDelta;
		const formDelta = left[7].localeCompare(right[7]);
		if (formDelta !== 0) return formDelta;
		return String(left[0]).localeCompare(String(right[0]));
	});
	const posRows = sortedCountRows(posCounts).map(([key, count]) => [
		...key.split("\t"),
		count,
	]);
	const partOfSpeechValues = uniqueSorted(
		posRows.map(([partOfSpeech]) => partOfSpeech),
	);
	const posClassValues = uniqueSorted(
		posRows.map(([, posClass]) => posClass).filter((value) => value.length > 0),
	);
	const quality = {
		schemaVersion: "1",
		sourceId: "source:scowl:v2-rel-2026-02-25",
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		release: "rel-2026.02.25",
		parsedLineCount,
		groupCount: groupIndex + (inGroup ? 1 : 0),
		lemmaRecordCount: parsedLineCount,
		uniqueLemmaCount: lemmaSet.size,
		uniqueFormCount: formSet.size,
		derivedFormCount,
		inflectionRowCount: entryRows.length,
		analysisCandidateRowCount: entryRows.length,
		generationCandidateRowCount: entryRows.length,
		lookupKeyColumns: ["form", "lemma"],
		posInventoryCount: posRows.length,
		recordsAccepted: entryRows.length,
		recordsRejected,
		warnings: [
			"SCOWLv2 scowl.txt is a pinned release text export; this package does not claim stable upstream database-schema coverage.",
			"The single inflection table supports indexed form analysis and lemma generation lookups; it does not claim finite-state or context-disambiguating morphology.",
		],
	};
	const canonicalLexicon = {
		schemaVersion: "1",
		kind: "lexicon",
		lexiconId: "en-scowl-v2-inflection-lexicon",
		languageTag: "en",
		script: "Latn",
		entryCount: formSet.size,
		resourceRefs: [
			{
				resourceId: "en-scowl-inflection-entries",
				role: "forms",
				recordCount: entryRows.length,
			},
		],
	};
	const canonicalMorphology = {
		schemaVersion: "1",
		kind: "morphology",
		morphologyId: "en-scowl-v2-inflection",
		languageTag: "en",
		script: "Latn",
		resourceRefs: [
			{
				resourceId: "en-scowl-inflection-entries",
				role: "paradigm-table",
				recordCount: entryRows.length,
			},
			{
				resourceId: "en-scowl-pos-inventory",
				role: "feature-inventory",
				recordCount: posRows.length,
			},
		],
		analyzers: [
			{
				analyzerId: "en-scowl-v2-paradigm-table",
				type: "paradigm-table",
				resourceIds: ["en-scowl-inflection-entries", "en-scowl-pos-inventory"],
				coverage: {
					entryCount: entryRows.length,
					analysisCandidateRowCount: entryRows.length,
					generationCandidateRowCount: entryRows.length,
					uniqueLemmaCount: lemmaSet.size,
					uniqueFormCount: formSet.size,
					derivedFormCount,
				},
			},
		],
		featureInventory: [
			{
				feature: "partOfSpeech",
				values: partOfSpeechValues,
				count: partOfSpeechValues.length,
			},
			{
				feature: "posClass",
				values: posClassValues,
				count: posClassValues.length,
			},
		],
	};
	const canonicalQuality = {
		schemaVersion: "1",
		kind: "quality-profile",
		profileId: "en-scowl-v2-inflection-quality",
		languageTag: "en",
		script: "Latn",
		diagnostics: [
			{
				diagnosticId: "en-scowl-v2-source-scope",
				task: "morphology.transform",
				severity: "info",
				message:
					"SCOWLv2 provides one pinned inflection table indexed by both form and lemma for targeted analysis and generation.",
				metadata: {
					release: quality.release,
				},
			},
		],
		metrics: [
			{
				metricId: "unique-lemma-count",
				name: "uniqueLemmaCount",
				value: quality.uniqueLemmaCount,
				unit: "lemmas",
			},
			{
				metricId: "unique-form-count",
				name: "uniqueFormCount",
				value: quality.uniqueFormCount,
				unit: "forms",
			},
			{
				metricId: "derived-form-count",
				name: "derivedFormCount",
				value: quality.derivedFormCount,
				unit: "forms",
			},
			{
				metricId: "records-rejected",
				name: "recordsRejected",
				value: quality.recordsRejected,
				unit: "records",
			},
		],
		thresholds: [],
		evaluationRecordIds: [],
	};

	return [
		outputFor(
			resourceSpec,
			"en-scowl-inflection-entries",
			tsvFile(
				[
					"entryId",
					"groupIndex",
					"sourceLineNumber",
					"scowlSize",
					"tags",
					"scowlInfo",
					"lemma",
					"form",
					"formRole",
					"partOfSpeech",
					"posClass",
					"rawDerivedForm",
				],
				entryRows,
			),
		),
		outputFor(
			resourceSpec,
			"en-scowl-pos-inventory",
			tsvFile(["partOfSpeech", "posClass", "formRole", "count"], posRows),
		),
		outputFor(
			resourceSpec,
			"en-scowl-inflection-lexicon-canonical",
			stableJson(canonicalLexicon),
		),
		outputFor(
			resourceSpec,
			"en-scowl-inflection-morphology-canonical",
			stableJson(canonicalMorphology),
		),
		outputFor(resourceSpec, "en-scowl-inflection-quality", stableJson(quality)),
		outputFor(
			resourceSpec,
			"en-scowl-inflection-quality-profile",
			stableJson(canonicalQuality),
		),
	];
}

function transformFrenchUnimorph(resourceSpec, inputs) {
	const text = requiredInput(inputs, "fra", resourceSpec);
	const entryRows = [];
	const featureCounts = new Map();
	const posCounts = new Map();
	const lemmaSet = new Set();
	const formSet = new Set();
	let sourceLineNumber = 0;
	let recordsRejected = 0;

	for (const line of text.split(/\r?\n/u)) {
		sourceLineNumber += 1;
		const trimmed = line.trim();
		if (trimmed.length === 0 || trimmed.startsWith("#")) continue;
		const columns = trimmed.split("\t");
		if (columns.length < 3) {
			recordsRejected += 1;
			continue;
		}
		const [lemma = "", form = "", featureBundle = ""] = columns.map((value) =>
			value.trim(),
		);
		if (lemma.length === 0 || form.length === 0 || featureBundle.length === 0) {
			recordsRejected += 1;
			continue;
		}
		const features = featureBundle
			.split(";")
			.map((feature) => feature.trim())
			.filter((feature) => feature.length > 0);
		const partOfSpeech = features[0] ?? "unclassified";
		const entryId = `unimorph-fra-${String(entryRows.length + 1).padStart(7, "0")}`;
		entryRows.push([
			entryId,
			sourceLineNumber,
			lemma,
			form,
			partOfSpeech,
			featureBundle,
			features.length,
		]);
		lemmaSet.add(lemma);
		formSet.add(form);
		incrementCount(posCounts, partOfSpeech);
		for (const feature of features) incrementCount(featureCounts, feature);
	}

	entryRows.sort((left, right) => {
		const lemmaDelta = left[2].localeCompare(right[2]);
		if (lemmaDelta !== 0) return lemmaDelta;
		const formDelta = left[3].localeCompare(right[3]);
		if (formDelta !== 0) return formDelta;
		const featureDelta = left[5].localeCompare(right[5]);
		return featureDelta !== 0 ? featureDelta : left[0].localeCompare(right[0]);
	});
	const featureRows = sortedCountRows(featureCounts);
	const posRows = sortedCountRows(posCounts);
	const quality = {
		schemaVersion: "1",
		sourceId: "source:unimorph:french-master-f672f8c",
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		commit: "f672f8cceb2d5f5a1e2241b5622c8845f8274635",
		entryCount: entryRows.length,
		analysisCandidateRowCount: entryRows.length,
		generationCandidateRowCount: entryRows.length,
		lookupKeyColumns: ["form", "lemma"],
		uniqueLemmaCount: lemmaSet.size,
		uniqueFormCount: formSet.size,
		featureValueCount: featureRows.length,
		partOfSpeechCount: posRows.length,
		recordsAccepted: entryRows.length,
		recordsRejected,
		warnings: [
			"UniMorph French is CC-BY-SA-3.0 and this generated package is share-alike isolated.",
			"UniMorph feature bundles are emitted as source feature tags; this package does not claim context-disambiguating morphology.",
		],
	};
	const canonicalMorphology = {
		schemaVersion: "1",
		kind: "morphology",
		morphologyId: "fr-unimorph-f672f8c",
		languageTag: "fr",
		script: "Latn",
		resourceRefs: [
			{
				resourceId: "fr-unimorph-paradigms",
				role: "paradigm-table",
				recordCount: entryRows.length,
			},
			{
				resourceId: "fr-unimorph-feature-inventory",
				role: "feature-inventory",
				recordCount: featureRows.length,
			},
		],
		analyzers: [
			{
				analyzerId: "fr-unimorph-f672f8c-paradigm-table",
				type: "paradigm-table",
				resourceIds: ["fr-unimorph-paradigms", "fr-unimorph-feature-inventory"],
				coverage: {
					entryCount: entryRows.length,
					analysisCandidateRowCount: entryRows.length,
					generationCandidateRowCount: entryRows.length,
					uniqueLemmaCount: lemmaSet.size,
					uniqueFormCount: formSet.size,
					featureValueCount: featureRows.length,
				},
			},
		],
		featureInventory: [
			{
				feature: "unimorphFeature",
				values: featureRows.map(([feature]) => feature),
				count: featureRows.length,
			},
			{
				feature: "partOfSpeech",
				values: posRows.map(([partOfSpeech]) => partOfSpeech),
				count: posRows.length,
			},
		],
	};
	const canonicalQuality = {
		schemaVersion: "1",
		kind: "quality-profile",
		profileId: "fr-unimorph-f672f8c-quality",
		languageTag: "fr",
		script: "Latn",
		diagnostics: [
			{
				diagnosticId: "fr-unimorph-share-alike-isolation",
				task: "license.boundary",
				severity: "info",
				message:
					"UniMorph French resources are generated only in an explicit share-alike isolated package.",
				metadata: {
					sourceId: quality.sourceId,
					license: "CC-BY-SA-3.0",
				},
			},
		],
		metrics: [
			{
				metricId: "entry-count",
				name: "entryCount",
				value: quality.entryCount,
				unit: "entries",
			},
			{
				metricId: "unique-lemma-count",
				name: "uniqueLemmaCount",
				value: quality.uniqueLemmaCount,
				unit: "lemmas",
			},
			{
				metricId: "unique-form-count",
				name: "uniqueFormCount",
				value: quality.uniqueFormCount,
				unit: "forms",
			},
			{
				metricId: "feature-value-count",
				name: "featureValueCount",
				value: quality.featureValueCount,
				unit: "features",
			},
			{
				metricId: "records-rejected",
				name: "recordsRejected",
				value: quality.recordsRejected,
				unit: "records",
			},
		],
		thresholds: [],
		evaluationRecordIds: [],
	};

	return [
		outputFor(
			resourceSpec,
			"fr-unimorph-paradigms",
			tsvFile(
				[
					"entryId",
					"sourceLineNumber",
					"lemma",
					"form",
					"partOfSpeech",
					"featureBundle",
					"featureCount",
				],
				entryRows,
			),
		),
		outputFor(
			resourceSpec,
			"fr-unimorph-feature-inventory",
			tsvFile(["feature", "count"], featureRows),
		),
		outputFor(
			resourceSpec,
			"fr-unimorph-pos-inventory",
			tsvFile(["partOfSpeech", "count"], posRows),
		),
		outputFor(
			resourceSpec,
			"fr-unimorph-morphology-canonical",
			stableJson(canonicalMorphology),
		),
		outputFor(resourceSpec, "fr-unimorph-quality", stableJson(quality)),
		outputFor(
			resourceSpec,
			"fr-unimorph-quality-profile",
			stableJson(canonicalQuality),
		),
	];
}

function lexiqueNumber(value) {
	if (value === undefined || value.trim().length === 0) return "";
	const parsed = Number.parseFloat(value.replace(",", "."));
	return Number.isFinite(parsed) ? parsed : "";
}

function lexiqueCell(cells, columnIndex, columnName) {
	const index = columnIndex.get(columnName);
	return index === undefined ? "" : (cells[index] ?? "").trim();
}

function transformFrenchLexique383(resourceSpec, inputs) {
	const text = requiredInput(inputs, "Lexique383.tsv", resourceSpec).replace(
		/^\uFEFF/u,
		"",
	);
	const lines = text.split(/\r?\n/u).filter((line) => line.trim().length > 0);
	expect(
		lines.length > 1,
		`${resourceSpec.resourceSpecId} has no Lexique rows.`,
	);
	const header = lines[0].split("\t");
	const columnIndex = new Map(header.map((column, index) => [column, index]));
	for (const requiredColumn of ["ortho", "lemme", "cgram", "genre", "nombre"]) {
		expect(
			columnIndex.has(requiredColumn),
			`${resourceSpec.resourceSpecId} missing Lexique column ${requiredColumn}.`,
		);
	}

	const entryRows = [];
	const lemmaForms = new Map();
	const posCounts = new Map();
	const genderCounts = new Map();
	const numberCounts = new Map();
	const uniqueForms = new Set();
	const uniqueLemmas = new Set();
	let recordsRejected = 0;
	let inflectedVerbRowCount = 0;

	for (const line of lines.slice(1)) {
		const cells = line.split("\t");
		const form = lexiqueCell(cells, columnIndex, "ortho");
		const lemma = lexiqueCell(cells, columnIndex, "lemme") || form;
		const partOfSpeech = lexiqueCell(cells, columnIndex, "cgram") || "unknown";
		if (form.length === 0 || lemma.length === 0) {
			recordsRejected += 1;
			continue;
		}
		const gender = lexiqueCell(cells, columnIndex, "genre");
		const number = lexiqueCell(cells, columnIndex, "nombre");
		const inflectionInfo = lexiqueCell(cells, columnIndex, "infover");
		const entryId = `lexique-383-${String(entryRows.length + 1).padStart(6, "0")}`;
		entryRows.push([
			entryId,
			form,
			lemma,
			partOfSpeech,
			gender,
			number,
			lexiqueCell(cells, columnIndex, "phon"),
			lexiqueNumber(lexiqueCell(cells, columnIndex, "freqfilms2")),
			lexiqueNumber(lexiqueCell(cells, columnIndex, "freqlivres")),
			lexiqueCell(cells, columnIndex, "islem"),
			inflectionInfo,
			lexiqueCell(cells, columnIndex, "morphoder"),
			lexiqueNumber(lexiqueCell(cells, columnIndex, "nbmorph")),
		]);
		uniqueForms.add(form);
		uniqueLemmas.add(lemma);
		incrementCount(posCounts, partOfSpeech);
		if (gender.length > 0) incrementCount(genderCounts, gender);
		if (number.length > 0) incrementCount(numberCounts, number);
		if (inflectionInfo.length > 0) inflectedVerbRowCount += 1;
		const lemmaKey = `${lemma}\u0000${partOfSpeech}`;
		const lemmaEntry = lemmaForms.get(lemmaKey) ?? {
			lemma,
			partOfSpeech,
			forms: new Set(),
		};
		lemmaEntry.forms.add(form);
		lemmaForms.set(lemmaKey, lemmaEntry);
	}

	entryRows.sort((left, right) => {
		const formDelta = left[1].localeCompare(right[1]);
		if (formDelta !== 0) return formDelta;
		const lemmaDelta = left[2].localeCompare(right[2]);
		if (lemmaDelta !== 0) return lemmaDelta;
		return left[3].localeCompare(right[3]);
	});

	const lemmaRows = [...lemmaForms.values()]
		.map((entry) => [
			entry.lemma,
			entry.partOfSpeech,
			entry.forms.size,
			[...entry.forms]
				.sort((left, right) => left.localeCompare(right))
				.join(" "),
		])
		.sort((left, right) => {
			const lemmaDelta = left[0].localeCompare(right[0]);
			return lemmaDelta !== 0 ? lemmaDelta : left[1].localeCompare(right[1]);
		});
	const posRows = sortedCountRows(posCounts);
	const quality = {
		schemaVersion: "1",
		sourceIds: resourceSpec.sourceIds,
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		release: "3.83",
		entryCount: entryRows.length,
		lemmaCount: lemmaRows.length,
		uniqueFormCount: uniqueForms.size,
		uniqueLemmaCount: uniqueLemmas.size,
		posInventoryCount: posRows.length,
		genderCounts: Object.fromEntries(sortedCountRows(genderCounts)),
		numberCounts: Object.fromEntries(sortedCountRows(numberCounts)),
		inflectedVerbRowCount,
		recordsAccepted: entryRows.length,
		recordsRejected,
		warnings: [
			"Lexique 3.83 is CC-BY-SA-4.0 and this generated package is share-alike isolated.",
			"Lexique frequency fields are source corpus statistics, not a full contemporary French corpus package.",
			"The built-in search analyzer uses only its declared Unicode word, casefold, and accent-fold components; Lexique lookup rows remain explicit lexicon/morphology data.",
		],
	};
	const canonicalLexicon = {
		schemaVersion: "1",
		kind: "lexicon",
		lexiconId: "fr-lexique-383",
		languageTag: "fr",
		script: "Latn",
		entryCount: entryRows.length,
		resourceRefs: [
			{
				resourceId: "fr-lexique-entries",
				role: "entries",
				recordCount: entryRows.length,
			},
		],
	};
	const canonicalMorphology = {
		schemaVersion: "1",
		kind: "morphology",
		morphologyId: "fr-lexique-383-lookup",
		languageTag: "fr",
		script: "Latn",
		resourceRefs: [
			{
				resourceId: "fr-lexique-entries",
				role: "analyzer",
				recordCount: entryRows.length,
			},
			{
				resourceId: "fr-lexique-pos-inventory",
				role: "feature-inventory",
				recordCount: posRows.length,
			},
		],
		analyzers: [
			{
				analyzerId: "fr-lexique-383-form-lookup",
				type: "lookup",
				resourceIds: ["fr-lexique-entries", "fr-lexique-lemmas"],
				coverage: {
					entryCount: entryRows.length,
					lemmaCount: lemmaRows.length,
					inflectedVerbRowCount,
				},
			},
		],
		featureInventory: [
			{
				feature: "partOfSpeech",
				values: sorted([...posCounts.keys()]),
				count: posRows.length,
			},
			{
				feature: "gender",
				values: sorted([...genderCounts.keys()]),
				count: genderCounts.size,
			},
			{
				feature: "number",
				values: sorted([...numberCounts.keys()]),
				count: numberCounts.size,
			},
		],
	};
	const canonicalSearchProfile = {
		schemaVersion: "1",
		kind: "search-profile",
		analyzerId: "fr-lexique-383-analyzer",
		languageTag: "fr",
		script: "Latn",
		tokenizer: {
			componentId: "unicode-word",
			type: "unicode-word-boundary",
			mode: "default",
		},
		tokenFilters: [
			{
				componentId: "unicode-simple-casefold",
				type: "casefold",
				mode: "unicode-simple",
			},
			{
				componentId: "french-accent-fold",
				type: "diacritic-fold",
				mode: "lookup-only",
				options: {
					normalization: "NFD",
					removeUnicodeMarks: true,
				},
			},
		],
		fields: [
			{
				fieldName: "text",
				analyzerRole: "index",
			},
			{
				fieldName: "text",
				analyzerRole: "query",
			},
			{
				fieldName: "text",
				analyzerRole: "suggest",
			},
		],
	};
	const canonicalQuality = {
		schemaVersion: "1",
		kind: "quality-profile",
		profileId: "fr-lexique-383-quality",
		languageTag: "fr",
		script: "Latn",
		diagnostics: [
			{
				diagnosticId: "fr-lexique-383-share-alike-isolation",
				task: "license.boundary",
				severity: "info",
				message:
					"Lexique 3.83 resources are generated only in an explicit share-alike isolated package.",
				metadata: {
					sourceIds: quality.sourceIds,
					license: "CC-BY-SA-4.0",
				},
			},
		],
		metrics: [
			{
				metricId: "entry-count",
				name: "entryCount",
				value: quality.entryCount,
				unit: "entries",
			},
			{
				metricId: "lemma-count",
				name: "lemmaCount",
				value: quality.lemmaCount,
				unit: "lemmas",
			},
			{
				metricId: "unique-form-count",
				name: "uniqueFormCount",
				value: quality.uniqueFormCount,
				unit: "forms",
			},
			{
				metricId: "records-rejected",
				name: "recordsRejected",
				value: quality.recordsRejected,
				unit: "records",
			},
		],
		thresholds: [],
		evaluationRecordIds: [],
	};

	return [
		outputFor(
			resourceSpec,
			"fr-lexique-entries",
			tsvFile(
				[
					"entryId",
					"form",
					"lemma",
					"partOfSpeech",
					"gender",
					"number",
					"phonetic",
					"freqFilms",
					"freqBooks",
					"isLemma",
					"inflectionInfo",
					"derivationalMorphology",
					"morphemeCount",
				],
				entryRows,
			),
		),
		outputFor(
			resourceSpec,
			"fr-lexique-lemmas",
			tsvFile(["lemma", "partOfSpeech", "formCount", "forms"], lemmaRows),
		),
		outputFor(
			resourceSpec,
			"fr-lexique-pos-inventory",
			tsvFile(["partOfSpeech", "rowCount"], posRows),
		),
		outputFor(
			resourceSpec,
			"fr-lexique-lexicon-canonical",
			stableJson(canonicalLexicon),
		),
		outputFor(
			resourceSpec,
			"fr-lexique-morphology-canonical",
			stableJson(canonicalMorphology),
		),
		outputFor(
			resourceSpec,
			"fr-lexique-search-profile",
			stableJson(canonicalSearchProfile),
		),
		outputFor(resourceSpec, "fr-lexique-quality", stableJson(quality)),
		outputFor(
			resourceSpec,
			"fr-lexique-quality-profile",
			stableJson(canonicalQuality),
		),
	];
}

function conlluSplitName(basename) {
	if (basename.includes("-ud-train.")) return "train";
	if (basename.includes("-ud-dev.")) return "dev";
	if (basename.includes("-ud-test.")) return "test";
	return basename.replace(/\.conllu$/u, "");
}

const udConlluTransformProfiles = new Map([
	[
		"@ismail-elkorchi/textpack-en-syntax-ud-gumreddit",
		{
			annotationTableId: "en-ud-gumreddit-annotations",
			dependencyId: "en-ud-gumreddit-dependencies",
			diagnosticId: "en-ud-gumreddit-raw-text-policy",
			evalPrefix: "eval:en-ud-gumreddit",
			featureId: "en-ud-gumreddit-features",
			languageTag: "en",
			morphologyAnalyzerId: "en-ud-gumreddit-feature-profile",
			morphologyId: "en-ud-gumreddit-morphosyntax",
			morphologyResourceId: "en-ud-gumreddit-morphology-canonical",
			qualityId: "en-ud-gumreddit-quality",
			qualityProfileId: "en-ud-gumreddit-quality-profile",
			script: "Latn",
			sentenceProfileId: "en-ud-gumreddit-sentence-profile",
			sourceId: "source:ud:english-gumreddit-r2.18",
			syntaxId: "en-ud-gumreddit-syntax",
			syntaxResourceId: "en-ud-gumreddit-syntax-canonical",
			treebankId: "ud-english-gumreddit",
			uposId: "en-ud-gumreddit-upos",
			warnings: [
				"Generated resources intentionally exclude FORM and LEMMA fields because the source treebank is annotation-only.",
			],
		},
	],
	[
		"@ismail-elkorchi/textpack-ar-syntax-ud-nyuad-sa",
		{
			annotationTableId: "ar-ud-nyuad-annotations",
			dependencyId: "ar-ud-nyuad-dependencies",
			diagnosticId: "ar-ud-nyuad-raw-text-policy",
			evalPrefix: "eval:ar-ud-nyuad",
			featureId: "ar-ud-nyuad-features",
			languageTag: "ar",
			morphologyAnalyzerId: "ar-ud-nyuad-feature-profile",
			morphologyId: "ar-ud-nyuad-morphosyntax",
			morphologyResourceId: "ar-ud-nyuad-morphology-canonical",
			qualityId: "ar-ud-nyuad-quality",
			qualityProfileId: "ar-ud-nyuad-quality-profile",
			script: "Arab",
			sentenceProfileId: "ar-ud-nyuad-sentence-profile",
			sourceId: "source:ud:arabic-nyuad-r2.18",
			syntaxId: "ar-ud-nyuad-syntax",
			syntaxResourceId: "ar-ud-nyuad-syntax-canonical",
			treebankId: "ud-arabic-nyuad",
			uposId: "ar-ud-nyuad-upos",
			warnings: [
				"Generated resources intentionally exclude FORM and LEMMA fields because the source treebank is annotation-only.",
				"UD Arabic NYUAD is share-alike isolated and cannot enter the default Arabic composite.",
			],
		},
	],
	[
		"@ismail-elkorchi/textpack-fr-syntax-ud-gsd-sa",
		{
			annotationTableId: "fr-ud-gsd-annotations",
			dependencyId: "fr-ud-gsd-dependencies",
			diagnosticId: "fr-ud-gsd-raw-text-policy",
			evalPrefix: "eval:fr-ud-gsd",
			featureId: "fr-ud-gsd-features",
			languageTag: "fr",
			morphologyAnalyzerId: "fr-ud-gsd-feature-profile",
			morphologyId: "fr-ud-gsd-morphosyntax",
			morphologyResourceId: "fr-ud-gsd-morphology-canonical",
			qualityId: "fr-ud-gsd-quality",
			qualityProfileId: "fr-ud-gsd-quality-profile",
			script: "Latn",
			sentenceProfileId: "fr-ud-gsd-sentence-profile",
			sourceId: "source:ud:french-gsd-r2.18",
			syntaxId: "fr-ud-gsd-syntax",
			syntaxResourceId: "fr-ud-gsd-syntax-canonical",
			treebankId: "ud-french-gsd",
			uposId: "fr-ud-gsd-upos",
			warnings: [
				"Generated resources intentionally exclude FORM and LEMMA fields.",
				"UD French GSD is share-alike isolated and cannot enter the default French composite.",
			],
		},
	],
]);

export function udConlluProfileForPackage(packageName) {
	const profile = udConlluTransformProfiles.get(packageName);
	expect(profile !== undefined, `${packageName} has no UD CoNLL-U profile.`);
	return profile;
}

function transformUdConlluProfile(resourceSpec, inputs) {
	const profile = udConlluProfileForPackage(resourceSpec.packageName);
	const inputNames = resourceSpec.inputFiles
		.map((inputFile) => path.basename(inputFile.path))
		.filter((basename) => basename.endsWith(".conllu"))
		.sort((left, right) => left.localeCompare(right));
	const uposCounts = new Map();
	const featureCounts = new Map();
	const dependencyCounts = new Map();
	const sentenceStats = new Map();
	const annotationRows = [];
	for (const basename of inputNames) {
		const split = conlluSplitName(basename);
		const text = requiredInput(inputs, basename, resourceSpec);
		let sentenceCount = 0;
		let tokenCount = 0;
		let maxTokenCount = 0;
		for (const block of text.split(/\r?\n\r?\n/u)) {
			if (block.trim().length === 0) continue;
			let sentenceTokenCount = 0;
			const blockRows = [];
			for (const line of block.split(/\r?\n/u)) {
				if (line.length === 0 || line.startsWith("#")) continue;
				const columns = line.split("\t");
				if (columns.length < 10 || !/^[0-9]+$/u.test(columns[0])) continue;
				const upos = columns[3] ?? "_";
				const xpos = columns[4] ?? "_";
				const features = columns[5] ?? "_";
				const head = columns[6] ?? "_";
				const deprel = columns[7] ?? "_";
				incrementCount(uposCounts, `${upos}\t${xpos}`);
				incrementCount(dependencyCounts, `${split}\t${deprel}`);
				if (features !== "_") {
					for (const feature of features.split("|")) {
						const [name = "", value = ""] = feature.split("=");
						if (name.length > 0)
							incrementCount(featureCounts, `${name}\t${value}`);
					}
				}
				sentenceTokenCount += 1;
				blockRows.push([
					split,
					sentenceCount + 1,
					columns[0],
					upos,
					xpos,
					features,
					head,
					deprel,
					columns[8] ?? "_",
					columns[9] ?? "_",
				]);
			}
			if (sentenceTokenCount > 0) {
				sentenceCount += 1;
				tokenCount += sentenceTokenCount;
				maxTokenCount = Math.max(maxTokenCount, sentenceTokenCount);
				annotationRows.push(...blockRows);
			}
		}
		sentenceStats.set(split, {
			sentenceCount,
			tokenCount,
			averageTokenCount:
				sentenceCount === 0
					? 0
					: Number((tokenCount / sentenceCount).toFixed(2)),
			maxTokenCount,
		});
	}

	const uposRows = sortedCountRows(uposCounts).map(([key, count]) => [
		...key.split("\t"),
		count,
	]);
	const featureRows = sortedCountRows(featureCounts).map(([key, count]) => [
		...key.split("\t"),
		count,
	]);
	const dependencyRows = sortedCountRows(dependencyCounts).map(
		([key, count]) => [...key.split("\t"), count],
	);
	const sentenceRows = [...sentenceStats.entries()]
		.sort((left, right) => left[0].localeCompare(right[0]))
		.map(([split, stats]) => [
			split,
			stats.sentenceCount,
			stats.tokenCount,
			stats.averageTokenCount,
			stats.maxTokenCount,
		]);
	const totalSentences = [...sentenceStats.values()].reduce(
		(total, stats) => total + stats.sentenceCount,
		0,
	);
	const totalTokens = [...sentenceStats.values()].reduce(
		(total, stats) => total + stats.tokenCount,
		0,
	);
	const summary = {
		schemaVersion: "1",
		sourceId: profile.sourceId,
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		splits: Object.fromEntries([...sentenceStats.entries()].sort()),
		totalSentences,
		totalTokens,
		annotationRowCount: annotationRows.length,
		uposPairCount: uposRows.length,
		featureValueCount: featureRows.length,
		dependencyLabelBySplitCount: dependencyRows.length,
		rawTextFieldsEmitted: false,
		recordsAccepted: totalTokens,
		recordsRejected: 0,
		warnings: profile.warnings,
	};
	const featureInventory = new Map();
	for (const [feature, value, count] of featureRows) {
		const values = featureInventory.get(feature) ?? [];
		values.push({ value, count });
		featureInventory.set(feature, values);
	}
	const canonicalSyntax = {
		schemaVersion: "1",
		kind: "syntax",
		syntaxId: profile.syntaxId,
		languageTag: profile.languageTag,
		script: profile.script,
		annotationScheme: "Universal Dependencies",
		resourceRefs: [
			{
				resourceId: profile.uposId,
				role: "tagset",
				recordCount: uposRows.length,
			},
			{
				resourceId: profile.featureId,
				role: "feature-inventory",
				recordCount: featureRows.length,
			},
			{
				resourceId: profile.dependencyId,
				role: "dependency-labels",
				recordCount: dependencyRows.length,
			},
			{
				resourceId: profile.sentenceProfileId,
				role: "sentence-profile",
				recordCount: sentenceRows.length,
			},
			{
				resourceId: profile.annotationTableId,
				role: "annotation-table",
				recordCount: annotationRows.length,
			},
		],
		tagsets: [
			{
				tagsetId: "upos-xpos",
				tags: uposRows.map(([upos, xpos, count]) => ({
					tag: upos,
					secondaryTag: xpos,
					count,
				})),
			},
		],
		features: featureRows.map(([feature, value, count]) => ({
			feature,
			value,
			count,
		})),
		dependencyLabels: dependencyRows.map(([split, label, count]) => ({
			split,
			label,
			count,
		})),
		treebanks: sentenceRows.map(
			([
				split,
				sentenceCount,
				tokenCount,
				averageTokenCount,
				maxTokenCount,
			]) => ({
				treebankId: profile.treebankId,
				split,
				sentenceCount,
				tokenCount,
				averageTokenCount,
				maxTokenCount,
			}),
		),
	};
	const canonicalMorphology = {
		schemaVersion: "1",
		kind: "morphology",
		morphologyId: profile.morphologyId,
		languageTag: profile.languageTag,
		script: profile.script,
		resourceRefs: [
			{
				resourceId: profile.featureId,
				role: "feature-inventory",
				recordCount: featureRows.length,
			},
			{
				resourceId: profile.annotationTableId,
				role: "analyzer",
				recordCount: annotationRows.length,
			},
		],
		analyzers: [
			{
				analyzerId: profile.morphologyAnalyzerId,
				type: "statistical",
				resourceIds: [profile.featureId, profile.annotationTableId],
				coverage: {
					tokenCount: totalTokens,
					featureValueCount: featureRows.length,
				},
			},
		],
		featureInventory: [...featureInventory.entries()]
			.sort((left, right) => left[0].localeCompare(right[0]))
			.map(([feature, values]) => ({
				feature,
				count: values.length,
				values: values
					.sort((left, right) => left.value.localeCompare(right.value))
					.map((entry) => entry.value),
			})),
	};
	const canonicalQuality = {
		schemaVersion: "1",
		kind: "quality-profile",
		profileId: profile.qualityProfileId,
		languageTag: profile.languageTag,
		script: profile.script,
		diagnostics: [
			{
				diagnosticId: profile.diagnosticId,
				task: "syntax.transform",
				severity: "info",
				message: "Generated UD resources exclude FORM and LEMMA text fields.",
				metadata: {
					rawTextFieldsEmitted: summary.rawTextFieldsEmitted,
				},
			},
		],
		metrics: [
			{
				metricId: "total-token-count",
				name: "totalTokens",
				value: totalTokens,
				unit: "tokens",
			},
			{
				metricId: "annotation-row-count",
				name: "annotationRowCount",
				value: annotationRows.length,
				unit: "records",
			},
			{
				metricId: "dependency-label-by-split-count",
				name: "dependencyLabelBySplitCount",
				value: dependencyRows.length,
				unit: "labels",
			},
		],
		thresholds: [],
		evaluationRecordIds: [],
	};

	return [
		outputFor(
			resourceSpec,
			profile.uposId,
			tsvFile(["upos", "xpos", "count"], uposRows),
		),
		outputFor(
			resourceSpec,
			profile.featureId,
			tsvFile(["feature", "value", "count"], featureRows),
		),
		outputFor(
			resourceSpec,
			profile.dependencyId,
			tsvFile(["split", "deprel", "count"], dependencyRows),
		),
		outputFor(
			resourceSpec,
			profile.sentenceProfileId,
			tsvFile(
				[
					"split",
					"sentenceCount",
					"tokenCount",
					"averageTokenCount",
					"maxTokenCount",
				],
				sentenceRows,
			),
		),
		outputFor(
			resourceSpec,
			profile.annotationTableId,
			tsvFile(
				[
					"split",
					"sentenceIndex",
					"tokenId",
					"upos",
					"xpos",
					"features",
					"head",
					"deprel",
					"deps",
					"misc",
				],
				annotationRows,
			),
		),
		outputFor(resourceSpec, profile.qualityId, stableJson(summary)),
		outputFor(
			resourceSpec,
			profile.syntaxResourceId,
			stableJson(canonicalSyntax),
		),
		outputFor(
			resourceSpec,
			profile.morphologyResourceId,
			stableJson(canonicalMorphology),
		),
		outputFor(
			resourceSpec,
			profile.qualityProfileId,
			stableJson(canonicalQuality),
		),
	];
}

export const transformRunners = new Map([
	["arabic-core-profile", transformArabicCoreProfile],
	["arabic-normalization-profile", transformArabicNormalizationProfile],
	["arabic-search-profile", transformArabicSearchProfile],
	["arabic-wordnet-lmf", transformArabicWordnetLmf],
	["camel-morph-msa", transformCamelMorphMsa],
	["cldr-core-foundation", transformCldrCoreFoundation],
	["english-core-profile", transformEnglishCoreProfile],
	["english-normalization-profile", transformEnglishNormalizationProfile],
	["english-segmentation-profile", transformEnglishSegmentationProfile],
	["esdb-wordlist-diff", transformEsdbWordlistDiff],
	["french-core-profile", transformFrenchCoreProfile],
	["french-lexique-383", transformFrenchLexique383],
	["french-normalization-profile", transformFrenchNormalizationProfile],
	["french-segmentation-profile", transformFrenchSegmentationProfile],
	["french-unimorph", transformFrenchUnimorph],
	["iana-language-registry", transformIanaLanguageRegistry],
	["open-english-wordnet-lmf", transformOpenEnglishWordnetLmf],
	["scowl-v2-inflection", transformScowlV2Inflection],
	["tatoeba-arabic-corpus-artifact", transformTatoebaArabicCorpusArtifact],
	["tatoeba-arabic-parallel-artifact", transformTatoebaArabicParallelArtifact],
	["tatoeba-english-corpus-artifact", transformTatoebaEnglishCorpusArtifact],
	[
		"tatoeba-english-parallel-artifact",
		transformTatoebaEnglishParallelArtifact,
	],
	["tatoeba-french-corpus-artifact", transformTatoebaFrenchCorpusArtifact],
	["tatoeba-french-parallel-artifact", transformTatoebaFrenchParallelArtifact],
	["ud-conllu-profile", transformUdConlluProfile],
	["unicode-17-core", transformUnicode17Core],
	["wikidata-main-artifact", transformWikidataMainArtifact],
]);

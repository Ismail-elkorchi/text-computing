import { evaluationSupportsTaskEvidence } from "./policy.mjs";
import {
	udConlluProfileForPackage,
	unicodeCldrLatinProfiles,
} from "./transforms.mjs";

const GENERATED_BY = "tools/textpack-forge";

function expect(condition, message) {
	if (!condition) throw new Error(message);
}

function sorted(values) {
	return [...values].sort((left, right) => left.localeCompare(right));
}

function capabilities(manifest) {
	const output = {};
	for (const slot of manifest.capabilitySlots) {
		for (const [key, value] of Object.entries(slot.capabilities ?? {})) {
			output[key] = value;
		}
	}
	return output;
}

function isDistributionPack(pack) {
	return pack.distribution === true;
}

function metricResult(value, operator, threshold) {
	if (operator === "exists") return value === undefined ? "fail" : "pass";
	if (operator === "eq") return value === threshold ? "pass" : "fail";
	if (typeof value !== "number" || typeof threshold !== "number") {
		return "warning";
	}
	if (operator === "gte") return value >= threshold ? "pass" : "fail";
	if (operator === "gt") return value > threshold ? "pass" : "fail";
	if (operator === "lte") return value <= threshold ? "pass" : "fail";
	if (operator === "lt") return value < threshold ? "pass" : "fail";
	return "warning";
}

export function evaluationRecord(pack, options) {
	const capabilitySlot = pack.capabilitySlots.find(
		(slot) => slot.slot === options.capabilitySlot,
	);
	if (capabilitySlot === undefined) {
		throw new Error(
			`${pack.packageName} evaluation ${options.recordId} references undeclared capability slot ${options.capabilitySlot}.`,
		);
	}
	const metric = {
		name: options.metricName,
		value: options.value,
		unit: options.unit,
		...(options.operator === undefined ? {} : { operator: options.operator }),
		...(options.threshold === undefined
			? {}
			: { threshold: options.threshold }),
	};
	const result =
		options.result ??
		metricResult(
			options.value,
			options.operator ?? "exists",
			options.threshold,
		);
	return {
		schemaVersion: "1",
		recordId: options.recordId,
		packageName: pack.packageName,
		resourceSpecId: options.resourceSpecId,
		pipelineId: options.pipelineId,
		capabilitySlot: options.capabilitySlot,
		tier: capabilitySlot.tier,
		taskType: options.taskType,
		evaluationKind: options.evaluationKind,
		result,
		metric,
		dataset: {
			sourceIds: pack.sourceIds,
			snapshotIds: pack.snapshotIds,
			...(pack.manifest.targets.languages === undefined
				? {}
				: { languages: pack.manifest.targets.languages }),
			...(pack.manifest.targets.scripts === undefined
				? {}
				: { scripts: pack.manifest.targets.scripts }),
			...(pack.manifest.targets.modalities === undefined
				? {}
				: { modalities: pack.manifest.targets.modalities }),
			...(options.split === undefined ? {} : { split: options.split }),
		},
		evidence: {
			resourceIds: options.resourceIds,
			...(options.modelId === undefined ? {} : { modelId: options.modelId }),
			...(options.artifactId === undefined
				? {}
				: { artifactId: options.artifactId }),
			...(options.sampleSize === undefined
				? {}
				: { sampleSize: options.sampleSize }),
			...(options.observations === undefined
				? {}
				: { observations: options.observations }),
		},
		limitations: options.limitations ?? [],
	};
}

function isHeldOutSplit(split) {
	return (
		typeof split === "string" &&
		!/train/iu.test(split) &&
		/(?:held[-_ ]?out|test|evaluation)/iu.test(split)
	);
}

export function assertModelBackedEvidence(pack, records) {
	for (const slot of pack.capabilitySlots.filter(
		(candidate) => candidate.tier === "model-backed",
	)) {
		const qualifyingRecord = records.find(
			(record) =>
				record.capabilitySlot === slot.slot &&
				record.tier === "model-backed" &&
				record.evaluationKind === "task-accuracy" &&
				record.result === "pass" &&
				isHeldOutSplit(record.dataset?.split) &&
				Array.isArray(record.dataset?.sourceIds) &&
				record.dataset.sourceIds.length > 0 &&
				Array.isArray(record.dataset?.snapshotIds) &&
				record.dataset.snapshotIds.length > 0 &&
				typeof record.evidence?.sampleSize === "number" &&
				record.evidence.sampleSize > 0 &&
				(typeof record.evidence.modelId === "string" ||
					typeof record.evidence.artifactId === "string") &&
				record.metric?.operator !== undefined &&
				record.metric?.threshold !== undefined,
		);
		if (qualifyingRecord === undefined) {
			throw new Error(
				`${pack.packageName} model-backed slot ${slot.slot} requires a passing held-out task-accuracy record with sample size, model/artifact identity, metric threshold, and dataset source/snapshot evidence.`,
			);
		}
	}
}

export function evaluationSummary(records) {
	const counts = {
		pass: 0,
		warning: 0,
		fail: 0,
		"not-applicable": 0,
	};
	for (const record of records) counts[record.result] += 1;
	const status =
		records.length === 0
			? "not-applicable"
			: counts.fail > 0
				? "failed"
				: counts.warning > 0
					? "warning"
					: "passed";
	return {
		status,
		recordCount: records.length,
		passCount: counts.pass,
		warningCount: counts.warning,
		failCount: counts.fail,
		notApplicableCount: counts["not-applicable"],
	};
}

export function coverageEvidenceLevel(slot, evaluationRecords, resourceIds) {
	if (slot.status === "artifact-backed") {
		return evaluationRecords.length > 0
			? "artifact-evaluated"
			: "artifact-descriptor";
	}
	if (
		evaluationRecords.some(
			(record) =>
				record.result === "pass" &&
				evaluationSupportsTaskEvidence(record.evaluationKind),
		)
	) {
		return "task-evaluated";
	}
	if (evaluationRecords.length > 0) return "resource-evaluated";
	if (resourceIds.length > 0) return "resource-inventory";
	return "none";
}

export function evaluationReport(pack, context, records) {
	return {
		schemaVersion: "1",
		generatedAt: context.generatedAt,
		generatedBy: "tools/textpack-forge",
		mode: context.mode,
		packageName: pack.packageName,
		publishable: pack.publishable,
		publishability: pack.publishability,
		resourceSpecIds: pack.resourceSpecIds ?? [],
		summary: evaluationSummary(records),
		records,
		knownGaps: pack.knownGaps,
	};
}

function payloadById(pack, resourceId) {
	const payload = pack.payloads.find(
		(candidate) => candidate.id === resourceId,
	);
	expect(
		payload !== undefined,
		`${pack.packageName} missing generated payload ${resourceId}.`,
	);
	return payload;
}

function payloadJson(pack, resourceId) {
	return JSON.parse(payloadById(pack, resourceId).resourceText);
}

function tsvDataRows(text) {
	const [, ...rows] = text
		.split(/\r?\n/u)
		.filter((line) => line.trim().length > 0)
		.map((line) => line.split("\t"));
	return rows;
}

function resourceSpecIdFor(pack) {
	return pack.resourceSpecIds[0] ?? "resource-spec:unknown";
}

function taskPipelineId(pack) {
	return (
		pack.payloads.find((payload) => payload.pipelineId !== undefined)
			?.pipelineId ?? "unknown"
	);
}

function languageRegistryEvaluationRecords(pack) {
	const summary = payloadJson(pack, "bcp47-language-registry-summary");
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		evaluationRecord(pack, {
			recordId: "eval:language-registry:bcp47-record-volume",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "language-registry",
			taskType: "language-registry.bcp47",
			evaluationKind: "coverage",
			resourceIds: [
				"bcp47-language-subtags",
				"bcp47-language-registry-summary",
			],
			metricName: "recordCount",
			value: summary.recordCount,
			unit: "records",
			operator: "gte",
			threshold: 1,
			observations: {
				countsByType: summary.countsByType,
				fileDate: summary.fileDate,
			},
		}),
		evaluationRecord(pack, {
			recordId: "eval:language-registry:bcp47-type-coverage",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "language-registry",
			taskType: "language-registry.type-coverage",
			evaluationKind: "resource-conformance",
			resourceIds: [
				"bcp47-language-subtags",
				"bcp47-language-registry-summary",
			],
			metricName: "registryTypeCount",
			value: Object.keys(summary.countsByType ?? {}).length,
			unit: "types",
			operator: "gte",
			threshold: 7,
			observations: {
				deprecatedRecordCount: summary.deprecatedRecordCount,
			},
		}),
	];
}

function unicodeFoundationEvaluationRecords(pack) {
	const summary = payloadJson(pack, "unicode-17-core-summary");
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		evaluationRecord(pack, {
			recordId: "eval:unicode-17:block-range-coverage",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "unicode-profile",
			taskType: "unicode-profile.blocks",
			evaluationKind: "coverage",
			resourceIds: ["unicode-17-blocks", "unicode-17-core-summary"],
			metricName: "blockRangeCount",
			value: summary.blockRangeCount,
			unit: "ranges",
			operator: "gte",
			threshold: 1,
			observations: {
				version: summary.version,
			},
		}),
		evaluationRecord(pack, {
			recordId: "eval:unicode-17:script-range-coverage",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "unicode-profile",
			taskType: "unicode-profile.scripts",
			evaluationKind: "coverage",
			resourceIds: ["unicode-17-scripts", "unicode-17-core-summary"],
			metricName: "scriptRangeCount",
			value: summary.scriptRangeCount,
			unit: "ranges",
			operator: "gte",
			threshold: 1,
		}),
		evaluationRecord(pack, {
			recordId: "eval:unicode-17:property-alias-coverage",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "unicode-profile",
			taskType: "unicode-profile.property-aliases",
			evaluationKind: "coverage",
			resourceIds: [
				"unicode-17-property-value-aliases",
				"unicode-17-core-summary",
			],
			metricName: "propertyValueAliasCount",
			value: summary.propertyValueAliasCount,
			unit: "aliases",
			operator: "gte",
			threshold: 1,
		}),
	];
}

function cldrFoundationEvaluationRecords(pack) {
	const summary = payloadJson(pack, "cldr-48-core-summary");
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		evaluationRecord(pack, {
			recordId: "eval:cldr-core:likely-subtag-coverage",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "locale-profile",
			taskType: "locale-profile.likely-subtags",
			evaluationKind: "coverage",
			resourceIds: ["cldr-48-likely-subtags", "cldr-48-core-summary"],
			metricName: "likelySubtagCount",
			value: summary.likelySubtagCount,
			unit: "mappings",
			operator: "gte",
			threshold: 1,
			observations: {
				cldrVersion: summary.cldrVersion,
				unicodeVersion: summary.unicodeVersion,
			},
		}),
		evaluationRecord(pack, {
			recordId: "eval:cldr-core:locale-alias-coverage",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "locale-profile",
			taskType: "locale-profile.aliases",
			evaluationKind: "coverage",
			resourceIds: ["cldr-48-locale-aliases", "cldr-48-core-summary"],
			metricName: "aliasCount",
			value: summary.aliasCount,
			unit: "aliases",
			operator: "gte",
			threshold: 1,
		}),
		evaluationRecord(pack, {
			recordId: "eval:cldr-core:script-variant-coverage",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "locale-profile",
			taskType: "locale-profile.script-variants",
			evaluationKind: "coverage",
			resourceIds: ["cldr-48-script-data", "cldr-48-core-summary"],
			metricName: "scriptVariantCount",
			value: summary.scriptVariantCount,
			unit: "variants",
			operator: "gte",
			threshold: 1,
		}),
	];
}

function camelMorphEvaluationRecords(pack) {
	const quality = payloadJson(pack, "ar-msa-camel-morph-quality");
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		evaluationRecord(pack, {
			recordId: "eval:ar-msa-camel-morph:morpheme-inventory",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "morphology",
			taskType: "morphology.lookup",
			evaluationKind: "resource-conformance",
			resourceIds: [
				"ar-msa-camel-morph-morphemes",
				"ar-msa-camel-morph-features",
			],
			metricName: "morphemeCount",
			value: quality.morphemeCount,
			unit: "records",
			operator: "gte",
			threshold: 1,
			observations: {
				featureCount: quality.featureCount,
				defaultFeatureCount: quality.defaultFeatureCount,
			},
		}),
		evaluationRecord(pack, {
			recordId: "eval:ar-msa-camel-morph:compatibility-tables",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "morphology",
			taskType: "morphology.compatibility",
			evaluationKind: "resource-conformance",
			resourceIds: ["ar-msa-camel-morph-compatibility"],
			metricName: "compatibilityCount",
			value: quality.compatibilityCount,
			unit: "records",
			operator: "gte",
			threshold: 1,
			observations: {
				compatibilityCounts: quality.compatibilityCounts,
			},
		}),
		evaluationRecord(pack, {
			recordId: "eval:ar-msa-camel-morph:segmentation-profile",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "segmentation",
			taskType: "segmentation.unicode-profile",
			evaluationKind: "resource-conformance",
			resourceIds: ["ar-msa-camel-segmentation-canonical"],
			metricName: "segmentationProfilePresent",
			value: 1,
			unit: "boolean",
			operator: "eq",
			threshold: 1,
			limitations: [
				"The built-in adapter executes Unicode lexical segmentation. CAMeL tokenization fields are separate morphology reference data, not an executed dictionary segmenter.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:ar-msa-camel-morph:tokenization-fields",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "morphology",
			taskType: "morphology.tokenization-scheme-data",
			evaluationKind: "resource-conformance",
			resourceIds: ["ar-msa-camel-morph-tokenizations"],
			metricName: "tokenizationFieldCount",
			value: quality.tokenizationFieldCount,
			unit: "fields",
			operator: "gte",
			threshold: 1,
			limitations: [
				"This verifies CAMeL Morph tokenization-field inventory only; the built-in segmentation adapter does not execute it as a dictionary or clitic segmenter.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:ar-msa-camel-morph:transform-rejections",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "quality",
			taskType: "quality.transform-integrity",
			evaluationKind: "integrity",
			resourceIds: ["ar-msa-camel-morph-quality"],
			metricName: "recordsRejected",
			value: quality.recordsRejected,
			unit: "records",
			operator: "eq",
			threshold: 0,
		}),
	];
}

function udHeadReferenceCoverage(pack, profile) {
	const rows = tsvDataRows(
		payloadById(pack, profile.annotationTableId).resourceText,
	);
	const sentenceTokens = new Map();
	for (const row of rows) {
		const key = `${row[0] ?? ""}\t${row[1] ?? ""}`;
		const tokens = sentenceTokens.get(key) ?? new Set();
		tokens.add(row[2] ?? "");
		sentenceTokens.set(key, tokens);
	}
	let checked = 0;
	let valid = 0;
	for (const row of rows) {
		const key = `${row[0] ?? ""}\t${row[1] ?? ""}`;
		const head = row[6] ?? "";
		checked += 1;
		if (head === "0" || sentenceTokens.get(key)?.has(head) === true) {
			valid += 1;
		}
	}
	return {
		checked,
		valid,
		ratio: checked === 0 ? 0 : Number((valid / checked).toFixed(6)),
	};
}

function udSyntaxEvaluationRecords(pack) {
	const profile = udConlluProfileForPackage(pack.packageName);
	const quality = payloadJson(pack, profile.qualityId);
	const headCoverage = udHeadReferenceCoverage(pack, profile);
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		evaluationRecord(pack, {
			recordId: `${profile.evalPrefix}:annotation-volume`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "tagging",
			taskType: "tagging.profile",
			evaluationKind: "coverage",
			resourceIds: [
				profile.uposId,
				profile.featureId,
				profile.annotationTableId,
			],
			metricName: "totalTokens",
			value: quality.totalTokens,
			unit: "tokens",
			operator: "gte",
			threshold: 1,
			observations: {
				totalSentences: quality.totalSentences,
				uposPairCount: quality.uposPairCount,
				featureValueCount: quality.featureValueCount,
			},
		}),
		evaluationRecord(pack, {
			recordId: `${profile.evalPrefix}:dependency-label-coverage`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "syntax",
			taskType: "syntax.dependency-profile",
			evaluationKind: "coverage",
			resourceIds: [
				profile.dependencyId,
				profile.sentenceProfileId,
				profile.annotationTableId,
			],
			metricName: "dependencyLabelBySplitCount",
			value: quality.dependencyLabelBySplitCount,
			unit: "labels-by-split",
			operator: "gte",
			threshold: 1,
			observations: {
				splits: quality.splits,
			},
		}),
		evaluationRecord(pack, {
			recordId: `${profile.evalPrefix}:head-reference-coverage`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "syntax",
			taskType: "syntax.dependency-integrity",
			evaluationKind: "resource-conformance",
			resourceIds: [profile.annotationTableId],
			metricName: "headReferenceCoverageRatio",
			value: headCoverage.ratio,
			unit: "ratio",
			operator: "eq",
			threshold: 1,
			sampleSize: headCoverage.checked,
			observations: {
				validHeadReferences: headCoverage.valid,
			},
		}),
		evaluationRecord(pack, {
			recordId: `${profile.evalPrefix}:no-raw-text-fields`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "quality",
			taskType: "quality.redistribution-integrity",
			evaluationKind: "integrity",
			resourceIds: [profile.qualityId],
			metricName: "rawTextFieldsEmitted",
			value: quality.rawTextFieldsEmitted,
			unit: "boolean",
			operator: "eq",
			threshold: false,
			limitations: [
				"FORM and LEMMA are intentionally excluded; this pack evaluates annotation-derived syntax resources only.",
			],
		}),
	];
}

function englishWordnetLexiconEvaluationRecords(pack) {
	const quality = payloadJson(pack, "en-wordnet-lexicon-quality");
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		evaluationRecord(pack, {
			recordId: "eval:en-wordnet-lexicon:lexical-entry-volume",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "lexicon",
			taskType: "lexicon.lookup",
			evaluationKind: "coverage",
			resourceIds: [
				"en-wordnet-lexical-entries",
				"en-wordnet-lexicon-canonical",
			],
			metricName: "lexicalEntryCount",
			value: quality.lexicalEntryCount,
			unit: "entries",
			operator: "gte",
			threshold: 1,
			observations: {
				lexicalEntriesByPartOfSpeech: quality.lexicalEntriesByPartOfSpeech,
			},
			limitations: [
				"This verifies Open English WordNet lexical-entry coverage; it does not claim complete spelling-list, frequency, or inflectional morphology coverage.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:en-wordnet-lexicon:transform-rejections",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "quality",
			taskType: "quality.transform-integrity",
			evaluationKind: "integrity",
			resourceIds: ["en-wordnet-lexicon-quality"],
			metricName: "recordsRejected",
			value: quality.recordsRejected,
			unit: "records",
			operator: "eq",
			threshold: 0,
		}),
	];
}

function esdbWordlistEvaluationRecords(pack) {
	const quality = payloadJson(pack, "en-esdb-wordlist-quality");
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		evaluationRecord(pack, {
			recordId: "eval:en-esdb-wordlist:default-profile-count",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "lexicon",
			taskType: "lexicon.spelling-wordlist",
			evaluationKind: "coverage",
			resourceIds: [
				"en-esdb-default-wordlists",
				"en-esdb-default-profiles",
				"en-esdb-wordlist-lexicon-canonical",
			],
			metricName: "profileCount",
			value: quality.profileCount,
			unit: "profiles",
			operator: "eq",
			threshold: 5,
			observations: {
				wordCountsByProfile: quality.wordCountsByProfile,
			},
			limitations: [
				"Profiles cover generated default regional spell-checker wordlists only; ESDB large dictionaries and unstable database internals are not included.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:en-esdb-wordlist:word-volume",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "lexicon",
			taskType: "lexicon.spelling-wordlist",
			evaluationKind: "coverage",
			resourceIds: [
				"en-esdb-default-wordlists",
				"en-esdb-wordlist-lexicon-canonical",
			],
			metricName: "uniqueWordCount",
			value: quality.uniqueWordCount,
			unit: "words",
			operator: "gte",
			threshold: 100000,
			observations: {
				totalWordRows: quality.totalWordRows,
				sharedWordCount: quality.sharedWordCount,
			},
			limitations: [
				"This is a spelling-form wordlist volume check, not proof of complete English lexicon or morphology coverage.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:en-esdb-wordlist:search-profile",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "search",
			taskType: "search.analyzer-profile",
			evaluationKind: "resource-conformance",
			resourceIds: ["en-esdb-wordlist-search-profile"],
			metricName: "searchProfileCount",
			value: 1,
			unit: "profiles",
			operator: "eq",
			threshold: 1,
			limitations: [
				"The executable search profile performs Unicode word tokenization and casefolding. ESDB wordlists are separate lexicon data for explicit spelling/suggestion consumers, not an implicit analyzer filter.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:en-esdb-wordlist:transform-rejections",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "quality",
			taskType: "quality.transform-integrity",
			evaluationKind: "integrity",
			resourceIds: ["en-esdb-wordlist-quality"],
			metricName: "recordsRejected",
			value: quality.recordsRejected,
			unit: "records",
			operator: "eq",
			threshold: 0,
			observations: {
				duplicateWithinProfileCount: quality.duplicateWithinProfileCount,
			},
		}),
	];
}

function englishCoreEvaluationRecords(pack) {
	const quality = payloadJson(pack, "en-core-quality");
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		evaluationRecord(pack, {
			recordId: "eval:en-core:iana-language-profile",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "core",
			taskType: "core.language-profile",
			evaluationKind: "resource-conformance",
			resourceIds: ["en-core-language-profile"],
			metricName: "likelySubtag",
			value: quality.likelySubtag,
			unit: "tag",
			operator: "eq",
			threshold: "en-Latn-US",
			observations: {
				ianaFileDate: quality.ianaFileDate,
				ianaSuppressScript: quality.ianaSuppressScript,
			},
		}),
		evaluationRecord(pack, {
			recordId: "eval:en-core:latin-orthography-ranges",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "core",
			taskType: "core.orthography",
			evaluationKind: "coverage",
			resourceIds: ["en-core-orthography"],
			metricName: "latinScriptRangeCount",
			value: quality.latinScriptRangeCount,
			unit: "ranges",
			operator: "gte",
			threshold: 1,
		}),
		evaluationRecord(pack, {
			recordId: "eval:en-core:unicode-punctuation-ranges",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "core",
			taskType: "core.punctuation",
			evaluationKind: "coverage",
			resourceIds: ["en-core-punctuation"],
			metricName: "punctuationRangeCount",
			value: quality.punctuationRangeCount,
			unit: "ranges",
			operator: "gte",
			threshold: 1,
		}),
		evaluationRecord(pack, {
			recordId: "eval:en-core:scowl-abbreviation-rows",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "core",
			taskType: "core.abbreviation-table",
			evaluationKind: "coverage",
			resourceIds: ["en-core-abbreviations"],
			metricName: "abbreviationCount",
			value: quality.abbreviationCount,
			unit: "rows",
			operator: "gte",
			threshold: 1,
			limitations: [
				"SCOWLv2 abbreviation rows are lexical/POS resources; they are not a sentence-boundary disambiguation model.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:en-core:scowl-function-word-rows",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "core",
			taskType: "core.stoplist-candidates",
			evaluationKind: "coverage",
			resourceIds: ["en-core-function-words"],
			metricName: "functionWordCount",
			value: quality.functionWordCount,
			unit: "rows",
			operator: "gte",
			threshold: 1,
			limitations: [
				"Rows are SCOWLv2 closed-class POS records with SCOWL size <= 60; they are not corpus-frequency stopword weights.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:en-core:basic-segmentation-baseline",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "core",
			taskType: "core.basic-segmentation",
			evaluationKind: "coverage",
			resourceIds: ["en-core-basic-segmentation"],
			metricName: "wordRangeCount",
			value: quality.wordRangeCount,
			unit: "ranges",
			operator: "gte",
			threshold: 1,
			observations: {
				graphemeRangeCount: quality.graphemeRangeCount,
				sentenceRangeCount: quality.sentenceRangeCount,
			},
			limitations: [
				"This verifies a basic Unicode UAX #29 segmentation baseline; richer English segmentation is provided by textpack-en-segmentation.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:en-core:transform-rejections",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "quality",
			taskType: "quality.transform-integrity",
			evaluationKind: "integrity",
			resourceIds: ["en-core-quality"],
			metricName: "recordsRejected",
			value: quality.recordsRejected,
			unit: "records",
			operator: "eq",
			threshold: 0,
		}),
	];
}

function frenchCoreEvaluationRecords(pack) {
	const quality = payloadJson(pack, "fr-core-quality");
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		evaluationRecord(pack, {
			recordId: "eval:fr-core:iana-language-profile",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "core",
			taskType: "core.language-profile",
			evaluationKind: "resource-conformance",
			resourceIds: ["fr-core-language-profile"],
			metricName: "likelySubtag",
			value: quality.likelySubtag,
			unit: "tag",
			operator: "eq",
			threshold: "fr-Latn-FR",
			observations: {
				ianaFileDate: quality.ianaFileDate,
				ianaSuppressScript: quality.ianaSuppressScript,
			},
		}),
		evaluationRecord(pack, {
			recordId: "eval:fr-core:latin-orthography-ranges",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "core",
			taskType: "core.orthography",
			evaluationKind: "coverage",
			resourceIds: ["fr-core-orthography"],
			metricName: "latinScriptRangeCount",
			value: quality.latinScriptRangeCount,
			unit: "ranges",
			operator: "gte",
			threshold: 1,
		}),
		evaluationRecord(pack, {
			recordId: "eval:fr-core:unicode-punctuation-ranges",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "core",
			taskType: "core.punctuation",
			evaluationKind: "coverage",
			resourceIds: ["fr-core-punctuation"],
			metricName: "punctuationRangeCount",
			value: quality.punctuationRangeCount,
			unit: "ranges",
			operator: "gte",
			threshold: 1,
		}),
		evaluationRecord(pack, {
			recordId: "eval:fr-core:basic-segmentation-baseline",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "core",
			taskType: "core.basic-segmentation",
			evaluationKind: "coverage",
			resourceIds: ["fr-core-basic-segmentation"],
			metricName: "wordRangeCount",
			value: quality.wordRangeCount,
			unit: "ranges",
			operator: "gte",
			threshold: 1,
			observations: {
				graphemeRangeCount: quality.graphemeRangeCount,
				sentenceRangeCount: quality.sentenceRangeCount,
			},
			limitations: [
				"This verifies a basic Unicode UAX #29 segmentation baseline; richer French segmentation is provided by textpack-fr-segmentation.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:fr-core:transform-rejections",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "quality",
			taskType: "quality.transform-integrity",
			evaluationKind: "integrity",
			resourceIds: ["fr-core-quality"],
			metricName: "recordsRejected",
			value: quality.recordsRejected,
			unit: "records",
			operator: "eq",
			threshold: 0,
		}),
	];
}

function arabicCoreEvaluationRecords(pack) {
	const quality = payloadJson(pack, "ar-core-quality");
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		evaluationRecord(pack, {
			recordId: "eval:ar-core:iana-language-profile",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "core",
			taskType: "core.language-profile",
			evaluationKind: "resource-conformance",
			resourceIds: ["ar-core-language-profile"],
			metricName: "likelySubtag",
			value: quality.likelySubtag,
			unit: "tag",
			operator: "eq",
			threshold: "ar-Arab-EG",
			observations: {
				ianaFileDate: quality.ianaFileDate,
				ianaSuppressScript: quality.ianaSuppressScript,
			},
		}),
		evaluationRecord(pack, {
			recordId: "eval:ar-core:arabic-orthography-ranges",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "core",
			taskType: "core.orthography",
			evaluationKind: "coverage",
			resourceIds: ["ar-core-orthography"],
			metricName: "arabicScriptRangeCount",
			value: quality.arabicScriptRangeCount,
			unit: "ranges",
			operator: "gte",
			threshold: 1,
		}),
		evaluationRecord(pack, {
			recordId: "eval:ar-core:unicode-punctuation-ranges",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "core",
			taskType: "core.punctuation",
			evaluationKind: "coverage",
			resourceIds: ["ar-core-punctuation"],
			metricName: "punctuationRangeCount",
			value: quality.punctuationRangeCount,
			unit: "ranges",
			operator: "gte",
			threshold: 1,
		}),
		evaluationRecord(pack, {
			recordId: "eval:ar-core:basic-segmentation-baseline",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "core",
			taskType: "core.basic-segmentation",
			evaluationKind: "coverage",
			resourceIds: ["ar-core-basic-segmentation"],
			metricName: "wordRangeCount",
			value: quality.wordRangeCount,
			unit: "ranges",
			operator: "gte",
			threshold: 1,
			observations: {
				graphemeRangeCount: quality.graphemeRangeCount,
				sentenceRangeCount: quality.sentenceRangeCount,
			},
			limitations: [
				"This verifies a basic Unicode UAX #29 segmentation baseline; richer Arabic MSA tokenization resources are provided by textpack-ar-segmentation.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:ar-core:transform-rejections",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "quality",
			taskType: "quality.transform-integrity",
			evaluationKind: "integrity",
			resourceIds: ["ar-core-quality"],
			metricName: "recordsRejected",
			value: quality.recordsRejected,
			unit: "records",
			operator: "eq",
			threshold: 0,
		}),
	];
}

function unicodeCldrNormalizationEvaluationRecords(pack, config) {
	const quality = payloadJson(pack, config.normalizationOutputIds.quality);
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		evaluationRecord(pack, {
			recordId: `eval:${config.languageTag}-normalization:profile-rules`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "normalization",
			taskType: "normalization.profile",
			evaluationKind: "resource-conformance",
			resourceIds: [
				config.normalizationOutputIds.rules,
				config.normalizationOutputIds.profile,
			],
			metricName: "ruleCount",
			value: quality.ruleCount,
			unit: "rules",
			operator: "gte",
			threshold: 3,
			limitations: [
				"This verifies the generated Unicode/CLDR normalization profile, not spelling correction or noisy-text normalization accuracy.",
			],
		}),
		evaluationRecord(pack, {
			recordId: `eval:${config.languageTag}-normalization:unicode-nfc-evidence`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "normalization",
			taskType: "normalization.unicode-nfc-policy",
			evaluationKind: "coverage",
			resourceIds: [config.normalizationOutputIds.profile],
			metricName: "nfcQuickCheckValueCount",
			value: quality.nfcQuickCheckValueCount,
			unit: "aliases",
			operator: "gte",
			threshold: 3,
		}),
		evaluationRecord(pack, {
			recordId: `eval:${config.languageTag}-normalization:cldr-likely-subtag`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "normalization",
			taskType: "normalization.locale-context",
			evaluationKind: "coverage",
			resourceIds: [config.normalizationOutputIds.profile],
			metricName: "likelySubtag",
			value: quality.likelySubtag,
			unit: "tag",
			operator: "eq",
			threshold: config.likelySubtag,
		}),
		evaluationRecord(pack, {
			recordId: `eval:${config.languageTag}-normalization:transform-rejections`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "quality",
			taskType: "quality.transform-integrity",
			evaluationKind: "integrity",
			resourceIds: [config.normalizationOutputIds.quality],
			metricName: "recordsRejected",
			value: quality.recordsRejected,
			unit: "records",
			operator: "eq",
			threshold: 0,
		}),
	];
}

function englishNormalizationEvaluationRecords(pack) {
	return unicodeCldrNormalizationEvaluationRecords(
		pack,
		unicodeCldrLatinProfiles.en,
	);
}

function frenchNormalizationEvaluationRecords(pack) {
	const quality = payloadJson(pack, "fr-normalization-quality");
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		...unicodeCldrNormalizationEvaluationRecords(
			pack,
			unicodeCldrLatinProfiles.fr,
		),
		evaluationRecord(pack, {
			recordId: "eval:fr-normalization:observed-elision-prefixes",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "normalization",
			taskType: "normalization.elision-apostrophe-policy",
			evaluationKind: "coverage",
			resourceIds: [
				"fr-normalization-elision-prefixes",
				"fr-normalization-profile",
			],
			metricName: "elisionPrefixCount",
			value: quality.elisionPrefixCount,
			unit: "prefixes",
			operator: "gte",
			threshold: 10,
			observations: {
				elisionObservationCount: quality.elisionObservationCount,
				apostropheCounts: quality.apostropheCounts,
				tatoebaSentenceRowCount: quality.tatoebaSentenceRowCount,
			},
			limitations: [
				"This verifies observed modern French apostrophe/elision surface policy from Tatoeba; it is not historical or OCR normalization.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:fr-normalization:observed-contraction-forms",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "normalization",
			taskType: "normalization.contraction-surface-policy",
			evaluationKind: "coverage",
			resourceIds: [
				"fr-normalization-contraction-forms",
				"fr-normalization-profile",
			],
			metricName: "contractionFormCount",
			value: quality.contractionFormCount,
			unit: "forms",
			operator: "eq",
			threshold: 4,
			observations: {
				contractionObservationCount: quality.contractionObservationCount,
			},
			limitations: [
				"This records French contraction surface forms observed in the pinned Tatoeba corpus; syntactic expansion lives in syntax/treebank resources.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:fr-normalization:gold-cases",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "normalization",
			taskType: "normalization.gold-cases",
			evaluationKind: "reference-coverage",
			resourceIds: ["fr-normalization-gold-cases", "fr-normalization-profile"],
			metricName: "normalizationGoldCaseCount",
			value: quality.normalizationGoldCaseCount,
			unit: "cases",
			operator: "gte",
			threshold: 10,
		}),
	];
}

function arabicNormalizationEvaluationRecords(pack) {
	const quality = payloadJson(pack, "ar-normalization-quality");
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		evaluationRecord(pack, {
			recordId: "eval:ar-normalization:profile-rules",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "normalization",
			taskType: "normalization.profile",
			evaluationKind: "resource-conformance",
			resourceIds: ["ar-normalization-rules", "ar-normalization-profile"],
			metricName: "ruleCount",
			value: quality.ruleCount,
			unit: "rules",
			operator: "gte",
			threshold: 7,
			limitations: [
				"This verifies the generated Arabic MSA lookup normalization profile, not dialectal normalization, transliteration, spelling correction, OCR cleanup, or noisy-text normalization accuracy.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:ar-normalization:unicode-nfc-evidence",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "normalization",
			taskType: "normalization.unicode-nfc-policy",
			evaluationKind: "coverage",
			resourceIds: ["ar-normalization-profile"],
			metricName: "nfcQuickCheckValueCount",
			value: quality.nfcQuickCheckValueCount,
			unit: "aliases",
			operator: "gte",
			threshold: 3,
		}),
		evaluationRecord(pack, {
			recordId: "eval:ar-normalization:cldr-likely-subtag",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "normalization",
			taskType: "normalization.locale-context",
			evaluationKind: "coverage",
			resourceIds: ["ar-normalization-profile"],
			metricName: "likelySubtag",
			value: quality.likelySubtag,
			unit: "tag",
			operator: "eq",
			threshold: "ar-Arab-EG",
		}),
		evaluationRecord(pack, {
			recordId: "eval:ar-normalization:camel-evidence-codepoints",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "normalization",
			taskType: "normalization.source-evidence",
			evaluationKind: "coverage",
			resourceIds: [
				"ar-normalization-observed-codepoints",
				"ar-normalization-profile",
			],
			metricName: "observedEvidenceCodePointCount",
			value: quality.observedEvidenceCodePointCount,
			unit: "codepoints",
			operator: "gte",
			threshold: 1,
			observations: {
				observedFieldCount: quality.observedFieldCount,
				equivalenceClassCount: quality.equivalenceClassCount,
			},
		}),
		evaluationRecord(pack, {
			recordId: "eval:ar-normalization:transform-rejections",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "quality",
			taskType: "quality.transform-integrity",
			evaluationKind: "integrity",
			resourceIds: ["ar-normalization-quality"],
			metricName: "recordsRejected",
			value: quality.recordsRejected,
			unit: "records",
			operator: "eq",
			threshold: 0,
		}),
	];
}

function unicodeCldrSegmentationEvaluationRecords(pack, config) {
	const quality = payloadJson(pack, config.segmentationOutputIds.quality);
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		evaluationRecord(pack, {
			recordId: `eval:${config.languageTag}-segmentation:grapheme-boundary-properties`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "segmentation",
			taskType: "segmentation.grapheme-profile",
			evaluationKind: "coverage",
			resourceIds: [
				config.segmentationOutputIds.boundaryProperties,
				config.segmentationOutputIds.grapheme,
			],
			metricName: "graphemeRangeCount",
			value: quality.graphemeRangeCount,
			unit: "ranges",
			operator: "gte",
			threshold: 1,
			limitations: [
				"This verifies Unicode grapheme break property coverage, not language-specific dictionary tokenization.",
			],
		}),
		evaluationRecord(pack, {
			recordId: `eval:${config.languageTag}-segmentation:word-boundary-properties`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "segmentation",
			taskType: "segmentation.word-profile",
			evaluationKind: "coverage",
			resourceIds: [
				config.segmentationOutputIds.boundaryProperties,
				config.segmentationOutputIds.word,
			],
			metricName: "wordRangeCount",
			value: quality.wordRangeCount,
			unit: "ranges",
			operator: "gte",
			threshold: 1,
			limitations: [
				"This verifies Unicode word break property coverage, not a trained tokenizer or abbreviation model.",
			],
		}),
		evaluationRecord(pack, {
			recordId: `eval:${config.languageTag}-segmentation:sentence-boundary-properties`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "segmentation",
			taskType: "segmentation.sentence-profile",
			evaluationKind: "coverage",
			resourceIds: [
				config.segmentationOutputIds.boundaryProperties,
				config.segmentationOutputIds.sentence,
			],
			metricName: "sentenceRangeCount",
			value: quality.sentenceRangeCount,
			unit: "ranges",
			operator: "gte",
			threshold: 1,
			limitations: [
				"This verifies Unicode sentence break property coverage; English abbreviation tailoring is out of scope for this component.",
			],
		}),
		evaluationRecord(pack, {
			recordId: `eval:${config.languageTag}-segmentation:cldr-likely-subtag`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "segmentation",
			taskType: "segmentation.locale-context",
			evaluationKind: "coverage",
			resourceIds: [config.segmentationOutputIds.word],
			metricName: "likelySubtag",
			value: quality.likelySubtag,
			unit: "tag",
			operator: "eq",
			threshold: config.likelySubtag,
		}),
		evaluationRecord(pack, {
			recordId: `eval:${config.languageTag}-segmentation:transform-rejections`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "quality",
			taskType: "quality.transform-integrity",
			evaluationKind: "integrity",
			resourceIds: [config.segmentationOutputIds.quality],
			metricName: "recordsRejected",
			value: quality.recordsRejected,
			unit: "records",
			operator: "eq",
			threshold: 0,
		}),
	];
}

function englishSegmentationEvaluationRecords(pack) {
	return unicodeCldrSegmentationEvaluationRecords(
		pack,
		unicodeCldrLatinProfiles.en,
	);
}

function frenchSegmentationEvaluationRecords(pack) {
	const quality = payloadJson(pack, "fr-segmentation-quality");
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		...unicodeCldrSegmentationEvaluationRecords(
			pack,
			unicodeCldrLatinProfiles.fr,
		),
		evaluationRecord(pack, {
			recordId: "eval:fr-segmentation:observed-elision-token-policy",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "segmentation",
			taskType: "segmentation.elision-token-policy",
			evaluationKind: "coverage",
			resourceIds: [
				"fr-token-segmentation-profile",
				"fr-segmentation-elision-prefixes",
			],
			metricName: "elisionPrefixCount",
			value: quality.elisionPrefixCount,
			unit: "prefixes",
			operator: "gte",
			threshold: 10,
			observations: {
				elisionObservationCount: quality.elisionObservationCount,
				tatoebaSentenceRowCount: quality.tatoebaSentenceRowCount,
			},
		}),
		evaluationRecord(pack, {
			recordId: "eval:fr-segmentation:observed-contraction-token-policy",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "quality",
			taskType: "quality.segmentation-contraction-reference-data",
			evaluationKind: "coverage",
			resourceIds: [
				"fr-token-segmentation-profile",
				"fr-segmentation-contraction-forms",
			],
			metricName: "contractionFormCount",
			value: quality.contractionFormCount,
			unit: "forms",
			operator: "eq",
			threshold: 4,
			limitations: [
				"These observed contraction surfaces are reference evidence; the built-in adapter does not execute them as contraction rules.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:fr-segmentation:observed-abbreviation-policy",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "quality",
			taskType: "quality.segmentation-abbreviation-reference-data",
			evaluationKind: "coverage",
			resourceIds: [
				"fr-token-segmentation-profile",
				"fr-segmentation-abbreviations",
			],
			metricName: "abbreviationCandidateCount",
			value: quality.abbreviationCandidateCount,
			unit: "forms",
			operator: "gte",
			threshold: 1,
			limitations: [
				"Abbreviation rows are reference candidates observed in Tatoeba; the built-in adapter delegates sentence boundaries to Intl.Segmenter and does not execute this table.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:fr-segmentation:gold-cases",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "quality",
			taskType: "quality.segmentation-reference-cases",
			evaluationKind: "reference-coverage",
			resourceIds: [
				"fr-token-segmentation-profile",
				"fr-segmentation-gold-cases",
			],
			metricName: "segmentationGoldCaseCount",
			value: quality.segmentationGoldCaseCount,
			unit: "cases",
			operator: "gte",
			threshold: 10,
			limitations: [
				"These generated cases document source-derived expectations; only Unicode segmentation and French elision-prefix splitting are executed by the built-in adapter.",
			],
		}),
	];
}

function scowlInflectionEvaluationRecords(pack) {
	const quality = payloadJson(pack, "en-scowl-inflection-quality");
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		evaluationRecord(pack, {
			recordId: "eval:en-scowl-inflection:lemma-volume",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "morphology",
			taskType: "morphology.inflection-inventory",
			evaluationKind: "coverage",
			resourceIds: [
				"en-scowl-inflection-entries",
				"en-scowl-inflection-morphology-canonical",
			],
			metricName: "uniqueLemmaCount",
			value: quality.uniqueLemmaCount,
			unit: "lemmas",
			operator: "gte",
			threshold: 100000,
			observations: {
				inflectionRowCount: quality.inflectionRowCount,
				uniqueFormCount: quality.uniqueFormCount,
				lookupAnalyzerRowCount: quality.lookupAnalyzerRowCount,
				lookupGeneratorRowCount: quality.lookupGeneratorRowCount,
			},
			limitations: [
				"This verifies SCOWLv2 POS and inflection inventory volume; lookup analysis and generation are source-scope candidate tables, not context-disambiguating morphology.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:en-scowl-inflection:lookup-analyzer-volume",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "morphology",
			taskType: "morphology.lookup-analyzer",
			evaluationKind: "coverage",
			resourceIds: [
				"en-scowl-lookup-analyzer",
				"en-scowl-inflection-morphology-canonical",
			],
			metricName: "lookupAnalyzerRowCount",
			value: quality.lookupAnalyzerRowCount,
			unit: "rows",
			operator: "gte",
			threshold: 100000,
			observations: {
				uniqueFormCount: quality.uniqueFormCount,
				uniqueLemmaCount: quality.uniqueLemmaCount,
			},
			limitations: [
				"Lookup analyzer rows return SCOWLv2 candidate lemmas and POS metadata; they do not perform context disambiguation.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:en-scowl-inflection:lookup-generator-volume",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "morphology",
			taskType: "morphology.lookup-generator",
			evaluationKind: "coverage",
			resourceIds: [
				"en-scowl-lookup-generator",
				"en-scowl-inflection-morphology-canonical",
			],
			metricName: "lookupGeneratorRowCount",
			value: quality.lookupGeneratorRowCount,
			unit: "rows",
			operator: "gte",
			threshold: 100000,
			observations: {
				derivedFormCount: quality.derivedFormCount,
				uniqueLemmaCount: quality.uniqueLemmaCount,
			},
			limitations: [
				"Lookup generator rows return SCOWLv2 candidate forms for a lemma; they do not rank forms by corpus frequency or context.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:en-scowl-inflection:derived-form-volume",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "morphology",
			taskType: "morphology.inflection-inventory",
			evaluationKind: "coverage",
			resourceIds: ["en-scowl-inflection-entries"],
			metricName: "derivedFormCount",
			value: quality.derivedFormCount,
			unit: "forms",
			operator: "gte",
			threshold: 1,
			limitations: [
				"Derived forms come from the pinned SCOWLv2 text export and preserve source release scope.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:en-scowl-inflection:pos-inventory",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "morphology",
			taskType: "morphology.pos-inventory",
			evaluationKind: "resource-conformance",
			resourceIds: ["en-scowl-pos-inventory"],
			metricName: "posInventoryCount",
			value: quality.posInventoryCount,
			unit: "rows",
			operator: "gte",
			threshold: 1,
		}),
		evaluationRecord(pack, {
			recordId: "eval:en-scowl-inflection:transform-rejections",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "quality",
			taskType: "quality.transform-integrity",
			evaluationKind: "integrity",
			resourceIds: ["en-scowl-inflection-quality"],
			metricName: "recordsRejected",
			value: quality.recordsRejected,
			unit: "records",
			operator: "eq",
			threshold: 0,
		}),
	];
}

function lexiqueEvaluationRecords(pack) {
	const quality = payloadJson(pack, "fr-lexique-quality");
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		evaluationRecord(pack, {
			recordId: "eval:fr-lexique:entry-volume",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "lexicon",
			taskType: "lexicon.entry-inventory",
			evaluationKind: "coverage",
			resourceIds: ["fr-lexique-entries", "fr-lexique-lexicon-canonical"],
			metricName: "entryCount",
			value: quality.entryCount,
			unit: "entries",
			operator: "gte",
			threshold: 100000,
			observations: {
				uniqueFormCount: quality.uniqueFormCount,
				uniqueLemmaCount: quality.uniqueLemmaCount,
			},
			limitations: [
				"Lexique 3.83 is an isolated share-alike lexical database and does not unlock the default French composite.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:fr-lexique:lemma-volume",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "lexicon",
			taskType: "lexicon.lemma-inventory",
			evaluationKind: "coverage",
			resourceIds: ["fr-lexique-lemmas", "fr-lexique-lexicon-canonical"],
			metricName: "lemmaCount",
			value: quality.lemmaCount,
			unit: "lemmas",
			operator: "gte",
			threshold: 50000,
		}),
		evaluationRecord(pack, {
			recordId: "eval:fr-lexique:pos-inventory",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "morphology",
			taskType: "morphology.pos-inventory",
			evaluationKind: "resource-conformance",
			resourceIds: [
				"fr-lexique-pos-inventory",
				"fr-lexique-morphology-canonical",
			],
			metricName: "posInventoryCount",
			value: quality.posInventoryCount,
			unit: "rows",
			operator: "gte",
			threshold: 1,
			observations: {
				inflectedVerbRowCount: quality.inflectedVerbRowCount,
				genderCounts: quality.genderCounts,
				numberCounts: quality.numberCounts,
			},
		}),
		evaluationRecord(pack, {
			recordId: "eval:fr-lexique:search-profile",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "search",
			taskType: "search.analyzer-profile",
			evaluationKind: "resource-conformance",
			resourceIds: ["fr-lexique-search-profile"],
			metricName: "searchProfilePresent",
			value: 1,
			unit: "boolean",
			operator: "eq",
			threshold: 1,
			limitations: [
				"The executable adapter uses the profile's Unicode word, casefold, and accent-fold components. Lexique lookup rows are exposed by their own slots and are not silently applied as search filters.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:fr-lexique:transform-rejections",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "quality",
			taskType: "quality.transform-integrity",
			evaluationKind: "integrity",
			resourceIds: ["fr-lexique-quality"],
			metricName: "recordsRejected",
			value: quality.recordsRejected,
			unit: "records",
			operator: "eq",
			threshold: 0,
		}),
	];
}

function frenchUnimorphEvaluationRecords(pack) {
	const quality = payloadJson(pack, "fr-unimorph-quality");
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		evaluationRecord(pack, {
			recordId: "eval:fr-unimorph:entry-volume",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "morphology",
			taskType: "morphology.paradigm-table",
			evaluationKind: "coverage",
			resourceIds: [
				"fr-unimorph-paradigms",
				"fr-unimorph-morphology-canonical",
			],
			metricName: "entryCount",
			value: quality.entryCount,
			unit: "entries",
			operator: "gte",
			threshold: 100000,
			observations: {
				uniqueLemmaCount: quality.uniqueLemmaCount,
				uniqueFormCount: quality.uniqueFormCount,
				featureValueCount: quality.featureValueCount,
			},
			limitations: [
				"UniMorph French is an isolated share-alike paradigm source and does not unlock the default French composite.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:fr-unimorph:lookup-analyzer-volume",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "morphology",
			taskType: "morphology.lookup-analyzer",
			evaluationKind: "coverage",
			resourceIds: [
				"fr-unimorph-lookup-analyzer",
				"fr-unimorph-morphology-canonical",
			],
			metricName: "lookupAnalyzerRowCount",
			value: quality.lookupAnalyzerRowCount,
			unit: "rows",
			operator: "gte",
			threshold: 100000,
		}),
		evaluationRecord(pack, {
			recordId: "eval:fr-unimorph:lookup-generator-volume",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "morphology",
			taskType: "morphology.lookup-generator",
			evaluationKind: "coverage",
			resourceIds: [
				"fr-unimorph-lookup-generator",
				"fr-unimorph-morphology-canonical",
			],
			metricName: "lookupGeneratorRowCount",
			value: quality.lookupGeneratorRowCount,
			unit: "rows",
			operator: "gte",
			threshold: 100000,
		}),
		evaluationRecord(pack, {
			recordId: "eval:fr-unimorph:feature-inventory",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "morphology",
			taskType: "morphology.feature-inventory",
			evaluationKind: "resource-conformance",
			resourceIds: [
				"fr-unimorph-feature-inventory",
				"fr-unimorph-pos-inventory",
			],
			metricName: "featureValueCount",
			value: quality.featureValueCount,
			unit: "features",
			operator: "gte",
			threshold: 1,
			observations: {
				partOfSpeechCount: quality.partOfSpeechCount,
			},
		}),
		evaluationRecord(pack, {
			recordId: "eval:fr-unimorph:transform-rejections",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "quality",
			taskType: "quality.transform-integrity",
			evaluationKind: "integrity",
			resourceIds: ["fr-unimorph-quality"],
			metricName: "recordsRejected",
			value: quality.recordsRejected,
			unit: "records",
			operator: "eq",
			threshold: 0,
		}),
	];
}

function arabicSearchEvaluationRecords(pack) {
	const quality = payloadJson(pack, "ar-search-quality");
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		evaluationRecord(pack, {
			recordId: "eval:ar-search:analyzer-profile",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "search",
			taskType: "search.analyzer-profile",
			evaluationKind: "resource-conformance",
			resourceIds: ["ar-search-profile"],
			metricName: "analyzerProfilePresent",
			value: 1,
			unit: "boolean",
			operator: "eq",
			threshold: 1,
			observations: {
				likelySubtag: quality.likelySubtag,
				analyzerProfileCount: quality.analyzerProfileCount,
			},
			limitations: [
				"This verifies the executable Unicode word and Arabic mark-normalization profile; morphology-aware tokenization, stemming, synonyms, persistent indexing, and ranking are outside its scope.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:ar-search:transform-rejections",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "quality",
			taskType: "quality.transform-integrity",
			evaluationKind: "integrity",
			resourceIds: ["ar-search-quality"],
			metricName: "recordsRejected",
			value: quality.recordsRejected,
			unit: "records",
			operator: "eq",
			threshold: 0,
		}),
	];
}

function wordnetLinkCoverage(pack, ids) {
	const entryRows = tsvDataRows(
		payloadById(pack, ids.lexicalEntries).resourceText,
	);
	const senseRows = tsvDataRows(payloadById(pack, ids.senses).resourceText);
	const synsetRows = tsvDataRows(payloadById(pack, ids.synsets).resourceText);
	const relationRows = tsvDataRows(
		payloadById(pack, ids.relations).resourceText,
	);
	const entryIds = new Set(entryRows.map((row) => row[0] ?? ""));
	const senseIds = new Set(senseRows.map((row) => row[0] ?? ""));
	const synsetIds = new Set(synsetRows.map((row) => row[0] ?? ""));
	let sensesWithKnownEntry = 0;
	let sensesWithKnownSynset = 0;
	for (const row of senseRows) {
		if (entryIds.has(row[1] ?? "")) sensesWithKnownEntry += 1;
		if (synsetIds.has(row[4] ?? "")) sensesWithKnownSynset += 1;
	}
	let relationsWithKnownEndpoints = 0;
	for (const row of relationRows) {
		const scope = row[0] ?? "";
		const ids = scope === "sense" ? senseIds : synsetIds;
		if (ids.has(row[1] ?? "") && ids.has(row[3] ?? "")) {
			relationsWithKnownEndpoints += 1;
		}
	}
	return {
		senseCount: senseRows.length,
		relationCount: relationRows.length,
		sensesWithKnownEntry,
		sensesWithKnownSynset,
		relationsWithKnownEndpoints,
		senseEntryCoverageRatio:
			senseRows.length === 0
				? 0
				: Number((sensesWithKnownEntry / senseRows.length).toFixed(6)),
		senseSynsetCoverageRatio:
			senseRows.length === 0
				? 0
				: Number((sensesWithKnownSynset / senseRows.length).toFixed(6)),
		relationEndpointCoverageRatio:
			relationRows.length === 0
				? 0
				: Number(
						(relationsWithKnownEndpoints / relationRows.length).toFixed(6),
					),
	};
}

function wordnetEvaluationRecords(pack, config) {
	const ids = {
		lexicalEntries: `${config.resourcePrefix}-lexical-entries`,
		quality: `${config.resourcePrefix}-quality`,
		relations: `${config.resourcePrefix}-relations`,
		senses: `${config.resourcePrefix}-senses`,
		synsets: `${config.resourcePrefix}-synsets`,
	};
	const quality = payloadJson(pack, ids.quality);
	const coverage = wordnetLinkCoverage(pack, ids);
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	const relationResult =
		coverage.relationEndpointCoverageRatio === 1 ? "pass" : "warning";
	return [
		evaluationRecord(pack, {
			recordId: `eval:${config.evaluationPrefix}:semantic-integrity`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "lexicon",
			taskType: "lexicon.semantic-integrity",
			evaluationKind: "integrity",
			resourceIds: [ids.lexicalEntries, ids.senses, ids.synsets],
			metricName: "semanticIntegrityRatio",
			value: Math.min(
				quality.lexicalEntrySemanticIntegrityRatio,
				quality.senseSemanticIntegrityRatio,
			),
			unit: "ratio",
			operator: "eq",
			threshold: 1,
			sampleSize: quality.lexicalEntryCount + quality.senseCount,
			observations: {
				lexicalEntrySemanticIntegrityRatio:
					quality.lexicalEntrySemanticIntegrityRatio,
				senseSemanticIntegrityRatio: quality.senseSemanticIntegrityRatio,
			},
		}),
		evaluationRecord(pack, {
			recordId: `eval:${config.evaluationPrefix}:lexical-entry-volume`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "lexicon",
			taskType: "lexicon.lookup",
			evaluationKind: "coverage",
			resourceIds: [ids.lexicalEntries],
			metricName: "lexicalEntryCount",
			value: quality.lexicalEntryCount,
			unit: "entries",
			operator: "gte",
			threshold: 1,
			observations: {
				senseCount: quality.senseCount,
				synsetCount: quality.synsetCount,
			},
		}),
		evaluationRecord(pack, {
			recordId: `eval:${config.evaluationPrefix}:sense-entry-links`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "kb",
			taskType: "kb.sense-linking",
			evaluationKind: "resource-conformance",
			resourceIds: [ids.lexicalEntries, ids.senses],
			metricName: "senseEntryCoverageRatio",
			value: coverage.senseEntryCoverageRatio,
			unit: "ratio",
			operator: "eq",
			threshold: 1,
			sampleSize: coverage.senseCount,
			observations: {
				sensesWithKnownEntry: coverage.sensesWithKnownEntry,
			},
		}),
		evaluationRecord(pack, {
			recordId: `eval:${config.evaluationPrefix}:sense-synset-links`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "kb",
			taskType: "kb.synset-linking",
			evaluationKind: "resource-conformance",
			resourceIds: [ids.senses, ids.synsets],
			metricName: "senseSynsetCoverageRatio",
			value: coverage.senseSynsetCoverageRatio,
			unit: "ratio",
			operator: "eq",
			threshold: 1,
			sampleSize: coverage.senseCount,
			observations: {
				sensesWithKnownSynset: coverage.sensesWithKnownSynset,
			},
		}),
		evaluationRecord(pack, {
			recordId: `eval:${config.evaluationPrefix}:relation-endpoints`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "kb",
			taskType: "kb.semantic-relations",
			evaluationKind: "resource-conformance",
			resourceIds: [ids.relations],
			metricName: "relationEndpointCoverageRatio",
			value: coverage.relationEndpointCoverageRatio,
			unit: "ratio",
			operator: "eq",
			threshold: 1,
			result: relationResult,
			sampleSize: coverage.relationCount,
			observations: {
				relationsWithKnownEndpoints: coverage.relationsWithKnownEndpoints,
				relationCount: quality.relationCount,
			},
			limitations:
				relationResult === "pass"
					? []
					: [
							`Some ${config.sourceLabel} relation endpoints reference ids outside the generated in-package endpoint set.`,
						],
		}),
	];
}

function wikidataArtifactEvaluationRecords(pack, config) {
	const quality = payloadJson(pack, `${config.resourcePrefix}-quality`);
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	const materialized = typeof quality.entityRowCount === "number";
	if (materialized) {
		return [
			evaluationRecord(pack, {
				recordId: `eval:${config.resourcePrefix}:entity-extract`,
				resourceSpecId,
				pipelineId,
				capabilitySlot: "kb",
				taskType: "kb.entity-extract",
				evaluationKind: "resource-conformance",
				resourceIds: [
					`${config.resourcePrefix}-entities`,
					`${config.resourcePrefix}-kb-canonical`,
				],
				metricName: "entityRowCount",
				value: quality.entityRowCount,
				unit: "rows",
				operator: "gte",
				threshold: 1000,
				observations: {
					extractId: quality.extractId,
					endpoint: quality.endpoint,
					extractRetrievedAt: quality.extractRetrievedAt,
					acquisitionMethod: quality.acquisitionMethod,
					derivedFromDumpArtifact: quality.derivedFromDumpArtifact,
					dumpArtifactVersion: quality.dumpArtifactVersion,
				},
				limitations: [
					`The Wikidata ${config.languageName} extract is scoped to declared core entity classes and thresholds; it is not a full Wikidata dump.`,
				],
			}),
			evaluationRecord(pack, {
				recordId: `eval:${config.resourcePrefix}:alias-coverage`,
				resourceSpecId,
				pipelineId,
				capabilitySlot: "kb",
				taskType: "kb.entity-aliases",
				evaluationKind: "coverage",
				resourceIds: [`${config.resourcePrefix}-aliases`],
				metricName: "aliasRowCount",
				value: quality.aliasRowCount,
				unit: "rows",
				operator: "gte",
				threshold: 1000,
				observations: {
					entityRowCount: quality.entityRowCount,
					aliasRowCount: quality.aliasRowCount,
				},
			}),
			evaluationRecord(pack, {
				recordId: `eval:${config.resourcePrefix}:relation-coverage`,
				resourceSpecId,
				pipelineId,
				capabilitySlot: "kb",
				taskType: "kb.entity-relations",
				evaluationKind: "coverage",
				resourceIds: [`${config.resourcePrefix}-relations`],
				metricName: "relationRowCount",
				value: quality.relationRowCount,
				unit: "rows",
				operator: "gte",
				threshold: 1000,
				observations: {
					relationRowCount: quality.relationRowCount,
				},
			}),
		];
	}
	return [
		evaluationRecord(pack, {
			recordId: `eval:${config.resourcePrefix}:artifact-descriptor`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "kb",
			taskType: "kb.entity-artifact",
			evaluationKind: "resource-conformance",
			resourceIds: [`${config.resourcePrefix}-kb-artifact`],
			metricName: "artifactSizeBytes",
			value: quality.sizeBytes,
			unit: "bytes",
			operator: "gte",
			threshold: 1,
			observations: {
				artifactId: quality.artifactId,
				sourceUrl: quality.sourceUrl,
				dumpArtifactVersion: quality.dumpArtifactVersion,
			},
			limitations: [
				`The full Wikidata entity dump for ${config.languageName} KB consumers is artifact-backed and is not available to runtime lookup until explicitly fetched.`,
			],
		}),
		evaluationRecord(pack, {
			recordId: `eval:${config.resourcePrefix}:checksum-sidecar`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "kb",
			taskType: "kb.artifact-checksum",
			evaluationKind: "resource-conformance",
			resourceIds: [`${config.resourcePrefix}-quality`],
			metricName: "upstreamSha1ChecksumPresent",
			value: Number(
				typeof quality.sha1Checksum === "string" &&
					quality.sha1Checksum.startsWith("sha1:"),
			),
			unit: "boolean",
			operator: "eq",
			threshold: 1,
			observations: {
				sha1Checksum: quality.sha1Checksum,
				md5Checksum: quality.md5Checksum,
			},
			limitations: [
				"Wikimedia publishes SHA-1 and MD5 sidecars for this dump; no upstream SHA-256 sidecar was available for this pinned artifact.",
			],
		}),
	];
}

function tatoebaCorpusEvaluationRecords(pack, config) {
	const quality = payloadJson(
		pack,
		`${config.resourcePrefix}-tatoeba-corpus-quality`,
	);
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	const materialized = typeof quality.materializedRowCount === "number";
	return [
		evaluationRecord(pack, {
			recordId: materialized
				? `eval:${config.evaluationPrefix}-corpus:materialized-rows`
				: `eval:${config.evaluationPrefix}-corpus:artifact-descriptor`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "corpus",
			taskType: materialized ? "corpus.materialized-rows" : "corpus.artifact",
			evaluationKind: "resource-conformance",
			resourceIds: [
				materialized
					? `${config.resourcePrefix}-tatoeba-corpus-sentences`
					: `${config.resourcePrefix}-tatoeba-corpus-artifact`,
			],
			metricName: "sentenceRowCount",
			value: materialized ? quality.materializedRowCount : quality.rowCount,
			unit: "rows",
			operator: "gte",
			threshold: config.rowCountThreshold,
			observations: materialized
				? {
						artifactId: quality.artifactId,
						localResourceId: quality.localResourceId,
						localResourceChecksum: quality.localResourceChecksum,
						sourceUrl: quality.sourceUrl,
						sha256Checksum: quality.sha256Checksum,
					}
				: {
						artifactId: quality.artifactId,
						sourceUrl: quality.sourceUrl,
						sha256Checksum: quality.sha256Checksum,
					},
			limitations: materialized
				? [
						`The Tatoeba ${config.languageName} corpus rows are local sentence rows from the detailed export; they are example sentences, not a balanced reference corpus.`,
					]
				: [
						`The Tatoeba ${config.languageName} corpus is artifact-backed and is not available as raw text until explicitly fetched.`,
					],
		}),
		evaluationRecord(pack, {
			recordId: `eval:${config.evaluationPrefix}-corpus:checksum`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "corpus",
			taskType: "corpus.source-artifact-checksum",
			evaluationKind: "integrity",
			resourceIds: [`${config.resourcePrefix}-tatoeba-corpus-quality`],
			metricName: "sha256ChecksumPresent",
			value: Number(
				typeof quality.sha256Checksum === "string" &&
					quality.sha256Checksum.startsWith("sha256:"),
			),
			unit: "boolean",
			operator: "eq",
			threshold: 1,
			observations: {
				sha256Checksum: quality.sha256Checksum,
			},
		}),
	];
}

function tatoebaEnglishCorpusEvaluationRecords(pack) {
	return tatoebaCorpusEvaluationRecords(pack, {
		evaluationPrefix: "tatoeba-en",
		languageName: "English",
		resourcePrefix: "en",
		rowCountThreshold: 1000000,
	});
}

function tatoebaArabicCorpusEvaluationRecords(pack) {
	return tatoebaCorpusEvaluationRecords(pack, {
		evaluationPrefix: "tatoeba-ar",
		languageName: "Arabic",
		resourcePrefix: "ar",
		rowCountThreshold: 50000,
	});
}

function tatoebaFrenchCorpusEvaluationRecords(pack) {
	return tatoebaCorpusEvaluationRecords(pack, {
		evaluationPrefix: "tatoeba-fr",
		languageName: "French",
		resourcePrefix: "fr",
		rowCountThreshold: 500000,
	});
}

function tatoebaParallelEvaluationRecords(pack, config) {
	const quality = payloadJson(
		pack,
		`${config.resourcePrefix}-tatoeba-parallel-quality`,
	);
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	const materialized = quality.languagePairs.every(
		(pair) => typeof pair.localResourceId === "string",
	);
	const parallelResourceIds = pack.resourceStats
		.map((resource) => resource.id)
		.filter((resourceId) =>
			resourceId.startsWith(`${config.resourcePrefix}-tatoeba-parallel-`),
		)
		.filter((resourceId) => !resourceId.includes("quality"))
		.sort();
	return [
		evaluationRecord(pack, {
			recordId: `eval:${config.evaluationPrefix}-parallel:language-pair-coverage`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "parallel",
			taskType: materialized
				? "parallel.materialized-links"
				: "parallel.artifact",
			evaluationKind: "coverage",
			resourceIds: parallelResourceIds,
			metricName: "languagePairCount",
			value: quality.languagePairCount,
			unit: "pairs",
			operator: "gte",
			threshold: config.languagePairThreshold,
			observations: {
				languagePairs: quality.languagePairs,
				artifactIds: quality.artifactIds,
			},
			limitations: materialized
				? [
						"Tatoeba local link tables provide sentence-id alignments; sentence text is resolved from compatible Tatoeba sentence resources.",
					]
				: [
						"Tatoeba link artifacts provide sentence-id alignment tables; sentence text must be resolved from compatible Tatoeba sentence exports.",
					],
		}),
		evaluationRecord(pack, {
			recordId: `eval:${config.evaluationPrefix}-parallel:link-row-volume`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "parallel",
			taskType: "parallel.alignment-links",
			evaluationKind: "coverage",
			resourceIds: parallelResourceIds,
			metricName: "parallelLinkRowCount",
			value: quality.totalLinkRowCount,
			unit: "rows",
			operator: "gte",
			threshold: config.linkRowThreshold,
			observations: {
				languagePairCount: quality.languagePairCount,
				totalArtifactBytes: quality.totalArtifactBytes,
			},
		}),
		evaluationRecord(pack, {
			recordId: `eval:${config.evaluationPrefix}-parallel:checksum`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "parallel",
			taskType: materialized
				? "parallel.source-artifact-checksum"
				: "parallel.artifact-checksum",
			evaluationKind: "integrity",
			resourceIds: [`${config.resourcePrefix}-tatoeba-parallel-quality`],
			metricName: "sha256ChecksumCoverageRatio",
			value: Number(
				quality.languagePairs.every((pair) =>
					pair.sha256Checksum.startsWith("sha256:"),
				),
			),
			unit: "ratio",
			operator: "eq",
			threshold: 1,
			observations: {
				languagePairCount: quality.languagePairCount,
			},
		}),
	];
}

function tatoebaEnglishParallelEvaluationRecords(pack) {
	return tatoebaParallelEvaluationRecords(pack, {
		evaluationPrefix: "tatoeba-en",
		resourcePrefix: "en",
		languagePairThreshold: 8,
		linkRowThreshold: 1000000,
	});
}

function tatoebaArabicParallelEvaluationRecords(pack) {
	return tatoebaParallelEvaluationRecords(pack, {
		evaluationPrefix: "tatoeba-ar",
		resourcePrefix: "ar",
		languagePairThreshold: 4,
		linkRowThreshold: 50000,
	});
}

function tatoebaFrenchParallelEvaluationRecords(pack) {
	return tatoebaParallelEvaluationRecords(pack, {
		evaluationPrefix: "tatoeba-fr",
		resourcePrefix: "fr",
		languagePairThreshold: 4,
		linkRowThreshold: 500000,
	});
}

export function evaluationRecordsForPack(pack, context) {
	if (isDistributionPack(pack)) {
		const packageByName = new Map(
			context.packs.map((candidate) => [candidate.packageName, candidate]),
		);
		return pack.components.flatMap((component) => {
			const input = packageByName.get(component.packageName);
			expect(
				input !== undefined,
				`${pack.packageName} evaluation input ${component.packageName} is missing.`,
			);
			return evaluationRecordsForPack(input, context).map((record) => ({
				...record,
				recordId: `${record.recordId}:distribution:${pack.packageId}`,
				packageName: pack.packageName,
				tier:
					pack.capabilitySlots.find(
						(slot) => slot.slot === record.capabilitySlot,
					)?.tier ?? record.tier,
				limitations: [
					...record.limitations,
					`Evaluated in internal build unit ${component.packageName}; the referenced payload is shipped directly in ${pack.packageName}.`,
				],
			}));
		});
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-language-registry") {
		return languageRegistryEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-unicode-17") {
		return unicodeFoundationEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-cldr-core") {
		return cldrFoundationEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-ar-msa-morphology") {
		return camelMorphEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-ar-normalization") {
		return arabicNormalizationEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-ar-core") {
		return arabicCoreEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-ar-search") {
		return arabicSearchEvaluationRecords(pack);
	}
	if (
		pack.packageName === "@ismail-elkorchi/textpack-en-syntax-ud-gumreddit" ||
		pack.packageName === "@ismail-elkorchi/textpack-ar-syntax-ud-nyuad-sa" ||
		pack.packageName === "@ismail-elkorchi/textpack-fr-syntax-ud-gsd-sa"
	) {
		return udSyntaxEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-en-lexicon") {
		return englishWordnetLexiconEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-en-wordlist-esdb") {
		return esdbWordlistEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-en-core") {
		return englishCoreEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-fr-core") {
		return frenchCoreEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-en-normalization") {
		return englishNormalizationEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-en-segmentation") {
		return englishSegmentationEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-fr-normalization") {
		return frenchNormalizationEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-fr-segmentation") {
		return frenchSegmentationEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-en-inflection-scowl") {
		return scowlInflectionEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-fr-lexique-sa") {
		return lexiqueEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-fr-unimorph-sa") {
		return frenchUnimorphEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-wordnet-en") {
		return wordnetEvaluationRecords(pack, {
			evaluationPrefix: "wordnet-en",
			resourcePrefix: "wordnet-en",
			sourceLabel: "Open English WordNet",
		});
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-wordnet-ar") {
		return wordnetEvaluationRecords(pack, {
			evaluationPrefix: "wordnet-ar",
			resourcePrefix: "wordnet-ar",
			sourceLabel: "Arabic WordNet 4.1.0",
		});
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-wikidata-ar") {
		return wikidataArtifactEvaluationRecords(pack, {
			languageName: "Arabic",
			resourcePrefix: "wikidata-ar",
		});
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-wikidata-en") {
		return wikidataArtifactEvaluationRecords(pack, {
			languageName: "English",
			resourcePrefix: "wikidata-en",
		});
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-wikidata-fr") {
		return wikidataArtifactEvaluationRecords(pack, {
			languageName: "French",
			resourcePrefix: "wikidata-fr",
		});
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-en-corpus") {
		return tatoebaEnglishCorpusEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-en-parallel") {
		return tatoebaEnglishParallelEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-ar-corpus") {
		return tatoebaArabicCorpusEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-ar-parallel") {
		return tatoebaArabicParallelEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-fr-corpus") {
		return tatoebaFrenchCorpusEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-fr-parallel") {
		return tatoebaFrenchParallelEvaluationRecords(pack);
	}
	return [];
}

export function evaluationReportFor(pack, context) {
	const records = evaluationRecordsForPack(pack, context).sort((left, right) =>
		left.recordId.localeCompare(right.recordId),
	);
	return evaluationReport(pack, context, records);
}

export function qualityReportFor(pack, context) {
	return {
		schemaVersion: "1",
		generatedAt: context.generatedAt,
		generatedBy: GENERATED_BY,
		mode: context.mode,
		packageName: pack.packageName,
		publishable: pack.publishable,
		publishability: pack.publishability,
		supportLevel: pack.supportLevel,
		resourceCount: pack.resourceStats.length,
		acceptedRecordCount: pack.resourceStats.reduce(
			(total, resource) => total + resource.nonEmptyLineCount,
			0,
		),
		rejectedRecordCount: 0,
		warnings: pack.knownGaps,
		resources: pack.resourceStats,
		resourceSpecIds: pack.resourceSpecIds ?? [],
		capabilitySlots: pack.capabilitySlots,
		resourcePaths: pack.resourceStats.map((resource) => resource.path),
		artifactRequirements: [],
		licenseWarnings: [],
	};
}

export function coverageReportFor(pack, context, evaluationRecords) {
	const capabilityEvidence = pack.capabilitySlots.map((slot) => {
		const slotEvaluationRecords = evaluationRecords.filter(
			(record) => record.capabilitySlot === slot.slot,
		);
		const evaluationRecordIds = sorted(
			slotEvaluationRecords.map((record) => record.recordId),
		);
		const resourceIds = slot.resourceIds ?? [];
		return {
			slot: slot.slot,
			status: slot.status,
			tier: slot.tier,
			resourceIds,
			evaluationRecordIds,
			evidenceLevel: coverageEvidenceLevel(
				slot,
				slotEvaluationRecords,
				resourceIds,
			),
			limitations: sorted(
				new Set(
					evaluationRecords
						.filter((record) => record.capabilitySlot === slot.slot)
						.flatMap((record) => record.limitations),
				),
			),
		};
	});
	return {
		schemaVersion: "1",
		generatedAt: context.generatedAt,
		generatedBy: GENERATED_BY,
		mode: context.mode,
		packageName: pack.packageName,
		publishable: pack.publishable,
		publishability: pack.publishability,
		targets: pack.manifest.targets,
		resourceKinds: sorted(
			new Set(pack.manifest.resources.map((resource) => resource.kind)),
		),
		resourceCoverage: pack.resourceStats.map((resource) => ({
			resourceId: resource.id,
			kind: resource.kind,
			path: resource.path,
			byteLength: resource.byteLength,
			nonEmptyLineCount: resource.nonEmptyLineCount,
			checksum: resource.checksum,
			sizeClass: resource.sizeClass,
			...(resource.resourceSpecId === undefined
				? {}
				: {
						resourceSpecId: resource.resourceSpecId,
						pipelineId: resource.pipelineId,
						pipelineVersion: resource.pipelineVersion,
					}),
		})),
		capabilities: capabilities(pack.manifest),
		capabilitySlots: pack.capabilitySlots,
		capabilityEvidence,
		coverageStatus:
			evaluationRecords.length > 0 ? "evaluated" : "declared-only",
		evaluationRecordIds: evaluationRecords.map((record) => record.recordId),
		gapNotes: pack.manifest.gapNotes ?? [],
		knownGaps: pack.knownGaps,
	};
}

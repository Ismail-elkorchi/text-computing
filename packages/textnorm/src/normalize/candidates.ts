import type { Score, TextDocument } from "@ismail-elkorchi/textdoc";
import { caseFold } from "@ismail-elkorchi/textfacts/casefold";
import {
	rewriteText,
	spellingCandidates,
	transliterate,
} from "@ismail-elkorchi/textfst";
import { lookup } from "@ismail-elkorchi/textlex";
import { rewriteView } from "@ismail-elkorchi/textrules";
import { findAllSpans, utf16SpanRef } from "../internal/spans.js";
import {
	collapseRepeatedCharacters,
	wordTokenSpans,
} from "../internal/strings.js";
import { candidateScore, candidateText } from "../spell/map.js";
import { sortCandidates } from "../spell/rank.js";
import { normalizationEvidence } from "../view/evidence.js";
import {
	type ResolvedCandidateOptions,
	resolveCandidateOptions,
} from "./options.js";
import type {
	CandidateOptions,
	ConfusionEntry,
	HistoricalSpellingMap,
	NormalizationCandidate,
	NormalizationMode,
	SpellingMap,
	TransliterationMap,
} from "./types.js";

function score(kind: Score["kind"], value: number, scale?: string): Score {
	return Object.freeze({
		kind,
		value,
		...(scale !== undefined ? { scale } : {}),
	});
}

function candidate(
	options: ResolvedCandidateOptions,
	start: number,
	end: number,
	value: string,
	kind: NormalizationMode,
	seed: {
		readonly score?: Score;
		readonly resourceIds?: readonly string[];
		readonly ruleIds?: readonly string[];
		readonly fstIds?: readonly string[];
		readonly lexicalIds?: readonly string[];
		readonly exactness?: "E0" | "E1" | "E2" | "E3";
	},
): NormalizationCandidate {
	const evidence = normalizationEvidence({
		mode: kind,
		inputViewId: options.sourceView.id,
		resources: options.resources,
		...(seed.resourceIds !== undefined
			? { resourceIds: seed.resourceIds }
			: {}),
		...(seed.ruleIds !== undefined ? { ruleIds: seed.ruleIds } : {}),
		...(seed.fstIds !== undefined ? { fstIds: seed.fstIds } : {}),
		...(seed.lexicalIds !== undefined ? { lexicalIds: seed.lexicalIds } : {}),
		...(options.producer !== undefined ? { producer: options.producer } : {}),
		...(options.packageVersion !== undefined
			? { version: options.packageVersion }
			: {}),
		optionsHash: options.optionsHash,
		...(seed.exactness !== undefined ? { exactness: seed.exactness } : {}),
	});
	return Object.freeze({
		source: utf16SpanRef(options.sourceView.id, start, end),
		candidate: value,
		kind,
		evidence,
		...(seed.score !== undefined ? { score: seed.score } : {}),
	});
}

function fromMaps(
	options: ResolvedCandidateOptions,
	maps: readonly SpellingMap[] | undefined,
	kind: NormalizationMode,
	scan: "word" | "text" = "word",
): readonly NormalizationCandidate[] {
	const output: NormalizationCandidate[] = [];
	for (const map of maps ?? []) {
		if (scan === "text") {
			for (const entry of map.entries) {
				for (const span of findAllSpans(
					options.sourceView.text,
					entry.source,
				)) {
					for (const replacement of entry.candidates) {
						const value = candidateText(replacement);
						if (value === entry.source) continue;
						const replacementScore = candidateScore(replacement);
						output.push(
							candidate(
								options,
								span.start,
								span.end,
								value,
								entry.kind ?? kind,
								{
									resourceIds: [
										map.id,
										...(entry.sourceId !== undefined ? [entry.sourceId] : []),
									],
									...(replacementScore !== undefined
										? { score: replacementScore }
										: {}),
								},
							),
						);
					}
				}
			}
			continue;
		}
		for (const token of wordTokenSpans(options.sourceView.text)) {
			for (const entry of map.bySource[token.text] ?? []) {
				for (const replacement of entry.candidates) {
					const value = candidateText(replacement);
					if (value === token.text) continue;
					const replacementScore = candidateScore(replacement);
					output.push(
						candidate(
							options,
							token.span.start,
							token.span.end,
							value,
							entry.kind ?? kind,
							{
								resourceIds: [
									map.id,
									...(entry.sourceId !== undefined ? [entry.sourceId] : []),
								],
								...(replacementScore !== undefined
									? { score: replacementScore }
									: {}),
							},
						),
					);
				}
			}
		}
	}
	return output;
}

function fromLexicons(
	options: ResolvedCandidateOptions,
	kind: NormalizationMode,
): readonly NormalizationCandidate[] {
	const output: NormalizationCandidate[] = [];
	for (const token of wordTokenSpans(options.sourceView.text)) {
		for (const lexicon of options.resources.lexicons ?? []) {
			for (const match of lookup(lexicon, token.text, {
				mode: ["exact", "normalized", "casefold", "fuzzy"],
				maxDistance: options.maxEditDistance,
				maxResults: options.maxCandidatesPerSpan,
			})) {
				const value = match.canonical ?? match.form;
				if (value === token.text) continue;
				output.push(
					candidate(options, token.span.start, token.span.end, value, kind, {
						lexicalIds: [lexicon.id, match.entryId],
						score: score("rank", match.rank),
					}),
				);
			}
		}
	}
	return output;
}

function fromFsts(
	options: ResolvedCandidateOptions,
	kind: NormalizationMode,
): readonly NormalizationCandidate[] {
	const output: NormalizationCandidate[] = [];
	for (const token of wordTokenSpans(options.sourceView.text)) {
		for (const fst of options.resources.fsts ?? []) {
			for (const spelling of spellingCandidates(fst, token.text, {
				maxDistance: options.maxEditDistance,
				maxResults: options.maxCandidatesPerSpan,
			})) {
				if (spelling.candidate === token.text) continue;
				output.push(
					candidate(
						options,
						token.span.start,
						token.span.end,
						spelling.candidate,
						kind,
						{
							fstIds: [fst.id],
							...(spelling.weight === undefined
								? {}
								: { score: score("cost", spelling.weight, "fst-weight") }),
						},
					),
				);
			}
		}
	}
	return output;
}

function fromRewriteFsts(
	options: ResolvedCandidateOptions,
	kind: NormalizationMode,
): readonly NormalizationCandidate[] {
	const output: NormalizationCandidate[] = [];
	for (const token of wordTokenSpans(options.sourceView.text)) {
		for (const fst of options.resources.rewriteFsts ?? []) {
			for (const value of rewriteText(fst, token.text).slice(
				0,
				options.maxCandidatesPerSpan,
			)) {
				if (value === token.text) continue;
				output.push(
					candidate(options, token.span.start, token.span.end, value, kind, {
						fstIds: [fst.id],
					}),
				);
			}
		}
	}
	return output;
}

function fromRuleSets(
	doc: TextDocument,
	options: ResolvedCandidateOptions,
): readonly NormalizationCandidate[] {
	const output: NormalizationCandidate[] = [];
	for (const ruleSet of options.resources.ruleSets ?? []) {
		const targetViewId = `${options.sourceView.id}:textrules:${ruleSet.id}`;
		const rewritten = rewriteView(doc, ruleSet, {
			sourceViewId: options.sourceView.id,
			targetViewId,
			viewKind: "normalized",
			validate: false,
		});
		const target = rewritten.views[targetViewId];
		if (target === undefined || target.text === options.sourceView.text)
			continue;
		output.push(
			candidate(
				options,
				0,
				options.sourceView.text.length,
				target.text,
				"spelling",
				{
					ruleIds: [ruleSet.id],
				},
			),
		);
	}
	return output;
}

function repeated(
	options: ResolvedCandidateOptions,
): readonly NormalizationCandidate[] {
	const output: NormalizationCandidate[] = [];
	for (const token of wordTokenSpans(options.sourceView.text)) {
		const value = collapseRepeatedCharacters(
			token.text,
			options.repeatedCharacterMaxRun,
		);
		if (value !== token.text) {
			output.push(
				candidate(
					options,
					token.span.start,
					token.span.end,
					value,
					"spelling",
					{
						score: score(
							"cost",
							token.text.length - value.length,
							"removed-repeated-characters",
						),
						exactness: "E0",
					},
				),
			);
		}
	}
	return output;
}

function casing(
	options: ResolvedCandidateOptions,
): readonly NormalizationCandidate[] {
	const policy = options.casePolicy;
	if (policy === undefined) return [];
	const output: NormalizationCandidate[] = [];
	for (const token of wordTokenSpans(options.sourceView.text)) {
		const value =
			policy === "casefold"
				? caseFold(token.text)
				: policy === "lowercase"
					? token.text.toLocaleLowerCase("und")
					: token.text.toLocaleUpperCase("und");
		if (value !== token.text) {
			output.push(
				candidate(options, token.span.start, token.span.end, value, "casing", {
					score: score("cost", 0, policy),
					exactness: "E0",
				}),
			);
		}
	}
	return output;
}

function confusion(
	options: ResolvedCandidateOptions,
): readonly NormalizationCandidate[] {
	const output: NormalizationCandidate[] = [];
	for (const table of options.resources.confusionTables ?? []) {
		for (const entry of table.entries) {
			if ((entry.level ?? "character") === "word") {
				for (const token of wordTokenSpans(options.sourceView.text)) {
					if (token.text !== entry.source) continue;
					output.push(
						confusionCandidate(
							options,
							token.span.start,
							token.span.end,
							entry,
							table.id,
						),
					);
				}
			} else {
				for (const span of findAllSpans(
					options.sourceView.text,
					entry.source,
				)) {
					output.push(
						confusionCandidate(options, span.start, span.end, entry, table.id),
					);
				}
			}
		}
	}
	return output;
}

function confusionCandidate(
	options: ResolvedCandidateOptions,
	start: number,
	end: number,
	entry: ConfusionEntry,
	tableId: string,
): NormalizationCandidate {
	const value = entry.replacement;
	const entryScore =
		entry.probability !== undefined
			? score("probability", entry.probability, "confusion-probability")
			: score("cost", entry.cost ?? 1, "confusion-cost");
	return candidate(options, start, end, value, "ocr", {
		resourceIds: [tableId],
		score: entryScore,
	});
}

function transliterationMaps(
	options: ResolvedCandidateOptions,
): readonly NormalizationCandidate[] {
	const output: NormalizationCandidate[] = [];
	for (const map of options.resources.transliterationMaps ?? []) {
		output.push(...fromTransliterationMap(options, map));
	}
	for (const token of wordTokenSpans(options.sourceView.text)) {
		for (const fst of options.resources.transliterationFsts ?? []) {
			for (const value of transliterate(fst, token.text, {
				maxResults: options.maxCandidatesPerSpan,
			})) {
				if (value === token.text) continue;
				output.push(
					candidate(
						options,
						token.span.start,
						token.span.end,
						value,
						"transliteration",
						{
							fstIds: [fst.id],
						},
					),
				);
			}
		}
	}
	return output;
}

function fromTransliterationMap(
	options: ResolvedCandidateOptions,
	map: TransliterationMap,
): readonly NormalizationCandidate[] {
	const output: NormalizationCandidate[] = [];
	for (const [source, entries] of Object.entries(map.bySource)) {
		for (const span of findAllSpans(options.sourceView.text, source)) {
			for (const entry of entries) {
				output.push(
					candidate(
						options,
						span.start,
						span.end,
						entry.target,
						"transliteration",
						{
							resourceIds: [map.id],
							...(entry.cost === undefined
								? {}
								: { score: score("cost", entry.cost, "transliteration-cost") }),
						},
					),
				);
			}
		}
	}
	return output;
}

function abbreviation(
	options: ResolvedCandidateOptions,
	kind: NormalizationMode,
): readonly NormalizationCandidate[] {
	const output: NormalizationCandidate[] = [];
	for (const table of options.resources.abbreviationTables ?? []) {
		for (const entry of table.entries) {
			for (const span of findAllSpans(options.sourceView.text, entry.form)) {
				for (const expansion of entry.expansions) {
					output.push(
						candidate(options, span.start, span.end, expansion, kind, {
							resourceIds: [table.id],
						}),
					);
				}
			}
		}
	}
	return output;
}

function structural(
	options: ResolvedCandidateOptions,
): readonly NormalizationCandidate[] {
	const output: NormalizationCandidate[] = [];
	for (const resource of options.resources.structuralResources ?? []) {
		const kind = resource.kind ?? "spelling";
		for (const entry of resource.entries) {
			const values = entry.candidates ?? [
				entry.target ?? entry.replacement ?? "",
			];
			for (const span of findAllSpans(options.sourceView.text, entry.source)) {
				for (const value of values.filter(
					(item) => item.length > 0 && item !== entry.source,
				)) {
					output.push(
						candidate(options, span.start, span.end, value, kind, {
							resourceIds: [resource.id],
							...(entry.cost === undefined
								? {}
								: { score: score("cost", entry.cost) }),
						}),
					);
				}
			}
		}
	}
	return output;
}

function hyphenation(
	options: ResolvedCandidateOptions,
): readonly NormalizationCandidate[] {
	if (options.repairLineBreakHyphenation !== true) return [];
	const output: NormalizationCandidate[] = [];
	const pattern = /(\p{Letter}+)-\r?\n(\p{Letter}+)/gu;
	for (const match of options.sourceView.text.matchAll(pattern)) {
		output.push(
			candidate(
				options,
				match.index,
				match.index + match[0].length,
				`${match[1]}${match[2]}`,
				"spacing",
				{
					score: score("cost", 1, "hyphen-linebreak"),
					exactness: "E0",
				},
			),
		);
	}
	return output;
}

function splitMerge(
	options: ResolvedCandidateOptions,
): readonly NormalizationCandidate[] {
	return fromMaps(options, options.resources.spacingMaps, "spacing", "text");
}

function modeCandidates(
	doc: TextDocument,
	options: ResolvedCandidateOptions,
): readonly NormalizationCandidate[] {
	const output: NormalizationCandidate[] = [];
	for (const mode of options.modes) {
		if (mode === "spelling") {
			output.push(
				...fromMaps(options, options.resources.spellingMaps, "spelling"),
				...fromLexicons(options, "spelling"),
				...fromFsts(options, "spelling"),
				...fromRewriteFsts(options, "spelling"),
				...fromRuleSets(doc, options),
			);
		} else if (mode === "historical") {
			output.push(
				...fromMaps(
					options,
					options.resources.historicalSpellingMaps as
						| readonly HistoricalSpellingMap[]
						| undefined,
					"historical",
				),
				...fromMaps(options, options.resources.orthographyMaps, "historical"),
				...abbreviation(options, "historical"),
			);
		} else if (mode === "ocr") {
			output.push(
				...confusion(options),
				...fromLexicons(options, "ocr"),
				...fromFsts(options, "ocr"),
				...hyphenation(options),
			);
		} else if (mode === "dialect") {
			output.push(
				...fromMaps(options, options.resources.dialectMaps, "dialect", "text"),
			);
		} else if (mode === "transliteration") {
			output.push(...transliterationMaps(options));
		} else if (mode === "punctuation") {
			output.push(
				...fromMaps(
					options,
					options.resources.punctuationMaps,
					"punctuation",
					"text",
				),
			);
		} else if (mode === "spacing") {
			output.push(...splitMerge(options), ...hyphenation(options));
		} else if (mode === "casing") {
			output.push(...casing(options));
		}
	}
	if (options.modes.includes("spelling")) output.push(...repeated(options));
	output.push(...structural(options));
	return output;
}

function enforcePerSpanLimit(
	candidates: readonly NormalizationCandidate[],
	limit: number,
): readonly NormalizationCandidate[] {
	const counts = new Map<string, number>();
	return Object.freeze(
		candidates.filter((candidate) => {
			const key = `${candidate.source.viewId}:${candidate.source.span.start}:${candidate.source.span.end}`;
			const count = counts.get(key) ?? 0;
			if (count >= limit) return false;
			counts.set(key, count + 1);
			return true;
		}),
	);
}

export function candidateNormalizations(
	doc: TextDocument,
	options: CandidateOptions = {},
): readonly NormalizationCandidate[] {
	const resolved = resolveCandidateOptions(doc, options);
	const generated = enforcePerSpanLimit(
		sortCandidates(modeCandidates(doc, resolved)),
		resolved.maxCandidatesPerSpan,
	).slice(0, resolved.maxCandidates);
	const reranked = resolved.reranker?.(generated, {
		document: doc,
		sourceView: resolved.sourceView,
		modes: resolved.modes,
	});
	return sortCandidates(reranked ?? generated).slice(0, resolved.maxCandidates);
}

import {
	type Annotation,
	addAnnotation,
	addLayer,
	type TextDocument,
	updateAnnotation,
} from "@ismail-elkorchi/textdoc";
import type { SpanRef } from "@ismail-elkorchi/textdoc/span";
import { segmentGraphemes } from "@ismail-elkorchi/textfacts/segment";
import { type KeyPolicy, keyForText } from "../internal/normalize.js";
import { lookup } from "../lexicon/lookup.js";
import type {
	LexicalEntry,
	LexicalMatch,
	Lexicon,
	LookupMode,
	LookupOptions,
} from "../lexicon/types.js";
import { createLexiconEvidence } from "./evidence.js";
import { lexicalAnnotationId } from "./ids.js";

export interface AnnotateLexiconOptions {
	readonly layerId?: string;
	readonly layerType?: string;
	readonly annotationType?: string;
	readonly viewId?: string;
	readonly producer?: string;
	readonly packageVersion?: string;
	readonly resourceIds?: readonly string[];
	readonly matchOptions?: LookupOptions;
	readonly onExisting?: "replace" | "skip" | "reject";
}

interface RawHit {
	readonly match: LexicalMatch;
	readonly start: number;
	readonly end: number;
	readonly rank: number;
}

interface TransformedText {
	readonly text: string;
	readonly starts: readonly number[];
	readonly ends: readonly number[];
}

function lookupModes(options: LookupOptions): readonly LookupMode[] {
	const mode = options.mode ?? "exact";
	return Object.freeze(Array.isArray(mode) ? [...mode] : [mode]);
}

function entryForms(entry: LexicalEntry): readonly string[] {
	return Object.freeze([
		...entry.forms,
		...(entry.aliases ?? []),
		...(entry.variants ?? []),
		...(entry.inflectedForms ?? []),
	]);
}

function keyPolicyForMode(
	mode: "exact" | "normalized" | "casefold",
	options: LookupOptions,
): KeyPolicy {
	if (mode === "exact") return {};
	if (mode === "normalized") {
		return { normalization: options.normalization ?? "NFC" };
	}
	return {
		normalization: options.normalization ?? "NFC",
		casefold: true,
	};
}

function transformText(text: string, policy: KeyPolicy): TransformedText {
	let transformed = "";
	const starts: number[] = [];
	const ends: number[] = [];
	for (const span of segmentGraphemes(text)) {
		const source = text.slice(span.startCU, span.endCU);
		const key = keyForText(source, policy);
		for (let index = 0; index < key.length; index += 1) {
			starts.push(span.startCU);
			ends.push(span.endCU);
		}
		transformed += key;
	}
	return {
		text: transformed,
		starts: Object.freeze(starts),
		ends: Object.freeze(ends),
	};
}

function transformedSourceSpan(
	transformed: TransformedText,
	start: number,
	end: number,
): { start: number; end: number } | undefined {
	const sourceStart = transformed.starts[start];
	const sourceEnd = transformed.ends[end - 1];
	if (sourceStart === undefined || sourceEnd === undefined) return undefined;
	return { start: sourceStart, end: sourceEnd };
}

function addLookupHits(
	hits: RawHit[],
	seen: Set<string>,
	lexicon: Lexicon,
	sourceText: string,
	start: number,
	end: number,
	mode: LookupMode,
	options: LookupOptions,
): void {
	const { maxResults: _maxResults, ...lookupOptions } = options;
	for (const match of lookup(lexicon, sourceText, {
		...lookupOptions,
		mode,
	})) {
		const key = `${mode}\u0000${start}\u0000${end}\u0000${match.entryId}\u0000${match.form}`;
		if (seen.has(key)) continue;
		seen.add(key);
		const rank = hits.length;
		hits.push({
			match: {
				...match,
				matchedText: sourceText,
				rank,
				start,
				end,
			},
			start,
			end,
			rank,
		});
	}
}

function collectSurfaceModeHits(
	text: string,
	lexicon: Lexicon,
	mode: "exact" | "normalized" | "casefold",
	options: LookupOptions,
	hits: RawHit[],
	seen: Set<string>,
): void {
	const policy = keyPolicyForMode(mode, options);
	const transformed = transformText(text, policy);
	const keys = new Set<string>();
	for (const entry of lexicon.entries) {
		for (const form of entryForms(entry)) {
			const key = keyForText(form, policy);
			if (key.length > 0) keys.add(key);
		}
	}
	for (const key of [...keys].sort((left, right) =>
		left.localeCompare(right),
	)) {
		let transformedStart = transformed.text.indexOf(key);
		while (transformedStart >= 0) {
			const transformedEnd = transformedStart + key.length;
			const sourceSpan = transformedSourceSpan(
				transformed,
				transformedStart,
				transformedEnd,
			);
			if (sourceSpan !== undefined) {
				addLookupHits(
					hits,
					seen,
					lexicon,
					text.slice(sourceSpan.start, sourceSpan.end),
					sourceSpan.start,
					sourceSpan.end,
					mode,
					options,
				);
			}
			transformedStart = transformed.text.indexOf(
				key,
				transformedStart + Math.max(1, key.length),
			);
		}
	}
}

function maxEntryFormLength(lexicon: Lexicon): number {
	let maxLength = 0;
	for (const entry of lexicon.entries) {
		for (const form of entryForms(entry)) {
			maxLength = Math.max(maxLength, form.length);
		}
	}
	return maxLength;
}

function collectWindowModeHits(
	text: string,
	lexicon: Lexicon,
	modes: readonly LookupMode[],
	options: LookupOptions,
	hits: RawHit[],
	seen: Set<string>,
): void {
	const maxDistance = options.maxDistance ?? 1;
	const maxLength = maxEntryFormLength(lexicon) + maxDistance;
	if (maxLength <= 0) return;
	for (let start = 0; start < text.length; start += 1) {
		const limit = Math.min(text.length, start + maxLength);
		for (let end = start + 1; end <= limit; end += 1) {
			const sourceText = text.slice(start, end);
			for (const mode of modes) {
				addLookupHits(
					hits,
					seen,
					lexicon,
					sourceText,
					start,
					end,
					mode,
					options,
				);
			}
		}
	}
}

function ensureLayer(
	doc: TextDocument,
	layerId: string,
	layerType: string,
	viewId: string,
): TextDocument {
	if (doc.layers[layerId] !== undefined) return doc;
	return addLayer(doc, {
		id: layerId,
		type: layerType,
		viewId,
		annotations: {},
	});
}

function findRawHits(
	text: string,
	lexicon: Lexicon,
	options: LookupOptions,
): RawHit[] {
	const hits: RawHit[] = [];
	const seen = new Set<string>();
	const modes = lookupModes(options);
	for (const mode of modes) {
		if (mode === "exact" || mode === "normalized" || mode === "casefold") {
			collectSurfaceModeHits(text, lexicon, mode, options, hits, seen);
		}
	}
	const windowModes = modes.filter(
		(mode) => mode === "prefix" || mode === "suffix" || mode === "fuzzy",
	);
	if (windowModes.length > 0) {
		collectWindowModeHits(text, lexicon, windowModes, options, hits, seen);
	}
	const sorted = hits.sort(
		(left, right) =>
			left.start - right.start ||
			right.end - left.end ||
			left.match.mode.localeCompare(right.match.mode) ||
			left.match.entryId.localeCompare(right.match.entryId),
	);
	return sorted.slice(0, options.maxResults ?? sorted.length);
}

function annotationValue(match: LexicalMatch) {
	return {
		entryId: match.entryId,
		form: match.form,
		...(match.canonical !== undefined ? { canonical: match.canonical } : {}),
		matchedText: match.matchedText,
		mode: match.mode,
		score: match.score,
		rank: match.rank,
		...(match.labels !== undefined ? { labels: match.labels } : {}),
		...(match.source !== undefined ? { source: match.source } : {}),
		...("entityType" in match.entry &&
		typeof match.entry.entityType === "string"
			? { entityType: match.entry.entityType }
			: {}),
		...("kbId" in match.entry && typeof match.entry.kbId === "string"
			? { kbId: match.entry.kbId }
			: {}),
	};
}

function makeAnnotation(
	hit: RawHit,
	layerId: string,
	annotationType: string,
	viewId: string,
	options: AnnotateLexiconOptions,
): Annotation {
	const span: SpanRef = {
		viewId,
		span: {
			start: hit.start,
			end: hit.end,
			unit: "utf16-code-unit",
		},
	};
	return {
		id: lexicalAnnotationId(
			layerId,
			hit.match.entryId,
			hit.start,
			hit.end,
			hit.rank,
		),
		layer: layerId,
		type: annotationType,
		spans: [span],
		value: annotationValue(hit.match),
		...(hit.match.features !== undefined
			? { features: hit.match.features }
			: {}),
		evidence: createLexiconEvidence({
			producer: options.producer,
			packageVersion: options.packageVersion,
			resourceIds: options.resourceIds,
			inputViewIds: [viewId],
		}),
	};
}

export function annotateLexicon<TEntry extends LexicalEntry>(
	doc: TextDocument,
	lexicon: Lexicon<TEntry>,
	options: AnnotateLexiconOptions = {},
): TextDocument {
	const viewId = options.viewId ?? "raw";
	const view = doc.views[viewId];
	if (view === undefined)
		throw new TypeError(`textdoc view is missing: ${viewId}`);
	const layerId = options.layerId ?? "lexical";
	const layerType = options.layerType ?? "lexical.match";
	const annotationType = options.annotationType ?? "lexical.match";
	const onExisting = options.onExisting ?? "replace";
	let output = ensureLayer(doc, layerId, layerType, viewId);
	for (const hit of findRawHits(
		view.text,
		lexicon,
		options.matchOptions ?? {},
	)) {
		const annotation = makeAnnotation(
			hit,
			layerId,
			annotationType,
			viewId,
			options,
		);
		const exists =
			output.layers[layerId]?.annotations[annotation.id] !== undefined;
		if (exists && onExisting === "skip") continue;
		if (exists && onExisting === "replace") {
			output = updateAnnotation(output, annotation);
			continue;
		}
		output = addAnnotation(output, annotation);
	}
	return output;
}

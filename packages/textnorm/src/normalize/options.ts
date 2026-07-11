import type {
	TextDocument,
	TextView,
	TextViewKind,
} from "@ismail-elkorchi/textdoc";
import { stableHashValue } from "../internal/stable.js";
import { assertTextNormViewKind } from "../view/create-view.js";
import { assertNormalizationModes } from "./profile.js";
import type {
	CandidateOptions,
	NormalizationMode,
	NormalizationResourceMap,
	TextNormOptions,
} from "./types.js";

export interface ResolvedCandidateOptions extends CandidateOptions {
	readonly sourceView: TextView;
	readonly sourceViewId: string;
	readonly modes: readonly NormalizationMode[];
	readonly resources: NormalizationResourceMap;
	readonly maxCandidates: number;
	readonly maxCandidatesPerSpan: number;
	readonly maxEditDistance: number;
	readonly overlapPolicy: NonNullable<CandidateOptions["overlapPolicy"]>;
	readonly repeatedCharacterMaxRun: number;
	readonly optionsHash: string;
}

export interface ResolvedTextNormOptions extends ResolvedCandidateOptions {
	readonly targetViewId: string;
	readonly targetViewKind: TextViewKind;
	readonly spanMapId?: string;
	readonly unicodeForm?: NonNullable<TextNormOptions["unicodeForm"]>;
	readonly retainRejectedCandidates: boolean;
}

export function resolveSourceView(
	doc: TextDocument,
	sourceViewId?: string,
): TextView {
	if (sourceViewId !== undefined) {
		const view = doc.views[sourceViewId];
		if (view === undefined)
			throw new TypeError(`missing source view: ${sourceViewId}`);
		return view;
	}
	const views = Object.values(doc.views);
	if (views.length === 1) return views[0] as TextView;
	const preferred = views.filter(
		(view) => view.kind === "raw" || view.kind === "decoded",
	);
	if (preferred.length === 1) return preferred[0] as TextView;
	throw new TypeError(
		"sourceViewId is required when a document has multiple possible source views.",
	);
}

function mergeResources(options: CandidateOptions): NormalizationResourceMap {
	return Object.freeze({
		...(options.profile?.resources ?? {}),
		...(options.resources ?? {}),
	});
}

function modesFor(options: CandidateOptions): readonly NormalizationMode[] {
	const modes = options.modes ?? options.profile?.modes ?? [];
	assertNormalizationModes(modes);
	return Object.freeze([...modes]);
}

export function resolveCandidateOptions(
	doc: TextDocument,
	options: CandidateOptions = {},
): ResolvedCandidateOptions {
	const sourceView = resolveSourceView(doc, options.sourceViewId);
	const modes = modesFor(options);
	const resources = mergeResources(options);
	const hash =
		options.optionsHash ??
		stableHashValue({
			sourceViewId: sourceView.id,
			modes,
			...(options.maxCandidates !== undefined
				? { maxCandidates: options.maxCandidates }
				: {}),
			...(options.maxCandidatesPerSpan !== undefined
				? { maxCandidatesPerSpan: options.maxCandidatesPerSpan }
				: {}),
			...(options.maxEditDistance !== undefined
				? { maxEditDistance: options.maxEditDistance }
				: {}),
			...(options.overlapPolicy !== undefined
				? { overlapPolicy: options.overlapPolicy }
				: {}),
			...(options.repeatedCharacterMaxRun !== undefined
				? { repeatedCharacterMaxRun: options.repeatedCharacterMaxRun }
				: {}),
			...(options.casePolicy !== undefined
				? { casePolicy: options.casePolicy }
				: {}),
			...(options.repairLineBreakHyphenation !== undefined
				? { repairLineBreakHyphenation: options.repairLineBreakHyphenation }
				: {}),
		});
	return Object.freeze({
		...options,
		sourceView,
		sourceViewId: sourceView.id,
		modes,
		resources,
		maxCandidates: options.maxCandidates ?? 128,
		maxCandidatesPerSpan: options.maxCandidatesPerSpan ?? 8,
		maxEditDistance: options.maxEditDistance ?? 1,
		overlapPolicy: options.overlapPolicy ?? "highest-ranked-non-overlap",
		repeatedCharacterMaxRun: options.repeatedCharacterMaxRun ?? 2,
		optionsHash: hash,
	});
}

export function resolveTextNormOptions(
	doc: TextDocument,
	options: TextNormOptions,
): ResolvedTextNormOptions {
	const resolved = resolveCandidateOptions(doc, options);
	const targetViewId =
		options.targetViewId ?? `${resolved.sourceView.id}:normalized`;
	const targetViewKind =
		options.targetViewKind ?? options.profile?.targetViewKind ?? "normalized";
	assertTextNormViewKind(targetViewKind);
	const optionsHash =
		options.optionsHash ??
		stableHashValue({
			candidateOptionsHash: resolved.optionsHash,
			targetViewId,
			targetViewKind,
			...(options.spanMapId !== undefined
				? { spanMapId: options.spanMapId }
				: {}),
			...(options.unicodeForm !== undefined
				? { unicodeForm: options.unicodeForm }
				: {}),
			retainRejectedCandidates: options.retainRejectedCandidates ?? true,
		});
	return Object.freeze({
		...resolved,
		targetViewId,
		targetViewKind,
		optionsHash,
		...(options.spanMapId !== undefined
			? { spanMapId: options.spanMapId }
			: {}),
		...(options.unicodeForm !== undefined
			? { unicodeForm: options.unicodeForm }
			: {}),
		retainRejectedCandidates: options.retainRejectedCandidates ?? true,
	});
}

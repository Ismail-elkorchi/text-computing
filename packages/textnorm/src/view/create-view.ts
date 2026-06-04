import type {
	SpanMap,
	TextDocument,
	TextView,
	TextViewKind,
} from "@ismail-elkorchi/textdoc";
import { stableHashValue } from "../internal/stable.js";
import { packageName, packageVersion } from "../internal/version.js";
import type {
	EditScript,
	NormalizationViewResult,
} from "../normalize/types.js";
import { computeEditScript } from "./edit-script.js";
import { spanMapFromEditScript } from "./span-map.js";

const allowedTargetKinds: readonly TextViewKind[] = [
	"normalized",
	"historical-normalized",
	"ocr-corrected",
	"noisy-normalized",
	"transliterated",
	"search",
	"morphological",
	"task",
];

export function assertTextNormViewKind(kind: TextViewKind): void {
	if (!allowedTargetKinds.includes(kind)) {
		throw new TypeError(`unsupported textnorm target view kind: ${kind}`);
	}
}

export function createNormalizedView(
	doc: TextDocument,
	editsOrText: EditScript | string,
	options: {
		readonly sourceViewId: string;
		readonly targetViewId?: string;
		readonly targetViewKind?: TextViewKind;
		readonly spanMapId?: string;
		readonly algorithm?: string;
		readonly optionsHash?: string;
	},
): NormalizationViewResult {
	const sourceView = doc.views[options.sourceViewId];
	if (sourceView === undefined) {
		throw new TypeError(`missing source view: ${options.sourceViewId}`);
	}
	const targetViewId = options.targetViewId ?? `${sourceView.id}:normalized`;
	const targetViewKind = options.targetViewKind ?? "normalized";
	assertTextNormViewKind(targetViewKind);
	const script =
		typeof editsOrText === "string"
			? computeEditScript(sourceView.text, editsOrText)
			: editsOrText;
	const spanMap: SpanMap = spanMapFromEditScript(script, {
		sourceViewId: sourceView.id,
		targetViewId,
		...(options.spanMapId !== undefined ? { id: options.spanMapId } : {}),
	});
	const view: TextView = Object.freeze({
		id: targetViewId,
		kind: targetViewKind,
		text: script.target,
		sourceViewId: sourceView.id,
		spanMapId: spanMap.id,
		transform: Object.freeze({
			kind: "textnorm-normalization",
			producer: packageName,
			algorithm: options.algorithm ?? "candidate-application",
			version: packageVersion,
			sourceViewId: sourceView.id,
			optionsHash:
				options.optionsHash ??
				stableHashValue({
					sourceViewId: sourceView.id,
					targetViewId,
					targetViewKind,
					operations: script.operations,
				}),
		}),
	});
	return Object.freeze({
		view,
		spanMap,
		candidates: Object.freeze([]),
	});
}

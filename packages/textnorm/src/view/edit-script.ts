import type { EditOperation, EditScript } from "../normalize/types.js";

function operationKind(
	sourceText: string,
	targetText: string,
): EditOperation["kind"] {
	if (sourceText.length === 0) return "insert";
	if (targetText.length === 0) return "delete";
	if (sourceText === targetText) return "equal";
	return "replace";
}

function nextCodePointOffset(text: string, index: number): number {
	const codePoint = text.codePointAt(index) ?? 0;
	return index + (codePoint > 0xffff ? 2 : 1);
}

function previousCodePointOffset(text: string, index: number): number {
	const previous = index - 1;
	if (previous <= 0) return Math.max(0, previous);
	const unit = text.charCodeAt(previous);
	if (unit >= 0xdc00 && unit <= 0xdfff) {
		const lead = text.charCodeAt(previous - 1);
		if (lead >= 0xd800 && lead <= 0xdbff) return previous - 1;
	}
	return previous;
}

export function computeEditScript(source: string, target: string): EditScript {
	if (typeof source !== "string" || typeof target !== "string") {
		throw new TypeError("computeEditScript expects string inputs.");
	}
	if (source === target) {
		return Object.freeze({
			source,
			target,
			sourceUnit: "utf16-code-unit",
			targetUnit: "utf16-code-unit",
			operations: Object.freeze([
				Object.freeze({
					kind: "equal",
					sourceStart: 0,
					sourceEnd: source.length,
					targetStart: 0,
					targetEnd: target.length,
					sourceText: source,
					targetText: target,
					relation: "identity",
				}),
			]),
		});
	}

	let sourcePrefix = 0;
	let targetPrefix = 0;
	while (sourcePrefix < source.length && targetPrefix < target.length) {
		const nextSource = nextCodePointOffset(source, sourcePrefix);
		const nextTarget = nextCodePointOffset(target, targetPrefix);
		if (
			source.slice(sourcePrefix, nextSource) !==
			target.slice(targetPrefix, nextTarget)
		)
			break;
		sourcePrefix = nextSource;
		targetPrefix = nextTarget;
	}

	let sourceSuffix = source.length;
	let targetSuffix = target.length;
	while (sourceSuffix > sourcePrefix && targetSuffix > targetPrefix) {
		const prevSource = previousCodePointOffset(source, sourceSuffix);
		const prevTarget = previousCodePointOffset(target, targetSuffix);
		if (
			source.slice(prevSource, sourceSuffix) !==
			target.slice(prevTarget, targetSuffix)
		)
			break;
		sourceSuffix = prevSource;
		targetSuffix = prevTarget;
	}

	const operations: EditOperation[] = [];
	if (sourcePrefix > 0 || targetPrefix > 0) {
		operations.push({
			kind: "equal",
			sourceStart: 0,
			sourceEnd: sourcePrefix,
			targetStart: 0,
			targetEnd: targetPrefix,
			sourceText: source.slice(0, sourcePrefix),
			targetText: target.slice(0, targetPrefix),
			relation: "identity",
		});
	}

	const changedSource = source.slice(sourcePrefix, sourceSuffix);
	const changedTarget = target.slice(targetPrefix, targetSuffix);
	operations.push({
		kind: operationKind(changedSource, changedTarget),
		sourceStart: sourcePrefix,
		sourceEnd: sourceSuffix,
		targetStart: targetPrefix,
		targetEnd: targetSuffix,
		sourceText: changedSource,
		targetText: changedTarget,
	});

	if (sourceSuffix < source.length || targetSuffix < target.length) {
		operations.push({
			kind: "equal",
			sourceStart: sourceSuffix,
			sourceEnd: source.length,
			targetStart: targetSuffix,
			targetEnd: target.length,
			sourceText: source.slice(sourceSuffix),
			targetText: target.slice(targetSuffix),
			relation: "identity",
		});
	}

	return Object.freeze({
		source,
		target,
		sourceUnit: "utf16-code-unit",
		targetUnit: "utf16-code-unit",
		operations: Object.freeze(
			operations.map((operation) => Object.freeze(operation)),
		),
	});
}

export function applyEditScript(script: EditScript): string {
	return script.operations.map((operation) => operation.targetText).join("");
}

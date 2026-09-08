import type { Evidence } from "../../document/annotation/mod.ts";

export interface AnnotationEvidenceOptions {
	readonly producer?: string | undefined;
	readonly packageVersion?: string | undefined;
	readonly resourceIds?: readonly string[] | undefined;
	readonly inputViewIds: readonly string[];
	readonly optionsHash?: string | undefined;
}

export function createLexiconEvidence(
	options: AnnotationEvidenceOptions,
): Evidence {
	return {
		mode: "algorithm",
		exactness: "E1",
		producer: options.producer ?? "@ismail-elkorchi/text-computing/lexicon",
		packageName: "@ismail-elkorchi/text-computing",
		packageVersion: options.packageVersion ?? "0.1.0",
		...(options.resourceIds !== undefined
			? { resourceIds: options.resourceIds }
			: {}),
		inputViewIds: options.inputViewIds,
		...(options.optionsHash !== undefined
			? { optionsHash: options.optionsHash }
			: {}),
	};
}

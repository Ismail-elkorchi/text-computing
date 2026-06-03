import type { Evidence } from "@ismail-elkorchi/textdoc/annotation";

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
		producer: options.producer ?? "@ismail-elkorchi/textlex",
		packageName: "@ismail-elkorchi/textlex",
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

import { isTextViewKind } from "@ismail-elkorchi/textdoc/view";
import { resourceKinds } from "@ismail-elkorchi/textpack";
import type {
	PipelineDiagnostic,
	ProcessorOutput,
	ProcessorRequirement,
	TextProcessor,
} from "./types.js";

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.length > 0;
}

function diagnostic(
	code: string,
	message: string,
	path: string,
): PipelineDiagnostic {
	return { code, severity: "error", message, path };
}

export function validateProcessorRequirement(
	requirement: ProcessorRequirement,
	path = "requirement",
): readonly PipelineDiagnostic[] {
	const diagnostics: PipelineDiagnostic[] = [];
	const hasField =
		requirement.layer !== undefined ||
		requirement.viewKind !== undefined ||
		requirement.resourceKind !== undefined ||
		requirement.capability !== undefined;
	if (!hasField) {
		diagnostics.push(
			diagnostic(
				"TEXTPIPELINE_EMPTY_REQUIREMENT",
				"processor requirement must declare at least one constraint.",
				path,
			),
		);
	}
	if (requirement.layer !== undefined && !isNonEmptyString(requirement.layer)) {
		diagnostics.push(
			diagnostic(
				"TEXTPIPELINE_INVALID_REQUIREMENT_LAYER",
				"processor requirement layer must be a non-empty string.",
				`${path}.layer`,
			),
		);
	}
	if (
		requirement.viewKind !== undefined &&
		!isTextViewKind(requirement.viewKind)
	) {
		diagnostics.push(
			diagnostic(
				"TEXTPIPELINE_INVALID_REQUIREMENT_VIEW_KIND",
				"processor requirement viewKind must be a final TextView kind.",
				`${path}.viewKind`,
			),
		);
	}
	if (
		requirement.resourceKind !== undefined &&
		!resourceKinds.includes(requirement.resourceKind)
	) {
		diagnostics.push(
			diagnostic(
				"TEXTPIPELINE_INVALID_REQUIREMENT_RESOURCE_KIND",
				"processor requirement resourceKind must be a final ResourceKind.",
				`${path}.resourceKind`,
			),
		);
	}
	if (
		requirement.capability !== undefined &&
		!isNonEmptyString(requirement.capability)
	) {
		diagnostics.push(
			diagnostic(
				"TEXTPIPELINE_INVALID_REQUIREMENT_CAPABILITY",
				"processor requirement capability must be a non-empty string.",
				`${path}.capability`,
			),
		);
	}
	if (
		requirement.providerId !== undefined &&
		!isNonEmptyString(requirement.providerId)
	) {
		diagnostics.push(
			diagnostic(
				"TEXTPIPELINE_INVALID_REQUIREMENT_PROVIDER",
				"processor requirement providerId must be a non-empty string.",
				`${path}.providerId`,
			),
		);
	}
	if (
		requirement.providerId !== undefined &&
		requirement.layer === undefined &&
		requirement.viewKind === undefined
	) {
		diagnostics.push(
			diagnostic(
				"TEXTPIPELINE_REQUIREMENT_PROVIDER_WITHOUT_DOCUMENT_OUTPUT",
				"processor requirement providerId requires a layer or viewKind constraint.",
				`${path}.providerId`,
			),
		);
	}
	return diagnostics;
}

export function validateProcessorOutput(
	output: ProcessorOutput,
	path = "output",
): readonly PipelineDiagnostic[] {
	const diagnostics: PipelineDiagnostic[] = [];
	const hasField =
		output.layer !== undefined ||
		output.viewKind !== undefined ||
		output.annotations !== undefined;
	if (!hasField) {
		diagnostics.push(
			diagnostic(
				"TEXTPIPELINE_EMPTY_OUTPUT",
				"processor output must declare at least one produced item.",
				path,
			),
		);
	}
	if (output.layer !== undefined && !isNonEmptyString(output.layer)) {
		diagnostics.push(
			diagnostic(
				"TEXTPIPELINE_INVALID_OUTPUT_LAYER",
				"processor output layer must be a non-empty string.",
				`${path}.layer`,
			),
		);
	}
	if (output.viewKind !== undefined && !isTextViewKind(output.viewKind)) {
		diagnostics.push(
			diagnostic(
				"TEXTPIPELINE_INVALID_OUTPUT_VIEW_KIND",
				"processor output viewKind must be a final TextView kind.",
				`${path}.viewKind`,
			),
		);
	}
	if (output.annotations !== undefined) {
		if (!Array.isArray(output.annotations) || output.annotations.length === 0) {
			diagnostics.push(
				diagnostic(
					"TEXTPIPELINE_INVALID_OUTPUT_ANNOTATIONS",
					"processor output annotations must be a non-empty string array.",
					`${path}.annotations`,
				),
			);
		} else {
			output.annotations.forEach((annotation, index) => {
				if (!isNonEmptyString(annotation)) {
					diagnostics.push(
						diagnostic(
							"TEXTPIPELINE_INVALID_OUTPUT_ANNOTATION",
							"processor output annotation entries must be non-empty strings.",
							`${path}.annotations[${index}]`,
						),
					);
				}
			});
		}
	}
	return diagnostics;
}

export function validateTextProcessor(
	processor: TextProcessor,
	path = "processor",
): readonly PipelineDiagnostic[] {
	const diagnostics: PipelineDiagnostic[] = [];
	if (!isNonEmptyString(processor.id)) {
		diagnostics.push(
			diagnostic(
				"TEXTPIPELINE_INVALID_PROCESSOR_ID",
				"processor id must be a non-empty string.",
				`${path}.id`,
			),
		);
	}
	if (!isNonEmptyString(processor.version)) {
		diagnostics.push(
			diagnostic(
				"TEXTPIPELINE_INVALID_PROCESSOR_VERSION",
				"processor version must be a non-empty string.",
				`${path}.version`,
			),
		);
	}
	if (!Array.isArray(processor.provides) || processor.provides.length === 0) {
		diagnostics.push(
			diagnostic(
				"TEXTPIPELINE_PROCESSOR_OUTPUTS_REQUIRED",
				"processor provides must contain at least one output.",
				`${path}.provides`,
			),
		);
	} else {
		processor.provides.forEach((output, index) => {
			diagnostics.push(
				...validateProcessorOutput(output, `${path}.provides[${index}]`),
			);
		});
	}
	if (processor.requires !== undefined) {
		if (!Array.isArray(processor.requires)) {
			diagnostics.push(
				diagnostic(
					"TEXTPIPELINE_INVALID_PROCESSOR_REQUIREMENTS",
					"processor requires must be an array when present.",
					`${path}.requires`,
				),
			);
		} else {
			processor.requires.forEach((requirement, index) => {
				diagnostics.push(
					...validateProcessorRequirement(
						requirement,
						`${path}.requires[${index}]`,
					),
				);
			});
		}
	}
	if (typeof processor.process !== "function") {
		diagnostics.push(
			diagnostic(
				"TEXTPIPELINE_PROCESSOR_PROCESS_REQUIRED",
				"processor process must be callable.",
				`${path}.process`,
			),
		);
	}
	return diagnostics;
}

import type { JsonValue } from "../internal/json.js";
import type {
	PipelineDiagnostic,
	ProcessorRequirement,
	TextProcessor,
} from "../processor/types.js";

function requirementDetails(requirement: ProcessorRequirement): JsonValue {
	return {
		layer: requirement.layer ?? null,
		viewKind: requirement.viewKind ?? null,
		resourceKind: requirement.resourceKind ?? null,
		capability: requirement.capability ?? null,
	};
}

export function missingRequirementDiagnostic(
	processor: TextProcessor,
	requirement: ProcessorRequirement,
): PipelineDiagnostic {
	return {
		code: "TEXTPIPELINE_MISSING_REQUIREMENT",
		severity: "error",
		message: `processor requirement is not satisfied: ${processor.id}`,
		processorId: processor.id,
		details: requirementDetails(requirement),
	};
}

export function cycleDiagnostic(
	processorIds: readonly string[],
): PipelineDiagnostic {
	return {
		code: "TEXTPIPELINE_DEPENDENCY_CYCLE",
		severity: "error",
		message: `pipeline dependency cycle includes: ${processorIds.join(", ")}`,
		details: { processorIds },
	};
}

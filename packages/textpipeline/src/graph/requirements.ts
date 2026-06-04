import type { TextDocument } from "@ismail-elkorchi/textdoc";
import { documentHasLayer, documentHasViewKind } from "../internal/document.js";
import type { PipelineResourceRegistry } from "../pack/registry.js";
import type {
	ProcessorOutput,
	ProcessorRequirement,
} from "../processor/types.js";

export function documentSatisfiesRequirement(
	document: TextDocument | undefined,
	requirement: ProcessorRequirement,
): boolean {
	return (
		documentHasLayer(document, requirement.layer) &&
		documentHasViewKind(document, requirement.viewKind)
	);
}

export function requirementHasDocumentPart(
	requirement: ProcessorRequirement,
): boolean {
	return requirement.layer !== undefined || requirement.viewKind !== undefined;
}

export function resourceSatisfiesRequirement(
	resources: PipelineResourceRegistry,
	requirement: ProcessorRequirement,
): boolean {
	return requirement.resourceKind === undefined &&
		requirement.capability === undefined
		? true
		: resources.hasRequirement(requirement);
}

export function externalSatisfiesRequirement(
	document: TextDocument | undefined,
	resources: PipelineResourceRegistry,
	requirement: ProcessorRequirement,
): boolean {
	return (
		documentSatisfiesRequirement(document, requirement) &&
		resourceSatisfiesRequirement(resources, requirement)
	);
}

export function outputSatisfiesRequirement(
	output: ProcessorOutput,
	requirement: ProcessorRequirement,
): boolean {
	if (requirement.layer !== undefined && output.layer !== requirement.layer) {
		return false;
	}
	if (
		requirement.viewKind !== undefined &&
		output.viewKind !== requirement.viewKind
	) {
		return false;
	}
	return requirement.layer !== undefined || requirement.viewKind !== undefined;
}

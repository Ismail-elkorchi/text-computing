import type { TextDocument } from "@ismail-elkorchi/textdoc";
import { compareText } from "../internal/compare.js";
import { pipelinePlanSchemaVersion } from "../internal/ids.js";
import type {
	PipelineDiagnostic,
	ProcessorOutput,
	ProcessorRequirement,
	TextPipeline,
	TextProcessor,
} from "../processor/types.js";
import {
	cycleDiagnostic,
	missingRequirementDiagnostic,
} from "./diagnostics.js";
import { topologicalOrder } from "./order.js";
import {
	documentSatisfiesRequirement,
	externalSatisfiesRequirement,
	outputSatisfiesRequirement,
	requirementHasDocumentPart,
	resourceSatisfiesRequirement,
} from "./requirements.js";

export interface PipelinePlanNode {
	readonly processorId: string;
	readonly version: string;
	readonly requires: readonly ProcessorRequirement[];
	readonly provides: readonly ProcessorOutput[];
}

export interface PipelinePlanEdge {
	readonly from: string;
	readonly to: string;
	readonly requirement: ProcessorRequirement;
}

export interface PipelineMissingRequirement {
	readonly processorId: string;
	readonly requirement: ProcessorRequirement;
}

export interface PipelineCycle {
	readonly processorIds: readonly string[];
}

export interface PipelinePlan {
	readonly schemaVersion: typeof pipelinePlanSchemaVersion;
	readonly pipelineId: string;
	readonly ok: boolean;
	readonly nodes: readonly PipelinePlanNode[];
	readonly edges: readonly PipelinePlanEdge[];
	readonly processorOrder: readonly string[];
	readonly missingRequirements: readonly PipelineMissingRequirement[];
	readonly cycles: readonly PipelineCycle[];
	readonly diagnostics: readonly PipelineDiagnostic[];
}

function edgeKey(edge: PipelinePlanEdge): string {
	return `${edge.from}\u0000${edge.to}\u0000${JSON.stringify(edge.requirement)}`;
}

function providersForRequirement(
	processors: readonly TextProcessor[],
	consumer: TextProcessor,
	requirement: ProcessorRequirement,
): readonly TextProcessor[] {
	return processors
		.filter((candidate) => candidate.id !== consumer.id)
		.filter((candidate) =>
			candidate.provides.some((output) =>
				outputSatisfiesRequirement(output, requirement),
			),
		)
		.sort((left, right) => compareText(left.id, right.id));
}

export function planPipeline(
	pipeline: TextPipeline,
	doc?: TextDocument,
): PipelinePlan {
	const nodes = Object.freeze(
		pipeline.processors
			.map((processor) =>
				Object.freeze({
					processorId: processor.id,
					version: processor.version,
					requires: Object.freeze([...(processor.requires ?? [])]),
					provides: Object.freeze([...processor.provides]),
				}),
			)
			.sort((left, right) => compareText(left.processorId, right.processorId)),
	);
	const edgeMap = new Map<string, PipelinePlanEdge>();
	const missingRequirements: PipelineMissingRequirement[] = [];
	const diagnostics: PipelineDiagnostic[] = [];
	for (const processor of pipeline.processors) {
		for (const requirement of processor.requires ?? []) {
			if (externalSatisfiesRequirement(doc, pipeline.resources, requirement)) {
				continue;
			}
			if (!resourceSatisfiesRequirement(pipeline.resources, requirement)) {
				missingRequirements.push(
					Object.freeze({
						processorId: processor.id,
						requirement: Object.freeze({ ...requirement }),
					}),
				);
				diagnostics.push(missingRequirementDiagnostic(processor, requirement));
				continue;
			}
			if (
				!requirementHasDocumentPart(requirement) ||
				documentSatisfiesRequirement(doc, requirement)
			) {
				continue;
			}
			const providers = providersForRequirement(
				pipeline.processors,
				processor,
				requirement,
			);
			if (providers.length === 0) {
				missingRequirements.push(
					Object.freeze({
						processorId: processor.id,
						requirement: Object.freeze({ ...requirement }),
					}),
				);
				diagnostics.push(missingRequirementDiagnostic(processor, requirement));
				continue;
			}
			for (const provider of providers) {
				const edge = Object.freeze({
					from: provider.id,
					to: processor.id,
					requirement: Object.freeze({ ...requirement }),
				});
				edgeMap.set(edgeKey(edge), edge);
			}
		}
	}
	const edges = Object.freeze(
		[...edgeMap.values()].sort((left, right) => {
			const fromComparison = compareText(left.from, right.from);
			if (fromComparison !== 0) return fromComparison;
			const toComparison = compareText(left.to, right.to);
			if (toComparison !== 0) return toComparison;
			return compareText(
				JSON.stringify(left.requirement),
				JSON.stringify(right.requirement),
			);
		}),
	);
	const order = topologicalOrder(
		pipeline.processors.map((processor) => processor.id),
		edges,
	);
	const cycles =
		order.cycleProcessorIds.length === 0
			? []
			: [Object.freeze({ processorIds: order.cycleProcessorIds })];
	for (const cycle of cycles)
		diagnostics.push(cycleDiagnostic(cycle.processorIds));
	return Object.freeze({
		schemaVersion: pipelinePlanSchemaVersion,
		pipelineId: pipeline.id,
		ok: missingRequirements.length === 0 && cycles.length === 0,
		nodes,
		edges,
		processorOrder: order.order,
		missingRequirements: Object.freeze(missingRequirements),
		cycles: Object.freeze(cycles),
		diagnostics: Object.freeze(diagnostics),
	});
}

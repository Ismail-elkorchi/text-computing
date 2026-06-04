import type { TextDocument } from "@ismail-elkorchi/textdoc";
import { candidateId, spanKey } from "../internal/ids.js";
import { sourceTextForSpan } from "../internal/spans.js";
import { orderedRecord, stableHashValue } from "../internal/stable.js";
import { candidateNormalizations } from "../normalize/candidates.js";
import type {
	NormalizationCandidate,
	VariantGraph,
	VariantGraphEdge,
	VariantGraphNode,
	VariantGraphOptions,
} from "../normalize/types.js";
import { sortCandidates } from "../spell/rank.js";

function sourceNodeId(candidate: NormalizationCandidate): string {
	return `source:${stableHashValue(spanKey(candidate.source)).slice(0, 16)}`;
}

export function buildVariantGraph(
	doc: TextDocument,
	options: VariantGraphOptions = {},
): VariantGraph {
	const candidates = sortCandidates(
		options.candidates ?? candidateNormalizations(doc, options),
	);
	const limited = candidates.slice(
		0,
		options.maxAlternatives ?? candidates.length,
	);
	const nodes: Record<string, VariantGraphNode> = {};
	const edges: Record<string, VariantGraphEdge> = {};
	for (const [index, candidate] of limited.entries()) {
		const sourceId = sourceNodeId(candidate);
		const candidateNodeId = candidateId(candidate, index);
		if (nodes[sourceId] === undefined) {
			nodes[sourceId] = Object.freeze({
				id: sourceId,
				kind: "source",
				source: candidate.source,
				text: sourceTextForSpan(doc, candidate.source),
			});
		}
		nodes[candidateNodeId] = Object.freeze({
			id: candidateNodeId,
			kind: "candidate",
			source: candidate.source,
			text: candidate.candidate,
			candidate,
		});
		const edgeId = `edge:${stableHashValue({ sourceId, candidateNodeId, index }).slice(0, 16)}`;
		edges[edgeId] = Object.freeze({
			id: edgeId,
			source: sourceId,
			target: candidateNodeId,
			relation: candidate.kind,
			evidence: candidate.evidence,
			...(candidate.score !== undefined ? { score: candidate.score } : {}),
		});
	}
	return Object.freeze({
		id:
			options.graphId ??
			`variant-graph:${stableHashValue({ doc: doc.id, candidates: limited }).slice(0, 16)}`,
		nodes: orderedRecord(nodes),
		edges: orderedRecord(edges),
		metadata: Object.freeze({
			documentId: doc.id,
			candidateCount: limited.length,
		}),
	});
}

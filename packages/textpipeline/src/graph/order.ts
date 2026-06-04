import { compareText } from "../internal/compare.js";

export interface GraphEdge {
	readonly from: string;
	readonly to: string;
}

export interface TopologicalOrderResult {
	readonly order: readonly string[];
	readonly cycleProcessorIds: readonly string[];
}

export function topologicalOrder(
	processorIds: readonly string[],
	edges: readonly GraphEdge[],
): TopologicalOrderResult {
	const sortedIds = [...processorIds].sort(compareText);
	const outgoing = new Map<string, string[]>();
	const indegree = new Map<string, number>();
	for (const id of sortedIds) {
		outgoing.set(id, []);
		indegree.set(id, 0);
	}
	for (const edge of edges) {
		if (!outgoing.has(edge.from) || !indegree.has(edge.to)) continue;
		const targets = outgoing.get(edge.from);
		if (targets !== undefined && !targets.includes(edge.to)) {
			targets.push(edge.to);
			indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
		}
	}
	for (const targets of outgoing.values()) targets.sort(compareText);
	const ready = sortedIds.filter((id) => indegree.get(id) === 0);
	const order: string[] = [];
	while (ready.length > 0) {
		ready.sort(compareText);
		const id = ready.shift();
		if (id === undefined) break;
		order.push(id);
		for (const target of outgoing.get(id) ?? []) {
			const next = (indegree.get(target) ?? 0) - 1;
			indegree.set(target, next);
			if (next === 0) ready.push(target);
		}
	}
	return {
		order: Object.freeze(order),
		cycleProcessorIds: Object.freeze(
			sortedIds.filter((id) => !order.includes(id)).sort(compareText),
		),
	};
}

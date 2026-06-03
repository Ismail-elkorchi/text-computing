import { deepFreeze, orderedRecord } from "../internal/freeze.js";

export interface DawgNode {
	readonly id: number;
	readonly terminal: boolean;
	readonly edges: Readonly<Record<string, number>>;
}

export interface Dawg {
	readonly keys: readonly string[];
	readonly root: number;
	readonly nodes: readonly DawgNode[];
}

interface MutableNode {
	terminal: boolean;
	children: Map<string, MutableNode>;
}

function createNode(): MutableNode {
	return { terminal: false, children: new Map() };
}

function insert(root: MutableNode, key: string): void {
	let node = root;
	for (const char of Array.from(key)) {
		let child = node.children.get(char);
		if (child === undefined) {
			child = createNode();
			node.children.set(char, child);
		}
		node = child;
	}
	node.terminal = true;
}

function minimize(
	node: MutableNode,
	registry: Map<string, number>,
	nodes: DawgNode[],
): number {
	const edges: Record<string, number> = {};
	for (const label of [...node.children.keys()].sort((left, right) =>
		left.localeCompare(right),
	)) {
		const child = node.children.get(label);
		if (child !== undefined) edges[label] = minimize(child, registry, nodes);
	}
	const signature = `${node.terminal ? "1" : "0"}|${Object.entries(edges)
		.map(([label, id]) => `${label}:${id}`)
		.join(",")}`;
	const existing = registry.get(signature);
	if (existing !== undefined) return existing;
	const id = nodes.length;
	registry.set(signature, id);
	nodes.push(
		Object.freeze({ id, terminal: node.terminal, edges: orderedRecord(edges) }),
	);
	return id;
}

export function buildDawg(keys: Iterable<string>): Dawg {
	const sortedKeys = Object.freeze(
		[...new Set(keys)].sort((left, right) => left.localeCompare(right)),
	);
	const rootNode = createNode();
	for (const key of sortedKeys) insert(rootNode, key);
	const nodes: DawgNode[] = [];
	const root = minimize(rootNode, new Map(), nodes);
	const ordered = Object.freeze(
		[...nodes].sort((left, right) => left.id - right.id),
	);
	return deepFreeze({ keys: sortedKeys, root, nodes: ordered });
}

export function hasDawgKey(dawg: Dawg, key: string): boolean {
	let nodeId = dawg.root;
	for (const char of Array.from(key)) {
		const node = dawg.nodes[nodeId];
		if (node === undefined) return false;
		const next = node.edges[char];
		if (next === undefined) return false;
		nodeId = next;
	}
	return dawg.nodes[nodeId]?.terminal === true;
}

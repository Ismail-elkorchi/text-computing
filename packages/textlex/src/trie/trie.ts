import { deepFreeze, orderedRecord } from "../internal/freeze.js";

export interface TrieNode {
	readonly terminal: boolean;
	readonly children: Readonly<Record<string, TrieNode>>;
}

export interface Trie {
	readonly keys: readonly string[];
	readonly root: TrieNode;
}

interface MutableNode {
	terminal: boolean;
	children: Map<string, MutableNode>;
}

function createNode(): MutableNode {
	return { terminal: false, children: new Map() };
}

function freezeNode(node: MutableNode): TrieNode {
	const children: Record<string, TrieNode> = {};
	for (const key of [...node.children.keys()].sort((left, right) =>
		left.localeCompare(right),
	)) {
		const child = node.children.get(key);
		if (child !== undefined) children[key] = freezeNode(child);
	}
	return Object.freeze({
		terminal: node.terminal,
		children: orderedRecord(children),
	});
}

export function buildTrie(keys: Iterable<string>): Trie {
	const sortedKeys = Object.freeze(
		[...new Set(keys)].sort((left, right) => left.localeCompare(right)),
	);
	const root = createNode();
	for (const key of sortedKeys) {
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
	return deepFreeze({ keys: sortedKeys, root: freezeNode(root) });
}

export function hasTrieKey(trie: Trie, key: string): boolean {
	let node = trie.root;
	for (const char of Array.from(key)) {
		const child = node.children[char];
		if (child === undefined) return false;
		node = child;
	}
	return node.terminal;
}

export function triePrefixKeys(trie: Trie, prefix: string): readonly string[] {
	return Object.freeze(trie.keys.filter((key) => key.startsWith(prefix)));
}

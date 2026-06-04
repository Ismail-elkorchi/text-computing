import { stableHash64 } from "@ismail-elkorchi/textfacts/hash";
import {
	createDataset,
	type SplitOptions,
	type SplitSpec,
	type TextDataset,
} from "../dataset/mod.js";
import { compareCodePointStrings } from "../internal/compare.js";
import { fail } from "../internal/errors.js";
import { stableShuffle } from "./assign.js";
import { createSplitReport } from "./report.js";

const defaultSplits: readonly SplitSpec[] = [
	{ name: "train", ratio: 0.8 },
	{ name: "dev", ratio: 0.1 },
	{ name: "test", ratio: 0.1 },
];

function fieldValue(
	record: unknown,
	selector:
		| string
		| ((record: unknown, index: number) => string | undefined)
		| undefined,
	index: number,
): string | undefined {
	if (selector === undefined) return undefined;
	if (typeof selector === "function") return selector(record, index);
	if (typeof record !== "object" || record === null) return undefined;
	const value = (record as Record<string, unknown>)[selector];
	return typeof value === "string" ? value : undefined;
}

function recordKey<T>(record: T, options: SplitOptions, index: number): string {
	if (typeof options.idKey === "function") return options.idKey(record, index);
	if (typeof options.idKey === "string") {
		const value = fieldValue(record, options.idKey, index);
		if (value !== undefined) return value;
	}
	const value = fieldValue(record, "id", index);
	return value ?? `record:${index}`;
}

function balancedCounts(exact: readonly number[], total: number): number[] {
	if (total <= 0) return exact.map(() => 0);
	const counts = exact.map((value) => Math.max(0, Math.floor(value)));
	let assigned = counts.reduce((sum, count) => sum + count, 0);
	const remainderOrder = exact
		.map((value, index) => ({
			index,
			remainder: Math.max(0, value) - Math.max(0, Math.floor(value)),
		}))
		.sort(
			(left, right) =>
				right.remainder - left.remainder ||
				(left.index === right.index ? 0 : left.index < right.index ? -1 : 1),
		);
	let index = 0;
	while (assigned < total && remainderOrder.length > 0) {
		const target = remainderOrder[index % remainderOrder.length]?.index ?? 0;
		counts[target] = (counts[target] ?? 0) + 1;
		assigned += 1;
		index += 1;
	}
	while (assigned > total && counts.length > 0) {
		const target = counts.length - 1 - (index % counts.length);
		if ((counts[target] ?? 0) > 0) {
			counts[target] = (counts[target] ?? 0) - 1;
			assigned -= 1;
		}
		index += 1;
	}
	return counts;
}

function splitCounts(
	total: number,
	specs: readonly { name: string; ratio?: number; count?: number }[],
): number[] {
	const exact = specs.map((spec) =>
		spec.count === undefined ? (spec.ratio ?? 0) * total : spec.count,
	);
	return balancedCounts(exact, total);
}

function stratumSplitCounts(
	stratumTotal: number,
	overallTotal: number,
	specs: readonly { name: string; ratio?: number; count?: number }[],
): number[] {
	const exact = specs.map((spec) =>
		spec.count === undefined
			? (spec.ratio ?? 0) * stratumTotal
			: overallTotal === 0
				? 0
				: (spec.count / overallTotal) * stratumTotal,
	);
	return balancedCounts(exact, stratumTotal);
}

function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
	return (
		typeof value === "object" && value !== null && Symbol.asyncIterator in value
	);
}

function splitIndexForHash(
	key: string,
	seed: string,
	specs: readonly { name: string; ratio?: number; count?: number }[],
): number {
	const ratios = specs.map((spec) => spec.ratio ?? 0);
	const total = ratios.reduce((sum, ratio) => sum + ratio, 0) || specs.length;
	const hash = stableHash64(`${seed}\u0000${key}`);
	const score = Number.parseInt(hash.slice(0, 12), 16) / 0xffffffffffff;
	let cumulative = 0;
	for (let index = 0; index < specs.length; index += 1) {
		cumulative += (ratios[index] ?? 1) / total;
		if (score <= cumulative) return index;
	}
	return specs.length - 1;
}

function assignUnits<T>(
	units: readonly { key: string; value: readonly T[] }[],
	counts: readonly number[],
	specs: readonly { name: string; ratio?: number; count?: number }[],
	buckets: Map<string, T[]>,
): void {
	const assigned = new Map(specs.map((spec) => [spec.name, 0]));
	let splitIndex = 0;
	for (const unit of units) {
		while (
			splitIndex < specs.length - 1 &&
			(assigned.get(specs[splitIndex]?.name ?? "") ?? 0) >=
				(counts[splitIndex] ?? 0)
		) {
			splitIndex += 1;
		}
		const name = specs[splitIndex]?.name ?? specs.at(-1)?.name ?? "train";
		buckets.get(name)?.push(...unit.value);
		assigned.set(name, (assigned.get(name) ?? 0) + unit.value.length);
	}
}

function createAsyncSplitRecords<T>(
	records: AsyncIterable<T>,
	options: SplitOptions,
	seed: string,
	specs: readonly { name: string; ratio?: number; count?: number }[],
): Readonly<Record<string, AsyncIterable<T>>> {
	const iterator = records[Symbol.asyncIterator]();
	const queues = new Map(specs.map((spec) => [spec.name, [] as T[]]));
	let index = 0;
	let done = false;
	let pulling: Promise<void> | undefined;

	async function pullUntil(target: string): Promise<void> {
		while (!done && (queues.get(target)?.length ?? 0) === 0) {
			if (pulling !== undefined) {
				await pulling;
				continue;
			}
			pulling = (async () => {
				const next = await iterator.next();
				if (next.done === true) {
					done = true;
					return;
				}
				const key = recordKey(next.value, options, index);
				const splitIndex = splitIndexForHash(key, seed, specs);
				const splitName = specs[splitIndex]?.name ?? specs[0]?.name ?? "train";
				queues.get(splitName)?.push(next.value);
				index += 1;
			})().finally(() => {
				pulling = undefined;
			});
			await pulling;
		}
	}

	return Object.fromEntries(
		specs.map((spec) => [
			spec.name,
			{
				async *[Symbol.asyncIterator](): AsyncIterator<T> {
					for (;;) {
						await pullUntil(spec.name);
						const value = queues.get(spec.name)?.shift();
						if (value === undefined) {
							if (done) return;
							continue;
						}
						yield value;
					}
				},
			},
		]),
	);
}

export function splitDataset<T>(
	dataset: TextDataset<T>,
	options: SplitOptions,
): import("../dataset/mod.js").DatasetSplits<T> {
	const specs: readonly SplitSpec[] = options.splits ?? defaultSplits;
	const seed = options.seed ?? dataset.id;
	if (isAsyncIterable<T>(dataset.records)) {
		if (specs.some((spec) => spec.count !== undefined)) {
			fail(
				"TEXTDATA_SPLIT_COUNT_REQUIRES_FINITE_DATASET",
				"count-based splits require a finite iterable dataset",
			);
		}
		const splitRecords = createAsyncSplitRecords(
			dataset.records as AsyncIterable<T>,
			options,
			seed,
			specs,
		);
		const result = Object.fromEntries(
			specs.map((spec) => [
				spec.name,
				createDataset(splitRecords[spec.name] ?? [], {
					id: `${dataset.id}:${spec.name}`,
					metadata: { ...dataset.metadata, split: spec.name },
				}),
			]),
		) as Record<string, TextDataset<T>>;
		const report = createSplitReport(
			seed,
			Object.fromEntries(specs.map((spec) => [spec.name, 0])),
			options,
			[
				{
					code: "TEXTDATA_SPLIT_ASYNC_COUNTS_DEFERRED",
					severity: "info",
					message: "async split counts are available only after iteration",
				},
			],
		);
		return {
			...result,
			report,
			train:
				result.train ??
				createDataset([], {
					id: `${dataset.id}:train`,
					metadata: { split: "train" },
				}),
			dev:
				result.dev ??
				createDataset([], {
					id: `${dataset.id}:dev`,
					metadata: { split: "dev" },
				}),
			test:
				result.test ??
				createDataset([], {
					id: `${dataset.id}:test`,
					metadata: { split: "test" },
				}),
		} as import("../dataset/mod.js").DatasetSplits<T>;
	}
	const records = [...dataset.records];
	const groups = new Map<
		string,
		{ key: string; value: T[]; stratum: string }
	>();
	for (let index = 0; index < records.length; index += 1) {
		const record = records[index] as T;
		const groupKey =
			fieldValue(record, options.groupBy, index) ??
			recordKey(record, options, index);
		const group = groups.get(groupKey);
		if (group === undefined) {
			groups.set(groupKey, {
				key: groupKey,
				value: [record],
				stratum: fieldValue(record, options.stratifyBy, index) ?? "",
			});
		} else {
			group.value.push(record);
		}
	}
	const buckets = new Map(specs.map((spec) => [spec.name, [] as T[]]));
	if (options.stratifyBy === undefined) {
		const shuffled = stableShuffle([...groups.values()], seed);
		assignUnits(shuffled, splitCounts(records.length, specs), specs, buckets);
	} else {
		const strata = new Map<
			string,
			{ key: string; value: readonly T[]; stratum: string }[]
		>();
		for (const group of groups.values()) {
			const stratumGroups = strata.get(group.stratum) ?? [];
			stratumGroups.push(group);
			strata.set(group.stratum, stratumGroups);
		}
		for (const [stratum, stratumGroups] of [...strata.entries()].sort(
			(left, right) => compareCodePointStrings(left[0], right[0]),
		)) {
			const stratumTotal = stratumGroups.reduce(
				(sum, group) => sum + group.value.length,
				0,
			);
			const shuffled = stableShuffle(stratumGroups, `${seed}\u0000${stratum}`);
			assignUnits(
				shuffled,
				stratumSplitCounts(stratumTotal, records.length, specs),
				specs,
				buckets,
			);
		}
	}
	const countRecord = Object.fromEntries(
		[...buckets.entries()].map(([name, bucket]) => [name, bucket.length]),
	);
	const result = Object.fromEntries(
		[...buckets.entries()].map(([name, bucket]) => [
			name,
			createDataset(bucket, {
				id: `${dataset.id}:${name}`,
				metadata: { ...dataset.metadata, split: name },
			}),
		]),
	) as Record<string, TextDataset<T>>;
	const report = createSplitReport(seed, countRecord, options);
	return {
		...result,
		report,
		train:
			result.train ??
			createDataset([], {
				id: `${dataset.id}:train`,
				metadata: { split: "train" },
			}),
		dev:
			result.dev ??
			createDataset([], {
				id: `${dataset.id}:dev`,
				metadata: { split: "dev" },
			}),
		test:
			result.test ??
			createDataset([], {
				id: `${dataset.id}:test`,
				metadata: { split: "test" },
			}),
	} as import("../dataset/mod.js").DatasetSplits<T>;
}

import type { TextDocument } from "@ismail-elkorchi/textdoc";
import type { TextPipeline } from "../processor/types.js";
import { type RunOptions, runPipeline } from "../run/execute.js";

export interface StreamOptions extends RunOptions {
	readonly concurrency?: number;
	readonly preserveOrder?: boolean;
}

interface CompletedRun {
	readonly index: number;
	readonly ok: boolean;
	readonly document?: TextDocument;
	readonly error?: unknown;
	readonly diagnostics: NonNullable<RunOptions["diagnostics"]>;
	readonly trace: NonNullable<RunOptions["trace"]>;
}

function normalizeConcurrency(value: number | undefined): number {
	if (value === undefined) return 1;
	if (!Number.isInteger(value) || value < 1) {
		throw new TypeError("stream concurrency must be a positive integer.");
	}
	return value;
}

function settleRun(
	index: number,
	promise: Promise<TextDocument>,
	diagnostics: NonNullable<RunOptions["diagnostics"]>,
	trace: NonNullable<RunOptions["trace"]>,
): Promise<CompletedRun> {
	return promise.then(
		(document) => ({ index, ok: true, document, diagnostics, trace }),
		(error) => ({ index, ok: false, error, diagnostics, trace }),
	);
}

function unwrapCompletedRun(run: CompletedRun): TextDocument {
	if (run.ok && run.document !== undefined) return run.document;
	throw run.error;
}

export async function* streamPipeline(
	pipeline: TextPipeline,
	docs: AsyncIterable<TextDocument>,
	options: StreamOptions = {},
): AsyncIterable<TextDocument> {
	const concurrency = normalizeConcurrency(options.concurrency);
	const preserveOrder = options.preserveOrder ?? true;
	if (concurrency === 1) {
		for await (const document of docs) {
			yield await runPipeline(pipeline, document, options);
		}
		return;
	}
	const iterator = docs[Symbol.asyncIterator]();
	let inputDone = false;
	let nextIndex = 0;
	let nextYield = 0;
	const active = new Map<number, Promise<CompletedRun>>();
	const sharedDiagnostics = options.diagnostics;
	const sharedTrace = options.trace;
	function recordCompleted(run: CompletedRun): void {
		sharedDiagnostics?.push(...run.diagnostics);
		sharedTrace?.push(...run.trace);
	}
	async function fill(): Promise<void> {
		while (!inputDone && active.size < concurrency) {
			const item = await iterator.next();
			if (item.done === true) {
				inputDone = true;
				return;
			}
			const index = nextIndex;
			nextIndex += 1;
			const diagnostics: NonNullable<RunOptions["diagnostics"]> = [];
			const trace: NonNullable<RunOptions["trace"]> = [];
			active.set(
				index,
				settleRun(
					index,
					runPipeline(pipeline, item.value, {
						...options,
						diagnostics,
						trace,
					}),
					diagnostics,
					trace,
				),
			);
		}
	}
	await fill();
	while (active.size > 0) {
		if (preserveOrder) {
			const promise = active.get(nextYield);
			if (promise === undefined) break;
			const completed = await promise;
			active.delete(nextYield);
			nextYield += 1;
			await fill();
			recordCompleted(completed);
			yield unwrapCompletedRun(completed);
			continue;
		}
		const completed = await Promise.race(active.values());
		active.delete(completed.index);
		await fill();
		recordCompleted(completed);
		yield unwrapCompletedRun(completed);
	}
}

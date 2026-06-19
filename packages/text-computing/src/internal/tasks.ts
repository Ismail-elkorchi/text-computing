import type { TextPack } from "@ismail-elkorchi/textpack";
import { unsupportedTaskError } from "./errors.js";
import type { TextComputingDocumentTask } from "./types.js";

export function assertRunnableTask(pack: TextPack, slot: string): void {
	const capabilitySlot = pack.manifest.capabilitySlots.find(
		(candidate) => candidate.slot === slot,
	);
	const status = capabilitySlot?.status;
	if (status === "task-supported" || status === "feature-complete") return;
	throw unsupportedTaskError(pack, slot);
}

export function planDocumentTasks(
	tasks: readonly TextComputingDocumentTask[] | undefined,
): ReadonlySet<TextComputingDocumentTask> {
	return new Set<TextComputingDocumentTask>([
		"segmentation",
		"normalization",
		...(tasks ?? [
			"lexicon" as const,
			"morphology" as const,
			"kb" as const,
			"search" as const,
			"quality" as const,
		]),
	]);
}

export function uniqueSorted(values: readonly string[]): readonly string[] {
	return Object.freeze(
		[...new Set(values)].sort((left, right) => left.localeCompare(right)),
	);
}

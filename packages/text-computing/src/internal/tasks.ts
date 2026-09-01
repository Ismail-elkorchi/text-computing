import type { TextPack } from "@ismail-elkorchi/textpack";
import { unsupportedTaskError } from "./errors.js";
import type {
	TextComputingDocumentTask,
	TextComputingTaskPreset,
} from "./types.js";

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
	preset: TextComputingTaskPreset = "core",
): ReadonlySet<TextComputingDocumentTask> {
	if (tasks !== undefined) {
		return new Set<TextComputingDocumentTask>([
			"segmentation",
			"normalization",
			...tasks,
		]);
	}
	const presetTasks: Readonly<
		Record<TextComputingTaskPreset, readonly TextComputingDocumentTask[]>
	> = {
		core: ["search"],
		lookup: ["lexicon", "morphology", "search"],
	};
	return new Set<TextComputingDocumentTask>([
		"segmentation",
		"normalization",
		...presetTasks[preset],
	]);
}

export function uniqueSorted(values: readonly string[]): readonly string[] {
	return Object.freeze(
		[...new Set(values)].sort((left, right) => left.localeCompare(right)),
	);
}

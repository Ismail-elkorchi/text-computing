import type { TextPack } from "@ismail-elkorchi/textpack";

export function unsupportedTaskError(pack: TextPack, slot: string): TypeError {
	const capabilitySlot = pack.manifest.capabilitySlots.find(
		(candidate) => candidate.slot === slot,
	);
	const status = capabilitySlot?.status;
	const details = [
		`status=${status ?? "missing"}`,
		...(status === "artifact-backed"
			? ["artifact-backed-only: local task-usable payload is not materialized"]
			: []),
		...(status === "sampled"
			? ["sampled-only: sampled resources cannot satisfy SDK task execution"]
			: []),
		...(capabilitySlot?.notes ?? []),
		...(pack.manifest.gapNotes ?? [])
			.filter((note) => note.slot === slot)
			.map((note) => `${note.status}: ${note.message}`),
		...(pack.manifest.components ?? [])
			.filter((component) => component.role === "excluded")
			.map((component) =>
				[
					`excluded component ${component.packageName}`,
					`licensePolicy=${component.licensePolicy}`,
					component.reason,
				]
					.filter((part): part is string => part !== undefined)
					.join("; "),
			),
	];
	return new TypeError(
		`Textpack ${pack.manifest.packageName} cannot run task slot ${slot}: ${details.join(" | ")}.`,
	);
}

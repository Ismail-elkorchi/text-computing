import { fail } from "../internal/errors.js";

export type SequenceLabelScheme = "IOB" | "BIO" | "BILOU";

export interface ParsedSequenceLabel {
	readonly prefix: "B" | "I" | "L" | "O" | "U";
	readonly type?: string;
}

export function parseSequenceLabel(label: string): ParsedSequenceLabel {
	if (label === "O") return { prefix: "O" };
	const match = /^([BILU])-([^\s]+)$/.exec(label);
	if (match?.[1] === undefined || match[2] === undefined) {
		fail("TEXTDATA_IOB_LABEL", `invalid sequence label: ${label}`);
	}
	return { prefix: match[1] as ParsedSequenceLabel["prefix"], type: match[2] };
}

export function assertTransition(
	previous: ParsedSequenceLabel | undefined,
	current: ParsedSequenceLabel,
	scheme: SequenceLabelScheme,
): void {
	if (
		current.prefix === "O" ||
		current.prefix === "B" ||
		current.prefix === "U"
	)
		return;
	if (scheme === "BIO" || scheme === "BILOU") {
		if (
			previous === undefined ||
			previous.prefix === "O" ||
			previous.type !== current.type
		) {
			fail("TEXTDATA_IOB_TRANSITION", "invalid sequence-label transition");
		}
	}
	if (current.prefix === "L" && scheme !== "BILOU") {
		fail("TEXTDATA_IOB_TRANSITION", "L prefix requires BILOU scheme");
	}
}

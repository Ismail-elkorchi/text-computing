import { safeIdPart, stableHash } from "../internal/ids.ts";

export function lexicalAnnotationId(
	layerId: string,
	entryId: string,
	start: number,
	end: number,
	rank: number,
): string {
	return `${safeIdPart(layerId)}:${safeIdPart(entryId)}:${start}-${end}:${rank}:${stableHash(`${layerId}:${entryId}:${start}:${end}:${rank}`)}`;
}

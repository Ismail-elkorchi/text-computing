import { stableHash64 } from "@ismail-elkorchi/textfacts/hash";
import { stableJsonStringify } from "./json.js";

export const packageName = "@ismail-elkorchi/textdata" as const;
export const packageVersion = "0.1.0" as const;

export function stableId(prefix: string, value: unknown): string {
	return `${prefix}:${stableHash64(stableJsonStringify(value))}`;
}

export function inputOrderId(prefix: string, index: number): string {
	return `${prefix}:${String(index + 1).padStart(6, "0")}`;
}

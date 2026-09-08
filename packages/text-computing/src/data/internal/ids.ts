export { packageName, packageVersion } from "../../internal/constants.ts";

import { stableHash64 } from "../../unicode/hash/mod.ts";
import { stableJsonStringify } from "./json.ts";

export function stableId(prefix: string, value: unknown): string {
	return `${prefix}:${stableHash64(stableJsonStringify(value))}`;
}

export function inputOrderId(prefix: string, index: number): string {
	return `${prefix}:${String(index + 1).padStart(6, "0")}`;
}

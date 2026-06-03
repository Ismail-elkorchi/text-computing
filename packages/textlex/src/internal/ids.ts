export function stableHash(text: string): string {
	let hash = 2166136261;
	for (let index = 0; index < text.length; index += 1) {
		hash ^= text.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return (hash >>> 0).toString(16).padStart(8, "0");
}

function isSafeIdChar(char: string): boolean {
	const code = char.charCodeAt(0);
	return (
		(code >= 65 && code <= 90) ||
		(code >= 97 && code <= 122) ||
		(code >= 48 && code <= 57) ||
		char === "." ||
		char === "_" ||
		char === ":" ||
		char === "-"
	);
}

function stripBoundaryHyphens(value: string): string {
	let start = 0;
	let end = value.length;
	while (start < end && value[start] === "-") start += 1;
	while (end > start && value[end - 1] === "-") end -= 1;
	return value.slice(start, end);
}

export function safeIdPart(value: string): string {
	let output = "";
	let pendingSeparator = false;
	for (const char of value.trim()) {
		if (isSafeIdChar(char)) {
			if (pendingSeparator && output.length > 0) output += "-";
			output += char;
			pendingSeparator = false;
		} else {
			pendingSeparator = true;
		}
	}
	const normalized = stripBoundaryHyphens(output);
	return normalized.length > 0 ? normalized : stableHash(value);
}

export function generatedId(prefix: string, value: string): string {
	return `${prefix}:${safeIdPart(value)}:${stableHash(value)}`;
}

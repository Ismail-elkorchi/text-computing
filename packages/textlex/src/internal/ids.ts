export function stableHash(text: string): string {
	let hash = 2166136261;
	for (let index = 0; index < text.length; index += 1) {
		hash ^= text.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return (hash >>> 0).toString(16).padStart(8, "0");
}

export function safeIdPart(value: string): string {
	const normalized = value
		.trim()
		.replace(/[^A-Za-z0-9._:-]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return normalized.length > 0 ? normalized : stableHash(value);
}

export function generatedId(prefix: string, value: string): string {
	return `${prefix}:${safeIdPart(value)}:${stableHash(value)}`;
}

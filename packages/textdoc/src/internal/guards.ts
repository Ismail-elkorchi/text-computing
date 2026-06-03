export interface TextdocRecord extends Record<string, unknown> {
	readonly algorithm?: unknown;
	readonly alternatives?: unknown;
	readonly annotationId?: unknown;
	readonly annotations?: unknown;
	readonly byteLength?: unknown;
	readonly corpusIds?: unknown;
	readonly cost?: unknown;
	readonly edges?: unknown;
	readonly end?: unknown;
	readonly entries?: unknown;
	readonly exactness?: unknown;
	readonly evidence?: unknown;
	readonly features?: unknown;
	readonly fstIds?: unknown;
	readonly grammarIds?: unknown;
	readonly graphs?: unknown;
	readonly id?: unknown;
	readonly inputKind?: unknown;
	readonly inputViewIds?: unknown;
	readonly kbIds?: unknown;
	readonly kind?: unknown;
	readonly label?: unknown;
	readonly layer?: unknown;
	readonly layerId?: unknown;
	readonly layers?: unknown;
	readonly metadata?: unknown;
	readonly mode?: unknown;
	readonly nodes?: unknown;
	readonly optionsHash?: unknown;
	readonly packageName?: unknown;
	readonly packageVersion?: unknown;
	readonly producer?: unknown;
	readonly relation?: unknown;
	readonly resourceIds?: unknown;
	readonly ruleIds?: unknown;
	readonly scale?: unknown;
	readonly score?: unknown;
	readonly source?: unknown;
	readonly sources?: unknown;
	readonly sourceViewId?: unknown;
	readonly span?: unknown;
	readonly spanMapId?: unknown;
	readonly spanMaps?: unknown;
	readonly spans?: unknown;
	readonly start?: unknown;
	readonly statisticalModelIds?: unknown;
	readonly target?: unknown;
	readonly targetViewId?: unknown;
	readonly text?: unknown;
	readonly transform?: unknown;
	readonly type?: unknown;
	readonly unit?: unknown;
	readonly value?: unknown;
	readonly version?: unknown;
	readonly viewId?: unknown;
	readonly views?: unknown;
	readonly wellFormed?: unknown;
}

export function isRecord(value: unknown): value is TextdocRecord {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.length > 0;
}

export function isFiniteNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value);
}

export function isNonNegativeInteger(value: unknown): value is number {
	return Number.isInteger(value) && (value as number) >= 0;
}

export function isStringArray(value: unknown): value is readonly string[] {
	return (
		Array.isArray(value) && value.every((entry) => typeof entry === "string")
	);
}

export function hasOwn(record: Record<string, unknown>, key: string): boolean {
	return Object.hasOwn(record, key);
}

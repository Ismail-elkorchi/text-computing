import { getResource } from "./pack.js";
import type { TextPack, TextPackResource } from "./types.js";

export type TextPackResourceEncoding = "utf8" | "gzip-base64";

export type TextPackMaterializedTableRow = Readonly<Record<string, string>>;

export interface TextPackFileBackedResource {
	readonly kind: "file-backed-resource";
	readonly packageName?: string;
	readonly packageRoot?: string;
	readonly path: string;
	readonly encoding: TextPackResourceEncoding;
	readonly checksum: string;
	readonly byteLength: number;
	readonly resourceTextByteLength?: number;
	readonly lineCount?: number;
	readonly nonEmptyLineCount?: number;
}

export interface TextPackResourceReadContext {
	readonly pack: TextPack;
	readonly resource: TextPackResource;
	readonly descriptor: TextPackFileBackedResource;
}

export interface TextPackResourceReader {
	readonly readText: (
		context: TextPackResourceReadContext,
	) => Promise<string> | string;
}

export interface TextPackMaterializedTable {
	readonly columns: readonly string[];
	readonly rows: readonly TextPackMaterializedTableRow[];
}

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder("utf-8", { fatal: true });

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isResourceEncoding(value: unknown): value is TextPackResourceEncoding {
	return value === "utf8" || value === "gzip-base64";
}

export function isFileBackedResource(
	value: unknown,
): value is TextPackFileBackedResource {
	return (
		isRecord(value) &&
		value.kind === "file-backed-resource" &&
		typeof value.path === "string" &&
		isResourceEncoding(value.encoding) &&
		typeof value.checksum === "string" &&
		typeof value.byteLength === "number" &&
		(value.packageName === undefined ||
			typeof value.packageName === "string") &&
		(value.packageRoot === undefined ||
			typeof value.packageRoot === "string") &&
		(value.resourceTextByteLength === undefined ||
			typeof value.resourceTextByteLength === "number") &&
		(value.lineCount === undefined || typeof value.lineCount === "number") &&
		(value.nonEmptyLineCount === undefined ||
			typeof value.nonEmptyLineCount === "number")
	);
}

function resourceDescriptor(
	pack: TextPack,
	resourceId: string,
): TextPackResource {
	const descriptor = pack.manifest.resources.find(
		(resource) => resource.id === resourceId,
	);
	if (descriptor === undefined) {
		throw new TypeError(`Textpack resource ${resourceId} is not declared.`);
	}
	return descriptor;
}

function checksumParts(checksum: string): {
	readonly algorithm: string;
	readonly value: string;
} {
	const match = /^(sha256):([0-9a-f]{64})$/u.exec(checksum);
	if (match === null) {
		throw new TypeError(
			`Textpack resource checksum must be sha256:<64 hex chars>.`,
		);
	}
	return { algorithm: match[1] ?? "", value: match[2] ?? "" };
}

function bytesForText(text: string): Uint8Array {
	return utf8Encoder.encode(text);
}

function byteLength(text: string): number {
	return bytesForText(text).byteLength;
}

function arrayBufferForBytes(bytes: Uint8Array): ArrayBuffer {
	const copy = new Uint8Array(bytes.byteLength);
	copy.set(bytes);
	return copy.buffer;
}

function hex(bytes: Uint8Array): string {
	return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(text: string): Promise<string> {
	const digest = await globalThis.crypto.subtle.digest(
		"SHA-256",
		arrayBufferForBytes(bytesForText(text)),
	);
	return hex(new Uint8Array(digest));
}

async function assertEncodedResourceIntegrity(
	descriptor: TextPackFileBackedResource,
	encodedText: string,
): Promise<void> {
	const actualByteLength = byteLength(encodedText);
	if (actualByteLength !== descriptor.byteLength) {
		throw new TypeError(
			`Textpack resource ${descriptor.path} byte length mismatch: expected ${descriptor.byteLength}, got ${actualByteLength}.`,
		);
	}
	const expected = checksumParts(descriptor.checksum);
	if (expected.algorithm !== "sha256") {
		throw new TypeError(
			`Textpack resource ${descriptor.path} uses unsupported checksum ${expected.algorithm}.`,
		);
	}
	const actualChecksum = await sha256Hex(encodedText);
	if (actualChecksum !== expected.value) {
		throw new TypeError(
			`Textpack resource ${descriptor.path} checksum mismatch: expected ${descriptor.checksum}, got sha256:${actualChecksum}.`,
		);
	}
}

function base64Bytes(value: string): Uint8Array {
	const compact = value.replace(/\s+/gu, "");
	const decode = globalThis.atob;
	if (typeof decode !== "function") {
		throw new TypeError("Base64 decoding is not available in this runtime.");
	}
	const binary = decode(compact);
	const bytes = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}
	return bytes;
}

async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
	if (typeof DecompressionStream !== "function") {
		throw new TypeError(
			"gzip decoding requires a runtime with DecompressionStream.",
		);
	}
	const stream = new Blob([arrayBufferForBytes(bytes)])
		.stream()
		.pipeThrough(new DecompressionStream("gzip"));
	return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function decodeResourceText(
	descriptor: TextPackFileBackedResource,
	encodedText: string,
): Promise<string> {
	if (descriptor.encoding === "utf8") return encodedText;
	const decodedBytes = await gunzip(base64Bytes(encodedText));
	const decodedText = utf8Decoder.decode(decodedBytes);
	if (
		descriptor.resourceTextByteLength !== undefined &&
		byteLength(decodedText) !== descriptor.resourceTextByteLength
	) {
		throw new TypeError(
			`Textpack resource ${descriptor.path} decoded byte length mismatch: expected ${descriptor.resourceTextByteLength}, got ${byteLength(decodedText)}.`,
		);
	}
	return decodedText;
}

async function readFileBackedText(
	pack: TextPack,
	resource: TextPackResource,
	descriptor: TextPackFileBackedResource,
	reader: TextPackResourceReader | undefined,
): Promise<string> {
	if (reader === undefined) {
		throw new TypeError(
			`Textpack resource ${resource.id} is file-backed and requires a resource reader.`,
		);
	}
	const encodedText = await reader.readText({ pack, resource, descriptor });
	await assertEncodedResourceIntegrity(descriptor, encodedText);
	return decodeResourceText(descriptor, encodedText);
}

export async function openResourceText(
	pack: TextPack,
	resourceId: string,
	reader?: TextPackResourceReader,
): Promise<string> {
	const descriptor = resourceDescriptor(pack, resourceId);
	const value = getResource(pack, resourceId);
	if (typeof value === "string") return value;
	if (isFileBackedResource(value)) {
		return readFileBackedText(pack, descriptor, value, reader);
	}
	throw new TypeError(`Textpack resource ${resourceId} is not text-backed.`);
}

export async function openResourceJson<T = unknown>(
	pack: TextPack,
	resourceId: string,
	reader?: TextPackResourceReader,
): Promise<T> {
	const value = getResource(pack, resourceId);
	if (!isFileBackedResource(value) && typeof value !== "string")
		return value as T;
	const text = await openResourceText(pack, resourceId, reader);
	return JSON.parse(text) as T;
}

function normalizeLines(text: string): string[] {
	const lines = text.replace(/\r\n/gu, "\n").replace(/\r/gu, "\n").split("\n");
	while (lines.length > 0 && lines[lines.length - 1] === "") {
		lines.pop();
	}
	return lines;
}

export function parseResourceTable(text: string): TextPackMaterializedTable {
	const lines = normalizeLines(text);
	if (lines.length === 0) {
		throw new TypeError("Textpack table resource must contain a header row.");
	}
	const header = lines[0];
	if (header === undefined || header.length === 0) {
		throw new TypeError(
			"Textpack table resource must contain a non-empty header.",
		);
	}
	const columns = Object.freeze(header.split("\t"));
	if (new Set(columns).size !== columns.length) {
		throw new TypeError("Textpack table header must not duplicate columns.");
	}
	const rows: TextPackMaterializedTableRow[] = [];
	for (let index = 1; index < lines.length; index += 1) {
		const line = lines[index];
		if (line === undefined || line.length === 0) continue;
		const cells = line.split("\t");
		if (cells.length > columns.length) {
			throw new TypeError(
				`Textpack table row ${index + 1} has more cells than the header.`,
			);
		}
		const row: Record<string, string> = {};
		for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
			const column = columns[columnIndex];
			if (column === undefined || column.length === 0) {
				throw new TypeError("Textpack table header contains an empty column.");
			}
			row[column] = cells[columnIndex] ?? "";
		}
		rows.push(Object.freeze(row));
	}
	return Object.freeze({
		columns,
		rows: Object.freeze(rows),
	});
}

export async function openResourceTable(
	pack: TextPack,
	resourceId: string,
	reader?: TextPackResourceReader,
): Promise<TextPackMaterializedTable> {
	return parseResourceTable(await openResourceText(pack, resourceId, reader));
}

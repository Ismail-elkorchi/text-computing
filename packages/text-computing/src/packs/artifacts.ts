import type {
	TextPack,
	TextPackArtifactDescriptor,
	TextPackArtifactExpectedFile,
} from "./types.ts";

export interface TextPackArtifactReadContext {
	readonly pack: TextPack;
	readonly artifact: TextPackArtifactDescriptor;
	readonly file: TextPackArtifactExpectedFile;
}

export interface ArtifactIdentity {
	readonly packId: string;
	readonly packVersion: string;
	readonly artifactId: string;
	readonly artifactVersion: string;
	readonly file: string;
	readonly checksum: string;
	readonly sizeBytes: number;
}

/** Content-addressed identity shared by materialization, execution, and evidence. */
export function artifactIdentity(
	pack: TextPack,
	artifactId: string,
	filePath?: string,
): ArtifactIdentity {
	const artifact = artifactDescriptor(pack, artifactId);
	const file = artifactFile(artifact, filePath);
	if (file.checksum === undefined)
		throw new TypeError(
			`Artifact ${artifactId}/${file.path} has no integrity checksum.`,
		);
	parseChecksum(file.checksum);
	return Object.freeze({
		packId: pack.manifest.id,
		packVersion: pack.manifest.version,
		artifactId,
		artifactVersion: artifact.version,
		file: file.path,
		checksum: file.checksum,
		sizeBytes: file.sizeBytes ?? artifact.sizeBytes,
	});
}

export interface TextPackArtifactReader {
	readonly readBytes: (
		context: TextPackArtifactReadContext,
	) => Promise<Uint8Array> | Uint8Array;
}

export interface TextPackFetchArtifactReaderOptions {
	readonly fetch?: typeof fetch;
	readonly requestInit?: RequestInit;
	readonly resolveUrl?: (context: TextPackArtifactReadContext) => URL | string;
}

interface ArtifactMaterializationCache {
	readonly readers: WeakMap<
		TextPackArtifactReader,
		Map<string, Promise<Uint8Array>>
	>;
}

const materializationCaches = new WeakMap<
	object,
	ArtifactMaterializationCache
>();

function artifactDescriptor(
	pack: TextPack,
	artifactId: string,
): TextPackArtifactDescriptor {
	const descriptor = pack.manifest.artifacts?.find(
		(artifact) => artifact.artifactId === artifactId,
	);
	if (descriptor === undefined) {
		throw new TypeError(`Textpack artifact ${artifactId} is not declared.`);
	}
	return descriptor;
}

function artifactFile(
	artifact: TextPackArtifactDescriptor,
	filePath: string | undefined,
): TextPackArtifactExpectedFile {
	if (filePath === undefined) {
		if (artifact.expectedFiles.length !== 1) {
			throw new TypeError(
				`Textpack artifact ${artifact.artifactId} contains ${artifact.expectedFiles.length} files; a file path is required.`,
			);
		}
		const onlyFile = artifact.expectedFiles[0];
		if (onlyFile === undefined) {
			throw new TypeError(
				`Textpack artifact ${artifact.artifactId} does not declare a file.`,
			);
		}
		return onlyFile;
	}
	const file = artifact.expectedFiles.find(
		(candidate) => candidate.path === filePath,
	);
	if (file === undefined) {
		throw new TypeError(
			`Textpack artifact ${artifact.artifactId} does not declare ${filePath}.`,
		);
	}
	return file;
}

function materializationCache(
	pack: TextPack,
	reader: TextPackArtifactReader,
): Map<string, Promise<Uint8Array>> {
	let packCache = materializationCaches.get(pack);
	if (packCache === undefined) {
		packCache = { readers: new WeakMap() };
		materializationCaches.set(pack, packCache);
	}
	let readerCache = packCache.readers.get(reader);
	if (readerCache === undefined) {
		readerCache = new Map();
		packCache.readers.set(reader, readerCache);
	}
	return readerCache;
}

function copyBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
	const copy = new Uint8Array(bytes.byteLength);
	copy.set(bytes);
	return copy;
}

function parseChecksum(checksum: string): {
	readonly algorithm: "SHA-1" | "SHA-256" | "SHA-512";
	readonly value: string;
} {
	const match = /^(sha1|sha256|sha512):([0-9a-f]+)$/u.exec(checksum);
	if (match === null) {
		throw new TypeError(
			"Textpack artifact checksum must use sha1, sha256, or sha512 and lowercase hexadecimal.",
		);
	}
	const names = {
		sha1: { algorithm: "SHA-1", length: 40 },
		sha256: { algorithm: "SHA-256", length: 64 },
		sha512: { algorithm: "SHA-512", length: 128 },
	} as const;
	const name = match[1] as keyof typeof names;
	const definition = names[name];
	const value = match[2] ?? "";
	if (value.length !== definition.length) {
		throw new TypeError(
			`Textpack artifact ${name} checksum must contain ${definition.length} hexadecimal characters.`,
		);
	}
	return { algorithm: definition.algorithm, value };
}

function hex(bytes: Uint8Array): string {
	return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function contentChecksum(
	value: string | Uint8Array,
): Promise<string> {
	const bytes =
		typeof value === "string"
			? new TextEncoder().encode(value)
			: copyBytes(value);
	return `sha256:${hex(new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes)))}`;
}

async function assertChecksum(
	label: string,
	bytes: Uint8Array<ArrayBuffer>,
	checksum: string,
): Promise<void> {
	const expected = parseChecksum(checksum);
	const digest = await globalThis.crypto.subtle.digest(
		expected.algorithm,
		bytes,
	);
	const actual = hex(new Uint8Array(digest));
	if (actual !== expected.value) {
		throw new TypeError(
			`${label} checksum mismatch: expected ${checksum}, got ${expected.algorithm.toLowerCase().replace("-", "")}:${actual}.`,
		);
	}
}

async function materializeArtifactFile(
	context: TextPackArtifactReadContext,
	reader: TextPackArtifactReader,
): Promise<Uint8Array> {
	const bytes = copyBytes(await reader.readBytes(context));
	if (
		context.file.sizeBytes !== undefined &&
		bytes.byteLength !== context.file.sizeBytes
	) {
		throw new TypeError(
			`Textpack artifact ${context.artifact.artifactId}/${context.file.path} byte length mismatch: expected ${context.file.sizeBytes}, got ${bytes.byteLength}.`,
		);
	}
	const fileChecksum = context.file.checksum;
	if (fileChecksum === undefined) {
		throw new TypeError(
			`Textpack artifact ${context.artifact.artifactId}/${context.file.path} has no integrity checksum.`,
		);
	}
	await assertChecksum(
		`Textpack artifact ${context.artifact.artifactId}/${context.file.path}`,
		bytes,
		fileChecksum,
	);
	if (context.artifact.expectedFiles.length === 1) {
		if (bytes.byteLength !== context.artifact.sizeBytes) {
			throw new TypeError(
				`Textpack artifact ${context.artifact.artifactId} byte length mismatch: expected ${context.artifact.sizeBytes}, got ${bytes.byteLength}.`,
			);
		}
		await assertChecksum(
			`Textpack artifact ${context.artifact.artifactId}`,
			bytes,
			`${context.artifact.checksum.algorithm}:${context.artifact.checksum.value}`,
		);
	}
	return bytes;
}

function defaultArtifactUrl(context: TextPackArtifactReadContext): URL {
	const uri = context.artifact.retrieval.uri;
	if (uri === undefined) {
		throw new TypeError(
			`Textpack artifact ${context.artifact.artifactId} has no retrieval URI.`,
		);
	}
	if (context.artifact.expectedFiles.length === 1) return new URL(uri);
	const root = new URL(uri.endsWith("/") ? uri : `${uri}/`);
	const url = new URL(context.file.path, root);
	if (!url.href.startsWith(root.href)) {
		throw new TypeError(
			`Textpack artifact path ${context.file.path} escapes retrieval root ${root.href}.`,
		);
	}
	return url;
}

export function createFetchArtifactReader(
	options: TextPackFetchArtifactReaderOptions = {},
): TextPackArtifactReader {
	const fetchArtifact = options.fetch ?? globalThis.fetch;
	if (typeof fetchArtifact !== "function") {
		throw new TypeError(
			"Fetch-backed textpack artifact reading requires fetch.",
		);
	}
	return {
		async readBytes(context) {
			const resolved =
				options.resolveUrl?.(context) ?? defaultArtifactUrl(context);
			const url = resolved instanceof URL ? resolved : new URL(resolved);
			const response = await fetchArtifact(url, options.requestInit);
			if (!response.ok) {
				throw new TypeError(
					`Textpack artifact fetch failed for ${url.href}: ${response.status} ${response.statusText}`.trim(),
				);
			}
			return new Uint8Array(await response.arrayBuffer());
		},
	};
}

export async function openArtifactBytes(
	pack: TextPack,
	artifactId: string,
	reader: TextPackArtifactReader,
	filePath?: string,
): Promise<Uint8Array> {
	const artifact = artifactDescriptor(pack, artifactId);
	const file = artifactFile(artifact, filePath);
	const cache = materializationCache(pack, reader);
	const cacheKey = JSON.stringify(
		artifactIdentity(pack, artifactId, file.path),
	);
	let pending = cache.get(cacheKey);
	if (pending === undefined) {
		pending = materializeArtifactFile({ pack, artifact, file }, reader);
		cache.set(cacheKey, pending);
		void pending.catch(() => {
			if (cache.get(cacheKey) === pending) cache.delete(cacheKey);
		});
	}
	return copyBytes(await pending);
}

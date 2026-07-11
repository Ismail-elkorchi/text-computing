import { spawn, spawnSync } from "node:child_process";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

function splitSourceUrl(sourceUrl) {
	const index = sourceUrl.indexOf("#");
	if (index === -1) return { url: sourceUrl, fragment: undefined };
	return {
		url: sourceUrl.slice(0, index),
		fragment: sourceUrl.slice(index + 1),
	};
}

function sourceDownloadUrl(sourceUrl) {
	const { url } = splitSourceUrl(sourceUrl);
	const parsedUrl = new URL(url);
	if (parsedUrl.protocol !== "https:") {
		throw new Error(`Source URL ${url} must use HTTPS.`);
	}
	return url;
}

function runCommand(command, args) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			stdio: ["ignore", "ignore", "pipe"],
		});
		const stderr = [];
		child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
		child.on("error", reject);
		child.on("close", (code) => {
			if (code === 0) {
				resolve();
				return;
			}
			reject(
				new Error(
					`${command} exited with ${code}: ${Buffer.concat(stderr).toString("utf8").trim()}`,
				),
			);
		});
	});
}

async function acquireSourceUrl(sourceUrl, outputPath) {
	const { fragment } = splitSourceUrl(sourceUrl);
	const url = sourceDownloadUrl(sourceUrl);
	const downloadPath =
		fragment === undefined ? outputPath : `${outputPath}.zip`;
	await runCommand("curl", [
		"--fail",
		"--location",
		"--proto",
		"=https",
		"--silent",
		"--show-error",
		"--output",
		downloadPath,
		url,
	]);
	if (fragment === undefined) return;
	const memberPath = decodeURIComponent(fragment);
	if (
		memberPath.length === 0 ||
		memberPath.includes("..") ||
		memberPath.startsWith("/") ||
		memberPath.includes("\\")
	) {
		throw new Error(`Unsafe archive member ${fragment}.`);
	}
	const extracted = spawnSync("unzip", ["-p", downloadPath, memberPath], {
		encoding: null,
		maxBuffer: 512 * 1024 * 1024,
	});
	await rm(downloadPath, { force: true });
	if (extracted.status !== 0 || extracted.stdout === null) {
		throw new Error(
			`Failed to extract ${memberPath} from ${url}.\n${extracted.stderr?.toString("utf8").trim() ?? ""}`,
		);
	}
	await writeFile(outputPath, extracted.stdout);
}

async function existingSnapshotFileState(file, absolute, sha256Bytes) {
	try {
		const bytes = await readFile(absolute);
		const fileStat = await stat(absolute);
		const checksum = sha256Bytes(bytes);
		return {
			exists: true,
			matches: checksum === file.checksum && fileStat.size === file.byteLength,
			checksum,
			byteLength: fileStat.size,
		};
	} catch {
		return { exists: false, matches: false };
	}
}

export async function acquireSnapshots({
	snapshots,
	requiredPaths,
	all,
	snapshotDataPath,
	sha256Bytes,
}) {
	let acquiredCount = 0;
	let alreadyCurrentCount = 0;
	let skippedLocalDerivativeCount = 0;
	let skippedUnselectedCount = 0;
	for (const snapshot of snapshots) {
		for (const file of snapshot.files ?? []) {
			if (!all && !requiredPaths.has(file.path)) {
				skippedUnselectedCount += 1;
				continue;
			}
			const absolute = snapshotDataPath(
				file.path,
				`${snapshot.snapshotId} file path`,
			);
			if (typeof file.sourceUrl !== "string" || file.sourceUrl.length === 0) {
				skippedLocalDerivativeCount += 1;
				continue;
			}
			const existingState = await existingSnapshotFileState(
				file,
				absolute,
				sha256Bytes,
			);
			if (existingState.matches) {
				alreadyCurrentCount += 1;
				continue;
			}
			if (existingState.exists) {
				throw new Error(
					`${snapshot.snapshotId} local file ${file.path} checksum mismatch.\nexpected ${file.checksum} (${file.byteLength} bytes)\nactual   ${existingState.checksum} (${existingState.byteLength} bytes)`,
				);
			}
			await mkdir(path.dirname(absolute), { recursive: true });
			const tempPath = `${absolute}.download`;
			await rm(tempPath, { force: true });
			await acquireSourceUrl(file.sourceUrl, tempPath);
			const bytes = await readFile(tempPath);
			const checksum = sha256Bytes(bytes);
			if (checksum !== file.checksum || bytes.byteLength !== file.byteLength) {
				await rm(tempPath, { force: true });
				throw new Error(
					`${snapshot.snapshotId} acquired ${file.path} does not match its descriptor.`,
				);
			}
			await rename(tempPath, absolute);
			acquiredCount += 1;
		}
	}
	return {
		acquiredCount,
		alreadyCurrentCount,
		skippedLocalDerivativeCount,
		skippedUnselectedCount,
	};
}

export async function updateSnapshotDescriptors({
	lock,
	snapshotEntries,
	snapshotDataPath,
	sha256Bytes,
	snapshotAggregateChecksum,
	readJson,
	writeJson,
	lockPath,
}) {
	const snapshotFileByKey = new Map();
	for (const entry of snapshotEntries) {
		if (!Array.isArray(entry.snapshot.files)) continue;
		const files = [];
		for (const file of entry.snapshot.files) {
			const absolute = snapshotDataPath(
				file.path,
				`${entry.snapshot.snapshotId} file path`,
			);
			const bytes = await readFile(absolute);
			const fileStat = await stat(absolute);
			const updatedFile = {
				...file,
				byteLength: fileStat.size,
				checksum: sha256Bytes(bytes),
			};
			files.push(updatedFile);
			snapshotFileByKey.set(
				`${entry.snapshot.snapshotId}\n${updatedFile.path}`,
				updatedFile,
			);
		}
		files.sort((left, right) => left.path.localeCompare(right.path));
		entry.snapshot.files = files;
		entry.snapshot.checksum = snapshotAggregateChecksum(files);
	}
	for (const entry of snapshotEntries) {
		await writeJson(entry.snapshotPath, entry.snapshot);
	}
	for (const resourceSpecPath of lock.resourceSpecPaths ?? []) {
		const resourceSpec = await readJson(resourceSpecPath);
		let changed = false;
		for (const inputFile of resourceSpec.inputFiles ?? []) {
			const snapshotFile = snapshotFileByKey.get(
				`${inputFile.snapshotId}\n${inputFile.path}`,
			);
			if (snapshotFile === undefined) {
				throw new Error(
					`${resourceSpec.resourceSpecId} input ${inputFile.path} is not declared by snapshot ${inputFile.snapshotId}.`,
				);
			}
			if (inputFile.checksum !== snapshotFile.checksum) {
				inputFile.checksum = snapshotFile.checksum;
				changed = true;
			}
		}
		if (changed) await writeJson(resourceSpecPath, resourceSpec);
	}
	lock.snapshotLocks = snapshotEntries.map((entry) => ({
		snapshotId: entry.snapshot.snapshotId,
		checksum: entry.snapshot.checksum,
	}));
	await writeJson(lockPath, lock);
}

export async function acquireFromForgeLock({
	lockPath,
	readJson,
	collectContext,
	all,
	snapshotDataPath,
	sha256Bytes,
}) {
	const lock = await readJson(lockPath);
	const snapshots = await Promise.all(
		lock.snapshotPaths.map((snapshotPath) => readJson(snapshotPath)),
	);
	const requiredPaths = new Set();
	if (all !== true) {
		const context = await collectContext({ materializeResources: false });
		for (const pack of context.packs.filter(
			(candidate) => candidate.distribution === true,
		)) {
			for (const resourceSpecId of pack.resourceSpecIds) {
				const resourceSpec = context.resourceSpecById.get(resourceSpecId);
				for (const inputFile of resourceSpec?.inputFiles ?? []) {
					requiredPaths.add(inputFile.path);
				}
			}
			for (const licenseFile of pack.licenseEvidenceFiles) {
				requiredPaths.add(licenseFile.sourcePath);
			}
		}
	}
	return acquireSnapshots({
		snapshots,
		requiredPaths,
		all: all === true,
		snapshotDataPath,
		sha256Bytes,
	});
}

export async function updateSnapshotsFromForgeLock({
	lockPath,
	readJson,
	writeJson,
	collectContext,
	snapshotDataPath,
	sha256Bytes,
	snapshotAggregateChecksum,
}) {
	const lock = await readJson(lockPath);
	const snapshotEntries = await Promise.all(
		lock.snapshotPaths.map(async (snapshotPath) => ({
			snapshotPath,
			snapshot: await readJson(snapshotPath),
		})),
	);
	await updateSnapshotDescriptors({
		lock,
		snapshotEntries,
		snapshotDataPath,
		sha256Bytes,
		snapshotAggregateChecksum,
		readJson,
		writeJson,
		lockPath,
	});
	await collectContext();
	return snapshotEntries.length;
}

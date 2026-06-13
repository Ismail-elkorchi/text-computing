import { composePacks } from "./compose.js";
import { createPack, loadPack } from "./pack.js";
import type {
	ResolveTextPackComponentsOptions,
	TextPack,
	TextPackArtifactPolicy,
	TextPackComponent,
	TextPackComponentLicensePolicy,
	TextPackGapNote,
	TextPackManifest,
} from "./types.js";

const licensePolicyRank = new Map<TextPackComponentLicensePolicy, number>([
	["default", 0],
	["allow-attribution", 1],
	["allow-share-alike", 2],
	["allow-copyleft", 3],
	["local-only", 4],
]);

const artifactPolicyRank = new Map<TextPackArtifactPolicy, number>([
	["none", 0],
	["locked", 1],
	["fetch-explicit", 2],
]);

function componentLabel(component: TextPackComponent): string {
	return component.packageName.replace("@ismail-elkorchi/", "");
}

function optionSet(values: readonly string[] | undefined): ReadonlySet<string> {
	return new Set(values ?? []);
}

function matchesComponent(
	component: TextPackComponent,
	values: ReadonlySet<string>,
): boolean {
	return (
		values.has(component.packageName) ||
		values.has(componentLabel(component)) ||
		values.has(component.reason ?? "")
	);
}

function policyRank<T extends string>(
	ranks: ReadonlyMap<T, number>,
	value: T,
): number {
	return ranks.get(value) ?? Number.MAX_SAFE_INTEGER;
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

interface VersionCore {
	readonly major: number;
	readonly minor: number;
	readonly patch: number;
	readonly prerelease: readonly string[];
}

function parseVersion(value: string): VersionCore | undefined {
	const match =
		/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/u.exec(
			value.trim(),
		);
	if (match === null) return undefined;
	return {
		major: Number(match[1]),
		minor: Number(match[2]),
		patch: Number(match[3]),
		prerelease:
			match[4] === undefined
				? Object.freeze([])
				: Object.freeze(match[4].split(".")),
	};
}

function numericPrereleaseIdentifier(value: string): number | undefined {
	if (!/^(0|[1-9]\d*)$/u.test(value)) return undefined;
	return Number(value);
}

function comparePrereleaseIdentifiers(left: string, right: string): number {
	const leftNumber = numericPrereleaseIdentifier(left);
	const rightNumber = numericPrereleaseIdentifier(right);
	if (leftNumber !== undefined && rightNumber !== undefined) {
		return leftNumber - rightNumber;
	}
	if (leftNumber !== undefined) return -1;
	if (rightNumber !== undefined) return 1;
	if (left < right) return -1;
	if (left > right) return 1;
	return 0;
}

function comparePrerelease(
	left: readonly string[],
	right: readonly string[],
): number {
	if (left.length === 0 && right.length === 0) return 0;
	if (left.length === 0) return 1;
	if (right.length === 0) return -1;
	const length = Math.max(left.length, right.length);
	for (let index = 0; index < length; index += 1) {
		const leftIdentifier = left[index];
		const rightIdentifier = right[index];
		if (leftIdentifier === undefined) return -1;
		if (rightIdentifier === undefined) return 1;
		const comparison = comparePrereleaseIdentifiers(
			leftIdentifier,
			rightIdentifier,
		);
		if (comparison !== 0) return comparison;
	}
	return 0;
}

function compareVersions(left: VersionCore, right: VersionCore): number {
	return (
		left.major - right.major ||
		left.minor - right.minor ||
		left.patch - right.patch ||
		comparePrerelease(left.prerelease, right.prerelease)
	);
}

function caretUpperBound(version: VersionCore): VersionCore {
	if (version.major > 0) {
		return { major: version.major + 1, minor: 0, patch: 0, prerelease: [] };
	}
	if (version.minor > 0) {
		return {
			major: 0,
			minor: version.minor + 1,
			patch: 0,
			prerelease: [],
		};
	}
	return {
		major: 0,
		minor: 0,
		patch: version.patch + 1,
		prerelease: [],
	};
}

function tildeUpperBound(version: VersionCore): VersionCore {
	return {
		major: version.major,
		minor: version.minor + 1,
		patch: 0,
		prerelease: [],
	};
}

function sameVersionCore(left: VersionCore, right: VersionCore): boolean {
	return (
		left.major === right.major &&
		left.minor === right.minor &&
		left.patch === right.patch
	);
}

function comparatorVersion(comparator: string): VersionCore | undefined {
	const trimmed = comparator.trim();
	if (trimmed === "" || trimmed === "*" || trimmed.toLowerCase() === "x") {
		return undefined;
	}
	return parseVersion(trimmed.replace(/^(?:>=|>|<=|<|=|\^|~)/u, ""));
}

function alternativeAllowsPrerelease(
	version: VersionCore,
	comparators: readonly string[],
): boolean {
	if (version.prerelease.length === 0) return true;
	return comparators.some((comparator) => {
		const expected = comparatorVersion(comparator);
		return (
			expected !== undefined &&
			expected.prerelease.length > 0 &&
			sameVersionCore(version, expected)
		);
	});
}

function satisfiesComparator(
	version: VersionCore,
	comparator: string,
): boolean {
	const trimmed = comparator.trim();
	if (trimmed === "" || trimmed === "*" || trimmed.toLowerCase() === "x") {
		return true;
	}
	if (trimmed.startsWith("^")) {
		const minimum = parseVersion(trimmed.slice(1));
		if (minimum === undefined) return false;
		return (
			compareVersions(version, minimum) >= 0 &&
			compareVersions(version, caretUpperBound(minimum)) < 0
		);
	}
	if (trimmed.startsWith("~")) {
		const minimum = parseVersion(trimmed.slice(1));
		if (minimum === undefined) return false;
		return (
			compareVersions(version, minimum) >= 0 &&
			compareVersions(version, tildeUpperBound(minimum)) < 0
		);
	}
	const match = /^(>=|>|<=|<|=)?(.+)$/u.exec(trimmed);
	if (match === null) return false;
	const expected = parseVersion(match[2] ?? "");
	if (expected === undefined) return false;
	const comparison = compareVersions(version, expected);
	switch (match[1] ?? "=") {
		case ">":
			return comparison > 0;
		case ">=":
			return comparison >= 0;
		case "<":
			return comparison < 0;
		case "<=":
			return comparison <= 0;
		case "=":
			return comparison === 0;
		default:
			return false;
	}
}

function satisfiesVersionRange(version: string, range: string): boolean {
	const parsed = parseVersion(version);
	if (parsed === undefined) return false;
	const normalizedRange = range.trim().replace(/^workspace:/u, "");
	return normalizedRange.split(/\s*\|\|\s*/u).some((alternative) => {
		const comparators = alternative.trim().split(/\s+/u);
		return (
			alternativeAllowsPrerelease(parsed, comparators) &&
			comparators.every((comparator) => satisfiesComparator(parsed, comparator))
		);
	});
}

function gapNote(
	manifest: TextPackManifest,
	component: TextPackComponent,
	status: TextPackGapNote["status"],
	message: string,
): TextPackGapNote {
	return {
		id: `gap:${manifest.id}:component:${componentLabel(component)}`,
		status,
		message,
	};
}

function shouldLoadOptional(
	component: TextPackComponent,
	include: ReadonlySet<string>,
	profile: ResolveTextPackComponentsOptions["profile"],
): boolean {
	if (matchesComponent(component, include)) return true;
	return profile === "research" || profile === "full" || profile === "local";
}

function selectedForLoading(
	component: TextPackComponent,
	options: ResolveTextPackComponentsOptions,
): boolean {
	if (component.role === "excluded") return false;
	if (component.role === "required") return true;
	return shouldLoadOptional(
		component,
		optionSet(options.include),
		options.profile ?? "default",
	);
}

function assertComponentAllowed(
	component: TextPackComponent,
	options: ResolveTextPackComponentsOptions,
): string | undefined {
	const activeLicensePolicy = options.licensePolicy ?? "default";
	if (
		policyRank(licensePolicyRank, component.licensePolicy) >
		policyRank(licensePolicyRank, activeLicensePolicy)
	) {
		return `requires licensePolicy ${component.licensePolicy}, but active licensePolicy is ${activeLicensePolicy}`;
	}
	const componentArtifactPolicy = component.artifactPolicy ?? "none";
	const activeArtifactPolicy = options.artifactPolicy ?? "none";
	if (
		policyRank(artifactPolicyRank, componentArtifactPolicy) >
		policyRank(artifactPolicyRank, activeArtifactPolicy)
	) {
		return `requires artifactPolicy ${componentArtifactPolicy}, but active artifactPolicy is ${activeArtifactPolicy}`;
	}
	return undefined;
}

function withGapNotes(
	pack: TextPack,
	gapNotes: readonly TextPackGapNote[],
): TextPack {
	if (gapNotes.length === 0) return pack;
	const byId = new Map<string, TextPackGapNote>();
	for (const note of [...(pack.manifest.gapNotes ?? []), ...gapNotes]) {
		byId.set(note.id, note);
	}
	return createPack(
		{
			...pack.manifest,
			gapNotes: Object.freeze(
				[...byId.values()].sort((left, right) =>
					left.id.localeCompare(right.id),
				),
			),
		},
		pack.resources,
	);
}

async function loadComponent(
	component: TextPackComponent,
	options: ResolveTextPackComponentsOptions,
): Promise<TextPack> {
	if (options.resolveComponent === undefined) {
		throw new TypeError("No textpack component resolver was provided.");
	}
	const module = await options.resolveComponent(component);
	const pack = await loadPack(module);
	if (pack.manifest.packageName !== component.packageName) {
		throw new TypeError(
			`Resolved ${component.packageName} to ${pack.manifest.packageName}.`,
		);
	}
	if (!satisfiesVersionRange(pack.manifest.version, component.versionRange)) {
		throw new TypeError(
			`Resolved ${component.packageName}@${pack.manifest.version} does not satisfy declared range ${component.versionRange}.`,
		);
	}
	return pack;
}

export async function resolvePackComponents(
	composite: TextPack,
	options: ResolveTextPackComponentsOptions = {},
): Promise<TextPack> {
	const components = composite.manifest.components ?? [];
	if (components.length === 0) return composite;

	const include = optionSet(options.include);
	const exclude = optionSet(options.exclude);
	const strict = options.strict ?? true;
	const loaded: TextPack[] = [];
	const resolutionGapNotes: TextPackGapNote[] = [];

	for (const component of components) {
		const explicitlyIncluded = matchesComponent(component, include);
		const explicitlyExcluded = matchesComponent(component, exclude);
		if (explicitlyExcluded) {
			if (component.role === "required" && strict) {
				throw new TypeError(
					`Required textpack component ${component.packageName} cannot be excluded.`,
				);
			}
			resolutionGapNotes.push(
				gapNote(
					composite.manifest,
					component,
					"planned",
					`Textpack component ${component.packageName} was excluded by the load options.`,
				),
			);
			continue;
		}
		if (!selectedForLoading(component, options)) continue;

		const blockedReason = assertComponentAllowed(component, options);
		if (blockedReason !== undefined) {
			const message = `Textpack component ${component.packageName} ${blockedReason}.`;
			if (component.role === "required" || explicitlyIncluded || strict) {
				throw new TypeError(message);
			}
			resolutionGapNotes.push(
				gapNote(composite.manifest, component, "planned", message),
			);
			continue;
		}

		try {
			loaded.push(await loadComponent(component, options));
		} catch (error) {
			const message = `${component.role === "required" ? "Required" : "Optional"} textpack component ${component.packageName} could not be resolved: ${errorMessage(error)}`;
			if (component.role === "required" || explicitlyIncluded) {
				if (strict) throw new TypeError(message);
			}
			resolutionGapNotes.push(
				gapNote(composite.manifest, component, "planned", message),
			);
		}
	}

	const composed =
		loaded.length === 0
			? composite
			: composePacks([composite, ...loaded], {
					id: composite.manifest.id,
					name: composite.manifest.name,
					version: composite.manifest.version,
					packageName: composite.manifest.packageName,
					conflictPolicy: options.conflictPolicy ?? "error",
					...(composite.manifest.license === undefined
						? {}
						: { license: composite.manifest.license }),
					...(composite.manifest.citations === undefined
						? {}
						: { citations: composite.manifest.citations }),
				});
	const manifest: TextPackManifest = {
		...composed.manifest,
		components,
		...(composed.manifest.gapNotes === undefined
			? {}
			: { gapNotes: composed.manifest.gapNotes }),
	};
	return withGapNotes(
		createPack(manifest, composed.resources),
		resolutionGapNotes,
	);
}

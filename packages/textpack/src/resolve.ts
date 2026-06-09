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

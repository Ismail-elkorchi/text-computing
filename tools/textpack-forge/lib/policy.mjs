import {
	assertGenerationChronology,
	assertLicenseClosure,
	assertWikidataExtractLineage,
	licenseExpressionCovers,
	missingLicenseObligations,
} from "./policy-integrity.mjs";

export {
	assertGenerationChronology,
	assertLicenseClosure,
	assertWikidataExtractLineage,
	licenseExpressionCovers,
	missingLicenseObligations,
};

function fail(message, details) {
	throw new Error(details === undefined ? message : `${message}\n${details}`);
}

function expect(condition, message, details) {
	if (!condition) fail(message, details);
}

function sortJson(value) {
	if (Array.isArray(value)) return value.map((entry) => sortJson(entry));
	if (value === null || typeof value !== "object") return value;
	const output = {};
	for (const key of Object.keys(value).sort())
		output[key] = sortJson(value[key]);
	return output;
}

function sorted(values) {
	return [...values].sort((left, right) => left.localeCompare(right));
}

function isCompositePack(pack) {
	return pack.packClass === "language-composite";
}

export const CAPABILITY_TIER_ORDER = [
	"none",
	"resource-only",
	"baseline",
	"lookup",
	"rule-based",
	"contextual",
	"model-backed",
];

const absentStatuses = new Set(["unsupported", "planned", "not-applicable"]);
const resourceOnlyStatuses = new Set([
	"profiled",
	"sampled",
	"artifact-backed",
]);

export function capabilitySlotPolicy(slot) {
	if (!CAPABILITY_TIER_ORDER.includes(slot.tier)) {
		throw new Error(
			`${slot.slot} must declare an explicit supported capability tier.`,
		);
	}
	if (absentStatuses.has(slot.status)) {
		if (slot.tier !== "none") {
			throw new Error(`${slot.slot} status ${slot.status} requires tier none.`);
		}
		return { status: slot.status, tier: slot.tier };
	}
	if (resourceOnlyStatuses.has(slot.status)) {
		if (slot.tier !== "resource-only") {
			throw new Error(
				`${slot.slot} status ${slot.status} requires tier resource-only.`,
			);
		}
		return { status: slot.status, tier: slot.tier };
	}
	if (!["task-supported", "feature-complete"].includes(slot.status)) {
		throw new Error(`${slot.slot} has unsupported status ${slot.status}.`);
	}
	if (
		CAPABILITY_TIER_ORDER.indexOf(slot.tier) <
		CAPABILITY_TIER_ORDER.indexOf("baseline")
	) {
		throw new Error(
			`${slot.slot} status ${slot.status} requires tier baseline or stronger.`,
		);
	}
	return { status: slot.status, tier: slot.tier };
}

export function higherCapabilityTier(left, right) {
	const leftRank = CAPABILITY_TIER_ORDER.indexOf(left);
	const rightRank = CAPABILITY_TIER_ORDER.indexOf(right);
	return rightRank > leftRank ? right : left;
}

export function evaluationSupportsTaskEvidence(evaluationKind) {
	return (
		evaluationKind === "runtime-smoke" || evaluationKind === "task-accuracy"
	);
}

export const sourcePolicyClasses = [
	"default-safe",
	"attribution",
	"share-alike",
	"copyleft",
	"noncommercial/research",
	"local-only",
	"blocked/review-only",
];
const defaultCompositeSourcePolicyClasses = new Set([
	"default-safe",
	"attribution",
]);
export const publishableSourcePolicyClasses = new Set([
	"default-safe",
	"attribution",
]);
const isolatedPublishableSourcePolicyClasses = new Set(["share-alike"]);
const licenseInclusiveSourcePolicyClasses = new Set([
	"default-safe",
	"attribution",
	"share-alike",
]);
export const compositePolicySurfaces = new Set([
	"default",
	"license-inclusive",
]);
const componentLicensePolicyClasses = {
	default: new Set(["default-safe"]),
	"allow-attribution": new Set(["default-safe", "attribution"]),
	"allow-share-alike": new Set(["default-safe", "attribution", "share-alike"]),
	"allow-copyleft": new Set(["default-safe", "attribution", "copyleft"]),
	"local-only": new Set([
		"default-safe",
		"attribution",
		"share-alike",
		"copyleft",
		"local-only",
		"noncommercial/research",
	]),
};
export const requiredSourcePolicyLanguageTags = [
	"ar",
	"de",
	"en",
	"es",
	"fr",
	"grc",
	"it",
	"la",
];

function assertStringArray(value, label, { minItems = 0 } = {}) {
	expect(Array.isArray(value), `${label} must be an array.`);
	expect(
		value.length >= minItems,
		`${label} must contain at least ${minItems} items.`,
	);
	for (const item of value) {
		expect(
			typeof item === "string" && item.length > 0,
			`${label} must contain only non-empty strings.`,
		);
	}
}

function hasAllowedPackageSuffix(packageName, suffixes) {
	return suffixes.some((suffix) => packageName.endsWith(suffix));
}

export function sourcePolicyAllowsPackPublishability(policy, packageName) {
	if (
		policy.reviewState !== "approved" ||
		policy.policyClass === "blocked/review-only"
	) {
		return false;
	}
	if (
		policy.publishableByDefault === true &&
		publishableSourcePolicyClasses.has(policy.policyClass)
	) {
		return true;
	}
	return (
		isolatedPublishableSourcePolicyClasses.has(policy.policyClass) &&
		policy.defaultCompositeAllowed === false &&
		policy.requiredPackageNameSuffixes.length > 0 &&
		hasAllowedPackageSuffix(packageName, policy.requiredPackageNameSuffixes)
	);
}

function sourcePolicyAllowsCompositeReference(policy, packageName) {
	if (policy.defaultCompositeAllowed === true) {
		return true;
	}
	return (
		policy.requiredPackageNameSuffixes.length > 0 &&
		hasAllowedPackageSuffix(packageName, policy.requiredPackageNameSuffixes)
	);
}

function policySurfaceFor(pack) {
	return pack.policySurface ?? "default";
}

export function isLicenseInclusiveDistribution(pack) {
	return policySurfaceFor(pack) === "license-inclusive";
}

export function sourcePolicyAllowsLicenseInclusiveDistribution(policy) {
	return (
		policy.reviewState === "approved" &&
		licenseInclusiveSourcePolicyClasses.has(policy.policyClass)
	);
}

function sourcePolicyAllowsPackagePublishability(policy, pack) {
	return (
		sourcePolicyAllowsPackPublishability(policy, pack.packageName) ||
		(isLicenseInclusiveDistribution(pack) &&
			sourcePolicyAllowsLicenseInclusiveDistribution(policy))
	);
}

function sourcePolicyAllowsDirectCompositeSource(policy, pack) {
	return (
		sourcePolicyAllowsCompositeReference(policy, pack.packageName) ||
		(isLicenseInclusiveDistribution(pack) &&
			sourcePolicyAllowsLicenseInclusiveDistribution(policy))
	);
}

function sourcePolicyAllowsRequiredComponentReference(
	policy,
	composite,
	componentPack,
) {
	if (sourcePolicyAllowsCompositeReference(policy, composite.packageName)) {
		return true;
	}
	if (
		!isLicenseInclusiveDistribution(composite) ||
		!sourcePolicyAllowsLicenseInclusiveDistribution(policy)
	) {
		return false;
	}
	return (
		policy.requiredPackageNameSuffixes.length === 0 ||
		hasAllowedPackageSuffix(
			componentPack.packageName,
			policy.requiredPackageNameSuffixes,
		) ||
		isLicenseInclusiveDistribution(componentPack)
	);
}

function validatePolicyClassDefinition(definition, expectedClass) {
	expect(
		definition !== undefined,
		`Source policy is missing license class ${expectedClass}.`,
	);
	expect(
		definition.class === expectedClass,
		`Source policy license class order mismatch for ${expectedClass}.`,
	);
	expect(
		definition.defaultCompositeAllowed ===
			defaultCompositeSourcePolicyClasses.has(expectedClass),
		`${expectedClass} defaultCompositeAllowed does not match forge policy.`,
	);
	expect(
		definition.publishableByDefault ===
			publishableSourcePolicyClasses.has(expectedClass),
		`${expectedClass} publishableByDefault does not match forge policy.`,
	);
	assertStringArray(
		definition.packageNameSuffixes,
		`${expectedClass} packageNameSuffixes`,
	);
}

export function validateSourcePolicySpec(policySpec) {
	expect(
		policySpec.schemaVersion === "1",
		`${policySpec.policyId ?? "source policy"} schemaVersion must be 1.`,
	);
	expect(
		typeof policySpec.policyId === "string" && policySpec.policyId.length > 0,
		"Source policy spec must declare policyId.",
	);
	expect(
		typeof policySpec.generatedFrom === "string" &&
			policySpec.generatedFrom.length > 0,
		`${policySpec.policyId} generatedFrom is required.`,
	);
	assertStringArray(
		policySpec.licenseClasses?.map((entry) => entry.class),
		`${policySpec.policyId} licenseClasses`,
		{ minItems: sourcePolicyClasses.length },
	);
	const classByName = new Map(
		policySpec.licenseClasses.map((entry) => [entry.class, entry]),
	);
	for (const policyClass of sourcePolicyClasses) {
		validatePolicyClassDefinition(classByName.get(policyClass), policyClass);
	}
	const sourceById = new Map();
	for (const source of policySpec.sources ?? []) {
		expect(
			typeof source.sourceId === "string" && source.sourceId.length > 0,
			`${policySpec.policyId} has a source without sourceId.`,
		);
		expect(
			!sourceById.has(source.sourceId),
			`Duplicate source policy entry ${source.sourceId}.`,
		);
		expect(
			sourcePolicyClasses.includes(source.policyClass),
			`${source.sourceId} has unknown policyClass ${source.policyClass}.`,
		);
		const classDefinition = classByName.get(source.policyClass);
		expect(
			classDefinition !== undefined,
			`${source.sourceId} policyClass ${source.policyClass} has no class definition.`,
		);
		expect(
			["approved", "pending", "blocked"].includes(source.reviewState),
			`${source.sourceId} has invalid reviewState ${source.reviewState}.`,
		);
		expect(
			typeof source.defaultCompositeAllowed === "boolean",
			`${source.sourceId} defaultCompositeAllowed must be boolean.`,
		);
		expect(
			typeof source.publishableByDefault === "boolean",
			`${source.sourceId} publishableByDefault must be boolean.`,
		);
		assertStringArray(
			source.requiredPackageNameSuffixes,
			`${source.sourceId} requiredPackageNameSuffixes`,
		);
		assertStringArray(source.languages, `${source.sourceId} languages`);
		assertStringArray(
			source.capabilitySlots,
			`${source.sourceId} capabilitySlots`,
		);
		expect(
			["first", "second", "isolated", "review"].includes(source.priority),
			`${source.sourceId} has invalid priority ${source.priority}.`,
		);
		if (["isolated", "review"].includes(source.priority)) {
			expect(
				source.defaultCompositeAllowed === false,
				`${source.sourceId} has ${source.priority} priority and cannot be default-composite allowed.`,
			);
			expect(
				source.publishableByDefault === false,
				`${source.sourceId} has ${source.priority} priority and cannot be publishable by default.`,
			);
		}
		for (const suffix of source.requiredPackageNameSuffixes) {
			expect(
				classDefinition.packageNameSuffixes.includes(suffix),
				`${source.sourceId} suffix ${suffix} is not allowed by ${source.policyClass}.`,
			);
		}
		expect(
			!source.publishableByDefault ||
				(source.reviewState === "approved" &&
					publishableSourcePolicyClasses.has(source.policyClass)),
			`${source.sourceId} cannot be publishable by default without approved default-safe or attribution policy.`,
		);
		expect(
			!source.defaultCompositeAllowed ||
				defaultCompositeSourcePolicyClasses.has(source.policyClass),
			`${source.sourceId} cannot be default-composite allowed with ${source.policyClass}.`,
		);
		if (
			[
				"share-alike",
				"copyleft",
				"noncommercial/research",
				"local-only",
			].includes(source.policyClass)
		) {
			expect(
				source.requiredPackageNameSuffixes.length > 0,
				`${source.sourceId} ${source.policyClass} policy must require a package name suffix.`,
			);
		}
		if (source.policyClass === "blocked/review-only") {
			expect(
				source.requiredPackageNameSuffixes.length === 0,
				`${source.sourceId} blocked/review-only policy must not declare package suffixes because it cannot generate packages.`,
			);
		}
		sourceById.set(source.sourceId, source);
	}
	expect(sourceById.size > 0, `${policySpec.policyId} must declare sources.`);
	const languageByTag = new Map();
	for (const language of policySpec.languages ?? []) {
		expect(
			typeof language.languageTag === "string" &&
				language.languageTag.length > 0,
			`${policySpec.policyId} has a language without languageTag.`,
		);
		expect(
			!languageByTag.has(language.languageTag),
			`Duplicate source policy language ${language.languageTag}.`,
		);
		for (const bucket of [
			"firstSources",
			"secondWaveSources",
			"isolatedSources",
		]) {
			assertStringArray(language[bucket], `${language.languageTag} ${bucket}`);
			for (const sourceId of language[bucket]) {
				expect(
					sourceById.has(sourceId),
					`${language.languageTag} ${bucket} references unknown source ${sourceId}.`,
				);
				if (bucket === "isolatedSources") {
					const source = sourceById.get(sourceId);
					expect(
						source.defaultCompositeAllowed === false,
						`${language.languageTag} isolated source ${sourceId} must not be default-composite allowed.`,
					);
					expect(
						source.publishableByDefault === false,
						`${language.languageTag} isolated source ${sourceId} must not be publishable by default.`,
					);
				}
			}
		}
		languageByTag.set(language.languageTag, language);
	}
	for (const languageTag of requiredSourcePolicyLanguageTags) {
		expect(
			languageByTag.has(languageTag),
			`Source policy must declare language priority record ${languageTag}.`,
		);
	}
	return { classByName, sourceById, languageByTag };
}

export function collectSourcePolicies(policySpecs) {
	const sourcePolicyById = new Map();
	const languagePolicyByTag = new Map();
	const licenseClassByName = new Map();
	for (const policySpec of policySpecs) {
		const validated = validateSourcePolicySpec(policySpec);
		for (const [policyClass, definition] of validated.classByName) {
			const existing = licenseClassByName.get(policyClass);
			if (existing === undefined) {
				licenseClassByName.set(policyClass, definition);
				continue;
			}
			expect(
				JSON.stringify(sortJson(existing)) ===
					JSON.stringify(sortJson(definition)),
				`Conflicting source policy license class ${policyClass}.`,
			);
		}
		for (const [sourceId, policy] of validated.sourceById) {
			expect(
				!sourcePolicyById.has(sourceId),
				`Duplicate source policy entry ${sourceId}.`,
			);
			sourcePolicyById.set(sourceId, policy);
		}
		for (const [languageTag, language] of validated.languageByTag) {
			expect(
				!languagePolicyByTag.has(languageTag),
				`Duplicate source policy language ${languageTag}.`,
			);
			languagePolicyByTag.set(languageTag, language);
		}
	}
	expect(
		sourcePolicyById.size > 0,
		"Forge lock must declare at least one source policy spec.",
	);
	return {
		licenseClassByName,
		sourcePolicyById,
		languagePolicyByTag,
		sourcePolicies: sorted([...sourcePolicyById.keys()]).map((sourceId) =>
			sourcePolicyById.get(sourceId),
		),
		languagePolicies: sorted([...languagePolicyByTag.keys()]).map(
			(languageTag) => languagePolicyByTag.get(languageTag),
		),
	};
}

export function validateActiveSourcePolicies(context) {
	for (const source of context.sources) {
		const policy = context.sourcePolicyById.get(source.sourceId);
		expect(
			policy !== undefined,
			`${source.sourceId} is active but has no source policy entry.`,
		);
		expect(
			policy.family === source.family,
			`${source.sourceId} active family ${source.family} conflicts with policy family ${policy.family}.`,
		);
		expect(
			policy.licenseExpression === source.licenseExpression,
			`${source.sourceId} active license ${source.licenseExpression} conflicts with policy license ${policy.licenseExpression}.`,
		);
		expect(
			policy.redistributionPolicy === source.redistributionPolicy,
			`${source.sourceId} active redistributionPolicy ${source.redistributionPolicy} conflicts with policy redistributionPolicy ${policy.redistributionPolicy}.`,
		);
		expect(
			policy.reviewState === source.reviewState,
			`${source.sourceId} active reviewState ${source.reviewState} conflicts with policy reviewState ${policy.reviewState}.`,
		);
		expect(
			policy.reviewState !== "blocked",
			`${source.sourceId} is active but blocked by source policy.`,
		);
		expect(
			policy.policyClass !== "blocked/review-only",
			`${source.sourceId} has policy ${policy.policyClass} and cannot be an active generated source.`,
		);
	}
}

export function validatePackageSourcePolicy(pack, context) {
	const aggregateLicense = pack.licenseExpression ?? pack.license;
	expect(
		typeof aggregateLicense === "string" && aggregateLicense.length > 0,
		`${pack.packageName} must declare an aggregate license expression.`,
	);
	const licenseSources = pack.sourceIds.map((sourceId) =>
		context.sourceById.get(sourceId),
	);
	expect(
		licenseSources.every((source) => source !== undefined),
		`${pack.packageName} aggregate license references an unknown source.`,
	);
	assertLicenseClosure(aggregateLicense, licenseSources, pack.packageName);
	for (const languageTag of pack.targets?.languages ?? []) {
		const languagePolicy = context.languagePolicyByTag.get(languageTag);
		expect(
			languagePolicy !== undefined,
			`${pack.packageName} targets ${languageTag}, but no source priority record exists for that language.`,
		);
		const allowedSourceIds = new Set([
			...languagePolicy.firstSources,
			...languagePolicy.secondWaveSources,
			...languagePolicy.isolatedSources,
		]);
		for (const sourceId of pack.sourceIds) {
			const policy = context.sourcePolicyById.get(sourceId);
			expect(
				policy !== undefined,
				`${pack.packageName} references source ${sourceId} without source policy entry.`,
			);
			expect(
				(policy.languages ?? []).includes("*") ||
					(policy.languages ?? []).includes(languageTag),
				`${pack.packageName} targets ${languageTag}, but ${sourceId} is scoped to ${(policy.languages ?? []).join(", ")}.`,
			);
			expect(
				allowedSourceIds.has(sourceId),
				`${pack.packageName} targets ${languageTag}, but ${sourceId} is not declared in that language's first, second-wave, or isolated source priority lists.`,
			);
		}
	}
	for (const sourceId of pack.sourceIds) {
		const policy = context.sourcePolicyById.get(sourceId);
		expect(
			policy !== undefined,
			`${pack.packageName} references source ${sourceId} without source policy entry.`,
		);
		if (policy.policyClass === "blocked/review-only") {
			fail(
				`${pack.packageName} cannot generate from blocked/review-only source ${sourceId}.`,
			);
		}
		if (policy.requiredPackageNameSuffixes.length > 0) {
			expect(
				hasAllowedPackageSuffix(
					pack.packageName,
					policy.requiredPackageNameSuffixes,
				) || isLicenseInclusiveDistribution(pack),
				`${pack.packageName} uses ${sourceId} but does not end with one of ${policy.requiredPackageNameSuffixes.join(", ")}.`,
			);
		}
		if (pack.publishable === true) {
			expect(
				sourcePolicyAllowsPackagePublishability(policy, pack),
				`${pack.packageName} requested publishability but ${sourceId} policy is ${policy.policyClass}/${policy.reviewState}.`,
			);
		}
		expect(
			!isCompositePack(pack) ||
				sourcePolicyAllowsDirectCompositeSource(policy, pack),
			`${pack.packageName} directly declares non-default source ${sourceId}.`,
		);
	}
}

export function validateCompositeComponentSourcePolicies(
	composite,
	packageByName,
	context,
) {
	for (const component of composite.components ?? []) {
		const componentPack = packageByName.get(component.packageName);
		expect(
			componentPack !== undefined,
			`${composite.packageName} references unknown component ${component.packageName}.`,
		);
		const allowedClasses =
			componentLicensePolicyClasses[component.licensePolicy];
		expect(
			allowedClasses !== undefined,
			`${composite.packageName} component ${component.packageName} has unknown licensePolicy ${component.licensePolicy}.`,
		);
		for (const sourceId of componentPack.sourceIds) {
			const policy = context.sourcePolicyById.get(sourceId);
			expect(
				policy !== undefined,
				`${componentPack.packageName} source ${sourceId} has no source policy entry.`,
			);
			if (component.role === "required") {
				expect(
					sourcePolicyAllowsRequiredComponentReference(
						policy,
						composite,
						componentPack,
					),
					`${composite.packageName} requires ${componentPack.packageName}, but ${sourceId} is not allowed in default composites and ${composite.packageName} does not declare a required policy suffix.`,
				);
			}
			expect(
				allowedClasses.has(policy.policyClass),
				`${composite.packageName} component ${component.packageName} uses ${sourceId} policy ${policy.policyClass}, but component licensePolicy is ${component.licensePolicy}.`,
			);
		}
		if (composite.publishable === true && component.role === "required") {
			expect(
				componentPack.publishable === true,
				`${composite.packageName} cannot be publishable while required component ${component.packageName} is not publishable.`,
			);
		}
	}
}

export function generatedGapNotes(
	manifest,
	generatedKind,
	mode = "source-backed",
) {
	return manifest.capabilitySlots
		.filter((slot) =>
			["unsupported", "planned", "artifact-backed", "not-applicable"].includes(
				slot.status,
			),
		)
		.map((slot) => ({
			id: `gap:${manifest.id}:${slot.slot}`,
			slot: slot.slot,
			status:
				slot.status === "unsupported"
					? "unsupported"
					: slot.status === "artifact-backed"
						? "artifact-backed"
						: slot.status === "not-applicable"
							? "not-applicable"
							: "planned",
			message: `${slot.slot} is ${slot.status} in this ${mode} ${generatedKind}.`,
		}));
}

const runtimeOwnerBySchemaPrefix = [
	["textdata.", "@ismail-elkorchi/textdata"],
	["textkb.", "@ismail-elkorchi/textkb"],
	["textlex.", "@ismail-elkorchi/textlex"],
	["textnorm.", "@ismail-elkorchi/textnorm"],
	["textparallel.", "@ismail-elkorchi/textparallel"],
	["textquality.", "@ismail-elkorchi/textquality"],
	["textsearch.", "@ismail-elkorchi/textsearch"],
];

function runtimeOwnerPackageFor(slotName, resource) {
	const schemaId = resource.schemaId ?? "";
	if (slotName === "corpus" && schemaId.startsWith("textdata.corpus.")) {
		return "@ismail-elkorchi/textcorpus";
	}
	if (slotName === "parallel" && schemaId.startsWith("textparallel.")) {
		return "@ismail-elkorchi/textparallel";
	}
	for (const [prefix, ownerPackage] of runtimeOwnerBySchemaPrefix) {
		if (schemaId.startsWith(prefix)) return ownerPackage;
	}
	return undefined;
}

function taskBindingRoleFor(slotName, resource) {
	const schemaId = resource.schemaId ?? "";
	if (schemaId === "textquality.evidence.v1") return "evidence";
	if (slotName === "quality" || schemaId === "textquality.profile.v1") {
		return "quality";
	}
	if (
		schemaId.includes(".rows.") ||
		schemaId.includes(".table.") ||
		resource.kind === "alignment-table" ||
		resource.kind === "dataset" ||
		String(resource.format ?? "").includes("tsv")
	) {
		return "table";
	}
	if (resource.id.includes("annotation") || schemaId.includes("annotation")) {
		return "annotation";
	}
	if (resource.id.includes("index") || schemaId.includes("index")) {
		return "index";
	}
	if (resource.kind.endsWith("-profile") || schemaId.includes("profile")) {
		return "profile";
	}
	if (schemaId.length > 0) return "primary";
	return "metadata";
}

function inferredTaskBindings(slot, resourcesById) {
	const bindings = [];
	for (const resourceId of slot.resourceIds ?? []) {
		const resource = resourcesById.get(resourceId);
		if (resource === undefined || typeof resource.schemaId !== "string") {
			continue;
		}
		const ownerPackage = runtimeOwnerPackageFor(slot.slot, resource);
		if (ownerPackage === undefined) continue;
		bindings.push({
			role: taskBindingRoleFor(slot.slot, resource),
			resourceId,
			schemaId: resource.schemaId,
			required: true,
			ownerPackage,
		});
	}
	return bindings.sort(
		(left, right) =>
			left.ownerPackage.localeCompare(right.ownerPackage) ||
			left.role.localeCompare(right.role) ||
			left.resourceId.localeCompare(right.resourceId) ||
			left.schemaId.localeCompare(right.schemaId),
	);
}

export function withCapabilityBindings(manifest) {
	const resourcesById = new Map(
		manifest.resources.map((resource) => [resource.id, resource]),
	);
	return {
		...manifest,
		capabilitySlots: manifest.capabilitySlots.map((slot) => {
			const policy = capabilitySlotPolicy(slot);
			const bindings =
				slot.bindings ?? inferredTaskBindings(slot, resourcesById);
			const readerRequired =
				slot.readerRequired === true ||
				bindings.some((binding) => {
					const resource = resourcesById.get(binding.resourceId);
					return binding.required === true && resource?.path !== undefined;
				});
			return {
				slot: slot.slot,
				status: policy.status,
				tier: policy.tier,
				...(slot.resourceIds === undefined
					? {}
					: { resourceIds: slot.resourceIds }),
				...(slot.artifactIds === undefined
					? {}
					: { artifactIds: slot.artifactIds }),
				...(bindings.length === 0 ? {} : { bindings }),
				...(slot.prerequisites === undefined
					? {}
					: { prerequisites: slot.prerequisites }),
				...(readerRequired ? { readerRequired: true } : {}),
				...(slot.notes === undefined ? {} : { notes: slot.notes }),
				...(slot.capabilities === undefined
					? {}
					: { capabilities: slot.capabilities }),
			};
		}),
	};
}

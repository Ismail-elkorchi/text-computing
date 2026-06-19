import type { TextDocument } from "@ismail-elkorchi/textdoc";
import {
	openResourceJson,
	openResourceTable,
	openResourceText,
	requireSingleTaskResourceBinding,
	type TextPack,
	type TextPackMaterializedTable,
	type TextPackResource,
	type TextPackResourceReader,
	type TextPackTaskResourceBindingRole,
	taskResourceIdsFromBindings,
} from "@ismail-elkorchi/textpack";
import type { NormalizationViewResult } from "../normalize/types.js";
import { computeEditScript, createNormalizedView } from "../view/mod.js";

export type TextNormPackResourcePayload =
	| { readonly type: "json"; readonly value: unknown }
	| { readonly type: "table"; readonly value: TextPackMaterializedTable }
	| { readonly type: "text"; readonly value: string };

export interface TextNormPackResource {
	readonly id: string;
	readonly descriptor: TextPackResource;
	readonly payload: TextNormPackResourcePayload;
}

export interface TextNormResourcesFromPackOptions {
	readonly reader?: TextPackResourceReader;
	readonly resourceIds?: readonly string[];
	readonly schemaIds?: readonly string[];
	readonly slot?: string;
	readonly role?: TextPackTaskResourceBindingRole;
}

export type TextNormProfileMode = "storage" | "lookup" | "search";
type UnicodeNormalizationForm = "NFC" | "NFD" | "NFKC" | "NFKD";

export interface CompiledTextNormProfile {
	readonly id: string;
	readonly languageTag: string;
	readonly script?: string;
	readonly profile: Readonly<Record<string, unknown>>;
	readonly resources: readonly TextNormPackResource[];
	readonly normalizeText: (text: string, mode?: TextNormProfileMode) => string;
	readonly normalizeDocument: (
		doc: TextDocument,
		mode?: TextNormProfileMode,
	) => NormalizationViewResult;
	readonly searchView: (doc: TextDocument) => NormalizationViewResult;
}

function resourcesById(
	pack: TextPack,
	resourceIds: readonly string[],
): readonly TextPackResource[] {
	const byId = new Map(
		pack.manifest.resources.map((resource) => [resource.id, resource]),
	);
	return Object.freeze(
		resourceIds.map((resourceId) => {
			const resource = byId.get(resourceId);
			if (resource === undefined) {
				throw new TypeError(
					`Textpack ${pack.manifest.packageName} is missing bound resource ${resourceId}.`,
				);
			}
			return resource;
		}),
	);
}

function isJson(resource: TextPackResource): boolean {
	const format = resource.format ?? "";
	return format === "json" || format.endsWith("+json");
}

function isTable(resource: TextPackResource): boolean {
	const format = resource.format ?? "";
	return format.includes("tsv") || format.includes("tab-separated-values");
}

async function materializeNormalizationResource(
	pack: TextPack,
	resource: TextPackResource,
	reader: TextPackResourceReader | undefined,
): Promise<TextNormPackResource> {
	if (isJson(resource)) {
		return Object.freeze({
			id: resource.id,
			descriptor: resource,
			payload: Object.freeze({
				type: "json" as const,
				value: await openResourceJson(pack, resource.id, reader),
			}),
		});
	}
	if (isTable(resource)) {
		return Object.freeze({
			id: resource.id,
			descriptor: resource,
			payload: Object.freeze({
				type: "table" as const,
				value: await openResourceTable(pack, resource.id, reader),
			}),
		});
	}
	return Object.freeze({
		id: resource.id,
		descriptor: resource,
		payload: Object.freeze({
			type: "text" as const,
			value: await openResourceText(pack, resource.id, reader),
		}),
	});
}

export async function normalizationResourcesFromPack(
	pack: TextPack,
	options: TextNormResourcesFromPackOptions = {},
): Promise<readonly TextNormPackResource[]> {
	const resourceIds = taskResourceIdsFromBindings(pack, {
		slot: options.slot ?? "normalization",
		ownerPackage: "@ismail-elkorchi/textnorm",
		schemaId: options.schemaIds ?? ["textnorm.profile.v1", "textnorm.rules.v1"],
		...(options.role === undefined ? {} : { role: options.role }),
		...(options.resourceIds === undefined
			? {}
			: { resourceIds: options.resourceIds }),
	});
	const resources = resourcesById(pack, resourceIds);
	return Promise.all(
		resources.map((resource) =>
			materializeNormalizationResource(pack, resource, options.reader),
		),
	);
}

function stringValue(value: unknown): string | undefined {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number {
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function profileRules(
	profile: Readonly<Record<string, unknown>>,
): readonly Readonly<Record<string, unknown>>[] {
	return Array.isArray(profile.rules)
		? Object.freeze(
				profile.rules.filter(
					(rule): rule is Readonly<Record<string, unknown>> =>
						rule !== null && typeof rule === "object" && !Array.isArray(rule),
				),
			)
		: [];
}

function shouldSkipTextMapping(
	rule: Readonly<Record<string, unknown>>,
): boolean {
	const ruleId = stringValue(rule.ruleId) ?? "";
	return ruleId.includes("likely-subtag");
}

function replaceAllLiteral(
	text: string,
	input: string,
	output: string,
): string {
	return input.length === 0 ? text : text.split(input).join(output);
}

function applyLookupRule(
	text: string,
	rule: Readonly<Record<string, unknown>>,
): string {
	const operation = stringValue(rule.operation);
	if (operation === "compose") return text.normalize("NFC");
	if (operation === "casefold") return text.toLocaleLowerCase();
	if (operation === "strip-diacritic") {
		return text
			.normalize("NFD")
			.replace(/\p{Mark}+/gu, "")
			.normalize("NFC");
	}
	const input = stringValue(rule.input);
	const output = stringValue(rule.output) ?? "";
	if (
		(operation === "replace" || operation === "map") &&
		input !== undefined &&
		!shouldSkipTextMapping(rule)
	) {
		return replaceAllLiteral(text, input, output);
	}
	if (operation === "delete") {
		if (input !== undefined) return replaceAllLiteral(text, input, "");
		const pattern = stringValue(rule.pattern);
		if (pattern !== undefined)
			return text.replace(new RegExp(pattern, "gu"), "");
	}
	return text;
}

function normalizeWithProfile(
	text: string,
	profile: Readonly<Record<string, unknown>>,
	mode: TextNormProfileMode,
): string {
	const rawForm = stringValue(profile.unicodeNormalization);
	const form: UnicodeNormalizationForm =
		rawForm === "NFD" || rawForm === "NFKC" || rawForm === "NFKD"
			? rawForm
			: "NFC";
	let output = text.normalize(form);
	if (mode === "storage") return output;
	for (const rule of [...profileRules(profile)].sort(
		(left, right) => numberValue(left.priority) - numberValue(right.priority),
	)) {
		output = applyLookupRule(output, rule);
	}
	return output.normalize(form);
}

function sourceView(doc: TextDocument) {
	const view =
		doc.views.raw ??
		doc.views[
			Object.keys(doc.views).sort((left, right) =>
				left.localeCompare(right),
			)[0] ?? ""
		];
	if (view === undefined)
		throw new TypeError(`document ${doc.id} has no views.`);
	return view;
}

export async function normalizationProfileFromPack(
	pack: TextPack,
	options: TextNormResourcesFromPackOptions = {},
): Promise<CompiledTextNormProfile> {
	const profileBinding = requireSingleTaskResourceBinding(pack, {
		slot: options.slot ?? "normalization",
		ownerPackage: "@ismail-elkorchi/textnorm",
		schemaId: "textnorm.profile.v1",
		role: options.role ?? "profile",
		...(options.resourceIds === undefined
			? {}
			: { resourceIds: options.resourceIds }),
	});
	const resources = await normalizationResourcesFromPack(pack, options);
	const profileResource = resources.find(
		(resource) => resource.id === profileBinding.resourceId,
	);
	if (profileResource?.payload.type !== "json") {
		throw new TypeError("No textnorm.profile.v1 JSON resource is present.");
	}
	const profile = profileResource.payload.value;
	if (
		profile === null ||
		typeof profile !== "object" ||
		Array.isArray(profile)
	) {
		throw new TypeError(
			`${profileResource.id} is not a normalization profile.`,
		);
	}
	const profileRecord = profile as Readonly<Record<string, unknown>>;
	const languageTag =
		stringValue(profileRecord.languageTag) ??
		pack.manifest.targets.languages?.[0] ??
		"und";
	const id = stringValue(profileRecord.profileId) ?? profileResource.id;
	const script = stringValue(profileRecord.script);
	const normalizeText = (
		text: string,
		mode: TextNormProfileMode = "lookup",
	): string => normalizeWithProfile(text, profileRecord, mode);
	const normalizeDocument = (
		doc: TextDocument,
		mode: TextNormProfileMode = "lookup",
	): NormalizationViewResult => {
		const view = sourceView(doc);
		const target = normalizeWithProfile(view.text, profileRecord, mode);
		const result = createNormalizedView(
			doc,
			computeEditScript(view.text, target),
			{
				sourceViewId: view.id,
				targetViewId:
					mode === "search"
						? `${view.id}:search`
						: mode === "lookup"
							? `${view.id}:lookup`
							: `${view.id}:normalized`,
				targetViewKind: mode === "storage" ? "normalized" : "search",
				algorithm: `textnorm-profile:${id}:${mode}`,
				optionsHash: id,
			},
		);
		return Object.freeze({ ...result, candidates: Object.freeze([]) });
	};
	return Object.freeze({
		id,
		languageTag,
		...(script !== undefined ? { script } : {}),
		profile: profileRecord,
		resources,
		normalizeText,
		normalizeDocument,
		searchView(doc: TextDocument) {
			return normalizeDocument(doc, "search");
		},
	});
}

import type {
	TextPackCapabilitySlot,
	TextPackCapabilitySlotStatus,
	TextPackGapNote,
	TextPackTaskResourceBinding,
	TextPackTaskResourceBindingOwnerPackage,
	TextPackTaskResourceBindingRole,
} from "./types.js";

const runnableSlotStatuses = new Set<TextPackCapabilitySlotStatus>([
	"task-supported",
	"feature-complete",
]);

export interface TextPackTaskBindingSource {
	readonly manifest: {
		readonly id?: string;
		readonly packageName?: string;
		readonly resources: readonly {
			readonly id: string;
			readonly schemaId?: string;
		}[];
		readonly capabilitySlots: readonly TextPackCapabilitySlot[];
		readonly gapNotes?: readonly TextPackGapNote[];
	};
}

export interface TextPackTaskBindingQuery {
	readonly slot: string;
	readonly ownerPackage?: TextPackTaskResourceBindingOwnerPackage;
	readonly schemaId?: string | readonly string[];
	readonly role?:
		| TextPackTaskResourceBindingRole
		| readonly TextPackTaskResourceBindingRole[];
	readonly required?: boolean;
	readonly resourceId?: string;
	readonly resourceIds?: readonly string[];
}

function stringSet(value: string | readonly string[] | undefined) {
	return value === undefined
		? undefined
		: new Set(Array.isArray(value) ? value : [value]);
}

function roleSet(
	value:
		| TextPackTaskResourceBindingRole
		| readonly TextPackTaskResourceBindingRole[]
		| undefined,
) {
	return value === undefined
		? undefined
		: new Set(Array.isArray(value) ? value : [value]);
}

function matchesSet(value: string, set: ReadonlySet<string> | undefined) {
	return set === undefined || set.has(value);
}

function findSlot(
	pack: TextPackTaskBindingSource,
	slotName: string,
): TextPackCapabilitySlot | undefined {
	const slots = pack.manifest.capabilitySlots;
	if (!Array.isArray(slots)) {
		throw new TypeError(
			`Textpack ${packLabel(pack)} does not declare capabilitySlots; task bindings are required.`,
		);
	}
	return slots.find((slot) => slot.slot === slotName);
}

function packLabel(pack: TextPackTaskBindingSource): string {
	return pack.manifest.packageName ?? pack.manifest.id ?? "textpack";
}

function bindingLabel(query: TextPackTaskBindingQuery): string {
	const parts = [`slot ${query.slot}`];
	if (query.ownerPackage !== undefined)
		parts.push(`owner ${query.ownerPackage}`);
	if (query.schemaId !== undefined) {
		parts.push(
			`schema ${Array.isArray(query.schemaId) ? query.schemaId.join(", ") : query.schemaId}`,
		);
	}
	if (query.role !== undefined) {
		parts.push(
			`role ${Array.isArray(query.role) ? query.role.join(", ") : query.role}`,
		);
	}
	return parts.join(", ");
}

function slotGapText(
	pack: TextPackTaskBindingSource,
	slotName: string,
): string {
	const notes = (pack.manifest.gapNotes ?? [])
		.filter((note) => note.slot === slotName)
		.map((note) => note.message);
	return notes.length === 0 ? "" : ` Gaps: ${notes.join(" ")}`;
}

function assertRunnableSlot(
	pack: TextPackTaskBindingSource,
	slot: TextPackCapabilitySlot,
) {
	if (runnableSlotStatuses.has(slot.status)) return;
	throw new TypeError(
		`Textpack ${packLabel(pack)} slot ${slot.slot} is ${slot.status}, not task-runnable.${slotGapText(
			pack,
			slot.slot,
		)}`,
	);
}

function resourceById(
	pack: TextPackTaskBindingSource,
	resourceId: string,
): { readonly id: string; readonly schemaId?: string } | undefined {
	return pack.manifest.resources.find((resource) => resource.id === resourceId);
}

function queryResourceIds(
	query: TextPackTaskBindingQuery,
): readonly string[] | undefined {
	if (query.resourceId !== undefined && query.resourceIds !== undefined) {
		throw new TypeError("Use resourceId or resourceIds, not both.");
	}
	if (query.resourceId !== undefined) return [query.resourceId];
	return query.resourceIds;
}

function matchesBinding(
	binding: TextPackTaskResourceBinding,
	query: TextPackTaskBindingQuery,
	resourceIds: ReadonlySet<string> | undefined,
): boolean {
	const schemaIds = stringSet(query.schemaId);
	const roles = roleSet(query.role);
	return (
		(query.ownerPackage === undefined ||
			binding.ownerPackage === query.ownerPackage) &&
		matchesSet(binding.schemaId, schemaIds) &&
		matchesSet(binding.role, roles) &&
		(query.required === undefined || binding.required === query.required) &&
		matchesSet(binding.resourceId, resourceIds)
	);
}

function assertRequestedResourcesAreBound(
	pack: TextPackTaskBindingSource,
	query: TextPackTaskBindingQuery,
	bindings: readonly TextPackTaskResourceBinding[],
) {
	const requested = queryResourceIds(query);
	if (requested === undefined) return;
	const bound = new Set(bindings.map((binding) => binding.resourceId));
	for (const resourceId of requested) {
		if (resourceById(pack, resourceId) === undefined) {
			throw new TypeError(
				`Textpack ${packLabel(pack)} does not contain resource ${resourceId}.`,
			);
		}
		if (!bound.has(resourceId)) {
			throw new TypeError(
				`Textpack ${packLabel(pack)} resource ${resourceId} is not bound for ${bindingLabel(
					query,
				)}.`,
			);
		}
	}
}

export function listTaskResourceBindings(
	pack: TextPackTaskBindingSource,
	query: TextPackTaskBindingQuery,
): readonly TextPackTaskResourceBinding[] {
	const slot = findSlot(pack, query.slot);
	if (slot === undefined) return Object.freeze([]);
	const resourceIds = stringSet(queryResourceIds(query));
	return Object.freeze(
		(slot.bindings ?? []).filter((binding) =>
			matchesBinding(binding, query, resourceIds),
		),
	);
}

export function requireTaskResourceBindings(
	pack: TextPackTaskBindingSource,
	query: TextPackTaskBindingQuery,
): readonly TextPackTaskResourceBinding[] {
	const slot = findSlot(pack, query.slot);
	if (slot === undefined) {
		throw new TypeError(
			`Textpack ${packLabel(pack)} does not declare task slot ${query.slot}.`,
		);
	}
	assertRunnableSlot(pack, slot);
	return requireDeclaredResourceBindings(
		pack,
		query,
		queryResourceIds(query) === undefined ? true : undefined,
	);
}

function requireDeclaredResourceBindings(
	pack: TextPackTaskBindingSource,
	query: TextPackTaskBindingQuery,
	defaultRequired: boolean | undefined,
): readonly TextPackTaskResourceBinding[] {
	const effectiveQuery = {
		...query,
		...(query.required === undefined && defaultRequired !== undefined
			? { required: defaultRequired }
			: {}),
	} satisfies TextPackTaskBindingQuery;
	const bindings = listTaskResourceBindings(pack, effectiveQuery);
	assertRequestedResourcesAreBound(pack, effectiveQuery, bindings);
	if (bindings.length === 0) {
		throw new TypeError(
			`Textpack ${packLabel(pack)} has no task resource bindings for ${bindingLabel(
				effectiveQuery,
			)}.${slotGapText(pack, query.slot)}`,
		);
	}
	return bindings;
}

export function requireCapabilityResourceBindings(
	pack: TextPackTaskBindingSource,
	query: TextPackTaskBindingQuery,
): readonly TextPackTaskResourceBinding[] {
	const slot = findSlot(pack, query.slot);
	if (slot === undefined) {
		throw new TypeError(
			`Textpack ${packLabel(pack)} does not declare capability slot ${query.slot}.`,
		);
	}
	if (
		slot.status === "unsupported" ||
		slot.status === "planned" ||
		slot.status === "not-applicable"
	) {
		throw new TypeError(
			`Textpack ${packLabel(pack)} slot ${slot.slot} is ${slot.status}, so it has no inspectable resources.${slotGapText(pack, slot.slot)}`,
		);
	}
	return requireDeclaredResourceBindings(pack, query, undefined);
}

export function requireSingleTaskResourceBinding(
	pack: TextPackTaskBindingSource,
	query: TextPackTaskBindingQuery,
): TextPackTaskResourceBinding {
	const bindings = requireTaskResourceBindings(pack, query);
	if (bindings.length === 1) return bindings[0] as TextPackTaskResourceBinding;
	throw new TypeError(
		`Textpack ${packLabel(pack)} has ambiguous task resource bindings for ${bindingLabel(
			query,
		)}: ${bindings.map((binding) => binding.resourceId).join(", ")}.`,
	);
}

export function requireSingleCapabilityResourceBinding(
	pack: TextPackTaskBindingSource,
	query: TextPackTaskBindingQuery,
): TextPackTaskResourceBinding {
	const bindings = requireCapabilityResourceBindings(pack, query);
	if (bindings.length === 1) return bindings[0] as TextPackTaskResourceBinding;
	throw new TypeError(
		`Textpack ${packLabel(pack)} has ambiguous capability resource bindings for ${bindingLabel(
			query,
		)}: ${bindings.map((binding) => binding.resourceId).join(", ")}.`,
	);
}

export function taskResourceIdsFromBindings(
	pack: TextPackTaskBindingSource,
	query: TextPackTaskBindingQuery,
): readonly string[] {
	return Object.freeze(
		requireTaskResourceBindings(pack, query).map(
			(binding) => binding.resourceId,
		),
	);
}

export function capabilityResourceIdsFromBindings(
	pack: TextPackTaskBindingSource,
	query: TextPackTaskBindingQuery,
): readonly string[] {
	return Object.freeze(
		requireCapabilityResourceBindings(pack, query).map(
			(binding) => binding.resourceId,
		),
	);
}

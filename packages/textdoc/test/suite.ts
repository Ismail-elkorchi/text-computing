import type {
	assertDeepEqual,
	assertEqual,
	assertOk,
} from "./_support/assert.ts";
import { importTextdoc, importTextdocSubpath } from "./_support/runtime.ts";

export interface TestApi {
	readonly test: (name: string, fn: () => void | Promise<void>) => void;
	readonly assertEqual: typeof assertEqual;
	readonly assertDeepEqual: typeof assertDeepEqual;
	readonly assertOk: typeof assertOk;
}

function asRecord(value: unknown): Record<string, unknown> {
	return value as Record<string, unknown>;
}

function baseEvidence(inputViewId = "raw") {
	return {
		mode: "algorithm" as const,
		exactness: "E1" as const,
		producer: "textdoc-test",
		packageName: "@ismail-elkorchi/textdoc",
		packageVersion: "0.1.0",
		inputViewIds: [inputViewId],
	};
}

export function registerTests(api: TestApi): void {
	api.test("required public entrypoints import", async () => {
		const entrypoints = [
			"",
			"document",
			"view",
			"span",
			"layer",
			"annotation",
			"graph",
			"query",
			"selection",
			"serialize",
		] as const;
		for (const entrypoint of entrypoints) {
			const module = await importTextdocSubpath(entrypoint);
			api.assertOk(
				Object.keys(asRecord(module)).length > 0,
				`empty entrypoint: ${entrypoint}`,
			);
		}
	});

	api.test("removed public names are absent from root", async () => {
		const root = asRecord(await importTextdoc());
		for (const removed of [
			"TextDocDocumentV1",
			"createTextDocDocumentFromText",
			"queryTextDocAnnotations",
			"validateTextDocTaskGraphProfile",
			"importConlluToTextDocDocumentV1",
			"exportTextDocDocumentBundlePayloadV1",
			"toTextDocDocumentV1",
			"TextDocRevisionError",
		]) {
			api.assertEqual(
				Object.hasOwn(root, removed),
				false,
				`${removed} must not be public`,
			);
		}
	});

	api.test("createDocument creates final document substrate only", async () => {
		const { createDocument, isTextDocument, validateTextDocument } =
			await importTextdoc();
		const bytes = new TextEncoder().encode("Hello world.");
		const doc = createDocument(bytes, {
			id: "doc:hello",
			sourceId: "source:hello",
			rawViewId: "raw",
			metadata: { language: "en" },
		});
		api.assertEqual(doc.id, "doc:hello");
		api.assertEqual(doc.sources["source:hello"]?.inputKind, "utf8");
		api.assertEqual(doc.sources["source:hello"]?.byteLength, bytes.byteLength);
		api.assertEqual(doc.views.raw?.text, "Hello world.");
		api.assertEqual(Object.keys(doc.layers).length, 0);
		api.assertEqual(Object.keys(doc.graphs).length, 0);
		api.assertOk(isTextDocument(doc));
		api.assertDeepEqual(validateTextDocument(doc), {
			ok: true,
			diagnostics: [],
		});
	});

	api.test(
		"layers annotations queries and graphs use final model",
		async () => {
			const {
				addAnnotation,
				addGraph,
				addLayer,
				createDocument,
				removeAnnotation,
				selectAnnotations,
				updateAnnotation,
				validateTextDocument,
			} = await importTextdoc();
			const doc = createDocument("Alice sees Bob.", { id: "doc:graph" });
			const withLayer = addLayer(doc, {
				id: "tokens",
				type: "token.word",
				viewId: "raw",
				annotations: {},
			});
			const tokenAlice = {
				id: "token:1",
				layer: "tokens",
				type: "token.word",
				spans: [
					{
						viewId: "raw",
						span: { start: 0, end: 5, unit: "utf16-code-unit" as const },
					},
				],
				value: { index: 0, text: "Alice" },
				features: { surface: "Alice" },
				evidence: baseEvidence(),
			};
			const tokenBob = {
				id: "token:3",
				layer: "tokens",
				type: "token.word",
				spans: [
					{
						viewId: "raw",
						span: { start: 11, end: 14, unit: "utf16-code-unit" as const },
					},
				],
				value: { index: 2, text: "Bob" },
				features: { surface: "Bob" },
				evidence: baseEvidence(),
			};
			const withAnnotations = addAnnotation(
				addAnnotation(withLayer, tokenBob),
				tokenAlice,
			);
			let rejected = false;
			try {
				addAnnotation(
					addLayer(withAnnotations, {
						id: "entities",
						type: "entity",
						viewId: "raw",
						annotations: {},
					}),
					{
						...tokenAlice,
						layer: "entities",
						type: "entity",
					},
				);
			} catch {
				rejected = true;
			}
			api.assertEqual(rejected, true, "annotation ids must be document-wide");
			const withGraph = addGraph(withAnnotations, {
				id: "dependency",
				kind: "dependency",
				nodes: {
					"node:alice": {
						id: "node:alice",
						annotationId: "token:1",
						layerId: "tokens",
					},
					"node:bob": {
						id: "node:bob",
						annotationId: "token:3",
						layerId: "tokens",
					},
				},
				edges: {
					"edge:obj": {
						id: "edge:obj",
						source: "node:alice",
						target: "node:bob",
						relation: "obj",
					},
				},
			});
			api.assertDeepEqual(
				selectAnnotations(withGraph, {
					layer: "tokens",
					features: { surface: "Alice" },
				}).map((annotation) => annotation.id),
				["token:1"],
			);
			api.assertDeepEqual(
				selectAnnotations(withGraph, {
					graph: {
						graphId: "dependency",
						relation: "obj",
						direction: "target",
					},
				}).map((annotation) => annotation.id),
				["token:3"],
			);
			const updated = updateAnnotation(withGraph, {
				...tokenBob,
				features: { surface: "Bob", entityHint: "person" },
			});
			api.assertDeepEqual(
				selectAnnotations(updated, {
					evidence: {
						packageName: "@ismail-elkorchi/textdoc",
						inputViewId: "raw",
					},
					features: { entityHint: "person" },
				}).map((annotation) => annotation.id),
				["token:3"],
			);
			const removed = removeAnnotation(updated, "token:1", {
				danglingGraphReferences: "remove",
			});
			const dependencyGraph = removed.graphs.dependency;
			api.assertOk(dependencyGraph);
			api.assertEqual(
				Object.hasOwn(dependencyGraph?.nodes ?? {}, "node:alice"),
				false,
			);
			api.assertEqual(Object.keys(dependencyGraph?.edges ?? {}).length, 0);
			api.assertDeepEqual(validateTextDocument(removed), {
				ok: true,
				diagnostics: [],
			});
		},
	);

	api.test(
		"span maps map identity direct and missing spans deterministically",
		async () => {
			const {
				addSpanMap,
				addView,
				addViewWithSpanMap,
				createDocument,
				mapSpan,
				validateTextDocument,
			} = await importTextdoc();
			const doc = createDocument("Cafe\u0301", { id: "doc:span" });
			const normalized = addView(doc, {
				id: "nfc",
				kind: "normalized",
				text: "Café",
				sourceViewId: "raw",
				transform: {
					kind: "normalization",
					producer: "@ismail-elkorchi/textfacts",
					algorithm: "NFC",
					sourceViewId: "raw",
				},
			});
			const mapped = addSpanMap(normalized, {
				id: "raw-to-nfc",
				sourceViewId: "raw",
				targetViewId: "nfc",
				entries: [
					{
						source: { start: 0, end: 5, unit: "utf16-code-unit" },
						target: { start: 0, end: 4, unit: "utf16-code-unit" },
						relation: "normalized",
					},
				],
			});
			const atomic = addViewWithSpanMap(
				doc,
				{
					id: "nfc-linked",
					kind: "normalized",
					text: "Café",
					sourceViewId: "raw",
					spanMapId: "raw-to-nfc-linked",
					transform: {
						kind: "normalization",
						producer: "@ismail-elkorchi/textfacts",
						algorithm: "NFC",
						sourceViewId: "raw",
					},
				},
				{
					id: "raw-to-nfc-linked",
					sourceViewId: "raw",
					targetViewId: "nfc-linked",
					entries: [
						{
							source: { start: 0, end: 5, unit: "utf16-code-unit" },
							target: { start: 0, end: 4, unit: "utf16-code-unit" },
							relation: "normalized",
						},
					],
				},
			);
			api.assertDeepEqual(validateTextDocument(atomic), {
				ok: true,
				diagnostics: [],
			});
			const linkedSpanMap = atomic.spanMaps["raw-to-nfc-linked"];
			api.assertOk(linkedSpanMap);
			api.assertDeepEqual(
				validateTextDocument({
					...atomic,
					spanMaps: {
						...atomic.spanMaps,
						"raw-to-nfc-linked": {
							...linkedSpanMap,
							targetViewId: "raw",
						},
					},
				}).diagnostics,
				[
					"textdoc.view.span-map-target-mismatch:nfc-linked:raw-to-nfc-linked:raw",
				],
			);
			api.assertDeepEqual(
				mapSpan(
					mapped,
					{
						viewId: "raw",
						span: { start: 0, end: 5, unit: "utf16-code-unit" },
					},
					"nfc",
				),
				[
					{
						viewId: "nfc",
						span: { start: 0, end: 4, unit: "utf16-code-unit" },
					},
				],
			);
			api.assertDeepEqual(
				mapSpan(
					mapped,
					{
						viewId: "raw",
						span: { start: 1, end: 2, unit: "utf16-code-unit" },
					},
					"nfc",
				),
				[],
			);
		},
	);

	api.test("selection chooses deterministic alternatives", async () => {
		const { selectAlternative } = await importTextdoc();
		const annotation = {
			id: "lemma:1",
			layer: "lemmas",
			type: "lemma",
			spans: [],
			value: "saw",
			evidence: baseEvidence(),
			alternatives: [
				{
					value: "see",
					evidence: baseEvidence(),
					score: { kind: "rank" as const, value: 1 },
				},
				{
					value: "saw",
					evidence: baseEvidence(),
					score: { kind: "rank" as const, value: 2 },
				},
			],
		};
		api.assertEqual(
			selectAlternative(annotation, { scoreKind: "rank" }).value,
			"see",
		);
		api.assertDeepEqual(
			selectAlternative(annotation, {
				scoreKind: "rank",
			}).alternatives?.map((alternative) => alternative.value),
			["saw"],
		);
		api.assertDeepEqual(
			selectAlternative(
				{
					...annotation,
					alternatives: [
						annotation
							.alternatives[0] as (typeof annotation.alternatives)[number],
					],
				},
				{ scoreKind: "rank" },
			).alternatives,
			[],
		);
	});

	api.test(
		"stable JSON round trips final documents and rejects old shapes",
		async () => {
			const { createDocument, fromTextDocJson, toTextDocJson } =
				await importTextdoc();
			const doc = createDocument("abc", {
				id: "doc:json",
				metadata: { z: true, a: 1 },
			});
			const json = toTextDocJson(doc);
			api.assertDeepEqual(Object.keys(json.metadata), ["a", "z"]);
			api.assertDeepEqual(fromTextDocJson(json), json);

			let rejected = false;
			try {
				toTextDocJson(
					createDocument("abc", {
						id: "doc:date",
						metadata: { when: new Date("2026-06-03T00:00:00Z") },
					}),
				);
			} catch {
				rejected = true;
			}
			api.assertEqual(
				rejected,
				true,
				"non-plain JSON objects must be rejected",
			);

			rejected = false;
			try {
				fromTextDocJson({
					schemaVersion: 1,
					documentId: "old",
					revision: "r1",
					views: [],
					layers: [],
				} as never);
			} catch {
				rejected = true;
			}
			api.assertEqual(
				rejected,
				true,
				"old TextDocDocumentV1-like JSON must be rejected",
			);

			rejected = false;
			try {
				const invalidJson = asRecord(json);
				const invalidViews = asRecord(invalidJson.views);
				const invalidRawView = asRecord(invalidViews.raw);
				fromTextDocJson({
					...invalidJson,
					views: {
						raw: {
							...invalidRawView,
							sourceViewId: "missing-view",
						},
					},
				} as never);
			} catch {
				rejected = true;
			}
			api.assertEqual(
				rejected,
				true,
				"shape-valid JSON with invalid references must be rejected",
			);

			rejected = false;
			try {
				const invalidJson = asRecord(json);
				fromTextDocJson({
					...invalidJson,
					layers: {
						one: {
							id: "one",
							type: "token.word",
							viewId: "raw",
							annotations: {
								dup: {
									id: "dup",
									layer: "one",
									type: "token.word",
									spans: [],
									evidence: baseEvidence(),
								},
							},
						},
						two: {
							id: "two",
							type: "entity",
							viewId: "raw",
							annotations: {
								dup: {
									id: "dup",
									layer: "two",
									type: "entity",
									spans: [],
									evidence: baseEvidence(),
								},
							},
						},
					},
				} as never);
			} catch {
				rejected = true;
			}
			api.assertEqual(
				rejected,
				true,
				"duplicate annotation ids across layers must be rejected",
			);
		},
	);
}

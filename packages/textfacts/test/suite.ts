import type { assertDeepEqual, assertEqual, assertOk } from "./_support/assert.ts";
import { importTextfacts, importTextfactsSubpath } from "./_support/runtime.ts";

export interface TestApi {
  test: (name: string, fn: () => void | Promise<void>) => void;
  assertEqual: typeof assertEqual;
  assertDeepEqual: typeof assertDeepEqual;
  assertOk: typeof assertOk;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

export function registerTests(api: TestApi): void {
  api.test("required public entrypoints import", async () => {
    const entrypoints = [
      "",
      "input",
      "unicode",
      "normalize",
      "casefold",
      "segment",
      "linebreak",
      "bidi",
      "security",
      "integrity",
      "collation",
      "facts",
      "hash",
      "idna",
    ] as const;

    for (const entrypoint of entrypoints) {
      const module = await importTextfactsSubpath(entrypoint);
      api.assertOk(Object.keys(asRecord(module)).length > 0, `empty entrypoint: ${entrypoint}`);
    }
  });

  api.test("removed public entrypoints are absent from package metadata", async () => {
    const root = asRecord(await importTextfacts());
    for (const removed of [
      "normalizeInput",
      "NormalizedInput",
      "segmentWordsUAX29",
      "segmentSentencesUAX29",
      "explainNormalization",
      "normalizeIter",
      "ucaSortKeyBytes",
      "ucaSortKeyHex",
      "ucaCompare",
      "ucaStableSort",
      "ucaFoldKey",
      "wordCooccurrence",
      "buildVariantIndex",
      "buildCorpusVariantIndex",
      "jcsCanonicalize",
      "jcsSha256Hex",
    ]) {
      api.assertEqual(Object.hasOwn(root, removed), false, `${removed} must not be public`);
    }
  });

  api.test("input reads strings and UTF-8 bytes", async () => {
    const { readText } = await importTextfacts();
    api.assertDeepEqual(readText("Cafe\u0301"), {
      text: "Cafe\u0301",
      sourceType: "string",
      wellFormed: true,
    });
    const bytes = new TextEncoder().encode("Café");
    api.assertDeepEqual(readText(bytes), {
      text: "Café",
      sourceType: "utf8",
      byteLength: bytes.byteLength,
      wellFormed: true,
    });
  });

  api.test("normalization exports final APIs", async () => {
    const { normalize, normalizationDeltas } = await importTextfacts();
    api.assertEqual(normalize("Cafe\u0301", "NFC"), "Café");
    const deltas = normalizationDeltas("Cafe\u0301", "NFC");
    api.assertOk(deltas.some((delta) => delta.kind === "normalized"));
  });

  api.test("Unicode default segmentation uses final names", async () => {
    const { segmentGraphemes, segmentWords, segmentSentences } = await importTextfacts();
    api.assertEqual([...segmentGraphemes("Cafe\u0301")].length, 4);
    api.assertOk([...segmentWords("Hello world")].length >= 2);
    api.assertEqual([...segmentSentences("One. Two.")].length, 2);
  });

  api.test("line break and bidi facts are available", async () => {
    const { hasBidiControls, lineBreakOpportunities, resolveBidi } = await importTextfacts();
    api.assertOk([...lineBreakOpportunities("Hello world")].length > 0);
    api.assertEqual(hasBidiControls("abc"), false);
    api.assertOk(resolveBidi("abc").runs.length > 0);
  });

  api.test("integrity scans final finding names", async () => {
    const { scanIntegrityFindings } = await importTextfacts();
    const findings = scanIntegrityFindings("a\u200Db", { include: ["join-control"] });
    api.assertEqual(findings[0]?.kind, "join-control");
  });

  api.test("security exports confusable and mixed-script facts", async () => {
    const { confusableSkeleton, mixedScriptTokenFacts } = await importTextfacts();
    api.assertEqual(confusableSkeleton("paypal"), confusableSkeleton("раураl"));
    const facts = [...mixedScriptTokenFacts("раyраl")];
    api.assertOk(facts.length > 0);
  });

  api.test("root collation final names are deterministic", async () => {
    const { compareRootCollation, rootCollationKey } = await importTextfacts();
    api.assertEqual(compareRootCollation("abc", "abc"), 0);
    api.assertOk(rootCollationKey("abc") instanceof Uint8Array);
  });

  api.test("single-text facts include frequencies, ngrams, and surface profile", async () => {
    const { charNgrams, surfaceProfile, wordFrequencies, wordNgrams } = await importTextfacts();
    const frequencies = wordFrequencies("a a b");
    api.assertEqual(frequencies.items[0]?.value, "a");
    api.assertEqual(frequencies.items[0]?.count, 2);
    api.assertEqual(charNgrams("abcd", { n: 2 }).total, 3);
    api.assertEqual(wordNgrams("a b a", { n: 2 }).total, 2);
    const profile = surfaceProfile("a a b");
    api.assertEqual(profile.counts.words, 3);
    api.assertOk(profile.repeatedSpans.length > 0);
  });

  api.test("stable hash APIs return canonical hex", async () => {
    const { stableHash128, stableHash64 } = await importTextfacts();
    api.assertEqual(stableHash64("abc").length, 16);
    api.assertEqual(stableHash128("abc").length, 32);
    api.assertEqual(stableHash64("abc"), stableHash64("abc"));
  });

  api.test("IDNA remains available", async () => {
    const { uts46ToAscii } = await importTextfacts();
    const result = uts46ToAscii("example.com");
    api.assertOk(result.ok);
    if (result.ok) {
      api.assertEqual(result.value, "example.com");
    }
  });
}

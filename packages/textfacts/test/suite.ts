import type { assertDeepEqual, assertEqual, assertOk } from "./_support/assert.ts";
import { parseBidiCharacterTestFile, parseBidiTestFile } from "./_support/bidi.ts";
import { parseCollationTestFile } from "./_support/collation.ts";
import { genFuzzString, genWellFormed } from "./_support/genText.ts";
import { parseIdnaTestV2, readIdnaTestFile } from "./_support/idna.ts";
import { parseNormalizationTestFile } from "./_support/normalization.ts";
import { evalProperty, getPbtRuns, getPbtSeed } from "./_support/pbt.ts";
import {
  detectRuntime,
  getRepoRootUrl,
  importTextfacts,
  readTextFile,
} from "./_support/runtime.ts";
import { parseBreakTestFile, readUcdTestFile } from "./_support/ucd.ts";
import { registerMetamorphicTests } from "./metamorphic/metamorphic.test.ts";

type JsonValue = import("../mod.ts").JsonValue;

export interface TestApi {
  test: (name: string, fn: () => void | Promise<void>) => void;
  assertEqual: typeof assertEqual;
  assertDeepEqual: typeof assertDeepEqual;
  assertOk: typeof assertOk;
}

export function registerTests(api: TestApi): void {
  const pbtRuns = getPbtRuns(100);
  const pbtSeed = getPbtSeed();
  const pbtSeedFor = (name: string) => `${pbtSeed}:${name}`;

  registerMetamorphicTests(api);

  api.test("sliceBySpan returns expected substring", async () => {
    const { sliceBySpan } = await importTextfacts();
    const text = "Hello, world";
    api.assertEqual(sliceBySpan(text, { startCU: 7, endCU: 12 }), "world");
  });

  api.test("segmentGraphemes spans cover full string", async () => {
    const { segmentGraphemes } = await importTextfacts();
    const text = "Cafe\u0301";
    const spans = [...segmentGraphemes(text)];
    api.assertOk(spans.length > 0);
    api.assertEqual(spans[0].startCU, 0);
    api.assertEqual(spans[spans.length - 1].endCU, text.length);
  });

  api.test("wordFrequencies deterministic order", async () => {
    const { wordFrequencies } = await importTextfacts();
    const result = wordFrequencies("b a a", { filter: "word-like" });
    api.assertEqual(result.items[0].token, "a");
    api.assertEqual(result.items[0].count, 2);
  });

  api.test("kernel determinism harness", async () => {
    const {
      buildVariantIndex,
      confusableSkeleton,
      fnv1a32,
      jcsCanonicalize,
      sha256Hex,
      normalize,
      segmentWordsUAX29,
      ucaSortKeyHex,
      wordFrequencies,
    } = await importTextfacts();
    const sample = "Cafe\u0301 — cafe \u{1F468}\u{1F3FD}\u200D\u{1F4BB}";
    const wordSpans = [...segmentWordsUAX29(sample)];
    const frequencies = wordFrequencies(sample, { filter: "word-like" });
    const variantIndex = buildVariantIndex(sample, {
      tokenizer: "uax29-word",
      canonicalKey: "skeleton",
      wordFilter: "word-like",
      maxExamplesPerVariant: 2,
      maxVariants: 25,
    });
    const skeleton = confusableSkeleton(sample);
    const jcs = jcsCanonicalize({ a: 1, b: [true, false, null] });
    const collationSamples: Array<{
      label: string;
      value: string | null;
      codeUnits: number[] | null;
    }> = [
      { label: "café", value: "café", codeUnits: null },
      { label: "cafe+combining", value: "cafe\u0301", codeUnits: null },
      { label: "Ångström", value: "Ångström", codeUnits: null },
      { label: "ångström", value: "ångström", codeUnits: null },
      { label: "δelta", value: "δelta", codeUnits: null },
      { label: "Δelta", value: "Δelta", codeUnits: null },
      { label: "汉字", value: "汉字", codeUnits: null },
      { label: "emoji", value: "😀", codeUnits: null },
      { label: "lone-surrogate", value: null, codeUnits: [0xd800] },
    ];
    const collation = collationSamples.map((sample) => {
      const material = sample.value ?? String.fromCharCode(...(sample.codeUnits ?? []));
      return {
        label: sample.label,
        value: sample.value,
        codeUnits: sample.codeUnits,
        key: ucaSortKeyHex(material, {
          strength: 3,
          alternate: "non-ignorable",
          normalization: "nfd",
          illFormed: "replace",
          includeIdenticalLevel: true,
        }),
      };
    });
    const payload = {
      normalized: normalize(sample, "NFC"),
      wordSpans,
      frequencies,
      variantIndex,
      skeleton,
      collation,
      jcs,
    } as unknown as JsonValue;
    const canonical = jcsCanonicalize(payload);
    const fnv = fnv1a32(canonical);
    const sha = await sha256Hex(canonical);
    api.assertEqual(fnv, "fnv1a32:b79e2e0b");
    api.assertEqual(sha, "sha256:5a3cff0994f07882184c92d89fca4cd20b5aa42628c52147195ebff5511222e5");
  });

  api.test("UAX29 GraphemeBreakTest", async () => {
    const { segmentGraphemes } = await importTextfacts();
    const data = await readUcdTestFile("auxiliary/GraphemeBreakTest.txt");
    const cases = parseBreakTestFile(data);
    for (let caseIndex = 0; caseIndex < cases.length; caseIndex += 1) {
      const testCase = cases[caseIndex];
      if (!testCase) continue;
      const { text, boundaryPositions, raw } = testCase;
      const spans = [...segmentGraphemes(text)];
      const actual = [0, ...spans.map((span: { endCU: number }) => span.endCU)];
      if (!arrayEqual(actual, boundaryPositions)) {
        throw new Error(
          `GraphemeBreakTest failure at case ${caseIndex}: expected ${boundaryPositions.join(",")} got ${actual.join(",")} | ${raw}`,
        );
      }
    }
  });

  api.test("UAX29 WordBreakTest", async () => {
    const { segmentWordsUAX29 } = await importTextfacts();
    const data = await readUcdTestFile("auxiliary/WordBreakTest.txt");
    const cases = parseBreakTestFile(data);
    for (let caseIndex = 0; caseIndex < cases.length; caseIndex += 1) {
      const testCase = cases[caseIndex];
      if (!testCase) continue;
      const { text, boundaryPositions, raw } = testCase;
      const spans = [...segmentWordsUAX29(text)];
      const actual = [0, ...spans.map((span: { endCU: number }) => span.endCU)];
      if (!arrayEqual(actual, boundaryPositions)) {
        throw new Error(
          `WordBreakTest failure at case ${caseIndex}: expected ${boundaryPositions.join(",")} got ${actual.join(",")} | ${raw}`,
        );
      }
    }
  });

  api.test("UAX29 SentenceBreakTest", async () => {
    const { segmentSentencesUAX29 } = await importTextfacts();
    const data = await readUcdTestFile("auxiliary/SentenceBreakTest.txt");
    const cases = parseBreakTestFile(data);
    for (let caseIndex = 0; caseIndex < cases.length; caseIndex += 1) {
      const testCase = cases[caseIndex];
      if (!testCase) continue;
      const { text, boundaryPositions, raw } = testCase;
      const spans = [...segmentSentencesUAX29(text)];
      const actual = [0, ...spans.map((span: { endCU: number }) => span.endCU)];
      if (!arrayEqual(actual, boundaryPositions)) {
        throw new Error(
          `SentenceBreakTest failure at case ${caseIndex}: expected ${boundaryPositions.join(",")} got ${actual.join(",")} | ${raw}`,
        );
      }
    }
  });

  api.test("tokenization/SBD expected outputs", async () => {
    const { segmentSentencesUAX29, segmentWordsUAX29 } = await importTextfacts();
    const fixtureRoot = new URL("../../fixtures/tokenization-sbd/", getRepoRootUrl());
    const slices = JSON.parse(
      await readTextFile(new URL("slices.json", fixtureRoot)),
    ) as TokenizationSbdSliceManifest;

    for (const slice of slices.slices) {
      const expected = JSON.parse(
        await readTextFile(new URL(`expected/${slice.id}.json`, fixtureRoot)),
      ) as TokenizationSbdExpectedOutput;
      const text = materializeTokenizationSbdSource(slice.source);
      api.assertDeepEqual(
        projectSpanAnnotations(
          text,
          [...segmentWordsUAX29(text)],
          "uax29-word-boundary-token",
          "token",
        ),
        expected.tokens,
      );
      api.assertDeepEqual(
        projectSpanAnnotations(
          text,
          [...segmentSentencesUAX29(text)],
          "uax29-sentence",
          "sentence",
        ),
        expected.sentences,
      );
    }
  });

  api.test("multilingual Unicode edge fixtures stay text-local", async () => {
    const {
      integrityProfile,
      isNormalized,
      isWellFormedUnicode,
      normalize,
      segmentGraphemes,
      segmentSentencesUAX29,
      segmentWordsUAX29,
    } = await importTextfacts();
    const fixtureUrl = new URL("testdata/edge/multilingual-unicode-edge.v1.json", getRepoRootUrl());
    const fixture = JSON.parse(await readTextFile(fixtureUrl)) as {
      scopeBoundary: string;
      cases: Array<{ id: string; text: string; expectWellFormed: boolean }>;
    };
    api.assertEqual(
      fixture.scopeBoundary,
      "Text-local Unicode edge coverage only; not language-aware NLP support.",
    );
    for (const testCase of fixture.cases) {
      api.assertEqual(isWellFormedUnicode(testCase.text), testCase.expectWellFormed);
      const nfc = normalize(testCase.text, "NFC");
      api.assertEqual(isNormalized(nfc, "NFC"), true);
      api.assertOk([...segmentGraphemes(testCase.text)].length > 0, testCase.id);
      api.assertOk([...segmentWordsUAX29(testCase.text)].length > 0, testCase.id);
      api.assertOk([...segmentSentencesUAX29(testCase.text)].length > 0, testCase.id);
      api.assertEqual(integrityProfile(testCase.text).wellFormed, true);
    }
  });

  api.test("UAX14 LineBreakTest", async () => {
    const { lineBreakPositions } = await importTextfacts();
    const data = await readUcdTestFile("auxiliary/LineBreakTest.txt");
    const cases = parseBreakTestFile(data);
    for (let caseIndex = 0; caseIndex < cases.length; caseIndex += 1) {
      const testCase = cases[caseIndex];
      if (!testCase) continue;
      const { text, boundaryPositions, raw } = testCase;
      const actual = Array.from(lineBreakPositions(text));
      if (!arrayEqual(actual, boundaryPositions)) {
        throw new Error(
          `LineBreakTest failure at case ${caseIndex}: expected ${boundaryPositions.join(",")} got ${actual.join(",")} | ${raw}`,
        );
      }
    }
  });

  api.test("UAX15 NormalizationTest", async () => {
    const { normalize } = await importTextfacts();
    const data = await readUcdTestFile("NormalizationTest.txt");
    const cases = parseNormalizationTestFile(data);
    for (let caseIndex = 0; caseIndex < cases.length; caseIndex += 1) {
      const testCase = cases[caseIndex];
      if (!testCase) continue;
      const { c1, c2, c3, c4, c5, raw } = testCase;
      if (normalize(c1, "NFC") !== c2) {
        throw new Error(`NormalizationTest NFC failed at case ${caseIndex}: ${raw}`);
      }
      if (normalize(c1, "NFD") !== c3) {
        throw new Error(`NormalizationTest NFD failed at case ${caseIndex}: ${raw}`);
      }
      if (normalize(c1, "NFKC") !== c4) {
        throw new Error(`NormalizationTest NFKC failed at case ${caseIndex}: ${raw}`);
      }
      if (normalize(c1, "NFKD") !== c5) {
        throw new Error(`NormalizationTest NFKD failed at case ${caseIndex}: ${raw}`);
      }
      if (normalize(c2, "NFC") !== c2 || normalize(c2, "NFD") !== c3) {
        throw new Error(
          `NormalizationTest NFC/NFD idempotence failed at case ${caseIndex}: ${raw}`,
        );
      }
      if (normalize(c3, "NFC") !== c2 || normalize(c3, "NFD") !== c3) {
        throw new Error(`NormalizationTest NFD idempotence failed at case ${caseIndex}: ${raw}`);
      }
      if (normalize(c4, "NFKC") !== c4 || normalize(c4, "NFKD") !== c5) {
        throw new Error(
          `NormalizationTest NFKC/NFKD idempotence failed at case ${caseIndex}: ${raw}`,
        );
      }
      if (normalize(c5, "NFKC") !== c4 || normalize(c5, "NFKD") !== c5) {
        throw new Error(`NormalizationTest NFKD idempotence failed at case ${caseIndex}: ${raw}`);
      }
    }
  });

  api.test("normalization explanation records transform map and reversibility", async () => {
    const { explainNormalization } = await importTextfacts();
    const unchanged = explainNormalization("abc", "NFC");
    api.assertEqual(unchanged.output, "abc");
    api.assertEqual(unchanged.isReversible, true);
    api.assertEqual(unchanged.transformMap.length, 1);
    api.assertEqual(unchanged.transformMap[0]?.kind, "unchanged");

    const changed = explainNormalization("Cafe\u0301", "NFC");
    api.assertEqual(changed.output, "Café");
    api.assertEqual(changed.isReversible, false);
    api.assertOk(changed.transformMap.some((entry) => entry.kind === "normalized"));
    const normalized = changed.transformMap.find((entry) => entry.kind === "normalized");
    api.assertEqual(normalized?.source, "e\u0301");
    api.assertEqual(normalized?.output, "é");
    api.assertEqual(normalized?.reversible, false);
  });

  api.test("textfacts profiles are explicit and reject undeclared tailoring", async () => {
    const { resolveTextfactsProfile, segmentWordsUAX29, TextfactsError } = await importTextfacts();
    const profile = resolveTextfactsProfile("unicode-17.0.0-default");
    api.assertEqual(profile.id, "unicode-17.0.0-default");
    api.assertEqual(profile.tailoring.segmentation, "uax29-default");

    const spans = segmentWordsUAX29("Alpha beta", { profile: "unicode-17.0.0-default" });
    api.assertEqual(spans.provenance.algorithm.revisionOrDate, "Unicode 17.0.0");

    let threw = false;
    try {
      resolveTextfactsProfile({
        id: "unicode-17.0.0-default",
        tailoring: { segmentation: "locale-default" },
      } as never);
    } catch (err) {
      threw = true;
      api.assertOk(err instanceof TextfactsError);
      api.assertEqual(getErrorCode(err), "PROFILE_UNSUPPORTED");
    }
    api.assertOk(threw);

    threw = false;
    try {
      segmentWordsUAX29("Alpha", {
        profile: "unicode-17.0.0-default",
        algorithmRevision: "Unicode 99.0.0",
      });
    } catch (err) {
      threw = true;
      api.assertOk(err instanceof TextfactsError);
      api.assertEqual(getErrorCode(err), "PROFILE_REVISION_MISMATCH");
    }
    api.assertOk(threw);
  });

  api.test("UAX9 BidiTest", async () => {
    const { resolveBidi } = await importTextfacts();
    const data = await readUcdTestFile("BidiTest.txt");
    const cases = parseBidiTestFile(data);

    const sampleMap: Record<string, number> = {
      L: 0x0041,
      R: 0x05d0,
      AL: 0x0627,
      EN: 0x0030,
      ES: 0x002b,
      ET: 0x0024,
      AN: 0x0660,
      CS: 0x002c,
      NSM: 0x0300,
      BN: 0x00ad,
      B: 0x2029,
      S: 0x0009,
      WS: 0x0020,
      ON: 0x0021,
      LRE: 0x202a,
      RLE: 0x202b,
      LRO: 0x202d,
      RLO: 0x202e,
      PDF: 0x202c,
      LRI: 0x2066,
      RLI: 0x2067,
      FSI: 0x2068,
      PDI: 0x2069,
    };

    const directions = [
      { bit: 1, option: "auto" as const },
      { bit: 2, option: "ltr" as const },
      { bit: 4, option: "rtl" as const },
    ];

    for (let caseIndex = 0; caseIndex < cases.length; caseIndex += 1) {
      const testCase = cases[caseIndex];
      if (!testCase) continue;
      const cps = testCase.input.map((token) => {
        const codePoint = sampleMap[token];
        if (codePoint === undefined) {
          throw new Error(`Missing sample code point for ${token}`);
        }
        return codePoint;
      });
      const text = String.fromCodePoint(...cps);
      for (const dir of directions) {
        if ((testCase.bitset & dir.bit) === 0) continue;
        const result = resolveBidi(text, { paragraphDirection: dir.option });
        const actualLevels = Array.from(result.levels).map((level) =>
          level === 0xff ? null : level,
        );
        if (!arrayEqualNullable(actualLevels, testCase.levels)) {
          throw new Error(
            `BidiTest levels failure at case ${caseIndex} (${dir.option}): expected ${testCase.levels.join(",")} got ${actualLevels.join(",")} | ${testCase.raw}`,
          );
        }
        const actualOrder = Array.from(result.visualOrder);
        if (!arrayEqual(actualOrder, testCase.reorder)) {
          throw new Error(
            `BidiTest reorder failure at case ${caseIndex} (${dir.option}): expected ${testCase.reorder.join(",")} got ${actualOrder.join(",")} | ${testCase.raw}`,
          );
        }
      }
    }
  });

  api.test("UAX9 BidiCharacterTest", async () => {
    const { resolveBidi } = await importTextfacts();
    const data = await readUcdTestFile("BidiCharacterTest.txt");
    const cases = parseBidiCharacterTestFile(data);
    for (let caseIndex = 0; caseIndex < cases.length; caseIndex += 1) {
      const testCase = cases[caseIndex];
      if (!testCase) continue;
      const option =
        testCase.paragraphDirection === 0
          ? "ltr"
          : testCase.paragraphDirection === 1
            ? "rtl"
            : "auto";
      const result = resolveBidi(testCase.text, { paragraphDirection: option });
      if (result.paragraphLevel !== testCase.paragraphLevel) {
        throw new Error(
          `BidiCharacterTest paragraph level mismatch at case ${caseIndex}: expected ${testCase.paragraphLevel} got ${result.paragraphLevel} | ${testCase.raw}`,
        );
      }
      const actualLevels = Array.from(result.levels).map((level) =>
        level === 0xff ? null : level,
      );
      if (!arrayEqualNullable(actualLevels, testCase.levels)) {
        throw new Error(
          `BidiCharacterTest levels failure at case ${caseIndex}: expected ${testCase.levels.join(",")} got ${actualLevels.join(",")} | ${testCase.raw}`,
        );
      }
      const actualOrder = Array.from(result.visualOrder);
      if (!arrayEqual(actualOrder, testCase.reorder)) {
        throw new Error(
          `BidiCharacterTest reorder failure at case ${caseIndex}: expected ${testCase.reorder.join(",")} got ${actualOrder.join(",")} | ${testCase.raw}`,
        );
      }
    }
  });

  api.test("UTS46 IdnaTestV2 conformance", async () => {
    const { uts46ToUnicode, uts46ToAscii } = await importTextfacts();
    const data = await readIdnaTestFile("idna/IdnaTestV2.txt");
    const cases = parseIdnaTestV2(data);

    const matchesExpected = (actual: string, expected: string) => {
      if (actual === expected) return true;
      if (actual.length !== expected.length) return false;
      for (let index = 0; index < actual.length; index += 1) {
        const actualCodeUnit = actual.charCodeAt(index);
        if (actualCodeUnit === 0xfffd) continue;
        if (actualCodeUnit !== expected.charCodeAt(index)) return false;
      }
      return true;
    };

    const expectsError = (statuses: string[]) => statuses.length > 0;

    let total = 0;
    let passUnicode = 0;
    let passAsciiN = 0;
    let passAsciiT = 0;

    for (let caseIndex = 0; caseIndex < cases.length; caseIndex += 1) {
      const testCase = cases[caseIndex];
      if (!testCase) continue;
      total += 1;

      const unicodeResult = uts46ToUnicode(testCase.source);
      if (!matchesExpected(unicodeResult.value, testCase.toUnicode)) {
        throw new Error(
          `IdnaTestV2 toUnicode mismatch at case ${caseIndex}: expected ${JSON.stringify(testCase.toUnicode)} got ${JSON.stringify(unicodeResult.value)} | ${testCase.raw}`,
        );
      }
      if (expectsError(testCase.toUnicodeStatus) !== unicodeResult.errors.length > 0) {
        throw new Error(
          `IdnaTestV2 toUnicode error expectation mismatch at case ${caseIndex}: statuses=${testCase.toUnicodeStatus.join(",")} | ${testCase.raw}`,
        );
      }
      passUnicode += 1;

      const asciiNResult = uts46ToAscii(testCase.source, { useCompatMapping: false });
      if (!matchesExpected(asciiNResult.value, testCase.toAsciiN)) {
        throw new Error(
          `IdnaTestV2 toAsciiN mismatch at case ${caseIndex}: expected ${JSON.stringify(testCase.toAsciiN)} got ${JSON.stringify(asciiNResult.value)} | ${testCase.raw}`,
        );
      }
      if (expectsError(testCase.toAsciiNStatus) !== asciiNResult.errors.length > 0) {
        throw new Error(
          `IdnaTestV2 toAsciiN error expectation mismatch at case ${caseIndex}: statuses=${testCase.toAsciiNStatus.join(",")} | ${testCase.raw}`,
        );
      }
      passAsciiN += 1;

      const asciiTResult = uts46ToAscii(testCase.source, { useCompatMapping: true });
      if (!matchesExpected(asciiTResult.value, testCase.toAsciiT)) {
        throw new Error(
          `IdnaTestV2 toAsciiT mismatch at case ${caseIndex}: expected ${JSON.stringify(testCase.toAsciiT)} got ${JSON.stringify(asciiTResult.value)} | ${testCase.raw}`,
        );
      }
      if (expectsError(testCase.toAsciiTStatus) !== asciiTResult.errors.length > 0) {
        throw new Error(
          `IdnaTestV2 toAsciiT error expectation mismatch at case ${caseIndex}: statuses=${testCase.toAsciiTStatus.join(",")} | ${testCase.raw}`,
        );
      }
      passAsciiT += 1;
    }

    console.log(
      `IdnaTestV2: toUnicode ${passUnicode}/${total} toAsciiN ${passAsciiN}/${total} toAsciiT ${passAsciiT}/${total}`,
    );
  });

  api.test("UTS10 CollationTest NON_IGNORABLE", async () => {
    const { ucaCompare } = await importTextfacts();
    const runtime = detectRuntime();
    const file =
      runtime === "node"
        ? "testdata/unicode/17.0.0/uca/CollationTest/CollationTest/CollationTest_NON_IGNORABLE.txt"
        : "testdata/unicode/17.0.0/uca/CollationTest/CollationTest/CollationTest_NON_IGNORABLE_SHORT.txt";
    const data = await readTextFile(new URL(file, getRepoRootUrl()));
    const items = parseCollationTestFile(data);
    for (let itemIndex = 0; itemIndex < items.length - 1; itemIndex += 1) {
      const left = items[itemIndex] ?? "";
      const right = items[itemIndex + 1] ?? "";
      const cmp = ucaCompare(left, right, {
        alternate: "non-ignorable",
        includeIdenticalLevel: false,
        illFormed: "implicit",
      });
      if (cmp > 0) {
        throw new Error(`CollationTest NON_IGNORABLE failure at line ${itemIndex + 1}`);
      }
    }
  });

  api.test("UTS10 CollationTest SHIFTED", async () => {
    const { ucaCompare } = await importTextfacts();
    const runtime = detectRuntime();
    const file =
      runtime === "node"
        ? "testdata/unicode/17.0.0/uca/CollationTest/CollationTest/CollationTest_SHIFTED.txt"
        : "testdata/unicode/17.0.0/uca/CollationTest/CollationTest/CollationTest_SHIFTED_SHORT.txt";
    const data = await readTextFile(new URL(file, getRepoRootUrl()));
    const items = parseCollationTestFile(data);
    for (let itemIndex = 0; itemIndex < items.length - 1; itemIndex += 1) {
      const left = items[itemIndex] ?? "";
      const right = items[itemIndex + 1] ?? "";
      const cmp = ucaCompare(left, right, {
        alternate: "shifted",
        includeIdenticalLevel: false,
        illFormed: "implicit",
      });
      if (cmp > 0) {
        throw new Error(`CollationTest SHIFTED failure at line ${itemIndex + 1}`);
      }
    }
  });

  api.test("CaseFolding sample mappings", async () => {
    const { caseFoldCodePoint } = await importTextfacts();
    const text = await readSpecFile("specs/unicode/17.0.0/ucd/CaseFolding.txt");
    const entries = parseCaseFoldingFile(text);
    const sample = entries.filter((_, index) => index % 97 === 0).slice(0, 50);
    for (const entry of sample) {
      const mapping = caseFoldCodePoint(entry.codePoint);
      if (!arrayEqual(mapping, entry.mapping)) {
        throw new Error(
          `CaseFolding mapping mismatch for ${entry.codePoint.toString(16)}: expected ${entry.mapping.join(",")} got ${mapping.join(",")}`,
        );
      }
    }
  });

  api.test("CaseFolding golden hash", async () => {
    const { caseFoldCodePoint, canonicalModelStringify, fnv1a32 } = await importTextfacts();
    const sample: number[] = [];
    for (let codePoint = 0; codePoint <= 0x10ffff; codePoint += 257) {
      const mapping = caseFoldCodePoint(codePoint);
      sample.push(codePoint, ...mapping, -1);
    }
    const hash = fnv1a32(canonicalModelStringify(sample));
    api.assertEqual(hash, "fnv1a32:3ed0eff9");
  });

  api.test("Script tables sample mappings", async () => {
    const { SCRIPT_NAMES, scriptAt } = await importTextfacts();
    const text = await readSpecFile("specs/unicode/17.0.0/ucd/Scripts.txt");
    const ranges = parseScriptFile(text);
    const sample = ranges.filter((_, index) => index % 113 === 0).slice(0, 50);
    for (const range of sample) {
      const scriptName = SCRIPT_NAMES[scriptAt(range.start)] ?? "Unknown";
      if (scriptName !== range.script) {
        throw new Error(
          `Script mismatch for ${range.start.toString(16)}: expected ${range.script} got ${scriptName}`,
        );
      }
    }
  });

  api.test("ScriptExtensions sample mappings", async () => {
    const { SCRIPT_NAMES, scriptExtAt } = await importTextfacts();
    const text = await readSpecFile("specs/unicode/17.0.0/ucd/ScriptExtensions.txt");
    const aliasText = await readSpecFile("specs/unicode/17.0.0/ucd/PropertyValueAliases.txt");
    const aliasMap = parseScriptAliasFile(aliasText);
    const ranges = parseScriptExtensionsFile(text, aliasMap);
    const sample = ranges.filter((range) => range.scripts.length > 1).slice(0, 30);
    for (const range of sample) {
      const scripts: string[] = scriptExtAt(range.start).map(
        (id: number) => SCRIPT_NAMES[id] ?? "Unknown",
      );
      for (const expected of range.scripts) {
        if (!scripts.includes(expected)) {
          throw new Error(
            `ScriptExtensions mismatch for ${range.start.toString(16)}: expected ${expected} in ${scripts.join(",")}`,
          );
        }
      }
    }
  });

  api.test("Confusable skeleton sample mappings", async () => {
    const { confusableSkeleton } = await importTextfacts();
    const text = await readSpecFile("specs/unicode/17.0.0/security/confusables.txt");
    const entries = parseConfusablesFile(text);
    const sample = entries.filter((_, index) => index % 103 === 0).slice(0, 40);
    for (const entry of sample) {
      const source = String.fromCodePoint(entry.source);
      const expected = String.fromCodePoint(...entry.target);
      const actual = confusableSkeleton(source, { normalization: "none", caseFold: false });
      if (actual !== expected) {
        throw new Error(
          `Confusable mismatch for ${entry.source.toString(16)}: expected ${expected} got ${actual}`,
        );
      }
    }
  });

  api.test("Identifier status/type sample mappings", async () => {
    const { identifierStatusAt, identifierTypeListAt } = await importTextfacts();
    const statusText = await readSpecFile("specs/unicode/17.0.0/security/IdentifierStatus.txt");
    const statusEntries = parseIdentifierStatusFile(statusText);
    const statusSample = statusEntries.filter((_, index) => index % 199 === 0).slice(0, 30);
    for (const entry of statusSample) {
      const actual = identifierStatusAt(entry.start);
      if (actual !== entry.status) {
        throw new Error(
          `IdentifierStatus mismatch for ${entry.start.toString(16)}: expected ${entry.status} got ${actual}`,
        );
      }
    }

    const typeText = await readSpecFile("specs/unicode/17.0.0/security/IdentifierType.txt");
    const typeEntries = parseIdentifierTypeFile(typeText);
    const typeSample = typeEntries.filter((_, index) => index % 223 === 0).slice(0, 30);
    for (const entry of typeSample) {
      const actual = identifierTypeListAt(entry.start);
      const actualSorted = [...actual].sort();
      const expectedSorted = [...entry.types].sort();
      if (!arrayEqualString(actualSorted, expectedSorted)) {
        throw new Error(
          `IdentifierType mismatch for ${entry.start.toString(16)}: expected ${expectedSorted.join(
            "|",
          )} got ${actualSorted.join("|")}`,
        );
      }
    }
  });

  api.test("VariantIndex deterministic ordering", async () => {
    const { buildVariantIndex } = await importTextfacts();
    const result = buildVariantIndex("Alpha alpha Αlpha", {
      tokenizer: "uax29-word",
      canonicalKey: "nfkcCaseFold",
      wordFilter: "word-like",
      maxExamplesPerVariant: 2,
      maxVariants: 10,
    });
    api.assertOk(result.variants.length > 0);
    api.assertEqual(result.variants[0]?.key, "alpha");
  });

  api.test("Well-formed Unicode detection", async () => {
    const { isWellFormedUnicode, scanLoneSurrogates, toWellFormedUnicode } =
      await importTextfacts();
    const valid = "A\uD83D\uDE00B";
    const invalid = "A\uD800B\uDC00C";
    api.assertOk(isWellFormedUnicode(valid));
    api.assertOk(!isWellFormedUnicode(invalid));

    const findings = scanLoneSurrogates(invalid);
    api.assertEqual(findings.length, 2);
    api.assertEqual(findings[0]?.span.startCU, 1);
    api.assertEqual(findings[0]?.kind, "high");
    api.assertEqual(findings[1]?.span.startCU, 3);
    api.assertEqual(findings[1]?.kind, "low");

    api.assertEqual(toWellFormedUnicode(invalid), "A\uFFFDB\uFFFDC");

    const stringProto = String.prototype as {
      isWellFormed?: (this: string) => boolean;
      toWellFormed?: (this: string) => string;
    };
    if (typeof stringProto.isWellFormed === "function") {
      api.assertEqual(stringProto.isWellFormed.call(valid), isWellFormedUnicode(valid));
      api.assertEqual(stringProto.isWellFormed.call(invalid), isWellFormedUnicode(invalid));
    }
    if (typeof stringProto.toWellFormed === "function") {
      api.assertEqual(stringProto.toWellFormed.call(valid), toWellFormedUnicode(valid));
      api.assertEqual(stringProto.toWellFormed.call(invalid), toWellFormedUnicode(invalid));
    }
  });

  api.test("Integrity scanners capture expected kinds", async () => {
    const { iterIntegrityFindings, scanIntegrityFindings } = await importTextfacts();
    const text = "A\u200D\u2060\u202E\uFE0F\uFDD0B";
    const findings = scanIntegrityFindings(text);

    api.assertOk(findings.some((f) => f.kind === "join-control" && f.codePoint === 0x200d));
    api.assertOk(findings.some((f) => f.kind === "default-ignorable" && f.codePoint === 0x2060));
    api.assertOk(findings.some((f) => f.kind === "bidi-control" && f.codePoint === 0x202e));
    api.assertOk(findings.some((f) => f.kind === "variation-selector" && f.codePoint === 0xfe0f));
    api.assertOk(findings.some((f) => f.kind === "noncharacter" && f.codePoint === 0xfdd0));

    const filtered = scanIntegrityFindings(text, { include: ["bidi-control", "noncharacter"] });
    api.assertEqual(filtered.length, 2);

    const limited = Array.from(iterIntegrityFindings(text, { maxFindings: 2 }));
    api.assertEqual(limited.length, 2);
  });

  api.test("JCS canonicalization sample matches RFC 8785", async () => {
    const { jcsCanonicalize } = await importTextfacts();
    const value = {
      numbers: [Number("333333333.33333329"), 1e30, 4.5, 2e-3, 0.000000000000000000000000001],
      string: '€$\u000f\nA\'B"\\\\"/',
      literals: [null, true, false],
    };
    const expected =
      '{"literals":[null,true,false],"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27],"string":"€$\\u000f\\nA\'B\\"\\\\\\\\\\"/"}';
    api.assertEqual(jcsCanonicalize(value), expected);
  });

  api.test("JCS key sorting uses UTF-16 code unit order", async () => {
    const { jcsCanonicalize } = await importTextfacts();
    const value = { a: 1, "a\u0000": 2, aa: 3 } as const;
    const expected = '{"a":1,"a\\u0000":2,"aa":3}';
    api.assertEqual(jcsCanonicalize(value), expected);
  });

  api.test("JCS rejects lone surrogates and noncharacters", async () => {
    const { jcsCanonicalize, TextfactsError } = await importTextfacts();
    let threw = false;
    try {
      jcsCanonicalize({ bad: "\uD800" });
    } catch (err) {
      threw = true;
      api.assertOk(err instanceof TextfactsError);
      api.assertEqual(getErrorCode(err), "JCS_LONE_SURROGATE");
    }
    api.assertOk(threw);

    threw = false;
    try {
      jcsCanonicalize({ bad: "\uFDD0" });
    } catch (err) {
      threw = true;
      api.assertOk(err instanceof TextfactsError);
      api.assertEqual(getErrorCode(err), "JCS_NONCHARACTER");
    }
    api.assertOk(threw);
  });

  api.test("JCS SHA-256 stable vector", async () => {
    const { jcsSha256Hex } = await importTextfacts();
    const value = { a: 1, b: [true, false, null] } as const;
    const digest = await jcsSha256Hex(value);
    api.assertEqual(
      digest,
      "sha256:39c40f48225c0bda582175eb3e5f00cc9e58928b59b1cd3d6385276cca4da0d5",
    );
  });

  api.test("FNV1a64 UTF-16 golden vectors", async () => {
    const { fnv1a64Utf16, formatU64Hex } = await importTextfacts();
    const cases: Array<[string, string]> = [
      ["", "cbf29ce484222325"],
      ["a", "089be207b544f1e4"],
      ["abc", "cec64e155111225d"],
      ["hello", "32964f71b2764b97"],
      ["😀", "f39a100fb654058a"],
    ];
    for (const [input, expected] of cases) {
      const hash = formatU64Hex(fnv1a64Utf16(input));
      api.assertEqual(hash, expected);
    }
  });

  api.test("XXH64 UTF-8 golden vectors", async () => {
    const { hash64Text, formatU64Hex } = await importTextfacts();
    const cases: Array<[string, string]> = [
      ["", "ef46db3751d8e999"],
      ["a", "d24ec4f1a98c6e5b"],
      ["abc", "44bc2cf5ad770999"],
      ["hello", "26c7827d889f6da3"],
    ];
    for (const [input, expected] of cases) {
      const hash = formatU64Hex(hash64Text(input, { algo: "xxh64-utf8" }));
      api.assertEqual(hash, expected);
    }
  });

  api.test("hash128 composite is stable and distinct", async () => {
    const { hash128Text, formatHash128Hex } = await importTextfacts();
    const value = "collision probe";
    const hash = formatHash128Hex(
      hash128Text(value, { left: "fnv1a64-utf16le", right: "xxh64-utf8" }),
    );
    api.assertEqual(hash, "fd8855f76810c1b123ffca9476905efe");
  });

  api.test("parseHash128Hex roundtrips", async () => {
    const { formatHash128Hex, parseHash128Hex } = await importTextfacts();
    const original: [bigint, bigint] = [0x0123456789abcdefn, 0xfedcba9876543210n];
    const hex = formatHash128Hex(original);
    const parsed = parseHash128Hex(hex);
    api.assertDeepEqual(parsed, original);
  });

  api.test("FNV collision pairs reproduce and composite avoids", async () => {
    const { hash64Text, hash64Bytes, hash128Text, formatHash128Hex } = await importTextfacts();
    const collisionInputLeft = "8yn0iYCKYHlIj4-BwPqk";
    const collisionInputRight = "GReLUrM4wMqfg9yzV3KQ";
    const hashA = hash64Text(collisionInputLeft, { algo: "fnv1a64-utf8" });
    const hashB = hash64Text(collisionInputRight, { algo: "fnv1a64-utf8" });
    api.assertEqual(hashA, hashB);

    const bytesA = asciiBytes("A\xffK6sjsNNczPl");
    const bytesB = asciiBytes("A\xffcswpLMIZpwt");
    const byteHashA = hash64Bytes(bytesA, { algo: "fnv1a64-bytes" });
    const byteHashB = hash64Bytes(bytesB, { algo: "fnv1a64-bytes" });
    api.assertEqual(byteHashA, byteHashB);

    const compositeA = formatHash128Hex(
      hash128Text(collisionInputLeft, { left: "fnv1a64-utf16le", right: "xxh64-utf8" }),
    );
    const compositeB = formatHash128Hex(
      hash128Text(collisionInputRight, { left: "fnv1a64-utf16le", right: "xxh64-utf8" }),
    );
    api.assertOk(compositeA !== compositeB);
  });

  api.test("parseU64Hex validates input", async () => {
    const { parseU64Hex, TextfactsError } = await importTextfacts();
    api.assertEqual(parseU64Hex("0000000000000000"), 0n);
    let threw = false;
    try {
      parseU64Hex("not-hex");
    } catch (err) {
      threw = true;
      api.assertOk(err instanceof TextfactsError);
    }
    api.assertOk(threw);
  });

  api.test("custom tokenizer failures are machine-readable", async () => {
    const { scanTokens, buildVariantIndex, TextfactsError } = await importTextfacts();
    let threw = false;
    try {
      [...scanTokens("abc", { tokenizer: "custom" })];
    } catch (err) {
      threw = true;
      api.assertOk(err instanceof TextfactsError);
      api.assertEqual(getErrorCode(err), "CUSTOM_TOKENIZER_REQUIRED");
    }
    api.assertOk(threw);

    threw = false;
    try {
      buildVariantIndex("abc", { tokenizer: "custom", canonicalKey: "raw" });
    } catch (err) {
      threw = true;
      api.assertOk(err instanceof TextfactsError);
      api.assertEqual(getErrorCode(err), "CUSTOM_TOKENIZER_REQUIRED");
    }
    api.assertOk(threw);
  });

  api.test("PBT segmentation invariants", async () => {
    const { segmentGraphemes, segmentWordsUAX29, segmentSentencesUAX29, toArray } =
      await importTextfacts();
    const evalSegmenterInvariants = (
      name: string,
      segmenter: (text: string) => Iterable<{ startCU: number; endCU: number }>,
    ) => {
      evalProperty({
        name,
        seed: pbtSeedFor(name),
        runs: pbtRuns,
        gen: genFuzzString,
        property: (text) => {
          const spans = toArray(segmenter(text));
          const spans2 = [...segmenter(text)];
          if (spans.length !== spans2.length) return false;
          for (let index = 0; index < spans.length; index += 1) {
            const spanA = spans[index];
            const spanB = spans2[index];
            if (!spanA || !spanB) return false;
            if (spanA.startCU !== spanB.startCU || spanA.endCU !== spanB.endCU) return false;
          }
          if (text.length === 0) return spans.length === 0;
          let prevEnd = 0;
          for (const span of spans) {
            if (span.startCU !== prevEnd) return false;
            if (span.endCU <= span.startCU) return false;
            if (span.endCU > text.length) return false;
            prevEnd = span.endCU;
          }
          return prevEnd === text.length;
        },
      });
    };
    evalSegmenterInvariants("pbt:grapheme", segmentGraphemes);
    evalSegmenterInvariants("pbt:word", segmentWordsUAX29);
    evalSegmenterInvariants("pbt:sentence", segmentSentencesUAX29);
  });

  api.test("PBT normalization invariants", async () => {
    const { normalize, isNormalized, isWellFormedUnicode } = await importTextfacts();
    const forms = ["NFC", "NFD", "NFKC", "NFKD"] as const;
    for (const form of forms) {
      const name = `pbt:normalize:${form}`;
      evalProperty({
        name,
        seed: pbtSeedFor(name),
        runs: pbtRuns,
        gen: genFuzzString,
        property: (text) => {
          const out = normalize(text, form);
          if (normalize(out, form) !== out) return false;
          if (isNormalized(text, form) && out !== text) return false;
          if (isWellFormedUnicode(text) && !isWellFormedUnicode(out)) return false;
          return true;
        },
      });
    }
  });

  api.test("PBT integrity invariants", async () => {
    const { isWellFormedUnicode, scanLoneSurrogates, toWellFormedUnicode, scanIntegrityFindings } =
      await importTextfacts();
    const name = "pbt:integrity";
    evalProperty({
      name,
      seed: pbtSeedFor(name),
      runs: pbtRuns,
      gen: genFuzzString,
      property: (text) => {
        const lone = scanLoneSurrogates(text);
        if (isWellFormedUnicode(text) !== (lone.length === 0)) return false;
        const fixed = toWellFormedUnicode(text);
        if (!isWellFormedUnicode(fixed)) return false;
        const findings = scanIntegrityFindings(text);
        const loneFindings = findings.filter((finding) => finding.kind === "lone-surrogate");
        return loneFindings.length === lone.length;
      },
    });
  });

  api.test("PBT confusables + script invariants", async () => {
    const {
      confusableSkeleton,
      isConfusable,
      hasMixedScriptToken,
      nfkcCaseFold,
      toWellFormedUnicode,
      isWellFormedUnicode,
    } = await importTextfacts();
    const name = "pbt:confusables";
    evalProperty({
      name,
      seed: pbtSeedFor(name),
      runs: pbtRuns,
      gen: genFuzzString,
      property: (text) => {
        const safe = toWellFormedUnicode(text);
        const skeleton = confusableSkeleton(safe);
        if (!isWellFormedUnicode(skeleton)) return false;
        if (confusableSkeleton(safe) !== skeleton) return false;
        const other = Array.from(safe).reverse().join("");
        if (isConfusable(safe, other) && confusableSkeleton(safe) !== confusableSkeleton(other)) {
          return false;
        }
        const key = nfkcCaseFold(safe);
        if (key === safe && hasMixedScriptToken(safe) !== hasMixedScriptToken(key)) return false;
        if (hasMixedScriptToken(key) !== hasMixedScriptToken(nfkcCaseFold(key))) return false;
        return true;
      },
    });
  });

  api.test("PBT collation invariants", async () => {
    const { ucaCompare, ucaSortKeyBytes } = await importTextfacts();
    const name = "pbt:collation";
    const opts = {
      alternate: "non-ignorable",
      includeIdenticalLevel: true,
      illFormed: "implicit",
    } as const;
    const compareBytes = (leftBytes: Uint8Array, rightBytes: Uint8Array) => {
      const len = Math.min(leftBytes.length, rightBytes.length);
      for (let index = 0; index < len; index += 1) {
        const diff = (leftBytes[index] ?? 0) - (rightBytes[index] ?? 0);
        if (diff < 0) return -1;
        if (diff > 0) return 1;
      }
      if (leftBytes.length === rightBytes.length) return 0;
      return leftBytes.length < rightBytes.length ? -1 : 1;
    };
    evalProperty({
      name,
      seed: pbtSeedFor(name),
      runs: Math.max(30, Math.floor(pbtRuns / 2)),
      gen: (rng, size) => ({
        textLeft: genFuzzString(rng, size),
        textRight: genFuzzString(rng, size),
        textThird: genFuzzString(rng, size),
      }),
      property: ({ textLeft, textRight, textThird }) => {
        if (ucaCompare(textLeft, textLeft, opts) !== 0) return false;
        const compareLeftRight = ucaCompare(textLeft, textRight, opts);
        const compareRightLeft = ucaCompare(textRight, textLeft, opts);
        if (
          compareLeftRight !== 0 &&
          compareRightLeft !== 0 &&
          compareLeftRight !== -compareRightLeft
        ) {
          return false;
        }
        const compareRightThird = ucaCompare(textRight, textThird, opts);
        if (
          compareLeftRight < 0 &&
          compareRightThird < 0 &&
          ucaCompare(textLeft, textThird, opts) >= 0
        ) {
          return false;
        }
        if (
          compareLeftRight > 0 &&
          compareRightThird > 0 &&
          ucaCompare(textLeft, textThird, opts) <= 0
        ) {
          return false;
        }
        const keyA = ucaSortKeyBytes(textLeft, opts);
        const keyB = ucaSortKeyBytes(textRight, opts);
        const cmpKey = compareBytes(keyA, keyB);
        if (compareLeftRight !== cmpKey) return false;
        return true;
      },
    });
  });

  api.test("PBT integration invariants", async () => {
    const { jcsCanonicalize, segmentWordsUAX29, toWellFormedUnicode } = await importTextfacts();
    const name = "pbt:integration";
    evalProperty({
      name,
      seed: pbtSeedFor(name),
      runs: pbtRuns,
      gen: genWellFormed,
      property: (text) => {
        const spans = [...segmentWordsUAX29(text)];
        for (const span of spans) {
          if (span.startCU < 0 || span.endCU > text.length || span.endCU <= span.startCU) {
            return false;
          }
        }
        const safe = toWellFormedUnicode(text);
        jcsCanonicalize({ value: safe });
        return true;
      },
    });
  });

  api.test("Unicode version guard", async () => {
    const { UNICODE_VERSION } = await importTextfacts();
    const versionFile = await readSpecFile("src/unicode/version.ts");
    const matches = Array.from(versionFile.matchAll(/UNICODE_VERSION\s*=\s*"([0-9.]+)"/g));
    api.assertEqual(matches.length, 1);
    const pinned = matches[0]?.[1] ?? UNICODE_VERSION;
    api.assertEqual(UNICODE_VERSION, pinned);
    const specHtml = `specs/unicode/Unicode${pinned}.html`;
    const specTxt = `specs/unicode/Unicode${pinned}.txt`;
    try {
      await readSpecFile(specHtml);
    } catch {
      await readSpecFile(specTxt);
    }
    await readSpecFile(`testdata/unicode/${pinned}/auxiliary/GraphemeBreakTest.txt`);
  });
}

async function readSpecFile(relativePath: string): Promise<string> {
  const root = getRepoRootUrl();
  const fileUrl = new URL(relativePath, root);
  return await readTextFile(fileUrl);
}

interface CaseFoldEntry {
  codePoint: number;
  mapping: number[];
}

function parseCaseFoldingFile(text: string): CaseFoldEntry[] {
  const entries: CaseFoldEntry[] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const cleaned = line.split("#")[0]?.trim();
    if (!cleaned) continue;
    const parts = cleaned.split(";").map((part) => part.trim());
    if (parts.length < 3) continue;
    const status = parts[1];
    if (status !== "C" && status !== "F") continue;
    const codePoint = Number.parseInt(parts[0] ?? "", 16);
    const mapping = (parts[2] ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .map((hex) => Number.parseInt(hex, 16));
    if (!Number.isFinite(codePoint) || mapping.length === 0) continue;
    entries.push({ codePoint, mapping });
  }
  return entries;
}

interface ScriptRange {
  start: number;
  end: number;
  script: string;
}

function parseScriptFile(text: string): ScriptRange[] {
  const ranges: ScriptRange[] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const cleaned = line.split("#")[0]?.trim();
    if (!cleaned) continue;
    const match = cleaned.match(/^([0-9A-Fa-f]+)(?:\.\.([0-9A-Fa-f]+))?\s*;\s*(\w+)/);
    if (!match) continue;
    const start = Number.parseInt(match[1], 16);
    const end = match[2] ? Number.parseInt(match[2], 16) : start;
    const script = match[3];
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    ranges.push({ start, end, script });
  }
  return ranges;
}

interface ScriptExtensionRange {
  start: number;
  end: number;
  scripts: string[];
}

function parseScriptAliasFile(text: string): Map<string, string> {
  const map = new Map<string, string>();
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const cleaned = line.split("#")[0]?.trim();
    if (!cleaned) continue;
    const parts = cleaned
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length < 3 || parts[0] !== "sc") continue;
    const shortName = parts[1] ?? "";
    const longName = parts[2] ?? "";
    if (!shortName || !longName) continue;
    for (const alias of parts.slice(1)) {
      map.set(alias, longName);
    }
    map.set(shortName, longName);
    map.set(longName, longName);
  }
  return map;
}

function parseScriptExtensionsFile(
  text: string,
  aliasMap?: Map<string, string>,
): ScriptExtensionRange[] {
  const ranges: ScriptExtensionRange[] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const cleaned = line.split("#")[0]?.trim();
    if (!cleaned) continue;
    const match = cleaned.match(/^([0-9A-Fa-f]+)(?:\.\.([0-9A-Fa-f]+))?\s*;\s*(.+)$/);
    if (!match) continue;
    const start = Number.parseInt(match[1], 16);
    const end = match[2] ? Number.parseInt(match[2], 16) : start;
    const scripts = match[3]
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((name) => aliasMap?.get(name) ?? name);
    if (!Number.isFinite(start) || !Number.isFinite(end) || scripts.length === 0) continue;
    ranges.push({ start, end, scripts });
  }
  return ranges;
}

interface TokenizationSbdSliceManifest {
  slices: TokenizationSbdSlice[];
}

interface TokenizationSbdSlice {
  id: string;
  source: TokenizationSbdSource;
}

type TokenizationSbdSource =
  | { kind: "text"; text: string }
  | { kind: "utf16-code-units"; units: string[] };

interface TokenizationSbdExpectedOutput {
  tokens: TokenizationSbdExpectedAnnotation[];
  sentences: TokenizationSbdExpectedAnnotation[];
}

interface TokenizationSbdExpectedAnnotation {
  id: string;
  kind: "uax29-word-boundary-token" | "uax29-sentence";
  startCU: number;
  endCU: number;
  text: string;
}

function materializeTokenizationSbdSource(source: TokenizationSbdSource): string {
  if (source.kind === "text") return source.text;
  return String.fromCharCode(...source.units.map((unit) => Number.parseInt(unit, 16)));
}

function projectSpanAnnotations(
  text: string,
  spans: Array<{ startCU: number; endCU: number }>,
  kind: TokenizationSbdExpectedAnnotation["kind"],
  prefix: "token" | "sentence",
): TokenizationSbdExpectedAnnotation[] {
  return spans.map((span, index) => ({
    id: `${prefix}-${index + 1}`,
    kind,
    startCU: span.startCU,
    endCU: span.endCU,
    text: text.slice(span.startCU, span.endCU),
  }));
}

interface ConfusableEntry {
  source: number;
  target: number[];
}

function parseConfusablesFile(text: string): ConfusableEntry[] {
  const entries: ConfusableEntry[] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const cleaned = line.split("#")[0]?.trim();
    if (!cleaned) continue;
    const parts = cleaned.split(";").map((part) => part.trim());
    if (parts.length < 2) continue;
    const source = Number.parseInt(parts[0] ?? "", 16);
    const target = (parts[1] ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .map((hex) => Number.parseInt(hex, 16));
    if (!Number.isFinite(source) || target.length === 0) continue;
    entries.push({ source, target });
  }
  return entries;
}

interface IdentifierStatusRange {
  start: number;
  status: string;
}

function parseIdentifierStatusFile(text: string): IdentifierStatusRange[] {
  const entries: IdentifierStatusRange[] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const cleaned = line.split("#")[0]?.trim();
    if (!cleaned) continue;
    const match = cleaned.match(/^([0-9A-Fa-f]+)(?:\.\.([0-9A-Fa-f]+))?\s*;\s*(\w+)/);
    if (!match) continue;
    const start = Number.parseInt(match[1], 16);
    const status = match[3];
    if (!Number.isFinite(start)) continue;
    entries.push({ start, status });
  }
  return entries;
}

interface IdentifierTypeRange {
  start: number;
  types: string[];
}

function parseIdentifierTypeFile(text: string): IdentifierTypeRange[] {
  const entries: IdentifierTypeRange[] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const cleaned = line.split("#")[0]?.trim();
    if (!cleaned) continue;
    const match = cleaned.match(/^([0-9A-Fa-f]+)(?:\.\.([0-9A-Fa-f]+))?\s*;\s*(.+)$/);
    if (!match) continue;
    const start = Number.parseInt(match[1], 16);
    const types = match[3].trim().split(/\s+/).filter(Boolean);
    if (!Number.isFinite(start) || types.length === 0) continue;
    entries.push({ start, types });
  }
  return entries;
}

function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const maybe = error as { code?: unknown };
  return typeof maybe.code === "string" ? maybe.code : undefined;
}

function arrayEqual(leftValues: number[], rightValues: number[]): boolean {
  if (leftValues.length !== rightValues.length) return false;
  for (let index = 0; index < leftValues.length; index += 1) {
    if (leftValues[index] !== rightValues[index]) return false;
  }
  return true;
}

function arrayEqualString(leftValues: string[], rightValues: string[]): boolean {
  if (leftValues.length !== rightValues.length) return false;
  for (let index = 0; index < leftValues.length; index += 1) {
    if (leftValues[index] !== rightValues[index]) return false;
  }
  return true;
}

function arrayEqualNullable(
  leftValues: Array<number | null>,
  rightValues: Array<number | null>,
): boolean {
  if (leftValues.length !== rightValues.length) return false;
  for (let index = 0; index < leftValues.length; index += 1) {
    if (leftValues[index] !== rightValues[index]) return false;
  }
  return true;
}

function asciiBytes(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0xff;
  }
  return bytes;
}

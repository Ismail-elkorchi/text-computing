import { genFuzzString, genWellFormed } from "../_support/genText.ts";
import { evalProperty, getPbtRuns, getPbtSeed } from "../_support/pbt.ts";
import { makeRng } from "../_support/prng.ts";
import { importTextfacts } from "../_support/runtime.ts";

export interface TestApi {
  test: (name: string, fn: () => void | Promise<void>) => void;
  assertEqual: (actual: unknown, expected: unknown, message?: string) => void;
  assertDeepEqual: (actual: unknown, expected: unknown, message?: string) => void;
  assertOk: (value: unknown, message?: string) => void;
}

type AsyncProperty<T> = (value: T) => Promise<boolean | undefined>;

type Generator<T> = (rng: ReturnType<typeof makeRng>, size: number) => T;

async function evalAsyncPropertyRuns<T>(
  name: string,
  seed: string,
  runs: number,
  gen: Generator<T>,
  property: AsyncProperty<T>,
) {
  const rng = makeRng(seed);
  for (let runIndex = 0; runIndex < runs; runIndex += 1) {
    const size = Math.max(4, (runIndex % 64) + 1);
    const value = gen(rng, size);
    const result = await property(value);
    if (result === false) {
      throw new Error(`[PBT] ${name} failed\nseed=${seed} run=${runIndex}`);
    }
  }
}

function compareBytes(leftBytes: Uint8Array, rightBytes: Uint8Array): number {
  const min = Math.min(leftBytes.length, rightBytes.length);
  for (let index = 0; index < min; index += 1) {
    const diff = leftBytes[index] - rightBytes[index];
    if (diff !== 0) return diff;
  }
  return leftBytes.length - rightBytes.length;
}

export function registerMetamorphicTests(api: TestApi): void {
  const runs = getPbtRuns(80);
  const seed = getPbtSeed();
  const seedFor = (name: string) => `${seed}:metamorphic:${name}`;

  api.test("metamorphic: normalization is idempotent", async () => {
    const { normalize, isNormalized, isWellFormedUnicode } = await importTextfacts();
    evalProperty({
      name: "normalize-idempotent",
      seed: seedFor("normalize"),
      runs,
      gen: genFuzzString,
      property: (value) => {
        const normalized = normalize(value, "NFC");
        if (normalize(normalized, "NFC") !== normalized) return false;
        if (isNormalized(value, "NFC") && normalized !== value) return false;
        if (isWellFormedUnicode(value) && !isWellFormedUnicode(normalized)) return false;
      },
    });
  });

  api.test("metamorphic: JCS canonicalization stability", async () => {
    const { jcsCanonicalize, sha256Hex } = await importTextfacts();
    await evalAsyncPropertyRuns(
      "jcs-stable",
      seedFor("jcs"),
      Math.max(10, Math.floor(runs / 2)),
      genWellFormed,
      async (value) => {
        const payload = { a: value, b: [value.length, true] };
        const first = jcsCanonicalize(payload);
        const second = jcsCanonicalize(payload);
        if (first !== second) return false;
        const hashA = await sha256Hex(first);
        const hashB = await sha256Hex(second);
        if (hashA !== hashB) return false;
      },
    );
  });

  api.test("metamorphic: word segmentation spans are stable", async () => {
    const { segmentWordsUAX29, sliceBySpan } = await importTextfacts();
    evalProperty({
      name: "word-segmentation-stable",
      seed: seedFor("word-segmentation"),
      runs,
      gen: genFuzzString,
      property: (value) => {
        const first = [...segmentWordsUAX29(value)];
        const second = [...segmentWordsUAX29(value)];
        if (first.length !== second.length) return false;
        for (let index = 0; index < first.length; index += 1) {
          const left = first[index];
          const right = second[index];
          if (!left || !right) return false;
          if (left.startCU !== right.startCU || left.endCU !== right.endCU) return false;
          if (sliceBySpan(value, left) !== value.slice(left.startCU, left.endCU)) return false;
        }
      },
    });
  });

  api.test("metamorphic: collation compare matches sort keys", async () => {
    const { ucaCompare, ucaSortKeyBytes } = await importTextfacts();
    const options = {
      strength: 3,
      alternate: "non-ignorable",
      normalization: "nfd",
      illFormed: "replace",
      includeIdenticalLevel: true,
    } as const;
    evalProperty({
      name: "uca-compare",
      seed: seedFor("uca"),
      runs,
      gen: (rng, size) => [genWellFormed(rng, size), genWellFormed(rng, size)] as const,
      property: ([a, b]) => {
        const cmp = ucaCompare(a, b, options);
        const keyA = ucaSortKeyBytes(a, options);
        const keyB = ucaSortKeyBytes(b, options);
        const keyCmp = Math.sign(compareBytes(keyA, keyB));
        if (cmp !== keyCmp) return false;
      },
    });
  });
}

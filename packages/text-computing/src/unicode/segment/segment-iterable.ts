import type { Provenance, SegmentIterable, Span } from "../internal/types.ts";

/**
 * createSegmentIterable executes a deterministic operation in this module.
 */
export function createSegmentIterable(
  generate: () => Iterable<Span>,
  provenance: Provenance,
): SegmentIterable {
  return {
    provenance,
    [Symbol.iterator]: () => generate()[Symbol.iterator](),
  };
}

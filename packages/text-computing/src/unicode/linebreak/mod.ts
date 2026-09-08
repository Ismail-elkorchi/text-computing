import {
  lineBreakOpportunities as lineBreakOpportunitiesImpl,
  type LineBreakOptions,
  type LineBreakOpportunity,
} from "./linebreak.ts";

export type { LineBreakOpportunity, LineBreakOptions };

export function lineBreakOpportunities(
  text: string,
  options: LineBreakOptions = {},
): Iterable<LineBreakOpportunity> {
  return lineBreakOpportunitiesImpl(text, options);
}

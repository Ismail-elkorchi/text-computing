#!/usr/bin/env node

import { performance } from "node:perf_hooks";

const [languageTag, preset] = process.argv.slice(2);
if (
	!(
		["ar", "en", "fr"].includes(languageTag) &&
		["core", "lookup"].includes(preset)
	)
) {
	throw new TypeError("usage: nlp-cold-worker.mjs <ar|en|fr> <core|lookup>");
}

const startedAt = performance.now();
const [{ createNodeResourceReader, load }, packModule] = await Promise.all([
	import("@ismail-elkorchi/text-computing/node"),
	import(`@ismail-elkorchi/textpack-${languageTag}`),
]);
const texts = {
	en: "Dr. Smith’s rapidly-growing start-up reopened its Paris office in 2026.",
	fr: "Aujourd’hui, l’équipe rouvre son bureau parisien et reconnaît ses réussites.",
	ar: "هذا نص عربي واضح، وتعمل الشركة في باريس وتراجع الكتب الجديدة.",
};
const nlp = await load(packModule.default, {
	reader: createNodeResourceReader(),
});
const analysis = await nlp(texts[languageTag], { preset });
if (analysis.tokens.length === 0)
	throw new Error("cold benchmark produced no tokens");

process.stdout.write(
	`${JSON.stringify({
		languageTag,
		preset,
		durationMs: performance.now() - startedAt,
		maxRssMiB: process.resourceUsage().maxRSS / 1024,
		tokenCount: analysis.tokens.length,
		morphologyCount: analysis.morphology.length,
	})}\n`,
);

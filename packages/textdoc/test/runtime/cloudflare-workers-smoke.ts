import {
	createDocument,
	fromTextDocJson,
	toTextDocJson,
} from "../../src/mod.ts";

if (typeof process !== "undefined") {
	throw new Error("Cloudflare Workers smoke must not rely on process");
}

if (typeof Buffer !== "undefined") {
	throw new Error("Cloudflare Workers smoke must not rely on Buffer");
}

const doc = createDocument("Workers text", { id: "doc:workers" });
const roundTrip = fromTextDocJson(toTextDocJson(doc));

if (roundTrip.views.raw?.text !== "Workers text") {
	throw new Error("Workers round-trip mismatch");
}

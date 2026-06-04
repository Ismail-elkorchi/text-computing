import { trainNgramLanguageModel } from "../../dist/index.js";

const model = trainNgramLanguageModel([{ tokens: ["worker", "ok"] }], {
	order: 2,
	smoothing: "stupid-backoff",
});

if (model.smoothing !== "stupid-backoff") {
	throw new Error("workers smoke failed");
}

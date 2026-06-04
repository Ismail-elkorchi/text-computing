import { trainNgramLanguageModel } from "../../dist/index.js";

Deno.test("textclassical deno smoke", () => {
	const model = trainNgramLanguageModel([{ tokens: ["a", "b"] }], {
		order: 2,
		smoothing: "laplace",
	});

	if (model.order !== 2) {
		throw new Error("deno smoke failed");
	}
});

import { assertEquals } from "jsr:@std/assert";
import {
	readDataset,
	streamRecords,
} from "@ismail-elkorchi/text-computing/data";

Deno.test("deno imports textdata", async () => {
	const dataset = await readDataset(
		{ kind: "plain-text", text: "deno" },
		{ id: "deno" },
	);
	const iterator = streamRecords(dataset)[Symbol.asyncIterator]();
	const first = await iterator.next();
	assertEquals(first.value.text, "deno");
});

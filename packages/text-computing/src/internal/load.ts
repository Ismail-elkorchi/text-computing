import { loadPack } from "@ismail-elkorchi/textpack";
import { createTextComputingNlp } from "./runtime.js";
import { inspectionReport, supportReport } from "./support.js";
import type {
	TextComputingAnalyzeOptions,
	TextComputingDocument,
	TextComputingLoadOptions,
	TextComputingLoadTarget,
	TextComputingNlp,
	TextComputingPackInspection,
	TextComputingSupportReport,
} from "./types.js";

export async function packFromTarget(target: TextComputingLoadTarget) {
	return loadPack(target);
}

export async function load(
	target: TextComputingLoadTarget,
	options: TextComputingLoadOptions = {},
): Promise<TextComputingNlp> {
	return createTextComputingNlp(await packFromTarget(target), options.reader);
}

export async function analyze(
	text: string,
	options: TextComputingAnalyzeOptions,
): Promise<TextComputingDocument> {
	const { pack, reader, ...analysisOptions } = options;
	const loadOptions = reader === undefined ? {} : { reader };
	return (await load(pack, loadOptions))(text, analysisOptions);
}

export async function support(
	target: TextComputingLoadTarget,
): Promise<TextComputingSupportReport> {
	return supportReport(await packFromTarget(target));
}

export async function inspect(
	target: TextComputingLoadTarget,
): Promise<TextComputingPackInspection> {
	return inspectionReport(await packFromTarget(target));
}

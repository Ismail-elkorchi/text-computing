import { loadPack } from "../packs/index.ts";
import { createTextComputingNlp } from "./runtime.ts";
import { inspectionReport, supportReport } from "./support.ts";
import type {
	AnalyzedDocument,
	TextComputingAnalyzeOptions,
	TextComputingLoadOptions,
	TextComputingLoadTarget,
	TextComputingNlp,
	TextComputingPackInspection,
	TextComputingSupportReport,
} from "./types.ts";

export async function packFromTarget(target: TextComputingLoadTarget) {
	return loadPack(target);
}

export async function load(
	target: TextComputingLoadTarget,
	options: TextComputingLoadOptions = {},
): Promise<TextComputingNlp> {
	return createTextComputingNlp(await packFromTarget(target), options);
}

export async function analyze(
	text: string,
	options: TextComputingAnalyzeOptions,
): Promise<AnalyzedDocument> {
	const { pack, reader, artifactReader, entityExecutor, ...analysisOptions } =
		options;
	const loadOptions = {
		...(reader === undefined ? {} : { reader }),
		...(artifactReader === undefined ? {} : { artifactReader }),
		...(entityExecutor === undefined ? {} : { entityExecutor }),
	};
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

import {
	addLayer,
	createDocument,
	type TextDocument,
} from "@ismail-elkorchi/textdoc";
import type { AnnotationLayer } from "@ismail-elkorchi/textdoc/layer";
import type {
	ProcessorOutput,
	ProcessorRequirement,
	TextProcessor,
} from "../../src/index.js";

export function createFinalDocument(text = "alpha beta"): TextDocument {
	return createDocument(text, { id: "doc" });
}

export function identityProcessor(
	id: string,
	options: {
		readonly requires?: readonly ProcessorRequirement[];
		readonly provides?: readonly ProcessorOutput[];
	} = {},
): TextProcessor {
	return {
		id,
		version: "1.0.0",
		...(options.requires === undefined ? {} : { requires: options.requires }),
		provides: options.provides ?? [{ viewKind: "raw" }],
		process(document) {
			return document;
		},
	};
}

export function layerProcessor(layerId: string): TextProcessor {
	return {
		id: `layer:${layerId}`,
		version: "1.0.0",
		provides: [{ layer: layerId }],
		process(document) {
			const layer: AnnotationLayer = {
				id: layerId,
				type: layerId,
				annotations: {},
			};
			return addLayer(document, layer);
		},
	};
}

export function dependentProcessor(
	id: string,
	layerId: string,
	outputLayer: string,
): TextProcessor {
	return {
		id,
		version: "1.0.0",
		requires: [{ layer: layerId }],
		provides: [{ layer: outputLayer }],
		process(document) {
			const layer: AnnotationLayer = {
				id: outputLayer,
				type: outputLayer,
				annotations: {},
			};
			return addLayer(document, layer);
		},
	};
}

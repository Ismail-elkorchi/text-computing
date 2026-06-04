export interface OcrConfidence {
	readonly sourceStart: number;
	readonly sourceEnd: number;
	readonly value: number;
}

export function validateOcrConfidence(
	confidence: OcrConfidence,
): OcrConfidence {
	if (
		!Number.isInteger(confidence.sourceStart) ||
		!Number.isInteger(confidence.sourceEnd) ||
		confidence.sourceStart < 0 ||
		confidence.sourceEnd < confidence.sourceStart ||
		!Number.isFinite(confidence.value) ||
		confidence.value < 0 ||
		confidence.value > 1
	) {
		throw new TypeError(
			"OCR confidence must use valid spans and a value between 0 and 1.",
		);
	}
	return Object.freeze(confidence);
}

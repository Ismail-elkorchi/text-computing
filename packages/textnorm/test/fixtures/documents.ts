import { createDocument } from "@ismail-elkorchi/textdoc";

export const spellingDocument = createDocument("ye olde shoppe", {
	id: "spelling-doc",
});

export const noisyDocument = createDocument("Soooo GOOD\r\nline-\nbreak", {
	id: "noisy-doc",
});

export const ocrDocument = createDocument("rnodem", {
	id: "ocr-doc",
});

export const transliterationDocument = createDocument("salam", {
	id: "translit-doc",
});

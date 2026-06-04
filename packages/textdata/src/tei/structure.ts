import type { XmlElementSpan } from "../internal/xml.js";

export function structuralType(name: string): string {
	const normalized = name.toLowerCase();
	if (normalized === "p") return "structure.paragraph";
	if (/^h[1-6]$/.test(normalized) || normalized === "head") {
		return "structure.heading";
	}
	if (normalized === "note") return "structure.note";
	if (normalized === "div") return "structure.division";
	if (normalized === "table") return "structure.table";
	if (normalized === "row" || normalized === "tr") return "structure.row";
	if (normalized === "cell" || normalized === "td" || normalized === "th") {
		return "structure.cell";
	}
	if (normalized === "a" || normalized === "ref") return "structure.link";
	return `structure.${normalized}`;
}

export function structuralElements(
	elements: readonly XmlElementSpan[],
): readonly XmlElementSpan[] {
	return elements.filter((element) => element.end >= element.start);
}

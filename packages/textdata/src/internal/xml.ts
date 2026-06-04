import { fail } from "./errors.js";

export interface XmlElementSpan {
	readonly name: string;
	readonly start: number;
	readonly end: number;
	readonly attributes: Readonly<Record<string, string>>;
}

export interface XmlExtractResult {
	readonly text: string;
	readonly elements: readonly XmlElementSpan[];
	readonly metadata: Readonly<Record<string, string>>;
}

function decodeEntities(text: string): string {
	return text.replace(/&(lt|gt|amp|quot|apos);/g, (_match, entity: string) => {
		if (entity === "lt") return "<";
		if (entity === "gt") return ">";
		if (entity === "amp") return "&";
		if (entity === "quot") return '"';
		return "'";
	});
}

function parseAttributes(text: string): Readonly<Record<string, string>> {
	const attrs: Record<string, string> = {};
	const pattern = /([A-Za-z_:][A-Za-z0-9_.:-]*)\s*=\s*("[^"]*"|'[^']*')/g;
	for (const match of text.matchAll(pattern)) {
		const key = match[1];
		const raw = match[2];
		if (key === undefined || raw === undefined) continue;
		attrs[key] = decodeEntities(raw.slice(1, -1));
	}
	return attrs;
}

function tagName(raw: string): string {
	const trimmed = raw.trim().replace(/^\/\s*/, "");
	const match = /^([A-Za-z_:][A-Za-z0-9_.:-]*)/.exec(trimmed);
	if (match?.[1] === undefined) {
		fail("TEXTDATA_XML_TAG", "invalid XML tag");
	}
	return match[1];
}

export function extractXmlText(
	source: string,
	strict = true,
): XmlExtractResult {
	let text = "";
	const elements: XmlElementSpan[] = [];
	const stack: Array<{
		name: string;
		start: number;
		attributes: Readonly<Record<string, string>>;
	}> = [];
	const metadata: Record<string, string> = {};

	for (let index = 0; index < source.length; ) {
		const nextTag = source.indexOf("<", index);
		const textEnd = nextTag === -1 ? source.length : nextTag;
		if (textEnd > index) {
			const chunk = decodeEntities(source.slice(index, textEnd));
			text += chunk.replace(/\s+/g, " ");
		}
		if (nextTag === -1) break;
		if (source.startsWith("<!--", nextTag)) {
			const end = source.indexOf("-->", nextTag + 4);
			if (end === -1) {
				if (strict) fail("TEXTDATA_XML_COMMENT", "unterminated XML comment");
				break;
			}
			index = end + 3;
			continue;
		}
		if (source.startsWith("<![CDATA[", nextTag)) {
			const end = source.indexOf("]]>", nextTag + 9);
			if (end === -1) {
				if (strict) fail("TEXTDATA_XML_CDATA", "unterminated CDATA");
				break;
			}
			text += source.slice(nextTag + 9, end);
			index = end + 3;
			continue;
		}
		if (source.startsWith("<?", nextTag) || source.startsWith("<!", nextTag)) {
			const end = source.indexOf(">", nextTag + 2);
			if (end === -1) {
				if (strict) fail("TEXTDATA_XML_DECL", "unterminated XML declaration");
				break;
			}
			index = end + 1;
			continue;
		}
		const tagEnd = source.indexOf(">", nextTag + 1);
		if (tagEnd === -1) {
			if (strict) fail("TEXTDATA_XML_TAG", "unterminated XML tag");
			break;
		}
		const raw = source.slice(nextTag + 1, tagEnd);
		const closing = raw.trimStart().startsWith("/");
		const selfClosing = raw.trimEnd().endsWith("/");
		const name = tagName(raw);
		if (closing) {
			const open = stack.pop();
			if (open === undefined || open.name !== name) {
				if (strict)
					fail("TEXTDATA_XML_NESTING", `unexpected closing tag: ${name}`);
			} else {
				elements.push({
					name,
					start: open.start,
					end: text.length,
					attributes: open.attributes,
				});
			}
		} else {
			const attributes = parseAttributes(raw);
			if (name.toLowerCase() === "title" && attributes.value !== undefined) {
				metadata.title = attributes.value;
			}
			if (selfClosing) {
				elements.push({
					name,
					start: text.length,
					end: text.length,
					attributes,
				});
			} else {
				stack.push({ name, start: text.length, attributes });
			}
		}
		index = tagEnd + 1;
	}
	if (strict && stack.length > 0) {
		fail("TEXTDATA_XML_NESTING", `unclosed tag: ${stack.at(-1)?.name ?? ""}`);
	}
	return {
		text: text.replace(/[ \t\f\v]+/g, " ").trim(),
		elements,
		metadata,
	};
}

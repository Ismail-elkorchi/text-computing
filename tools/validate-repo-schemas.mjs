import fs from "node:fs/promises";
import path from "node:path";
import Ajv from "ajv";
import Ajv2020 from "ajv/dist/2020.js";

const ROOT = process.cwd();
const SCHEMA_DIR = path.join(ROOT, "schemas");

const DRAFT_07 = "http://json-schema.org/draft-07/schema#";
const DRAFT_2020_12 = "https://json-schema.org/draft/2020-12/schema";
const REQUIRED_TEXTPACK_SCHEMA_FILES = [
	"textpack-corpus-resource.schema.json",
	"textpack-coverage-report.schema.json",
	"textpack-evaluation-record.schema.json",
	"textpack-fst-resource.schema.json",
	"textpack-kb-resource.schema.json",
	"textpack-lexicon-resource.schema.json",
	"textpack-morphology-resource.schema.json",
	"textpack-normalization-resource.schema.json",
	"textpack-parallel-resource.schema.json",
	"textpack-quality-profile-resource.schema.json",
	"textpack-search-analyzer-resource.schema.json",
	"textpack-segmentation-resource.schema.json",
	"textpack-syntax-resource.schema.json",
];

const isNoncharacter = (cp) =>
	(cp >= 0xfdd0 && cp <= 0xfdef) ||
	(cp & 0xffff) === 0xfffe ||
	(cp & 0xffff) === 0xffff;

function assertIJsonValue(value, context) {
	if (value === null) return;
	const valueType = typeof value;
	if (valueType === "string") {
		for (let index = 0; index < value.length; ) {
			const cu = value.charCodeAt(index);
			if (cu >= 0xd800 && cu <= 0xdbff) {
				const next = value.charCodeAt(index + 1);
				if (next >= 0xdc00 && next <= 0xdfff) {
					const cp = ((cu - 0xd800) << 10) + (next - 0xdc00) + 0x10000;
					if (isNoncharacter(cp)) {
						throw new Error(`${context}: noncharacter U+${cp.toString(16)}`);
					}
					index += 2;
					continue;
				}
				throw new Error(`${context}: lone surrogate`);
			}
			if (cu >= 0xdc00 && cu <= 0xdfff) {
				throw new Error(`${context}: lone surrogate`);
			}
			if (isNoncharacter(cu)) {
				throw new Error(`${context}: noncharacter U+${cu.toString(16)}`);
			}
			index += 1;
		}
		return;
	}
	if (valueType === "number") {
		if (!Number.isFinite(value)) {
			throw new Error(`${context}: non-finite number`);
		}
		return;
	}
	if (valueType === "boolean") return;
	if (Array.isArray(value)) {
		for (let index = 0; index < value.length; index += 1) {
			assertIJsonValue(value[index], `${context}[${index}]`);
		}
		return;
	}
	if (valueType === "object") {
		for (const key of Object.keys(value)) {
			assertIJsonValue(key, `${context}.key`);
			assertIJsonValue(value[key], `${context}.${key}`);
		}
		return;
	}
	throw new Error(`${context}: unsupported type ${valueType}`);
}

function canonicalize(value) {
	if (value === null || typeof value !== "object") {
		return JSON.stringify(value);
	}
	if (Array.isArray(value)) {
		return `[${value.map((item) => canonicalize(item)).join(",")}]`;
	}
	const keys = Object.keys(value).sort();
	const entries = keys.map(
		(key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`,
	);
	return `{${entries.join(",")}}`;
}

async function main() {
	const files = (await fs.readdir(SCHEMA_DIR))
		.filter((name) => name.endsWith(".schema.json"))
		.sort();
	const fileSet = new Set(files);

	const validators = new Map([
		[DRAFT_07, new Ajv({ strict: false, allErrors: true })],
		[DRAFT_2020_12, new Ajv2020({ strict: false, allErrors: true })],
	]);

	const errors = [];
	for (const requiredFile of REQUIRED_TEXTPACK_SCHEMA_FILES) {
		if (!fileSet.has(requiredFile)) {
			errors.push(`Missing required textpack schema: ${requiredFile}`);
		}
	}

	for (const file of files) {
		const fullPath = path.join(SCHEMA_DIR, file);
		const text = await fs.readFile(fullPath, "utf8");
		const schema = JSON.parse(text);

		try {
			assertIJsonValue(schema, file);
		} catch (error) {
			errors.push(`I-JSON validation failed for ${file}: ${error.message}`);
			continue;
		}

		const ajv = validators.get(schema.$schema);
		if (!ajv) {
			errors.push(
				`Unsupported or missing $schema for ${file}: ${JSON.stringify(schema.$schema)}`,
			);
			continue;
		}

		const valid = ajv.validateSchema(schema);
		if (!valid) {
			const message = ajv.errorsText(ajv.errors, { separator: "; " });
			errors.push(`Meta-schema validation failed for ${file}: ${message}`);
		}

		try {
			canonicalize(schema);
		} catch (error) {
			errors.push(`Canonicalization failed for ${file}: ${error.message}`);
		}
	}

	if (errors.length > 0) {
		for (const error of errors) {
			console.error(error);
		}
		process.exit(1);
	}

	console.log(`Repository schema validation OK (${files.length} files).`);
}

await main();

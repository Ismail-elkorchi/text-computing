import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const sourceRoot = path.join(root, "packages/text-computing/src");
const manifest = JSON.parse(
	await readFile("packages/text-computing/package.json", "utf8"),
);
const modules = new Set(
	Object.keys(manifest.exports)
		.filter((key) => /^\.\/[^/]+$/.test(key))
		.map((key) => key.slice(2)),
);
modules.delete("node");
const graph = new Map([...modules].map((name) => [name, new Set()]));
const errors = [];
const workspaceDirs = new Set(["packages/text-computing"]);

async function files(dir) {
	const result = [];
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		if (["node_modules", "dist", "dist-test"].includes(entry.name)) continue;
		const file = path.join(dir, entry.name);
		if (entry.isDirectory()) result.push(...(await files(file)));
		else if (entry.name.endsWith(".ts")) result.push(file);
	}
	return result;
}

for (const [key, value] of Object.entries(manifest.exports)) {
	if (key.includes("internal") || value.import.includes("/internal/"))
		errors.push("Internal implementation exported: " + key);
}
if (
	Object.keys(manifest.dependencies ?? {}).some((name) =>
		name.startsWith("@ismail-elkorchi/"),
	)
)
	errors.push(
		"The library must own its implementations, not depend on sibling runtime packages.",
	);

for (const file of await files(sourceRoot)) {
	const relative = path.relative(sourceRoot, file);
	const owner = relative.split(path.sep)[0].replace(/\.ts$/, "");
	const source = ts.createSourceFile(
		file,
		await readFile(file, "utf8"),
		ts.ScriptTarget.Latest,
		true,
	);
	function visit(node) {
		const literal =
			ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
				? node.moduleSpecifier
				: ts.isCallExpression(node) &&
						node.expression.kind === ts.SyntaxKind.ImportKeyword
					? node.arguments[0]
					: undefined;
		if (literal && ts.isStringLiteral(literal)) {
			const specifier = literal.text;
			if (specifier.startsWith("@ismail-elkorchi/"))
				errors.push(
					relative +
						": runtime source must use relative module imports: " +
						specifier,
				);
			if (specifier.startsWith(".")) {
				const target = path.resolve(path.dirname(file), specifier);
				const targetRelative = path.relative(sourceRoot, target);
				if (targetRelative.startsWith(".."))
					errors.push(
						relative + ": import escapes runtime source: " + specifier,
					);
				const dependency = targetRelative
					.split(path.sep)[0]
					.replace(/\.ts$/, "");
				if (graph.has(owner) && graph.has(dependency) && dependency !== owner)
					graph.get(owner).add(dependency);
			}
			if (
				specifier.startsWith("node:") &&
				!["node.ts", "onnx-node.ts"].includes(path.basename(relative))
			)
				errors.push(
					relative + ": Node imports belong in explicit Node entrypoints.",
				);
		}
		ts.forEachChild(node, visit);
	}
	visit(source);
}

function visitModule(name, trail = [], complete = new Set()) {
	if (trail.includes(name)) {
		errors.push("Module dependency cycle: " + [...trail, name].join(" -> "));
		return;
	}
	if (complete.has(name)) return;
	for (const dependency of graph.get(name))
		visitModule(dependency, [...trail, name], complete);
	complete.add(name);
}
const complete = new Set();
for (const name of modules) visitModule(name, [], complete);

for (const entry of await readdir("packages/textpacks", {
	withFileTypes: true,
})) {
	if (!entry.isDirectory()) continue;
	const dir = path.join("packages/textpacks", entry.name);
	workspaceDirs.add(dir);
	const pack = JSON.parse(
		await readFile(path.join(dir, "package.json"), "utf8"),
	);
	for (const field of [
		"dependencies",
		"peerDependencies",
		"optionalDependencies",
	]) {
		if (Object.keys(pack[field] ?? {}).length)
			errors.push(
				dir + ": Capability Packs must have no runtime dependencies.",
			);
	}
	for (const file of await files(path.join(dir, "src"))) {
		const source = ts.createSourceFile(
			file,
			await readFile(file, "utf8"),
			ts.ScriptTarget.Latest,
			true,
		);
		function visit(node) {
			if (
				(ts.isImportDeclaration(node) &&
					!node.moduleSpecifier.text.startsWith(".")) ||
				ts.isCallExpression(node) ||
				ts.isFunctionDeclaration(node) ||
				ts.isArrowFunction(node) ||
				ts.isClassDeclaration(node)
			)
				errors.push(file + ": Capability Packs must remain data-only.");
			ts.forEachChild(node, visit);
		}
		visit(source);
	}
}
const lockfile = JSON.parse(await readFile("package-lock.json", "utf8"));
for (const [location, entry] of Object.entries(lockfile.packages)) {
	if (
		location.startsWith("packages/") &&
		!location.includes("/node_modules/") &&
		!workspaceDirs.has(location)
	) {
		errors.push(`Obsolete workspace retained in lockfile: ${location}`);
	}
	if (
		entry.link &&
		entry.resolved.startsWith("packages/") &&
		!workspaceDirs.has(entry.resolved)
	) {
		errors.push(`Obsolete workspace link retained in lockfile: ${location}`);
	}
}
if (errors.length) {
	console.error(errors.join("\n"));
	process.exit(1);
}
console.log(
	"Module boundaries OK (" +
		modules.size +
		" public domains; acyclic imports; data-only packs).",
);

// Scope probes: compiler-project membership decides what gets semantic checking, the
// generated override covers exactly the maintained sources no project covers, and every
// invocation of the wrapper composes the same passes. Requires the real compiler toolchain.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { command, compilerRuns, diagnostics, project } from "./harness.ts";

function skipped(scope: string): boolean {
	if (!compilerRuns(scope)) {
		console.log("SKIP scope: the canonical compiler cannot run on this host");
		return true;
	}
	return false;
}

await test("only sources outside every compiler project are exempted from semantic rules", () => {
	const scope = project();
	try {
		if (skipped(scope.dir)) {
			return;
		}
		const parsed: unknown = JSON.parse(readFileSync(join(scope.dir, "tsconfig.json"), "utf8"));
		if (
			!isRecord(parsed) ||
			!isRecord(parsed["compilerOptions"]) ||
			!isStringArray(parsed["include"])
		) {
			throw new Error("expected a compiler project with options and includes");
		}
		const tsconfig = {
			compilerOptions: parsed["compilerOptions"],
			include: parsed["include"],
		};
		const options = tsconfig.compilerOptions;
		options["allowJs"] = true;
		options["checkJs"] = true;
		tsconfig.include.push("test/checked.js");
		writeFileSync(
			join(scope.dir, "tsconfig.json"),
			`${JSON.stringify(tsconfig, null, "\t")}\n`,
		);
		scope.write(
			"test/checked.js",
			"async function work() {\n  await Promise.resolve();\n}\nwork();\n",
		);
		scope.write(
			"test/unchecked.js",
			"async function work() {\n  await Promise.resolve();\n}\nwork();\ndebugger;\n",
		);
		const written = command(scope.dir, "node", ["scripts/lint.mjs", "scope", "--write"]);
		assert.equal(written.status, 0, written.output);
		assert.match(
			written.output,
			/generated scope override covers 2 uncovered file/,
			"both scripts/lint.mjs and the new probe must be covered",
		);
		assert.deepEqual(diagnostics(scope.dir, "test/checked.js"), [
			"typescript(no-floating-promises)@test/checked.js:4",
		]);
		assert.deepEqual(diagnostics(scope.dir, "test/unchecked.js"), [
			"eslint(no-debugger)@test/unchecked.js:5",
		]);
	} finally {
		scope.cleanup();
	}
});

await test("the generated override is regenerated whole and stays put on source changes", () => {
	const scope = project();
	try {
		if (skipped(scope.dir)) {
			return;
		}
		assert.equal(
			command(scope.dir, "node", ["scripts/lint.mjs", "scope", "--write"]).status,
			0,
		);
		const first = readFileSync(join(scope.dir, ".oxlintrc.json"), "utf8");
		assert.equal(
			command(scope.dir, "node", ["scripts/lint.mjs", "scope", "--write"]).status,
			0,
		);
		assert.equal(readFileSync(join(scope.dir, ".oxlintrc.json"), "utf8"), first);
		scope.write(
			"scripts/probe.mjs",
			"debugger;\nexport const added = 1;\nconsole.log(added);\n",
		);
		assert.equal(
			command(scope.dir, "node", ["scripts/lint.mjs", "scope", "--write"]).status,
			0,
		);
		const grown = readFileSync(join(scope.dir, ".oxlintrc.json"), "utf8");
		assert.notEqual(
			grown,
			first,
			"a newly uncovered file must appear in the generated override",
		);
		assert.match(grown, /scripts\/probe\.mjs/);
	} finally {
		scope.cleanup();
	}
});

await test("every wrapper invocation composes the same scope", () => {
	const scope = project();
	try {
		if (skipped(scope.dir)) {
			return;
		}
		command(scope.dir, "node", ["scripts/lint.mjs", "scope", "--write"]);
		const listed = command(scope.dir, "node", ["scripts/lint.mjs", "scope"]);
		assert.equal(listed.status, 0, listed.output);
		assert.match(listed.output, /Lint scope: \d+ checked files, 1 unchecked file/);
		scope.write("scripts/probe.mjs", "debugger;\n");
		command(scope.dir, "node", ["scripts/lint.mjs", "scope", "--write"]);
		const after = command(scope.dir, "node", ["scripts/lint.mjs", "scope"]);
		assert.equal(after.status, 0, after.output);
		assert.match(after.output, /Lint scope: \d+ checked files, 2 unchecked files/);
	} finally {
		scope.cleanup();
	}
});

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

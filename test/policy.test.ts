// Committed policy harness: every protection the policy states is probed with a failing
// fixture and a valid passing counterpart, asserting the diagnostic identifier and location
// for lint and compiler probes and the failed gate plus exit status for the rest. Probes
// whose toolchain cannot run on this host report that explicitly instead of passing quietly.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { cpSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { command, compilerRuns, diagnostics, project, root, toolchainRuns } from "./harness.ts";

function readConfig(dir: string): unknown {
	return JSON.parse(readFileSync(join(dir, ".oxlintrc.json"), "utf8"));
}

function withRule(config: unknown, rule: string, value: unknown): unknown {
	if (!isRecord(config) || !isRecord(config["rules"])) {
		throw new Error("expected a lint configuration with rules");
	}
	const copy = structuredClone(config) as unknown;
	if (!isRecord(copy) || !isRecord(copy["rules"])) {
		throw new Error("expected a cloned configuration with rules");
	}
	copy.rules[rule] = value;
	return copy;
}

const VERIFIER = join(root, "scripts", "policy.ts");

function rejectsWith(
	cwd: string,
	file: string,
	expected: string | readonly string[],
	typeAware = true,
): void {
	const wanted = typeof expected === "string" ? [expected] : [...expected];
	assert.deepEqual(diagnostics(cwd, file, typeAware), wanted.sort());
}

function accepts(cwd: string, file: string, typeAware = true): void {
	assert.deepEqual(diagnostics(cwd, file, typeAware), []);
}

/** A module whose only violation is the rule under test, on the line reported. */
function fileLines(count: number): string {
	return `${Array.from({ length: count }, (_value, index) => `export const line${index} = ${index};`).join("\n")}\n`;
}

function statements(count: number): string {
	// Exactly `count` body statements, all used, so no other rule joins in.
	const middle = Array.from({ length: count - 2 }, (_value, index) => `  total += ${index};`);
	return `export function probe(): number {\n  let total = 0;\n${middle.join("\n")}\n  return total;\n}\n`;
}

function functionLines(target: number): string {
	// Every line inside the function counts, so the literal carries the padding while the
	// statement count stays under its own limit.
	const inner = target - 2;
	const singles = Math.min(39, inner - 1);
	const elements = inner - singles - 2;
	const array = `  let total = [\n${Array.from({ length: elements }, (_value, index) => `    ${index},`).join("\n")}\n  ].length;`;
	const uses = Array.from({ length: singles - 1 }, (_value, index) => `  total += ${index};`);
	return `export function probe(): number {\n${array}\n${uses.join("\n")}\n  return total;\n}\n`;
}

function params(count: number): string {
	const list = Array.from({ length: count }, (_value, index) => `p${index}: number`).join(", ");
	return `export function probe(${list}): number {\n  return ${summarize(count)};\n}\n`;
}

function summarize(count: number): string {
	const parts = Array.from({ length: count }, (_value, index) => `p${index}`);
	return parts.length === 0 ? "0" : parts.join(" + ");
}

function branches(count: number): string {
	const body = Array.from(
		{ length: count },
		(_value, index) => `  if (value === ${index}) {\n    return ${index};\n  }`,
	).join("\n");
	return `export function probe(value: number): number {\n${body}\n  return -1;\n}\n`;
}

function nesting(depth: number): string {
	let body = "  return 0;";
	for (let level = 0; level < depth; level += 1) {
		body = `  if (value > ${level}) {\n${body.replace(/^/gm, "  ")}\n  }`;
	}
	return `export function probe(value: number): number {\n${body}\n}\n`;
}

// Each entry records the line the tool reports for the offending construct: line-count
// rules report the last line, the rest report the start of the function under test.
const productionMetrics: [string, number, number, number][] = [
	["eslint(max-lines)", 501, 500, 501],
	["eslint(max-lines-per-function)", 81, 80, 1],
	["eslint(max-statements)", 41, 40, 1],
	["eslint(max-params)", 5, 4, 1],
	// The modified variant counts the function itself, so the boundary sits one lower.
	["eslint(complexity)", 11, 9, 1],
	["eslint(max-depth)", 4, 3, 5],
];

const builders: Record<string, (count: number) => string> = {
	"eslint(max-lines)": fileLines,
	"eslint(max-lines-per-function)": functionLines,
	"eslint(max-statements)": statements,
	"eslint(max-params)": params,
	"eslint(complexity)": branches,
	"eslint(max-depth)": nesting,
};

await test("production structural limits fire per metric with valid counterparts", () => {
	const scope = project();
	try {
		for (const [rule, failing, passing, reportedLine] of productionMetrics) {
			const build = builders[rule];
			if (build === undefined) {
				throw new Error(`missing builder for ${rule}`);
			}
			if (!toolchainRuns(scope.dir, true)) {
				console.log(`SKIP ${rule}: type-aware lint unavailable on this host`);
				continue;
			}
			scope.write("test/probe.ts", build(failing));
			rejectsWith(
				scope.dir,
				"test/probe.ts",
				`${rule}@test/probe.ts:${String(reportedLine)}`,
			);
			scope.write("test/probe.ts", build(passing));
			accepts(scope.dir, "test/probe.ts");
			scope.remove("test/probe.ts");
		}
	} finally {
		scope.cleanup();
	}
});

await test("the test profile relaxes only its documented metrics", () => {
	const scope = project();
	try {
		if (!toolchainRuns(scope.dir, true)) {
			console.log("SKIP test profile: type-aware lint unavailable on this host");
			return;
		}
		scope.write("test/profile.test.ts", branches(16));
		rejectsWith(scope.dir, "test/profile.test.ts", [
			"eslint(complexity)@test/profile.test.ts:1",
		]);
		scope.write("test/profile.test.ts", branches(14));
		accepts(scope.dir, "test/profile.test.ts");
		scope.write("test/profile.test.ts", nesting(5));
		rejectsWith(scope.dir, "test/profile.test.ts", [
			"eslint(max-depth)@test/profile.test.ts:6",
		]);
		scope.write("test/profile.test.ts", params(7));
		rejectsWith(scope.dir, "test/profile.test.ts", [
			"eslint(max-params)@test/profile.test.ts:1",
		]);
		scope.write("test/profile.test.ts", fileLines(600));
		accepts(scope.dir, "test/profile.test.ts");
	} finally {
		scope.cleanup();
	}
});

await test("parameter mutation, promise ownership, conditions and type quality stay enforced", () => {
	const scope = project();
	try {
		if (!toolchainRuns(scope.dir, true)) {
			console.log("SKIP semantic probes: type-aware lint unavailable on this host");
			return;
		}
		scope.write(
			"test/probe.ts",
			"export class Holder {\n  private value = 1;\n\n  use(): number {\n    return this.value;\n  }\n}\n",
		);
		rejectsWith(scope.dir, "test/probe.ts", ["typescript(prefer-readonly)@test/probe.ts:2"]);
		scope.write(
			"test/probe.ts",
			"export class Holder {\n  private value = 1;\n\n  use(): number {\n    return this.value;\n  }\n\n  set(value: number): void {\n    this.value = value;\n  }\n}\n",
		);
		accepts(scope.dir, "test/probe.ts");

		scope.write(
			"test/probe.ts",
			"export function start(): Promise<void> {\n  return Promise.resolve();\n}\nstart();\n",
		);
		rejectsWith(scope.dir, "test/probe.ts", [
			"typescript(no-floating-promises)@test/probe.ts:4",
		]);
		scope.write(
			"test/probe.ts",
			"export async function start(): Promise<void> {\n  await Promise.resolve();\n}\nawait start();\n",
		);
		accepts(scope.dir, "test/probe.ts");

		scope.write(
			"test/probe.ts",
			"export function fail(error: unknown): Promise<never> {\n  return Promise.reject(error);\n}\n",
		);
		accepts(scope.dir, "test/probe.ts");
		scope.write(
			"test/probe.ts",
			"export function fail(): Promise<never> {\n  return Promise.reject('a known non-Error value');\n}\n",
		);
		rejectsWith(
			scope.dir,
			"test/probe.ts",
			"typescript(prefer-promise-reject-errors)@test/probe.ts:2",
		);

		scope.write(
			"test/probe.ts",
			"export function show(value: string): string {\n  if (value !== undefined) {\n    return value;\n  }\n  return value;\n}\n",
		);
		rejectsWith(
			scope.dir,
			"test/probe.ts",
			"typescript(no-unnecessary-condition)@test/probe.ts:2",
		);
		scope.write(
			"test/probe.ts",
			"function isText(value: unknown): value is { kind: 'text' } {\n  return typeof value === 'object' && value !== null && 'kind' in value;\n}\nexport function show(value: unknown): string {\n  return isText(value) ? value.kind : '';\n}\n",
		);
		accepts(scope.dir, "test/probe.ts");
		scope.write("test/probe.ts", "export const pattern = /[\\x00-\\x1f]/;\n");
		accepts(scope.dir, "test/probe.ts");

		scope.write(
			"test/probe.ts",
			"export function size(value: undefined): number {\n  return (value as never) === undefined ? 0 : 1;\n}\n",
		);
		rejectsWith(scope.dir, "test/probe.ts", [
			"typescript(no-unnecessary-condition)@test/probe.ts:2",
			"typescript(no-unsafe-type-assertion)@test/probe.ts:2",
		]);
		scope.write(
			"test/probe.ts",
			"export function first(list: readonly number[]): number {\n  return list[0] ?? 0;\n}\n",
		);
		accepts(scope.dir, "test/probe.ts");
	} finally {
		scope.cleanup();
	}
});

await test("the handwritten declaration gate checks the augmentation it claims", () => {
	const scope = project();
	try {
		if (!compilerRuns(scope.dir)) {
			console.log("SKIP declaration gate: the canonical compiler cannot run on this host");
			return;
		}
		scope.write(
			"test/expr-eval-fork.test-d.ts",
			'import { Parser } from "expr-eval-fork";\n\nconst parser = new Parser();\nparser.binaryOps = { check: (left: unknown, right: unknown) => `${String(left)} ${String(right)}` };\n\n// @ts-expect-error - the operator table holds callables, so an operator name cannot map to a string.\nparser.binaryOps = { nope: "missing" };\n',
		);
		const good = command(scope.dir, join(root, "node_modules", ".bin", "tsc"), [
			"-p",
			"tsconfig.declarations.json",
		]);
		assert.equal(good.status, 0, good.output);
		// Without the handwritten augmentation the negative test stops being an error,
		// which proves the declaration file is what the gate is actually checking.
		rmSync(join(scope.dir, "expr-eval-fork.d.ts"));
		const withoutAugmentation = command(scope.dir, join(root, "node_modules", ".bin", "tsc"), [
			"-p",
			"tsconfig.declarations.json",
		]);
		assert.equal(withoutAugmentation.status, 1, withoutAugmentation.output);
		assert.match(withoutAugmentation.output, /expr-eval-fork\.test-d\.ts/);
		assert.match(withoutAugmentation.output, /TS2551/);
	} finally {
		scope.cleanup();
	}
});

await test("suppression scanning distinguishes directives from strings", () => {
	const scope = project();
	try {
		scope.write(
			"test/probe.ts",
			"export const note = 'eslint-disable-next-line no-debugger';\n",
		);
		const clean = command(root, process.execPath, [
			VERIFIER,
			"--root",
			scope.dir,
			"--config",
			join(scope.dir, ".oxlintrc.json"),
			"--baseline",
			join(scope.dir, "lint-baseline.json"),
		]);
		assert.equal(clean.status, 0, clean.output);
		scope.write(
			"test/probe.ts",
			"// eslint-disable-next-line no-debugger\nexport const value = 1;\n",
		);
		const flagged = command(root, process.execPath, [
			VERIFIER,
			"--root",
			scope.dir,
			"--config",
			join(scope.dir, ".oxlintrc.json"),
			"--baseline",
			join(scope.dir, "lint-baseline.json"),
		]);
		assert.equal(flagged.status, 1, flagged.output);
		assert.match(flagged.output, /not permitted outside dedicated negative type tests/);
	} finally {
		scope.cleanup();
	}
});

await test("configuration integrity fails on downgrades, allowances, and unmapped profiles", () => {
	const scope = project();
	try {
		const run = (): number =>
			command(root, process.execPath, [
				VERIFIER,
				"--root",
				scope.dir,
				"--config",
				join(scope.dir, ".oxlintrc.json"),
				"--baseline",
				join(scope.dir, "lint-baseline.json"),
			]).status;
		scope.write("test/probe.ts", "export const value = 1;\n");
		assert.equal(run(), 0);
		scope.remove("test/probe.ts");
		const changes: [string, string, unknown][] = [
			["typescript/no-non-null-assertion", "downgrade", "off"],
			["max-params", "threshold", ["error", { max: 8 }]],
			[
				"typescript/no-explicit-any",
				"option",
				["error", { fixToUnknown: true, ignoreRestArgs: true }],
			],
		];
		for (const [rule, label, value] of changes) {
			scope.write(
				".oxlintrc.json",
				JSON.stringify(withRule(readConfig(scope.dir), rule, value)),
			);
			assert.equal(run(), 1, `expected the ${label} change to fail`);
			cpSync(join(root, ".oxlintrc.json"), join(scope.dir, ".oxlintrc.json"));
		}

		// Each integrity protection reports the specific finding it enforces.
		const findings: [() => void, RegExp][] = [
			[
				() =>
					scope.write(
						".oxlintrc.json",
						JSON.stringify(withoutMapping(readConfig(scope.dir), "**/check.ts")),
					),
				/profile for .* is missing or its rules changed/, // the permitted mapping disappeared
			],
			[
				() =>
					scope.write(
						".oxlintrc.json",
						JSON.stringify(withRule(readConfig(scope.dir), "no-debugger", ["warn"])),
					),
				/requires error or off/,
			],
			[
				() =>
					scope.write(
						".oxlintrc.json",
						JSON.stringify(
							withRule(readConfig(scope.dir), "typescript/no-explicit-any", [
								"error",
								{ allowAny: ["value"] },
							]),
						),
					),
				/nonempty allow/,
			],
			[
				() => {
					const projectPath = join(scope.dir, "tsconfig.json");
					const parsed: unknown = JSON.parse(readFileSync(projectPath, "utf8"));
					if (!isRecord(parsed) || !isStringArray(parsed["include"])) {
						throw new Error("expected a compiler project with an include list");
					}
					parsed["include"] = parsed["include"].filter(
						(entry) => entry !== "scripts/**/*.ts",
					);
					writeFileSync(projectPath, `${JSON.stringify(parsed, null, "\t")}\n`);
				},
				/no compiler project covers it/,
			],
			[
				() => {
					scope.remove("test/probe.ts");
					scope.remove("alto-oxlint/POLICY.md");
				},
				/policy document recorded in the baseline is missing/,
			],
		];
		for (const [change, expected] of findings) {
			change();
			const reported = command(root, process.execPath, [
				VERIFIER,
				"--root",
				scope.dir,
				"--config",
				join(scope.dir, ".oxlintrc.json"),
				"--baseline",
				join(scope.dir, "lint-baseline.json"),
			]);
			assert.equal(reported.status, 1, reported.output);
			assert.match(reported.output, expected);
			cpSync(join(root, ".oxlintrc.json"), join(scope.dir, ".oxlintrc.json"));
			cpSync(join(root, "tsconfig.json"), join(scope.dir, "tsconfig.json"));
			cpSync(join(root, "alto-oxlint/POLICY.md"), join(scope.dir, "alto-oxlint/POLICY.md"));
			scope.write("test/probe.ts", "export const value = 1;\n");
		}
	} finally {
		scope.cleanup();
	}
});

await test("formatting convergence is checked against the real formatter", () => {
	const scope = project();
	try {
		scope.write("test/probe.ts", "export const value = 1;\n");
		assert.equal(
			command(root, join(root, "node_modules", ".bin", "oxfmt"), ["--check", "."]).status,
			0,
		);
		scope.write("test/probe.ts", "export const  value={x:1}\n");
		const result = command(scope.dir, join(root, "node_modules", ".bin", "oxfmt"), [
			"--check",
			".",
		]);
		assert.equal(result.status, 1, result.output);
		assert.match(result.output, /test\/probe\.ts/);
		command(scope.dir, join(root, "node_modules", ".bin", "oxfmt"), ["--write", "."]);
		assert.equal(
			command(scope.dir, join(root, "node_modules", ".bin", "oxfmt"), ["--check", "."])
				.status,
			0,
		);
	} finally {
		scope.cleanup();
	}
});

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function withoutMapping(config: unknown, entry: string): unknown {
	if (!isRecord(config) || !Array.isArray(config["overrides"])) {
		throw new Error("expected a lint configuration with overrides");
	}
	const copy = structuredClone(config) as unknown;
	if (!isRecord(copy) || !Array.isArray(copy["overrides"])) {
		throw new Error("expected a cloned configuration with overrides");
	}
	const kept = copy["overrides"].filter(
		(override) =>
			!(
				isRecord(override) &&
				Array.isArray(override["files"]) &&
				override["files"].includes(entry)
			),
	);
	if (kept.length === copy["overrides"].length) {
		throw new Error(`no override lists ${entry}`);
	}
	copy["overrides"] = kept;
	return copy;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

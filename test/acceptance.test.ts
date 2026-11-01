// Acceptance probes: inject one violation of each class into the real tree, run the real
// quality command, and require that the right gate fails and the tree returns to clean.
// Classes whose toolchain cannot run on this host report that instead of passing quietly.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { command, compilerRuns, root, toolchainRuns } from "./harness.ts";

const PROBES = [
	"scripts/acceptance-probe.js",
	"test/acceptance-probe.ts",
	"test/acceptance-probe.test.ts",
];
const original = readFileSync(join(root, ".oxlintrc.json"), "utf8");

function quality(gate = "check:quality"): ReturnType<typeof command> {
	return command(root, "npm", ["run", gate]);
}

function clean(): void {
	for (const probe of PROBES) {
		rmSync(join(root, probe), { force: true });
	}
	writeFileSync(join(root, ".oxlintrc.json"), original);
	command(root, "npm", ["run", "format:write"]);
}

await test(
	"each failure class fails the real quality command on its own",
	{ timeout: 900_000 },
	async () => {
		if (process.env.ACCEPTANCE_CHILD !== undefined) {
			// The test-gate case runs the aggregate, which runs this file again; the nested
			// run must not recurse into itself.
			console.log("SKIP acceptance probes: nested inside the test-gate case");
			return;
		}
		assert.ok(
			PROBES.every((probe) => !existsSync(join(root, probe))),
			"acceptance probes must not replace maintained source",
		);
		const cases: {
			name: string;
			path: string;
			source: string;
			signal: RegExp;
			toolchain?: boolean;
			gate?: string;
			nested?: boolean;
		}[] = [
			{
				name: "unchecked JavaScript syntax",
				path: "scripts/acceptance-probe.js",
				source: "debugger;\n",
				signal: /no-debugger/,
				toolchain: true,
			},
			{
				name: "checked TypeScript semantics",
				path: "test/acceptance-probe.ts",
				source: "export function work(value: any): number {\n\treturn value.foo;\n}\n",
				signal: /typescript\(no-unsafe-/,
				toolchain: true,
			},
			{
				name: "canonical compiler",
				path: "test/acceptance-probe.ts",
				source: "export const value: string = 1;\n",
				signal: /TS2322/,
				toolchain: true,
			},
			{
				name: "formatting",
				path: "test/acceptance-probe.ts",
				source: "export const value={x:1}\n",
				signal: /acceptance-probe\.ts/,
				toolchain: true,
			},
			{
				name: "forbidden suppression",
				path: "test/acceptance-probe.ts",
				source: "// oxlint-disable-next-line no-debugger -- explained by the acceptance probe itself.\nexport const value = 1;\n",
				signal: /acceptance-probe\.ts:1/,
				toolchain: true,
			},
			{
				name: "test gate",
				path: "test/acceptance-probe.test.ts",
				source: 'import assert from "node:assert/strict";\nimport { test } from "node:test";\n\nawait test("the injected assertion fails", () => {\n\tassert.equal(1, 2);\n});\n',
				signal: /gate test: fail/,
				toolchain: true,
				gate: "verify",
				nested: true,
			},
			{
				name: "policy downgrade",
				path: "test/acceptance-probe.ts",
				source: "export const value = 1;\n",
				signal: /typescript\/no-non-null-assertion/,
				toolchain: true,
			},
		];
		try {
			for (const testCase of cases) {
				if (
					testCase.toolchain === true &&
					(!toolchainRuns(root, true) || !compilerRuns(root))
				) {
					console.log(`SKIP ${testCase.name}: toolchain unavailable on this host`);
					continue;
				}
				clean();
				if (testCase.name === "policy downgrade") {
					const parsed: unknown = JSON.parse(original);
					if (!isRecord(parsed)) {
						throw new Error("expected a lint configuration with rules");
					}
					ruleMap(parsed)["typescript/no-non-null-assertion"] = "off";
					const config = parsed;
					writeFileSync(
						join(root, ".oxlintrc.json"),
						`${JSON.stringify(config, null, "\t")}\n`,
					);
					command(root, "npm", ["run", "format:write"]);
				} else {
					writeFileSync(join(root, testCase.path), testCase.source);
					if (testCase.name !== "formatting") {
						command(root, "npm", ["run", "format:write"]);
					}
					if (testCase.path.endsWith(".js")) {
						// A new uncovered file needs its generated override before the
						// syntax finding is the only thing left to fail on.
						command(root, "node", ["scripts/lint.mjs", "scope", "--write"]);
					}
				}
				if (testCase.nested === true) {
					process.env.ACCEPTANCE_CHILD = "1";
				}
				const result = quality(testCase.gate);
				delete process.env.ACCEPTANCE_CHILD;
				assert.notEqual(
					result.status,
					0,
					`${testCase.name}: expected a failure\n${result.output}`,
				);
				assert.match(result.output, testCase.signal, testCase.name);
			}
			clean();
			if (toolchainRuns(root, true) && compilerRuns(root)) {
				const settled = quality();
				assert.equal(settled.status, 0, settled.output);
			}
		} finally {
			clean();
		}
	},
);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function ruleMap(config: Record<string, unknown>): Record<string, unknown> {
	const rules = config["rules"];
	if (!isRecord(rules)) {
		throw new Error("expected a rules section");
	}
	return rules;
}

// Resolve which maintained sources belong to a compiler project so the semantic and
// compiler-diagnostic passes can be composed over the same scope the editor uses.
import { existsSync, globSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { generatedOverride } from "./scope-override.ts";

export interface LintScope {
	checked: readonly string[];
	unchecked: readonly string[];
	projects: readonly string[];
}

function command(executable: string, args: string[]): string {
	const result = spawnSync(executable, args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
	if (result.error !== undefined) {
		throw result.error;
	}
	if (result.status !== 0) {
		throw new Error(
			`${executable} failed (${String(result.status)}): ${result.stdout}${result.stderr}`,
		);
	}
	return result.stdout;
}

/** Native project graphs include inherited settings and imported files, not just include globs. */
function projectFiles(project: string): string[] {
	return command("node_modules/.bin/tsc", ["-p", project, "--listFilesOnly"])
		.trim()
		.split("\n")
		.map((file) =>
			relative(realpathSync.native("."), realpathSync.native(resolve(file.trim()))),
		);
}

export function lintScope(): LintScope {
	const compiler = "node_modules/.bin/tsc";
	if (!existsSync(compiler)) {
		throw new Error(
			`${compiler} is not installed; the lint scope needs the canonical compiler on this host.`,
		);
	}
	const projects = globSync(["tsconfig*.json"], { exclude: ["**/node_modules/**"] }).sort();
	if (projects.length === 0) {
		throw new Error("No compiler projects found; the lint scope cannot be resolved.");
	}
	const assigned = new Set<string>();
	for (const project of projects) {
		for (const file of projectFiles(project)) {
			assigned.add(file);
		}
	}
	const maintained = globSync(
		[
			"*.{ts,mts,cts,mjs,cjs,js,jsx}",
			"test/**/*.{ts,mts,cts,mjs,cjs,js,jsx}",
			"scripts/**/*.{ts,mts,cts,mjs,cjs,js,jsx}",
		],
		{
			exclude: ["**/node_modules/**"],
		},
	).sort();
	const checked: string[] = [];
	const unchecked: string[] = [];
	for (const file of maintained) {
		if (assigned.has(file)) {
			checked.push(file);
			continue;
		}
		if (!/\.[cm]?jsx?$/.test(file)) {
			throw new Error(`Maintained source has no compiler project: ${file}`);
		}
		unchecked.push(file);
	}
	return { checked, unchecked, projects };
}

/** The generated override is the only override the scope writer owns, and it is regenerated whole. */
export function verifyScope(scope: LintScope, write: boolean): void {
	const baseline: unknown = JSON.parse(readFileSync("lint-baseline.json", "utf8"));
	if (!isRecord(baseline) || !isRecord(baseline["baseline"])) {
		throw new Error("lint-baseline.json is not an object");
	}
	const baselineDocument = baseline["baseline"];
	const configuration: unknown = JSON.parse(readFileSync(".oxlintrc.json", "utf8"));
	if (!isRecord(configuration)) {
		throw new Error(".oxlintrc.json is not an object");
	}
	const owned = unknownList(configuration["overrides"]).slice(countProfiles(baselineDocument));
	const expected = generatedOverride(rulesOf(baselineDocument), scope.unchecked);
	const matches = JSON.stringify(owned) === JSON.stringify(expected === null ? [] : [expected]);
	if (write) {
		if (expected !== null) {
			configuration["overrides"] = [...unknownList(baselineDocument["overrides"]), expected];
			writeFileSync(".oxlintrc.json", `${JSON.stringify(configuration, null, "\t")}\n`);
			console.log(
				`generated scope override covers ${expected.files.length} uncovered file(s).`,
			);
		}
		return;
	}
	if (!matches) {
		throw new Error(
			"The generated scope override is stale; run: node scripts/lint.mjs scope --write",
		);
	}
}

function rulesOf(document: Record<string, unknown>): Record<string, unknown> {
	return isRecord(document["rules"]) ? document["rules"] : {};
}

function countProfiles(document: Record<string, unknown>): number {
	return unknownList(document["overrides"]).length;
}

function unknownList(value: unknown): readonly unknown[] {
	return Array.isArray(value) ? Array.from(value, (entry: unknown): unknown => entry) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

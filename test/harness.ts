// Shared helpers for the policy harness: build a throwaway project copy that carries the
// real configuration files, run the pinned tools in it, and report diagnostics as data.
import { spawnSync } from "node:child_process";
import {
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const COPIED = [
	".oxlintrc.json",
	".oxfmtrc.json",
	".oxfmtignore",
	"tsconfig.json",
	"tsconfig.declarations.json",
	"lint-baseline.json",
	"package.json",
	"expr-eval-fork.d.ts",
	"scripts/lint.mjs",
	"scripts/lint-scope.ts",
	"scripts/scope-override.ts",
	"alto-oxlint/POLICY.md",
];

export interface Probe {
	path: string;
	source: string;
}

export interface Project {
	dir: string;
	write: (path: string, source: string) => void;
	remove: (path: string) => void;
	cleanup: () => void;
}

export function project(): Project {
	const dir = mkdtempSync(join(tmpdir(), "pi-calculator-policy-"));
	for (const directory of ["test", "scripts"]) {
		mkdirSync(join(dir, directory), { recursive: true });
	}
	for (const path of COPIED) {
		mkdirSync(dirname(join(dir, path)), { recursive: true });
		cpSync(join(root, path), join(dir, path));
	}
	symlinkSync(join(root, "node_modules"), join(dir, "node_modules"), "dir");
	return {
		dir,
		write(path, source) {
			const target = join(dir, path);
			mkdirSync(dirname(target), { recursive: true });
			writeFileSync(target, source);
		},
		remove(path) {
			rmSync(join(dir, path), { force: true });
		},
		cleanup() {
			rmSync(dir, { recursive: true, force: true });
		},
	};
}

export interface CommandResult {
	status: number;
	output: string;
}

export function command(cwd: string, executable: string, arguments_: string[]): CommandResult {
	const result = spawnSync(executable, arguments_, {
		cwd,
		encoding: "utf8",
		maxBuffer: 32 * 1024 * 1024,
	});
	if (result.error !== undefined) {
		throw result.error;
	}
	return { status: result.status ?? 1, output: `${result.stdout}${result.stderr}` };
}

/** oxlint diagnostics for one file, reported as code plus the reported line. */
export function diagnostics(cwd: string, file: string, typeAware = true): string[] {
	const result = command(cwd, join(root, "node_modules", ".bin", "oxlint"), [
		...(typeAware ? ["--type-aware"] : []),
		"--deny-warnings",
		"--format=json",
		file,
	]);
	if (/tsgolint/i.test(result.output) && !result.output.trimStart().startsWith("{")) {
		throw new Error(`type-aware lint cannot run on this host: ${result.output.trim()}`);
	}
	const report: unknown = JSON.parse(result.output.slice(result.output.indexOf("{")));
	if (typeof report !== "object" || report === null || !("diagnostics" in report)) {
		throw new Error(`unexpected lint report: ${result.output}`);
	}
	if (!isRecord(report) || !Array.isArray(report["diagnostics"])) {
		throw new Error("lint diagnostics are missing");
	}
	const listed: unknown[] = report["diagnostics"];
	const reported = listed.map((entry) => {
		if (!isDiagnostic(entry)) {
			throw new Error("lint diagnostic is malformed");
		}
		const line = entry.labels?.[0]?.span?.line;
		return `${String(entry.code)}@${String(entry.filename)}:${String(line ?? 0)}`;
	});
	return reported.sort();
}

/** Decide whether a tool can actually produce results for a project copy. */
export function toolchainRuns(cwd: string, typeAware: boolean): boolean {
	if (!existsSync(join(root, "node_modules", ".bin", "oxlint"))) {
		return false;
	}
	try {
		writeFileSync(join(cwd, "test", "probe-check.ts"), "export const value = 1;\n");
		const result = command(cwd, join(root, "node_modules", ".bin", "oxlint"), [
			...(typeAware ? ["--type-aware"] : []),
			"--deny-warnings",
			"--format=json",
			"test/probe-check.ts",
		]);
		return result.output.trimStart().startsWith("{");
	} finally {
		rmSync(join(cwd, "test", "probe-check.ts"), { force: true });
	}
}

export function compilerRuns(cwd: string): boolean {
	return (
		existsSync(join(root, "node_modules", ".bin", "tsc")) &&
		command(cwd, join(root, "node_modules", ".bin", "tsc"), ["--version"]).status === 0
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isDiagnostic(
	value: unknown,
): value is { code?: string; filename?: string; labels?: { span?: { line?: number } }[] } {
	return typeof value === "object" && value !== null;
}

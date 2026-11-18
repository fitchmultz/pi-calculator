#!/usr/bin/env node
// Regenerate lint-baseline.json from the policy document, or report drift against it.
// Usage: node scripts/lint-baseline.ts [--policy <path>] [--write]
import { hash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { parseArgs } from "node:util";

function parseJson(text: string): unknown {
	return JSON.parse(text) as unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

const root = join(import.meta.dirname, "..");
const { values: cli } = parseArgs({
	options: {
		policy: { type: "string" },
		write: { type: "boolean", default: false },
	},
	strict: false,
});
const policyPath =
	typeof cli.policy === "string" ? cli.policy : join(root, "alto-oxlint", "POLICY.md");

/** The version line the standard opens with, or a bolded "**Label:** value" header field. */
function version(): string | undefined {
	const header = /^# .*?\n+\*\*Version ([0-9][^\s]*) ·/m.exec(policyText);
	return header?.[1];
}

function field(label: string): string | undefined {
	const pattern = new RegExp(`^\\*\\*${RegExp.escape(label)}:\\*\\*\\s*(.+)$`, "m");
	return pattern.exec(policyText)?.[1]?.trim();
}

/** The single fenced JSON block under the policy's baseline section. */
function baselineFrom(text: string): unknown {
	const section = text.slice(text.indexOf("\n## Appendix A"));
	const body = /^```json\n([\s\S]*?)^```$/m.exec(section)?.[1];
	if (body === undefined) {
		throw new Error(`no JSON baseline block found in ${policyPath}`);
	}
	const parsed = parseJson(body);
	if (!isRecord(parsed)) {
		throw new Error(`the policy baseline block is not an object`);
	}
	return parsed;
}

if (!existsSync(policyPath)) {
	console.error(`policy document not found: ${policyPath}`);
	process.exit(1);
}
const policyText = readFileSync(policyPath, "utf8");
const document: {
	policy: {
		path: string;
		version: string | undefined;
		releaseId: string | undefined;
		digest: string;
	};
	baseline: unknown;
} = {
	policy: {
		path: relative(root, policyPath),
		version: version(),
		releaseId: field("Release ID") ?? version(),
		digest: hash("sha256", policyText, "hex"),
	},
	baseline: baselineFrom(policyText),
};
const serialized = `${JSON.stringify(document, null, "\t")}\n`;
const target = join(root, "lint-baseline.json");

// Compare parsed content so the repository formatter cannot cause false drift.
function matchesTarget(serializedText: string): boolean {
	return JSON.stringify(readJson(target)) === JSON.stringify(parseJson(serializedText));
}

function readJson(path: string): unknown {
	return parseJson(readFileSync(path, "utf8"));
}

if (cli.write === true) {
	writeFileSync(target, serialized);
	console.log(`wrote ${target}`);
} else if (!matchesTarget(serialized)) {
	console.error(
		"lint-baseline.json is stale for the policy document; run: node scripts/lint-baseline.ts --write",
	);
	process.exit(1);
} else {
	console.log(`lint-baseline.json matches ${policyPath}`);
}

#!/usr/bin/env node
// Regenerate lint-baseline.json from the policy document, or report drift against it.
// Usage: node scripts/lint-baseline.mjs [--policy <path>] [--write]
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

function parseJson(text: string): unknown {
	return JSON.parse(text) as unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const policyPath = option("--policy") ?? join(root, "alto-oxlint", "POLICY.md");

function option(name: string): string | undefined {
	const index = args.indexOf(name);
	return index === -1 ? undefined : args[index + 1];
}

/** The version line the standard opens with, or a bolded "**Label:** value" header field. */
function version(): string | undefined {
	const header = /^# .*?\n+\*\*Version ([0-9][^\s]*) ·/m.exec(policyText);
	return header?.[1];
}

function field(label: string): string | undefined {
	const pattern = new RegExp(`^\\*\\*${label}:\\*\\*\\s*(.+)$`, "m");
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
		digest: createHash("sha256").update(policyText).digest("hex"),
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

if (args.includes("--write")) {
	writeFileSync(target, serialized);
	console.log(`wrote ${target}`);
} else if (!matchesTarget(serialized)) {
	console.error(
		"lint-baseline.json is stale for the policy document; run: node scripts/lint-baseline.mjs --write",
	);
	process.exit(1);
} else {
	console.log(`lint-baseline.json matches ${policyPath}`);
}

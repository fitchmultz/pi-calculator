#!/usr/bin/env node
// Run the acceptance gates independently so one failure does not hide the rest, then
// aggregate: the exit status is nonzero when any gate failed. Writing/fixing commands are
// conveniences; acceptance uses these check gates.
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const gates = process.argv.slice(2);
if (gates.length === 0) {
	console.error("usage: node scripts/checks.mjs <gate> [<gate> ...]");
	process.exit(2);
}

const results = [];
for (const gate of gates) {
	const started = Date.now();
	const run = spawnSync(npm, ["run", gate], { cwd: root, encoding: "utf8" });
	if (run.error !== undefined) {
		console.error(`gate ${gate}: could not run (${String(run.error.message)})`);
		results.push([gate, 1]);
		continue;
	}
	const output = `${run.stdout ?? ""}${run.stderr ?? ""}`.trimEnd();
	if (output !== "") {
		console.log(output);
	}
	results.push([gate, run.status ?? 1]);
	console.log(
		`gate ${gate}: ${run.status === 0 ? "pass" : `fail (exit ${String(run.status ?? 1)})`} in ${((Date.now() - started) / 1000).toFixed(1)}s`,
	);
}

console.log("\nacceptance gates");
for (const [gate, status] of results) {
	console.log(`${gate}\t${status === 0 ? "pass" : `fail(${String(status)})`}`);
}
process.exit(results.some(([, status]) => status !== 0) ? 1 : 0);

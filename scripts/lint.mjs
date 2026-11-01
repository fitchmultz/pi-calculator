// Compose the two lint passes the policy requires: semantic lint across the tree, then
// compiler diagnostics over the files that belong to a checked project. Autofix is a
// writer, so it never runs the diagnostic passes and is never an acceptance gate.
import { spawnSync } from "node:child_process";
import { lintScope, verifyScope } from "./lint-scope.ts";

const scope = lintScope();
const mode = process.argv[2] ?? "all";
verifyScope(scope, process.argv.includes("--write"));

/** @param {readonly string[]} arguments_ */
function run(arguments_) {
	const result = spawnSync("node_modules/.bin/oxlint", arguments_, { stdio: "inherit" });
	if (result.error) {
		throw result.error;
	}
	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

if (mode === "scope") {
	console.log(
		`Lint scope: ${scope.checked.length} checked files, ${scope.unchecked.length} unchecked files, ${scope.projects.length} projects.`,
	);
} else if (mode === "fix") {
	run(["--fix", "."]);
	if (scope.checked.length > 0) {
		run(["--fix", "--type-check", ...scope.checked]);
	}
} else {
	const flags = ["--deny-warnings"];
	if (mode === "agent") {
		flags.push("--format=agent");
	}
	run(["--type-aware", ...flags, "."]);
	if (scope.checked.length > 0) {
		run(["--type-aware", "--type-check", ...flags, ...scope.checked]);
	}
}

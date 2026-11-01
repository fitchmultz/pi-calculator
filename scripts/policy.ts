#!/usr/bin/env node
// Verify the lint configuration against the committed policy baseline, scan maintained
// sources for suppressions, and report which profile, lint scope, compiler project, and
// formatter owns each maintained file. Run through npm run policy so failures propagate.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, relative, sep } from "node:path";
import { generatedOverride } from "./scope-override.ts";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const root = option("--root") ?? repoRoot;
const failures: string[] = [];

function option(name: string): string | undefined {
	const index = process.argv.indexOf(name);
	return index === -1 ? undefined : process.argv[index + 1];
}

function fail(message: string): void {
	failures.push(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringList(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function readObject(path: string): Record<string, unknown> {
	const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
	if (!isRecord(parsed)) {
		throw new Error(`expected an object: ${path}`);
	}
	return parsed;
}

function field(document: Record<string, unknown>, key: string): Record<string, unknown> {
	const value = document[key];
	if (!isRecord(value)) {
		throw new Error(`expected ${key} to be an object`);
	}
	return value;
}

function text(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined;
}

/** Compare resolved values, reporting the first difference by path. */
function compare(label: string, expected: unknown, actual: unknown): void {
	if (JSON.stringify(expected) === JSON.stringify(actual)) {
		return;
	}
	fail(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function ruleMap(document: Record<string, unknown>): Record<string, unknown> {
	const rules = document["rules"];
	if (rules === undefined) {
		return {};
	}
	if (!isRecord(rules)) {
		throw new Error("expected rules to be an object");
	}
	return rules;
}

function severityOf(setting: unknown): string {
	if (Array.isArray(setting)) {
		return String(setting[0]);
	}
	return String(setting);
}

function optionsOf(setting: unknown): Record<string, unknown> | undefined {
	if (!Array.isArray(setting)) {
		return undefined;
	}
	return isRecord(setting[1]) ? setting[1] : undefined;
}

interface Profile {
	files: string[];
	rules: string;
}

function profileList(document: Record<string, unknown>): Profile[] {
	const overrides = document["overrides"];
	if (overrides === undefined) {
		return [];
	}
	if (!Array.isArray(overrides)) {
		throw new Error("expected overrides to be an array");
	}
	return overrides.map((entry) => {
		if (!isRecord(entry) || !isStringList(entry["files"])) {
			throw new Error("expected an override profile with a files list");
		}
		return { files: entry["files"], rules: JSON.stringify(entry["rules"] ?? {}) };
	});
}

const baselineDocument = readObject(option("--baseline") ?? join(root, "lint-baseline.json"));
const baseline = field(baselineDocument, "baseline");
const policySection = field(baselineDocument, "policy");
const policyPath = text(policySection["path"]);
const policyRevision = text(policySection["releaseId"]);
const recordedDigest = text(policySection["digest"]);

checkPolicyDigest();

function checkPolicyDigest(): void {
	const documentPath = policyPath === undefined ? undefined : join(root, policyPath);
	if (documentPath === undefined || !existsSync(documentPath) || recordedDigest === undefined) {
		fail("the policy document recorded in the baseline is missing");
		return;
	}
	const digest = createHash("sha256").update(readFileSync(documentPath, "utf8")).digest("hex");
	if (digest !== recordedDigest) {
		fail(
			`policy document changed (${policyRevision ?? "unknown revision"}): recorded ${recordedDigest}, current ${digest}; run: node scripts/lint-baseline.ts --write`,
		);
	}
}

const config = readObject(option("--config") ?? join(root, ".oxlintrc.json"));
compare("plugins", baseline["plugins"], config["plugins"]);
compare("categories", baseline["categories"], config["categories"]);
compare("options", baseline["options"], config["options"]);

const baselineRules = ruleMap(baseline);
const configRules = ruleMap(config);
for (const [rule, setting] of Object.entries(baselineRules)) {
	compare(`rule ${rule}`, setting, configRules[rule]);
}
for (const rule of Object.keys(configRules)) {
	if (!(rule in baselineRules)) {
		fail(`rule ${rule} is configured but is not part of the policy baseline`);
	}
}
for (const [rule, setting] of Object.entries(configRules)) {
	checkRuleSettings(rule, setting);
}

function checkRuleSettings(rule: string, setting: unknown): void {
	if (severityOf(setting) === "warn") {
		fail(`rule ${rule} is set to warn; the policy requires error or off`);
	}
	const options = optionsOf(setting);
	if (options === undefined) {
		return;
	}
	for (const [key, value] of Object.entries(options)) {
		if (/^allow/i.test(key) && Array.isArray(value) && value.length > 0) {
			fail(`rule ${rule} keeps a nonempty ${key} allowance`);
		}
	}
}

interface ProfileCheck {
	files: string[];
	rules: string;
}

const mainInclude = stringList(readObject(join(root, "tsconfig.json")));
const declarationInclude = stringList(readObject(join(root, "tsconfig.declarations.json")));

// Permitted mapping: the check entrypoints join the test profile. Anything else is drift.
const PERMITTED_MAPPINGS = new Set(["**/check.ts", "**/check-extension.ts"]);
const baselineProfiles = profileList(baseline);
const generated = generatedOverride(baselineRules, uncoveredSources());
const expectedProfiles: ProfileCheck[] =
	generated === null
		? baselineProfiles
		: [...baselineProfiles, { files: generated.files, rules: JSON.stringify(generated.rules) }];
const configProfiles = profileList(config);
if (configProfiles.length !== expectedProfiles.length) {
	fail(
		`expected ${String(expectedProfiles.length)} profiles, got ${String(configProfiles.length)}`,
	);
}
for (const expected of expectedProfiles) {
	checkProfile(expected);
}
for (const profile of configProfiles) {
	checkProfileWarn(profile);
}
if (generated !== null) {
	checkGeneratedOverride(generated);
}

function checkProfile(expected: ProfileCheck): void {
	const actual = configProfiles.find((profile) => profile.rules === expected.rules);
	if (actual === undefined) {
		fail(`profile for ${expected.files.join(", ")} is missing or its rules changed`);
		return;
	}
	const missing = expected.files.filter((entry) => !actual.files.includes(entry));
	if (missing.length > 0) {
		fail(`profile ${expected.files.join(", ")} lost ${missing.join(", ")}`);
	}
	for (const addition of actual.files.filter((entry) => !expected.files.includes(entry))) {
		if (!PERMITTED_MAPPINGS.has(addition)) {
			fail(
				`profile ${expected.files.join(", ")} maps ${addition}, which the policy does not permit`,
			);
		}
	}
}

function checkProfileWarn(profile: ProfileCheck): void {
	const parsed: unknown = JSON.parse(profile.rules);
	if (!isRecord(parsed)) {
		return;
	}
	for (const [rule, setting] of Object.entries(parsed)) {
		if (severityOf(setting) === "warn") {
			fail(`profile ${profile.files.join(", ")} sets ${rule} to warn`);
		}
	}
}

function checkGeneratedOverride(expected: {
	files: string[];
	rules: Record<string, string>;
}): void {
	const tail = configProfiles.filter(
		(profile) => profile.rules === JSON.stringify(expected.rules),
	);
	const covered = tail.flatMap((profile) => profile.files).sort();
	const wanted = [...expected.files].sort();
	if (tail.length !== 1 || JSON.stringify(covered) !== JSON.stringify(wanted)) {
		fail(`the generated scope override must cover exactly ${expected.files.join(", ")}`);
	}
}

function uncoveredSources(): string[] {
	const uncovered = new Set<string>();
	// Only lint-scoped source participates in the generated override. Documentation and data
	// files keep a formatter owner and no compiler project, which is their correct coverage.
	for (const file of maintainedFiles(".")) {
		if (
			/\.[cm]?[jt]sx?$/.test(file) &&
			!file.endsWith(".d.ts") &&
			compilerFor(file) === "none"
		) {
			uncovered.add(file);
		}
	}
	return [...uncovered];
}

/** Match a file against a profile glob, covering the shapes the config actually uses. */
function matches(globPattern: string, file: string): boolean {
	const braced = /\{([^}]*)\}/.exec(globPattern);
	if (braced !== null) {
		const whole = braced[0];
		const alternatives = (braced[1] ?? "").split(",");
		return alternatives.some((alternative) =>
			matches(globPattern.replace(whole, alternative), file),
		);
	}
	// A glob matches the whole project-relative path; a bare extension pattern does not
	// reach into directories, which is how the compiler projects scope their sources.
	return new RegExp(`^${translateGlob(globPattern)}$`).test(file);
}

function translateGlob(globPattern: string): string {
	let source = "";
	let index = 0;
	while (index < globPattern.length) {
		if (globPattern.startsWith("**/", index)) {
			source += "(?:[^/]+/)*";
			index += 3;
			continue;
		}
		if (globPattern.startsWith("**", index)) {
			source += `.*`;
			index += 2;
			continue;
		}
		const char = globPattern[index] ?? "";
		if (char === "*") {
			source += "[^/]*";
			index += 1;
			continue;
		}
		if (char === "?") {
			source += "[^/]";
			index += 1;
			continue;
		}
		source += /[.+^${}()|[\]\\/]/.test(char) ? `\\${char}` : char;
		index += 1;
	}
	return source;
}

function matchesAny(globs: string[], file: string): boolean {
	return globs.some((globPattern) => matches(globPattern, file));
}

function stringList(document: Record<string, unknown>): string[] {
	const include = document["include"];
	if (include === undefined) {
		return [];
	}
	if (!isStringList(include)) {
		throw new Error("expected include to be a list of strings");
	}
	return include;
}

function compilerFor(file: string): string {
	if (matchesAny(mainInclude, file)) {
		return "tsconfig.json";
	}
	if (matchesAny(declarationInclude, file)) {
		return "tsconfig.declarations.json";
	}
	return "none";
}

function globsWith(marker: string, exclude: string | null): string[] {
	for (const profile of configProfiles) {
		const wanted = profile.files.some(
			(globPattern) =>
				globPattern.includes(marker) &&
				(exclude === null || !globPattern.includes(exclude)),
		);
		if (wanted) {
			return profile.files;
		}
	}
	return [];
}

const testGlobs = globsWith("test", "test-d");
const declarationGlobs = globsWith(".d.", null);
const testDGlobs = globsWith("test-d", null);

function profileFor(file: string): string {
	if (matchesAny(testDGlobs, file)) {
		return "test-d";
	}
	if (matchesAny(declarationGlobs, file)) {
		return "declaration";
	}
	if (matchesAny(testGlobs, file)) {
		return "test";
	}
	return "baseline";
}

const ignore = new Set(
	readFileSync(join(root, ".oxfmtignore"), "utf8")
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line !== "" && !line.startsWith("#")),
);

function formatterFor(file: string): string {
	for (const entry of ignore) {
		if (file === entry || file.endsWith(`/${entry}`)) {
			return "npm";
		}
	}
	return "oxfmt";
}

/** Every maintained source file, excluding generated and dependency output. */
function maintainedFiles(directory: string): string[] {
	if (!existsSync(join(root, directory))) {
		return [];
	}
	const found: string[] = [];
	for (const entry of readdirSync(join(root, directory))) {
		if (entry === "node_modules") {
			continue;
		}
		const path = join(root, directory, entry);
		if (statSync(path).isDirectory()) {
			found.push(...maintainedFiles(join(directory, entry)));
		} else if (/\.[cm]?[jt]sx?$/.test(entry) || /\.(md|json|ya?ml)$/.test(entry)) {
			found.push(relative(root, path).split(sep).join("/"));
		}
	}
	return found.sort();
}

const MAINTAINED_DIRECTORIES = ["."];
const coverage: string[] = [];
const scanned = new Set<string>();
for (const directory of MAINTAINED_DIRECTORIES) {
	for (const file of maintainedFiles(directory)) {
		recordFile(file);
	}
}

function recordFile(file: string): void {
	if (scanned.has(file)) {
		return;
	}
	scanned.add(file);
	if (compilerFor(file) === "none" && /\.[cm]?tsx?$/.test(file)) {
		fail(`${file} is maintained but no compiler project covers it`);
	}
	coverage.push(
		`${file}\t${profileFor(file)}\toxlint\t${compilerFor(file)}\t${formatterFor(file)}`,
	);
}

interface Comment {
	line: number;
	text: string;
}

interface Cursor {
	line: number;
	index: number;
}

/** Comments only, so directive-looking text inside a string is not mistaken for a suppression. */
function collectComments(source: string): Comment[] {
	const comments: Comment[] = [];
	let cursor: Cursor = { line: 1, index: 0 };
	while (cursor.index < source.length) {
		const char = source[cursor.index] ?? "";
		if (char === "\n") {
			cursor = { line: cursor.line + 1, index: cursor.index + 1 };
			continue;
		}
		if (char === '"' || char === "'" || char === "`") {
			cursor = skipString(source, cursor, char);
			continue;
		}
		const next = source[cursor.index + 1];
		if (char === "/" && (next === "/" || next === "*")) {
			const scannedComment = scanComment(source, cursor);
			comments.push(scannedComment.comment);
			cursor = scannedComment.cursor;
			continue;
		}
		cursor = { line: cursor.line, index: cursor.index + 1 };
	}
	return comments;
}

function skipString(source: string, start: Cursor, quote: string): Cursor {
	let cursor = { line: start.line, index: start.index + 1 };
	while (cursor.index < source.length) {
		const char = source[cursor.index] ?? "";
		const line = char === "\n" ? cursor.line + 1 : cursor.line;
		if (char === "\\") {
			cursor = { line, index: cursor.index + 2 };
			continue;
		}
		cursor = { line, index: cursor.index + 1 };
		if (char === quote) {
			return cursor;
		}
	}
	return cursor;
}

function scanComment(source: string, start: Cursor): { cursor: Cursor; comment: Comment } {
	const block = source[start.index + 1] === "*";
	const line = start.line;
	let cursor = { line: start.line, index: start.index + 2 };
	while (cursor.index < source.length) {
		const char = source[cursor.index] ?? "";
		if (block && char === "*" && source[cursor.index + 1] === "/") {
			cursor = { line: cursor.line, index: cursor.index + 2 };
			break;
		}
		if (!block && char === "\n") {
			break;
		}
		cursor = { line: char === "\n" ? cursor.line + 1 : cursor.line, index: cursor.index + 1 };
	}
	return { cursor, comment: { line, text: source.slice(start.index, cursor.index) } };
}

const DIRECTIVES =
	/(?:eslint-disable|eslint-enable|oxlint-disable|@ts-(?:ignore|nocheck|expect-error))/g;

for (const file of coverage.map((row) => row.split("\t")[0] ?? "")) {
	if (/\.[cm]?tsx?$/.test(file)) {
		checkSuppressions(file);
	}
}

function checkSuppressions(file: string): void {
	for (const comment of collectComments(readFileSync(join(root, file), "utf8"))) {
		for (const match of comment.text.matchAll(DIRECTIVES)) {
			checkDirective({
				file,
				line: comment.line,
				directive: match[0],
				offset: match.index,
				comment: comment.text,
			});
		}
	}
}

interface DirectiveCheck {
	file: string;
	line: number;
	directive: string;
	offset: number;
	comment: string;
}

function checkDirective(check: DirectiveCheck): void {
	const negativeTypeTest =
		basename(check.file).includes(".test-d.") && check.directive === "@ts-expect-error";
	if (!negativeTypeTest) {
		fail(
			`${check.file}:${String(check.line)}: ${check.directive} is not permitted outside dedicated negative type tests`,
		);
		return;
	}
	const descriptionText = check.comment
		.slice(check.offset + check.directive.length)
		.match(/^[-\s]*([^\n]*)/);
	const description = (descriptionText?.[1] ?? "").trim();
	if (description.length < 10) {
		fail(
			`${check.file}:${String(check.line)}: @ts-expect-error needs a description of at least 10 characters`,
		);
	}
}

console.log("policy verification\nfile\tprofile\tlint\tcompiler\tformatter");
for (const row of coverage.sort()) {
	console.log(row);
}
if (failures.length > 0) {
	console.error("");
	for (const failure of failures) {
		console.error(`policy violation: ${failure}`);
	}
	process.exit(1);
}
console.log(
	`\npolicy verification ok (${String(coverage.length)} maintained files, baseline ${policyRevision ?? "unknown"})`,
);

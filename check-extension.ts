import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deepStrictEqual, rejects } from "node:assert";
import { stripVTControlCharacters } from "node:util";
import { discoverAndLoadExtensions, initTheme, ToolExecutionComponent } from "@earendil-works/pi-coding-agent";
import { ProcessTerminal, TuiMainScreen, visibleWidth } from "@earendil-works/pi-tui";
import { Value } from "typebox/value";

const agentDir = await mkdtemp(join(tmpdir(), "pi-calculator-check-"));

try {
	const loaded = await discoverAndLoadExtensions([process.cwd()], process.cwd(), agentDir);
	if (loaded.errors.length > 0) throw new Error(JSON.stringify(loaded.errors));
	if (loaded.extensions.length !== 1) throw new Error(`expected one extension, got ${loaded.extensions.length}`);

	const tools = [...loaded.extensions[0]!.tools.values()];
	if (tools.length !== 1 || tools[0]!.definition.name !== "calculator") {
		throw new Error(`unexpected registered tools: ${tools.map(({ definition }) => definition.name).join(", ")}`);
	}

	const calculator = tools[0]!.definition;
	const input = { expression: "0.1 + 0.2" };
	if (!Value.Check(calculator.parameters, input)) throw new Error("calculator schema rejected valid input");
	if (Value.Check(calculator.parameters, { expression: "1", extra: true })) throw new Error("calculator schema accepted an extra property");
	if (Value.Check(calculator.parameters, { expression: "1".repeat(4097) })) throw new Error("calculator schema accepted oversized input");
	for (const invalid of [{}, { expression: "" }, { expression: 1 }, { expression: ["1", "2"] }]) {
		if (Value.Check(calculator.parameters, invalid)) throw new Error(`calculator schema accepted ${JSON.stringify(invalid)}`);
	}

	const result = await calculator.execute("check", input, undefined, undefined, undefined as never);
	const text = result.content[0];
	if (text?.type !== "text" || text.text !== "0.3") {
		throw new Error(`unexpected calculator result: ${JSON.stringify(result)}`);
	}
	if (JSON.stringify(result.details) !== '{"expression":"0.1 + 0.2","value":"0.3"}') {
		throw new Error(`unexpected calculator details: ${JSON.stringify(result.details)}`);
	}

	const multilineInput = { expression: `1${"\n".repeat(4092)}+1` };
	if (!Value.Check(calculator.parameters, multilineInput)) throw new Error("calculator schema rejected valid multiline input");
	const multilineResult = await calculator.execute("check-multiline", multilineInput, undefined, undefined, undefined as never);
	const multilineText = multilineResult.content[0];
	if (multilineText?.type !== "text") throw new Error("multiline calculator result was not text");
	if (Buffer.byteLength(multilineText.text) > 50 * 1024 || multilineText.text.split("\n").length > 2000) {
		throw new Error("multiline calculator result exceeded Pi output limits");
	}
	if (multilineText.text !== "2") throw new Error("multiline calculator result was not value-only");

	deepStrictEqual(calculator.constrainedSampling, { type: "json_schema", strict: "prefer" });
	const guidance = calculator.promptGuidelines?.join(" ") ?? "";
	for (const phrase of ["Use calculator", "simple arithmetic does not need a tool call", "rounded decimal strings", "independent results in a flat array"]) {
		if (!guidance.includes(phrase)) throw new Error(`calculator guidance missing: ${phrase}`);
	}
	const schema = JSON.stringify(calculator.parameters);
	for (const phrase of ["percent(rate, amount)", "rate% of amount", "stdev(array) is population", "stdevs(array) is sample", "log/ln are natural", "log2/log10", "expm1(x)", "log1p(x)", "radians(degrees)", "degrees(radians)"]) {
		if (!schema.includes(phrase)) throw new Error(`calculator schema guidance missing: ${phrase}`);
	}

	const arrayInput = { expression: "[percent(15, 200), 2^64, 1e1000]" };
	const arrayResult = await calculator.execute("check-array", arrayInput, undefined, undefined, undefined as never);
	deepStrictEqual(arrayResult.content, [{ type: "text", text: '["30","18446744073709551616","1e+1000"]' }]);
	deepStrictEqual(arrayResult.details, { expression: arrayInput.expression, value: ["30", "18446744073709551616", "1e+1000"] });
	for (const expression of ["1/0", "[1,1/0]", "[1,[2]]", "min([1,1/0])"]) {
		await rejects(calculator.execute("check-invalid", { expression }, undefined, undefined, undefined as never));
	}

	initTheme("dark", false);
	const ui = new TuiMainScreen(new ProcessTerminal());
	ui.requestRender = () => {}; // Render cards below without writing to the test runner's terminal.
	let renders = 0;
	for (const expression of ["0.1 + 0.2", "1\n+\t2", "mean([1, 2, 3, 4, 5, 6, 7, 8])"]) {
		const result = await calculator.execute("check-render", { expression }, undefined, undefined, undefined as never);
		const card = new ToolExecutionComponent("calculator", "check-render", { expression }, { showImages: false }, calculator, ui, process.cwd());
		card.setArgsComplete();
		card.updateResult({ ...result, isError: false });
		for (const width of [20, 40, 80]) {
			for (const expanded of [false, true]) {
				card.setExpanded(expanded);
				const lines = card.render(width);
				if (lines.some((line) => visibleWidth(line) > width)) throw new Error("calculator rendering exceeded terminal width");
				const rendered = lines.map(stripVTControlCharacters).join("\n");
				if (!rendered.includes("calculator")) throw new Error("calculator title missing");
				if (width === 80 && !rendered.includes(JSON.stringify(expression))) throw new Error("calculator expression missing or not escaped");
				if (result.content[0]?.type !== "text" || !rendered.includes(result.content[0].text)) throw new Error("calculator rendered value missing");
				renders++;
			}
		}
	}

	console.log(`pi-calculator extension load ok (schema, strict-prefer, guidance, scalar/array content, thrown errors, ${renders} native renders)`);
} finally {
	await rm(agentDir, { recursive: true, force: true });
}

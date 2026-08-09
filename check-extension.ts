import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverAndLoadExtensions } from "@earendil-works/pi-coding-agent";
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

	const result = await calculator.execute("check", input, undefined, undefined, undefined as never);
	const text = result.content[0];
	if (text?.type !== "text" || text.text !== "0.1 + 0.2 = 0.3") {
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
	if (!multilineText.text.includes("\\n")) throw new Error("multiline calculator result did not escape line breaks");

	console.log("pi-calculator extension load ok");
} finally {
	await rm(agentDir, { recursive: true, force: true });
}

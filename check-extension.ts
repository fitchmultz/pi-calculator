import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findPackageJSON } from "node:module";
import { pathToFileURL } from "node:url";
import { deepStrictEqual, rejects } from "node:assert";
import { stripVTControlCharacters } from "node:util";
import {
	createAgentSession,
	DefaultResourceLoader,
	discoverAndLoadExtensions,
	initTheme,
	ModelRuntime,
	SessionManager,
	SettingsManager,
	ToolExecutionComponent,
	type ExtensionToolContext,
} from "@earendil-works/pi-coding-agent";
import { ProcessTerminal, TuiMainScreen, visibleWidth } from "@earendil-works/pi-tui";
import { Value } from "typebox/value";
import type {
	AssistantMessage,
	FauxContentBlock,
	FauxProviderHandle,
	RegisterFauxProviderOptions,
	ToolCall,
} from "@earendil-works/pi-ai";

/** Derived from the companion's own typings; the runtime import stays dynamic so a shrinkwrapped host resolves its own copy. */
interface PiAiFaux {
	fauxProvider: (options?: RegisterFauxProviderOptions) => FauxProviderHandle;
	fauxAssistantMessage: (
		content: string | FauxContentBlock | FauxContentBlock[],
		options?: { stopReason?: AssistantMessage["stopReason"] },
	) => AssistantMessage;
	fauxToolCall: (
		name: string,
		arguments_: ToolCall["arguments"],
		options?: { id?: string },
	) => ToolCall;
}

/** Confirm the dynamically loaded companion exposes the helpers this check drives. */
function isPiAiFaux(value: unknown): value is PiAiFaux {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const members: Record<string, unknown> = { ...value };
	return (
		typeof members["fauxProvider"] === "function" &&
		typeof members["fauxAssistantMessage"] === "function" &&
		typeof members["fauxToolCall"] === "function"
	);
}

/** Render one card at one width/expanded setting and check the visible output. */
function renderCard(
	card: ToolExecutionComponent,
	width: number,
	expanded: boolean,
	expression: string,
	value: string,
): void {
	card.setExpanded(expanded);
	const lines = card.render(width);
	if (lines.some((line) => visibleWidth(line) > width)) {
		throw new Error("calculator rendering exceeded terminal width");
	}
	const rendered = lines.map(stripVTControlCharacters).join("\n");
	if (!rendered.includes("calculator")) {
		throw new Error("calculator title missing");
	}
	if (width === 80 && !rendered.includes(JSON.stringify(expression))) {
		throw new Error("calculator expression missing or not escaped");
	}
	if (!rendered.includes(value)) {
		throw new Error("calculator rendered value missing");
	}
}

const agentDir = await mkdtemp(join(tmpdir(), "pi-calculator-check-"));

try {
	const loaded = await discoverAndLoadExtensions([process.cwd()], process.cwd(), agentDir);
	if (loaded.errors.length > 0) {
		throw new Error(JSON.stringify(loaded.errors));
	}
	const [extension] = loaded.extensions;
	if (extension === undefined) {
		throw new Error(`expected one extension, got ${loaded.extensions.length}`);
	}

	const tools = [...extension.tools.values()];
	const [registered] = tools;
	if (
		registered === undefined ||
		tools.length !== 1 ||
		registered.definition.name !== "calculator"
	) {
		throw new Error(
			`unexpected registered tools: ${tools.map(({ definition }) => definition.name).join(", ")}`,
		);
	}

	const calculator = registered.definition;
	const input = { expression: "0.1 + 0.2" };
	if (!Value.Check(calculator.parameters, input)) {
		throw new Error("calculator schema rejected valid input");
	}
	if (Value.Check(calculator.parameters, { expression: "1", extra: true })) {
		throw new Error("calculator schema accepted an extra property");
	}
	if (Value.Check(calculator.parameters, { expression: "1".repeat(4097) })) {
		throw new Error("calculator schema accepted oversized input");
	}
	for (const invalid of [{}, { expression: "" }, { expression: 1 }, { expression: ["1", "2"] }]) {
		if (Value.Check(calculator.parameters, invalid)) {
			throw new Error(`calculator schema accepted ${JSON.stringify(invalid)}`);
		}
	}

	deepStrictEqual(calculator.constrainedSampling, { type: "json_schema", strict: "prefer" });
	deepStrictEqual(calculator.annotations, { readOnlyHint: true, idempotentHint: true });
	// The declared hints are what the documented approval policy reads before confirming a call.
	if (!calculator.annotations.readOnlyHint) {
		throw new Error("calculator no longer classifies as read-only for permission policies");
	}
	const guidance = calculator.promptGuidelines?.join(" ") ?? "";
	for (const phrase of [
		"Use calculator",
		"simple arithmetic does not need a tool call",
		"rounded decimal strings",
		"independent results in a flat array",
	]) {
		if (!guidance.includes(phrase)) {
			throw new Error(`calculator guidance missing: ${phrase}`);
		}
	}
	const schema = JSON.stringify(calculator.parameters);
	for (const phrase of [
		"percent(rate, amount)",
		"rate% of amount",
		"stdev(array) is population",
		"stdevs(array) is sample",
		"log/ln are natural",
		"log2/log10",
		"expm1(x)",
		"log1p(x)",
		"radians(degrees)",
		"degrees(radians)",
	]) {
		if (!schema.includes(phrase)) {
			throw new Error(`calculator schema guidance missing: ${phrase}`);
		}
	}

	initTheme("dark", false);
	const ui = new TuiMainScreen(new ProcessTerminal());
	ui.requestRender = () => {
		// Cards are rendered below without writing to the test runner's terminal.
	};
	let renders = 0;
	const widthsAndExpansion = [20, 40, 80].flatMap((width) =>
		[false, true].map((expanded) => [width, expanded] as const),
	);

	// Resolve the companion from the physical SDK (Pi 1.0 shrinkwrap nests it).
	const sdkPackageJson = findPackageJSON(
		"@earendil-works/pi-ai",
		import.meta.resolve("@earendil-works/pi-coding-agent"),
	);
	if (sdkPackageJson === undefined) {
		throw new Error("could not locate the pi-ai companion inside the resolved SDK");
	}
	const companion: unknown = await import(
		new URL("./dist/index.js", pathToFileURL(sdkPackageJson)).href
	);
	if (!isPiAiFaux(companion)) {
		throw new Error("pi-ai companion is missing its faux helpers");
	}
	const faux = companion.fauxProvider({ provider: "calculator-fixture" });
	const runtime = await ModelRuntime.create({
		authPath: join(agentDir, "auth.json"),
		modelsPath: null,
		modelsStorePath: join(agentDir, "models.json"),
		allowModelNetwork: false,
		refreshOnCreate: false,
	});
	runtime.registerNativeProvider(faux.provider);
	const outcomes: Awaited<ReturnType<ExtensionToolContext["executeTool"]>>[] = [];
	let toolContext: ExtensionToolContext | undefined;
	const settings = SettingsManager.inMemory({
		compaction: { enabled: false },
		retry: { enabled: false },
	});
	const loader = new DefaultResourceLoader({
		cwd: process.cwd(),
		agentDir,
		settingsManager: settings,
		noExtensions: true,
		noSkills: true,
		noPromptTemplates: true,
		noThemes: true,
		noContextFiles: true,
		extensionFactories: [
			(pi) => {
				pi.registerTool(calculator);
				pi.on("tool_call", (event) => {
					if (event.toolCallId === "compose/5") {
						return { block: true, reason: "fixture policy denied" };
					}
					return { block: false };
				});
				pi.registerTool({
					name: "compose",
					label: "compose",
					description: "Native receipt fixture",
					parameters: { type: "object", properties: {}, additionalProperties: false },
					async execute(_id, _args, _signal, _update, ctx) {
						toolContext = ctx;
						for (const args of [
							{ expression: "0.1 + 0.2" },
							{ expression: "[2^64, 1e1000]" },
							{ expression: "1/0" },
							{ expression: "1", extra: true },
							{ expression: "2+2" },
						]) {
							outcomes.push(await ctx.executeTool("calculator", args));
						}
						return {
							content: [{ type: "text", text: "composed" }],
							details: undefined,
						};
					},
				});
			},
		],
	});
	await loader.reload({ resolveProjectTrust: async () => false });
	deepStrictEqual(loader.getExtensions().errors, []);
	const { session } = await createAgentSession({
		cwd: process.cwd(),
		agentDir,
		resourceLoader: loader,
		modelRuntime: runtime,
		model: faux.getModel(),
		settingsManager: settings,
		sessionManager: SessionManager.inMemory(process.cwd()),
		noTools: "builtin",
	});
	try {
		await session.bindExtensions({
			mode: "print",
			onError: (error) => {
				throw new Error(error.error);
			},
		});
		faux.setResponses([
			companion.fauxAssistantMessage(
				companion.fauxToolCall("compose", {}, { id: "compose" }),
				{
					stopReason: "toolUse",
				},
			),
			companion.fauxAssistantMessage("done"),
		]);
		await session.prompt("Check native composition without network.");
		await session.waitForIdle();
		deepStrictEqual(
			outcomes.map((outcome) => outcome.isError),
			[false, false, true, true, true],
		);
		const [firstOutcome, secondOutcome] = outcomes;
		if (firstOutcome === undefined || secondOutcome === undefined) {
			throw new Error(`expected nested outcomes, got ${outcomes.length}`);
		}
		deepStrictEqual(firstOutcome.result.structuredContent, {
			expression: "0.1 + 0.2",
			value: "0.3",
		});
		deepStrictEqual(secondOutcome.result.structuredContent, {
			expression: "[2^64, 1e1000]",
			value: ["18446744073709551616", "1e+1000"],
		});
		const textOf = (index: number) => {
			const outcome = outcomes[index];
			if (outcome === undefined) {
				throw new Error(`expected a nested outcome at ${index}`);
			}
			return outcome.result.content
				.filter((block) => block.type === "text")
				.map((block) => block.text)
				.join("\n");
		};
		if (
			!textOf(2).includes("division by zero") ||
			!textOf(3).includes("extra") ||
			!textOf(4).includes("fixture policy denied")
		) {
			throw new Error(
				"native calculator failures lost their validation/evaluation/policy distinctions",
			);
		}

		// Direct calls run through the context the harness handed the fixture tool.
		const context = toolContext;
		if (context === undefined) {
			throw new Error("fixture tool did not receive a tool context");
		}
		const result = await calculator.execute("check", input, undefined, undefined, context);
		const text = result.content[0];
		if (text?.type !== "text" || text.text !== "0.3") {
			throw new Error(`unexpected calculator result: ${JSON.stringify(result)}`);
		}
		if (JSON.stringify(result.details) !== '{"expression":"0.1 + 0.2","value":"0.3"}') {
			throw new Error(`unexpected calculator details: ${JSON.stringify(result.details)}`);
		}

		const multilineInput = { expression: `1${"\n".repeat(4092)}+1` };
		deepStrictEqual(result.structuredContent, { expression: "0.1 + 0.2", value: "0.3" });
		if (
			!calculator.outputSchema ||
			!Value.Check(calculator.outputSchema, result.structuredContent)
		) {
			throw new Error("calculator output schema rejected its scalar receipt");
		}
		if (!Value.Check(calculator.parameters, multilineInput)) {
			throw new Error("calculator schema rejected valid multiline input");
		}
		const multilineResult = await calculator.execute(
			"check-multiline",
			multilineInput,
			undefined,
			undefined,
			context,
		);
		const multilineText = multilineResult.content[0];
		if (multilineText?.type !== "text") {
			throw new Error("multiline calculator result was not text");
		}
		if (multilineText.text !== "2") {
			throw new Error("multiline calculator result was not value-only");
		}

		const arrayInput = { expression: "[percent(15, 200), 2^64, 1e1000]" };
		const arrayResult = await calculator.execute(
			"check-array",
			arrayInput,
			undefined,
			undefined,
			context,
		);
		deepStrictEqual(arrayResult.content, [
			{ type: "text", text: '["30","18446744073709551616","1e+1000"]' },
		]);
		deepStrictEqual(arrayResult.details, {
			expression: arrayInput.expression,
			value: ["30", "18446744073709551616", "1e+1000"],
		});
		deepStrictEqual(arrayResult.structuredContent, arrayResult.details);
		if (!Value.Check(calculator.outputSchema, arrayResult.structuredContent)) {
			throw new Error("calculator output schema rejected its array receipt");
		}
		for (const expression of ["1/0", "[1,1/0]", "[1,[2]]", "min([1,1/0])"]) {
			await rejects(
				calculator.execute("check-invalid", { expression }, undefined, undefined, context),
			);
		}

		for (const expression of ["0.1 + 0.2", "1\n+\t2", "mean([1, 2, 3, 4, 5, 6, 7, 8])"]) {
			const cardResult = await calculator.execute(
				"check-render",
				{ expression },
				undefined,
				undefined,
				context,
			);
			const card = new ToolExecutionComponent(
				"calculator",
				"check-render",
				{ expression },
				{ showImages: false },
				calculator,
				ui,
				process.cwd(),
			);
			card.setArgsComplete();
			card.updateResult({ ...cardResult, isError: false });
			const renderedValue = cardResult.content[0];
			if (renderedValue === undefined || renderedValue.type !== "text") {
				throw new Error("calculator rendered value missing");
			}
			for (const [width, expanded] of widthsAndExpansion) {
				renderCard(card, width, expanded, expression, renderedValue.text);
				renders++;
			}
		}
	} finally {
		session.dispose();
	}
	console.log(
		`pi-calculator extension load ok (schema, scalar/array structured receipts, native nested errors/policy, ${renders} native renders)`,
	);
} finally {
	await rm(agentDir, { recursive: true, force: true });
}

import { Type } from "typebox";
import { Text } from "@earendil-works/pi-tui";
import { defineTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { DECIMAL_PRECISION } from "./decimal.ts";
import { evaluateExpression, MAX_EXPRESSION_LENGTH } from "./eval.ts";

const calculatorTool = defineTool({
	name: "calculator",
	label: "Calculator",
	description: `Calculate arithmetic, scientific functions and statistics with ${DECIMAL_PRECISION}-significant-digit decimal precision. Returns one number or a flat array of numbers.`,
	promptSnippet: "Calculate numeric answers and verify arithmetic",
	promptGuidelines: [
		"Use calculator for non-trivial calculations; simple arithmetic does not need a tool call. Results are rounded decimal strings. In calculator expressions, use sum([...]) for totals and roundTo(value, places) for requested rounding. Put independent results in a flat array.",
	],
	constrainedSampling: { type: "json_schema", strict: "prefer" },
	parameters: Type.Object(
		{
			expression: Type.String({
				minLength: 1,
				maxLength: MAX_EXPRESSION_LENGTH,
				description: "Numeric expression: + - * / % ^ **, PI, E, roots, trig, n! (0–1000), sum/mean/median. log/ln are natural; log2/log10 choose a base. Use expm1(x) for exp(x)-1 and log1p(x) for ln(1+x) when x is small. Trig uses radians; radians(degrees) and degrees(radians) convert angles. percent(rate, amount) gives rate% of amount. stdev(array) is population; stdevs(array) is sample. roundTo(value, places) rounds halves away from zero.",
			}),
		},
		{ additionalProperties: false },
	),
	renderCall(args, theme) {
		return new Text(theme.fg("toolTitle", theme.bold("calculator ")) + theme.fg("dim", JSON.stringify(args.expression ?? "")), 0, 0);
	},
	async execute(_toolCallId, params) {
		const evaluated = evaluateExpression(params.expression);
		const text = Array.isArray(evaluated.value) ? JSON.stringify(evaluated.value) : evaluated.value;
		return {
			content: [{ type: "text", text }],
			details: evaluated,
		};
	},
});

export default function (pi: ExtensionAPI) {
	pi.registerTool(calculatorTool);
}

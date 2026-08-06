import { Type } from "typebox";
import { defineTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { evaluateExpression, MAX_EXPRESSION_LENGTH } from "./eval.ts";

const calculatorTool = defineTool({
	name: "calculator",
	label: "Calculator",
	description: "Evaluate numeric and scientific expressions deterministically.",
	promptSnippet: "Evaluate arithmetic, factorials, percentages, roots, logs, trig, and simple stats",
	promptGuidelines: [
		"Use calculator for any non-trivial math instead of computing in prose.",
		"Calculator uses decimal.js with 40-digit precision for arithmetic, trig, logs, roots, and stats.",
		"Calculator powers use `^` or `**`; constants are PI and E; natural log is log() or ln(); base 10 is log10().",
		"Calculator trig uses radians; convert with deg(90) or multiply degrees by PI/180.",
		"Calculator accepts percentages as `200 * 15 / 100` or `percent(15, 200)`.",
		"Calculator factorials use `n!` or `fac(n)` for integers from 0 through 1000, sharing a 1000-step budget per expression.",
		"Calculator stats include mean([...]), median([...]), stdev([...]) for population, and stdevs([...]) for sample.",
	],
	parameters: Type.Object({
		expression: Type.String({
			minLength: 1,
			maxLength: MAX_EXPRESSION_LENGTH,
			description: "Math expression, e.g. '(12.5 * 1.0825) ^ 3', '10!', 'sqrt(144)', 'sin(PI/4)', 'mean([2,4,6,8])",
		}),
	}),
	async execute(_toolCallId, params) {
		const { expression } = params;
		const evaluated = evaluateExpression(expression);
		const displayExpression = JSON.stringify(evaluated.expression).slice(1, -1);
		return {
			content: [{ type: "text", text: `${displayExpression} = ${evaluated.formatted}` }],
			details: evaluated,
		};
	},
});

export default function (pi: ExtensionAPI) {
	pi.registerTool(calculatorTool);
}

import { Type } from "typebox";
import { defineTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { DECIMAL_PRECISION } from "./decimal.ts";
import { evaluateExpression, MAX_EXPRESSION_LENGTH } from "./eval.ts";

const calculatorTool = defineTool({
	name: "calculator",
	label: "Calculator",
	description: "Evaluate numeric and scientific expressions deterministically.",
	promptSnippet: "Evaluate arithmetic, factorials, percentages, roots, logs, trig, and simple stats",
	promptGuidelines: [
		"Use calculator for non-trivial math instead of computing in prose.",
		"Calculator rounds input literals to 40-digit precision and returns exact decimal strings; do not recompute its output. Use ^ or ** for powers, PI and E for constants, and log()/ln(), log2(), or log10() for logarithms.",
		"Calculator trig uses radians; deg(90) converts degrees to radians, while rad(PI) converts radians to degrees.",
		"Calculator supports percent(value, of), n!/fac(n) through 1000, and mean/median/stdev/stdevs arrays; expensive operations use per-expression work budgets.",
	],
	parameters: Type.Object(
		{
			expression: Type.String({
				minLength: 1,
				maxLength: MAX_EXPRESSION_LENGTH,
				description: "Math expression, e.g. '(12.5 * 1.0825) ^ 3', '10!', 'sqrt(144)', 'sin(PI/4)', 'mean([2,4,6,8])'",
			}),
		},
		{ additionalProperties: false },
	),
	async execute(_toolCallId, params) {
		const evaluated = evaluateExpression(params.expression);
		const displayExpression = JSON.stringify(evaluated.expression).slice(1, -1);
		return {
			content: [{ type: "text", text: `${displayExpression} = ${evaluated.value}` }],
			details: evaluated,
		};
	},
});

export default function (pi: ExtensionAPI) {
	pi.registerTool(calculatorTool);
}

import { evaluateExpression } from "./eval.ts";

const cases: Array<[string, string]> = [
	["2 + 2", "4"],
	["0.1 + 0.2", "0.3"],
	[".5 + .25", "0.75"],
	["1.e5", "100000"],
	["2^64", "18446744073709551616"],
	["2^3^2", "512"],
	["-2^2", "-4"],
	["2^-2", "0.25"],
	["(12.5 * 1.0825) ^ 3", "2477.500518798828125"],
	["(12.5 * 1.0825) ** 3", "2477.500518798828125"],
	["sqrt(144)", "12"],
	["sin(PI/2)", "1"],
	["sin(deg(90))", "1"],
	["sinh(0) + cosh(0) + tanh(0)", "1"],
	["asinh(0) + acosh(1) + atanh(0)", "0"],
	["expm1(0) + log1p(0)", "0"],
	["expm1(1e-20)", "1.000000000000000000005e-20"],
	["expm1(-1e-20)", "-9.99999999999999999995e-21"],
	["log1p(1e-20)", "9.99999999999999999995e-21"],
	["log10(1000) + lg(1000) + log2(8)", "9"],
	["trunc(-2.9)", "-2"],
	["sign(-5)", "-1"],
	["pow(2, 10)", "1024"],
	["atan2(0, 1)", "0"],
	["5!", "120"],
	["(-0)!", "1"],
	["43!", "6.041526306337383563735513206851399750726e+52"],
	["mean([2,4,6,8])", "5"],
	["mean(['1','2'])", "1.5"],
	["median([1,9,2,8,3])", "3"],
	["stdev([2,4,4,4,5,5,7,9])", "2"],
	["stdevs([2,4,4,4,5,5,7,9])", "2.138089935299395077476427847038028172432"],
	["sum([1,2,3])", "6"],
	["min([3,1,2])", "1"],
	["max([3,1,2])", "3"],
	["[1,2,3][2]", "3"],
	["percent(15, 200)", "30"],
	["200 * 15 / 100", "30"],
	["roundTo(0.1 + 0.2, 1)", "0.3"],
	["roundTo(125, -1)", "130"],
	["ln(1000)", "6.907755278982137052053974364053092622803"],
	["exp(ln(1000))", "999.9999999999999999999999999999999999997"],
	["E", "2.718281828459045235360287471352662497757"],
	["rad(PI)", "180"],
	["median([999999999999999, 1000000000000000, 1000000000000001])", "1000000000000000"],
	["hypot(3, 4)", "5"],
	["pyt(3, 4, 12)", "13"],
];

for (const [expression, expected] of cases) {
	const { value } = evaluateExpression(expression);
	if (value !== expected) throw new Error(`expected ${expected} for "${expression}", got ${value}`);
}

function expectFailure(expression: string, expectedMessage?: string): void {
	try {
		evaluateExpression(expression);
	} catch (error) {
		if (!(error instanceof Error)) throw error;
		if (expectedMessage && !error.message.includes(expectedMessage)) {
			throw new Error(`expected "${expectedMessage}" for "${expression.slice(0, 40)}", got "${error.message}"`);
		}
		return;
	}
	throw new Error(`expected failure for: ${expression.slice(0, 40)}`);
}

for (const [expression, message] of [
	["", "Expression is empty"],
	["({}).constructor", "Unknown character"],
	["random()", "undefined variable: random"],
	["1 < 2", "Unknown character"],
	["1 ? 2 : 3", "Unknown character"],
	["if(1,2,3)", "undefined variable: if"],
	["gamma(5)", "undefined variable: gamma"],
	["length(5)", "undefined variable: length"],
	["map(sqrt,[1,4])", "undefined variable: map"],
	["PI.d", "member access is not permitted"],
	["2 + * 3", "unexpected *"],
	["mean([1,2,)", "unexpected )"],
	["sqrt(", "unexpected EOF"],
	["fac(5, 6)", "fac() needs exactly 1 argument"],
	["mean([1,2], [3,4])", "mean() needs exactly 1 argument"],
	["roundTo(1.5, 2.7)", "roundTo() digits must be an integer"],
	["[1,2][1.5]", "array index needs an integer"],
	["[1,2][2]", "array index out of range"],
	['d("1\\"2")', "invalid decimal literal"],
	['d("1**2")', "invalid decimal literal"],
	['d("0x10")', "invalid decimal literal"],
	["a".repeat(5000), "Expression too long"],
] as const) {
	expectFailure(expression, message);
}

const rejectionStarted = performance.now();
expectFailure("999999999999!", "factorial operand too large");
expectFailure(`[${Array(1001).fill("0!").join(",")}]`, "factorial work budget exceeded");
const rejectionMs = performance.now() - rejectionStarted;
if (rejectionMs > 1000) throw new Error(`factorial rejection took ${rejectionMs.toFixed(0)}ms`);

expectFailure(`${"(".repeat(2047)}1${")".repeat(2047)}`, "expression is too deeply nested");

const hugeFinite = evaluateExpression("1e1000");
const roundTripped = JSON.parse(JSON.stringify(hugeFinite)) as typeof hugeFinite;
if (roundTripped.value !== hugeFinite.value) throw new Error("large finite result did not round-trip safely through JSON");

const largePower = evaluateExpression("2^1000000");
if (largePower.value.length > 50_000 || !largePower.value.includes("e+")) {
	throw new Error(`large power was not safely formatted (${largePower.value.length} chars)`);
}

const largeLiteral = evaluateExpression("1".repeat(4000));
if (Buffer.byteLength(JSON.stringify(largeLiteral)) > 9000) throw new Error("evaluation details are unexpectedly large");

if (!evaluateExpression("1000!").value) throw new Error("expected 1000! to remain supported");
expectFailure("fac(1001)", "factorial operand too large");
if (evaluateExpression("5!").value !== "120") throw new Error("factorial budget leaked across evaluations");

console.log(`pi-calculator check ok (${cases.length} exact cases)`);

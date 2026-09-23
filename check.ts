import { deepStrictEqual } from "node:assert";
import DecimalBase from "decimal.js";
import { DECIMAL_PRECISION, Decimal as CalculatorDecimal, MAX_EXPRESSION_DEPTH } from "./decimal.ts";
import { evaluateExpression } from "./eval.ts";

const cases: Array<[string, string | string[]]> = [
	["[0.1 + 0.2, 2^64, 1e1000]", ["0.3", "18446744073709551616", "1e+1000"]],
	["[stdev([2,4,4,4,5,5,7,9]), stdevs([2,4,4,4,5,5,7,9])]", ["2", "2.138089935299395077476427847038028172432"]],
	["[]", []],
	["2 + 2", "4"],
	["0.1 + 0.2", "0.3"],
	[".5 + .25", "0.75"],
	["1.e5", "100000"],
	["2^64", "18446744073709551616"],
	["2^3^2", "512"],
	["-2^2", "-4"],
	["2^-2", "0.25"],
	["1e10000 % 3", "1"],
	["(12.5 * 1.0825) ^ 3", "2477.500518798828125"],
	["(12.5 * 1.0825) ** 3", "2477.500518798828125"],
	["sqrt(144)", "12"],
	["sin(PI/2)", "1"],
	["sin(radians(90))", "1"],
	["sinh(0) + cosh(0) + tanh(0)", "1"],
	["tanh(10000)", "1"],
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
	["percent(100, 1e9000000000000000)", "1e+9000000000000000"],
	["percent(1e9000000000000000, 100)", "1e+9000000000000000"],
	["percent(1e-9000000000000000, 1e9000000000000000)", "0.01"],
	["percent(1e9000000000000000, 1e-9000000000000000)", "0.01"],
	["log(1000)", "6.907755278982137052053974364053092622803"],
	["roundTo(-1.25, 1)", "-1.3"],
	["log1p(-1e-20)", "-1.000000000000000000005e-20"],
	["200 * 15 / 100", "30"],
	["roundTo(0.1 + 0.2, 1)", "0.3"],
	["roundTo(125, -1)", "130"],
	["ln(1000)", "6.907755278982137052053974364053092622803"],
	["exp(ln(1000))", "999.9999999999999999999999999999999999997"],
	["E", "2.718281828459045235360287471352662497757"],
	["degrees(PI)", "180"],
	["median([999999999999999, 1000000000000000, 1000000000000001])", "1000000000000000"],
	["hypot(3, 4)", "5"],
	["hypot([3, 4])", "5"],
	["pyt(3, 4, 12)", "13"],
	["tanh(5000) + tanh(5000)", "2"],
	// Independent reference: bc -l, scale=110, s(x)/c(x), rounded to 40 digits.
	["tan(1.57079632679489661923132169163)", "1.025489348026931872432865985654439073718e+29"],
	["tan(-1.57079632679489661923132169163)", "-1.025489348026931872432865985654439073718e+29"],
	["stdev([2/3,2/3])", "0"],
	["stdevs([2/3,2/3])", "0"],
	["stdev([-1e-5000000000000000,1e-5000000000000000])", "1e-5000000000000000"],
	["stdevs([-1e-5000000000000000,0,1e-5000000000000000])", "1e-5000000000000000"],
	["stdev([-1e5000000000000000,1e5000000000000000])", "1e+5000000000000000"],
	["stdevs([-1e5000000000000000,0,1e5000000000000000])", "1e+5000000000000000"],
	["stdevs([9e9000000000000000,0,-9e9000000000000000])", "9e+9000000000000000"],
	["stdevs([0,9e9000000000000000,-9e9000000000000000])", "9e+9000000000000000"],
	["stdev([-9e9000000000000000,9e9000000000000000])", "9e+9000000000000000"],
	["stdevs([9e9000000000000000,9e9000000000000000,9e9000000000000000,-9e9000000000000000])", "9e+9000000000000000"],
	["stdev([1e39,1e39+1])", "0.5"],
	["stdevs([1e39,1e39+1])", "0.7071067811865475244008443621048490392848"],
	["sum([1e40,1,-1e40])", "1"],
	["sum([1e1000,1,-1e1000])", "1"],
	["mean([1e40,1,-1e40])", "0.3333333333333333333333333333333333333333"],
	["mean([1e1000,1,-1e1000])", "0.3333333333333333333333333333333333333333"],
	["mean([2/3,2/3])", "0.6666666666666666666666666666666666666667"],
	["median([2/3,2/3])", "0.6666666666666666666666666666666666666667"],
	["sum([1e1000000000,1,-1e1000000000])", "1"],
	["sum([1,5e-40,-2e-100,1.5e-100,1.5e-100])", "1.000000000000000000000000000000000000001"],
	["sum([1,5e-40,2e-100,-1.5e-100,-1.5e-100])", "1"],
	["mean([3,1.5e-39,-1e-100])", "1"],
	["sum([9e9000000000000000,9e9000000000000000,-9e9000000000000000])", "9e+9000000000000000"],
	["mean([9e9000000000000000,9e9000000000000000])", "9e+9000000000000000"],
	[`sum([${Array(10).fill("1.1e-9000000000000000,-1e-9000000000000000").join(",")}])`, "1e-9000000000000000"],
];

for (const [expression, expected] of cases) {
	const { value } = evaluateExpression(expression);
	deepStrictEqual(value, expected, `unexpected result for "${expression}"`);
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
	["[1,[2]]", "did not evaluate to a number"],
	['[1,"2"]', "did not evaluate to a number"],
	['"2"', "did not evaluate to a number"],
	["[1,1/0]", "Result is Infinity"],
	["[1,-1/0]", "Result is -Infinity"],
	["[1,sqrt(-1)]", "Result is NaN"],
	["1/0", "Result is Infinity"],
	["sqrt(-1)", "Result is NaN"],
	["deg(90)", "undefined variable: deg"],
	["rad(PI)", "undefined variable: rad"],
	["radians(90, 180)", "radians() needs exactly 1 argument"],
	["degrees(PI, PI)", "degrees() needs exactly 1 argument"],
	["({}).constructor", "Unknown character"],
	["random()", "undefined variable: random"],
	["1 < 2", "Unknown character"],
	["1 ? 2 : 3", "Unknown character"],
	["if(1,2,3)", "undefined variable: if"],
	["gamma(5)", "undefined variable: gamma"],
	["length(5)", "undefined variable: length"],
	["map(sqrt,[1,4])", "undefined variable: map"],
	["constructor(1)", "prototype access detected"],
	["toString()", "undefined variable: toString"],
	["hasOwnProperty(1)", "undefined variable: hasOwnProperty"],
	["PI.d", "member access is not permitted"],
	["hypot()", "hypot() needs at least one number"],
	["2 + * 3", "unexpected *"],
	["mean([1,2,)", "unexpected )"],
	["sqrt(", "unexpected EOF"],
	["fac(5, 6)", "fac() needs exactly 1 argument"],
	["mean([1,2], [3,4])", "mean() needs exactly 1 argument"],
	['mean(["0x10"])', "mean(): invalid number at index 0"],
	["median([sqrt(-1),1,2])", "median(): invalid number at index 0"],
	["median([1,2,sqrt(-1)])", "median(): invalid number at index 2"],
	["median([1,1/0,2])", "median(): invalid number at index 1"],
	["mean([1,1/0])", "mean(): invalid number at index 1"],
	['min("0x10")', "min(): invalid number at index 0"],
	["min([1,1/0])", "min(): invalid number at index 1"],
	["max(1,-1/0)", "max(): invalid number at index 1"],
	["hypot(1,1/0)", "hypot(): invalid number at index 1"],
	["min([sqrt(-1),1])", "min(): invalid number at index 0"],
	["sum([1,1/0])", "sum(): invalid number at index 1"],
	["stdev([1,1/0])", "stdev(): invalid number at index 1"],
	["stdevs([1,1/0])", "stdevs(): invalid number at index 1"],
	["roundTo(1.5, 2.7)", "roundTo() digits must be an integer"],
	["[1,2][1.5]", "array index needs an integer"],
	['[1,2]["constructor"]', "array index needs an integer"],
	['[1,2]["0x1"]', "array index needs an integer"],
	["[1,2][2]", "array index out of range"],
	['d("1\\"2")', "escape sequences are not supported"],
	['d("1**2")', "invalid decimal literal"],
	['d("0x10")', "invalid decimal literal"],
	["1e9999999999999999", "decimal literal overflow"],
	[`9.${"9".repeat(41)}e9000000000000000`, "decimal literal overflow"],
	["1e-9999999999999999", "decimal literal underflow"],
	["1/* **/ +1", "comments are not supported"],
	["1/**/+1", "comments are not supported"],
	['mean(["1\\\\","2"])', "escape sequences are not supported"],
	["1;2", "multiple expressions are not supported"],
	["a".repeat(5000), "Expression too long"],
] as const) {
	expectFailure(expression, message);
}

const arrayResult = evaluateExpression(`[${Array(1000).fill("PI").join(",")}]`);
if (!Array.isArray(arrayResult.value) || arrayResult.value.length !== 1000) {
	throw new Error("finite array result was truncated");
}
if (Buffer.byteLength(JSON.stringify(arrayResult)) > 50 * 1024) throw new Error("array result exceeded 50 KiB");
expectFailure(`[${Array(1200).fill("PI").join(",")}]`, "Result exceeds 50 KiB output limit");

const rejectionStarted = performance.now();
expectFailure("999999999999!", "factorial operand too large");
expectFailure(`[${Array(1001).fill("0!").join(",")}]`, "factorial work budget exceeded");
const rejectionMs = performance.now() - rejectionStarted;
if (rejectionMs > 1000) throw new Error(`factorial rejection took ${rejectionMs.toFixed(0)}ms`);

if (evaluateExpression(`${"(".repeat(MAX_EXPRESSION_DEPTH)}1${")".repeat(MAX_EXPRESSION_DEPTH)}`).value !== "1") {
	throw new Error("expression at the nesting limit failed");
}
expectFailure(
	`${"(".repeat(MAX_EXPRESSION_DEPTH + 1)}1${")".repeat(MAX_EXPRESSION_DEPTH + 1)}`,
	"expression is too deeply nested",
);

const moduloRejectionStarted = performance.now();
expectFailure("1e10001 % 3", "modulo exponent gap too large");
expectFailure("1 % 1e-10001", "modulo exponent gap too large");
expectFailure("1e6000 % 3 + 1e5000 % 3", "expression work budget exceeded");
if (performance.now() - moduloRejectionStarted > 1000) {
	throw new Error("large modulo rejection exceeded 1 second");
}

const trigRejectionStarted = performance.now();
expectFailure("sin(1e101)", "sin() argument too large");
expectFailure("sin(2^400)", "sin() argument too large");
expectFailure(Array(372).fill("sin(9e972)").join("+"), "sin() argument too large");
expectFailure(Array(101).fill("sin(1e100)").join("+"), "expression work budget exceeded");
expectFailure(Array(101).fill("atan2(1, 1)").join("+"), "expression work budget exceeded");
if (performance.now() - trigRejectionStarted > 1000) throw new Error("large trig rejection exceeded 1 second");
if (evaluateExpression("sin(1)").value !== "0.8414709848078965066525023216302989996226") {
	throw new Error("trig work budget leaked after a failed evaluation");
}

const hyperbolicRejectionStarted = performance.now();
expectFailure("cosh(10001)", "cosh() argument too large");
expectFailure("asinh(1e10000)", "asinh() argument too large");
expectFailure("tanh(6000) + tanh(5000)", "expression work budget exceeded");
if (performance.now() - hyperbolicRejectionStarted > 1000) {
	throw new Error("large hyperbolic rejection exceeded 1 second");
}

expectFailure("tan(1e1000000)", "tan() argument too large");
if (CalculatorDecimal.precision !== DECIMAL_PRECISION || CalculatorDecimal.toExpPos !== 21) {
	throw new Error("calculator Decimal configuration leaked after a failed evaluation");
}
if (evaluateExpression("2/3").value !== "0.6666666666666666666666666666666666666667") {
	throw new Error("failed evaluation corrupted subsequent calculator precision");
}

DecimalBase.set({ precision: 5, toExpPos: 100_000 });
try {
	if (evaluateExpression("1/3").value !== "0.3333333333333333333333333333333333333333") {
		throw new Error("external decimal.js precision leaked into the calculator");
	}
	if (evaluateExpression("1e60000").value !== "1e+60000") {
		throw new Error("external decimal.js formatting leaked into the calculator");
	}
} finally {
	DecimalBase.set({ defaults: true });
}

const hugeFinite = evaluateExpression("1e1000");
const roundTripped = JSON.parse(JSON.stringify(hugeFinite)) as typeof hugeFinite;
if (roundTripped.value !== hugeFinite.value) throw new Error("large finite result did not round-trip safely through JSON");

const largePower = evaluateExpression("2^1000000");
if (largePower.value.length > 50_000 || !largePower.value.includes("e+")) {
	throw new Error(`large power was not safely formatted (${largePower.value.length} chars)`);
}

const largeLiteral = evaluateExpression("1".repeat(4000));
if (largeLiteral.value !== `1.${"1".repeat(39)}e+3999`) throw new Error("large literal was not rounded to 40 digits");
if (Buffer.byteLength(JSON.stringify(largeLiteral)) > 9000) throw new Error("evaluation details are unexpectedly large");

const longNines = `0.${"9".repeat(4000)}`;
const longInputStarted = performance.now();
if (evaluateExpression(`tanh(${longNines})`).value !== evaluateExpression("tanh(1)").value) {
	throw new Error("long tanh input was not rounded before evaluation");
}
if (evaluateExpression(`cbrt(${longNines})`).value !== "1") {
	throw new Error("long cbrt input was not rounded before evaluation");
}
if (performance.now() - longInputStarted > 1000) throw new Error("long numeric inputs exceeded 1 second");

if (!evaluateExpression("1000!").value) throw new Error("expected 1000! to remain supported");
expectFailure("fac(1001)", "factorial operand too large");
if (evaluateExpression("5!").value !== "120") throw new Error("factorial budget leaked across evaluations");

console.log(`pi-calculator check ok (${cases.length} exact cases)`);

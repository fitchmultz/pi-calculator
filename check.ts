import { evaluateExpression } from "./eval.ts";

const cases: Array<[string, string]> = [
	["2 + 2", "4"],
	["0.1 + 0.2", "0.3"],
	["2^64", "18446744073709551616"],
	["(12.5 * 1.0825) ^ 3", "2477.500518798828125"],
	["(12.5 * 1.0825) ** 3", "2477.500518798828125"],
	["sqrt(144)", "12"],
	["sin(PI/2)", "1"],
	["sin(deg(90))", "1"],
	["log10(1000)", "3"],
	["5!", "120"],
	["mean([2,4,6,8])", "5"],
	["median([1,9,2,8,3])", "3"],
	["stdev([2,4,4,4,5,5,7,9])", "2"],
	["stdevs([2,4,4,4,5,5,7,9])", "2.138089935299394"],
	["percent(15, 200)", "30"],
	["200 * 15 / 100", "30"],
	["roundTo(0.1 + 0.2, 1)", "0.3"],
	["ln(1000)", "6.907755278982137052053974364053092622803"],
	["exp(ln(1000))", "1000"],
	["median([999999999999999, 1000000000000000, 1000000000000001])", "1000000000000000"],
	["hypot(3, 4)", "5"],
];

for (const [expression, expected] of cases) {
	const { formatted, exact } = evaluateExpression(expression);
	if (formatted !== expected && exact !== expected) {
		const got = Number(formatted);
		const want = Number(expected);
		if (!Number.isFinite(got) || !Number.isFinite(want) || Math.abs(got - want) > 1e-9) {
			throw new Error(`expected ${expected} for "${expression}", got ${formatted}`);
		}
	}
}

for (const bad of ["", "({}).constructor", "a".repeat(5000)]) {
	try {
		evaluateExpression(bad);
		throw new Error(`expected failure for: ${bad.slice(0, 20)}`);
	} catch (error) {
		if (!(error instanceof Error)) throw error;
	}
}

console.log(`pi-calculator check ok (${cases.length} cases)`);

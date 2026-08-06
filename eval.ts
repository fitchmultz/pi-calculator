import { Parser } from "expr-eval-fork";
import Decimal from "decimal.js";
import { isDecVal, toDec, toNum, wrap, wrapNumericLiterals } from "./decimal.ts";

const decimalUnary: Record<string, (x: Decimal) => Decimal> = {
	sin: (x) => Decimal.sin(x),
	cos: (x) => Decimal.cos(x),
	tan: (x) => Decimal.tan(x),
	asin: (x) => Decimal.asin(x),
	acos: (x) => Decimal.acos(x),
	atan: (x) => Decimal.atan(x),
	sqrt: (x) => Decimal.sqrt(x),
	abs: (x) => Decimal.abs(x),
	ln: (x) => Decimal.ln(x),
	log: (x) => Decimal.ln(x),
	log10: (x) => Decimal.log10(x),
	log2: (x) => Decimal.log2(x),
	exp: (x) => Decimal.exp(x),
	ceil: (x) => Decimal.ceil(x),
	floor: (x) => Decimal.floor(x),
	round: (x) => Decimal.round(x),
	cbrt: (x) => Decimal.cbrt(x),
};

export const MAX_EXPRESSION_LENGTH = 4096;
const MAX_FACTORIAL_OPERAND = 1000;
// One max-sized factorial (or many smaller ones) per evaluation.
const MAX_FACTORIAL_WORK = MAX_FACTORIAL_OPERAND;

let factorialWorkLeft = 0;

const parser = new Parser({
	operators: {
		assignment: false,
		concatenate: false,
	},
});

parser.functions.d = (literal: unknown) => {
	if (typeof literal !== "string") throw new Error("invalid decimal literal");
	return wrap(new Decimal(literal));
};

parser.consts.PI = wrap(new Decimal("3.141592653589793238462643383279502884197"));
parser.consts.E = wrap(new Decimal("2.718281828459045235360287471352662497"));

parser.binaryOps["+"] = (a, b) => wrap(toDec(a).plus(toDec(b)));
parser.binaryOps["-"] = (a, b) => wrap(toDec(a).minus(toDec(b)));
parser.binaryOps["*"] = (a, b) => wrap(toDec(a).times(toDec(b)));
parser.binaryOps["/"] = (a, b) => wrap(toDec(a).div(toDec(b)));
parser.binaryOps["%"] = (a, b) => wrap(toDec(a).mod(toDec(b)));
parser.binaryOps["^"] = (a, b) => wrap(toDec(a).pow(toDec(b)));

function factorial(a: unknown) {
	const n = toDec(a);
	if (!n.isInteger() || n.isNegative()) throw new Error("factorial needs a non-negative integer");
	if (n.gt(MAX_FACTORIAL_OPERAND)) throw new Error(`factorial operand too large (max ${MAX_FACTORIAL_OPERAND})`);
	// Charge operand size (min 1) so 0!/1! still consume budget before any multiply loop.
	const cost = Math.max(n.toNumber(), 1);
	if (cost > factorialWorkLeft) throw new Error("factorial work budget exceeded");
	factorialWorkLeft -= cost;
	let result = new Decimal(1);
	for (let i = new Decimal(2); i.lte(n); i = i.plus(1)) result = result.mul(i);
	return wrap(result);
}

parser.unaryOps["!"] = factorial;
parser.functions.fac = factorial;

function decimals(values: unknown, name: string, minLength = 1): Decimal[] {
	if (!Array.isArray(values) || values.length < minLength) {
		const need = minLength === 1 ? "a non-empty number array" : `at least ${minLength} numbers`;
		throw new Error(`${name}() needs ${need}`);
	}
	return values.map((value, index) => {
		try {
			return toDec(value);
		} catch {
			throw new Error(`${name}(): invalid number at index ${index}`);
		}
	});
}

function variance(xs: Decimal[], sample: boolean): Decimal {
	const mean = xs.reduce((sum, x) => sum.plus(x), new Decimal(0)).div(xs.length);
	const sumSq = xs.reduce((sum, x) => sum.plus(x.minus(mean).pow(2)), new Decimal(0));
	return sumSq.div(sample ? xs.length - 1 : xs.length);
}

parser.functions.mean = (values: unknown) => {
	const xs = decimals(values, "mean");
	return wrap(xs.reduce((sum, x) => sum.plus(x), new Decimal(0)).div(xs.length));
};

parser.functions.median = (values: unknown) => {
	const xs = decimals(values, "median").sort((a, b) => a.comparedTo(b));
	const mid = Math.floor(xs.length / 2);
	const result = xs.length % 2 === 0 ? xs[mid - 1]!.plus(xs[mid]!).div(2) : xs[mid]!;
	return wrap(result);
};

parser.functions.stdev = (values: unknown) => wrap(variance(decimals(values, "stdev"), false).sqrt());
parser.functions.stdevs = (values: unknown) => wrap(variance(decimals(values, "stdevs", 2), true).sqrt());

parser.functions.percent = (value: unknown, of: unknown) => wrap(toDec(of).times(toDec(value)).div(100));

parser.functions.deg = (degrees: unknown) => wrap(toDec(degrees).times(new Decimal("3.141592653589793238462643383279502884197")).div(180));
parser.functions.rad = (radians: unknown) => wrap(toDec(radians).times(180).div(new Decimal("3.141592653589793238462643383279502884197")));

parser.unaryOps["+"] = (a: unknown) => wrap(toDec(a));
parser.unaryOps["-"] = (a: unknown) => wrap(toDec(a).negated());

for (const [name, fn] of Object.entries(decimalUnary)) {
	parser.unaryOps[name] = (a: unknown) => wrap(fn(toDec(a)));
}

parser.functions.min = (...args: unknown[]) => wrap(Decimal.min(...args.map(toDec)));
parser.functions.max = (...args: unknown[]) => wrap(Decimal.max(...args.map(toDec)));
parser.functions.hypot = (...args: unknown[]) => {
	const xs = args.map(toDec);
	const sumSq = xs.reduce((sum, x) => sum.plus(x.pow(2)), new Decimal(0));
	return wrap(Decimal.sqrt(sumSq));
};
parser.functions.roundTo = (value: unknown, digits: unknown) => wrap(toDec(value).toDecimalPlaces(toNum(digits)));

export function normalizeExpression(expression: string): string {
	const trimmed = expression.trim();
	if (!trimmed) throw new Error("Expression is empty");
	if (trimmed.length > MAX_EXPRESSION_LENGTH) {
		throw new Error(`Expression too long (max ${MAX_EXPRESSION_LENGTH} chars)`);
	}
	return trimmed.replace(/\*\*/g, "^");
}

export function evaluateExpression(expression: string): {
	expression: string;
	normalized: string;
	decimalized: string;
	exact: string;
	formatted: string;
} {
	const normalized = normalizeExpression(expression);
	const decimalized = wrapNumericLiterals(normalized);

	let value: unknown;
	factorialWorkLeft = MAX_FACTORIAL_WORK;
	try {
		value = parser.evaluate(decimalized);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`Invalid expression: ${message}`);
	} finally {
		factorialWorkLeft = 0;
	}

	if (typeof value === "number") value = wrap(new Decimal(String(value)));
	if (!isDecVal(value)) {
		throw new Error(`Expression did not evaluate to a number (got ${typeof value})`);
	}

	if (!value.d.isFinite()) {
		if (value.d.isNaN()) throw new Error("Result is NaN");
		throw new Error(value.d.isPositive() ? "Result is Infinity" : "Result is -Infinity");
	}
	const exact = value.d.toString();

	return {
		expression: expression.trim(),
		normalized,
		decimalized,
		exact,
		formatted: exact,
	};
}

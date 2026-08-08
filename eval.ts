import { Parser } from "expr-eval-fork";
import { DECIMAL_PRECISION, Decimal, decimalizeExpression, isDecVal, resetDecimal, toDec, wrap, type DecimalValue } from "./decimal.ts";

export const MAX_EXPRESSION_LENGTH = 4096;
const MAX_FACTORIAL_OPERAND = 1000;
const MAX_FACTORIAL_WORK = MAX_FACTORIAL_OPERAND;
const MAX_ROUND_DIGITS = 1_000_000_000;
const PI = new Decimal("3.141592653589793238462643383279502884197");
const E = new Decimal("2.718281828459045235360287471352662497757");
const GUARD_DECIMAL_CONFIG = {
	defaults: true,
	precision: DECIMAL_PRECISION + 10,
	rounding: Decimal.ROUND_HALF_UP,
} as const;
const GuardDecimal = Decimal.clone(GUARD_DECIMAL_CONFIG);

let factorialWorkLeft = 0;
const EMPTY_VARIABLES: Record<string, never> = Object.create(null);

const parser = new Parser({
	allowMemberAccess: false,
	operators: {
		assignment: false,
		comparison: false,
		concatenate: false,
		conditional: false,
		fndef: false,
		in: false,
		logical: false,
	},
});

function nullMap<T extends object>(values: T): T {
	return Object.assign(Object.create(null), values);
}

function requireArity(name: string, args: unknown[], count: number): void {
	if (args.length !== count) {
		throw new Error(`${name}() needs exactly ${count} argument${count === 1 ? "" : "s"}`);
	}
}

function factorial(value: unknown) {
	const n = toDec(value);
	if (!n.isInteger() || n.lt(0)) throw new Error("factorial needs a non-negative integer");
	if (n.gt(MAX_FACTORIAL_OPERAND)) throw new Error(`factorial operand too large (max ${MAX_FACTORIAL_OPERAND})`);

	const count = n.toNumber();
	const cost = Math.max(count, 1);
	if (cost > factorialWorkLeft) throw new Error("factorial work budget exceeded");
	factorialWorkLeft -= cost;

	let result = 1n;
	for (let i = 2; i <= count; i++) result *= BigInt(i);
	return wrap(new Decimal(result.toString()).toSignificantDigits(DECIMAL_PRECISION));
}

function decimals(values: unknown, name: string, minLength = 1): DecimalValue[] {
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

function decimalArguments(args: unknown[], name: string): DecimalValue[] {
	const values = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
	if (values.length === 0) throw new Error(`${name}() needs at least one number`);
	return values.map((value, index) => {
		try {
			return toDec(value);
		} catch {
			throw new Error(`${name}(): invalid number at index ${index}`);
		}
	});
}

function sum(xs: DecimalValue[]): DecimalValue {
	return xs.reduce((total, value) => total.plus(value), new Decimal(0));
}

function variance(xs: DecimalValue[], sample: boolean): DecimalValue {
	const mean = sum(xs).div(xs.length);
	return sum(xs.map((x) => x.minus(mean).pow(2))).div(sample ? xs.length - 1 : xs.length);
}

function expm1(value: DecimalValue): DecimalValue {
	const x = new GuardDecimal(value.toString());
	if (x.abs().gte(0.1)) {
		return new Decimal(GuardDecimal.exp(x).minus(1).toSignificantDigits(DECIMAL_PRECISION).toString());
	}
	let term = x;
	let total = x;
	for (let n = 2; n <= DECIMAL_PRECISION + 10; n++) {
		term = term.times(x).div(n);
		const next = total.plus(term);
		if (next.eq(total)) break;
		total = next;
	}
	return new Decimal(total.toSignificantDigits(DECIMAL_PRECISION).toString());
}

function log1p(value: DecimalValue): DecimalValue {
	const x = new GuardDecimal(value.toString());
	if (x.abs().gte(0.1)) {
		return new Decimal(GuardDecimal.ln(x.plus(1)).toSignificantDigits(DECIMAL_PRECISION).toString());
	}
	let power = x;
	let total = x;
	for (let n = 2; n <= DECIMAL_PRECISION + 10; n++) {
		power = power.times(x);
		const next = n % 2 === 0 ? total.minus(power.div(n)) : total.plus(power.div(n));
		if (next.eq(total)) break;
		total = next;
	}
	return new Decimal(total.toSignificantDigits(DECIMAL_PRECISION).toString());
}

function roundTo(...args: unknown[]) {
	requireArity("roundTo", args, 2);
	const digits = toDec(args[1]);
	if (!digits.isInteger() || digits.abs().gt(MAX_ROUND_DIGITS)) {
		throw new Error(`roundTo() digits must be an integer from -${MAX_ROUND_DIGITS} to ${MAX_ROUND_DIGITS}`);
	}
	const places = digits.toNumber();
	const value = toDec(args[0]);
	if (places >= 0) return wrap(value.toDecimalPlaces(places));
	const scale = new Decimal(10).pow(-places);
	return wrap(value.div(scale).toDecimalPlaces(0).times(scale));
}

function arrayIndex(values: unknown, index: unknown): unknown {
	if (!Array.isArray(values)) throw new Error("indexing needs an array");
	let n: DecimalValue;
	try {
		n = toDec(index);
	} catch {
		throw new Error("array index needs an integer");
	}
	if (!n.isInteger()) throw new Error("array index needs an integer");
	if (n.lt(0) || n.gte(values.length)) throw new Error("array index out of range");
	return values[n.toNumber()];
}

const decimalUnary: Record<string, (x: DecimalValue) => DecimalValue> = {
	sin: (x) => Decimal.sin(x),
	cos: (x) => Decimal.cos(x),
	tan: (x) => Decimal.tan(x),
	asin: (x) => Decimal.asin(x),
	acos: (x) => Decimal.acos(x),
	atan: (x) => Decimal.atan(x),
	sinh: (x) => Decimal.sinh(x),
	cosh: (x) => Decimal.cosh(x),
	tanh: (x) => Decimal.tanh(x),
	asinh: (x) => Decimal.asinh(x),
	acosh: (x) => Decimal.acosh(x),
	atanh: (x) => Decimal.atanh(x),
	sqrt: (x) => Decimal.sqrt(x),
	cbrt: (x) => Decimal.cbrt(x),
	abs: (x) => Decimal.abs(x),
	ln: (x) => Decimal.ln(x),
	log: (x) => Decimal.ln(x),
	lg: (x) => Decimal.log10(x),
	log10: (x) => Decimal.log10(x),
	log2: (x) => Decimal.log2(x),
	exp: (x) => Decimal.exp(x),
	expm1,
	log1p,
	ceil: (x) => Decimal.ceil(x),
	floor: (x) => Decimal.floor(x),
	round: (x) => Decimal.round(x),
	trunc: (x) => Decimal.trunc(x),
	sign: (x) => new Decimal(Decimal.sign(x)),
};

parser.unaryOps = nullMap({
	...Object.fromEntries(Object.entries(decimalUnary).map(([name, fn]) => [name, (value: unknown) => wrap(fn(toDec(value)))])),
	"+": (value: unknown) => wrap(toDec(value)),
	"-": (value: unknown) => wrap(toDec(value).negated()),
	"!": factorial,
});

parser.binaryOps = nullMap({
	"+": (a, b) => wrap(toDec(a).plus(toDec(b))),
	"-": (a, b) => wrap(toDec(a).minus(toDec(b))),
	"*": (a, b) => wrap(toDec(a).times(toDec(b))),
	"/": (a, b) => wrap(toDec(a).div(toDec(b))),
	"%": (a, b) => wrap(toDec(a).mod(toDec(b))),
	"^": (a, b) => wrap(toDec(a).pow(toDec(b))),
	"[": arrayIndex,
});
parser.ternaryOps = nullMap({});

const hypot = (...args: unknown[]) => wrap(Decimal.hypot(...args.map(toDec)));

parser.functions = nullMap({
	d: (...args: unknown[]) => {
		requireArity("d", args, 1);
		if (typeof args[0] !== "string") throw new Error("invalid decimal literal");
		return wrap(toDec(args[0]));
	},
	fac: (...args: unknown[]) => {
		requireArity("fac", args, 1);
		return factorial(args[0]);
	},
	pow: (...args: unknown[]) => {
		requireArity("pow", args, 2);
		return wrap(toDec(args[0]).pow(toDec(args[1])));
	},
	atan2: (...args: unknown[]) => {
		requireArity("atan2", args, 2);
		return wrap(Decimal.atan2(toDec(args[0]), toDec(args[1])));
	},
	min: (...args: unknown[]) => wrap(Decimal.min(...decimalArguments(args, "min"))),
	max: (...args: unknown[]) => wrap(Decimal.max(...decimalArguments(args, "max"))),
	sum: (...args: unknown[]) => {
		requireArity("sum", args, 1);
		return wrap(sum(decimals(args[0], "sum")));
	},
	hypot,
	pyt: hypot,
	roundTo,
	percent: (...args: unknown[]) => {
		requireArity("percent", args, 2);
		return wrap(toDec(args[1]).times(toDec(args[0])).div(100));
	},
	deg: (...args: unknown[]) => {
		requireArity("deg", args, 1);
		return wrap(toDec(args[0]).times(PI).div(180));
	},
	rad: (...args: unknown[]) => {
		requireArity("rad", args, 1);
		return wrap(toDec(args[0]).times(180).div(PI));
	},
	mean: (...args: unknown[]) => {
		requireArity("mean", args, 1);
		const xs = decimals(args[0], "mean");
		return wrap(sum(xs).div(xs.length));
	},
	median: (...args: unknown[]) => {
		requireArity("median", args, 1);
		const xs = decimals(args[0], "median").sort((a, b) => a.comparedTo(b));
		const mid = Math.floor(xs.length / 2);
		return wrap(xs.length % 2 === 0 ? xs[mid - 1]!.plus(xs[mid]!).div(2) : xs[mid]!);
	},
	stdev: (...args: unknown[]) => {
		requireArity("stdev", args, 1);
		return wrap(variance(decimals(args[0], "stdev"), false).sqrt());
	},
	stdevs: (...args: unknown[]) => {
		requireArity("stdevs", args, 1);
		return wrap(variance(decimals(args[0], "stdevs", 2), true).sqrt());
	},
});

parser.consts = nullMap({ PI: wrap(PI), E: wrap(E) });

function normalizeExpression(expression: string): string {
	const trimmed = expression.trim();
	if (!trimmed) throw new Error("Expression is empty");
	if (trimmed.length > MAX_EXPRESSION_LENGTH) {
		throw new Error(`Expression too long (max ${MAX_EXPRESSION_LENGTH} chars)`);
	}
	return trimmed;
}

export function evaluateExpression(expression: string): { expression: string; value: string } {
	const normalized = normalizeExpression(expression);
	let result: unknown;
	factorialWorkLeft = MAX_FACTORIAL_WORK;
	try {
		result = parser.evaluate(decimalizeExpression(normalized), EMPTY_VARIABLES);
	} catch (error) {
		let message = error instanceof Error ? error.message : String(error);
		message = message
			.replace(/^\[DecimalError\]\s*/, "")
			.replace(/^parse error \[\d+:\d+\]:\s*/, "")
			.replace(/\bT[A-Z]+:\s*/g, "");
		if (/precision limit exceeded/i.test(message)) message = "numeric argument exceeds precision limit";
		if (error instanceof RangeError && /call stack/i.test(message)) message = "expression is too deeply nested";
		throw new Error(`Invalid expression: ${message}`);
	} finally {
		factorialWorkLeft = 0;
		resetDecimal();
		GuardDecimal.set(GUARD_DECIMAL_CONFIG);
	}

	if (typeof result === "number") result = wrap(new Decimal(String(result)));
	if (!isDecVal(result)) {
		const type = Array.isArray(result) ? "array" : typeof result;
		throw new Error(`Expression did not evaluate to a number (got ${type})`);
	}
	if (!result.d.isFinite()) {
		if (result.d.isNaN()) throw new Error("Result is NaN");
		throw new Error(result.d.isPositive() ? "Result is Infinity" : "Result is -Infinity");
	}

	return { expression: normalized, value: result.d.toString() };
}

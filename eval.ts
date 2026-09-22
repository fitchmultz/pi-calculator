import { Parser } from "expr-eval-fork";
import { DECIMAL_PRECISION, Decimal, decimalizeExpression, resetDecimal, toDec, type DecimalValue } from "./decimal.ts";

export const MAX_EXPRESSION_LENGTH = 4096;
const MAX_FACTORIAL_OPERAND = 1000;
const MAX_FACTORIAL_WORK = MAX_FACTORIAL_OPERAND;
const MAX_ROUND_DIGITS = 1_000_000_000;
const MAX_HYPERBOLIC_ABS = 10_000;
const MAX_MODULO_EXPONENT_GAP = 10_000;
const MAX_EXPENSIVE_WORK = 10_000;
const TRIG_WORK = 100;
const PI = new Decimal("3.141592653589793238462643383279502884197");
const E = new Decimal("2.718281828459045235360287471352662497757");
const MAX_TRIG_ABS = new Decimal("1e100");
const GUARD_DECIMAL_CONFIG = {
	defaults: true,
	precision: DECIMAL_PRECISION + 10,
	rounding: Decimal.ROUND_HALF_UP,
} as const;
const GuardDecimal = Decimal.clone(GUARD_DECIMAL_CONFIG);

let factorialWorkLeft = 0;
let expensiveWorkLeft = 0;
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
	return new Decimal(result.toString()).toSignificantDigits(DECIMAL_PRECISION);
}

function decimals(values: unknown, name: string, minLength = 1): DecimalValue[] {
	if (!Array.isArray(values) || values.length < minLength) {
		const need = minLength === 1 ? "a non-empty number array" : `at least ${minLength} numbers`;
		throw new Error(`${name}() needs ${need}`);
	}
	return values.map((value, index) => {
		try {
			const number = toDec(value);
			if (!number.isFinite()) throw new Error("expected a finite number");
			return number;
		} catch {
			throw new Error(`${name}(): invalid number at index ${index}`);
		}
	});
}

function decimalArguments(args: unknown[], name: string): DecimalValue[] {
	const values = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
	if (values.length === 0) throw new Error(`${name}() needs at least one number`);
	return decimals(values, name);
}

function sum(xs: DecimalValue[], Ctor = Decimal, divisor = 1): DecimalValue {
	if (xs.some((x) => !x.isFinite())) return Ctor.sum(...xs).div(divisor);

	// Decimal.sum also truncates across large exponent gaps. Signed BigInt chunks
	// keep the exact sum sparse, including intermediate values outside Decimal's range.
	const width = BigInt(Ctor.precision);
	const base = 10n ** width;
	const bins = new Map<bigint, bigint>();
	const add = (key: bigint, value: bigint) => bins.set(key, (bins.get(key) ?? 0n) + value);
	for (const x of xs) {
		if (x.isZero()) continue;
		const digits = x.toExponential().split("e")[0]!.replace(".", "");
		const exponent = BigInt(x.e) - BigInt(x.sd() - 1);
		const key = exponent >= 0n ? exponent / width : (exponent - width + 1n) / width;
		add(key, BigInt(digits) * 10n ** (exponent - key * width));
	}
	for (let key of [...bins.keys()].sort((a, b) => Number(a - b))) {
		for (;;) {
			const value = bins.get(key)!;
			const carry = value / base;
			bins.set(key, value % base);
			if (!carry) break;
			add(++key, carry);
		}
	}

	const keys = [...bins.keys()].filter((key) => bins.get(key) !== 0n).sort((a, b) => Number(b - a));
	if (keys.length === 0) return new Ctor(0);
	let key = keys[0]!;
	let coefficient = bins.get(key)!;
	let i = 1;
	const digitCount = (n: bigint) => n.toString().replace("-", "").length;
	const retained = Ctor.precision + Math.ceil(Math.log10(divisor)) + 2;
	for (; i < keys.length; i++) {
		const next = keys[i]!;
		if (digitCount(coefficient) >= retained || key - next > 2n) break;
		coefficient = coefficient * base ** (key - next) + bins.get(next)!;
		key = next;
	}

	// Normalized chunks have magnitude < base, so the leading remaining chunk
	// determines the tail's sign. A sticky digit preserves which side of a tie it lies on.
	let shift = 0n;
	if (i < keys.length) {
		shift = BigInt(Math.max(2, retained - digitCount(coefficient)));
		coefficient = coefficient * 10n ** shift + (bins.get(keys[i]!)! > 0n ? 1n : -1n);
	}
	// Divide and round before restoring the exponent to avoid intermediate overflow/underflow.
	const [mantissa, exponent] = new Ctor(coefficient.toString()).div(divisor).toExponential().split("e");
	return new Ctor(`${mantissa}e${BigInt(exponent!) + key * width - shift}`);
}

function mean(xs: DecimalValue[]): DecimalValue {
	return sum(xs, Decimal, xs.length);
}

function standardDeviation(xs: DecimalValue[], sample: boolean): DecimalValue {
	// Center on an input first so a large common offset cannot round away the spread.
	const shifted = xs.map((x) => new GuardDecimal(x).minus(xs[0]!));
	const center = sum(shifted, GuardDecimal, xs.length);
	const squared = shifted.map((x) => x.minus(center).pow(2));
	return new Decimal(sum(squared, GuardDecimal, sample ? xs.length - 1 : xs.length)
		.sqrt().toSignificantDigits(DECIMAL_PRECISION));
}

function tangent(value: DecimalValue): DecimalValue {
	// Avoid Decimal.tan's cancellation in sqrt(1 - sin(x)^2) near a pole.
	const x = new GuardDecimal(value);
	return new Decimal(x.sin().div(x.cos()).toSignificantDigits(DECIMAL_PRECISION));
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

function spendExpensiveWork(cost: number): void {
	if (cost > expensiveWorkLeft) throw new Error("expression work budget exceeded");
	expensiveWorkLeft -= cost;
}

function trigonometric(
	name: string,
	fn: (x: DecimalValue) => DecimalValue,
	maxAbs?: DecimalValue,
): (x: DecimalValue) => DecimalValue {
	return (x) => {
		if (maxAbs && x.abs().gt(maxAbs)) {
			throw new Error(`${name}() argument too large (max absolute value ${maxAbs.toString()})`);
		}
		spendExpensiveWork(TRIG_WORK);
		return fn(x);
	};
}

function hyperbolic(name: string, fn: (x: DecimalValue) => DecimalValue): (x: DecimalValue) => DecimalValue {
	return (x) => {
		if (x.abs().gt(MAX_HYPERBOLIC_ABS)) {
			throw new Error(`${name}() argument too large (max absolute value ${MAX_HYPERBOLIC_ABS})`);
		}
		spendExpensiveWork(x.isFinite() ? Math.max(1, Math.ceil(x.abs().toNumber())) : 1);
		return fn(x);
	};
}

function modulo(a: unknown, b: unknown) {
	const left = toDec(a);
	const right = toDec(b);
	const exponentGap = left.isFinite() && right.isFinite() ? Math.abs(left.e - right.e) : 0;
	if (exponentGap > MAX_MODULO_EXPONENT_GAP) {
		throw new Error(`modulo exponent gap too large (max ${MAX_MODULO_EXPONENT_GAP})`);
	}
	spendExpensiveWork(Math.max(1, exponentGap));
	return left.mod(right);
}

function roundTo(...args: unknown[]) {
	requireArity("roundTo", args, 2);
	const digits = toDec(args[1]);
	if (!digits.isInteger() || digits.abs().gt(MAX_ROUND_DIGITS)) {
		throw new Error(`roundTo() digits must be an integer from -${MAX_ROUND_DIGITS} to ${MAX_ROUND_DIGITS}`);
	}
	const places = digits.toNumber();
	const value = toDec(args[0]);
	if (places >= 0) return value.toDecimalPlaces(places);
	const scale = new Decimal(10).pow(-places);
	return value.div(scale).toDecimalPlaces(0).times(scale);
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
	sin: trigonometric("sin", (x) => Decimal.sin(x), MAX_TRIG_ABS),
	cos: trigonometric("cos", (x) => Decimal.cos(x), MAX_TRIG_ABS),
	tan: trigonometric("tan", tangent, MAX_TRIG_ABS),
	asin: trigonometric("asin", (x) => Decimal.asin(x)),
	acos: trigonometric("acos", (x) => Decimal.acos(x)),
	atan: trigonometric("atan", (x) => Decimal.atan(x)),
	sinh: hyperbolic("sinh", (x) => Decimal.sinh(x)),
	cosh: hyperbolic("cosh", (x) => Decimal.cosh(x)),
	tanh: hyperbolic("tanh", (x) => Decimal.tanh(x)),
	asinh: hyperbolic("asinh", (x) => Decimal.asinh(x)),
	acosh: hyperbolic("acosh", (x) => Decimal.acosh(x)),
	atanh: hyperbolic("atanh", (x) => Decimal.atanh(x)),
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
	...Object.fromEntries(Object.entries(decimalUnary).map(([name, fn]) => [name, (value: unknown) => fn(toDec(value))])),
	"+": toDec,
	"-": (value: unknown) => toDec(value).negated(),
	"!": factorial,
});

parser.binaryOps = nullMap({
	"+": (a, b) => toDec(a).plus(toDec(b)),
	"-": (a, b) => toDec(a).minus(toDec(b)),
	"*": (a, b) => toDec(a).times(toDec(b)),
	"/": (a, b) => toDec(a).div(toDec(b)),
	"%": modulo,
	"^": (a, b) => toDec(a).pow(toDec(b)),
	"[": arrayIndex,
});
parser.ternaryOps = nullMap({});

const hypot = (...args: unknown[]) => Decimal.hypot(...decimalArguments(args, "hypot"));

parser.functions = nullMap({
	d: (...args: unknown[]) => {
		requireArity("d", args, 1);
		if (typeof args[0] !== "string") throw new Error("invalid decimal literal");
		return toDec(args[0]);
	},
	fac: (...args: unknown[]) => {
		requireArity("fac", args, 1);
		return factorial(args[0]);
	},
	pow: (...args: unknown[]) => {
		requireArity("pow", args, 2);
		return toDec(args[0]).pow(toDec(args[1]));
	},
	atan2: (...args: unknown[]) => {
		requireArity("atan2", args, 2);
		const values = args.map(toDec);
		spendExpensiveWork(TRIG_WORK);
		return Decimal.atan2(values[0]!, values[1]!);
	},
	min: (...args: unknown[]) => Decimal.min(...decimalArguments(args, "min")),
	max: (...args: unknown[]) => Decimal.max(...decimalArguments(args, "max")),
	sum: (...args: unknown[]) => {
		requireArity("sum", args, 1);
		return sum(decimals(args[0], "sum"));
	},
	hypot,
	pyt: hypot,
	roundTo,
	percent: (...args: unknown[]) => {
		requireArity("percent", args, 2);
		return toDec(args[1]).times(toDec(args[0])).div(100);
	},
	radians: (...args: unknown[]) => {
		requireArity("radians", args, 1);
		return toDec(args[0]).times(PI).div(180);
	},
	degrees: (...args: unknown[]) => {
		requireArity("degrees", args, 1);
		return toDec(args[0]).times(180).div(PI);
	},
	mean: (...args: unknown[]) => {
		requireArity("mean", args, 1);
		return mean(decimals(args[0], "mean"));
	},
	median: (...args: unknown[]) => {
		requireArity("median", args, 1);
		const xs = decimals(args[0], "median").sort((a, b) => a.comparedTo(b));
		const mid = Math.floor(xs.length / 2);
		return xs.length % 2 === 0 ? mean([xs[mid - 1]!, xs[mid]!]) : xs[mid]!;
	},
	stdev: (...args: unknown[]) => {
		requireArity("stdev", args, 1);
		return standardDeviation(decimals(args[0], "stdev"), false);
	},
	stdevs: (...args: unknown[]) => {
		requireArity("stdevs", args, 1);
		return standardDeviation(decimals(args[0], "stdevs", 2), true);
	},
});

parser.consts = nullMap({ PI, E });

function normalizeExpression(expression: string): string {
	const trimmed = expression.trim();
	if (!trimmed) throw new Error("Expression is empty");
	if (trimmed.length > MAX_EXPRESSION_LENGTH) {
		throw new Error(`Expression too long (max ${MAX_EXPRESSION_LENGTH} chars)`);
	}
	return trimmed;
}

function resultString(result: unknown): string {
	if (typeof result === "number") result = new Decimal(String(result));
	if (!(result instanceof Decimal)) {
		const type = Array.isArray(result) ? "array" : typeof result;
		throw new Error(`Expression did not evaluate to a number (got ${type})`);
	}
	if (!result.isFinite()) {
		if (result.isNaN()) throw new Error("Result is NaN");
		throw new Error(result.isPositive() ? "Result is Infinity" : "Result is -Infinity");
	}
	return result.toString();
}

export function evaluateExpression(expression: string): { expression: string; value: string | string[] } {
	const normalized = normalizeExpression(expression);
	let result: unknown;
	factorialWorkLeft = MAX_FACTORIAL_WORK;
	expensiveWorkLeft = MAX_EXPENSIVE_WORK;
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
		expensiveWorkLeft = 0;
		resetDecimal();
		GuardDecimal.set(GUARD_DECIMAL_CONFIG);
	}

	const value = Array.isArray(result) ? result.map(resultString) : resultString(result);
	const evaluated = { expression: normalized, value };
	if (Buffer.byteLength(JSON.stringify(evaluated)) > 50 * 1024) {
		throw new Error("Result exceeds 50 KiB output limit");
	}
	return evaluated;
}

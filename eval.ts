import { Parser } from "expr-eval-fork";
import {
	DECIMAL_PRECISION,
	Decimal,
	decimalizeExpression,
	GuardDecimal,
	resetDecimal,
	resetGuardDecimal,
	toDec,
	type DecimalValue,
} from "./decimal.ts";
import { exactSum, mean, standardDeviation } from "./statistics.ts";

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
const SMALL_ATAN_ABS = new Decimal("1e-100");
const LARGE_ATAN_ABS = new Decimal("1e100");

let factorialWorkLeft = 0;
let expensiveWorkLeft = 0;
const EMPTY_VARIABLES: Record<string, never> = nullMap({});

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

function nullMap<T extends object>(values: Readonly<T>): T {
	const target = { ...values };
	Object.setPrototypeOf(target, null);
	return target;
}

/** Read an argument position the arity check has already guaranteed. */
function argumentAt<T>(values: readonly T[], index: number): T {
	const value = values[index];
	if (value === undefined) {
		throw new Error(`missing argument at index ${index}`);
	}
	return value;
}

function requireArity(name: string, args: readonly unknown[], count: number): void {
	if (args.length !== count) {
		throw new Error(`${name}() needs exactly ${count} argument${count === 1 ? "" : "s"}`);
	}
}

function factorial(value: unknown) {
	const n = toDec(value);
	if (!n.isInteger() || n.lt(0)) {
		throw new Error("factorial needs a non-negative integer");
	}
	if (n.gt(MAX_FACTORIAL_OPERAND)) {
		throw new Error(`factorial operand too large (max ${MAX_FACTORIAL_OPERAND})`);
	}

	const count = n.toNumber();
	const cost = Math.max(count, 1);
	if (cost > factorialWorkLeft) {
		throw new Error("factorial work budget exceeded");
	}
	factorialWorkLeft -= cost;

	let result = 1n;
	for (let i = 2; i <= count; i++) {
		result *= BigInt(i);
	}
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
			if (!number.isFinite()) {
				throw new Error("expected a finite number");
			}
			return number;
		} catch {
			throw new Error(`${name}(): invalid number at index ${index}`);
		}
	});
}

function decimalArguments(args: readonly unknown[], name: string): DecimalValue[] {
	const values = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
	if (values.length === 0) {
		throw new Error(`${name}() needs at least one number`);
	}
	return decimals(values, name);
}

function tangent(value: DecimalValue): DecimalValue {
	// Avoid Decimal.tan's cancellation in sqrt(1 - sin(x)^2) near a pole.
	const x = new GuardDecimal(value);
	return new Decimal(x.sin().div(x.cos()).toSignificantDigits(DECIMAL_PRECISION));
}

function arctangent(value: DecimalValue): DecimalValue {
	// Decimal.atan can loop when argument reduction overflows or underflows.
	const abs = value.abs();
	if (abs.lt(SMALL_ATAN_ABS)) {
		return value;
	}
	if (abs.gt(LARGE_ATAN_ABS)) {
		return PI.div(value.isNegative() ? -2 : 2);
	}
	return Decimal.atan(value);
}

function arctangent2(y: DecimalValue, x: DecimalValue): DecimalValue {
	if (x.isZero() || y.isZero() || !x.isFinite() || !y.isFinite()) {
		return Decimal.atan2(y, x);
	}
	const ratio = y.div(x);
	if (ratio.abs().lt(SMALL_ATAN_ABS)) {
		if (x.isNegative()) {
			return y.isNegative() ? PI.negated() : PI;
		}
		return ratio;
	}
	if (ratio.abs().gt(LARGE_ATAN_ABS)) {
		return PI.div(y.isNegative() ? -2 : 2);
	}
	return Decimal.atan2(y, x);
}

function expm1(value: DecimalValue): DecimalValue {
	const x = new GuardDecimal(value.toString());
	if (x.abs().gte(0.1)) {
		return new Decimal(
			GuardDecimal.exp(x).minus(1).toSignificantDigits(DECIMAL_PRECISION).toString(),
		);
	}
	let term = x;
	let total = x;
	for (let n = 2; n <= DECIMAL_PRECISION + 10; n++) {
		term = term.times(x).div(n);
		const next = total.plus(term);
		if (next.eq(total)) {
			break;
		}
		total = next;
	}
	return new Decimal(total.toSignificantDigits(DECIMAL_PRECISION).toString());
}

function log1p(value: DecimalValue): DecimalValue {
	const x = new GuardDecimal(value.toString());
	if (x.abs().gte(0.1)) {
		return new Decimal(
			GuardDecimal.ln(x.plus(1)).toSignificantDigits(DECIMAL_PRECISION).toString(),
		);
	}
	let power = x;
	let total = x;
	for (let n = 2; n <= DECIMAL_PRECISION + 10; n++) {
		power = power.times(x);
		const next = n % 2 === 0 ? total.minus(power.div(n)) : total.plus(power.div(n));
		if (next.eq(total)) {
			break;
		}
		total = next;
	}
	return new Decimal(total.toSignificantDigits(DECIMAL_PRECISION).toString());
}

function spendExpensiveWork(cost: number): void {
	if (cost > expensiveWorkLeft) {
		throw new Error("expression work budget exceeded");
	}
	expensiveWorkLeft -= cost;
}

function trigonometric(
	name: string,
	fn: (x: DecimalValue) => DecimalValue,
	maxAbs?: DecimalValue,
): (x: DecimalValue) => DecimalValue {
	return (x) => {
		if (maxAbs !== undefined && x.abs().gt(maxAbs)) {
			throw new Error(
				`${name}() argument too large (max absolute value ${maxAbs.toString()})`,
			);
		}
		spendExpensiveWork(TRIG_WORK);
		return fn(x);
	};
}

function hyperbolic(
	name: string,
	fn: (x: DecimalValue) => DecimalValue,
): (x: DecimalValue) => DecimalValue {
	return (x) => {
		if (x.abs().gt(MAX_HYPERBOLIC_ABS)) {
			throw new Error(
				`${name}() argument too large (max absolute value ${MAX_HYPERBOLIC_ABS})`,
			);
		}
		spendExpensiveWork(x.isFinite() ? Math.max(1, Math.ceil(x.abs().toNumber())) : 1);
		return fn(x);
	};
}

function modulo(a: unknown, b: unknown) {
	const left = toDec(a);
	const right = toDec(b);
	if (right.isZero()) {
		throw new Error("modulo by zero");
	}
	const exponentGap = left.isFinite() && right.isFinite() ? Math.abs(left.e - right.e) : 0;
	if (exponentGap > MAX_MODULO_EXPONENT_GAP) {
		throw new Error(`modulo exponent gap too large (max ${MAX_MODULO_EXPONENT_GAP})`);
	}
	spendExpensiveWork(Math.max(1, exponentGap));
	return left.mod(right);
}

function roundTo(...args: readonly unknown[]) {
	requireArity("roundTo", args, 2);
	const digits = toDec(args[1]);
	if (!digits.isInteger() || digits.abs().gt(MAX_ROUND_DIGITS)) {
		throw new Error(
			`roundTo() digits must be an integer from -${MAX_ROUND_DIGITS} to ${MAX_ROUND_DIGITS}`,
		);
	}
	const places = digits.toNumber();
	const value = toDec(args[0]);
	if (places >= 0) {
		return value.toDecimalPlaces(places);
	}
	const scale = new Decimal(10).pow(-places);
	return value.div(scale).toDecimalPlaces(0).times(scale);
}

function arrayIndex(values: unknown, index: unknown): unknown {
	if (!Array.isArray(values)) {
		throw new Error("indexing needs an array");
	}
	let n: DecimalValue;
	try {
		n = toDec(index);
	} catch {
		throw new Error("array index needs an integer");
	}
	if (!n.isInteger()) {
		throw new Error("array index needs an integer");
	}
	if (n.lt(0) || n.gte(values.length)) {
		throw new Error("array index out of range");
	}
	return values[n.toNumber()];
}

const decimalUnary: Record<string, (x: DecimalValue) => DecimalValue> = {
	sin: trigonometric("sin", (x) => Decimal.sin(x), MAX_TRIG_ABS),
	cos: trigonometric("cos", (x) => Decimal.cos(x), MAX_TRIG_ABS),
	tan: trigonometric("tan", tangent, MAX_TRIG_ABS),
	asin: trigonometric("asin", (x) => Decimal.asin(x)),
	acos: trigonometric("acos", (x) => Decimal.acos(x)),
	atan: trigonometric("atan", arctangent),
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
	...Object.fromEntries(
		Object.entries(decimalUnary).map(([name, fn]) => [
			name,
			(value: unknown) => fn(toDec(value)),
		]),
	),
	"+": toDec,
	"-": (value: unknown) => toDec(value).negated(),
	"!": factorial,
});

parser.binaryOps = nullMap({
	"+": (a, b) => toDec(a).plus(toDec(b)),
	"-": (a, b) => toDec(a).minus(toDec(b)),
	"*": (a, b) => toDec(a).times(toDec(b)),
	"/": (a, b) => {
		const numerator = toDec(a);
		const denominator = toDec(b);
		if (denominator.isZero()) {
			throw new Error("division by zero");
		}
		return numerator.div(denominator);
	},
	"%": modulo,
	"^": (a, b) => toDec(a).pow(toDec(b)),
	"[": arrayIndex,
});
parser.ternaryOps = nullMap({});

const hypot = (...args: readonly unknown[]) => Decimal.hypot(...decimalArguments(args, "hypot"));

parser.functions = nullMap({
	d: (...args: readonly unknown[]) => {
		requireArity("d", args, 1);
		if (typeof args[0] !== "string") {
			throw new Error("invalid decimal literal");
		}
		return toDec(args[0]);
	},
	fac: (...args: readonly unknown[]) => {
		requireArity("fac", args, 1);
		return factorial(args[0]);
	},
	pow: (...args: readonly unknown[]) => {
		requireArity("pow", args, 2);
		return toDec(args[0]).pow(toDec(args[1]));
	},
	atan2: (...args: readonly unknown[]) => {
		requireArity("atan2", args, 2);
		const values = args.map(toDec);
		spendExpensiveWork(TRIG_WORK);
		return arctangent2(argumentAt(values, 0), argumentAt(values, 1));
	},
	min: (...args: readonly unknown[]) => Decimal.min(...decimalArguments(args, "min")),
	max: (...args: readonly unknown[]) => Decimal.max(...decimalArguments(args, "max")),
	sum: (...args: readonly unknown[]) => {
		requireArity("sum", args, 1);
		return exactSum(decimals(args[0], "sum"));
	},
	hypot,
	pyt: hypot,
	roundTo,
	percent: (...args: readonly unknown[]) => {
		requireArity("percent", args, 2);
		const rate = toDec(args[0]);
		const amount = toDec(args[1]);
		// Scale the larger factor first so intermediate arithmetic stays in range.
		return amount.abs().gte(rate.abs())
			? amount.div(100).times(rate)
			: rate.div(100).times(amount);
	},
	radians: (...args: readonly unknown[]) => {
		requireArity("radians", args, 1);
		return toDec(args[0]).times(PI).div(180);
	},
	degrees: (...args: readonly unknown[]) => {
		requireArity("degrees", args, 1);
		return toDec(args[0]).times(180).div(PI);
	},
	mean: (...args: readonly unknown[]) => {
		requireArity("mean", args, 1);
		return mean(decimals(args[0], "mean"));
	},
	median: (...args: readonly unknown[]) => {
		requireArity("median", args, 1);
		const xs = decimals(args[0], "median").sort((a, b) => a.comparedTo(b));
		const mid = Math.floor(xs.length / 2);
		if (xs.length % 2 !== 0) {
			return argumentAt(xs, mid);
		}
		return mean([argumentAt(xs, mid - 1), argumentAt(xs, mid)]);
	},
	stdev: (...args: readonly unknown[]) => {
		requireArity("stdev", args, 1);
		return standardDeviation(decimals(args[0], "stdev"), false);
	},
	stdevs: (...args: readonly unknown[]) => {
		requireArity("stdevs", args, 1);
		return standardDeviation(decimals(args[0], "stdevs", 2), true);
	},
});

parser.consts = nullMap({ PI, E });

function normalizeExpression(expression: string): string {
	const trimmed = expression.trim();
	if (trimmed === "") {
		throw new Error("Expression is empty");
	}
	if (trimmed.length > MAX_EXPRESSION_LENGTH) {
		throw new Error(`Expression too long (max ${MAX_EXPRESSION_LENGTH} chars)`);
	}
	return trimmed;
}

function resultString(value: unknown): string {
	const result = typeof value === "number" ? new Decimal(String(value)) : value;
	if (!(result instanceof Decimal)) {
		const type = Array.isArray(result) ? "array" : typeof result;
		throw new Error(`Expression did not evaluate to a number (got ${type})`);
	}
	if (!result.isFinite()) {
		if (result.isNaN()) {
			throw new Error("Result is NaN");
		}
		throw new Error(result.isPositive() ? "Result is Infinity" : "Result is -Infinity");
	}
	return result.toString();
}

export function evaluateExpression(expression: string): {
	expression: string;
	value: string | string[];
} {
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
		if (/precision limit exceeded/i.test(message)) {
			message = "numeric argument exceeds precision limit";
		}
		if (error instanceof RangeError && /call stack/i.test(message)) {
			message = "expression is too deeply nested";
		}
		throw new Error(`Invalid expression: ${message}`, { cause: error });
	} finally {
		factorialWorkLeft = 0;
		expensiveWorkLeft = 0;
		resetDecimal();
		resetGuardDecimal();
	}

	const value = Array.isArray(result) ? result.map(resultString) : resultString(result);
	const evaluated = { expression: normalized, value };
	if (Buffer.byteLength(JSON.stringify(evaluated)) > 50 * 1024) {
		throw new Error("Result exceeds 50 KiB output limit");
	}
	return evaluated;
}

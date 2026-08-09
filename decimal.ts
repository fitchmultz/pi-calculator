import DecimalBase from "decimal.js";

export const DECIMAL_PRECISION = 40;
export const MAX_EXPRESSION_DEPTH = 128;
const DECIMAL_CONFIG = {
	defaults: true,
	precision: DECIMAL_PRECISION,
	rounding: DecimalBase.ROUND_HALF_UP,
} as const;
export const Decimal = DecimalBase.clone(DECIMAL_CONFIG);
export type DecimalValue = DecimalBase;

export function resetDecimal(): void {
	Decimal.set(DECIMAL_CONFIG);
}

const DECIMAL_LITERAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

export type DecVal = { readonly __piDec: true; readonly d: DecimalValue };

export function wrap(d: DecimalValue): DecVal {
	return { __piDec: true, d };
}

export function isDecVal(value: unknown): value is DecVal {
	if (typeof value !== "object" || value === null) return false;
	const candidate = value as Partial<DecVal>;
	return candidate.__piDec === true && candidate.d instanceof Decimal;
}

function decimalFromString(value: string): DecimalValue {
	if (!DECIMAL_LITERAL.test(value)) throw new Error("invalid decimal literal");
	const decimal = new Decimal(value);
	if (!decimal.isFinite()) throw new Error("decimal literal overflow");
	if (decimal.isZero() && /[1-9]/.test(value.replace(/[eE].*$/, ""))) {
		throw new Error("decimal literal underflow");
	}
	return decimal;
}

export function toDec(value: unknown): DecimalValue {
	if (isDecVal(value)) return value.d;
	if (value instanceof Decimal) return value;
	if (typeof value === "string") return decimalFromString(value);
	if (typeof value === "number") {
		if (!Number.isFinite(value)) throw new Error("non-finite number");
		return new Decimal(String(value));
	}
	throw new Error(`expected number, got ${typeof value}`);
}

/** Preserve numeric literal precision and normalize ** outside quoted strings. */
export function decimalizeExpression(expression: string): string {
	if (expression.includes("\\")) throw new Error("escape sequences are not supported");

	let result = "";
	let i = 0;
	let nestingDepth = 0;

	while (i < expression.length) {
		const ch = expression[i]!;

		if (ch === '"' || ch === "'") {
			const end = expression.indexOf(ch, i + 1);
			if (end < 0) throw new Error("unclosed string in expression");
			result += expression.slice(i, end + 1);
			i = end + 1;
			continue;
		}

		if (ch === "/" && expression[i + 1] === "*") throw new Error("comments are not supported");
		if (ch === ";") throw new Error("multiple expressions are not supported");

		if (ch === "(" || ch === "[") {
			nestingDepth++;
			if (nestingDepth > MAX_EXPRESSION_DEPTH) {
				throw new Error(`expression is too deeply nested (max ${MAX_EXPRESSION_DEPTH})`);
			}
		} else if ((ch === ")" || ch === "]") && nestingDepth > 0) {
			nestingDepth--;
		}

		if (ch === "*" && expression[i + 1] === "*") {
			result += "^";
			i += 2;
			continue;
		}

		const match = expression.slice(i).match(/^(?:\d+\.\d+|\d+\.|\.\d+|\d+)(?:[eE][+-]?\d+)?/);
		if (match && (i === 0 || !/[\w.]/.test(expression[i - 1]!))) {
			result += `d("${match[0]}")`;
			i += match[0].length;
			continue;
		}

		result += ch;
		i++;
	}

	return result;
}

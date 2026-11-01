import { Decimal as DecimalBase } from "decimal.js";

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

const GUARD_DECIMAL_CONFIG = {
	defaults: true,
	precision: DECIMAL_PRECISION + 10,
	rounding: DecimalBase.ROUND_HALF_UP,
} as const;

/** Wider working clone; its extra digits keep intermediate results exact. */
export const GuardDecimal = DecimalBase.clone(GUARD_DECIMAL_CONFIG);

/** Restore the guard clone's configuration once an expression run finishes. */
export function resetGuardDecimal(): void {
	GuardDecimal.set(GUARD_DECIMAL_CONFIG);
}

const DECIMAL_LITERAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

function decimalFromString(value: string): DecimalValue {
	if (!DECIMAL_LITERAL.test(value)) {
		throw new Error("invalid decimal literal");
	}
	const decimal = new Decimal(value);
	if (!decimal.isFinite()) {
		throw new Error("decimal literal overflow");
	}
	if (decimal.isZero() && /[1-9]/.test(value.replace(/[eE].*$/, ""))) {
		throw new Error("decimal literal underflow");
	}
	const rounded = decimal.toSignificantDigits(DECIMAL_PRECISION);
	if (!rounded.isFinite()) {
		throw new Error("decimal literal overflow");
	}
	if (rounded.isZero() && !decimal.isZero()) {
		throw new Error("decimal literal underflow");
	}
	return rounded;
}

export function toDec(value: unknown): DecimalValue {
	if (value instanceof Decimal) {
		return value;
	}
	if (typeof value === "string") {
		return decimalFromString(value);
	}
	if (typeof value === "number") {
		if (!Number.isFinite(value)) {
			throw new Error("non-finite number");
		}
		return new Decimal(String(value));
	}
	throw new Error(`expected number, got ${typeof value}`);
}

/** Span of the quoted literal starting at `start`, or 0 when there is none. */
function quotedSpan(expression: string, start: number, quote: string): number {
	const end = expression.indexOf(quote, start + 1);
	if (end < 0) {
		throw new Error("unclosed string in expression");
	}
	return end + 1 - start;
}

/** Decimal literal text at `start`, or undefined when those digits belong to a name. */
function decimalLiteral(expression: string, start: number): string | undefined {
	const previous = expression[start - 1];
	if (previous !== undefined && /[\w.]/.test(previous)) {
		return undefined;
	}
	return expression.slice(start).match(/^(?:\d+\.\d+|\d+\.|\.\d+|\d+)(?:[eE][+-]?\d+)?/)?.[0];
}

/** Reject syntax the calculator refuses rather than normalizes. */
function rejectUnsupported(expression: string, start: number, ch: string): void {
	if (ch === ";") {
		throw new Error("multiple expressions are not supported");
	}
	if (ch === "/" && expression[start + 1] === "*") {
		throw new Error("comments are not supported");
	}
}

/** Nesting depth after one bracket, rejecting the limit as it is crossed. */
function trackDepth(depth: number, ch: string): number {
	if (ch === "(" || ch === "[") {
		if (depth + 1 > MAX_EXPRESSION_DEPTH) {
			throw new Error(`expression is too deeply nested (max ${MAX_EXPRESSION_DEPTH})`);
		}
		return depth + 1;
	}
	if ((ch === ")" || ch === "]") && depth > 0) {
		return depth - 1;
	}
	return depth;
}

/** Preserve numeric literal precision and normalize ** outside quoted strings. */
export function decimalizeExpression(expression: string): string {
	if (expression.includes("\\")) {
		throw new Error("escape sequences are not supported");
	}

	let result = "";
	let i = 0;
	let nestingDepth = 0;

	while (i < expression.length) {
		const ch = expression[i];
		if (ch === undefined) {
			break; // the loop bound keeps the index inside the string
		}

		if (ch === '"' || ch === "'") {
			const span = quotedSpan(expression, i, ch);
			result += expression.slice(i, i + span);
			i += span;
			continue;
		}

		rejectUnsupported(expression, i, ch);

		nestingDepth = trackDepth(nestingDepth, ch);

		if (ch === "*" && expression[i + 1] === "*") {
			result += "^";
			i += 2;
			continue;
		}

		const literal = decimalLiteral(expression, i);
		if (literal !== undefined) {
			result += `d("${literal}")`;
			i += literal.length;
			continue;
		}

		result += ch;
		i++;
	}

	return result;
}

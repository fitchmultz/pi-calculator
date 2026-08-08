import Decimal from "decimal.js";

export const DECIMAL_PRECISION = 40;
Decimal.set({ precision: DECIMAL_PRECISION, rounding: Decimal.ROUND_HALF_UP });

export type DecVal = { readonly __piDec: true; readonly d: Decimal };

export function wrap(d: Decimal): DecVal {
	return { __piDec: true, d };
}

export function isDecVal(value: unknown): value is DecVal {
	if (typeof value !== "object" || value === null) return false;
	const candidate = value as Partial<DecVal>;
	return candidate.__piDec === true && candidate.d instanceof Decimal;
}

export function toDec(value: unknown): Decimal {
	if (isDecVal(value)) return value.d;
	if (value instanceof Decimal) return value;
	if (typeof value === "string") return new Decimal(value);
	if (typeof value === "number") {
		if (!Number.isFinite(value)) throw new Error("non-finite number");
		return new Decimal(String(value));
	}
	throw new Error(`expected number, got ${typeof value}`);
}

/** Preserve numeric literal precision and normalize ** outside quoted strings. */
export function decimalizeExpression(expression: string): string {
	let result = "";
	let i = 0;

	while (i < expression.length) {
		const ch = expression[i]!;

		if (ch === '"' || ch === "'") {
			let end = expression.indexOf(ch, i + 1);
			while (end >= 0 && expression[end - 1] === "\\") end = expression.indexOf(ch, end + 1);
			if (end < 0) throw new Error("unclosed string in expression");
			result += expression.slice(i, end + 1);
			i = end + 1;
			continue;
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

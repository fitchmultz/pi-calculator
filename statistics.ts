import { DECIMAL_PRECISION, Decimal, GuardDecimal, type DecimalValue } from "./decimal.ts";

/** Absent bins hold zero, which is what the sparse sum below assumes. */
function bin(bins: Map<bigint, bigint>, key: bigint): bigint {
	return bins.get(key) ?? 0n;
}

function addBin(bins: Map<bigint, bigint>, key: bigint, value: bigint): void {
	bins.set(key, (bins.get(key) ?? 0n) + value);
}

/** Exact significand digits as a signed integer, keeping every input digit. */
function significandDigits(value: DecimalValue): string {
	const [digits] = value.toExponential().split("e");
	if (digits === undefined) {
		throw new Error("expected an exact decimal significand");
	}
	return digits.replace(".", "");
}

/** Spread each value across the bins its exponent falls in, keeping the exact sum sparse. */
function fillBins(xs: readonly DecimalValue[], bins: Map<bigint, bigint>, width: bigint): void {
	for (const x of xs) {
		if (x.isZero()) {
			continue;
		}
		const exponent = BigInt(x.e) - BigInt(x.sd() - 1);
		const key = exponent >= 0n ? exponent / width : (exponent - width + 1n) / width;
		addBin(bins, key, BigInt(significandDigits(x)) * 10n ** (exponent - key * width));
	}
}

/** Carry each bin into the next so every stored bin stays below the base. */
function carryBins(bins: Map<bigint, bigint>, base: bigint): void {
	for (const start of [...bins.keys()].sort((a, b) => Number(a - b))) {
		let key = start;
		for (;;) {
			const value = bin(bins, key);
			const carry = value / base;
			bins.set(key, value % base);
			if (carry === 0n) {
				break;
			}
			key += 1n;
			addBin(bins, key, carry);
		}
	}
}

type DecimalConstructor = typeof Decimal;

const digitCount = (n: bigint) => n.toString().replace("-", "").length;

/** Fold the leading bins into one coefficient; a sticky digit keeps the tail's side of a tie. */
function leadingCoefficient(
	bins: Map<bigint, bigint>,
	keys: readonly bigint[],
	base: bigint,
	retained: number,
): [coefficient: bigint, key: bigint, shift: bigint] {
	const leading = keys[0];
	if (leading === undefined) {
		return [0n, 0n, 0n];
	}
	let key = leading;
	let coefficient = bin(bins, key);
	let index = 1;
	while (index < keys.length) {
		const next = keys[index];
		if (next === undefined) {
			break;
		}
		if (digitCount(coefficient) >= retained || key - next > 2n) {
			break;
		}
		coefficient = coefficient * base ** (key - next) + bin(bins, next);
		key = next;
		index += 1;
	}
	// Normalized chunks have magnitude < base, so the leading remaining chunk
	// determines the tail's sign.
	let shift = 0n;
	const tail = index < keys.length ? keys[index] : undefined;
	if (tail !== undefined) {
		shift = BigInt(Math.max(2, retained - digitCount(coefficient)));
		coefficient = coefficient * 10n ** shift + (bin(bins, tail) > 0n ? 1n : -1n);
	}
	return [coefficient, key, shift];
}

/** Sum `xs` exactly, then divide, so large exponent gaps keep every input digit. */
export function exactSum(
	xs: readonly DecimalValue[],
	Ctor: DecimalConstructor = Decimal,
	divisor = 1,
): DecimalValue {
	if (xs.some((x) => !x.isFinite())) {
		return Ctor.sum(...xs).div(divisor);
	}

	// Decimal.sum also truncates across large exponent gaps. Signed BigInt chunks
	// keep the exact sum sparse, including intermediate values outside Decimal's range.
	const width = BigInt(Ctor.precision);
	const base = 10n ** width;
	const bins = new Map<bigint, bigint>();
	fillBins(xs, bins, width);
	carryBins(bins, base);

	const keys = [...bins.keys()]
		.filter((key) => bins.get(key) !== 0n)
		.sort((a, b) => Number(b - a));
	if (keys.length === 0) {
		return new Ctor(0);
	}
	const retained = Ctor.precision + Math.ceil(Math.log10(divisor)) + 2;
	const [coefficient, key, shift] = leadingCoefficient(bins, keys, base, retained);
	// Divide and round before restoring the exponent to avoid intermediate overflow/underflow.
	const [mantissa, exponent] = new Ctor(coefficient.toString())
		.div(divisor)
		.toExponential()
		.split("e");
	if (mantissa === undefined || exponent === undefined) {
		throw new Error("expected an exact decimal exponent form");
	}
	return new Ctor(`${mantissa}e${BigInt(exponent) + key * width - shift}`);
}

export function mean(xs: readonly DecimalValue[]): DecimalValue {
	return exactSum(xs, Decimal, xs.length);
}

export function standardDeviation(xs: readonly DecimalValue[], sample: boolean): DecimalValue {
	// Scale before subtraction; a power of ten preserves small spreads around a large offset.
	const widest = GuardDecimal.max(...xs.map((x) => x.abs()));
	const scale = new GuardDecimal(`1e${widest.e}`);
	const scaled = xs.map((x) => new GuardDecimal(x).div(scale));
	const anchor = scaled[0];
	if (anchor === undefined) {
		throw new Error("statistics need at least one number");
	}
	// Center on an input first so a large common offset cannot round away the spread.
	const shifted = scaled.map((x) => x.minus(anchor));
	const center = exactSum(shifted, GuardDecimal, xs.length);
	const squared = shifted.map((x) => x.minus(center).pow(2));
	return new Decimal(
		exactSum(squared, GuardDecimal, sample ? xs.length - 1 : xs.length)
			.sqrt()
			.times(scale)
			.toSignificantDigits(DECIMAL_PRECISION),
	);
}

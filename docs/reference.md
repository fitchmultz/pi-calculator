# Calculator reference

[Back to the README](../README.md)

## Installation options

Requires Node.js 24 or later and Pi 1.0.0 or later. The published npm package is `@fitchmultz/pi-calculator`.

```sh
pi install npm:@fitchmultz/pi-calculator
```

Git installation is also supported:

```sh
pi install git:github.com/fitchmultz/pi-calculator
# Existing versioned tags remain installable:
pi install git:github.com/fitchmultz/pi-calculator@v4.1.0
```

When switching from Git to npm, run `pi list`, remove the exact Git source it shows with `pi remove <source>`, then install the scoped npm package. This avoids loading the calculator twice. Existing Git installs can stay on Git.

Start a new Pi session with `pi` after installation. The package adds one `calculator` tool with one required `expression` string. Pi supplies the schema and terminal UI libraries; evaluation uses `decimal.js` and `expr-eval-fork`.

Pi extensions execute with full system access. Review the source before installing.

## Expressions

Operators are `+`, `-`, `*`, `/`, `%`, `^` and `**`; constants are `PI` and `E`. Arrays support zero-based indexing: `[1,2,3][2]` returns `3`. Combine independent results in one flat array:

```text
[0.1 + 0.2, 2^64]
[stdev([2,4,4,4,5,5,7,9]), stdevs([2,4,4,4,5,5,7,9])]
```

### Functions

- **Trigonometry:** `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`, `sinh`, `cosh`, `tanh`, `asinh`, `acosh` and `atanh`. Trig uses radians. `radians(degrees)` and `degrees(radians)` convert angles.
- **Roots, powers and logarithms:** `sqrt`, `cbrt`, `abs`, `pow`, `exp`, `expm1`, `ln`/`log`, `log1p`, `log2`, `log10`/`lg`. Both `ln` and `log` are natural logarithms. For small inputs, use `expm1(x)` for `exp(x)-1` and `log1p(x)` for `ln(1+x)` to preserve precision.
- **Rounding:** `ceil`, `floor`, `round`, `roundTo`, `trunc` and `sign`. `roundTo(value, places)` rounds halves away from zero; negative places round to tens, hundreds and so on.
- **Percentages:** `percent(rate, amount)` gives `rate%` of `amount`: `percent(15, 200)` returns `30`.
- **Statistics:** `sum`, `mean`, `median`, `stdev` and `stdevs` take numeric arrays. `stdev` is population standard deviation; `stdevs` is sample standard deviation and requires at least two elements.
- **Extremes and distance:** `min`, `max`, `hypot`/`pyt` take either an array or individual arguments.
- **Factorials:** `n!` and `fac(n)` compute factorials for integers from 0 through 1000.

Aggregates require finite numeric elements. Sums preserve cancellation remainders before rounding; means and even medians round after division.

Input literals and arithmetic are rounded to 40 significant digits using half-up rounding. Results are rounded decimal strings. For example, `exp(ln(1000))` can differ slightly from `1000` because intermediate calculations round.

## Result format

The tool returns a finite scalar or a flat array of finite scalars, represented as decimal strings. A nested array, nonnumeric result or nonfinite member fails the whole expression. Large finite values use scientific notation.

Model-facing content contains only the value, such as `0.3`, or a JSON array of strings, such as `["0.3","18446744073709551616"]`.

Both `details` and native `structuredContent` contain the same object:

```json
{
  "expression": "[0.1 + 0.2, 2^64]",
  "value": ["0.3", "18446744073709551616"]
}
```

`expression` is trimmed. `value` is a string or string array. The tool declares an `outputSchema`, so nested and codemode callers can receive these values without reparsing display text.

Evaluation failures throw and become native error results. Schema and policy checks remain Pi-owned. The tool requests native strict JSON-schema sampling where the provider supports it and uses Pi's normal fallback elsewhere. Pi's tool card displays the safely escaped expression above the result.

## Limits

- Expressions: at most 4,096 characters and 128 nesting levels.
- Output: serialized expression/value details must fit within 50 KiB. Oversized results are rejected rather than truncated.
- Factorials: operands from 0 through 1000, with a shared 1,000-step factorial budget per expression. Each factorial costs at least one step.
- Circular trig: `sin`, `cos` and `tan` reject absolute inputs above `1e100`.
- Hyperbolic functions: reject absolute inputs above 10,000.
- Modulo: `%` rejects operand exponent gaps above 10,000.
- Expensive operations: share a 10,000-unit work budget. Circular trig and `atan2` calls cost 100 units each, allowing at most 100 per expression when no other operation uses that budget.

## Upgrading from v2

Version 3 removed the old angle-conversion names: replace `deg(x)` with `radians(x)` and `rad(x)` with `degrees(x)`. There are no compatibility aliases.

Tool content no longer includes `expression =`. Consumers should read the expression from details and handle both string and string-array values.

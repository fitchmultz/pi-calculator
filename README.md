# pi-calculator

A deterministic calculator tool for [Pi](https://github.com/earendil-works/pi) with 40-significant-digit decimal precision. Input literals and arithmetic are rounded using half-up rounding; results are decimal strings, not lossless symbolic answers.

Requires Node.js 24 or later and Pi 1.0.0 or later. Release qualification selects the latest stable official Pi and the [fitchmultz/pi fork](https://github.com/fitchmultz/pi) main once per run, freezing their version and commit throughout the checks. Each host is qualified separately; a matching version string is not a compatibility result.

## Install

```sh
pi install npm:@fitchmultz/pi-calculator
```

**The unscoped `pi-calculator` npm package is NOT this project.** This repository publishes only `@fitchmultz/pi-calculator`.

Git remains supported as a fallback:

```sh
pi install git:github.com/fitchmultz/pi-calculator
# Existing versioned tags remain installable:
pi install git:github.com/fitchmultz/pi-calculator@v4.1.0
```

When switching from Git to npm, remove the exact Git source shown by `pi list` before installing the scoped package to avoid loading the calculator twice. Existing Git installs can stay on Git.

The package adds one `calculator` tool with one required `expression` string. Pi supplies the schema and terminal UI libraries; the calculator uses `decimal.js` and `expr-eval-fork` for evaluation.

## Expressions

Use the calculator for non-trivial calculations; simple arithmetic does not need a tool call. Independent results can share one flat array:

```text
(12.5 * 1.0825) ^ 3
sin(radians(90))
percent(15, 200)
mean([2,4,6,8])
[stdev([2,4,4,4,5,5,7,9]), stdevs([2,4,4,4,5,5,7,9])]
[0.1 + 0.2, 2^64]
```

Operators include `+`, `-`, `*`, `/`, `%`, `^` and `**`; constants are `PI` and `E`. Arrays support zero-based indexing, such as `[1,2,3][2]`.

Supported functions include:

- `sin`, `cos`, `tan`, their inverse/hyperbolic variants, and `atan2`. Trig uses radians. `radians(degrees)` and `degrees(radians)` convert angles.
- `sqrt`, `cbrt`, `abs`, `pow`, `exp`, `expm1`, `ln`/`log`, `log1p`, `log2`, `log10`/`lg`. `ln` and `log` are natural logarithms. For small inputs, use `expm1(x)` for `exp(x)-1` and `log1p(x)` for `ln(1+x)` to preserve precision.
- `ceil`, `floor`, `round`, `roundTo`, `trunc`, `sign`. `roundTo(value, places)` rounds halves away from zero; negative places round to tens, hundreds, and so on.
- `percent(rate, amount)` gives `rate%` of `amount`: `percent(15, 200)` is `30`.
- `sum`, `mean`, `median`, `stdev`, `stdevs` take numeric arrays. `stdev` is population standard deviation; `stdevs` is sample standard deviation and requires at least two elements.
- `min`, `max`, `hypot`/`pyt` take either an array or individual arguments.
- `n!` and `fac(n)` compute factorials for integers from 0 through 1000.

Aggregates require finite numeric elements. Sums preserve cancellation remainders before rounding; means and even medians round after division.

## Results and limits

The tool returns a finite scalar or flat array of finite scalars, represented as decimal strings. A nested array, nonnumeric result, or nonfinite member fails the whole expression. Large finite values use scientific notation.

Model-facing content contains only the value, such as `0.3`, or a JSON array of strings, such as `["0.3","18446744073709551616"]`. Structured details retain `{ expression, value }`, where `expression` is trimmed and `value` is a string or string array. The same stable outcome is exposed as native `structuredContent` with an `outputSchema`, so nested/codemode callers receive decimal strings without reparsing display text. Evaluation failures still throw and become native error results; schema and policy checks remain Pi-owned. Pi's tool card displays the safely escaped expression above the result.

Expressions are limited to 4,096 characters and 128 nesting levels. Serialized expression/value details must fit within 50 KiB; oversized results are rejected rather than truncated. The tool requests native strict JSON-schema sampling where the provider supports it and uses Pi's normal fallback elsewhere.

Each expression has a shared 1,000-step factorial budget. `sin`/`cos`/`tan` reject absolute inputs above `1e100`, hyperbolic functions reject absolute inputs above 10,000, and `%` rejects operand exponent gaps above 10,000. Expensive operations share a 10,000-unit work budget. Circular trig calls cost 100 units each, allowing at most 100 per expression.

### Upgrading from v2

Version 3 removes the old angle-conversion names: replace `deg(x)` with `radians(x)` and `rad(x)` with `degrees(x)`. There are no compatibility aliases. Tool content no longer includes `expression =`; consumers should read the expression from details and handle both string and string-array values.

## Verification

```sh
npm ci --ignore-scripts
npm run verify
```

Verification includes numerical and work-limit checks, schema and structured result contracts, actual extension loading, native nested validation/policy/evaluation errors, and native tool-card rendering. The exact development cohort uses TypeBox 1.3.27; no evaluator or grammar compatibility layer is needed.

Update the development TypeBox pin alongside the qualified Pi host, using the version that host ships. Independent TypeBox updates are disabled in Renovate because they install duplicate host schema libraries and slow development startup. Each compatibility lane still selects its host's TypeBox version.

The locked development cohort is reproducible local tooling, not a release-qualification target. CI runs the full verification against both frozen latest hosts, including fresh Git and packed npm consumers. Intentional version bumps with versioned changelog notes publish from the main-only repository pipeline when `NPM_RELEASE_ENABLED` is `true`; the release caller reuses the same frozen host inputs for qualification and publishing.

Pi extensions execute with full system access. Review the source before installing.

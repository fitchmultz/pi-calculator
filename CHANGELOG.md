# Changelog

## 3.0.0 - 2026-09-21

### Breaking changes

- Replace `deg(x)` with `radians(x)` for degrees-to-radians conversion, and `rad(x)` with `degrees(x)` for radians-to-degrees conversion. The old names are removed without aliases.
- Return value-only model content instead of `expression = value`. Details retain the trimmed expression and a value that can now be a decimal string or an array of decimal strings.

### Added

- Evaluate independent calculations in one flat array. Reject nested, nonnumeric, or nonfinite results as a whole, and reject serialized expression/value details larger than 50 KiB.
- Show safely escaped expressions in native Pi tool cards while keeping model output concise.
- Request native strict-prefer JSON-schema sampling with provider-controlled fallback.

### Changed

- Pass Decimal values directly through the parser while preserving decimal-literal precision, numerical algorithms, private contexts, and work limits.
- Clarify percentage argument order, population/sample standard deviation, logarithm bases, small-argument `expm1`/`log1p`, and when to combine calculations or skip a trivial tool call.
- Qualify development against Pi 0.87.0 and TypeBox 1.3.34; declare host-provided Pi TUI as an optional peer. The package remains private and Git-distributed.

### Fixed

- Require finite inputs consistently for aggregates, including `min`, `max`, and `hypot`/`pyt`.

## 2.0.2 - 2026-09-18

### Fixed

- Preserve tangent accuracy near poles by dividing guarded sine and cosine values.
- Preserve cancellation remainders in sums without allocating across large exponent gaps, and round means and even medians only after division.
- Center standard-deviation calculations before averaging so identical measurements have zero spread and large common offsets do not distort the result.
- Reject non-finite measurements in statistics, including medians that previously hid invalid square roots or division by zero.

### Added

- Regression checks for numeric correctness and GitHub CI verification on the minimum supported Node version and Node 24.

## 2.0.1 - 2026-08-08

### Fixed

- Restrict evaluation to null-prototype deterministic allowlists instead of inheriting broken parser functions, operators, or object properties.
- Evaluate supported scientific helpers in a private Decimal context, including cancellation-safe `expm1`/`log1p`, hyperbolic functions, `pow`, `atan2`, `sum`, `sign`, and `trunc`.
- Return the requested element for array indexes instead of always coercing wrapped indexes to zero.
- Preserve single-quoted numeric strings and quoted `**` text during literal rewriting, and reject unsupported comments.
- Accept negative zero factorials, correctly round factorials once from an exact BigInt result, and reject extra function arguments.
- Restore the full 40-digit `E` constant, round input literals to the documented precision, reset Decimal state after every evaluation, cap nesting deterministically, and replace raw dependency errors with stable calculator errors.
- Disable member access and unadvertised conditional, comparison, logical, higher-order, random, string-escape, comment, and multi-expression operations.
- Bound circular and hyperbolic trig operands plus modulo exponent gaps with a shared work budget to prevent synchronous CPU amplification.

### Changed

- Keep only stable expression and value fields in tool details and trim always-on prompt guidance.
- Limit npm package contents to runtime source and documentation.

## 2.0.0 - 2026-08-06

### Changed

- Require Pi 0.84.0 or later.
- Import the host-provided TypeBox package directly, following the Pi 0.84 extension contract.
- Format very large integers in scientific notation so calculator output stays below Pi's 50KB tool-output limit.
- Keep evaluation details JSON-safe by removing the lossy JavaScript number conversion.
- Escape line breaks in displayed expressions so tool results stay within Pi's 2,000-line output limit.

### Added

- Type checking and an actual Pi 0.84 extension-load check to the release verification command.

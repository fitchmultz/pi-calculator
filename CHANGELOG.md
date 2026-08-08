# Changelog

## 2.0.1 - 2026-08-08

### Fixed

- Restrict evaluation to null-prototype deterministic allowlists instead of inheriting broken parser functions, operators, or object properties.
- Evaluate supported scientific helpers in a private Decimal context, including cancellation-safe `expm1`/`log1p`, hyperbolic functions, `pow`, `atan2`, `sum`, `sign`, and `trunc`.
- Return the requested element for array indexes instead of always coercing wrapped indexes to zero.
- Preserve single-quoted numeric strings and quoted `**` text during literal rewriting, and reject unsupported comments.
- Accept negative zero factorials, correctly round factorials once from an exact BigInt result, and reject extra function arguments.
- Restore the full 40-digit `E` constant and replace raw stack-overflow, parser-token, and rounding errors with stable calculator errors.
- Disable member access and unadvertised conditional, comparison, logical, higher-order, random, and string operations.

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

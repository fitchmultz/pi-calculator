# Changelog

## 2.0.0 - 2026-08-06

### Changed

- Require Pi 0.84.0 or later.
- Import the host-provided TypeBox package directly, following the Pi 0.84 extension contract.
- Format very large integers in scientific notation so calculator output stays below Pi's 50KB tool-output limit.
- Keep evaluation details JSON-safe by removing the lossy JavaScript number conversion.
- Escape line breaks in displayed expressions so tool results stay within Pi's 2,000-line output limit.

### Added

- Type checking and an actual Pi 0.84 extension-load check to the release verification command.

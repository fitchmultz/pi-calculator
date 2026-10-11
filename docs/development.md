# Development

[Back to the README](../README.md)

## Local verification

Requires Node.js 24 or later. From a checkout:

```sh
npm ci --ignore-scripts
npm run verify
```

`verify` runs type checking, numerical and work-limit checks, then an actual Pi extension-load check. It covers schema and structured result contracts, native nested validation/policy/evaluation errors and native tool-card rendering.

The locked development cohort uses Pi 1.0.0 and TypeBox 1.3.27. Pi supplies the schema and terminal UI libraries; `decimal.js` and `expr-eval-fork` are runtime dependencies. No evaluator or grammar compatibility layer is needed.

Update the development TypeBox pin alongside the qualified Pi host, using the version that host ships. Independent TypeBox updates are disabled in Renovate because they install duplicate host schema libraries and slow development startup. Each compatibility lane selects its host's TypeBox version.

## Compatibility qualification

The locked development cohort is reproducible local tooling. Release qualification selects the latest stable official Pi and the [fitchmultz/pi fork](https://github.com/fitchmultz/pi) main once per run, freezing the official version and fork commit throughout the checks.

Each host is qualified separately; a matching version string alone does not establish compatibility. CI runs the full verification against both frozen hosts, including fresh Git and packed npm consumers. See the [compatibility workflow](../.github/workflows/pi-compatibility.yml).

## Release process

Intentional version bumps with versioned changelog notes publish from the main-only repository pipeline when `NPM_RELEASE_ENABLED` is `true`. The release caller reuses the same frozen host inputs for qualification and publishing. See the [release workflow](../.github/workflows/npm-release.yml) and [changelog](../CHANGELOG.md).

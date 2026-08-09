# pi-calculator

A deterministic calculator tool for [Pi](https://github.com/earendil-works/pi) with 40-digit decimal precision.

Requires Pi 0.84.0 or later.

## Install

```sh
pi install git:github.com/fitchmultz/pi-calculator
```

The package adds a `calculator` tool for arithmetic, powers, roots, logarithms, trigonometry, percentages, factorials, and basic statistics.

```text
(12.5 * 1.0825) ^ 3
sin(PI/4)
percent(15, 200)
mean([2,4,6,8])
```

Supported named functions include `sin`, `cos`, `tan` and their inverse/hyperbolic variants; `sqrt`, `cbrt`, `abs`, `exp`, `expm1`, `ln`/`log`, `log1p`, `log2`, `log10`/`lg`; `ceil`, `floor`, `round`, `roundTo`, `trunc`, `sign`; `pow`, `atan2`, `min`, `max`, `sum`, `hypot`/`pyt`, `percent`; and `mean`, `median`, `stdev`, `stdevs`. `deg(x)` converts degrees to radians and `rad(x)` converts radians to degrees.

Factorials use `n!` or `fac(n)` for integers from 0 through 1000. Each expression has a shared 1000-step factorial budget. Hyperbolic functions reject inputs with an absolute value above 10,000 to keep evaluation bounded.

## Verification

```sh
npm ci
npm run verify
```

Pi extensions execute with full system access. Review the source before installing.

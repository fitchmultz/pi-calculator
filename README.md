# pi-calculator

Give [Pi](https://github.com/earendil-works/pi) a calculator with 40-significant-digit decimal precision. Check totals, percentages, scientific calculations and statistics while you work, with the expression and result visible in Pi's tool card.

![Pi sends an expression to the calculator, which returns a decimal result or rejects an invalid expression.](.github/readme/calculator-flow.png)

*Ask Pi for a calculation → the calculator evaluates it → Pi receives the result or an error.*

## Install and try it

Requires **Node.js 24+** and **Pi 1.0.0+**.

```sh
pi install npm:@fitchmultz/pi-calculator
pi
```

In the new Pi session, try:

```text
Use the calculator to evaluate [0.1 + 0.2, 2^64].
```

The calculator returns `["0.3","18446744073709551616"]`. It adds one tool, `calculator`, that takes an `expression` string.

For Git installs or switching an existing install to npm, see [installation options](docs/reference.md#installation-options).

Pi extensions run with full system access. Review the source before installing.

## Expressions

Here are a few calculations to try:

```text
percent(15, 200)                 → 30
roundTo(-1.25, 1)                → -1.3
mean([2,4,6,8])                  → 5
sin(radians(90))                 → 1
sum([1e40,1,-1e40])              → 1
(12.5 * 1.0825) ^ 3              → 2477.500518798828125
```

Arithmetic supports `+`, `-`, `*`, `/`, `%`, `^` and `**`, with `PI` and `E` as constants. Put independent calculations in one flat array, as in the first example.

- **Percentages:** `percent(rate, amount)` calculates `rate%` of `amount`.
- **Angles:** trig functions use radians; `radians(degrees)` and `degrees(radians)` convert between units.
- **Statistics:** `stdev(array)` gives population standard deviation; `stdevs(array)` gives sample standard deviation and needs at least two values.
- **Rounding:** `roundTo(value, places)` rounds halves away from zero. Negative places round to tens, hundreds and so on.

See the [expression reference](docs/reference.md#expressions) for all functions, indexing and precision-sensitive calculations.

## Results and limits

Results are decimal strings, or a flat array of decimal strings. Input literals and arithmetic use half-up rounding at 40 significant digits; calculations can still round. Large finite results use scientific notation.

Invalid expressions, nonfinite results and nested result arrays produce errors. If any result in an array is invalid, the whole expression fails. Expressions have a 4,096-character limit, plus [nesting, output and work limits](docs/reference.md#limits).

For extensions that call the tool, the [result format](docs/reference.md#result-format) describes its structured output.

<a id="upgrading-from-v2"></a>

Upgrading from v2? The [migration notes](docs/reference.md#upgrading-from-v2) explain the renamed angle helpers and changed output format.

## Verification

To work on the calculator, start with the [development guide](docs/development.md): local checks, Pi compatibility testing and the release process. Release history is in the [changelog](CHANGELOG.md).

## License

[MIT](LICENSE) © Mitchell Fultz. Evaluation uses [decimal.js](https://github.com/MikeMcl/decimal.js) and [expr-eval-fork](https://github.com/jorenbroekema/expr-eval).

# pi-calculator

pi-calculator adds a calculator tool to [Pi](https://github.com/earendil-works/pi), with 40 significant digits of decimal precision. Use it to check totals or evaluate scientific expressions.

![Pi sends an expression to the calculator, which returns a decimal result or rejects an invalid expression.](.github/readme/calculator-flow.png)

## Install and try it

Use Node.js 24 or later and Pi 1.0.0 or later.

```sh
pi install npm:@fitchmultz/pi-calculator
pi
```

Enter this prompt in the new Pi session:

```text
Use the calculator to evaluate [0.1 + 0.2, 2^64].
```

The calculator tool returns `["0.3","18446744073709551616"]`.

See [installation options](docs/reference.md#installation-options) for Git installs or a change from Git to npm.

Pi extensions run with full system access. Review the source before you install the package.

## Expressions

Try these expressions:

```text
percent(15, 200)                 → 30
roundTo(-1.25, 1)                → -1.3
mean([2,4,6,8])                  → 5
sin(radians(90))                 → 1
sum([1e40,1,-1e40])              → 1
(12.5 * 1.0825) ^ 3              → 2477.500518798828125
```

Arithmetic supports `+`, `-`, `*`, `/`, `%`, `^` and `**`, with `PI` and `E` as constants. Put independent calculations in one flat array, as in the first example.

Trig uses radians. Use `radians()` to convert degrees to radians. Use `degrees()` to convert radians to degrees.

`roundTo(value, places)` rounds half values away from zero. Use negative places to round to tens, hundreds or larger units.

See the [expression reference](docs/reference.md#expressions) for all functions and array indexing.

## Results and limits

Results are decimal strings, or a flat array of decimal strings. Input numbers and arithmetic use half-up rounding. Large finite results use scientific notation.

The calculator tool rejects invalid expressions, nonfinite results and nested result arrays. If one result in an array is invalid, the calculator tool rejects the whole expression.

Keep expressions within 4,096 characters. See [limits](docs/reference.md#limits) for nesting, output size and work budgets.

See [result format](docs/reference.md#result-format) to use the calculator tool from another extension.

<a id="upgrading-from-v2"></a>

Read the [migration notes](docs/reference.md#upgrading-from-v2) before you upgrade from v2.

## Verification

See the [development guide](docs/development.md) for local checks and Pi compatibility tests. See the [changelog](CHANGELOG.md) for release history.

## License

[MIT](LICENSE) © Mitchell Fultz.

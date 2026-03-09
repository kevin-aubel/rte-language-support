# RTE Language Support

VSCode extension providing language support for **Generix RTE** (Rule Translation Engine) files.

## Features

- **Syntax highlighting** for `.rte` and `.inc` files
- **Hover tooltips** — hovering over any typed identifier shows its type, description, and a code example; `nodein` and `nodeout` display their syntax and available variables
- **Bracket matching** and auto-closing pairs
- **Comment toggling** (`Ctrl+/`)
- **Document formatting** for `.rte` and `.inc` files (`Format Document` / `Shift+Alt+F`)
- **Automatic icon association** for `.rte` and `.inc` files when [Material Icon Theme](https://marketplace.visualstudio.com/items?itemName=PKief.material-icon-theme) is active

### Formatting behavior

The formatter applies RTE-specific rules:

- Structural indentation based on block keywords (`if/endif`, `switch/endswitch`, `function/endfunction`, etc.)
- Preserves preprocessor/header lines starting with `%` or `#` at column 0
- Normalizes empty lines:
	- Maximum one consecutive blank line
	- No blank line right after block openers
	- No blank line right before block closers
- Removes trailing blank lines at end of file

It can be used manually with `Format Document` (`Shift+Alt+F`) and with `Format on Save`.

## Requirements

This extension is intended for developers working with the **Generix platform**. Access to the RTE language and its documentation is managed by Generix Group.

Optional: install [Material Icon Theme](https://marketplace.visualstudio.com/items?itemName=PKief.material-icon-theme) to benefit from dedicated file icons.

## Installation

1. Open VSCode
2. Go to the Extensions panel (`Ctrl+Shift+X`)
3. Search for **RTE Language Support**
4. Click **Install**

File types `.rte` and `.inc` are automatically recognized after installation.

## Release Notes

### 1.2.0

- **Hover tooltips** — hovering over a typed variable or function shows its type name and description; `nodein` / `nodeout` blocks display their role, usage example, and available variables

### 1.1.1

- Added RTE document formatter
- Added indentation and blank-line normalization rules

### 1.0.0

Initial release:
- Syntax highlighting for RTE files
- Language configuration (brackets, comments, auto-closing pairs)
- Material Icon Theme integration for `.rte` and `.inc` files

## License

MIT

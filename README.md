# RTE Language Support

VSCode extension providing language support for **Generix RTE** (Rule Translation Engine) files.

## Features

- **Syntax highlighting** for `.rte` and `.inc` files
- **Hover documentation** — full reference for keywords, functions, constants, system parameters and typed variables
- **Bracket matching** and auto-closing pairs
- **Comment toggling** (`Ctrl+/`)
- **Document formatting** for `.rte` and `.inc` files (`Format Document` / `Shift+Alt+F`)
- **Automatic icon association** for `.rte` and `.inc` files when [Material Icon Theme](https://marketplace.visualstudio.com/items?itemName=PKief.material-icon-theme) is active

---

### Hover documentation

Hovering over any token displays inline documentation with description, usage notes, and a code example.

| Category | Examples |
|---|---|
| Structural blocks | `begin`, `nodein`, `nodeout`, `function`, `schema`, `message`, `base` |
| Control flow | `if`, `while`, `switch`, `case`, `break`, `return` |
| Operators | `and`, `or`, `not`, `in` |
| Preprocessor | `#define`, `#include` |
| Constants | `TRUE`, `FALSE`, `EMPTY`, `NL`, `EOL`, `MESSAGE_OUT` |
| Built-in functions | `build`, `substr`, `index`, `split`, `pick`, `time`, `valid`, `find`, `loadjson`… |
| File functions | `read`, `print`, `copy`, `remove`, `close`, `base64encode`, `base64decode` |
| Logging & errors | `LOG`, `ERREUR`, `edierrordump`, `addDocumentError`, `attachDocumentFile` |
| Generix library | `bfBEGIN`, `bfEND`, `bfEXIT` |
| System parameters | `pDOC.*`, `pDOF.*`, `pEDISEND.*`, `pMESSAGE.*`, `pPROCESS_*` |
| Variable prefixes | `tVar`, `nCpt`, `bOK`, `taLine`, `pSTATUS`, `eEElement`, `eAAttr`, `gGGroup`, `SSegment` |
| User functions | `bfMyFunc` (bool), `tfMyFunc` (text), `nfMyFunc` (numeric) |

---

### Formatting behavior

The formatter applies RTE-specific rules:

- Structural indentation based on block keywords (`if/endif`, `switch/endswitch`, `function/endfunction`, etc.)
- Preserves preprocessor/header lines starting with `%` or `#` at column 0
- Normalizes empty lines:
  - Maximum one consecutive blank line
  - No blank line right after block openers
  - No blank line right before block closers
- Removes trailing blank lines at end of file

Use manually with `Format Document` (`Shift+Alt+F`) or enable `Editor: Format On Save`.

---

## Variable naming conventions

| Prefix | Type | Example |
|---|---|---|
| `t` | Text | `tNom := "facture"` |
| `n` | Numeric | `nTotal := 0` |
| `b` | Boolean | `bOK := TRUE` |
| `ta` | Array | `taLine[1] := "abc"` |
| `p` | Document parameter (persistent) | `pSTATUS := "OK"` |
| `eE` | XML element value | `eEInvoiceNumber` |
| `eA` | XML attribute value | `eAkodSystemowy` |
| `gG` | XML group / parent node | `gGInvoice` |
| `S` | XML segment (target node) | `SInvoiceNumber` |
| `bf` | User function → boolean | `bfSearchIn(t, t)` |
| `tf` | User function → text | `tfFormatDate(t)` |
| `nf` | User function → numeric | `nfCountLines(t)` |

---

## Common system parameters

```rte
pDOC.UUID             ! unique document identifier
pDOC.TRANSLATOR       ! input format: CII, UBL_INVOICE, UBL_CREDITNOTE, FACTUR-X…
pDOC.TRANSPORT        ! channel: PDP, PEPPOL, KSEF, CUSTOM
pDOC.NATURE           ! B2B, B2B_INTERNATIONAL, B2C, B2G
pDOC.PROCESSING_WAY   ! SENDING or RECEIVING
pDOC.COUNTRY_RULES_1  ! sender country code (FR, DE, PL…)
pDOC.COUNTRY_RULES_2  ! recipient country code
pDOC.CUSTOM.xxx       ! free custom persistent parameter

pDOF.INPUT.NAME       ! input file name
pDOF.INPUT.TYPE       ! XML, PDF, EDI, JSON, CSV…
pDOF.OUTPUT.NAME      ! output file name

pPROCESS_OUTPUT_DIR   ! process output directory
pPROCESS_WORK_DIR     ! process temp working directory
```

---

## Requirements

This extension is intended for developers working with the **Generix platform**. Access to the RTE language and its documentation is managed by Generix Group.

Optional: install [Material Icon Theme](https://marketplace.visualstudio.com/items?itemName=PKief.material-icon-theme) to benefit from dedicated file icons.

## Installation

1. Open VSCode
2. Go to the Extensions panel (`Ctrl+Shift+X`)
3. Search for **RTE Language Support**
4. Click **Install**

File types `.rte` and `.inc` are automatically recognized after installation.

---

## Release Notes

### 1.3.0

- **Hover documentation** — full reference for all keywords, built-in functions, constants and Generix library functions with usage examples
- System parameters `pDOC.*`, `pDOF.*`, `pEDISEND.*`, `pMESSAGE.*`, `pPROCESS_*` with inline documentation
- Variable prefix hover enriched with user function prefixes (`bf`, `tf`, `nf`)
- `pDOC.CUSTOM.xxx` generic parameter supported

### 1.2.0

- Hover tooltips for typed variables and `nodein` / `nodeout` blocks

### 1.1.1

- RTE document formatter
- Indentation and blank-line normalization rules

### 1.0.0

Initial release:
- Syntax highlighting for RTE files
- Language configuration (brackets, comments, auto-closing pairs)
- Material Icon Theme integration for `.rte` and `.inc` files

## License

MIT

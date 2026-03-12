# RTE Language Support

VSCode extension providing language support for **Generix RTE** (Rule Translation Engine) files.

## Features

- **Syntax highlighting** for `.rte` and `.inc` files
- **Hover documentation** — référence complète des mots-clés, fonctions, constantes, paramètres système et variables typées
- **Autocompletion** (`Ctrl+Space`) — mots-clés, snippets de blocs, fonctions avec paramètres, constantes, paramètres `pDOC.*` / `pDOF.*`
- **Go to Definition** (`F12`) — navigation vers la définition des variables, fonctions et labels déclarés dans le fichier
- **Diagnostics (linter)** — détection en temps réel des erreurs de syntaxe, variables non déclarées, blocs non fermés et autres violations de structure
- **Bracket matching** and auto-closing pairs
- **Comment toggling** (`Ctrl+/`)
- **Document formatting** (`Shift+Alt+F`) — indentation et normalisation des lignes vides
- **Outline / Document Symbols** — vue arborescente de la structure du fichier (fonctions, labels, blocs)
- **Automatic icon association** for `.rte` and `.inc` files when [Material Icon Theme](https://marketplace.visualstudio.com/items?itemName=PKief.material-icon-theme) is active

---

## Requirements

Extension destinée aux développeurs travaillant sur la plateforme **Generix**. Optionnel : [Material Icon Theme](https://marketplace.visualstudio.com/items?itemName=PKief.material-icon-theme) pour les icônes de fichiers.

---

## Release Notes

### 1.5.0

- **Diagnostics (linter)** — détection en temps réel des erreurs de syntaxe, variables non déclarées, blocs non fermés et autres violations de structure RTE

### 1.4.3

- **Outline / Document Symbols** — vue arborescente de la structure du fichier (fonctions, labels, blocs) dans le panneau Explorer

### 1.1.4

- **Go to Definition** (`F12`) — navigation vers la définition des variables, fonctions et labels déclarés dans le fichier courant

### 1.4.0

- **Autocompletion** (`Ctrl+Space`) — snippets pour tous les blocs structurels (`nodein`, `if`, `while`, `switch`…), fonctions natives avec leurs paramètres, constantes et paramètres système `pDOC.*` / `pDOF.*`

### 1.3.0

- **Hover documentation** — référence complète avec exemples pour mots-clés, fonctions et fonctions Generix

### 1.2.0

- Hover tooltips pour les variables typées

### 1.1.1

- Formateur de document RTE (indentation + lignes vides)

### 1.0.0

- Syntax highlighting, language configuration, Material Icon Theme integration

## License

MIT

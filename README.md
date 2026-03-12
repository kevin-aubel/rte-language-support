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

### 1.4.1

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

---

## Contributing

Toute contribution est la bienvenue. Voici le processus à suivre.

### Prérequis

```bash
npm install -g @vscode/vsce
```

### Étapes

**1. Créer une branche**

```bash
git checkout main
git pull
git checkout -b feat/ma-fonctionnalite
```

Conventions de nommage : `feat/`, `fix/`, `docs/`, `refactor/`.

**2. Faire ses modifications**

Le code source est organisé dans `src/` :

```
src/
  data/hoverData.js          # mots-clés, fonctions, paramètres système
  utils/blockUtils.js        # règles d'indentation partagées
  providers/
    hoverProvider.js         # tooltip au survol
    completionProvider.js    # autocomplétion Ctrl+Space
    definitionProvider.js    # Go to Definition F12
    symbolProvider.js        # Outline / Document Symbols
    formatterProvider.js     # formateur Shift+Alt+F
    diagnosticProvider.js    # linter (blocs non fermés…)
```

**3. Tester en local (Extension Development Host)**

Ouvrir le projet dans VSCode, puis `F5` pour lancer une fenêtre de debug avec l'extension chargée.

**4. Packager et installer le `.vsix`**

```bash
vsce package
```

Cela génère un fichier `rte-language-X.X.X.vsix`. L'installer dans VSCode :

```bash
code --install-extension rte-language-X.X.X.vsix
```

Ou via l'UI : `Extensions` → `···` → `Install from VSIX…`

**5. Valider**

- Ouvrir un fichier `.rte` ou `.inc` et vérifier que la fonctionnalité modifiée fonctionne correctement.
- Vérifier qu'aucune régression n'est introduite sur les autres features (hover, complétion, linter, formateur…).

**6. Mettre à jour `package.json` et `README.md`**

- Incrémenter la version dans `package.json` (`"version"`) selon [semver](https://semver.org/) :
  - `patch` (x.x.**X**) → correctif, aucun changement d'API
  - `minor` (x.**X**.0) → nouvelle fonctionnalité rétrocompatible
  - `major` (**X**.0.0) → changement structurel majeur
- Ajouter une entrée dans la section **Release Notes** du `README.md`.

**7. Committer et ouvrir une Pull Request**

```bash
git add .
git commit -m "feat: description courte de la modification"
git push origin feat/ma-fonctionnalite
```

Puis ouvrir une PR sur GitHub vers `main`. Décrire clairement :
- Ce qui a été modifié et pourquoi
- Comment tester (scénario ou fichier `.rte` de test)

> La publication sur le Marketplace VSCode est gérée par le mainteneur après merge.

---

## License

MIT

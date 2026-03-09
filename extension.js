const vscode = require('vscode');

/**
 * Injecte automatiquement les icônes engrenage pour les fichiers .rte et .inc
 * dans Material Icon Theme (si installé et actif).
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  try {
    const iconThemeId = vscode.workspace
      .getConfiguration('workbench')
      .get('iconTheme');

    // Seulement si Material Icon Theme est actif
    if (iconThemeId && iconThemeId.startsWith('material-icon-theme')) {
      const config = vscode.workspace.getConfiguration('material-icon-theme');

      const existing = config.get('files.associations') || {};
      const associations = Object.assign({}, existing);

      let changed = false;
      if (!associations['*.rte']) { associations['*.rte'] = 'settings'; changed = true; }
      if (!associations['*.inc']) { associations['*.inc'] = 'settings'; changed = true; }

      if (changed) {
        config.update(
          'files.associations',
          associations,
          vscode.ConfigurationTarget.Global
        );
      }
    }
  } catch (err) {
    console.error('[rte-language] Erreur lors de l\'injection des icônes :', err);
  }

  // Formateur de code RTE
  const formatter = vscode.languages.registerDocumentFormattingEditProvider('rte', {
    provideDocumentFormattingEdits(document, options) {
      return formatRTE(document, options);
    }
  });

  context.subscriptions.push(formatter);

  // Hover : affiche le type de la variable/fonction survolée
  const hover = vscode.languages.registerHoverProvider('rte', {
    provideHover(document, position) {
      const range = document.getWordRangeAtPosition(position, /[a-zA-Z_][\w:]*/);
      if (!range) return;
      const word = document.getText(range);
      const info = getRteTypeInfo(word);
      if (!info) return;
      const md = new vscode.MarkdownString();
      md.appendMarkdown(`**$(symbol-variable) ${info.label}**\n\n${info.description}`);
      md.supportThemeIcons = true;
      return new vscode.Hover(md, range);
    }
  });

  context.subscriptions.push(hover);
}

/**
 * Formate un document RTE :
 *  - Passe 1 : indentation structurelle
 *  - Passe 2 : normalisation des lignes vides
 *    · max 1 ligne vide consécutive
 *    · pas de ligne vide juste après un ouvrant (if/function/while/…)
 *    · pas de ligne vide juste avant un fermant (endif/endfunction/else/…)
 */
function formatRTE(document, options) {
  const TAB = options.insertSpaces ? ' '.repeat(options.tabSize) : '\t';
  const eol = document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';

  // ── Passe 1 : indentation ────────────────────────────────────────────────
  let indent = 0;
  const pass1 = [];

  for (let i = 0; i < document.lineCount; i++) {
    const trimmed = document.lineAt(i).text.trim();

    // Ligne vide → on la garde telle quelle pour l'instant
    if (trimmed === '') {
      pass1.push('');
      continue;
    }

    // Préprocesseur et en-têtes fichier → colonne 0
    if (trimmed[0] === '%' || trimmed[0] === '#') {
      pass1.push(trimmed);
      continue;
    }

    const keyword = trimmed.toLowerCase().split('!')[0].trim();

    if (isCloser(keyword)) indent = Math.max(0, indent - 1);
    pass1.push(TAB.repeat(indent) + trimmed);
    if (isOpener(keyword)) indent++;
  }

  // ── Passe 2 : normalisation des lignes vides ─────────────────────────────
  const pass2 = [];

  for (let i = 0; i < pass1.length; i++) {
    const line = pass1[i];

    if (line !== '') {
      pass2.push(line);
      continue;
    }

    // Ligne vide : on applique les trois règles

    // Règle 1 : max 1 ligne vide consécutive
    if (pass2.length > 0 && pass2[pass2.length - 1] === '') {
      continue;
    }

    // Règle 2 : pas de ligne vide après un ouvrant
    const prevLine = lastNonBlank(pass1, i - 1);
    if (prevLine !== null && isLineOpener(prevLine)) {
      continue;
    }

    // Règle 3 : pas de ligne vide avant un fermant
    const nextLine = nextNonBlank(pass1, i + 1);
    if (nextLine !== null && isLineCloser(nextLine)) {
      continue;
    }

    pass2.push('');
  }

  // Supprime les lignes vides en toute fin de fichier
  while (pass2.length > 0 && pass2[pass2.length - 1] === '') {
    pass2.pop();
  }

  // ── Génération de l'edit ─────────────────────────────────────────────────
  const newText = pass2.join(eol);
  if (newText === document.getText()) return [];

  const fullRange = new vscode.Range(
    document.positionAt(0),
    document.positionAt(document.getText().length)
  );
  return [vscode.TextEdit.replace(fullRange, newText)];
}

// ── Helpers lignes vides ───────────────────────────────────────────────────

function isLineOpener(formattedLine) {
  const keyword = formattedLine.trim().toLowerCase().split('!')[0].trim();
  return isOpener(keyword);
}

function isLineCloser(formattedLine) {
  const keyword = formattedLine.trim().toLowerCase().split('!')[0].trim();
  return isCloser(keyword);
}

function lastNonBlank(arr, fromIndex) {
  for (let i = fromIndex; i >= 0; i--) {
    if (arr[i] !== '') return arr[i];
  }
  return null;
}

function nextNonBlank(arr, fromIndex) {
  for (let i = fromIndex; i < arr.length; i++) {
    if (arr[i] !== '') return arr[i];
  }
  return null;
}

// ── Règles d'indentation ───────────────────────────────────────────────────

/**
 * Mots-clés qui ferment un bloc (indent-- avant impression).
 * @param {string} keyword  ligne en minuscules, commentaire retiré, trimmée
 */
function isCloser(keyword) {
  if (keyword === 'endbegin')    return true;
  if (keyword === 'endend')      return true;
  if (keyword === 'endnodein')   return true;
  if (keyword === 'endnodeout')  return true;
  if (keyword === 'endfunction') return true;
  if (keyword === 'endif')       return true;
  if (keyword === 'endswitch')   return true;
  if (keyword === 'endwhile')    return true;
  if (keyword === 'endline')     return true;
  if (keyword === 'enddefault')  return true;
  // else / elseif ferment le bloc if/else précédent
  if (keyword.startsWith('else')) return true;
  // case et default: ferment le case/default précédent dans un switch
  if (keyword.startsWith('case ') || keyword.startsWith('case"')) return true;
  if (/^default\s*:/.test(keyword)) return true;
  return false;
}

/**
 * Mots-clés qui ouvrent un bloc (indent++ après impression).
 * @param {string} keyword  ligne en minuscules, commentaire retiré, trimmée
 */
function isOpener(keyword) {
  if (keyword === 'begin') return true;
  if (keyword === 'end')   return true;   // section end … endend
  if (keyword.startsWith('nodein '))   return true;
  if (keyword.startsWith('nodeout '))  return true;
  if (keyword.startsWith('function ')) return true;
  if (keyword.startsWith('if ') || keyword.startsWith('if(')) return true;
  if (keyword.startsWith('else')) return true;   // else, elseif
  if (keyword.startsWith('switch ') || keyword.startsWith('switch(')) return true;
  if (keyword.startsWith('while ') || keyword.startsWith('while(')) return true;
  if (keyword.startsWith('line(') || keyword.startsWith('line (')) return true;
  if (keyword === 'default') return true;              // section default…enddefault
  if (/^default\s*:/.test(keyword)) return true;      // default: switch (ouvre le contenu)
  if (keyword.startsWith('case ') || keyword.startsWith('case"')) return true;
  return false;
}

/**
 * Retourne le label et la description du type RTE d'un identifiant
 * selon son préfixe, ou null si non reconnu.
 * @param {string} word
 */
function getRteTypeInfo(word) {
  // Blocs structurels
  if (word === 'nodein')  return {
    label: 'nodein  →  Lecture XML',
    description:
      'Déclenché à chaque fois que le parseur XML rencontre le nœud correspondant au chemin déclaré.\n\n' +
      '```rte\nnodein SInvoiceNumber gGInvoice, gGInvoiceHeader, gGInvoiceNumber\n' +
      '    tNumFact := eEInvoiceNumber\nendnodein\n```\n\n' +
      '**Variables disponibles à l\'intérieur :**\n' +
      '- `eEXxx` — contenu texte de l\'élément\n' +
      '- `eAXxx` — valeur d\'un attribut de l\'élément'
  };
  if (word === 'nodeout') return {
    label: 'nodeout  →  Écriture XML',
    description:
      'Définit un nœud à écrire dans le message de sortie (`building`).\n\n' +
      '```rte\nnodeout SApplicationResponse gGApplicationResponse\n' +
      '    eAxmlns := "rrn:org.xcbl:..."\nendnodeout\n```\n\n' +
      '**Variables utilisables à l\'intérieur :**\n' +
      '- `eEXxx` — définit le contenu texte du nœud\n' +
      '- `eAXxx` — définit un attribut du nœud'
  };

  // Fonctions — à tester avant les variables (bf/tf/nf avant b/t/n)
  if (/^bf[A-Z]/.test(word)) return { label: `bf  →  Fonction booléenne`, description: 'Retourne `TRUE` ou `FALSE`.' };
  if (/^tf[A-Z]/.test(word)) return { label: `tf  →  Fonction texte`,     description: 'Retourne une chaîne de caractères.' };
  if (/^nf[A-Z]/.test(word)) return { label: `nf  →  Fonction numérique`, description: 'Retourne un nombre (entier ou décimal).' };

  // Nœuds XML
  if (/^eE\w/.test(word)) return { label: `eE  →  Élément XML`,    description: 'Valeur d\'un élément lu depuis le message entrant (`nodein`).' };
  if (/^eA\w/.test(word)) return { label: `eA  →  Attribut XML`,   description: 'Valeur d\'un attribut lu depuis le message entrant (`nodein`).' };
  if (/^gG\w/.test(word)) return { label: `gG  →  Groupe XML`,     description: 'Nœud ou chemin structurel dans le message XML.' };
  if (/^S[A-Z]\w/.test(word)) return { label: `S  →  Segment`,     description: 'Nœud de sortie ciblé (`nodeout`).' };

  // Variables — ta avant t
  if (/^ta[A-Z]\w*/.test(word)) return { label: `ta  →  Tableau`,   description: 'Array associatif ou indexé. Ex : `taLine[1] := "abc"`' };
  if (/^t[A-Z]\w*/.test(word))  return { label: `t  →  Texte`,      description: 'Variable de type chaîne de caractères (string). Ex : `tNom := "facture"`' };
  if (/^n[A-Z]\w*/.test(word))  return { label: `n  →  Numérique`,  description: 'Variable de type entier ou décimal. Ex : `nTotal := 42`' };
  if (/^b[A-Z]\w*/.test(word))  return { label: `b  →  Booléen`,    description: 'Variable booléenne (`TRUE` / `FALSE`). Ex : `bOK := TRUE`' };
  if (/^p[A-Z]/.test(word))     return { label: `p  →  Paramètre`,  description: 'Paramètre du document, persistant entre les sections. Ex : `pSTATUS := "OK"`' };

  return null;
}

function deactivate() {}

module.exports = { activate, deactivate };

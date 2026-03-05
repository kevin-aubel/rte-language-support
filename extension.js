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

function deactivate() {}

module.exports = { activate, deactivate };

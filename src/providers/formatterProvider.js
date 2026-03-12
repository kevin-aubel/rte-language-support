const vscode = require('vscode');
const { isOpener, isCloser, isLineOpener, isLineCloser, lastNonBlank, nextNonBlank } = require('../utils/blockUtils');

// ══════════════════════════════════════════════════════════════════════════════
// FORMATEUR RTE
// ══════════════════════════════════════════════════════════════════════════════

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

/**
 * Formate uniquement la sélection (range) dans un document RTE.
 * L'indentation initiale est calculée en analysant les lignes précédant la sélection.
 */
function formatRTERange(document, range, options) {
  const TAB = options.insertSpaces ? ' '.repeat(options.tabSize) : '\t';
  const eol = document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';

  // Calcule le niveau d'indentation au début de la sélection
  let indent = 0;
  for (let i = 0; i < range.start.line; i++) {
    const trimmed = document.lineAt(i).text.trim();
    if (trimmed === '' || trimmed[0] === '%' || trimmed[0] === '#') continue;
    const keyword = trimmed.toLowerCase().split('!')[0].trim();
    if (isCloser(keyword)) indent = Math.max(0, indent - 1);
    if (isOpener(keyword)) indent++;
  }

  // ── Passe 1 : indentation ────────────────────────────────────────────────
  const pass1 = [];
  for (let i = range.start.line; i <= range.end.line; i++) {
    const trimmed = document.lineAt(i).text.trim();
    if (trimmed === '') { pass1.push(''); continue; }
    if (trimmed[0] === '%' || trimmed[0] === '#') { pass1.push(trimmed); continue; }
    const keyword = trimmed.toLowerCase().split('!')[0].trim();
    if (isCloser(keyword)) indent = Math.max(0, indent - 1);
    pass1.push(TAB.repeat(indent) + trimmed);
    if (isOpener(keyword)) indent++;
  }

  // ── Passe 2 : normalisation des lignes vides ─────────────────────────────
  const pass2 = [];
  for (let i = 0; i < pass1.length; i++) {
    const line = pass1[i];
    if (line !== '') { pass2.push(line); continue; }
    if (pass2.length > 0 && pass2[pass2.length - 1] === '') continue;
    const prevLine = lastNonBlank(pass1, i - 1);
    if (prevLine !== null && isLineOpener(prevLine)) continue;
    const nextLine = nextNonBlank(pass1, i + 1);
    if (nextLine !== null && isLineCloser(nextLine)) continue;
    pass2.push('');
  }
  while (pass2.length > 0 && pass2[pass2.length - 1] === '') pass2.pop();

  // ── Génération de l'edit sur la plage sélectionnée ───────────────────────
  const editRange = new vscode.Range(
    new vscode.Position(range.start.line, 0),
    document.lineAt(range.end.line).range.end
  );
  const newText = pass2.join(eol);
  if (newText === document.getText(editRange)) return [];
  return [vscode.TextEdit.replace(editRange, newText)];
}

module.exports = { formatRTE, formatRTERange };

const vscode = require('vscode');
const { isOpener, isCloser } = require('../utils/blockUtils');

// ══════════════════════════════════════════════════════════════════════════════
// OUTLINE — Document Symbols
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Construit l'entrée de symbole pour un bloc ouvrant (si intéressant pour l'outline).
 * Retourne null pour les blocs non affichés (if, while, switch, case…).
 */
function makeSymbolEntry(kw, noComment, lineIndex) {
  const SK = vscode.SymbolKind;

  if (kw === 'begin') {
    return { name: 'begin', detail: 'Initialisation', kind: SK.Module, startLine: lineIndex };
  }
  if (kw === 'end') {
    return { name: 'end', detail: 'Finalisation', kind: SK.Module, startLine: lineIndex };
  }
  if (kw.startsWith('function ')) {
    const match = noComment.match(/^function\s+(\w+)\s*\(([^)]*)\)/i);
    if (match) {
      return { name: match[1], detail: `(${match[2]})`, kind: SK.Function, startLine: lineIndex };
    }
    const name = noComment.replace(/^function\s+/i, '').split(/[\s(]/)[0];
    return { name, detail: '', kind: SK.Function, startLine: lineIndex };
  }
  if (kw.startsWith('nodein ')) {
    const parts = noComment.replace(/^nodein\s+/i, '');
    const seg = parts.match(/^(S\w+)/);
    return { name: seg ? seg[1] : parts.split(' ')[0], detail: 'nodein', kind: SK.Class, startLine: lineIndex };
  }
  if (kw.startsWith('nodeout ')) {
    const parts = noComment.replace(/^nodeout\s+/i, '');
    const seg = parts.match(/^(S\w+)/);
    return { name: seg ? seg[1] : parts.split(' ')[0], detail: 'nodeout', kind: SK.Interface, startLine: lineIndex };
  }
  if (kw.startsWith('line(') || kw.startsWith('line (')) {
    const m = noComment.match(/^line\s*\((.+)\)$/i);
    return { name: `line(${m ? m[1] : '…'})`, detail: '', kind: SK.Key, startLine: lineIndex };
  }
  if (kw === 'default') {
    return { name: 'default', detail: 'bloc ligne par défaut', kind: SK.Key, startLine: lineIndex };
  }
  return null;
}

/**
 * Fournit la liste des symboles du document pour le panneau Outline et les breadcrumbs.
 *
 * Algorithme :
 *  - On maintient un compteur de profondeur avec isOpener / isCloser.
 *  - Quand on est à profondeur 0 et qu'on rencontre un bloc intéressant, on crée un
 *    « pending » symbol.
 *  - Quand la profondeur repasse à 0 après avoir traité le closer, on émet le symbole
 *    avec son range complet.
 */
function provideDocumentSymbols(document) {
  const { DocumentSymbol, Range } = vscode;
  const symbols = [];
  let pending = null;
  let depth = 0;

  for (let i = 0; i < document.lineCount; i++) {
    const raw = document.lineAt(i).text;
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const noComment = trimmed.split('!')[0].trim();
    const kw = noComment.toLowerCase();

    // ── À profondeur 0, tente de créer un symbole pour ce bloc ───────────────
    if (depth === 0) {
      pending = makeSymbolEntry(kw, noComment, i);
    }

    // ── Mise à jour de la profondeur ──────────────────────────────────────────
    if (isCloser(kw)) depth = Math.max(0, depth - 1);
    if (isOpener(kw)) depth++;

    // ── Émet le symbole dès que la profondeur revient à 0 ────────────────────
    if (pending && depth === 0) {
      const endChar = raw.trimEnd().length;
      const selLine = document.lineAt(pending.startLine).text.trimEnd().length;
      const range = new Range(pending.startLine, 0, i, endChar);
      const sel   = new Range(pending.startLine, 0, pending.startLine, selLine);
      symbols.push(new DocumentSymbol(pending.name, pending.detail, pending.kind, range, sel));
      pending = null;
    }
  }

  return symbols;
}

module.exports = { provideDocumentSymbols };

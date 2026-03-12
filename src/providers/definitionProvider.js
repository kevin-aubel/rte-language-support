const vscode = require('vscode');
const path   = require('path');

// ══════════════════════════════════════════════════════════════════════════════
// GO TO DEFINITION — F12
// ══════════════════════════════════════════════════════════════════════════════

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Résout les #include du document courant → tableau d'URI de fichiers .inc */
function resolveIncludes(document) {
  const uris = [];
  const dir = path.dirname(document.uri.fsPath);
  for (let i = 0; i < document.lineCount; i++) {
    const m = document.lineAt(i).text.match(/^\s*#include\s+"([^"]+)"/i);
    if (m) uris.push(vscode.Uri.file(path.resolve(dir, m[1])));
  }
  return uris;
}

/** Cherche `function NAME(` dans un document déjà ouvert */
function findFunctionInDocument(document, funcName) {
  const re = new RegExp(`^\\s*function\\s+${escapeRegex(funcName)}\\s*\\(`, 'i');
  for (let i = 0; i < document.lineCount; i++) {
    if (re.test(document.lineAt(i).text)) {
      return new vscode.Location(document.uri, new vscode.Position(i, 0));
    }
  }
  return null;
}

/** Cherche `function NAME(` dans un fichier (ouvert ou non) */
async function findFunctionInFile(uri, funcName) {
  try {
    const doc = await vscode.workspace.openTextDocument(uri);
    return findFunctionInDocument(doc, funcName);
  } catch {
    return null;
  }
}

async function provideDefinition(document, position) {
  const wordRange = document.getWordRangeAtPosition(position, /\w+/);
  if (!wordRange) return null;

  const funcName = document.getText(wordRange);

  // N'active que si le mot est suivi de `(`
  const after = document.lineAt(position.line).text.slice(wordRange.end.character).trimStart();
  if (!after.startsWith('(')) return null;

  // 1. Fichier courant
  const local = findFunctionInDocument(document, funcName);
  if (local) return local;

  // 2. Fichiers #include
  for (const uri of resolveIncludes(document)) {
    const result = await findFunctionInFile(uri, funcName);
    if (result) return result;
  }

  return null;
}

module.exports = { provideDefinition };

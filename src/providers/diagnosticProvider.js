const vscode = require('vscode');

// ══════════════════════════════════════════════════════════════════════════════
// DIAGNOSTICS — Linter RTE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Identifie le mot-clé structurel RTE sur une ligne (commentaire retiré, trimmée, lowercase).
 * Retourne null si la ligne ne commence pas par un mot-clé de bloc.
 */
function getRTEBlockKeyword(lower) {
  if (lower === 'begin')                                           return 'begin';
  if (lower === 'endbegin')                                        return 'endbegin';
  if (lower === 'end')                                             return 'end';
  if (lower === 'endend')                                          return 'endend';
  if (lower.startsWith('nodein ') || lower === 'nodein')           return 'nodein';
  if (lower === 'endnodein')                                       return 'endnodein';
  if (lower.startsWith('nodeout ') || lower === 'nodeout')         return 'nodeout';
  if (lower === 'endnodeout')                                      return 'endnodeout';
  if (lower.startsWith('function '))                               return 'function';
  if (lower === 'endfunction')                                     return 'endfunction';
  if (lower.startsWith('if ') || lower.startsWith('if('))          return 'if';
  if (lower === 'endif')                                           return 'endif';
  if (lower.startsWith('elseif ') || lower.startsWith('elseif('))  return 'elseif';
  if (lower === 'else')                                            return 'else';
  if (lower.startsWith('switch ') || lower.startsWith('switch('))  return 'switch';
  if (lower === 'endswitch')                                       return 'endswitch';
  if (lower.startsWith('while ') || lower.startsWith('while('))    return 'while';
  if (lower === 'endwhile')                                        return 'endwhile';
  if (lower.startsWith('line(') || lower.startsWith('line ('))     return 'line';
  if (lower === 'endline')                                         return 'endline';
  if (lower === 'default')                                         return 'default';
  if (lower === 'enddefault')                                      return 'enddefault';
  return null;
}

/**
 * Analyse un document RTE et publie les diagnostics :
 *  - Blocs non fermés (begin sans endbegin, if sans endif, etc.)
 *  - Fermetures orphelines (endbegin sans begin, endif sans if, etc.)
 *  - bfBEGIN() manquant dans le bloc begin
 *  - bfEND()   manquant dans le bloc end
 *
 * @param {vscode.TextDocument} document
 * @param {vscode.DiagnosticCollection} diagnosticCollection
 */
function lintRTEDocument(document, diagnosticCollection) {
  const diagnostics = [];
  const stack = [];   // [{ opener: string, lineIndex: number }]

  const IF_FAMILY = new Set(['if', 'elseif', 'else']);

  let inBeginBlock   = false;
  let inEndBlock     = false;
  let beginBlockLine = -1;
  let endBlockLine   = -1;
  let hasBfBEGIN     = false;
  let hasBfEND       = false;

  function top() { return stack.length > 0 ? stack[stack.length - 1] : null; }

  function mkRange(lineIndex) {
    const text = document.lineAt(lineIndex).text;
    return new vscode.Range(lineIndex, 0, lineIndex, text.length);
  }

  function addError(lineIndex, msg) {
    diagnostics.push(new vscode.Diagnostic(mkRange(lineIndex), msg, vscode.DiagnosticSeverity.Error));
  }

  function addWarning(lineIndex, msg) {
    diagnostics.push(new vscode.Diagnostic(mkRange(lineIndex), msg, vscode.DiagnosticSeverity.Warning));
  }

  for (let i = 0; i < document.lineCount; i++) {
    const rawLine   = document.lineAt(i).text;
    const noComment = rawLine.replace(/\s*!.*$/, '').trim();
    const lower     = noComment.toLowerCase();

    if (!lower) continue;

    // ── Détection bfBEGIN / bfEND ────────────────────────────────────────
    if (inBeginBlock && /\bbfBEGIN\s*\(\s*\)/i.test(noComment)) hasBfBEGIN = true;
    if (inEndBlock   && /\bbfEND\s*\(\s*\)/i.test(noComment))   hasBfEND   = true;

    const kw = getRTEBlockKeyword(lower);
    if (!kw) continue;

    // ── Traitement selon mot-clé ─────────────────────────────────────────
    switch (kw) {

      case 'begin':
        stack.push({ opener: 'begin', lineIndex: i });
        inBeginBlock   = true;
        beginBlockLine = i;
        hasBfBEGIN     = false;
        break;

      case 'endbegin':
        inBeginBlock = false;
        if (!hasBfBEGIN && beginBlockLine >= 0)
          addWarning(beginBlockLine, '`bfBEGIN()` manquant dans le bloc `begin`');
        if (top() && top().opener === 'begin') {
          stack.pop();
        } else {
          addError(i, '`endbegin` inattendu — aucun bloc `begin` ouvert');
        }
        break;

      case 'end':
        stack.push({ opener: 'end', lineIndex: i });
        inEndBlock   = true;
        endBlockLine = i;
        hasBfEND     = false;
        break;

      case 'endend':
        inEndBlock = false;
        if (!hasBfEND && endBlockLine >= 0)
          addWarning(endBlockLine, '`bfEND()` manquant dans le bloc `end`');
        if (top() && top().opener === 'end') {
          stack.pop();
        } else {
          addError(i, '`endend` inattendu — aucun bloc `end` ouvert');
        }
        break;

      case 'nodein':
        stack.push({ opener: 'nodein', lineIndex: i });
        break;

      case 'endnodein':
        if (top() && top().opener === 'nodein') {
          stack.pop();
        } else {
          addError(i, '`endnodein` inattendu — aucun bloc `nodein` ouvert');
        }
        break;

      case 'nodeout':
        stack.push({ opener: 'nodeout', lineIndex: i });
        break;

      case 'endnodeout':
        if (top() && top().opener === 'nodeout') {
          stack.pop();
        } else {
          addError(i, '`endnodeout` inattendu — aucun bloc `nodeout` ouvert');
        }
        break;

      case 'function':
        stack.push({ opener: 'function', lineIndex: i });
        break;

      case 'endfunction':
        if (top() && top().opener === 'function') {
          stack.pop();
        } else {
          addError(i, '`endfunction` inattendu — aucun bloc `function` ouvert');
        }
        break;

      case 'if':
        stack.push({ opener: 'if', lineIndex: i });
        break;

      case 'elseif':
      case 'else':
        if (top() && IF_FAMILY.has(top().opener)) {
          stack.pop();
          stack.push({ opener: kw, lineIndex: i });
        } else {
          addError(i, `\`${kw}\` inattendu — aucun bloc \`if\` ouvert`);
        }
        break;

      case 'endif':
        if (top() && IF_FAMILY.has(top().opener)) {
          stack.pop();
        } else {
          addError(i, '`endif` inattendu — aucun bloc `if`/`elseif`/`else` ouvert');
        }
        break;

      case 'switch':
        stack.push({ opener: 'switch', lineIndex: i });
        break;

      case 'endswitch':
        if (top() && top().opener === 'switch') {
          stack.pop();
        } else {
          addError(i, '`endswitch` inattendu — aucun bloc `switch` ouvert');
        }
        break;

      case 'while':
        stack.push({ opener: 'while', lineIndex: i });
        break;

      case 'endwhile':
        if (top() && top().opener === 'while') {
          stack.pop();
        } else {
          addError(i, '`endwhile` inattendu — aucun bloc `while` ouvert');
        }
        break;

      case 'line':
        stack.push({ opener: 'line', lineIndex: i });
        break;

      case 'endline':
        if (top() && top().opener === 'line') {
          stack.pop();
        } else {
          addError(i, '`endline` inattendu — aucun bloc `line` ouvert');
        }
        break;

      case 'default':
        stack.push({ opener: 'default', lineIndex: i });
        break;

      case 'enddefault':
        if (top() && top().opener === 'default') {
          stack.pop();
        } else {
          addError(i, '`enddefault` inattendu — aucun bloc `default` ouvert');
        }
        break;
    }
  }

  // ── Blocs restés ouverts à la fin du fichier ──────────────────────────────
  const EXPECTED_CLOSER = {
    begin: 'endbegin', end: 'endend',
    nodein: 'endnodein', nodeout: 'endnodeout',
    function: 'endfunction',
    if: 'endif', elseif: 'endif', else: 'endif',
    switch: 'endswitch',
    while: 'endwhile',
    line: 'endline',
    default: 'enddefault'
  };

  for (const item of stack) {
    const expected = EXPECTED_CLOSER[item.opener] ?? `end${item.opener}`;
    addError(item.lineIndex, `Bloc \`${item.opener}\` non fermé — \`${expected}\` manquant`);
  }

  diagnosticCollection.set(document.uri, diagnostics);
}

module.exports = { lintRTEDocument };

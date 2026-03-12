const vscode = require('vscode');

const { provideHover }              = require('./src/providers/hoverProvider');
const { provideCompletionItems }    = require('./src/providers/completionProvider');
const { provideDefinition }         = require('./src/providers/definitionProvider');
const { provideDocumentSymbols }    = require('./src/providers/symbolProvider');
const { formatRTE, formatRTERange } = require('./src/providers/formatterProvider');
const { lintRTEDocument }           = require('./src/providers/diagnosticProvider');

// ══════════════════════════════════════════════════════════════════════════════
// ACTIVATION DE L'EXTENSION
// ══════════════════════════════════════════════════════════════════════════════

function activate(context) {

  // ── Hover provider ─────────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.languages.registerHoverProvider({ language: 'rte' }, { provideHover })
  );

  // ── Completion provider — Ctrl+Space ──────────────────────────────────────
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      { language: 'rte' },
      { provideCompletionItems },
      '#', '.'   // déclencheurs supplémentaires pour #define/#include et pDOC.
    )
  );

  // ── Formateur de code RTE ──────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider('rte', {
      provideDocumentFormattingEdits(document, options) {
        return formatRTE(document, options);
      }
    })
  );

  // ── Formateur de sélection RTE ─────────────────────────────────────────────
  context.subscriptions.push(
    vscode.languages.registerDocumentRangeFormattingEditProvider('rte', {
      provideDocumentRangeFormattingEdits(document, range, options) {
        return formatRTERange(document, range, options);
      }
    })
  );

  // ── Document Symbols (Outline) ─────────────────────────────────────────────
  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider('rte', { provideDocumentSymbols })
  );

  // ── Go to Definition (F12) ────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider({ language: 'rte' }, { provideDefinition })
  );

  // ── Diagnostics (linter) ──────────────────────────────────────────────────
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('rte');
  context.subscriptions.push(diagnosticCollection);

  function lintIfRTE(document) {
    if (document.languageId === 'rte') lintRTEDocument(document, diagnosticCollection);
  }

  vscode.workspace.textDocuments.forEach(lintIfRTE);
  context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(lintIfRTE));
  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(e => lintIfRTE(e.document)));
  context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(doc => diagnosticCollection.delete(doc.uri)));

  // ── Injection icônes Material Icon Theme ───────────────────────────────────
  try {
    const iconThemeId = vscode.workspace
      .getConfiguration('workbench')
      .get('iconTheme');

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
}

function deactivate() {}

module.exports = { activate, deactivate };

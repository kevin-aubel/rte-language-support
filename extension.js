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

      // Copie de l'objet (readonly dans l'API VSCode)
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
    // Ne pas laisser une erreur d'icône casser l'extension RTE
    console.error('[rte-language] Erreur lors de l\'injection des icônes :', err);
  }
}

function deactivate() {}

module.exports = { activate, deactivate };

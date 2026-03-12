const vscode = require('vscode');
const { HOVER_DATA, PDOC_PARAMS } = require('../data/hoverData');

// ══════════════════════════════════════════════════════════════════════════════
// HOVER PAR PRÉFIXE DE VARIABLE
// ══════════════════════════════════════════════════════════════════════════════

function getVariablePrefixHover(word) {

  if (/^eE[A-Za-z\w:]/.test(word)) {
    return {
      label: `${word}  ·  préfixe eE → élément XML`,
      doc: `**Valeur d'un élément XML** — Peuplée automatiquement dans un bloc \`nodein\`, contient le **contenu texte** du nœud XML correspondant.\n\n\`\`\`rte\nnodein SInvoiceNumber gGInvoice, gGInvoiceHeader, gGInvoiceNumber\n    tNumFact := eEInvoiceNumber  ! contenu de <InvoiceNumber>…</InvoiceNumber>\nendnodein\n\`\`\`\n\n> Lecture seule dans \`nodein\`, assignation dans \`nodeout\`.`
    };
  }

  if (/^eA[a-z\w:]/.test(word)) {
    return {
      label: `${word}  ·  préfixe eA → attribut XML`,
      doc: `**Valeur d'un attribut XML** — Peuplée automatiquement dans un bloc \`nodein\`, contient la valeur de l'**attribut** du nœud ciblé.\n\n\`\`\`rte\nnodein SKodFormularza gGFaktura, gGNaglowek\n    tCodeSyst := eAkodSystemowy  ! attribut kodSystemowy="..."\nendnodein\n\`\`\`\n\n> Lecture seule dans \`nodein\`, assignation dans \`nodeout\`.`
    };
  }

  if (/^gG[A-Za-z\w:]/.test(word)) {
    return {
      label: `${word}  ·  préfixe gG → groupe XML (chemin parent)`,
      doc: `**Groupe / nœud XML parent** — Représente un élément structurel dans le **chemin hiérarchique** d'un \`nodein\` ou \`nodeout\` (équivalent XPath implicite).\n\nLes groupes se listent du plus général (niveau 1) au plus spécifique (niveau N), avant le segment cible \`S...\`.\n\n\`\`\`rte\nnodein SInvoiceNumber gGInvoice, gGInvoiceHeader, gGInvoiceNumber\n!                     ↑ niv 1     ↑ niv 2          ↑ niv 3\n! correspond à : Invoice > InvoiceHeader > InvoiceNumber\n\`\`\``
    };
  }

  if (/^S[A-Z][A-Za-z\w:]+$/.test(word)) {
    return {
      label: `${word}  ·  préfixe S → segment XML (nœud cible)`,
      doc: `**Segment XML ciblé** — Le **nœud XML précis** sur lequel porte le \`nodein\` ou \`nodeout\`. C'est toujours le **premier argument** du bloc.\n\nContrairement aux groupes (\`gG...\`) qui définissent le chemin, le segment est le nœud terminal effectivement lu ou écrit.\n\n\`\`\`rte\nnodein SInvoiceNumber gGInvoice, gGInvoiceHeader, gGInvoiceNumber\n!       ↑ nœud cible = élément <InvoiceNumber>\n\`\`\``
    };
  }

  if (/^ta[A-Za-z\w]/.test(word)) {
    return {
      label: `${word}  ·  préfixe ta → tableau (array)`,
      doc: `**Tableau associatif** — Peut être accédé par **index numérique** ou **clé texte**.\n\n\`\`\`rte\ntaLine[1]         := "première ligne"\ntaLine[nCpt]      := tValeur\ntaHeader["SIRET"] := tSiret\n\`\`\`\n\nItération sur toutes les entrées :\n\`\`\`rte\nwhile tIdx in taLine do\n    LOG("Ligne", taLine[tIdx])\nendwhile\n\`\`\`\n\nAlimenté aussi par \`split()\` :\n\`\`\`rte\nnNb := split(tLigne, taChamps, ";")\n\`\`\``
    };
  }

  if (/^t[A-Z]\w*$/.test(word)) {
    return {
      label: `${word}  ·  préfixe t → variable texte`,
      doc: `**Variable texte** — Contient une chaîne de caractères.\n\nInitialisée avec \`:=\`, concaténée avec \`build()\`.\n\n\`\`\`rte\ntNom     := "Facture"\ntNumFact := eEInvoiceNumber\ntResult  := build(tNom, " n°", tNumFact)\n\`\`\``
    };
  }

  if (/^n[A-Z]\w*$/.test(word)) {
    return {
      label: `${word}  ·  préfixe n → variable numérique`,
      doc: `**Variable numérique** — Entier ou décimal. Supporte les opérateurs arithmétiques et l'incrémentation.\n\n\`\`\`rte\nnTotal := 0\nnCpt++           ! incrémentation\nnTotal := nTotal + nMontantLigne\n\`\`\``
    };
  }

  if (/^b[A-Z]\w*$/.test(word)) {
    return {
      label: `${word}  ·  préfixe b → variable booléenne`,
      doc: `**Variable booléenne** — Vaut \`TRUE\` ou \`FALSE\`. Sert de flag de contrôle.\n\n\`\`\`rte\nbOK     := TRUE\nbErreur := FALSE\nif bOK then\n    LOG("Résultat", "succès")\nendif\n\`\`\``
    };
  }

  if (/^p[A-Z][A-Z_0-9]+$/.test(word)) {
    return {
      label: `${word}  ·  préfixe p → paramètre document (persistant)`,
      doc: `**Paramètre document** — Variable **persistante** : sa valeur est sauvegardée dans la base Generix par \`bfEND()\` et accessible dans les étapes suivantes du workflow.\n\nContrairement aux variables \`t...\`, \`n...\`, \`b...\` qui sont locales au RTE.\n\n\`\`\`rte\npSTATUS   := "OK"\npFORMAT   := pDOC.TRANSLATOR\npCUSTOM   := build("TYPE=", tType, ";PAYS=", tPays)\n\`\`\``
    };
  }

  if (/^cCount\w+/.test(word)) {
    return {
      label: `${word}  ·  préfixe cCount → compteur automatique`,
      doc: `**Compteur automatique Generix** — Incrémenté automatiquement par le moteur lors de certaines opérations.\n\n\`\`\`rte\ncCountAck:R08  ! compteur d'acquittements R08\n\`\`\``
    };
  }

  if (/^bf[A-Z]/.test(word)) {
    return {
      label: `${word}  ·  préfixe bf → fonction booléenne`,
      doc: `**Fonction utilisateur retournant un booléen** (\`TRUE\` / \`FALSE\`).\n\n\`\`\`rte\nfunction bfSearchIn(tString, tSearch)\n    nSearch := index(tString, tSearch)\n    if nSearch = 0 then\n        return FALSE\n    endif\n    return TRUE\nendfunction\n\`\`\``
    };
  }

  if (/^tf[A-Z]/.test(word)) {
    return {
      label: `${word}  ·  préfixe tf → fonction texte`,
      doc: `**Fonction utilisateur retournant une chaîne de caractères**.\n\n\`\`\`rte\nfunction tfFormatDate(tDate)\n    return build(substr(tDate, 9, 10), "/", substr(tDate, 6, 7), "/", substr(tDate, 1, 4))\nendfunction\n\`\`\``
    };
  }

  if (/^nf[A-Z]/.test(word)) {
    return {
      label: `${word}  ·  préfixe nf → fonction numérique`,
      doc: `**Fonction utilisateur retournant un nombre** (entier ou décimal).\n\n\`\`\`rte\nfunction nfCountLines(tContent)\n    nCpt := 0\n    ! ...\n    return nCpt\nendfunction\n\`\`\``
    };
  }

  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTRUCTION D'UN HOVER MARKDOWN
// ══════════════════════════════════════════════════════════════════════════════

function buildHover(label, doc) {
  const md = new vscode.MarkdownString();
  md.isTrusted = true;
  md.supportHtml = false;
  md.appendMarkdown(`### ${label}\n\n${doc}`);
  return new vscode.Hover(md);
}

// ══════════════════════════════════════════════════════════════════════════════
// PROVIDER PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════

function provideHover(document, position) {
  const lineText = document.lineAt(position).text;
  const wordRange = document.getWordRangeAtPosition(position, /[\w:.]+/);
  if (!wordRange) return null;

  const word = document.getText(wordRange);

  // ── 1. Paramètres système pDOC.xxx / pDOF.xxx / etc. ──────────────────────
  //    Cherche d'abord les clés exactes (ex: pDOC.TRANSLATOR)
  for (const key of Object.keys(PDOC_PARAMS)) {
    const idx = lineText.indexOf(key);
    if (idx !== -1) {
      const start = document.offsetAt(new vscode.Position(position.line, idx));
      const end   = start + key.length;
      const cur   = document.offsetAt(position);
      if (cur >= start && cur <= end) {
        return buildHover(`\`${key}\`  ·  paramètre système`, PDOC_PARAMS[key]);
      }
    }
  }
  //    Puis le préfixe générique pDOC.CUSTOM.xxx
  if (/^pDOC\.CUSTOM\.\w+$/.test(word)) {
    return buildHover(`\`${word}\`  ·  paramètre personnalisé`, PDOC_PARAMS['pDOC.CUSTOM']);
  }

  // ── 2. Préprocesseur (#define / #include) ─────────────────────────────────
  const trimmed = lineText.trimStart();
  if (trimmed.startsWith('#define') && position.character <= lineText.indexOf('#define') + 7) {
    const entry = HOVER_DATA['#define'];
    return buildHover(`\`${entry.label}\``, entry.doc);
  }
  if (trimmed.startsWith('#include') && position.character <= lineText.indexOf('#include') + 8) {
    const entry = HOVER_DATA['#include'];
    return buildHover(`\`${entry.label}\``, entry.doc);
  }

  // ── 3. Mots-clés et fonctions connus ──────────────────────────────────────
  if (HOVER_DATA[word]) {
    const entry = HOVER_DATA[word];
    return buildHover(`\`${entry.label}\``, entry.doc);
  }

  // ── 4. Préfixes de variables / fonctions utilisateur ──────────────────────
  const prefixHover = getVariablePrefixHover(word);
  if (prefixHover) {
    return buildHover(`\`${prefixHover.label}\``, prefixHover.doc);
  }

  return null;
}

module.exports = { provideHover };

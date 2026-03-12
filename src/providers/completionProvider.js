const vscode = require('vscode');
const { HOVER_DATA, PDOC_PARAMS } = require('../data/hoverData');

// ══════════════════════════════════════════════════════════════════════════════
// COMPLETION PROVIDER — Ctrl+Space
// ══════════════════════════════════════════════════════════════════════════════

function makeSnippet(label, snippet, detail, docText, kind) {
  const item = new vscode.CompletionItem(label, kind);
  item.insertText = new vscode.SnippetString(snippet);
  item.detail = detail;
  if (docText) {
    const md = new vscode.MarkdownString(docText);
    md.isTrusted = true;
    item.documentation = md;
  }
  return item;
}

function makeWord(label, detail, docText, kind) {
  const item = new vscode.CompletionItem(label, kind);
  item.detail = detail;
  if (docText) {
    const md = new vscode.MarkdownString(docText);
    md.isTrusted = true;
    item.documentation = md;
  }
  return item;
}

function provideCompletionItems(_document, _position) {
  const CIK = vscode.CompletionItemKind;
  const items = [];

  // ── Blocs structurels — snippets multi-lignes ─────────────────────────────

  items.push(makeSnippet(
    'begin', 'begin\n\tbfBEGIN()\n\t$0\nendbegin',
    'Bloc d\'initialisation (begin…endbegin)', HOVER_DATA.begin.doc, CIK.Snippet
  ));
  items.push(makeSnippet(
    'end', 'end\n\t$0\n\tbfEND()\nendend',
    'Bloc de finalisation (end…endend)', HOVER_DATA.end.doc, CIK.Snippet
  ));
  items.push(makeSnippet(
    'nodein', 'nodein S${1:Segment} gG${2:Groupe}\n\t$0\nendnodein',
    'Lecture XML (nodein…endnodein)', HOVER_DATA.nodein.doc, CIK.Snippet
  ));
  items.push(makeSnippet(
    'nodeout', 'nodeout S${1:Segment} gG${2:Groupe}\n\t$0\nendnodeout',
    'Écriture XML (nodeout…endnodeout)', HOVER_DATA.nodeout.doc, CIK.Snippet
  ));
  items.push(makeSnippet(
    'function', 'function ${1:bfNom}(${2:params})\n\t$0\n\treturn ${3:TRUE}\nendfunction',
    'Déclaration de fonction', HOVER_DATA.function.doc, CIK.Snippet
  ));
  items.push(makeSnippet(
    'if', 'if ${1:condition} then\n\t$0\nendif',
    'Condition if/then/endif', HOVER_DATA.if.doc, CIK.Snippet
  ));
  items.push(makeSnippet(
    'if/else', 'if ${1:condition} then\n\t$0\nelse\n\t\nendif',
    'Condition if/else/endif', null, CIK.Snippet
  ));
  items.push(makeSnippet(
    'if/elseif', 'if ${1:condition} then\n\t$0\nelseif ${2:condition2} then\n\t\nelse\n\t\nendif',
    'Condition if/elseif/else/endif', null, CIK.Snippet
  ));
  items.push(makeSnippet(
    'while', 'while ${1:condition} do\n\t$0\nendwhile',
    'Boucle while (condition)', HOVER_DATA.while.doc, CIK.Snippet
  ));
  items.push(makeSnippet(
    'while in', 'while ${1:tIdx} in ${2:taTableau} do\n\t$0\nendwhile',
    'Itération sur tableau (while in)', null, CIK.Snippet
  ));
  items.push(makeSnippet(
    'while TRUE', 'while TRUE then\n\tif $0 then\n\t\tbreak\n\tendif\nendwhile',
    'Boucle infinie avec break', null, CIK.Snippet
  ));
  items.push(makeSnippet(
    'switch', 'switch ${1:variable}\n\tcase "${2:valeur}" :\n\t\t$0\n\tdefault :\n\t\t\nendswitch',
    'Switch/case', HOVER_DATA.switch.doc, CIK.Snippet
  ));
  items.push(makeSnippet(
    'line', 'line("${1:motif}")\n\t$0\nendline',
    'Traitement ligne (line…endline)', HOVER_DATA.line.doc, CIK.Snippet
  ));
  items.push(makeSnippet(
    'default', 'default\n\t$0\nenddefault',
    'Bloc par défaut (default…enddefault)', HOVER_DATA.default.doc, CIK.Snippet
  ));
  items.push(makeSnippet(
    'schema receiving', 'schema "${1:chemin.xsd}" validating, receiving',
    'Schéma message entrant', HOVER_DATA.schema.doc, CIK.Snippet
  ));
  items.push(makeSnippet(
    'schema building', 'schema "${1:chemin.xsd}" validating, building',
    'Schéma message sortant', HOVER_DATA.schema.doc, CIK.Snippet
  ));
  items.push(makeSnippet(
    'message', 'message "${1:chemin.xsd}" cloning',
    'Message cloning (sans transformation)', HOVER_DATA.message.doc, CIK.Snippet
  ));
  items.push(makeSnippet(
    'base', 'base "${1:fichier.cfg}" ${2:ALIAS}',
    'Base de paramétrage', HOVER_DATA.base.doc, CIK.Snippet
  ));
  items.push(makeSnippet(
    '#define', '#define ${1:NOM} "${2:valeur}"',
    'Directive préprocesseur', HOVER_DATA['#define'].doc, CIK.Snippet
  ));
  items.push(makeSnippet(
    '#include', '#include "${1:fichier.inc}"',
    'Inclusion de fichier .inc', HOVER_DATA['#include'].doc, CIK.Snippet
  ));

  // ── Mots-clés simples ─────────────────────────────────────────────────────

  const simpleKeywords = [
    'then', 'else', 'elseif', 'endif',
    'endbegin', 'endend', 'endnodein', 'endnodeout',
    'endfunction', 'endwhile', 'endswitch', 'endline', 'enddefault',
    'break', 'return', 'in', 'do', 'and', 'or', 'not', 'case',
    'receiving', 'building', 'validating', 'cloning',
  ];
  for (const kw of simpleKeywords) {
    const entry = HOVER_DATA[kw];
    items.push(makeWord(kw, 'mot-clé RTE', entry ? entry.doc : null, CIK.Keyword));
  }

  // ── Constantes ────────────────────────────────────────────────────────────

  for (const c of ['TRUE', 'FALSE', 'EMPTY', 'NL', 'EOL', 'MESSAGE_OUT']) {
    const entry = HOVER_DATA[c];
    items.push(makeWord(c, 'constante RTE', entry ? entry.doc : null, CIK.Constant));
  }

  // ── Fonctions built-in ────────────────────────────────────────────────────

  const builtins = [
    ['build',             'build(${1:a}, ${2:b})',                                   'Concaténation de valeurs'],
    ['length',            'length(${1:texte})',                                       'Longueur de chaîne'],
    ['substr',            'substr(${1:texte}, ${2:debut}, ${3:EOL})',                 'Extraction de sous-chaîne'],
    ['index',             'index(${1:texte}, "${2:recherche}")',                      'Position d\'une sous-chaîne (0 = absent)'],
    ['replace',           'replace(${1:texte}, "${2:ancien}", "${3:nouveau}")',       'Remplacement de sous-chaîne'],
    ['toupper',           'toupper(${1:texte})',                                      'Conversion en MAJUSCULES'],
    ['tolower',           'tolower(${1:texte})',                                      'Conversion en minuscules'],
    ['peel',              'peel(${1:texte}, ${2:NL})',                               'Supprime caractère en début/fin'],
    ['split',             'split(${1:texte}, ${2:taTableau}, "${3:;}")',             'Découpe en tableau'],
    ['pick',              'pick(${1:1}, ${2:1}, ${3:EOL})',                          'Lit un champ du message courant'],
    ['time',              'time("${1:%Y-%m-%dT%H:%M:%S}")',                          'Date/heure courante (strftime)'],
    ['copy',              'copy(${1:source}, ${2:destination})',                      'Copie de fichier'],
    ['remove',            'remove(${1:chemin})',                                      'Suppression de fichier'],
    ['read',              'read(${1:chemin})',                                        'Lecture de fichier'],
    ['close',             'close(${1:chemin})',                                       'Fermeture de fichier ouvert'],
    ['base64encode',      'base64encode(${1:source}, ${2:destination})',              'Encodage Base64'],
    ['base64decode',      'base64decode(${1:source}, ${2:destination})',              'Décodage Base64'],
    ['print',             'print(${1:valeur})',                                       'Écriture en sortie'],
    ['valid',             'valid(${1:objet})',                                        'Teste si valide/non vide'],
    ['log',               'log(${1:valeur}, NL)',                                     'Log bas niveau'],
    ['LOG',               'LOG("${1:label}", ${2:valeur})',                           'Log informatif Generix'],
    ['ERREUR',            'ERREUR("${1:label}", ${2:EMPTY})',                         'Log d\'erreur Generix'],
    ['edierrordump',      'edierrordump(${1:MESSAGE_OUT})',                           'Dump erreur message XML'],
    ['addDocumentError',  'addDocumentError(${1:pDOC.UUID}, "${2:code}", "${3:msg}")', 'Ajoute erreur fonctionnelle'],
    ['attachDocumentFile','attachDocumentFile(${1:pDOC.UUID}, ${2:chemin}, "${3:PDF}")', 'Attache fichier au document'],
    ['loadjson',          'loadjson(${1:tJson})',                                     'Parse JSON → objet navigable'],
    ['find',              'find(${1:BASE}, ${2:CLE}="${3:val}", ${4:COLONNE})',       'Recherche en base de paramétrage'],
    ['bfBEGIN',           'bfBEGIN()',                                                'Initialisation Generix [OBLIGATOIRE]'],
    ['bfEND',             'bfEND()',                                                  'Finalisation Generix [OBLIGATOIRE]'],
    ['bfEXIT',            'bfEXIT(${1|0,1|})',                                       'Arrêt immédiat (0=succès, 1=erreur)'],
  ];

  for (const [label, snippet, detail] of builtins) {
    const entry = HOVER_DATA[label];
    items.push(makeSnippet(label, snippet, detail, entry ? entry.doc : null, CIK.Function));
  }

  // ── Paramètres système pDOC.* / pDOF.* / pEDISEND.* / etc. ──────────────

  for (const [key, doc] of Object.entries(PDOC_PARAMS)) {
    const item = new vscode.CompletionItem(key, CIK.Variable);
    item.detail = 'paramètre système RTE';
    const md = new vscode.MarkdownString(doc);
    md.isTrusted = true;
    item.documentation = md;
    items.push(item);
  }

  return items;
}

module.exports = { provideCompletionItems };

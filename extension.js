const vscode = require('vscode');
const path   = require('path');

// ══════════════════════════════════════════════════════════════════════════════
// BASE DE DONNÉES HOVER — mots-clés, fonctions, constantes
// ══════════════════════════════════════════════════════════════════════════════

const HOVER_DATA = {

  // ── Blocs structurels ──────────────────────────────────────────────────────

  begin: {
    label: 'begin … endbegin',
    doc: `**Bloc d'initialisation** — Exécuté **une seule fois** au démarrage du RTE, avant toute lecture du message.\n\nUtilisé pour initialiser les variables et déclarer des valeurs par défaut.\n\n> ⚠️ La **première instruction** doit toujours être \`bfBEGIN()\`.\n\n\`\`\`rte\nbegin\n    bfBEGIN()\n    tMode := "SENDING"\n    nCpt  := 0\n    bOK   := TRUE\nendbegin\n\`\`\``
  },
  endbegin: {
    label: 'endbegin',
    doc: 'Ferme le bloc **begin**.'
  },

  end: {
    label: 'end … endend',
    doc: `**Bloc de finalisation** — Exécuté **une seule fois** à la fin du RTE, après traitement complet du message.\n\nContient les traitements finaux : impression du message de sortie, logs de synthèse, gestion des erreurs.\n\n> ⚠️ La **dernière instruction** doit toujours être \`bfEND()\`.\n\n\`\`\`rte\nend\n    if valid(MESSAGE_OUT) then\n        print(MESSAGE_OUT)\n    else\n        edierrordump(MESSAGE_OUT)\n        bfEXIT(1)\n    endif\n    bfEND()\nendend\n\`\`\``
  },
  endend: {
    label: 'endend',
    doc: 'Ferme le bloc **end**.'
  },

  nodein: {
    label: 'nodein SSegment gGGroupe1, gGGroupe2, … endnodein',
    doc: `**Bloc de lecture XML** — Déclenché à chaque fois que le parseur XML atteint le nœud correspondant au chemin décrit.\n\nLe **premier argument** est le segment cible (\`S...\`), les arguments suivants sont les groupes parents (chemin XPath implicite, du plus général au plus spécifique).\n\nDans ce bloc on peut lire :\n- \`eEMonElement\` → **contenu texte** de l'élément XML\n- \`eAmonAttribut\` → valeur d'un **attribut** XML\n\n\`\`\`rte\nnodein SInvoiceNumber gGInvoice, gGInvoiceHeader, gGInvoiceNumber\n    tNumFact := eEInvoiceNumber\nendnodein\n\`\`\``
  },
  endnodein: {
    label: 'endnodein',
    doc: 'Ferme le bloc **nodein**.'
  },

  nodeout: {
    label: 'nodeout SSegment gGGroupe1, … endnodeout',
    doc: `**Bloc d'écriture XML** — Construit un nœud dans le message de sortie (\`MESSAGE_OUT\`).\n\nOn assigne les valeurs via :\n- \`eEMonElement := valeur\` → contenu texte\n- \`eAmonAttribut := valeur\` → attribut XML\n\n\`\`\`rte\nnodeout SApplicationResponseTypeCoded gGApplicationResponse, gGApplicationResponseHeader\n    eEApplicationResponseTypeCoded := "Error"\nendnodeout\n\`\`\`\n\nValider et imprimer en fin de traitement :\n\`\`\`rte\nif valid(MESSAGE_OUT) then\n    print(MESSAGE_OUT)\nelse\n    edierrordump(MESSAGE_OUT)\n    bfEXIT(1)\nendif\n\`\`\``
  },
  endnodeout: {
    label: 'endnodeout',
    doc: 'Ferme le bloc **nodeout**.'
  },

  line: {
    label: 'line("motif") … endline',
    doc: `**Bloc de traitement ligne** — Déclenché si la ligne courante du fichier d'entrée **contient le motif** spécifié.\n\nUtile pour traiter des fichiers non-XML (CSV, EDI, texte brut…).\n\nVariantes :\n- \`line("motif")\` → ligne **contient** le motif\n- \`line(1:"motif")\` → motif en **début** de ligne (position 1)\n- \`line(tVar)\` → motif stocké dans une variable\n\n\`\`\`rte\nline("<Invoice xmlns")\n    tLine := pick(1, 1, EOL)\n    nCpt++\nendline\n\`\`\``
  },
  endline: {
    label: 'endline',
    doc: 'Ferme le bloc **line**.'
  },

  default: {
    label: 'default … enddefault',
    doc: `**Bloc par défaut ligne** — Traite toutes les lignes **non matchées** par les blocs \`line\`.\n\nAnalogue au \`default\` d'un switch, mais pour les lignes du fichier d'entrée.\n\n\`\`\`rte\ndefault\n    nCpt++\n    taLine[nCpt] := pick(1, 1, EOL)\nenddefault\n\`\`\``
  },
  enddefault: {
    label: 'enddefault',
    doc: 'Ferme le bloc **default**.'
  },

  function: {
    label: 'function nom(params) … endfunction',
    doc: `**Déclaration de fonction utilisateur**.\n\nConventions de nommage obligatoires :\n- \`bf...\` → retourne un **booléen** (TRUE/FALSE)\n- \`tf...\` → retourne un **texte**\n- \`nf...\` → retourne un **numérique**\n\nLes fonctions se déclarent **après** le bloc \`end … endend\`.\n\n\`\`\`rte\nfunction bfSearchIn(tString, tSearch)\n    nSearch := index(tString, tSearch)\n    if nSearch = 0 then\n        return FALSE\n    endif\n    return TRUE\nendfunction\n\`\`\``
  },
  endfunction: {
    label: 'endfunction',
    doc: 'Ferme le bloc **function**.'
  },

  schema: {
    label: 'schema "chemin.xsd" [validating,] receiving|building',
    doc: `**Déclaration de schéma XSD** — Associe un fichier XSD au message entrant ou sortant pour validation et parsage.\n\nModes (combinables) :\n- \`receiving\` → message **entrant** (lu depuis l'input)\n- \`building\` → message **sortant** (construit via \`nodeout\`)\n- \`validating\` → active la **validation XSD** stricte\n\n\`\`\`rte\nschema "xcbl/v4_0/financial/v1_0/financial.xsd" validating, receiving\nschema "xcbl/v4_0/messagemanagement/v1_0/messagemanagement.xsd" validating, building\n\`\`\``
  },

  message: {
    label: 'message "chemin.xsd" cloning',
    doc: `**Passage du message sans transformation** — Le message entrant est transmis tel quel en sortie.\n\nUtilisé quand le RTE effectue uniquement des contrôles ou des paramétrages, sans modifier le XML.\n\n\`\`\`rte\nmessage "xcbl/v4_0/financial/v1_0/financial.xsd" cloning\n\`\`\``
  },

  base: {
    label: 'base "fichier.cfg" ALIAS',
    doc: `**Déclaration d'une base de paramétrage** — Donne accès à un fichier de configuration Generix via la fonction \`find()\`.\n\nL'\`ALIAS\` est utilisé comme premier argument dans \`find()\`.\n\n\`\`\`rte\nbase "pdp_setting.cfg" PS\n! ...\ntEndpoint := find(PS, TYPE="INVOICE", COUNTRY="FR", URL)\n\`\`\``
  },

  receiving: {
    label: 'receiving',
    doc: 'Modificateur de `schema` — indique que ce schéma décrit le message **entrant** (lecture/parsing XML).'
  },
  building: {
    label: 'building',
    doc: 'Modificateur de `schema` — indique que ce schéma décrit le message **sortant** (construction via `nodeout`).'
  },
  validating: {
    label: 'validating',
    doc: 'Modificateur de `schema` — active la **validation XSD** du message contre le schéma déclaré. Une erreur de validation provoque un arrêt du traitement.'
  },
  cloning: {
    label: 'cloning',
    doc: 'Modificateur de `message` — le message entrant est **cloné tel quel** en sortie, sans aucune transformation XML.'
  },

  // ── Contrôle de flux ───────────────────────────────────────────────────────

  if: {
    label: 'if condition then … [elseif …] [else …] endif',
    doc: `**Condition** — Structure if/elseif/else/endif.\n\nOpérateurs de comparaison : \`=\`, \`<>\`, \`<\`, \`>\`, \`<=\`, \`>=\`\nOpérateurs logiques : \`and\`, \`or\`, \`not\`\n\n\`\`\`rte\nif nError <> 0 then\n    LOG("Statut", "ERREUR")\nelseif tFlag = "warn" then\n    LOG("Statut", "WARN")\nelse\n    LOG("Statut", "OK")\nendif\n\`\`\``
  },
  then: {
    label: 'then',
    doc: 'Introduit le corps d\'une condition `if … then` ou d\'une boucle `while TRUE then`.'
  },
  else: {
    label: 'else',
    doc: 'Branche **alternative** d\'un `if` — exécutée si aucune condition précédente n\'est vraie.'
  },
  elseif: {
    label: 'elseif condition then',
    doc: 'Condition **alternative** dans un bloc `if`. Permet d\'enchaîner plusieurs conditions sans imbriquer des `if`.'
  },
  endif: {
    label: 'endif',
    doc: 'Ferme un bloc **if**.'
  },

  while: {
    label: 'while condition do … endwhile',
    doc: `**Boucle while** — Trois formes disponibles :\n\n**1. Condition numérique / booléenne :**\n\`\`\`rte\nwhile nI < nMax do\n    nI++\nendwhile\n\`\`\`\n\n**2. Itération sur tableau :**\n\`\`\`rte\nwhile tIdx in taMonTableau do\n    log(taMonTableau[tIdx], NL)\nendwhile\n\`\`\`\n\n**3. Boucle infinie avec \`break\` :**\n\`\`\`rte\nwhile TRUE then\n    if nPos = 0 then\n        break\n    endif\nendwhile\n\`\`\``
  },
  do: {
    label: 'do',
    doc: 'Introduit le corps d\'une boucle **while condition do**.'
  },
  endwhile: {
    label: 'endwhile',
    doc: 'Ferme le bloc **while**.'
  },

  switch: {
    label: 'switch variable … endswitch',
    doc: `**Switch/case** — Sélection par valeur de variable.\n\nSupporte le **fall-through** : un \`case\` sans instructions tombe dans le \`case\` suivant.\n\n\`\`\`rte\nswitch pDOC.TRANSLATOR\n    case "CII" :\n        pTYPE := "{'kind':'INVOIC','norm':'CII'}"\n    case "UBL_INVOICE" :\n    case "UBL_CREDITNOTE" :           ! fall-through\n        pTYPE := "{'kind':'INVOIC','norm':'UBL 2.1'}"\n    default :\n        pTYPE := build("{'kind':'INVOIC','norm':'", pDOC.TRANSLATOR, "'")\nendswitch\n\`\`\``
  },
  case: {
    label: 'case "valeur" :',
    doc: 'Branche d\'un **switch**. Un `case` vide sans instructions tombe dans le `case` suivant (**fall-through**).'
  },
  endswitch: {
    label: 'endswitch',
    doc: 'Ferme le bloc **switch**.'
  },

  return: {
    label: 'return valeur',
    doc: '**Retourne une valeur** depuis une fonction utilisateur et stoppe immédiatement son exécution.'
  },
  break: {
    label: 'break',
    doc: '**Interrompt** une boucle `while` ou sort d\'un `case` dans un `switch`.'
  },
  in: {
    label: 'in',
    doc: 'Opérateur d\'**itération sur tableau** dans `while tIdx in taTableau do` — parcourt toutes les clés du tableau.'
  },
  and: {
    label: 'and',
    doc: 'Opérateur logique **ET** — `(condA and condB)` est vrai si les deux conditions sont vraies.'
  },
  or: {
    label: 'or',
    doc: 'Opérateur logique **OU** — `(condA or condB)` est vrai si au moins une condition est vraie.'
  },
  not: {
    label: 'not',
    doc: 'Opérateur logique **NON** — `not (cond)` inverse la valeur booléenne de la condition.'
  },

  // ── Préprocesseur ──────────────────────────────────────────────────────────

  '#define': {
    label: '#define NOM "valeur"',
    doc: `**Directive de préprocesseur** — Définit une constante textuelle substituée à la compilation (avant exécution).\n\nUtilisé pour les métadonnées standard du fichier :\n\`\`\`rte\n#define PROG_NAME "MON_RTE"\n#define PROG_VER  "1.0"\n#define PROG_DATE "09/03/2026"\n#define PROG_INFO build(PROG_NAME," v",PROG_VER," du ",PROG_DATE)\n\`\`\``
  },
  '#include': {
    label: '#include "fichier.inc"',
    doc: `**Inclusion de fichier** — Insère le contenu d'un fichier \`.inc\` (bibliothèque partagée) au point d'inclusion, avant compilation.\n\nToujours inclure la bibliothèque standard Generix :\n\`\`\`rte\n#include "generix_fct_V1_3.inc"\n#include "mes_fonctions_communes.inc"\n\`\`\``
  },

  // ── Constantes ─────────────────────────────────────────────────────────────

  TRUE: {
    label: 'TRUE — constante booléenne',
    doc: '**Valeur booléenne vraie**. Utilisé pour initialiser des variables `b...` ou dans des conditions.\n\n```rte\nbOK := TRUE\nwhile TRUE then  ! boucle infinie\n```'
  },
  FALSE: {
    label: 'FALSE — constante booléenne',
    doc: '**Valeur booléenne fausse**. Utilisé pour initialiser des variables `b...` ou annuler un flag.\n\n```rte\nbErreur := FALSE\nif bErreur = FALSE then\n```'
  },
  EMPTY: {
    label: 'EMPTY — valeur vide',
    doc: '**Valeur vide** — Représente une chaîne vide (`""`) ou zéro selon le contexte.\n\nUtilisé pour réinitialiser une variable ou comme second argument de `ERREUR()` quand il n\'y a pas de valeur à afficher.\n\n```rte\ntBuffer := EMPTY\nERREUR("Champ manquant", EMPTY)\n```'
  },
  NL: {
    label: 'NL — retour à la ligne (\\n)',
    doc: '**Caractère de retour à la ligne** (`\\n`).\n\nUtilisé dans `print()`, `log()`, `peel()` pour gérer les fins de ligne.\n\n```rte\nprint("Traitement terminé", NL)\ntPropre := peel(tLine, NL)  ! supprime le \\n en bout de ligne\n```'
  },
  EOL: {
    label: 'EOL — fin de ligne (marqueur de fin)',
    doc: '**Marqueur de fin de ligne** — Utilisé dans `pick()` et `substr()` pour indiquer "jusqu\'à la fin".\n\n```rte\ntLine   := pick(1, 1, EOL)     ! lit toute la ligne courante\ntReste  := substr(tVal, 5, EOL) ! extrait du 5e caractère à la fin\n```'
  },
  MESSAGE_OUT: {
    label: 'MESSAGE_OUT — message XML de sortie',
    doc: '**Référence au message XML de sortie** — Construit progressivement par les blocs `nodeout`.\n\nDoit être validé avant impression :\n\n```rte\nif valid(MESSAGE_OUT) then\n    print(MESSAGE_OUT)\nelse\n    edierrordump(MESSAGE_OUT)\n    bfEXIT(1)\nendif\n```'
  },

  // ── Fonctions built-in ─────────────────────────────────────────────────────

  build: {
    label: 'build(a, b, c, …) → texte',
    doc: `**Concatène** plusieurs valeurs (texte, numérique, variable, constante) en une seule chaîne.\n\nC'est la fonction de concaténation principale en RTE — il n'y a pas d'opérateur \`+\` pour les chaînes.\n\n\`\`\`rte\ntMsg  := build("Facture n°", tNumFact, " du ", tDate)\nLOG("Info", build("Traité : ", nCpt, " lignes"))\n\`\`\``
  },
  length: {
    label: 'length(texte) → numérique',
    doc: `**Retourne la longueur** d'une chaîne de caractères. Retourne \`0\` si la chaîne est vide.\n\n\`\`\`rte\nnLen := length(tNom)\nif nLen = 0 then\n    ERREUR("Nom vide", EMPTY)\nendif\n\`\`\``
  },
  substr: {
    label: 'substr(texte, début, fin) → texte',
    doc: `**Extrait une sous-chaîne** (indices **1-based**).\n\nUtiliser \`EOL\` comme borne de fin pour extraire jusqu'à la fin de la chaîne.\n\n\`\`\`rte\ntAnnee  := substr(tDate, 1, 4)    ! "2026" depuis "2026-03-09"\ntMois   := substr(tDate, 6, 7)    ! "03"\ntReste  := substr(tDate, 6, EOL)  ! "03-09" (du 6e à la fin)\n\`\`\``
  },
  index: {
    label: 'index(texte, recherche) → numérique',
    doc: `**Retourne la position** (1-based) de la première occurrence de \`recherche\` dans \`texte\`.\n\nRetourne **0** si absent — à tester avant tout \`substr()\`.\n\n\`\`\`rte\nnPos := index(tLine, "<Invoice")\nif nPos = 0 then\n    ! "<Invoice" non trouvé dans tLine\nendif\n\`\`\``
  },
  replace: {
    label: 'replace(texte, ancien, nouveau) → texte',
    doc: `**Remplace** toutes les occurrences de \`ancien\` par \`nouveau\` dans \`texte\`.\n\n\`\`\`rte\ntMontant := replace(tMontantBrut, ",", ".")  ! virgule → point décimal\ntNoPunct  := replace(tSiret, " ", EMPTY)     ! supprime les espaces\n\`\`\``
  },
  toupper: {
    label: 'toupper(texte) → texte',
    doc: `Convertit une chaîne en **MAJUSCULES**.\n\n\`\`\`rte\ntCode := toupper(tCodeBrut)  ! "fr" → "FR"\n\`\`\``
  },
  tolower: {
    label: 'tolower(texte) → texte',
    doc: `Convertit une chaîne en **minuscules**.\n\n\`\`\`rte\ntFormat := tolower(pDOC.TRANSLATOR)  ! "UBL_INVOICE" → "ubl_invoice"\n\`\`\``
  },
  peel: {
    label: 'peel(texte, caractère) → texte',
    doc: `**Supprime** le caractère spécifié en **début et fin** de chaîne (équivalent d'un trim ciblé).\n\nCourant pour nettoyer les retours à la ligne en fin de ligne lue.\n\n\`\`\`rte\ntPropre := peel(tLine, NL)   ! supprime le \\n en début/fin\ntSans   := peel(tVal, " ")   ! supprime les espaces en début/fin\n\`\`\``
  },
  split: {
    label: 'split(texte, taTableau, séparateur) → numérique',
    doc: `**Découpe** une chaîne selon le séparateur et remplit \`taTableau\` (tableau indexé à partir de 1).\n\nRetourne le **nombre d'éléments** produits.\n\n\`\`\`rte\nnNb := split(tLigne, taParts, ";")\nnI  := 1\nwhile (nI <= nNb) do\n    tChamp := taParts[nI]\n    LOG("Champ", tChamp)\n    nI++\nendwhile\n\`\`\``
  },
  pick: {
    label: 'pick(colonne, ligne, fin) → texte',
    doc: `**Lit un champ** dans le message courant (flux d'entrée).\n\nLe plus souvent utilisé pour lire **toute la ligne courante** :\n\`\`\`rte\ntLine := pick(1, 1, EOL)  ! lit depuis la col 1 jusqu'à EOL\n\`\`\`\n\nPour les fichiers à **structure fixe** (colonnes positionnelles) :\n\`\`\`rte\ntCode := pick(1, 1, 3)    ! colonnes 1 à 3\ntNom  := pick(4, 1, 33)   ! colonnes 4 à 33\n\`\`\``
  },
  time: {
    label: 'time(format) → texte  ou  time("now", format)',
    doc: `**Retourne la date/heure courante** selon le format \`strftime\`.\n\nFormats les plus courants :\n- \`%Y-%m-%dT%H:%M:%S\` → \`2026-03-09T14:30:00\` (ISO 8601)\n- \`%Y%m%d\` → \`20260309\`\n- \`%d/%m/%Y\` → \`09/03/2026\`\n- \`%H:%M:%S\` → heure seule\n\n\`\`\`rte\ntNow  := time("%Y-%m-%dT%H:%M:%S")\ntDate := time("now", "%Y%m%d")\n\`\`\``
  },
  copy: {
    label: 'copy(source, destination)',
    doc: `**Copie un fichier** depuis \`source\` vers \`destination\`.\n\n\`\`\`rte\ncopy(tCheminSrc, tCheminDest)\n\`\`\``
  },
  remove: {
    label: 'remove(chemin)',
    doc: `**Supprime un fichier** du système de fichiers.\n\n\`\`\`rte\nremove(tFichierTemp)  ! nettoyage après traitement\n\`\`\``
  },
  read: {
    label: 'read(chemin) → texte',
    doc: `**Lit le contenu entier d'un fichier** et le retourne comme texte.\n\n\`\`\`rte\ntContenu := read(tCheminFichier)\n\`\`\``
  },
  close: {
    label: 'close(chemin)',
    doc: `**Ferme un fichier ouvert** — Nécessaire après une redirection \`>>\` pour s'assurer que le contenu est bien écrit sur disque.\n\n\`\`\`rte\nprint(tData) >> tCheminSortie\nclose(tCheminSortie)  ! important : vide le buffer\n\`\`\``
  },
  base64encode: {
    label: 'base64encode(source, destination)',
    doc: `**Encode un fichier en Base64** et écrit le résultat dans \`destination\`.\n\nUtilisé pour embarquer des pièces jointes (PDF, images) dans un message XML.\n\n\`\`\`rte\nbase64encode(tFichierPDF, tFichierB64)\ntContenuB64 := read(tFichierB64)\n\`\`\``
  },
  base64decode: {
    label: 'base64decode(source, destination)',
    doc: `**Décode un fichier Base64** et écrit le résultat binaire dans \`destination\`.\n\n\`\`\`rte\nbase64decode(tFichierB64, tFichierOriginal)\n\`\`\``
  },
  print: {
    label: 'print(valeur [, NL])  ou  print(val) >> fichier',
    doc: `**Écrit en sortie** (stdout) ou **redirige vers un fichier** avec \`>>\`.\n\nUsages principaux :\n\`\`\`rte\nprint(MESSAGE_OUT)            ! écrit le XML de sortie\nprint("debug: ", tVal, NL)    ! log dans la console\nprint(tLigne) >> tCheminOut   ! écrit dans un fichier (append)\n\`\`\`\n\n> Ne pas oublier \`close(tCheminOut)\` après une redirection.`
  },
  valid: {
    label: 'valid(objet) → booléen',
    doc: `**Teste si une valeur est valide** — retourne \`TRUE\` si la variable est non vide, non nulle, non \`EMPTY\`.\n\nFonctionne sur les variables texte/num/bool, les messages XML, les tableaux.\n\n\`\`\`rte\nif valid(MESSAGE_OUT) then\n    print(MESSAGE_OUT)\nendif\nif not valid(tNumFact) then\n    ERREUR("Numéro de facture manquant", EMPTY)\nendif\n\`\`\``
  },
  log: {
    label: 'log(valeur, …) — log bas niveau',
    doc: `**Log bas niveau** — Écrit dans le journal d'exécution du RTE.\n\nPréférer **\`LOG()\`** (majuscules) qui est la version Generix avec étiquette structurée.\n\n\`\`\`rte\nlog("Valeur trouvée: ", tVal, NL)\n\`\`\``
  },
  LOG: {
    label: 'LOG("label", valeur)',
    doc: `**Log informatif Generix** — Enregistre une information dans le journal avec une étiquette lisible.\n\nVisible dans l'interface Generix au niveau du document traité.\n\n\`\`\`rte\nLOG("NumFacture", tNumFact)\nLOG("Statut",     pDOC.STATUS)\nLOG("NbLignes",   nCpt)\n\`\`\``
  },
  ERREUR: {
    label: 'ERREUR("label", valeur)',
    doc: `**Log d'erreur Generix** — Enregistre une erreur dans le journal.\n\n> ⚠️ N'arrête **pas** le traitement — utiliser \`bfEXIT(1)\` ensuite si nécessaire.\n\n\`\`\`rte\nERREUR("Champ TVA manquant", tChampTVA)\nbfEXIT(1)\n\`\`\``
  },
  edierrordump: {
    label: 'edierrordump(MESSAGE_OUT)',
    doc: `**Dump du message en erreur** — Écrit dans le journal les détails d'erreur d'un message XML non valide.\n\nÀ utiliser systématiquement quand \`valid(MESSAGE_OUT)\` retourne \`FALSE\`.\n\n\`\`\`rte\nif not valid(MESSAGE_OUT) then\n    edierrordump(MESSAGE_OUT)\n    bfEXIT(1)\nendif\n\`\`\``
  },
  addDocumentError: {
    label: 'addDocumentError(uuid, code, message)',
    doc: `**Ajoute une erreur fonctionnelle au document** dans le système Generix.\n\n- \`uuid\` : identifiant du document (\`pDOC.UUID\`)\n- \`code\` : code erreur métier (ex: \`"ERR_TVA_001"\`)\n- \`message\` : description lisible\n\n\`\`\`rte\naddDocumentError(pDOC.UUID, "ERR_TVA_001", "Taux de TVA invalide pour la France")\n\`\`\``
  },
  attachDocumentFile: {
    label: 'attachDocumentFile(uuid, chemin, type)',
    doc: `**Attache un fichier à un document** dans Generix (ex : PDF associé à une facture XML).\n\n\`\`\`rte\nattachDocumentFile(pDOC.UUID, tCheminPDF, "PDF")\n\`\`\``
  },
  loadjson: {
    label: 'loadjson(chaîneJSON) → objet',
    doc: `**Parse une chaîne JSON** en objet navigable par clés.\n\n\`\`\`rte\noData   := loadjson(tJsonString)\ntValeur := oData["racine"]["cle"]\n\`\`\``
  },
  find: {
    label: 'find(BASE, CLE=valeur, …, COLONNE) → texte',
    doc: `**Recherche en base de paramétrage** — Requête sur un fichier \`.cfg\` déclaré avec \`base\`.\n\nRetourne la valeur de la colonne demandée (dernier argument).\n\n\`\`\`rte\nbase "pdp_setting.cfg" PS\n! ...\ntEndpoint := find(PS, TYPE="INVOICE", COUNTRY="FR", URL)\n\`\`\`\n\nLes recherches peuvent être enchaînées (cascade) pour affiner le résultat.`
  },

  // ── Fonctions bibliothèque Generix ─────────────────────────────────────────

  bfBEGIN: {
    label: 'bfBEGIN() — lib Generix [OBLIGATOIRE]',
    doc: `**OBLIGATOIRE** dans \`begin\` — Initialise le contexte d'exécution Generix :\n- Connexion à la base Generix\n- Chargement des paramètres \`pDOC.*\`, \`pDOF.*\`\n- Initialisation des journaux\n\n> ⚠️ Doit être la **première instruction** du bloc \`begin\` sans exception.\n\n\`\`\`rte\nbegin\n    bfBEGIN()   ! toujours en premier\n    tMode := "SENDING"\nendbegin\n\`\`\``
  },
  bfEND: {
    label: 'bfEND() — lib Generix [OBLIGATOIRE]',
    doc: `**OBLIGATOIRE** dans \`end\` — Finalise le traitement Generix :\n- Sauvegarde des paramètres \`pDOC.*\` modifiés\n- Fermeture des connexions\n- Écriture des journaux\n\n> ⚠️ Doit être la **dernière instruction** du bloc \`end\` sans exception.\n\n\`\`\`rte\nend\n    print(MESSAGE_OUT)\n    bfEND()   ! toujours en dernier\nendend\n\`\`\``
  },
  bfEXIT: {
    label: 'bfEXIT(code) — arrêt immédiat',
    doc: `**Arrête immédiatement le traitement** avec un code de sortie.\n\n- \`bfEXIT(0)\` → **succès** (traitement terminé normalement)\n- \`bfEXIT(1)\` → **erreur** (le document sera mis en erreur dans Generix)\n\n\`\`\`rte\nif not valid(MESSAGE_OUT) then\n    edierrordump(MESSAGE_OUT)\n    bfEXIT(1)\nendif\n\`\`\``
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// PARAMÈTRES SYSTÈME pDOC / pDOF / pEDISEND / pMESSAGE / pPROCESS
// ══════════════════════════════════════════════════════════════════════════════

const PDOC_PARAMS = {
  'pDOC.UUID':                   '**Identifiant unique du document** (GUID généré par Generix). Utilisé dans `addDocumentError()`, `attachDocumentFile()`…',
  'pDOC.FROM':                   '**Émetteur** du document (identifiant Generix ou SIRET/GLN selon le profil).',
  'pDOC.TO':                     '**Destinataire** du document (identifiant Generix ou SIRET/GLN selon le profil).',
  'pDOC.NUMBER':                 '**Numéro du document** (ex : numéro de facture, numéro de bon de commande).',
  'pDOC.STATUS':                 '**Statut du document**.\n\nValeurs possibles : `NONE`, `TO_CORRECT`, `INVOICED`, `REJECTED`.',
  'pDOC.STAGE':                  '**Étape du cycle de vie** du document dans Generix.\n\nValeurs possibles : `UPLOADED`, `SENT`, `REJECTED`, `REFUSED`, `OPENED`, `AVAILABLE`, `PAYMENT_RECEIVED`, `CORRECT`.',
  'pDOC.TRANSLATOR':             '**Format du flux entrant** (norme documentaire).\n\nValeurs possibles : `CII`, `UBL_INVOICE`, `UBL_CREDITNOTE`, `FACTUR-X`, `FA3`, `XCBL`, `D96A`, `D93A`, `D01B`, `IDOC`, `JSON`, `CSV`…',
  'pDOC.TRANSPORT':              '**Canal de transport** utilisé.\n\nValeurs possibles : `PDP`, `PEPPOL`, `KSEF`, `CUSTOM`.',
  'pDOC.NATURE':                 '**Nature de l\'échange** B2B/B2C/B2G.\n\nValeurs possibles : `B2B`, `B2B_INTERNATIONAL`, `B2C`, `B2G`.',
  'pDOC.PURPOSE':                '**Objectif du traitement**.\n\nValeurs possibles : `TRAD`, `NO_TRAD`, `NO_TRAD_CII`, `NO_TRAD_SB`, `TRAD_SB`.',
  'pDOC.PROFILE':                '**Profil de traitement Generix** associé au document (détermine les règles métier appliquées).',
  'pDOC.PROCESSING_WAY':         '**Sens du traitement**.\n\nValeurs possibles : `SENDING` (émission) ou `RECEIVING` (réception).',
  'pDOC.COUNTRY_RULES_1':        '**Code pays de l\'émetteur** pour les règles fiscales (ex: `FR`, `DE`, `PL`).',
  'pDOC.COUNTRY_RULES_2':        '**Code pays du destinataire** pour les règles fiscales.',
  'pDOC.USE_CASE':               '**Code de cas d\'usage** métier (spécifique au profil Generix configuré).',
  'pDOC.CUSTOM':                 '**Paramètre document personnalisé** — Variable persistante libre, nommée `pDOC.CUSTOM.xxx`.\n\nSauvegardée par `bfEND()` et accessible dans les étapes suivantes du workflow.\n\n```rte\npDOC.CUSTOM.FORMAT  := tFormat\npDOC.CUSTOM.SIRET   := tSiret\n```',
  'pDOF.INPUT.NAME':             '**Nom du fichier d\'entrée** (sans chemin complet).',
  'pDOF.INPUT.TYPE':             '**Type du fichier d\'entrée**.\n\nValeurs possibles : `XML`, `PDF`, `EDI`, `SAP`, `JSON`, `CSV`, `XCBL`.',
  'pDOF.INPUT.ACTIONNAME':       '**Nom de l\'action Generix** ayant déclenché ce RTE (identifie le point d\'entrée dans le workflow).',
  'pDOF.INPUT.COMMENT':          '**Commentaire** associé au fichier d\'entrée.',
  'pDOF.OUTPUT.NAME':            '**Nom du fichier de sortie** généré par ce RTE.',
  'pDOF.COMMENT':                '**Commentaire global** du flux de fichier.',
  'pDOF.TYPE':                   '**Type du flux** de fichier (entrant/sortant).',
  'pEDISEND.ORIGINAL.NAME':      '**Nom original du fichier EDI** (sans chemin ni extension).',
  'pEDISEND.ORIGINAL.FULLNAME':  '**Nom complet original** du fichier EDI (avec extension, sans chemin).',
  'pEDISEND.ORIGINAL.REALNAME':  '**Chemin complet réel** du fichier EDI d\'entrée sur le système de fichiers.',
  'pPROCESS_OUTPUT_DIR':         '**Répertoire de sortie** du processus courant — où écrire les fichiers produits.',
  'pPROCESS_WORK_DIR':           '**Répertoire de travail temporaire** du processus courant — pour les fichiers intermédiaires.',
  'pMESSAGE.BROKER.FORMAT':      '**Format du message** dans le broker Generix.',
  'pMESSAGE.BROKER.DOCTYPE':     '**Type de document** dans le broker Generix.',
  'pMESSAGE.BROKER.KSEF_NUMBER': '**Numéro KSeF** — identifiant officiel de la facture électronique polonaise.',
};

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

// ══════════════════════════════════════════════════════════════════════════════
// ACTIVATION DE L'EXTENSION
// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// GO TO DEFINITION
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

function activate(context) {

  // ── Hover provider ─────────────────────────────────────────────────────────
  const hoverProvider = vscode.languages.registerHoverProvider(
    { language: 'rte' },
    { provideHover }
  );
  context.subscriptions.push(hoverProvider);

  // ── Completion provider — Ctrl+Space ──────────────────────────────────────
  const completionProvider = vscode.languages.registerCompletionItemProvider(
    { language: 'rte' },
    { provideCompletionItems },
    '#', '.'   // déclencheurs supplémentaires pour #define/#include et pDOC.
  );
  context.subscriptions.push(completionProvider);

  // ── Formateur de code RTE ──────────────────────────────────────────────────
  const formatter = vscode.languages.registerDocumentFormattingEditProvider('rte', {
    provideDocumentFormattingEdits(document, options) {
      return formatRTE(document, options);
    }
  });
  context.subscriptions.push(formatter);

  // ── Formateur de sélection RTE ─────────────────────────────────────────────
  const rangeFormatter = vscode.languages.registerDocumentRangeFormattingEditProvider('rte', {
    provideDocumentRangeFormattingEdits(document, range, options) {
      return formatRTERange(document, range, options);
    }
  });
  context.subscriptions.push(rangeFormatter);

  // ── Document Symbols (Outline) ─────────────────────────────────────────────
  const symbolProvider = vscode.languages.registerDocumentSymbolProvider('rte', {
    provideDocumentSymbols
  });
  context.subscriptions.push(symbolProvider);

  // ── Go to Definition (F12) ────────────────────────────────────────────────
  const definitionProvider = vscode.languages.registerDefinitionProvider(
    { language: 'rte' },
    { provideDefinition }
  );
  context.subscriptions.push(definitionProvider);

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
    // Supprime les commentaires (! ... jusqu'à fin de ligne) sans toucher aux chaînes — approche simple
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

function deactivate() {}

module.exports = { activate, deactivate };


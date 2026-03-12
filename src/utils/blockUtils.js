// ══════════════════════════════════════════════════════════════════════════════
// UTILITAIRES — Règles d'indentation / détection des blocs RTE
// Partagé par : formatterProvider, symbolProvider
// ══════════════════════════════════════════════════════════════════════════════

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

module.exports = { isOpener, isCloser, isLineOpener, isLineCloser, lastNonBlank, nextNonBlank };

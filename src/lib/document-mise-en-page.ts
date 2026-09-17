/** Mise en page A4 : ancrer le pied de page en bas de la dernière page. */

export const HAUTEUR_PAGE_A4_MM = 297;
export const HAUTEUR_PAGE_A4_PAYSAGE_MM = 210;

function mmEnPixels(mm: number) {
  return (mm * 96) / 25.4;
}

/**
 * Étire la feuille à un nombre entier de pages A4 pour que le pied
 * (position: absolute; bottom) tombe en bas de la dernière page —
 * pas collé au contenu.
 */
export function ancrerPiedDernierePage(
  el: HTMLElement,
  pageHmm: number = HAUTEUR_PAGE_A4_MM,
) {
  const corps = el.querySelector(".document-preview-corps");
  const bas = el.querySelector(".document-preview-bas");
  const cs = getComputedStyle(el);
  const padY =
    (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
  const contentH =
    (corps instanceof HTMLElement ? corps.offsetHeight : 0) +
    (bas instanceof HTMLElement ? bas.offsetHeight : 0) +
    padY;
  const pagePx = mmEnPixels(pageHmm);
  if (!(pagePx > 0)) return;
  const pages = Math.max(1, Math.ceil((Math.max(contentH, 1) - 0.75) / pagePx));
  const cible = `${pages * pageHmm}mm`;
  if (el.style.minHeight === cible) return;
  el.style.minHeight = cible;
}

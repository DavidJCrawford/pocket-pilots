/**
 * The two sides. See knowledge/pocket-pilots/factions/.
 * `marking` selects the insignia style drawn on the models (see plane-model.js).
 */
export const FACTIONS = {
  allied: { id: 'allied', name: 'Allied', short: 'Entente' },
  central: { id: 'central', name: 'Central Powers', short: 'Central' },
};

/** Insignia by nation (roundel order is centre → rim). */
export const MARKINGS = {
  UK: 'roundel-british', // red centre, white, blue rim
  France: 'roundel-french', // blue centre, white, red rim
  Germany: 'cross', // Iron Cross / Balkenkreuz — black cross
};

/** The opposing side — enemies are always drawn from here (used from milestone 6). */
export function opposingSide(side) {
  return side === 'allied' ? 'central' : 'allied';
}

import { createEngineFactSnapshot, readEngineFactSnapshot } from './engine-fact-snapshot.js';

export const PREPARED_DRAW_VERSION = 'paid-tarot-draw-v2';

// Bind both the lookup identity and the order/orientations on the stored deal.
// Owner and payment access are still checked by the existing delivery route.
function drawIdentity(draw) {
  return { featureKey: draw.featureKey, drawId: draw.drawId, drawVersion: draw.version, deckVersion: draw.deckVersion, cards: draw.cards };
}

export function pinDrawPresentation(draw, presentation) {
  return createEngineFactSnapshot('tarot', presentation, drawIdentity(draw));
}

export function readDrawPresentation(draw) {
  if (!draw) return null;
  if (draw.version !== PREPARED_DRAW_VERSION && !draw.presentationFacts) return null;
  return readEngineFactSnapshot(draw.presentationFacts, { system: 'tarot', input: drawIdentity(draw) });
}

import { createDestinyFlowerEngine, registerDestinyFlowerEngineGlobals } from '../services/destiny-flower-engine.js?v=20260625-df-i18n';

export function bootstrapDestinyFlower(globalObject = window) {
  // Preserve existing global API surface for legacy inline-runtime callers.
  const engine = createDestinyFlowerEngine();
  registerDestinyFlowerEngineGlobals(globalObject, engine);
}

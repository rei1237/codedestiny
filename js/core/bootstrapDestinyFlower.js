import { createDestinyFlowerEngine, registerDestinyFlowerEngineGlobals } from '../services/destiny-flower-engine.js';

export function bootstrapDestinyFlower(globalObject = window) {
  // Preserve existing global API surface for legacy inline-runtime callers.
  const engine = createDestinyFlowerEngine();
  registerDestinyFlowerEngineGlobals(globalObject, engine);
}

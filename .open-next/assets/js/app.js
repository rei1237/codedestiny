import { initAppShell } from './core/init.js';
import { createDestinyFlowerEngine, registerDestinyFlowerEngineGlobals } from './services/destiny-flower-engine.js';

document.addEventListener('DOMContentLoaded', () => {
  initAppShell();

  // Step 1 bootstrapping: expose the universal profile parser and matching engine globally.
  const engine = createDestinyFlowerEngine();
  registerDestinyFlowerEngineGlobals(window, engine);
});

import { initAppShell } from './core/init.js';
import { bootstrapDestinyFlower } from './core/bootstrapDestinyFlower.js';
import './services/fortuneService.js';

document.addEventListener('DOMContentLoaded', () => {
  initAppShell();
  bootstrapDestinyFlower(window);
});

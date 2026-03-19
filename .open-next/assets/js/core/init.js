import { bindGlobalActions } from './uiBindings.js';

export function initAppShell() {
  // Preserve existing scroll behavior on mobile Safari by disabling auto restoration.
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  bindGlobalActions(document);
}

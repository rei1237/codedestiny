/** Every closed disclosure that holds result evidence: charts, calculation basis and reading notes. */
const CLOSED_REFERENCES = [
  'details[data-ziwei-chart-details]:not([open])',
  'details[data-result-reference]:not([open])',
  'details[data-reading-evidence]:not([open])',
  'details.kdo-evidence:not([open])',
].join(', ');

/** Lazy evidence mounts its content from the toggle event; give it two frames to paint before capture. */
async function settle(root: HTMLElement) {
  const raf = root.ownerDocument?.defaultView?.requestAnimationFrame?.bind(root.ownerDocument.defaultView);
  if (!raf) return;
  for (let frame = 0; frame < 2; frame += 1) await new Promise<void>(resolve => { raf(() => resolve()); });
}

/** Capture all saved chart sections without changing the reader's disclosure state. */
export async function withOpenResultReferences<T>(root: HTMLElement, capture: () => Promise<T>): Promise<T> {
  const closed = Array.from(root.querySelectorAll<HTMLDetailsElement>(CLOSED_REFERENCES));
  closed.forEach(details => { details.open = true; });
  try {
    if (closed.some(details => details.matches('[data-reading-evidence], .kdo-evidence'))) await settle(root);
    return await capture();
  }
  finally { closed.forEach(details => { details.open = false; }); }
}

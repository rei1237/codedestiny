/** Capture all saved chart sections without changing the reader's disclosure state. */
export async function withOpenResultReferences<T>(root: HTMLElement, capture: () => Promise<T>): Promise<T> {
  const closed = Array.from(root.querySelectorAll<HTMLDetailsElement>('details[data-ziwei-chart-details]:not([open]), details[data-result-reference]:not([open])'));
  closed.forEach(details => { details.open = true; });
  try { return await capture(); }
  finally { closed.forEach(details => { details.open = false; }); }
}

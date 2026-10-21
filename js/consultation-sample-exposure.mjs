// Observes authored headings, never consultation input or URL parameters.
// One sample event per mounted surface; hidden disclosures do not count.
export function observeConsultationSamples(root, send) {
  const Observer = root?.ownerDocument?.defaultView?.IntersectionObserver;
  if (!Observer) return () => {};
  const observer = new Observer(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.5) continue;
      const example = entry.target.closest('[data-example-kind]');
      const item = example?.closest('[data-consultation-item]')?.getAttribute('data-consultation-item');
      if (item && /^[a-z0-9-]+$/.test(item)) send('sample_view', {
        service: 'consultation', item_id: item,
        sample_type: example.getAttribute('data-example-kind') === 'result' ? 'result' : 'editorial',
        content_id: 'consultation-example-v1', locale: 'ko',
      });
      observer.unobserve(entry.target);
    }
  }, {threshold: 0.5});
  // Only the first example per product counts. Expanded supplementary excerpts do not inflate the funnel.
  root.querySelectorAll('[data-consultation-item]').forEach(item => {
    const heading = item.querySelector('[data-example-kind] h3, [data-example-kind] h4, [data-example-kind] h5');
    if (heading) observer.observe(heading);
  });
  return () => observer.disconnect();
}

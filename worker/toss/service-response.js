// Forward the original body immediately so progress and cancellation stay live.
export function forwardServiceResponse(response, headers) {
  const merged = new Headers(response.headers);
  for (const [key, value] of new Headers(headers)) {
    // Router defaults describe JSON; the canonical handler owns its media type.
    if (key === 'content-type' && response.headers.has(key)) continue;
    if (key === 'cache-control' && /(?:^|,)\s*no-transform\s*(?:,|$)/i.test(response.headers.get(key) || '')) {
      merged.set(key, value + ', no-transform');
    } else {
      merged.set(key, value);
    }
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: merged,
  });
}

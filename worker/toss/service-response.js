// Preserve the original stream, status and cache policy. Reading text() here
// would delay progress events until every generation stage has completed.
export function forwardServiceResponse(response, headers) {
  const merged = new Headers(response.headers);
  for (const [key, value] of new Headers(headers)) merged.set(key, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: merged,
  });
}

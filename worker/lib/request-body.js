// Stream bytes, not UTF-16 characters or an untrusted Content-Length header.
// Keep this transport helper independent of auth, DB and HTTP error rendering.
export const DEFAULT_JSON_BODY_BYTES = 16 * 1024 * 1024;

function tooLarge() {
  const error = new RangeError('Request body is too large.');
  error.code = 'REQUEST_BODY_TOO_LARGE';
  return error;
}

export async function readBoundedText(request, maxBytes = DEFAULT_JSON_BODY_BYTES) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) throw new TypeError('Invalid request body limit.');
  if (Number(request.headers?.get('content-length')) > maxBytes) throw tooLarge();
  const reader = request.body?.getReader();
  if (!reader) {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) throw tooLarge();
    return text;
  }
  const decoder = new TextDecoder();
  let bytes = 0;
  const parts = [];
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) throw tooLarge();
      parts.push(decoder.decode(value, { stream: true }));
    }
    parts.push(decoder.decode());
    return parts.join('');
  } catch (error) {
    // A cloned stream's cancellation can wait for the other branch. Do not await it.
    void reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
}

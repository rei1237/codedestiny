// Release commands block the Node event loop while building/uploading. Do not
// reuse an API socket that may have expired during that interval.
export async function cloudflareTransport(url, options = {}, fetchImpl = fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms))) {
  const method = String(options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers);
  headers.set('Connection', 'close');
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetchImpl(url, {...options,headers,signal:options.signal || (method === 'GET' ? AbortSignal.timeout(10000) : undefined)});
    } catch (error) {
      if (method !== 'GET' || options.signal?.aborted || attempt >= 2 || !['TypeError','TimeoutError'].includes(error?.name)) throw error;
      console.warn(`[deploy-safe] Cloudflare GET transport retry ${attempt + 1}/2`);
      await sleep(250 * 2 ** attempt);
    }
  }
}

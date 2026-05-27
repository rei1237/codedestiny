import http from 'node:http';

const HOST = '127.0.0.1';
const PORT = 19193;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options = {}) {
  const maxAttempts = Math.max(1, Number(options.maxAttempts || 3));
  const retryDelayMs = Math.max(0, Number(options.retryDelayMs || 300));
  const timeoutMs = Math.max(1, Number(options.timeoutMs || 1000));

  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      try { controller.abort(); } catch (_) {}
    }, timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });

      const payload = await res.json().catch(() => ({}));
      if (res.status === 429) {
        lastError = new Error(`rate-limited:429:attempt:${attempt}`);
      } else if (!res.ok) {
        lastError = new Error(`http:${res.status}:attempt:${attempt}`);
      } else {
        return {
          ok: true,
          status: res.status,
          attempt,
          payload,
        };
      }
    } catch (error) {
      const isAbort = !!(error && error.name === 'AbortError');
      lastError = isAbort
        ? new Error(`timeout:attempt:${attempt}`)
        : new Error(String(error && error.message ? error.message : error));
    } finally {
      clearTimeout(timeoutId);
    }

    if (attempt < maxAttempts) {
      await sleep(retryDelayMs);
    }
  }

  return {
    ok: false,
    error: String(lastError && lastError.message ? lastError.message : 'unknown-error'),
  };
}

function createMockServer() {
  let rateCounter = 0;

  const server = http.createServer(async (req, res) => {
    if (!req.url) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, message: 'missing url' }));
      return;
    }

    if (req.url.startsWith('/rate-limit')) {
      rateCounter += 1;
      if (rateCounter <= 2) {
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, code: 'RATE_LIMITED', attempt: rateCounter }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, code: 'RECOVERED', attempt: rateCounter }));
      return;
    }

    if (req.url.startsWith('/timeout')) {
      await sleep(1800);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, code: 'LATE_OK' }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, code: 'NOT_FOUND' }));
  });

  return {
    start: () => new Promise((resolve) => server.listen(PORT, HOST, resolve)),
    stop: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function run() {
  const mock = createMockServer();
  await mock.start();

  const base = `http://${HOST}:${PORT}`;
  let hasFailure = false;

  try {
    const rateResult = await fetchWithRetry(`${base}/rate-limit`, {
      maxAttempts: 3,
      retryDelayMs: 250,
      timeoutMs: 1000,
    });

    if (!rateResult.ok || Number(rateResult.attempt) !== 3) {
      hasFailure = true;
      console.error('[SMOKE][RATE_LIMIT] FAIL', rateResult);
    } else {
      console.log('[SMOKE][RATE_LIMIT] PASS', rateResult);
    }

    const timeoutResult = await fetchWithRetry(`${base}/timeout`, {
      maxAttempts: 3,
      retryDelayMs: 250,
      timeoutMs: 500,
    });

    if (timeoutResult.ok || !String(timeoutResult.error || '').includes('timeout')) {
      hasFailure = true;
      console.error('[SMOKE][TIMEOUT] FAIL', timeoutResult);
    } else {
      console.log('[SMOKE][TIMEOUT] PASS', timeoutResult);
    }
  } finally {
    await mock.stop();
  }

  if (hasFailure) {
    process.exitCode = 1;
    return;
  }

  console.log('[SMOKE] premium timeout/rate-limit scenario passed');
}

run().catch((error) => {
  console.error('[SMOKE] unexpected error', error);
  process.exitCode = 1;
});

// A newly uploaded immutable Pages URL can briefly return 404 before serving
// its artifact (observed on 9399eb43, 707b8de5 and c6322764). Wait before the
// unchanged browser smoke; missing files or a wrong version still fail closed.
export async function awaitPagesPreviewReady(origin, expectedSha, {
  fetchImpl = fetch,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  attempts = 7,
  delayMs = 15_000,
  log = console.log,
} = {}) {
  let lastError;
  for (let round = 1; round <= attempts; round += 1) {
    try {
      const read = async pathname => {
        const response = await fetchImpl(new URL(pathname, origin), {
          cache: 'no-store', signal: AbortSignal.timeout(10_000),
        });
        if (response.status !== 200) throw new Error(`${pathname}: HTTP ${response.status}`);
        return response;
      };
      const version = await (await read('/version.json')).json();
      if ((version.gitSha || version.commit) !== expectedSha) throw new Error('Preview SHA does not match the release');
      const html = await (await read('/')).text();
      for (const pathname of ['/ggulggul/', '/login/', '/saju/basic/', '/fortune-tea-house/', '/app/', '/app/store/', '/lock-screen-fortune/']) {
        const response = await read(pathname);
        await response.body?.cancel();
      }
      const assets = new Set([...html.matchAll(/(?:src|href)=["'](\/(?!\/)[^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g)].map(match => match[1]));
      for (const pathname of assets) {
        const response = await read(pathname);
        await response.body?.cancel();
      }
      log(`[deploy-safe] Pages preview ready at expected SHA (${round}/${attempts})`);
      return;
    } catch (error) {
      lastError = error;
      log(`[deploy-safe] Pages preview preparing (${round}/${attempts}): ${error.message}`);
    }
    if (round < attempts) await sleep(delayMs);
  }
  throw new Error(`Pages preview did not become ready: ${lastError.message}`);
}

// A newly uploaded immutable Pages URL can briefly return 404 before serving
// its artifact (observed on 9399eb43, 707b8de5 and c6322764). Wait before the
// existing artifact/browser checks. This also applies to the new production
// deployment URL; missing files or a wrong version still fail closed.
export async function awaitPagesDeploymentReady(origin, expectedSha, {
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
      if ((version.gitSha || version.commit) !== expectedSha) throw new Error('Deployment SHA does not match the release');
      const documents = [];
      for (const pathname of ['/', '/ggulggul/', '/points/', '/login/', '/music/', '/stories/', '/saju/basic/', '/fortune-tea-house/', '/app/', '/app/store/', '/lock-screen-fortune/']) {
        documents.push(await (await read(pathname)).text());
      }
      const assets = new Set(documents.flatMap(html => [...html.matchAll(/(?:src|href)=["'](\/(?!\/)[^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g)].map(match => match[1])));
      for (const pathname of assets) {
        const response = await read(pathname);
        await response.body?.cancel();
      }
      log(`[deploy-safe] Pages deployment ready at expected SHA (${round}/${attempts})`);
      return;
    } catch (error) {
      lastError = error;
      log(`[deploy-safe] Pages deployment preparing (${round}/${attempts}): ${error.message}`);
    }
    if (round < attempts) await sleep(delayMs);
  }
  throw new Error(`Pages deployment did not become ready: ${lastError.message}`);
}

(function (root) {
  'use strict';
  async function run(initial, options) {
    let body = initial, failures = 0;
    for (let wave = 0; wave < 12 && options.active(); wave++) {
      if (!options.visible()) throw new Error('DELIVERY_PAUSED');
      let reply;
      try { reply = await options.post(body); }
      catch (error) { if (!options.active()) throw new Error('ACCOUNT_CHANGED'); if (++failures > 3) throw error; await options.wait(3000); continue; }
      if (!options.active()) throw new Error('ACCOUNT_CHANGED');
      const data = reply.data || {};
      if (reply.status === 202) {
        if (data.resumeBody) { body = data.resumeBody; options.persist(body); }
        if (data.result) options.show(data.result, false, data);
        if (data.retryable === false) throw new Error('GENERATION_LIMIT_REACHED');
        failures = 0; await options.wait(1000); continue;
      }
      if ((reply.status === 200 || reply.status === 201) && data.ok && data.result && data.archiveSaved !== false) return data.result;
      if ([429, 503].includes(reply.status) && data.retryable !== false && ++failures <= 3) { await options.wait(4000); continue; }
      throw Object.assign(new Error(data.code || data.reason || 'GENERATION_FAILED'), { status: reply.status });
    }
    throw new Error(options.active() ? 'DELIVERY_PAUSED' : 'ACCOUNT_CHANGED');
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { run: run };
  else root.CDCelestialPaidReader = { run: run };
}(typeof window !== 'undefined' ? window : globalThis));

(function installSesLockdown(globalObj) {
  'use strict';

  var LOCKDOWN_GUARD_KEY = '__fortuneSesLockdownApplied__';

  function getEnvFlag(name, defaultValue) {
    try {
      var fromGlobal = globalObj && globalObj[name];
      if (typeof fromGlobal === 'boolean') return fromGlobal;
    } catch (_e) {
      // Ignore global access errors in constrained environments.
    }
    return defaultValue;
  }

  function createSesConfig() {
    var preferStrict = getEnvFlag('__FORTUNE_SES_STRICT__', false);

    // Fast/compatible defaults for calculation-heavy pages.
    return {
      // `minimal` avoids broad descriptor surgery used by `severe`.
      overrideTaming: preferStrict ? 'severe' : 'minimal',
      // `none` disables expensive stack rewriting.
      stackFiltering: 'none',
      // `unsafe` keeps native Error behavior and avoids extra wrapping costs.
      errorTaming: preferStrict ? 'safe' : 'unsafe',
      // Preserve native Math behavior for precision workloads.
      mathTaming: preferStrict ? 'safe' : 'unsafe',
      // Keep Date API behavior stable for astrology/saju time calculations.
      dateTaming: preferStrict ? 'safe' : 'unsafe'
    };
  }

  function runIntrinsicSanityCheck() {
    var failures = [];

    try {
      if (typeof Math !== 'object' || typeof Math.sin !== 'function') {
        failures.push('Math.sin missing');
      } else {
        var sin90 = Math.sin(Math.PI / 2);
        if (Math.abs(sin90 - 1) > 1e-12) failures.push('Math.sin precision changed');
      }
    } catch (_e1) {
      failures.push('Math unusable');
    }

    try {
      var now = Date.now();
      var iso = new Date(now).toISOString();
      if (typeof iso !== 'string' || iso.length < 20) failures.push('Date unusable');
    } catch (_e2) {
      failures.push('Date unusable');
    }

    try {
      var json = JSON.stringify({ x: 1 });
      if (json !== '{"x":1}') failures.push('JSON stringify mismatch');
      var parsed = JSON.parse('{"y":2}');
      if (!parsed || parsed.y !== 2) failures.push('JSON parse mismatch');
    } catch (_e3) {
      failures.push('JSON unusable');
    }

    try {
      var arr = [1, 2, 3].map(function (n) { return n * 2; });
      if (arr.join(',') !== '2,4,6') failures.push('Array.map mismatch');
    } catch (_e4) {
      failures.push('Array unusable');
    }

    try {
      if (typeof Promise !== 'function') failures.push('Promise missing');
    } catch (_e5) {
      failures.push('Promise unusable');
    }

    return {
      ok: failures.length === 0,
      failures: failures
    };
  }

  function maybeHardenLibraries() {
    // Optional opt-in hardening for config-like objects only.
    // Do not harden active runtime instances unless they are immutable by design.
    var candidates = [];

    try {
      if (globalObj && globalObj.FORTUNE_STATIC_CONFIG) {
        candidates.push(['FORTUNE_STATIC_CONFIG', globalObj.FORTUNE_STATIC_CONFIG]);
      }
      if (globalObj && globalObj.WEB3_READONLY_ABI_MAP) {
        candidates.push(['WEB3_READONLY_ABI_MAP', globalObj.WEB3_READONLY_ABI_MAP]);
      }
    } catch (_e) {
      return;
    }

    if (typeof harden !== 'function') return;

    for (var i = 0; i < candidates.length; i += 1) {
      try {
        harden(candidates[i][1]);
      } catch (e) {
        // Keep app running even if a candidate object is not hardenable.
        if (globalObj && globalObj.console && typeof globalObj.console.warn === 'function') {
          globalObj.console.warn('[SES] harden skipped for', candidates[i][0], e && e.message);
        }
      }
    }
  }

  function install() {
    if (!globalObj || globalObj[LOCKDOWN_GUARD_KEY]) return;

    if (typeof lockdown !== 'function') {
      if (globalObj.console && typeof globalObj.console.info === 'function') {
        globalObj.console.info('[SES] lockdown() not found; skipping SES lockdown install.');
      }
      return;
    }

    var config = createSesConfig();

    lockdown(config);
    globalObj[LOCKDOWN_GUARD_KEY] = true;

    var sanity = runIntrinsicSanityCheck();
    globalObj.__FORTUNE_SES_SANITY__ = sanity;

    if (!sanity.ok && globalObj.console && typeof globalObj.console.error === 'function') {
      globalObj.console.error('[SES] Intrinsic sanity check failed:', sanity.failures);
    }

    maybeHardenLibraries();
  }

  install();
})(typeof globalThis !== 'undefined' ? globalThis : window);

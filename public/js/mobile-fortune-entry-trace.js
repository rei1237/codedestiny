(function mobileFortuneEntryTraceBootstrap(global) {
  'use strict';

  if (!global || global.__cdMobileFortuneTrace) return;

  function isEnabled() {
    if (global.__CD_ENABLE_MOBILE_TRACE__ === true) return true;
    try {
      if (new URLSearchParams(global.location && global.location.search).get('cdTrace') === '1') return true;
      return global.localStorage && global.localStorage.getItem('cd.mobile.trace') === '1';
    } catch (_) {
      return false;
    }
  }

  var enabled = isEnabled();
  var events = [];
  var sequence = 0;
  var originalFetch = null;

  function safeUrl(input) {
    try {
      var raw = typeof input === 'string' ? input : input && input.url;
      var url = new URL(String(raw || ''), global.location && global.location.href);
      ['profileId', 'userId', 'email', 'token', 'accessToken'].forEach(function (key) {
        url.searchParams.delete(key);
      });
      return url.pathname + (url.search || '');
    } catch (_) {
      return '';
    }
  }

  function record(type, detail) {
    if (!enabled) return null;
    var entry = Object.assign({
      id: ++sequence,
      type: String(type || 'event'),
      at: Date.now(),
      relativeMs: typeof performance !== 'undefined' && performance.now ? Math.round(performance.now()) : null,
    }, detail || {});
    events.push(entry);
    if (events.length > 2000) events.shift();
    return entry;
  }

  function countBy(list, key) {
    var counts = Object.create(null);
    list.forEach(function (entry) {
      var value = String(entry[key] || 'unknown');
      counts[value] = (counts[value] || 0) + 1;
    });
    return counts;
  }

  var trace = {
    enabled: function () { return enabled; },
    record: record,
    reset: function () { events.length = 0; sequence = 0; },
    getEvents: function () { return events.slice(); },
    getReport: function () {
      var apiEvents = events.filter(function (entry) { return /^api:/.test(entry.type || '') && entry.path; });
      var renderEvents = events.filter(function (entry) { return entry.type === 'component:render' && entry.component; });
      var mountEvents = events.filter(function (entry) { return entry.type === 'component:mount' && entry.component; });
      return {
        enabled: enabled,
        eventCount: events.length,
        apiTop20: Object.entries(countBy(apiEvents, 'path')).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 20),
        renderTop20: Object.entries(countBy(renderEvents, 'component')).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 20),
        mountTop20: Object.entries(countBy(mountEvents, 'component')).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 20),
        events: events.slice(),
      };
    },
  };

  global.__cdMobileFortuneTrace = trace;
  global.MobileFortuneEntryTrace = {
    record: record,
    reset: trace.reset,
    snapshot: trace.getReport,
  };
  if (!enabled || typeof global.fetch !== 'function') return;

  originalFetch = global.fetch.bind(global);
  global.fetch = function tracedFetch(input, init) {
    var path = safeUrl(input);
    var requestId = 'mobile-entry-fetch-' + Date.now().toString(36) + '-' + sequence.toString(36);
    var startedAt = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    record('api:start', { path: path, requestId: requestId, method: String((init && init.method) || (input && input.method) || 'GET').toUpperCase() });
    return originalFetch(input, init).then(function (response) {
      record('api:end', {
        path: path,
        requestId: requestId,
        status: Number(response && response.status || 0),
        durationMs: Math.round((typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()) - startedAt),
      });
      return response;
    }, function (error) {
      record('api:error', {
        path: path,
        requestId: requestId,
        error: String(error && error.name || 'FETCH_FAILED'),
        durationMs: Math.round((typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()) - startedAt),
      });
      throw error;
    });
  };
})(typeof window !== 'undefined' ? window : null);

(function (window) {
  'use strict';

  var USAGE_ENDPOINT = '/api/fortune/guardian/usage';
  var GENERATE_ENDPOINT = '/api/fortune/guardian/generate';
  var CHAT_ENDPOINT = '/api/fortune/guardian/chat';
  var SHARE_ENDPOINT = '/api/fortune/guardian/share';

  function createApiError(response, payload) {
    var code = payload && payload.error ? String(payload.error) : 'GUARDIAN_FORTUNE_SERVER_ERROR';
    var error = new Error('Guardian Fortune API request failed');
    error.name = 'GuardianFortuneApiError';
    error.code = code;
    error.status = response && Number(response.status) || 0;
    error.requestId = payload && payload.requestId ? String(payload.requestId) : '';
    error.usage = payload && payload.usage ? payload.usage : null;
    error.cta = payload && payload.cta ? payload.cta : null;
    return error;
  }

  async function readPayload(response) {
    try {
      return await response.json();
    } catch (_) {
      return null;
    }
  }

  async function request(endpoint, options) {
    var response = await window.fetch(endpoint, Object.assign({
      credentials: 'include',
      headers: { Accept: 'application/json' }
    }, options || {}));
    var payload = await readPayload(response);
    if (!response.ok || !payload || payload.ok === false) {
      throw createApiError(response, payload);
    }
    return payload;
  }

  function fetchGuardianFortuneUsage() {
    return request(USAGE_ENDPOINT, {
      method: 'GET'
    });
  }

  function generateGuardianFortune(input, options) {
    return request(GENERATE_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input || {}),
      signal: options && options.signal
    });
  }

  async function generateGuardianFortuneChat(input, options) {
    var response = await window.fetch(CHAT_ENDPOINT, {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input || {}),
      signal: options && options.signal
    });
    if (!response.ok || !response.body) {
      throw createApiError(response, await readPayload(response));
    }

    var decoder = new TextDecoder();
    var reader = response.body.getReader();
    var buffer = '';
    var resultPayload = null;
    function consumeBlock(block) {
      var event = 'message';
      var data = '';
      block.split(/\r?\n/).forEach(function (line) {
        if (line.indexOf('event:') === 0) event = line.slice(6).trim();
        if (line.indexOf('data:') === 0) data += line.slice(5).trim();
      });
      if (!data) return;
      var payload;
      try { payload = JSON.parse(data); } catch (_) { return; }
      if (typeof (options && options.onEvent) === 'function') options.onEvent(event, payload);
      if (event === 'result') resultPayload = Object.assign({ ok: true }, payload);
      if (event === 'complete' && resultPayload) {
        resultPayload.usage = payload.usage;
        resultPayload.shareDraftToken = payload.shareDraftToken || '';
      }
      if (event === 'error') throw createApiError({ status: payload.status || 500 }, Object.assign({ ok: false }, payload));
    }
    try {
      while (true) {
        var chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        var boundary;
        while ((boundary = buffer.indexOf('\n\n')) >= 0) {
          var block = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          consumeBlock(block);
        }
      }
      if (buffer.trim()) consumeBlock(buffer);
    } finally {
      reader.releaseLock();
    }
    if (!resultPayload) throw createApiError(response, { error: 'GUARDIAN_FORTUNE_STREAM_INCOMPLETE' });
    return resultPayload;
  }

  function createGuardianFortuneShare(shareDraftToken, options) {
    return request(SHARE_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ shareDraftToken: String(shareDraftToken || '') }),
      signal: options && options.signal
    });
  }

  window.CDGuardianFortuneApi = {
    fetchGuardianFortuneUsage: fetchGuardianFortuneUsage,
    generateGuardianFortune: generateGuardianFortune,
    generateGuardianFortuneChat: generateGuardianFortuneChat,
    createGuardianFortuneShare: createGuardianFortuneShare,
    endpoints: {
      usage: USAGE_ENDPOINT,
      generate: GENERATE_ENDPOINT,
      chat: CHAT_ENDPOINT,
      share: SHARE_ENDPOINT
    }
  };
})(window);

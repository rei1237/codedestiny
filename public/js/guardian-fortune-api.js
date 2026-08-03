(function (window) {
  'use strict';

  var USAGE_ENDPOINT = '/api/fortune/guardian/usage';
  var GENERATE_ENDPOINT = '/api/fortune/guardian/generate';
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
    createGuardianFortuneShare: createGuardianFortuneShare,
    endpoints: {
      usage: USAGE_ENDPOINT,
      generate: GENERATE_ENDPOINT,
      share: SHARE_ENDPOINT
    }
  };
})(window);

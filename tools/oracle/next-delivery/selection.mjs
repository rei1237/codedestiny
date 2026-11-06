import assert from 'node:assert/strict';
import { digest } from '../delivery-integration/harness.mjs';

export const IMPROVED_VERSION = 'kasi-jpl-expanded-20261101';

// The route selects from the mock server environment; observe its decision without overriding it.
export function installTestSelection(backend, enabled = false) {
  assert.equal(typeof enabled, 'boolean');
  assert.equal(backend.context.DEFAULT_ZIWEI_EXECUTION_OPTIONS.calendarAuthorityV2, false);
  const resolve = backend.context.resolveZiweiPreparation;
  const state = { calls: [] };
  const setEnabled = value => { assert.equal(typeof value, 'boolean'); backend.env = { ZIWEI_CALENDAR_AUTHORITY_V2: String(value) }; };
  setEnabled(enabled);
  backend.context.resolveZiweiPreparation = async options => {
    const selected = options.calendarAuthorityV2;
    assert.equal(selected, backend.env.ZIWEI_CALENDAR_AUTHORITY_V2 === 'true');
    const call = { action: options.action, enabled: selected, requestId: options.requestId, year: options.year };
    state.calls.push(call);
    try {
      const result = await resolve(options);
      Object.assign(call, { preparationId: result.preparationId, source: result.chart.lunar?.source, chartHash: digest(result.chart) });
      return result;
    } catch (error) { call.error = error.code || error.message; throw error; }
  };
  return { calls: state.calls, setEnabled };
}

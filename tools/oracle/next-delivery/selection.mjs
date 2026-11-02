import assert from 'node:assert/strict';
import { digest } from '../delivery-integration/harness.mjs';

export const IMPROVED_VERSION = 'kasi-jpl-expanded-20261101';

// Test-process option only. The real handler still owns normalization, lookup,
// preparation persistence and billing. No request/env/storage flag is trusted.
export function installTestSelection(backend, enabled = false) {
  assert.equal(typeof enabled, 'boolean');
  assert.equal(backend.context.DEFAULT_ZIWEI_EXECUTION_OPTIONS.calendarAuthorityV2, false);
  const resolve = backend.context.resolveZiweiPreparation;
  const state = { enabled, calls: [] };
  backend.context.resolveZiweiPreparation = async options => {
    const selected = state.enabled;
    const call = { action: options.action, enabled: selected, requestId: options.requestId, year: options.year };
    state.calls.push(call);
    try {
      const result = await resolve({ ...options, calendarAuthorityV2: selected });
      Object.assign(call, { preparationId: result.preparationId, source: result.chart.lunar?.source, chartHash: digest(result.chart) });
      return result;
    } catch (error) { call.error = error.code || error.message; throw error; }
  };
  return { calls: state.calls, setEnabled(value) { assert.equal(typeof value, 'boolean'); state.enabled = value; } };
}

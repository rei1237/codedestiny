import { prepareZiweiExecutionChart } from './ziwei-execution-adapter.js';

/** Trusted server selection only. Request bodies never select the calendar version.
 * @param {any} input
 * @param {{env?: Record<string, unknown>, year?: number, existing?: any}} options
 */
export function calculateZiweiConsumerChart(input, { env = {}, year, existing = null } = {}) {
  // Older products stored the full chart directly. Preserve it without upgrading.
  const saved = existing?.llmMeta?.chartSnapshot || existing?.ziweiChart;
  if (saved) {
    if (!Array.isArray(saved.palaces)) throw new Error('CALCULATION_SNAPSHOT_REQUIRED');
    return structuredClone(saved);
  }
  return prepareZiweiExecutionChart(input, {
    existing, year, calendarAuthorityV2: env.ZIWEI_CALENDAR_AUTHORITY_V2 === 'true',
  });
}

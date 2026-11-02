import { calculateLocalSaju } from '../engine/localSajuCalculator';
import type { LocalSajuResult, SajuAnalysisExecutionOptions } from '../engine/localSajuCalculator';
import { computeNatalFromInput, parseBirthDate, parseBirthTime } from './sajuAdapter';
import type { KasiPrefetchResult } from './sajuAdapter';
import type { AnimalDestinyInput } from './types';
import { GYEOKGUK_AUTHORITY_VERSION } from '@/lib/saju/gyeokguk-authority.mjs';

const LEGACY_VERSION = 'saju-gyeokguk-legacy-v1';
const PIN_SCHEMA = 'saju-analysis-preparation-v1';

export function computeNewSajuAnalysis(input: AnimalDestinyInput, options: SajuAnalysisExecutionOptions = {}, kasi?: KasiPrefetchResult): LocalSajuResult {
  if (options.gyeokgukAuthorityV2 !== true) return computeNatalFromInput(input, kasi);
  const date = parseBirthDate(input.birthDate), time = parseBirthTime(input.birthTime);
  // Match the existing adapter's calendar input exactly. No timezone injection,
  // extra gender/location propagation or unrelated calendar fixes in CR-008.
  return calculateLocalSaju({ ...date, ...time, calendarType: input.calendarType || 'solar',
    lunarLeap: Boolean(input.lunarLeap), kasiSolarDate: kasi?.kasiSolarDate, kasiSolarTerms: kasi?.kasiSolarTerms },
  { gyeokgukAuthorityV2: true });
}

export interface SajuAnalysisPreparation {
  schema: typeof PIN_SCHEMA;
  requestId: string;
  inputDigest: string;
  calculationVersion: string;
  input: AnimalDestinyInput;
  kasi?: KasiPrefetchResult;
  result: LocalSajuResult;
  digest: string;
}

/** The caller supplies an authenticated, request-scoped atomic store. No DB/PG
 * implementation or existing paid-record schema is changed by this adapter. */
export interface SajuPreparationStore {
  get(requestId: string): Promise<SajuAnalysisPreparation | null>;
  insertIfAbsent(requestId: string, preparation: SajuAnalysisPreparation): Promise<SajuAnalysisPreparation>;
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
}

async function digest(value: unknown): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(value)));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function snapshot<T>(value: T): T {
  const copy = JSON.parse(JSON.stringify(value)) as T;
  const freeze = (item: unknown) => {
    if (item && typeof item === 'object') { Object.freeze(item); Object.values(item).forEach(freeze); }
  };
  freeze(copy);
  return copy;
}

async function validatePreparation(value: SajuAnalysisPreparation): Promise<SajuAnalysisPreparation> {
  const copy = snapshot(value);
  if (!copy || copy.schema !== PIN_SCHEMA || !copy.requestId || !copy.input || !copy.result
      || ![LEGACY_VERSION, GYEOKGUK_AUTHORITY_VERSION].includes(copy.calculationVersion)) throw new Error('UNSUPPORTED_SAJU_PREPARATION');
  const { digest: actual, ...payload } = copy;
  if (actual !== await digest(payload) || copy.inputDigest !== await digest({ input: copy.input, kasi: copy.kasi })) {
    throw new Error('SAJU_PREPARATION_INTEGRITY_MISMATCH');
  }
  const authority = copy.result.natalAnalysis.evidence;
  if (copy.calculationVersion === GYEOKGUK_AUTHORITY_VERSION && authority.calculationVersion !== copy.calculationVersion) {
    throw new Error('SAJU_PREPARATION_VERSION_MISMATCH');
  }
  return copy;
}

/** Store insertion must be atomic: a racing preparation returns the winner.
 * Retrying or switching OFF never replaces the winning chart/version. */
export async function prepareNewSajuAnalysis(
  requestId: string, input: AnimalDestinyInput, store: SajuPreparationStore,
  options: SajuAnalysisExecutionOptions = {}, kasi?: KasiPrefetchResult,
): Promise<SajuAnalysisPreparation> {
  if (!requestId || requestId.length > 160) throw new Error('INVALID_SAJU_REQUEST_ID');
  // Capture policy and data before the first await so caller mutation cannot
  // switch an in-flight request between profiles or change its birth input.
  const enabled = options.gyeokgukAuthorityV2 === true;
  const captured = snapshot({ input, kasi });
  const inputDigest = await digest(captured);
  const existing = await store.get(requestId);
  if (existing) {
    const verified = await validatePreparation(existing);
    if (verified.requestId !== requestId || verified.inputDigest !== inputDigest) throw new Error('SAJU_REQUEST_INPUT_MISMATCH');
    return verified;
  }
  const result = computeNewSajuAnalysis(captured.input, { gyeokgukAuthorityV2: enabled }, captured.kasi);
  const payload: Omit<SajuAnalysisPreparation, 'digest'> = { schema: PIN_SCHEMA, requestId, inputDigest,
    calculationVersion: enabled ? GYEOKGUK_AUTHORITY_VERSION : LEGACY_VERSION, ...captured, result };
  const candidate = snapshot({ ...payload, digest: await digest(payload) });
  const winner = await validatePreparation(await store.insertIfAbsent(requestId, candidate));
  if (winner.requestId !== requestId || winner.inputDigest !== inputDigest) throw new Error('SAJU_REQUEST_INPUT_MISMATCH');
  return winner;
}

/** Used by generation, payment return and redisplay. Intentionally has no flag,
 * clock, calendar, engine or LLM call. Existing stored reports use their current
 * readers; never pass them to prepareNewSajuAnalysis as a migration. */
export async function resumePreparedSajuAnalysis(preparation: SajuAnalysisPreparation): Promise<LocalSajuResult> {
  return (await validatePreparation(preparation)).result;
}

export async function preparedSajuPromptFacts(preparation: SajuAnalysisPreparation) {
  const verified = await validatePreparation(preparation);
  const result = verified.result;
  return snapshot({ calculationVersion: verified.calculationVersion, pillars: result.pillars,
    analysis: result.natalAnalysis, report: result.structuredAdvancedReport,
    interpretationPolicy: { candidatesAreNotFinal: true, doNotInferUnevaluatedFields: true, preservePreparedChart: true } });
}

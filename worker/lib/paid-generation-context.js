import { AsyncLocalStorage } from 'node:async_hooks';

const context = new AsyncLocalStorage();
const rawResponses = new WeakMap();
// Only opaque execution identifiers and operational labels cross this boundary.
export function runWithPaidGenerationContext(value, work) {
  const safe = Object.fromEntries(['serviceId', 'requestId', 'access', 'sectionGroup', 'generationSource']
    .filter(key => typeof value[key] === 'string').map(key => [key, value[key].slice(0, 180)]));
  if (Number.isInteger(value.attempt) && value.attempt > 0) safe.attempt = value.attempt;
  rawResponses.set(safe, []);
  return context.run(Object.freeze(safe), work);
}
export function getPaidGenerationContext() { return context.getStore(); }

// Raw text stays private to this in-process generation scope, never in log labels.
export function capturePaidGenerationRaw(text) {
  const rows = rawResponses.get(context.getStore());
  if (rows && typeof text === 'string' && text) rows.push(text);
}
export function getPaidGenerationRaw() {
  return rawResponses.get(context.getStore())?.at(-1) || '';
}

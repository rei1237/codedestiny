import { AsyncLocalStorage } from 'node:async_hooks';

const context = new AsyncLocalStorage();
// Only opaque execution identifiers and operational labels cross this boundary.
export function runWithPaidGenerationContext(value, work) {
  const safe = Object.fromEntries(['serviceId', 'requestId', 'access', 'sectionGroup', 'generationSource']
    .filter(key => typeof value[key] === 'string').map(key => [key, value[key].slice(0, 180)]));
  if (Number.isInteger(value.attempt) && value.attempt > 0) safe.attempt = value.attempt;
  return context.run(Object.freeze(safe), work);
}
export function getPaidGenerationContext() { return context.getStore(); }

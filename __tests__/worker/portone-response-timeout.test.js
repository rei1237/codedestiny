/** @jest-environment node */
import { jest } from '@jest/globals';
import { fetchPortOnePayment } from '../../worker/lib/portone.js';

const env = { PORTONE_API_SECRET: 'mock-secret', PORTONE_STORE_ID: 'mock-store', PORTONE_CHANNEL_KEY: 'mock-channel', PORTONE_API_TIMEOUT_MS: '1000' };
const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  jest.useRealTimers();
});

test('PG response body remains within the same deadline after headers arrive', async () => {
  jest.useFakeTimers();
  let signal;
  let calls = 0;
  global.fetch = async (_url, options) => {
    calls += 1;
    signal = options.signal;
    return {
      ok: true,
      json: () => new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      }),
    };
  };
  let failure;
  const request = fetchPortOnePayment(env, 'order-timeout').catch(error => { failure = error; });
  await jest.advanceTimersByTimeAsync(1000);
  expect(signal.aborted).toBe(true);
  expect(failure?.message).toMatch(/request timed out after 1000ms/);
  expect(calls).toBe(1);
  expect(jest.getTimerCount()).toBe(0);
  await request;
});

test('successful body clears the deadline and preserves payment verification fields', async () => {
  jest.useFakeTimers();
  global.fetch = async () => ({ ok: true, json: async () => ({
    id: 'order-paid', status: 'PAID', amount: { total: 1000 }, currency: 'KRW',
  }) });
  await expect(fetchPortOnePayment(env, 'order-paid')).resolves.toMatchObject({
    paymentId: 'order-paid', status: 'paid', amount: 1000, currency: 'KRW',
  });
  expect(jest.getTimerCount()).toBe(0);
});

test('HTTP rejection retains the PG error and releases the deadline', async () => {
  jest.useFakeTimers();
  global.fetch = async () => ({ ok: false, json: async () => ({ message: 'REJECTED' }) });
  await expect(fetchPortOnePayment(env, 'order-rejected')).rejects.toThrow('PortOne payment lookup failed: REJECTED');
  expect(jest.getTimerCount()).toBe(0);
});

import { createLlmCacheStore } from '../../lib/llm-cache-store.js';
import type { LLMCacheConfig } from '../../../lib/llm-cache';

// The common cache also hashes the complete prompt, locale, schema and model.
export function chapterResponseCache(env: Record<string, unknown>, owner: string | undefined,
  requestId: unknown, section: string, skipRead = false): LLMCacheConfig | undefined {
  if (!owner || !requestId) return undefined;
  const store = createLlmCacheStore(env);
  const reusable = (value: any) => {
    if (!value?.text || value.isMock || value.truncated || /^(MAX_TOKENS|LENGTH)$/i.test(value.finishReason || '')) return false;
    try { const parsed = JSON.parse(value.text); return parsed && typeof parsed === 'object' && !Array.isArray(parsed); }
    catch { return false; }
  };
  return {
    deterministic: true, ttlSeconds: 24 * 60 * 60, skipRead,
    keyExtra: JSON.stringify(['yeongnyangi-response-v1', owner, requestId, section]),
    store: {
      async get(key) { const value = await store.get(key); return reusable(value) ? value : null; },
      async set(key, value, ttl) { if (reusable(value)) await store.set(key, value, ttl); },
    },
  };
}

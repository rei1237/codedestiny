import { connectDb } from "./db.js";
import { LlmResponseCache } from "./models.js";

const DEFAULT_TTL_SECONDS = 30 * 24 * 60 * 60;

// lib/llm-cache.ts 의 CacheStore 인터페이스({ get, set })를 MongoDB(llm_response_cache)로 구현.
// DB 장애가 본 LLM 흐름을 막지 않도록 모든 경로를 try-catch 로 감싸 조용히 실패시킨다.
export function createLlmCacheStore(env) {
  return {
    async get(cacheKey) {
      try {
        await connectDb(env);
        const doc = await LlmResponseCache.findOne({ cacheKey }).lean();
        if (!doc || !doc.text) return null;
        return {
          text: doc.text,
          provider: doc.provider || "gemini",
          model: doc.model || "",
        };
      } catch (error) {
        console.warn("[llm-cache-store] get failed:", error?.message || error);
        return null;
      }
    },
    async set(cacheKey, value, ttlSeconds) {
      try {
        await connectDb(env);
        const now = new Date();
        const ttl = Number(ttlSeconds) > 0 ? Number(ttlSeconds) : DEFAULT_TTL_SECONDS;
        const expiresAt = new Date(now.getTime() + ttl * 1000);
        await LlmResponseCache.updateOne(
          { cacheKey },
          {
            $set: {
              text: value.text,
              provider: value.provider || "gemini",
              model: value.model || "",
              expiresAt,
              updatedAt: now,
            },
            $setOnInsert: { cacheKey, createdAt: now },
          },
          { upsert: true },
        );
      } catch (error) {
        console.warn("[llm-cache-store] set failed:", error?.message || error);
      }
    },
  };
}

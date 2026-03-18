const express = require("express");
const crypto = require("crypto");

const TranslationUsage = require("../models/TranslationUsage");
const TranslationCache = require("../models/TranslationCache");
const fixedKoPhrases = require("../data/fixed-phrases.ko.json");

const router = express.Router();

const DEFAULT_MONTHLY_CHAR_LIMIT = 500_000;

function normalizeTargetLang(input) {
  const raw = String(input || "").trim();
  if (!raw) return null;

  const map = {
    ko: "KO",
    "ko-kr": "KO",
    en: "EN",
    "en-us": "EN-US",
    "en-gb": "EN-GB",
    ja: "JA",
    "ja-jp": "JA",
    zh: "ZH",
    "zh-cn": "ZH",
    "zh-tw": "ZH",
    hi: "HI",
    "hi-in": "HI",
    es: "ES",
    "es-es": "ES",
    fr: "FR",
    "fr-fr": "FR",
    de: "DE",
    "de-de": "DE",
    it: "IT",
    "it-it": "IT",
    nl: "NL",
    "nl-nl": "NL",
  };

  const key = raw.toLowerCase();
  return map[key] || raw.toUpperCase();
}

function getUtcMonthKey(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function stripHtmlTags(input) {
  return String(input || "").replace(/<[^>]*>/g, " ");
}

function removeLowValueChars(input) {
  const s = String(input || "");
  return s
    .replace(/\p{Extended_Pictographic}+/gu, " ")
    .replace(/[★☆✦✧✪✫✬✭✮✯✰]+/g, " ")
    .replace(/[“”„‟«»‹›]+/g, '"')
    .replace(/[’‘‚‛]+/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeForHash(text) {
  return removeLowValueChars(stripHtmlTags(text));
}

function normalizeForTranslation(text) {
  return removeLowValueChars(stripHtmlTags(text));
}

function sha256Hex(input) {
  return crypto.createHash("sha256").update(String(input || ""), "utf8").digest("hex");
}

function lookupFixedPhraseKo(originalText, targetLang) {
  const key = String(originalText || "").trim();
  if (!key) return null;
  const entry = fixedKoPhrases[key];
  if (!entry) return null;
  return entry[targetLang] || entry[String(targetLang || "").toUpperCase()] || null;
}

async function enforceMonthlyCharLimitOrThrow({ provider, monthKey, incChars, limit }) {
  await TranslationUsage.updateOne(
    { provider, monthKey },
    { $setOnInsert: { provider, monthKey, charsUsed: 0 } },
    { upsert: true },
  );

  const updated = await TranslationUsage.findOneAndUpdate(
    { provider, monthKey, charsUsed: { $lte: Math.max(0, limit - incChars) } },
    { $inc: { charsUsed: incChars } },
    { new: true },
  );

  if (!updated) {
    const current = await TranslationUsage.findOne({ provider, monthKey }).lean();
    const used = Number(current?.charsUsed || 0);
    const remaining = Math.max(0, limit - used);
    const err = new Error("MONTHLY_LIMIT_REACHED");
    err.status = 429;
    err.meta = { provider, monthKey, limit, used, remaining, requested: incChars };
    throw err;
  }

  return updated;
}

function toGeminiLanguageName(targetLang) {
  const t = String(targetLang || "").toUpperCase();
  if (t.startsWith("EN")) return "English";
  if (t === "JA") return "Japanese";
  if (t === "ZH") return "Chinese (Simplified)";
  if (t === "FR") return "French";
  if (t === "ES") return "Spanish";
  if (t === "HI") return "Hindi";
  if (t === "KO") return "Korean";
  return t;
}

async function translateWithGemini({ apiKey, model, sourceLang, targetLang, texts }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const targetName = toGeminiLanguageName(targetLang);
  const sep = "\n<<<CD_SPLIT>>>\n";
  const joined = texts.join(sep);

  const prompt = [
    "You are a professional translator.",
    `Translate from ${sourceLang} to ${targetName}.`,
    "Rules:",
    "- Preserve meaning; keep numbers, proper nouns, and formatting as much as possible.",
    "- Output MUST contain the same number of segments, separated by the exact token <<<CD_SPLIT>>> on its own line.",
    "- Do NOT add explanations.",
    "",
    joined,
  ].join("\n");

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2 },
    }),
  });

  const payload = await resp.json().catch(() => null);
  if (!resp.ok) {
    const message =
      payload?.error?.message || payload?.message || `Gemini translate failed (${resp.status})`;
    const err = new Error(message);
    err.status = 502;
    throw err;
  }

  const textOut =
    payload?.candidates?.[0]?.content?.parts?.map((p) => p?.text).filter(Boolean).join("") || "";

  const segments = String(textOut)
    .split("<<<CD_SPLIT>>>")
    .map((s) => s.trim());

  if (segments.length !== texts.length) {
    return texts.map((_, i) => (i === 0 ? String(textOut).trim() : ""));
  }

  return segments;
}

async function cacheBulkUpsert({ provider, sourceLang, targetLang, items, translatedArr }) {
  const writes = [];
  for (let i = 0; i < items.length; i++) {
    const m = items[i];
    const translated = translatedArr[i];
    if (!translated) continue;
    writes.push({
      updateOne: {
        filter: { provider, sourceLang, targetLang, originalTextHash: m.hash },
        update: {
          $setOnInsert: {
            provider,
            sourceLang,
            targetLang,
            originalTextHash: m.hash,
            originalText: m.normalized.slice(0, 4000),
          },
          $set: { translatedText: translated },
        },
        upsert: true,
      },
    });
  }
  if (writes.length) {
    await TranslationCache.bulkWrite(writes, { ordered: false }).catch(() => {});
  }
}

router.post("/", async (req, res, next) => {
  try {
    const texts = Array.isArray(req.body?.texts) ? req.body.texts : [];
    const targetLang = normalizeTargetLang(req.body?.targetLang);
    const sourceLang = String(req.body?.sourceLang || "KO").toUpperCase();

    if (!targetLang) return res.status(400).json({ message: "targetLang is required" });

    const rawTexts = texts.map((t) => (typeof t === "string" ? t : t == null ? "" : String(t)));
    const indexed = rawTexts.map((raw, idx) => ({ idx, raw }));
    const out = new Array(rawTexts.length).fill("");

    // Fixed phrases (KO only)
    const fixedHits = new Map();
    if (sourceLang === "KO") {
      for (const it of indexed) {
        const fixed = lookupFixedPhraseKo(it.raw, targetLang);
        if (fixed) fixedHits.set(it.idx, fixed);
      }
    }
    for (const [idx, t] of fixedHits.entries()) out[idx] = t;

    // Hash + cache lookup (DeepL cache)
    const hashInputs = indexed
      .filter((it) => !fixedHits.has(it.idx))
      .map((it) => {
        const normalized = normalizeForHash(it.raw);
        return { idx: it.idx, normalized, hash: sha256Hex(normalized) };
      })
      .filter((it) => it.normalized.length > 0);

    const uniqueHashes = Array.from(new Set(hashInputs.map((h) => h.hash)));
    const cachedDocs = uniqueHashes.length
      ? await TranslationCache.find({
          provider: "deepl",
          sourceLang,
          targetLang,
          originalTextHash: { $in: uniqueHashes },
        })
          .select({ originalTextHash: 1, translatedText: 1 })
          .lean()
      : [];

    const cacheMap = new Map(cachedDocs.map((d) => [d.originalTextHash, d.translatedText]));
    const misses = [];
    for (const h of hashInputs) {
      const hit = cacheMap.get(h.hash);
      if (hit) out[h.idx] = hit;
      else misses.push(h);
    }

    if (!misses.length) return res.status(200).json({ translations: out });

    const cleaned = misses
      .map((m) => ({ ...m, toTranslate: normalizeForTranslation(rawTexts[m.idx]) }))
      .filter((m) => m.toTranslate.length > 0);

    if (!cleaned.length) return res.status(200).json({ translations: out });

    const monthKey = getUtcMonthKey();
    const requestedChars = cleaned.reduce((sum, m) => sum + m.toTranslate.length, 0);

    const deeplKey = process.env.DEEPL_API_KEY;
    const deeplEndpoint = process.env.DEEPL_API_BASE_URL || "https://api.deepl.com/v2/translate";
    const deeplLimit = Number(process.env.DEEPL_MONTHLY_CHAR_LIMIT || DEFAULT_MONTHLY_CHAR_LIMIT);
    const effectiveDeeplLimit =
      Number.isFinite(deeplLimit) && deeplLimit > 0 ? deeplLimit : DEFAULT_MONTHLY_CHAR_LIMIT;

    const body = new URLSearchParams();
    for (const m of cleaned) body.append("text", m.toTranslate);
    body.set("target_lang", targetLang);
    body.set("source_lang", sourceLang);
    body.set("preserve_formatting", "1");

    try {
      if (requestedChars > 0) {
        await enforceMonthlyCharLimitOrThrow({
          provider: "deepl",
          monthKey,
          incChars: requestedChars,
          limit: effectiveDeeplLimit,
        });
      }

      if (!deeplKey) throw new Error("DEEPL_KEY_MISSING");

      const resp = await fetch(deeplEndpoint, {
        method: "POST",
        headers: {
          Authorization: `DeepL-Auth-Key ${deeplKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });

      const payload = await resp.json().catch(() => null);
      if (!resp.ok) {
        const message =
          payload?.message || payload?.error?.message || `DeepL translate failed (${resp.status})`;
        return res.status(502).json({ message });
      }

      const translations = Array.isArray(payload?.translations)
        ? payload.translations.map((t) => String(t?.text ?? ""))
        : [];

      for (let i = 0; i < cleaned.length; i++) out[cleaned[i].idx] = translations[i] || "";
      await cacheBulkUpsert({
        provider: "deepl",
        sourceLang,
        targetLang,
        items: cleaned,
        translatedArr: translations,
      });

      return res.status(200).json({ translations: out });
    } catch (deeplErr) {
      if (deeplErr?.message === "DEEPL_KEY_MISSING") {
        return res.status(501).json({
          message: "DEEPL_API_KEY가 설정되지 않아 번역을 진행할 수 없습니다.",
        });
      }

      if (deeplErr?.message === "MONTHLY_LIMIT_REACHED" && deeplErr?.meta?.provider === "deepl") {
        // IMPORTANT: when free cap is reached, do NOT call any paid provider.
        // Client should fallback to Google Translate widget.
        return res.status(429).json({
          message: "DeepL 무료 한도(월간 글자수)를 초과하여 번역이 차단되었습니다.",
          ...deeplErr.meta,
        });
      }

      throw deeplErr;
    }
  } catch (error) {
    if (error?.message === "MONTHLY_LIMIT_REACHED") {
      return res.status(429).json({
        message: `${error.meta?.provider || "translation"} 월간 한도 초과로 셧다운되었습니다.`,
        ...error.meta,
      });
    }
    return next(error);
  }
});

module.exports = router;


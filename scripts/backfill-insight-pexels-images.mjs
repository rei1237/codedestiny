import { existsSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";
import mongoose from "mongoose";

const ROOT = process.cwd();
const ENV_FILES = [".env.cloudflare.local", ".env.cloudflare", ".env.local", ".env"];

for (const envFile of ENV_FILES) {
  const envPath = resolve(ROOT, envFile);
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

const MONGO_URI = String(
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.MONGO_URL ||
  process.env.DATABASE_URL ||
  ""
).trim();

if (!MONGO_URI) {
  console.error("[backfill-insights-pexels] MONGO_URI or MONGODB_URI is required.");
  process.exit(1);
}

const DB_NAME = String(
  process.env.MONGO_DB_NAME ||
  process.env.MONGO_NAME ||
  process.env.MONGODB_DB_NAME ||
  process.env.MONGO_DB ||
  "code_destiny"
).trim();

const FLAGS = new Set(process.argv.map((value) => String(value || "").trim().toLowerCase()));
const FORCE = FLAGS.has("--force");
const DRY_RUN = FLAGS.has("--dry-run");
const STATUS_FLAG = process.argv.find((value) => String(value || "").startsWith("--status=")) || "";
const STATUS_FILTER = STATUS_FLAG ? String(STATUS_FLAG.split("=").at(-1) || "").trim() : "published";

const SECTION_CONFIG = {
  saju: {
    query: "mystical astrology stars cosmic sky five elements",
    alt: "saju cosmic insight visual",
  },
  tarot: {
    query: "mystic tarot cards stars nebula night sky",
    alt: "tarot cosmic insight visual",
  },
  astrology: {
    query: "astrology zodiac stars cosmic night sky",
    alt: "astrology cosmic insight visual",
  },
  ziwei: {
    query: "purple galaxy stars cosmic astrology chart",
    alt: "ziwei cosmic insight visual",
  },
  sukuyo: {
    query: "moon stars mystical night sky constellation",
    alt: "sukuyo cosmic insight visual",
  },
  vedic: {
    query: "vedic astrology stars cosmic temple night",
    alt: "vedic cosmic insight visual",
  },
  dream: {
    query: "dreamy moon stars mystical fog night sky",
    alt: "dream cosmic insight visual",
  },
  famous: {
    query: "mystical cosmic portrait silhouette stars",
    alt: "famous fortune insight visual",
  },
  career: {
    query: "cosmic stage spotlight stars destiny",
    alt: "career cosmic insight visual",
  },
  love: {
    query: "mystical stars soft light cosmic love",
    alt: "love cosmic insight visual",
  },
  wealth: {
    query: "gold stars cosmic abundance mystical",
    alt: "wealth cosmic insight visual",
  },
  health: {
    query: "meditation stars cosmic calm night",
    alt: "health cosmic insight visual",
  },
  default: {
    query: "mystical cosmos stars nebula night sky",
    alt: "cosmic insight visual",
  },
};

const FALLBACK_IMAGES = {
  saju: "/fuctionassets/saju.webp",
  tarot: "/fuctionassets/tarolove.webp",
  astrology: "/fuctionassets/jumsung.webp",
  ziwei: "/fuctionassets/jami.webp",
  sukuyo: "/fuctionassets/sukyo.webp",
  vedic: "/fuctionassets/veda.webp",
  dream: "/fuctionassets/heamong.webp",
  famous: "/fuctionassets/placeholder.webp",
  career: "/fuctionassets/placeholder.webp",
  love: "/fuctionassets/flower4.webp",
  wealth: "/fuctionassets/placeholder.webp",
  health: "/fuctionassets/meditation.webp",
  default: "/fuctionassets/premiumstar.webp",
};

const PEXELS_KEYWORDS_RE = /(cosmic|cosmos|star|stars|nebula|galaxy|moon|mystic|mystical|astrology|zodiac)/i;

function toText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function buildKeywordBag(item) {
  return [
    item?.title,
    item?.slug,
    item?.category,
    item?.subtitle,
    item?.excerpt,
    item?.summary,
    item?.description,
    item?.metaDescription,
    item?.ogDescription,
    ...(Array.isArray(item?.tags) ? item.tags : []),
    ...(Array.isArray(item?.keywords) ? item.keywords : []),
    ...(Array.isArray(item?.relatedKeywords) ? item.relatedKeywords : []),
  ]
    .map((value) => toText(value).toLowerCase())
    .join(" ");
}

function inferSection(item) {
  const bag = buildKeywordBag(item);

  if (/(famous|celebrity|star|singer|actor|actress|idol|idol|ceo|entrepreneur|sajoo|famous-saju|famous)/i.test(bag)) return "famous";
  if (/(ziwei|zimo|ziwei|zi we|mansion|palace)/i.test(bag)) return "ziwei";
  if (/(sukuyo|27 stars|sukuyo|dream|moon)/i.test(bag)) return "sukuyo";
  if (/(tarot|card|arcana)/i.test(bag)) return "tarot";
  if (/(vedic|nakshatra|dasha|lagna)/i.test(bag)) return "vedic";
  if (/(astrology|zodiac|horoscope)/i.test(bag)) return "astrology";
  if (/(dream|symbol|dream|dreaming)/i.test(bag)) return "dream";
  if (/(career|job|work|office|startup|business|entrepreneur)/i.test(bag)) return "career";
  if (/(love|relationship|romance|dating|marriage|couple)/i.test(bag)) return "love";
  if (/(wealth|money|income|finance|fortune|saving|investment)/i.test(bag)) return "wealth";
  if (/(health|sleep|body|mind|healing|physical|diet)/i.test(bag)) return "health";
  if (/(saju|fortune|fate|day-master|pillar|four pillars|yin yang|heavenly stems)/i.test(bag)) return "saju";

  return "default";
}

function normalizeQuery(rawQuery, section) {
  const safeSection = Object.prototype.hasOwnProperty.call(SECTION_CONFIG, section) ? section : "default";
  const query = toText(rawQuery);
  const base = SECTION_CONFIG[safeSection]?.query || SECTION_CONFIG.default.query;
  if (!query) return base;
  if (/[\uac00-\ud7a3]/.test(query)) return base;
  if (!PEXELS_KEYWORDS_RE.test(query)) return `${query} cosmic stars mystical`;
  return query;
}

function toFailureStatus(status) {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 429) return "rate-limited";
  if (status >= 500) return "server-error";
  return "empty";
}

async function resolveImageForSection(query, section) {
  const safeSection = Object.prototype.hasOwnProperty.call(SECTION_CONFIG, section) ? section : "default";
  const normalizedQuery = normalizeQuery(query, safeSection);
  const fallback = {
    src: FALLBACK_IMAGES[safeSection] || FALLBACK_IMAGES.default,
    alt: SECTION_CONFIG[safeSection]?.alt || SECTION_CONFIG.default.alt,
    source: "fallback",
    status: "missing-key",
    width: 0,
    height: 0,
  };

  const apiKey = String(
    process.env.PEXELS_API_KEY ||
    process.env.NEXT_PUBLIC_PEXELS_API_KEY ||
    process.env.REACT_APP_PEXELS_API_KEY ||
    process.env.VITE_PEXELS_API_KEY ||
    process.env.PEXELS_APIKEY ||
    process.env.PEXES_APIKEY ||
    ""
  ).trim();

  if (!apiKey) return fallback;

  try {
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", normalizedQuery);
    url.searchParams.set("per_page", "8");
    url.searchParams.set("orientation", "landscape");
    url.searchParams.set("size", "large");
    url.searchParams.set("locale", "en-US");

    const response = await fetch(url, { headers: { Authorization: apiKey } });
    if (!response.ok) {
      return {
        ...fallback,
        status: toFailureStatus(response.status),
      };
    }

    const payload = await response.json().catch(() => null);
    const photos = Array.isArray(payload?.photos) ? payload.photos : [];
    const photo = photos.find((item) => item?.src?.landscape || item?.src?.large2x || item?.src?.large || item?.src?.medium);
    const src = photo?.src?.landscape || photo?.src?.large2x || photo?.src?.large || photo?.src?.medium;
    if (!src) {
      return {
        ...fallback,
        status: "empty",
      };
    }

    return {
      src,
      alt: photo?.alt || fallback.alt,
      credit: photo?.photographer || null,
      creditUrl: photo?.photographer_url || photo?.url || null,
      width: Number(photo?.width) || 0,
      height: Number(photo?.height) || 0,
      source: "pexels",
      status: "ok",
    };
  } catch {
    return {
      ...fallback,
      status: "network-error",
    };
  }
}

function isPlaceholderImage(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return true;
  if (/^https?:\/\//i.test(text)) return false;
  return text.startsWith("/fuctionassets/") || text.startsWith("/fuctionassets%2F") || text === "placeholder";
}

function shouldUpdateImage(doc, force) {
  const current = String(doc?.featuredImage?.url || doc?.thumbnailUrl || "").trim();
  if (force) return true;
  return !current || isPlaceholderImage(current);
}

async function run() {
  await mongoose.connect(MONGO_URI, {
    dbName: DB_NAME,
    maxPoolSize: 5,
  });

  const filter = {
    ...(STATUS_FILTER ? { status: STATUS_FILTER } : { status: "published" }),
    ...(STATUS_FILTER ? {} : { isPublished: true }),
  };

  const collection = mongoose.connection.db.collection("insights");
  let scanned = 0;
  let updated = 0;
  let skipped = 0;

  for await (const doc of collection.find(filter)) {
    scanned += 1;

    const section = inferSection(doc);
    if (!shouldUpdateImage(doc, FORCE)) {
      skipped += 1;
      continue;
    }

    const query = `${doc?.title || ""} ${doc?.slug || ""} ${doc?.category || ""}`;
    const image = await resolveImageForSection(query, section);
    const nextImage = {
      src: String(image.src || FALLBACK_IMAGES[section] || FALLBACK_IMAGES.default),
      alt: String(image.alt || SECTION_CONFIG[section]?.alt || SECTION_CONFIG.default.alt),
      width: Number(image.width) || 1200,
      height: Number(image.height) || 630,
    };

    const patch = {
      thumbnailUrl: nextImage.src,
      featuredImage: {
        url: nextImage.src,
        alt: nextImage.alt,
        width: nextImage.width,
        height: nextImage.height,
      },
      pexelsImageStatus: String(image.status || "ok"),
      updatedAt: new Date(),
    };

    if (DRY_RUN) {
      console.log("[backfill-insights-pexels] dry-run", {
        id: String(doc._id || ""),
        slug: String(doc.slug || ""),
        section,
        source: String(image.source || "fallback"),
        url: nextImage.src,
      });
      continue;
    }

    const result = await collection.updateOne({ _id: doc._id }, { $set: patch });
    if (result.modifiedCount > 0) {
      updated += 1;
    }
  }

  console.log("[backfill-insights-pexels] completed", {
    scanned,
    updated,
    skipped,
    statusFilter: STATUS_FILTER,
    force: FORCE,
    dryRun: DRY_RUN,
  });

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error("[backfill-insights-pexels] failed", error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});


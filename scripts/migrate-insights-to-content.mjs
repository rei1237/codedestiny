import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
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

const MONGO_URI = String(process.env.MONGO_URI || process.env.MONGODB_URI || "").trim();
if (!MONGO_URI) {
  console.error("[migrate-insights-to-content] MONGO_URI or MONGODB_URI is required.");
  process.exit(1);
}

const DB_NAME = String(
  process.env.MONGO_DB_NAME
  || process.env.MONGO_NAME
  || process.env.MONGODB_DB_NAME
  || "code_destiny",
).trim();

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toSummary(doc) {
  const direct = String(doc.summary || "").trim();
  if (direct) return direct.slice(0, 2000);

  const excerpt = String(doc.excerpt || "").trim();
  if (excerpt) return excerpt.slice(0, 2000);

  return stripHtml(doc.contentHtml || "").slice(0, 400);
}

function toContentFormat(doc) {
  const raw = String(doc.contentFormat || "").trim().toLowerCase();
  if (raw === "html" || raw === "markdown" || raw === "blocks") return raw;
  if (doc.contentJson && typeof doc.contentJson === "object" && !Array.isArray(doc.contentJson)) return "blocks";
  return "html";
}

function toSeo(doc) {
  const seo = doc.seo && typeof doc.seo === "object" && !Array.isArray(doc.seo) ? doc.seo : {};
  return {
    metaTitle: String(seo.metaTitle || doc.metaTitle || "").trim().slice(0, 240),
    metaDescription: String(seo.metaDescription || doc.metaDescription || "").trim().slice(0, 600),
    ogTitle: String(seo.ogTitle || doc.ogTitle || "").trim().slice(0, 240),
    ogDescription: String(seo.ogDescription || doc.ogDescription || "").trim().slice(0, 600),
    ogImage: String(seo.ogImage || doc.ogImage || "").trim().slice(0, 1000),
    canonicalUrl: String(seo.canonicalUrl || doc.canonicalUrl || "").trim().slice(0, 1000),
  };
}

function normalizeStatus(value) {
  const status = String(value || "draft").trim().toLowerCase();
  if (status === "published" || status === "draft" || status === "archived") return status;
  if (status === "private" || status === "trash") return "archived";
  return "draft";
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildSeedHtml(seed) {
  const sections = Array.isArray(seed.sections) ? seed.sections : [];
  const parts = [];
  parts.push(`<h1>${escapeHtml(seed.title || "")}</h1>`);
  if (seed.description) parts.push(`<p>${escapeHtml(seed.description)}</p>`);
  for (const section of sections) {
    const heading = String(section?.heading || "").trim();
    const body = String(section?.body || "").trim();
    if (heading) parts.push(`<h2>${escapeHtml(heading)}</h2>`);
    if (body) {
      const paragraphs = body.split(/\n{2,}/).map((line) => line.trim()).filter(Boolean);
      for (const paragraph of paragraphs) {
        parts.push(`<p>${escapeHtml(paragraph)}</p>`);
      }
    }
  }
  return parts.join("\n");
}

async function loadSeedArticles() {
  const fileUrl = pathToFileURL(resolve(ROOT, "app", "insights", "seed-articles.js")).href;
  const mod = await import(fileUrl);
  return Array.isArray(mod?.INSIGHT_SEED_ARTICLES) ? mod.INSIGHT_SEED_ARTICLES : [];
}

async function run() {
  await mongoose.connect(MONGO_URI, {
    dbName: DB_NAME,
    maxPoolSize: 5,
  });

  const collection = mongoose.connection.db.collection("insights");

  let scanned = 0;
  let updated = 0;
  const cursor = collection.find({});

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    if (!doc) continue;
    scanned += 1;

    const nextStatus = normalizeStatus(doc.status);
    const nextSeo = toSeo(doc);
    const patch = {
      type: String(doc.type || "fortune_insight").trim().toLowerCase() || "fortune_insight",
      summary: toSummary(doc),
      excerpt: String(doc.excerpt || toSummary(doc)).trim().slice(0, 2000),
      contentFormat: toContentFormat(doc),
      content: String(doc.content || doc.contentHtml || ""),
      thumbnailUrl: String(doc.thumbnailUrl || doc?.featuredImage?.url || "").trim().slice(0, 1000),
      seo: nextSeo,
      metaTitle: nextSeo.metaTitle,
      metaDescription: nextSeo.metaDescription,
      ogTitle: nextSeo.ogTitle,
      ogDescription: nextSeo.ogDescription,
      ogImage: nextSeo.ogImage,
      canonicalUrl: nextSeo.canonicalUrl,
      authorName: String(doc.authorName || doc.author || "").trim().slice(0, 120),
      author: String(doc.author || doc.authorName || "").trim().slice(0, 120),
      status: nextStatus,
      isPublished: nextStatus === "published",
      publishedAt: nextStatus === "published" ? (doc.publishedAt || new Date()) : (doc.publishedAt || null),
    };

    const changed = Object.entries(patch).some(([key, value]) => {
      const prev = doc[key];
      return JSON.stringify(prev) !== JSON.stringify(value);
    });

    if (!changed) continue;

    const result = await collection.updateOne(
      { _id: doc._id },
      { $set: patch },
    );

    if (result.modifiedCount > 0) updated += 1;
  }

  let insertedFromSeed = 0;
  const seeds = await loadSeedArticles();
  for (const seed of seeds) {
    const slug = String(seed?.slug || "").trim().toLowerCase();
    if (!slug) continue;

    const exists = await collection.findOne({ slug }, { projection: { _id: 1 } });
    if (exists) continue;

    const now = new Date();
    const summary = String(seed?.description || "").trim().slice(0, 2000);
    const category = String(seed?.category || "fortune_insight").trim().slice(0, 120);
    const keywords = Array.isArray(seed?.keywords)
      ? seed.keywords.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 50)
      : [];

    await collection.insertOne({
      type: "fortune_insight",
      title: String(seed?.title || slug).trim().slice(0, 240),
      slug,
      summary,
      excerpt: summary,
      content: buildSeedHtml(seed),
      contentFormat: "html",
      contentHtml: buildSeedHtml(seed),
      contentJson: {},
      thumbnailUrl: "",
      featuredImage: { url: "", alt: "", width: 0, height: 0 },
      category,
      tags: keywords,
      seo: {
        metaTitle: String(seed?.title || "").trim().slice(0, 240),
        metaDescription: summary.slice(0, 600),
        ogTitle: String(seed?.title || "").trim().slice(0, 240),
        ogDescription: summary.slice(0, 600),
        ogImage: "",
        canonicalUrl: "",
      },
      keywords,
      author: "Code Destiny",
      authorName: "Code Destiny",
      authorId: "",
      status: "published",
      isPublished: true,
      isFeatured: false,
      noIndex: false,
      viewCount: 0,
      readingTime: 0,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    insertedFromSeed += 1;
  }

  console.log("[migrate-insights-to-content] completed", {
    scanned,
    updated,
    insertedFromSeed,
  });

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error("[migrate-insights-to-content] failed", error);
  try {
    await mongoose.disconnect();
  } catch (e) {}
  process.exit(1);
});

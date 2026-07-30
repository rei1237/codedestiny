#!/usr/bin/env node
/**
 * Converts every .png object in an R2 bucket to a .webp sibling (same key, new
 * extension) and optionally deletes the source PNG.
 *
 * Deletion is a SEPARATE second pass on purpose: dropping the PNG before the
 * code that references it is deployed leaves cached shells and already-shipped
 * Android builds pointing at a 404 that Cloudflare then caches for days.
 *
 * Usage:
 *   node scripts/convert-r2-png-to-webp.mjs                      # dry-run (default)
 *   node scripts/convert-r2-png-to-webp.mjs --apply
 *   node scripts/convert-r2-png-to-webp.mjs --prefix DestinyWar/ --apply
 *   node scripts/convert-r2-png-to-webp.mjs --apply --delete-source   # pass 2
 *
 * Env (first match wins):
 *   R2_ACCOUNT_ID       | Account_ID | ACCOUNT_ID | CLOUDFLARE_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID    | S3_ACCESS_KEY_ID | AWS_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY| S3_SECRET_ACCESS_KEY | AWS_SECRET_ACCESS_KEY
 *   R2_BUCKET_NAME      | R2_ASSETS_BUCKET | <bucket in S3_API url>
 *   R2_ENDPOINT         | <origin of S3_API url> | https://<account>.r2.cloudflarestorage.com
 */
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { inferR2ContentType, resolveR2CachePolicy } from "./r2-cache-policy.mjs";
import { isWebpExcluded } from "./webp-exclusions.mjs";

loadDotenv({ path: ".env.local", quiet: true });
loadDotenv({ quiet: true });

const DEFAULT_BUCKET = "codedestinyassets";
const DEFAULT_MANIFEST = "reports/converted-r2-webp.json";
const DEFAULT_QUALITY = 80;
const CONCURRENCY = 5;

function usage() {
  return [
    "Usage:",
    "  node scripts/convert-r2-png-to-webp.mjs [--apply] [--delete-source] [options]",
    "",
    "Options:",
    "  --apply                 Convert and upload. Default is dry-run",
    "  --delete-source         Delete the source .png after a verified upload (requires --apply)",
    "  --prefix <prefix>       Limit to a key prefix. Can repeat. Default: whole bucket",
    "  --bucket <name>         R2 bucket. Default: R2_BUCKET_NAME or " + DEFAULT_BUCKET,
    `  --quality <n>           WebP quality. Default: ${DEFAULT_QUALITY}`,
    "  --limit <n>             Process at most n PNG objects",
    `  --manifest <path>       Converted-key manifest output. Default: ${DEFAULT_MANIFEST}`,
    "  --force                 Convert even when a .webp sibling already exists",
    "  --help",
  ].join("\n");
}

function parseArgs(argv) {
  const options = {
    apply: false,
    bucket: "",
    deleteSource: false,
    force: false,
    help: false,
    limit: 0,
    manifest: DEFAULT_MANIFEST,
    prefixes: [],
    quality: DEFAULT_QUALITY,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--apply") {
      options.apply = true;
    } else if (arg === "--delete-source") {
      options.deleteSource = true;
    } else if (arg === "--force") {
      options.force = true;
    } else if (arg === "--prefix") {
      options.prefixes.push(requireValue(arg, next).replace(/^\/+/, ""));
      index += 1;
    } else if (arg === "--bucket") {
      options.bucket = requireValue(arg, next);
      index += 1;
    } else if (arg === "--manifest") {
      options.manifest = requireValue(arg, next);
      index += 1;
    } else if (arg === "--quality") {
      options.quality = clampQuality(requireValue(arg, next));
      index += 1;
    } else if (arg === "--limit") {
      options.limit = Math.max(0, Number.parseInt(requireValue(arg, next), 10) || 0);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (options.deleteSource && !options.apply) {
    throw new Error("--delete-source requires --apply.");
  }

  return options;
}

function requireValue(flag, value) {
  if (!value || String(value).startsWith("--")) throw new Error(`${flag} requires a value.`);
  return String(value);
}

function clampQuality(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 100) {
    throw new Error("--quality must be between 1 and 100.");
  }
  return parsed;
}

function clean(value) {
  return String(value || "").trim().replace(/^["']|["']$/g, "");
}

/**
 * `S3_API` in this repo holds an S3 endpoint URL, not credentials. Only the
 * origin is trustworthy: its path happens to name the *music* bucket, so
 * reading a bucket from it would silently point this tool at the wrong bucket.
 */
function parseS3ApiEndpoint(value) {
  const raw = clean(value);
  if (!raw.startsWith("http")) return "";
  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
}

function resolveCredentials(options) {
  const s3ApiEndpoint = parseS3ApiEndpoint(process.env.S3_API);
  const accountId = clean(
    process.env.R2_ACCOUNT_ID
      || process.env.Account_ID
      || process.env.ACCOUNT_ID
      || process.env.CLOUDFLARE_ACCOUNT_ID,
  );
  const accessKeyId = clean(
    process.env.R2_ACCESS_KEY_ID
      || process.env.S3_ACCESS_KEY_ID
      || process.env.AWS_ACCESS_KEY_ID,
  );
  const secretAccessKey = clean(
    process.env.R2_SECRET_ACCESS_KEY
      || process.env.S3_SECRET_ACCESS_KEY
      || process.env.AWS_SECRET_ACCESS_KEY,
  );
  const bucket = clean(
    options.bucket
      || process.env.R2_BUCKET_NAME
      || process.env.R2_ASSETS_BUCKET
      || DEFAULT_BUCKET,
  );
  const endpoint = clean(
    process.env.R2_ENDPOINT
      || s3ApiEndpoint
      || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : ""),
  ).replace(/\/+$/, "");

  if (!endpoint) {
    throw new Error("R2 endpoint is unknown. Set R2_ACCOUNT_ID or R2_ENDPOINT.");
  }
  if (!accessKeyId || !secretAccessKey) {
    throw new Error([
      "R2 S3 credentials are missing.",
      "Cloudflare dashboard > R2 > Manage API tokens > Create S3 credentials, then add to .env.local:",
      "  R2_ACCESS_KEY_ID=...",
      "  R2_SECRET_ACCESS_KEY=...",
      `(endpoint ${endpoint} and bucket ${bucket} were resolved from existing env vars.)`,
    ].join("\n"));
  }

  return { accessKeyId, bucket, endpoint, secretAccessKey };
}

function toWebpKey(key) {
  return `${key.slice(0, -path.extname(key).length)}.webp`;
}

async function listObjects(client, bucket, prefix) {
  const objects = new Map();
  let continuationToken;

  do {
    const response = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      ContinuationToken: continuationToken,
      Prefix: prefix || undefined,
    }));
    for (const item of response.Contents || []) {
      if (item.Key) objects.set(item.Key, item.Size || 0);
    }
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return objects;
}

async function readObjectBuffer(client, bucket, key) {
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  return Buffer.from(await response.Body.transformToByteArray());
}

async function uploadWebp(client, bucket, webpKey, body) {
  const policy = resolveR2CachePolicy(webpKey);
  await client.send(new PutObjectCommand({
    Body: body,
    Bucket: bucket,
    CacheControl: policy?.cacheControl,
    ContentType: policy?.contentType || inferR2ContentType(webpKey),
    Key: webpKey,
  }));
}

async function uploadedSize(client, bucket, key) {
  const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  return head.ContentLength || 0;
}

/** Existing manifest rows for the same bucket, so prefix-scoped runs add up. */
async function readManifestEntries(manifestPath, bucket) {
  try {
    const parsed = JSON.parse(await readFile(manifestPath, "utf8"));
    if (parsed.bucket && parsed.bucket !== bucket) return [];
    return (parsed.converted || []).filter((entry) => entry?.webpKey && entry?.pngKey);
  } catch {
    return [];
  }
}

function fmtKB(bytes) {
  return `${(bytes / 1024).toFixed(1).padStart(9)} KB`;
}

function pct(from, to) {
  if (!from) return "0.0";
  return ((1 - to / from) * 100).toFixed(1);
}

/** Runs `task` over `items` with a fixed number of concurrent slots. */
async function runPool(items, limit, task) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await task(items[index]);
    }
  });
  await Promise.all(workers);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  const credentials = resolveCredentials(options);
  const client = new S3Client({
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
    endpoint: credentials.endpoint,
    region: "auto",
  });

  const prefixes = options.prefixes.length ? options.prefixes : [""];
  const objects = new Map();
  for (const prefix of prefixes) {
    for (const [key, size] of await listObjects(client, credentials.bucket, prefix)) {
      objects.set(key, size);
    }
  }

  const allPngKeys = [...objects.keys()].filter((key) => key.toLowerCase().endsWith(".png")).sort();
  const excluded = allPngKeys.filter(isWebpExcluded);
  const alreadyConverted = allPngKeys.filter((key) => !isWebpExcluded(key) && !options.force && objects.has(toWebpKey(key)));
  const targets = allPngKeys
    .filter((key) => !isWebpExcluded(key))
    .filter((key) => options.force || !objects.has(toWebpKey(key)))
    .slice(0, options.limit || undefined);

  console.log(`[r2-webp] bucket=${credentials.bucket} objects=${objects.size} png=${allPngKeys.length}`);
  console.log(`[r2-webp] mode=${options.apply ? (options.deleteSource ? "apply+delete" : "apply") : "dry-run"} quality=${options.quality}`);
  for (const key of excluded) console.log(`  skip   excluded (icon/og)      ${key}`);
  for (const key of alreadyConverted) console.log(`  skip   webp already exists   ${key}`);
  if (options.limit && targets.length < allPngKeys.length - excluded.length - alreadyConverted.length) {
    console.log(`  note   --limit ${options.limit} applied; remaining PNG objects were not processed`);
  }

  const summary = { converted: 0, deleted: 0, failed: 0, outBytes: 0, skipped: excluded.length + alreadyConverted.length, srcBytes: 0 };
  // The manifest must accumulate: --prefix runs each see only part of the bucket,
  // and a key whose .webp already exists in R2 is just as safe to reference as one
  // converted right now. Overwriting per run would silently un-migrate earlier work.
  const manifest = new Map();
  for (const key of alreadyConverted) {
    manifest.set(toWebpKey(key), { pngKey: key, srcBytes: objects.get(key) || 0, webpKey: toWebpKey(key) });
  }

  if (!options.apply) {
    for (const key of targets) console.log(`  plan   ${fmtKB(objects.get(key) || 0)} -> webp          ${key}`);
    console.log(`\n[r2-webp] dry-run: ${targets.length} object(s) would be converted. Re-run with --apply.`);
    return;
  }

  await runPool(targets, CONCURRENCY, async (key) => {
    const webpKey = toWebpKey(key);
    try {
      const source = await readObjectBuffer(client, credentials.bucket, key);
      const output = await sharp(source)
        .webp({ effort: 6, quality: options.quality, smartSubsample: true })
        .toBuffer();

      if (output.length >= source.length) {
        summary.skipped += 1;
        console.log(`  skip   webp is larger        ${key}`);
        return;
      }

      await uploadWebp(client, credentials.bucket, webpKey, output);
      const confirmed = await uploadedSize(client, credentials.bucket, webpKey);
      if (confirmed !== output.length) {
        throw new Error(`upload size mismatch: expected ${output.length}, got ${confirmed}`);
      }

      summary.converted += 1;
      summary.srcBytes += source.length;
      summary.outBytes += output.length;
      manifest.set(webpKey, { outBytes: output.length, pngKey: key, srcBytes: source.length, webpKey });
      console.log(`  ok  q${options.quality} ${fmtKB(source.length)} -> ${fmtKB(output.length)} (-${pct(source.length, output.length)}%)  ${key}`);

      if (options.deleteSource) {
        await client.send(new DeleteObjectCommand({ Bucket: credentials.bucket, Key: key }));
        summary.deleted += 1;
        console.log(`  del    source png removed    ${key}`);
      }
    } catch (error) {
      summary.failed += 1;
      console.error(`  FAIL   ${key}: ${error instanceof Error ? error.message : error}`);
    }
  });

  if (manifest.size) {
    const manifestPath = path.resolve(options.manifest);
    for (const entry of await readManifestEntries(manifestPath, credentials.bucket)) {
      if (!manifest.has(entry.webpKey)) manifest.set(entry.webpKey, entry);
    }
    const converted = [...manifest.values()].sort((a, b) => a.pngKey.localeCompare(b.pngKey));
    await mkdir(path.dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, `${JSON.stringify({ bucket: credentials.bucket, converted }, null, 2)}\n`, "utf8");
    console.log(`\n[r2-webp] manifest -> ${path.relative(process.cwd(), manifestPath)} (${converted.length} key(s) total)`);
  }

  console.log("\n[r2-webp] Summary");
  console.log(`  converted: ${summary.converted}  skipped: ${summary.skipped}  deleted: ${summary.deleted}  failed: ${summary.failed}`);
  console.log(`  source total: ${fmtKB(summary.srcBytes)}`);
  console.log(`  webp   total: ${fmtKB(summary.outBytes)}  (saved ${pct(summary.srcBytes, summary.outBytes)}%, ${fmtKB(summary.srcBytes - summary.outBytes)})`);
  if (!options.deleteSource && summary.converted > 0) {
    console.log("  next: deploy the .webp references, then re-run with --apply --delete-source");
  }
  if (summary.failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

#!/usr/bin/env node

import { createHash, createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { config as loadDotenv } from "dotenv";
import {
  inferR2ContentType,
  normalizeR2ObjectKey,
  resolveR2CachePolicy,
  shouldUpdateR2Metadata,
} from "./r2-cache-policy.mjs";

const EMPTY_SHA256 = sha256Hex("");
const DEFAULT_PREFIXES = Object.freeze({
  // 브랜드 세리프는 루트 단일 파일이 아니라 fonts/ 아래 내용해시 청크로 서빙된다
  // (정본 목록: scripts/data/serif-font-manifest.json, 생성: scripts/build-serif-font-assets.mjs).
  assets: ["Mulmaru.woff2", "Galmuri11-Bold.woff2", "The Jamsil OTF 4 Medium.otf", "netmarbleM.ttf", "fonts/", "DestinyCafe/"],
  music: ["DestinyCafe/", "neosong/", "yeonisong/", "DEST1NOVA/", "lunabloom/"],
});

loadDotenv({ path: ".env.local", quiet: true });
loadDotenv({ quiet: true });

function usage() {
  return [
    "Usage:",
    "  node scripts/apply-r2-cache-metadata.mjs --bucket-kind assets --prefix DestinyCafe/",
    "  node scripts/apply-r2-cache-metadata.mjs --bucket-kind assets --key \"The Jamsil OTF 4 Medium.otf\" --apply",
    "  node scripts/apply-r2-cache-metadata.mjs --bucket-kind music --prefix DestinyCafe/ --apply",
    "",
    "Options:",
    "  --bucket-kind <assets|music>  Policy defaults. Default: assets",
    "  --bucket <name>               R2 bucket name",
    "  --prefix <prefix>             List and process keys under prefix. Can repeat",
    "  --key <key-or-url>            Process one key. Can repeat",
    "  --input <file>                Read keys or public URLs from a text file",
    "  --limit <n>                   Limit processed target count",
    "  --apply                       Write metadata. Default is dry-run",
    "  --force                       Rewrite even when cache already exists",
    "  --include-private             Allow keys matching paid/private/user patterns",
    "",
    "Env:",
    "  Account_ID, R2_ACCOUNT_ID, CLOUDFLARE_ACCOUNT_ID, R2_ENDPOINT",
    "  S3_API as JSON, env-style text, or accessKeyId:secretAccessKey",
    "  R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY",
    "  R2_ASSETS_BUCKET, R2_MUSIC_BUCKET",
  ].join("\n");
}

function parseArgs(argv) {
  const options = {
    apply: false,
    bucket: "",
    bucketKind: "assets",
    force: false,
    help: false,
    includePrivate: false,
    input: "",
    keys: [],
    limit: 0,
    prefixes: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--apply") {
      options.apply = true;
    } else if (arg === "--force") {
      options.force = true;
    } else if (arg === "--include-private") {
      options.includePrivate = true;
    } else if (arg === "--bucket-kind") {
      options.bucketKind = requireValue(arg, next);
      index += 1;
    } else if (arg === "--bucket") {
      options.bucket = requireValue(arg, next);
      index += 1;
    } else if (arg === "--prefix") {
      options.prefixes.push(normalizeR2ObjectKey(requireValue(arg, next)));
      index += 1;
    } else if (arg === "--key") {
      options.keys.push(normalizeR2ObjectKey(requireValue(arg, next)));
      index += 1;
    } else if (arg === "--input") {
      options.input = requireValue(arg, next);
      index += 1;
    } else if (arg === "--limit") {
      options.limit = Math.max(0, Number.parseInt(requireValue(arg, next), 10) || 0);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!["assets", "music"].includes(options.bucketKind)) {
    throw new Error("--bucket-kind must be assets or music.");
  }

  return options;
}

function requireValue(flag, value) {
  if (!value || String(value).startsWith("--")) throw new Error(`${flag} requires a value.`);
  return String(value);
}

function clean(value) {
  return String(value || "").trim().replace(/^["']|["']$/g, "");
}

function getR2Credentials(options) {
  const parsedS3Api = parseS3ApiEnv(process.env.S3_API);
  const accountId = clean(process.env.Account_ID || process.env.ACCOUNT_ID || process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID);
  const configuredEndpoint = clean(process.env.R2_ENDPOINT || process.env.S3_ENDPOINT || parsedS3Api.endpoint);
  const endpoint = configuredEndpoint || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");
  const accessKeyId = clean(
    process.env.R2_ACCESS_KEY_ID
      || process.env.S3_ACCESS_KEY_ID
      || process.env.S3_API_ACCESS_KEY_ID
      || process.env.S3_API_KEY_ID
      || process.env.AWS_ACCESS_KEY_ID
      || parsedS3Api.accessKeyId,
  );
  const secretAccessKey = clean(
    process.env.R2_SECRET_ACCESS_KEY
      || process.env.S3_SECRET_ACCESS_KEY
      || process.env.S3_SECRET_KEY
      || process.env.S3_API_SECRET
      || process.env.S3_API_SECRET_ACCESS_KEY
      || process.env.S3_API_SECRET_KEY
      || process.env.AWS_SECRET_ACCESS_KEY
      || parsedS3Api.secretAccessKey,
  );
  const bucket = clean(
    options.bucket
      || (options.bucketKind === "music" ? process.env.R2_MUSIC_BUCKET : "")
      || (options.bucketKind === "assets" ? (process.env.R2_ASSETS_BUCKET || process.env.R2_ASSET_BUCKET || process.env.ASSETS_R2_BUCKET) : "")
      || process.env.R2_BUCKET_NAME
      || process.env.R2_BUCKET
      || parsedS3Api.bucket
      || (options.bucketKind === "music" ? "codestinymuisic" : "codedestinyassets"),
  );
  const region = clean(process.env.R2_REGION || process.env.S3_REGION || parsedS3Api.region || "auto");

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) return null;
  try {
    assertR2S3CredentialsLookUsable(accessKeyId, secretAccessKey);
  } catch (error) {
    if (options.apply) throw error;
    console.warn(error instanceof Error ? error.message : error);
    console.warn("Ignoring unusable R2 credentials for dry-run metadata planning.");
    return null;
  }

  return {
    endpoint: endpoint.replace(/\/+$/g, ""),
    bucket,
    accessKeyId,
    secretAccessKey,
    region,
  };
}

function assertR2S3CredentialsLookUsable(accessKeyId, secretAccessKey) {
  if (accessKeyId.length !== 32) {
    throw new Error("R2 S3 credential check failed: access key id should be 32 characters for Cloudflare R2.");
  }

  if (secretAccessKey.length < 20) {
    throw new Error("R2 S3 credential check failed: secret access key looks too short.");
  }
}

function parseS3ApiEnv(value) {
  const raw = clean(value);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return pickS3ApiCredentialFields(parsed);
  } catch {
    void 0;
  }

  const named = {};
  const normalized = raw.replace(/[;,]\s*/g, "\n");
  const linePattern = /^\s*([^:=\n]+)\s*[:=]\s*(.+?)\s*$/gm;
  let match = linePattern.exec(normalized);
  while (match) {
    assignS3ApiField(named, match[1], match[2]);
    match = linePattern.exec(normalized);
  }
  if (Object.keys(named).length) return named;

  const colonIndex = raw.indexOf(":");
  if (colonIndex > 0) {
    return {
      accessKeyId: raw.slice(0, colonIndex).trim(),
      secretAccessKey: raw.slice(colonIndex + 1).trim(),
    };
  }

  return { accessKeyId: raw };
}

function pickS3ApiCredentialFields(source) {
  const result = {};
  for (const [key, value] of Object.entries(source)) {
    assignS3ApiField(result, key, value);
  }
  return result;
}

function assignS3ApiField(result, key, value) {
  const normalizedKey = String(key || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const normalizedValue = clean(value);
  if (!normalizedValue) return;

  if (["accesskeyid", "accesskey", "keyid", "s3accesskeyid"].includes(normalizedKey)) {
    result.accessKeyId = normalizedValue;
  } else if (["secretaccesskey", "secretkey", "secret", "s3secretaccesskey"].includes(normalizedKey)) {
    result.secretAccessKey = normalizedValue;
  } else if (["endpoint", "s3endpoint", "r2endpoint"].includes(normalizedKey)) {
    result.endpoint = normalizedValue;
  } else if (["bucket", "bucketname", "r2bucket", "r2musicbucket"].includes(normalizedKey)) {
    result.bucket = normalizedValue;
  } else if (["region", "s3region", "r2region"].includes(normalizedKey)) {
    result.region = normalizedValue;
  }
}

async function readKeysFromFile(filePath) {
  const text = await readFile(filePath, "utf8");
  return text.split(/\r?\n/u).map(normalizeR2ObjectKey).filter((key) => key && !key.startsWith("#"));
}

async function resolveTargetKeys(options, credentials) {
  const explicitKeys = [...options.keys];
  if (options.input) explicitKeys.push(...await readKeysFromFile(options.input));
  if (explicitKeys.length) return unique(explicitKeys);

  const prefixes = options.prefixes.length ? options.prefixes : DEFAULT_PREFIXES[options.bucketKind];
  if (options.apply && !options.prefixes.length && !options.keys.length && !options.input) {
    throw new Error("--apply requires --prefix, --key, or --input.");
  }
  if (!credentials) return unique(prefixes);

  const groups = [];
  for (const prefix of prefixes) {
    groups.push(...await listR2Prefix(credentials, prefix));
  }
  return unique(groups);
}

async function listR2Prefix(credentials, prefix) {
  const keys = [];
  let continuationToken = "";

  do {
    const url = new URL(`${credentials.endpoint}/${credentials.bucket}`);
    url.searchParams.set("list-type", "2");
    url.searchParams.set("prefix", prefix);
    if (continuationToken) url.searchParams.set("continuation-token", continuationToken);

    const response = await fetch(url, {
      method: "GET",
      headers: signS3Request(credentials, "GET", url),
    });
    const body = await response.text();
    if (!response.ok) {
      throw new Error(`R2 list failed for ${prefix}: ${response.status} ${response.statusText}\n${body.slice(0, 800)}`);
    }

    keys.push(...parseS3Keys(body));
    continuationToken = parseXmlTag(body, "NextContinuationToken");
  } while (continuationToken);

  return keys;
}

async function headR2Object(credentials, key) {
  const url = objectUrl(credentials, key);
  const response = await fetch(url, {
    method: "HEAD",
    headers: signS3Request(credentials, "HEAD", url),
  });

  if (response.status === 404) {
    return { ok: false, status: 404, cacheControl: "", contentType: "" };
  }

  if (!response.ok) {
    throw new Error(`R2 HEAD failed for ${key}: ${response.status} ${response.statusText}`);
  }

  return {
    ok: true,
    status: response.status,
    cacheControl: response.headers.get("cache-control") || "",
    contentType: response.headers.get("content-type") || "",
    etag: response.headers.get("etag") || "",
    size: response.headers.get("content-length") || "",
  };
}

async function copyR2ObjectWithMetadata(credentials, key, policy, current) {
  const url = objectUrl(credentials, key);
  const contentType = normalizeContentTypeForWrite(policy.contentType || current.contentType || inferR2ContentType(key));
  const headers = {
    "Cache-Control": policy.cacheControl,
    "Content-Type": contentType,
    "x-amz-copy-source": `/${credentials.bucket}/${encodeObjectKeyPath(key)}`,
    "x-amz-metadata-directive": "REPLACE",
  };

  const response = await fetch(url, {
    method: "PUT",
    headers: signS3Request(credentials, "PUT", url, headers),
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`R2 metadata rewrite failed for ${key}: ${response.status} ${response.statusText}\n${body.slice(0, 800)}`);
  }

  return {
    status: response.status,
    etag: response.headers.get("etag") || "",
  };
}

function normalizeContentTypeForWrite(value) {
  return String(value || "application/octet-stream").trim() || "application/octet-stream";
}

function objectUrl(credentials, key) {
  return new URL(`${credentials.endpoint}/${credentials.bucket}/${encodeObjectKeyPath(key)}`);
}

function encodeObjectKeyPath(objectKey) {
  return normalizeR2ObjectKey(objectKey).split("/").map(encodeRfc3986).join("/");
}

function unique(items) {
  return Array.from(new Set(items.map(normalizeR2ObjectKey).filter(Boolean)));
}

function signS3Request(credentials, method, url, extraHeaders = {}) {
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${credentials.region}/s3/aws4_request`;
  const baseHeaders = {
    ...extraHeaders,
    host: url.host,
    "x-amz-content-sha256": EMPTY_SHA256,
    "x-amz-date": amzDate,
  };
  const normalizedHeaders = normalizeHeaders(baseHeaders);
  const signedHeaders = Object.keys(normalizedHeaders).sort().join(";");
  const canonicalHeaders = Object.keys(normalizedHeaders)
    .sort()
    .map((key) => `${key}:${normalizedHeaders[key]}`)
    .join("\n") + "\n";
  const canonicalRequest = [
    method.toUpperCase(),
    canonicalUri(url.pathname),
    canonicalQuery(url.searchParams),
    canonicalHeaders,
    signedHeaders,
    EMPTY_SHA256,
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signingKey = getSignatureKey(credentials.secretAccessKey, dateStamp, credentials.region, "s3");
  const signature = hmacHex(signingKey, stringToSign);

  return {
    ...extraHeaders,
    Authorization: `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    "x-amz-content-sha256": EMPTY_SHA256,
    "x-amz-date": amzDate,
  };
}

function normalizeHeaders(headers) {
  const normalized = {};
  for (const [key, value] of Object.entries(headers)) {
    const normalizedKey = String(key).trim().toLowerCase();
    normalized[normalizedKey] = String(value).trim().replace(/\s+/g, " ");
  }
  return normalized;
}

function canonicalUri(pathname) {
  return pathname.split("/").map((segment) => {
    try {
      return encodeRfc3986(decodeURIComponent(segment));
    } catch {
      return encodeRfc3986(segment);
    }
  }).join("/");
}

function canonicalQuery(params) {
  return Array.from(params.entries())
    .sort(([keyA, valueA], [keyB, valueB]) => keyA === keyB ? valueA.localeCompare(valueB) : keyA.localeCompare(keyB))
    .map(([key, value]) => `${encodeRfc3986(key)}=${encodeRfc3986(value)}`)
    .join("&");
}

function encodeRfc3986(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function toAmzDate(date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function sha256Hex(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(key, value) {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function hmacHex(key, value) {
  return createHmac("sha256", key).update(value, "utf8").digest("hex");
}

function getSignatureKey(secretAccessKey, dateStamp, region, service) {
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, service);
  return hmac(serviceKey, "aws4_request");
}

function parseS3Keys(xml) {
  const keys = [];
  const keyPattern = /<Key>([\s\S]*?)<\/Key>/g;
  let match = keyPattern.exec(xml);
  while (match) {
    keys.push(decodeXml(match[1]));
    match = keyPattern.exec(xml);
  }
  return keys;
}

function parseXmlTag(xml, tagName) {
  const match = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`).exec(xml);
  return match ? decodeXml(match[1]) : "";
}

function decodeXml(value) {
  return String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function printRow(row) {
  console.log(JSON.stringify(row));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  const credentials = getR2Credentials(options);
  if (options.apply && !credentials) {
    throw new Error("R2 credentials are required when --apply is used.");
  }

  const keys = (await resolveTargetKeys(options, credentials)).slice(0, options.limit || undefined);
  const summary = {
    apply: options.apply,
    bucketKind: options.bucketKind,
    bucket: credentials?.bucket || options.bucket || "(not connected)",
    total: keys.length,
    planned: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  for (const key of keys) {
    const policy = resolveR2CachePolicy(key, { includePrivate: options.includePrivate });
    if (!policy) {
      summary.skipped += 1;
      printRow({ action: "skip", key, reason: "no-public-cache-policy" });
      continue;
    }

    let current = { ok: false, cacheControl: "", contentType: "" };
    if (credentials) {
      current = await headR2Object(credentials, key);
      if (!current.ok) {
        summary.failed += 1;
        printRow({ action: "missing", key, status: current.status });
        continue;
      }
    }

    const needsUpdate = shouldUpdateR2Metadata(current, policy, { force: options.force });
    if (!needsUpdate) {
      summary.skipped += 1;
      printRow({
        action: "keep",
        key,
        currentCacheControl: current.cacheControl,
        currentContentType: current.contentType,
        reason: policy.reason,
      });
      continue;
    }

    summary.planned += 1;
    if (!options.apply) {
      printRow({
        action: "would-update",
        key,
        cacheControl: policy.cacheControl,
        contentType: policy.contentType,
        currentCacheControl: current.cacheControl,
        currentContentType: current.contentType,
        reason: policy.reason,
      });
      continue;
    }

    try {
      const result = await copyR2ObjectWithMetadata(credentials, key, policy, current);
      summary.updated += 1;
      printRow({
        action: "updated",
        key,
        status: result.status,
        cacheControl: policy.cacheControl,
        contentType: policy.contentType,
        reason: policy.reason,
      });
    } catch (error) {
      summary.failed += 1;
      printRow({
        action: "failed",
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log(JSON.stringify({ summary }));
  if (summary.failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

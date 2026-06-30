import type {} from "node:fs";

const { createHmac, createHash } = require("node:crypto") as typeof import("node:crypto");
const { mkdir, readFile, writeFile } = require("node:fs/promises") as typeof import("node:fs/promises");
const { dirname, extname, resolve } = require("node:path") as typeof import("node:path");
const { config: loadDotenv } = require("dotenv") as typeof import("dotenv");

type ArtistKey = "neo" | "yeoni";
type ArtistConfig = {
  artistKey: ArtistKey;
  artistName: "Neo" | "Yeoni";
  prefix: "neosong/" | "yeonisong/";
  preferredFallbackCovers: readonly string[];
};
type CliOptions = {
  input?: string;
  out: string;
  format?: "json" | "ts";
  baseUrl?: string;
  bucket?: string;
  help?: boolean;
};
type R2Credentials = {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
};
type PartialS3ApiCredentials = {
  endpoint?: string;
  bucket?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
};
type GeneratedTrack = {
  id: string;
  artistKey: ArtistKey;
  artistName: "Neo" | "Yeoni";
  title: string;
  audioKey: string;
  coverKey: string;
  audioUrl: string;
  coverUrl: string;
  order: number;
};

const ARTISTS: readonly ArtistConfig[] = [
  {
    artistKey: "neo",
    artistName: "Neo",
    prefix: "neosong/",
    preferredFallbackCovers: ["neosong/cover.webp", "neosong/네오 데뷔.webp"],
  },
  {
    artistKey: "yeoni",
    artistName: "Yeoni",
    prefix: "yeonisong/",
    preferredFallbackCovers: ["yeonisong/cover.webp", "yeonisong/꽃돼지 1집.png"],
  },
];
const PREFIXES = ARTISTS.map((artist) => artist.prefix);
const EXCLUDED_AUDIO_BASENAMES = new Set([
  "\uB2EC\uBE5B \uC810\uAD18",
]);
const EMPTY_SHA256 = sha256Hex("");

loadDotenv({ path: ".env.local", quiet: true });
loadDotenv({ quiet: true });

function usage() {
  return [
    "Usage:",
    "  npm run generate:music-manifest -- --input ./music-object-keys.txt",
    "  npm run generate:music-manifest -- --out public/music-manifest.json",
    "",
    "Options:",
    "  --input, --keys <file>  Read object keys from a local text file.",
    "  --out <file>           Output path. Default: public/music-manifest.json",
    "  --format <json|ts>     Output format. Inferred from --out when omitted.",
    "  --base-url <url>       Public music base URL. Defaults to NEXT_PUBLIC_MUSIC_BASE_URL.",
    "  --bucket <name>        R2 bucket name. Defaults to R2_MUSIC_BUCKET or codestinymuisic.",
    "",
    "R2 env:",
    "  Account_ID, R2_ACCOUNT_ID, or R2_ENDPOINT",
    "  S3_API as JSON, env-style text, or accessKeyId:secretAccessKey",
    "  R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY also supported",
    "  R2_MUSIC_BUCKET",
  ].join("\n");
}

function parseArgs(argv: readonly string[]): CliOptions {
  const options: CliOptions = {
    out: "public/music-manifest.json",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--input" || arg === "--keys") {
      options.input = requireValue(arg, next);
      index += 1;
    } else if (arg === "--out") {
      options.out = requireValue(arg, next);
      index += 1;
    } else if (arg === "--format") {
      const value = requireValue(arg, next);
      if (value !== "json" && value !== "ts") {
        throw new Error("--format must be json or ts.");
      }
      options.format = value;
      index += 1;
    } else if (arg === "--base-url") {
      options.baseUrl = requireValue(arg, next);
      index += 1;
    } else if (arg === "--bucket") {
      options.bucket = requireValue(arg, next);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function requireValue(flag: string, value?: string) {
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function clean(value: unknown) {
  return String(value || "").trim().replace(/^["']|["']$/g, "");
}

function inferFormat(options: CliOptions) {
  if (options.format) return options.format;
  return extname(options.out).toLowerCase() === ".ts" ? "ts" : "json";
}

function normalizeBaseUrl(baseUrl?: string) {
  return clean(baseUrl || process.env.NEXT_PUBLIC_MUSIC_BASE_URL || process.env.MUSIC_BASE_URL).replace(/\/+$/g, "");
}

function encodeObjectKeyPath(objectKey: string) {
  return objectKey.split("/").map((segment) => encodeURIComponent(segment)).join("/");
}

function buildPublicUrl(baseUrl: string, objectKey: string) {
  if (!baseUrl) return "";
  return `${baseUrl}/${encodeObjectKeyPath(objectKey)}`;
}

function normalizeObjectKey(rawLine: string) {
  const trimmed = rawLine.trim();
  if (!trimmed || trimmed.startsWith("#")) return "";

  let candidate = trimmed;
  try {
    const url = new URL(trimmed);
    candidate = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  } catch {
    candidate = trimmed;
  }

  candidate = candidate.replace(/\\/g, "/").replace(/^\/+/, "");
  const prefixIndex = PREFIXES
    .map((prefix) => candidate.indexOf(prefix))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];

  return prefixIndex === undefined ? candidate : candidate.slice(prefixIndex);
}

async function readKeysFromFile(inputPath: string) {
  const text = await readFile(resolve(inputPath), "utf8");
  return text.split(/\r?\n/u).map(normalizeObjectKey).filter(Boolean);
}

function getR2Credentials(bucketOverride?: string): R2Credentials | null {
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
  const bucket = clean(bucketOverride || process.env.R2_MUSIC_BUCKET || process.env.R2_BUCKET_NAME || process.env.R2_BUCKET || parsedS3Api.bucket || "codestinymuisic");
  const region = clean(process.env.R2_REGION || process.env.S3_REGION || parsedS3Api.region || "auto");

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) return null;
  assertR2S3CredentialsLookUsable(accessKeyId, secretAccessKey);

  return {
    endpoint: endpoint.replace(/\/+$/g, ""),
    bucket,
    accessKeyId,
    secretAccessKey,
    region,
  };
}

function assertR2S3CredentialsLookUsable(accessKeyId: string, secretAccessKey: string) {
  if (accessKeyId.length !== 32) {
    throw new Error([
      "R2 S3 credential check failed: access key id should be 32 characters for Cloudflare R2.",
      "Check S3_API: it must contain the R2 S3 Access Key ID and Secret Access Key, not a Cloudflare API token or label.",
      "Supported S3_API formats:",
      "  {\"accessKeyId\":\"...\",\"secretAccessKey\":\"...\"}",
      "  accessKeyId:secretAccessKey",
      "  Access Key ID=...",
      "  Secret Access Key=...",
    ].join("\n"));
  }

  if (secretAccessKey.length < 20) {
    throw new Error("R2 S3 credential check failed: secret access key looks too short.");
  }
}

function parseS3ApiEnv(value: unknown): PartialS3ApiCredentials {
  const raw = clean(value);
  if (!raw) return {};

  const jsonParsed = parseS3ApiJson(raw);
  if (Object.keys(jsonParsed).length) return jsonParsed;

  const namedParsed = parseS3ApiNamedText(raw);
  if (Object.keys(namedParsed).length) return namedParsed;

  const colonIndex = raw.indexOf(":");
  if (colonIndex > 0) {
    return {
      accessKeyId: raw.slice(0, colonIndex).trim(),
      secretAccessKey: raw.slice(colonIndex + 1).trim(),
    };
  }

  return {
    accessKeyId: raw,
  };
}

function parseS3ApiJson(raw: string): PartialS3ApiCredentials {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return pickS3ApiCredentialFields(parsed as Record<string, unknown>);
  } catch {
    return {};
  }
}

function parseS3ApiNamedText(raw: string): PartialS3ApiCredentials {
  const result: PartialS3ApiCredentials = {};
  const normalized = raw.replace(/[;,]\s*/g, "\n");
  const linePattern = /^\s*([^:=\n]+)\s*[:=]\s*(.+?)\s*$/gm;
  let match = linePattern.exec(normalized);

  while (match) {
    assignS3ApiField(result, match[1], match[2]);
    match = linePattern.exec(normalized);
  }

  return result;
}

function pickS3ApiCredentialFields(source: Record<string, unknown>) {
  const result: PartialS3ApiCredentials = {};

  for (const [key, value] of Object.entries(source)) {
    assignS3ApiField(result, key, value);
  }

  return result;
}

function assignS3ApiField(result: PartialS3ApiCredentials, key: unknown, value: unknown) {
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

async function listKeysFromR2(credentials: R2Credentials) {
  const groups = await Promise.all(PREFIXES.map((prefix) => listR2Prefix(credentials, prefix)));
  return groups.flat();
}

async function listR2Prefix(credentials: R2Credentials, prefix: string) {
  const keys: string[] = [];
  let continuationToken = "";

  do {
    const url = new URL(`${credentials.endpoint}/${credentials.bucket}`);
    url.searchParams.set("list-type", "2");
    url.searchParams.set("prefix", prefix);
    if (continuationToken) {
      url.searchParams.set("continuation-token", continuationToken);
    }

    const response = await fetch(url, {
      method: "GET",
      headers: signS3Request(credentials, url),
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

function signS3Request(credentials: R2Credentials, url: URL) {
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${credentials.region}/s3/aws4_request`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalHeaders = [
    `host:${url.host}`,
    `x-amz-content-sha256:${EMPTY_SHA256}`,
    `x-amz-date:${amzDate}`,
    "",
  ].join("\n");
  const canonicalRequest = [
    "GET",
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
    Authorization: `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    "x-amz-content-sha256": EMPTY_SHA256,
    "x-amz-date": amzDate,
  };
}

function canonicalUri(pathname: string) {
  return pathname.split("/").map((segment) => encodeRfc3986(decodeURIComponent(segment))).join("/");
}

function canonicalQuery(params: URLSearchParams) {
  return Array.from(params.entries())
    .sort(([keyA, valueA], [keyB, valueB]) => keyA === keyB ? valueA.localeCompare(valueB) : keyA.localeCompare(keyB))
    .map(([key, value]) => `${encodeRfc3986(key)}=${encodeRfc3986(value)}`)
    .join("&");
}

function encodeRfc3986(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function toAmzDate(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function sha256Hex(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(key: string | Buffer, value: string) {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function hmacHex(key: string | Buffer, value: string) {
  return createHmac("sha256", key).update(value, "utf8").digest("hex");
}

function getSignatureKey(secretAccessKey: string, dateStamp: string, region: string, service: string) {
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, service);
  return hmac(serviceKey, "aws4_request");
}

function parseS3Keys(xml: string) {
  const keys: string[] = [];
  const keyPattern = /<Key>([\s\S]*?)<\/Key>/g;
  let match = keyPattern.exec(xml);

  while (match) {
    keys.push(decodeXml(match[1]));
    match = keyPattern.exec(xml);
  }

  return keys;
}

function parseXmlTag(xml: string, tagName: string) {
  const match = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`).exec(xml);
  return match ? decodeXml(match[1]) : "";
}

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function isTargetKey(key: string) {
  return PREFIXES.some((prefix) => key.startsWith(prefix));
}

function artistForKey(key: string) {
  return ARTISTS.find((artist) => key.startsWith(artist.prefix)) || null;
}

function extensionOfKey(key: string) {
  return extname(key).toLowerCase();
}

function basenameOfKey(key: string) {
  const fileName = key.split("/").pop() || key;
  return fileName.replace(/\.[^.]+$/u, "");
}

function titleFromKey(key: string) {
  return basenameOfKey(key).replace(/[-_]+/gu, " ").replace(/\s+/gu, " ").trim();
}

function buildTracks(keys: readonly string[], baseUrl: string) {
  const normalizedKeys = keys.map(normalizeObjectKey).filter(Boolean).filter(isTargetKey);
  const coverKeys = normalizedKeys.filter((key) => [".webp", ".png"].includes(extensionOfKey(key)));
  const audioKeys = normalizedKeys.filter((key) => extensionOfKey(key) === ".mp3" && !EXCLUDED_AUDIO_BASENAMES.has(basenameOfKey(key)));
  const tracks: GeneratedTrack[] = [];

  for (const artist of ARTISTS) {
    const artistAudioKeys = audioKeys.filter((key) => key.startsWith(artist.prefix));
    const artistCoverKeys = coverKeys.filter((key) => key.startsWith(artist.prefix));

    artistAudioKeys.forEach((audioKey, index) => {
      const coverKey = findCoverKey(artist, audioKey, artistCoverKeys);
      tracks.push({
        id: `${artist.artistKey}-${String(index + 1).padStart(3, "0")}`,
        artistKey: artist.artistKey,
        artistName: artist.artistName,
        title: titleFromKey(audioKey),
        audioKey,
        coverKey,
        audioUrl: buildPublicUrl(baseUrl, audioKey),
        coverUrl: buildPublicUrl(baseUrl, coverKey),
        order: index + 1,
      });
    });
  }

  return tracks;
}

function findCoverKey(artist: ArtistConfig, audioKey: string, coverKeys: readonly string[]) {
  const audioBasename = basenameOfKey(audioKey).toLowerCase();
  const sameBasenameWebp = coverKeys.find((key) => extensionOfKey(key) === ".webp" && basenameOfKey(key).toLowerCase() === audioBasename);
  if (sameBasenameWebp) return sameBasenameWebp;

  const preferredFallbackCover = artist.preferredFallbackCovers.find((key) => coverKeys.includes(key));
  if (preferredFallbackCover) return preferredFallbackCover;

  const sameBasenamePng = coverKeys.find((key) => extensionOfKey(key) === ".png" && basenameOfKey(key).toLowerCase() === audioBasename);
  if (sameBasenamePng) return sameBasenamePng;

  const folderCoverPng = `${artist.prefix}cover.png`;
  if (coverKeys.includes(folderCoverPng)) return folderCoverPng;

  return artist.preferredFallbackCovers[0];
}

function buildJsonManifest(tracks: readonly GeneratedTrack[], source: string) {
  return {
    generatedAt: new Date().toISOString(),
    source,
    prefixes: PREFIXES,
    tracks,
  };
}

function renderTypeScript(tracks: readonly GeneratedTrack[], source: string) {
  return [
    "export type GeneratedMusicTrack = {",
    "  id: string;",
    "  artistKey: \"neo\" | \"yeoni\";",
    "  artistName: \"Neo\" | \"Yeoni\";",
    "  title: string;",
    "  audioKey: string;",
    "  coverKey: string;",
    "  audioUrl: string;",
    "  coverUrl: string;",
    "  order: number;",
    "};",
    "",
    `export const generatedMusicManifestSource = ${JSON.stringify(source)} as const;`,
    `export const generatedMusicTracks = ${JSON.stringify(tracks, null, 2)} satisfies GeneratedMusicTrack[];`,
    "",
    "export default generatedMusicTracks;",
    "",
  ].join("\n");
}

async function writeOutput(options: CliOptions, tracks: readonly GeneratedTrack[], source: string) {
  const format = inferFormat(options);
  const outPath = resolve(options.out);
  const content = format === "ts"
    ? renderTypeScript(tracks, source)
    : `${JSON.stringify(buildJsonManifest(tracks, source), null, 2)}\n`;

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, content, "utf8");
  console.info(`Generated ${tracks.length} tracks -> ${options.out}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  const baseUrl = normalizeBaseUrl(options.baseUrl);
  let source = "r2-list";
  let keys: string[];

  if (options.input) {
    source = "local-file-list";
    keys = await readKeysFromFile(options.input);
  } else {
    const credentials = getR2Credentials(options.bucket);
    if (!credentials) {
      throw new Error(`R2 credentials are not configured. Use --input for local object key list mode.\n\n${usage()}`);
    }
    keys = await listKeysFromR2(credentials);
  }

  const tracks = buildTracks(keys, baseUrl);
  await writeOutput(options, tracks, source);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

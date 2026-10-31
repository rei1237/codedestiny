// Atlas Admin API 읽기 전용 클라이언트: GET만 보내고, 허용 목록 밖 경로는 요청 전에 거부한다.
// HTTP Digest(RFC 2617, MD5, qop=auth)는 node:crypto로 직접 계산한다. 외부 프로세스는 쓰지 않는다.
import { createHash, randomBytes } from "node:crypto";

const DEFAULT_BASE_URL = "https://cloud.mongodb.com";
const DEFAULT_PATH_PREFIX = "/api/atlas/v2";
// Accept 버전: 아래 모든 엔드포인트가 공개 OpenAPI 명세에서 2025-03-12를 지원한다(2023-02-01은 이 엔드포인트에 없음).
export const ATLAS_ACCEPT = "application/vnd.atlas.2025-03-12+json";
const REQUEST_TIMEOUT_MS = 30000;

// {x} 자리표시자는 비어 있지 않은 세그먼트 정확히 하나와만 맞는다.
export const ALLOWED_GET_PREFIXES = Object.freeze([
  "/groups",
  "/groups/{g}/clusters",
  "/groups/{g}/processes",
  "/groups/{g}/processes/{p}/measurements",
  "/groups/{g}/processes/{p}/performanceAdvisor/suggestedIndexes",
  "/groups/{g}/processes/{p}/performanceAdvisor/slowQueryLogs",
  "/groups/{g}/accessList",
  "/groups/{g}/databaseUsers",
  "/groups/{g}/clusters/{c}/backup/schedule",
  "/groups/{g}/clusters/{c}/backup/snapshots",
  "/groups/{g}/alertConfigs",
  "/groups/{g}/auditLog",
  "/orgs/{o}/invoices",
  "/orgs/{o}/invoices/{id}",
]);

const PLACEHOLDER = /^\{[^}]+\}$/;
// ".", ".." 세그먼트, 인코딩된 점/슬래시/역슬래시(%2e %2f %5c), 역슬래시, 제어문자(U+0000-U+001F)를 거부한다.
const UNSAFE_SEGMENT = /^\.{1,2}$|%2e|%2f|%5c|[\\\u0000-\u001f]/i;

function matchesAllowList(pathOnly) {
  const segments = pathOnly.slice(1).split("/");
  if (segments.some((s) => UNSAFE_SEGMENT.test(s))) return false;
  return ALLOWED_GET_PREFIXES.some((pattern) => {
    const parts = pattern.slice(1).split("/");
    return parts.length === segments.length
      && parts.every((part, i) => (PLACEHOLDER.test(part) ? segments[i] !== "" : part === segments[i]));
  });
}

const md5 = (value) => createHash("md5").update(value).digest("hex");

function parseChallenge(header) {
  if (!header || !/^digest\s/i.test(header)) return null;
  const params = {};
  for (const m of header.replace(/^digest\s+/i, "").matchAll(/([a-z0-9_-]+)=(?:"([^"]*)"|([^,\s]*))/gi)) {
    params[m[1].toLowerCase()] = m[2] ?? m[3];
  }
  if (!params.nonce || !params.realm) return null;
  if (!(params.qop || "").split(",").map((q) => q.trim()).includes("auth")) return null;
  return params;
}

function digestAuthorization({ username, password, method, uri, challenge, nc, cnonce }) {
  const ha1 = md5(`${username}:${challenge.realm}:${password}`);
  const ha2 = md5(`${method}:${uri}`);
  const response = md5(`${ha1}:${challenge.nonce}:${nc}:${cnonce}:auth:${ha2}`);
  const fields = [
    `username="${username}"`,
    `realm="${challenge.realm}"`,
    `nonce="${challenge.nonce}"`,
    `uri="${uri}"`,
    "algorithm=MD5",
    "qop=auth",
    `nc=${nc}`,
    `cnonce="${cnonce}"`,
    `response="${response}"`,
  ];
  if (challenge.opaque) fields.push(`opaque="${challenge.opaque}"`);
  return `Digest ${fields.join(", ")}`;
}

function httpError(path, status) {
  const err = new Error(`Atlas GET ${path} failed: HTTP ${status}`);
  err.status = status;
  return err;
}

export function createAtlasReadonlyClient({ publicKey, privateKey, fetchImpl, cnonce, baseUrl, pathPrefix } = {}) {
  const doFetch = fetchImpl || globalThis.fetch;
  let challenge = null;
  let nc = 0;

  async function send(url, uri) {
    const headers = { Accept: ATLAS_ACCEPT };
    if (challenge) {
      nc += 1;
      headers.Authorization = digestAuthorization({
        username: publicKey,
        password: privateKey,
        method: "GET",
        uri,
        challenge,
        nc: nc.toString(16).padStart(8, "0"),
        cnonce: cnonce || randomBytes(8).toString("hex"),
      });
    }
    return doFetch(url, { method: "GET", headers, redirect: "error", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  }

  async function get(path, opts = {}) {
    const testOnly = opts._testOnly === true;
    const base = testOnly && baseUrl !== undefined ? baseUrl : DEFAULT_BASE_URL;
    const prefix = testOnly && pathPrefix !== undefined ? pathPrefix : DEFAULT_PATH_PREFIX;
    if (typeof path !== "string" || !path.startsWith("/")) throw new Error("Atlas path must start with '/'");

    const rel = prefix && path.startsWith(`${prefix}/`) ? path.slice(prefix.length) : path;
    const qIndex = rel.indexOf("?");
    const pathOnly = qIndex === -1 ? rel : rel.slice(0, qIndex);
    if (!(testOnly && opts.allowUnlisted === true) && (rel.includes("#") || !matchesAllowList(pathOnly))) {
      throw new Error(`Atlas path not allowed: ${pathOnly}`);
    }

    const url = `${base}${prefix}${rel}`;
    const parsed = new URL(url);
    // 다층 방어: URL이 정규화한 결과(탭 제거, 백슬래시 변환, %2e 해석 등)가 검증한 경로와 다르면 거부한다.
    const normalizedPath = parsed.pathname;
    const allowUnlisted = testOnly && opts.allowUnlisted === true;
    if (normalizedPath !== `${prefix}${pathOnly}`
      || (!allowUnlisted && !matchesAllowList(normalizedPath.slice(prefix.length)))) {
      throw new Error(`Atlas path not allowed: ${pathOnly}`);
    }
    const uri = `${parsed.pathname}${parsed.search}`;

    let res = await send(url, uri);
    // 첫 요청이거나 nonce가 만료되면 401 챌린지로 다시 한 번만 시도한다.
    if (res.status === 401) {
      const next = parseChallenge(res.headers.get("www-authenticate"));
      if (next) {
        challenge = next;
        nc = 0;
        res = await send(url, uri);
      }
    }
    if (!res.ok) throw httpError(pathOnly, res.status);
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  }

  return { get };
}

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}(\/\d{1,2})?$/;
const SECRET_KEY = /key$|^key|token|secret|password|connectionstring|mongouri|srvaddress|authorization|credential/i;

// 호스트명은 마지막 라벨만, 프로젝트(groupId)·조직(orgId) ID 는 끝 4자만 남긴다.
const HOST_PORT = /^[A-Za-z0-9-]+(?:.[A-Za-z0-9-]+)+(:d{1,5})?$/;
function maskHost(value) {
  const match = HOST_PORT.exec(value);
  if (!match) return null;
  const host = match[1] ? value.slice(0, -match[1].length) : value;
  return `***.${host.split(".").at(-1)}${match[1] || ""}`;
}

function maskAddress(value, keyName) {
  const v4 = IPV4.exec(value);
  if (v4) return value === "0.0.0.0/0" ? value : `${v4[1]}.${v4[2]}.x.x${v4[3] || ""}`;
  if ((keyName === "cidrBlock" || keyName === "ipAddress") && value.includes(":")) {
    const [addr, mask] = value.split("/");
    if (/^:*$/.test(addr)) return value; // ::/0
    return `${addr.split(":").slice(0, 2).join(":")}:x:x${mask === undefined ? "" : `/${mask}`}`;
  }
  return value;
}

export function redactAtlasSnapshot(snapshot) {
  const walk = (value, keyName) => {
    if (Array.isArray(value)) return value.map((item) => walk(item, keyName));
    if (value && typeof value === "object") {
      const out = {};
      for (const [k, v] of Object.entries(value)) {
        if (SECRET_KEY.test(k)) continue;
        out[k] = walk(v, k);
      }
      return out;
    }
    if (typeof value !== "string") return value;
    if (keyName === "username") return `${value.slice(0, 2)}***`;
    if (keyName === "groupId" || keyName === "orgId") return `***${value.slice(-4)}`;
    // Atlas 프로세스 id 는 "호스트:포트" 라 호스트명이 그대로 실린다.
    if (keyName === "hostname" || keyName === "id") return (!IPV4.test(value) && maskHost(value)) || maskAddress(value, keyName);
    return maskAddress(value, keyName);
  };
  return walk(snapshot, "");
}

/**
 * Vertex AI Gemini 호출 공유 유틸리티
 *
 * 환경 변수:
 *   VERTEX_SA_CLIENT_EMAIL  - 서비스 계정 이메일
 *   VERTEX_SA_PRIVATE_KEY   - 서비스 계정 비공개 키 (PEM, \n 이스케이프 허용)
 *   VERTEX_PROJECT_ID       - GCP 프로젝트 ID (기본: vertex-492922)
 *   VERTEX_LOCATION         - 리전 (기본: us-central1)
 *
 * 사용 방법:
 *   import { callVertexGemini } from "@/app/_lib/callVertexGemini";
 *   const text = await callVertexGemini(prompt);
 *   if (!text) { // Vertex 미설정/실패 → 상위에서 GEMINI_API_KEY 폴백 }
 */

import { createSign } from "node:crypto";

// ─── 액세스 토큰 인메모리 캐시 (~55분 재사용) ────────────────────
let _cachedToken = "";
let _tokenExpiry = 0;

type VertexServiceAccount = {
  client_email?: string;
  private_key?: string;
  project_id?: string;
};

function parseServiceAccountFromEnv(): VertexServiceAccount | null {
  const rawJson = String(
    process.env.VERTEX_SA_JSON ||
      process.env.GCP_SERVICE_ACCOUNT_JSON ||
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
      "",
  ).trim();

  const rawJsonBase64 = String(
    process.env.VERTEX_SA_JSON_BASE64 ||
      process.env.GCP_SERVICE_ACCOUNT_JSON_BASE64 ||
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 ||
      "",
  ).trim();

  let jsonText = rawJson;
  if (!jsonText && rawJsonBase64) {
    try {
      jsonText = Buffer.from(rawJsonBase64, "base64").toString("utf8").trim();
    } catch {
      jsonText = "";
    }
  }

  if (!jsonText) return null;

  try {
    const parsed = JSON.parse(jsonText) as VertexServiceAccount;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function resolveVertexServiceAccount(): {
  email: string;
  privateKey: string;
  projectFromJson: string;
} {
  const sa = parseServiceAccountFromEnv();

  const email = String(
    sa?.client_email || process.env.VERTEX_SA_CLIENT_EMAIL || "",
  ).trim();

  const privateKey = String(
    sa?.private_key || process.env.VERTEX_SA_PRIVATE_KEY || "",
  )
    .replace(/\\n/g, "\n")
    .trim();

  const projectFromJson = String(sa?.project_id || "").trim();
  return { email, privateKey, projectFromJson };
}

function inferProjectIdFromServiceAccountEmail(email: string): string {
  const m = String(email || "").trim().match(/@([a-z0-9-]+)\.iam\.gserviceaccount\.com$/i);
  return m?.[1] ? m[1].trim() : "";
}

async function getVertexAccessToken(): Promise<string> {
  const now = Date.now();
  if (_cachedToken && now < _tokenExpiry - 60_000) return _cachedToken;

  const { email, privateKey } = resolveVertexServiceAccount();

  if (!email || !privateKey) throw new Error("VERTEX_SA 자격증명(JSON/ENV) 미설정");

  const nowSec = Math.floor(now / 1000);
  const header  = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss:   email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud:   "https://oauth2.googleapis.com/token",
    iat:   nowSec,
    exp:   nowSec + 3600,
  })).toString("base64url");

  const sigInput = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(sigInput);
  const sig = signer.sign(privateKey, "base64url");
  const jwt = `${sigInput}.${sig}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${encodeURIComponent(jwt)}`,
    signal:  AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OAuth2 토큰 교환 실패: ${res.status} ${errText.slice(0, 200)}`);
  }

  const data = await res.json() as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("OAuth2 응답에 access_token 없음");

  _cachedToken = data.access_token;
  _tokenExpiry = now + (data.expires_in ?? 3600) * 1000;
  return _cachedToken;
}

// ─── Vertex AI generateContent 엔드포인트 ─────────────────────────
const VERTEX_BASE =
  "https://{location}-aiplatform.googleapis.com/v1/projects/{project}/locations/{location}/publishers/google/models/{model}:generateContent";

// Vertex AI에서 지원하는 모델 우선순위 (Flash 계열 우선 → 안정)
const DEFAULT_VERTEX_MODELS = [
  "gemini-2.0-flash-001",
  "gemini-2.0-flash",
  "gemini-1.5-flash-002",
  "gemini-1.5-flash",
];

function parseVertexText(payload: unknown): string {
  const p = payload as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  for (const c of p?.candidates ?? []) {
    for (const part of c?.content?.parts ?? []) {
      if (part?.text?.trim()) return part.text.trim();
    }
  }
  return "";
}

function getVertexFinishReason(payload: unknown): string {
  const p = payload as {
    candidates?: { finishReason?: string }[];
  };
  return String(p?.candidates?.[0]?.finishReason || "").trim();
}

export interface VertexGenConfig {
  temperature?: number;
  maxOutputTokens?: number;
  topK?: number;
  topP?: number;
}

/**
 * Vertex AI를 통해 Gemini 모델 호출.
 * 자격증명 미설정 또는 모든 모델 실패 시 빈 문자열("")을 반환
 * → 호출 측에서 GEMINI_API_KEY 폴백으로 분기.
 */
export async function callVertexGemini(
  prompt: string,
  genConfig?: VertexGenConfig,
): Promise<string> {
  const saResolved = resolveVertexServiceAccount();
  const inferredProject = inferProjectIdFromServiceAccountEmail(saResolved.email);
  const envProject = (
    process.env.VERTEX_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_PROJECT_ID ||
    ""
  ).trim();
  const project = (
    saResolved.projectFromJson ||
    inferredProject ||
    envProject ||
    ""
  ).trim();
  const location = (process.env.VERTEX_LOCATION   || "us-central1").trim();
  const models   = process.env.VERTEX_MODELS
    ? process.env.VERTEX_MODELS.split(",").map((s) => s.trim()).filter(Boolean)
    : DEFAULT_VERTEX_MODELS;

  if (!project) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Vertex] 프로젝트 ID를 확인할 수 없어 GEMINI_API_KEY 폴백");
    }
    return "";
  }

  if (
    process.env.NODE_ENV !== "production" &&
    envProject &&
    (saResolved.projectFromJson || inferredProject) &&
    envProject !== project
  ) {
    console.warn(`[Vertex] VERTEX_PROJECT_ID(${envProject}) 대신 서비스계정 프로젝트(${project})를 사용합니다.`);
  }

  let token: string;
  try {
    token = await getVertexAccessToken();
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Vertex] 토큰 취득 실패 — GEMINI_API_KEY 폴백:", (e as Error).message);
    }
    return "";
  }

  const cfg = {
    temperature:     genConfig?.temperature     ?? 0.85,
    maxOutputTokens: genConfig?.maxOutputTokens ?? 8192,
    topK:            genConfig?.topK            ?? 40,
    topP:            genConfig?.topP            ?? 0.95,
  };

  for (const model of models) {
    try {
      const url = VERTEX_BASE
        .replace(/{location}/g, location)
        .replace("{project}",   project)
        .replace("{model}",     model);

      const res = await fetch(url, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          contents:         [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: cfg,
        }),
        signal: AbortSignal.timeout(25_000),
      });

      // 인증 만료 → 토큰 캐시 초기화 후 즉시 반환 (재시도 없음)
      if (res.status === 401 || res.status === 403) {
        _cachedToken = "";
        _tokenExpiry = 0;
        if (process.env.NODE_ENV !== "production") {
          const errBody = await res.json().catch(() => ({}));
          console.warn("[Vertex] 인증 오류:", res.status, JSON.stringify(errBody).slice(0, 300));
        }
        return "";
      }

      if (!res.ok) continue; // 다음 모델 시도

      const data = await res.json();
      const finishReason = getVertexFinishReason(data);
      const text = parseVertexText(data);
      if (text) {
        // 출력 토큰 상한으로 잘린 응답은 상위 Gemini 키 폴백으로 넘긴다.
        if (finishReason === "MAX_TOKENS") continue;
        if (process.env.NODE_ENV !== "production") {
          console.log(`[Vertex] 성공 (${model}) — ${text.length}자`);
        }
        return text;
      }
    } catch {
      // 타임아웃 등 → 다음 모델 시도
    }
  }

  return "";
}

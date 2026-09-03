#!/usr/bin/env node
/**
 * 초융합 운세(30,000원)의 **재시도 입력 보존** 계약.
 *
 * 🔴 2026-09-03 사용자 보고: 생성이 멈춰 새로고침한 뒤 [다시 시도] 를 누르면
 *    `FUSION_FORTUNE_GENERATION_FAILED · birth_place_overclaim` 로 또 실패했다. 원인은 모델도
 *    검증기도 아니었다 — 결제 증빙 id 만 저장되고 **그때 보낸 입력은 어디에도 없어서**,
 *    재시도가 초기값 폼으로 payload 를 다시 만들었다. birthPlaceKey 가 비면
 *    `birthPlaces.find(...)` 가 undefined 라 `birthPlace` 가 **조용히 빠지고**, 결제는 같은데
 *    질문만 "출생지 미상"으로 바뀐 요청이 나간다.
 *
 * 그래서 여기서 고정하는 것은 문구가 아니라 **바이트 동일성**이다: 메모리를 통째로 잃은 뒤의
 * 재시도 payload 가 1차 payload 와 완전히 같아야 한다.
 *
 * 순수 정적·인메모리다 — 네트워크도 LLM 도 DB 도 타지 않는다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FUSION_PAID_REQUEST_KEY,
  FUSION_PAID_REQUEST_LEGACY_KEY,
  FUSION_PAID_REQUEST_TTL_MS,
  clearFusionPaidRequest,
  readFusionPaidRequest,
  writeFusionPaidRequest,
} from "../lib/fusion-paid-request-store.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const check = (label, condition, detail = "") => {
  if (condition) return;
  failures.push(detail ? `${label} — ${detail}` : label);
};

/** 브라우저 저장소를 흉내 낸다. 새로고침은 "이 객체만 남기고 나머지 메모리를 버리는 것"이다. */
function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: (key) => { map.delete(key); },
    size: () => map.size,
    raw: () => Object.fromEntries(map),
  };
}

/** 화면이 실제로 만드는 payload 와 같은 모양(FusionFortuneClient.tsx 의 requestBody). */
const FIRST_BODY = {
  birthDate: "1995-04-18",
  birthTime: "08:30",
  birthTimeUnknown: false,
  calendarType: "solar",
  gender: "female",
  nickname: "연이",
  topic: "삶의 전반적인 흐름",
  concern: "이직을 해야 할지 고민입니다.",
  birthPlace: { city: "대한민국 · 서울", country: "KR", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul" },
};
const REQUEST_ID = "fusion-fortune-consultation:1756890000000-ab12cd3";

// ── ① 새로고침을 건너 payload 가 바이트 단위로 살아남는다 ────────────────────────
{
  const local = memoryStorage();
  const session = memoryStorage();
  writeFusionPaidRequest({ requestId: REQUEST_ID, body: FIRST_BODY }, { local, session, now: 1_000_000 });

  // 여기서 "새로고침" — 화면의 ref·state 는 전부 사라지고 저장소만 남는다.
  const restored = readFusionPaidRequest({ local, session, now: 1_000_000 + 60_000 });
  check("restore/exists", Boolean(restored), "새로고침 뒤 저장본을 못 읽었다");
  check("restore/requestId", restored?.requestId === REQUEST_ID, `요청 id 가 다르다: ${restored?.requestId}`);
  check(
    "restore/body-identical",
    JSON.stringify(restored?.body) === JSON.stringify(FIRST_BODY),
    `재시도 payload 가 1차와 다르다:\n  1차: ${JSON.stringify(FIRST_BODY)}\n  재시도: ${JSON.stringify(restored?.body)}`,
  );
  // 🔴 이 한 줄이 사고의 정체다. 나머지가 같아도 여기가 빠지면 출생지 미상 입력이 된다.
  check(
    "restore/birth-place-survives",
    restored?.body?.birthPlace?.city === FIRST_BODY.birthPlace.city
      && restored?.body?.birthPlace?.latitude === FIRST_BODY.birthPlace.latitude
      && restored?.body?.birthPlace?.longitude === FIRST_BODY.birthPlace.longitude
      && restored?.body?.birthPlace?.timezone === FIRST_BODY.birthPlace.timezone,
    `birthPlace 가 유실되거나 달라졌다: ${JSON.stringify(restored?.body?.birthPlace)}`,
  );
}

// ── ② 결제 직후(입력 만들기 전)에 탭이 닫혀도 결제는 살아남는다 ─────────────────
{
  const local = memoryStorage();
  const session = memoryStorage();
  writeFusionPaidRequest({ requestId: REQUEST_ID }, { local, session, now: 1_000_000 });
  const restored = readFusionPaidRequest({ local, session, now: 1_000_000 });
  check("id-only/requestId", restored?.requestId === REQUEST_ID, "id 만 저장한 결제가 사라졌다");
  check("id-only/body-null", restored?.body === null, "입력이 없는데 body 가 채워졌다");
}

// ── ③ 만료된 기록은 남지 않는다 ────────────────────────────────────────────────
{
  const local = memoryStorage();
  const session = memoryStorage();
  writeFusionPaidRequest({ requestId: REQUEST_ID, body: FIRST_BODY }, { local, session, now: 0 });
  const expired = readFusionPaidRequest({ local, session, now: FUSION_PAID_REQUEST_TTL_MS + 1 });
  check("ttl/drops", expired === null, "만료된 결제 기록이 그대로 살아 있다");
  check("ttl/cleans", local.size() === 0, `만료 기록을 지우지 않았다: ${JSON.stringify(local.raw())}`);

  // 경계: TTL 정각은 아직 살아 있어야 한다(하루가 '지나야' 버린다).
  writeFusionPaidRequest({ requestId: REQUEST_ID, body: FIRST_BODY }, { local, session, now: 0 });
  check("ttl/boundary", readFusionPaidRequest({ local, session, now: FUSION_PAID_REQUEST_TTL_MS })?.requestId === REQUEST_ID, "TTL 정각에 이미 버렸다");
}

// ── ④ 손상된 JSON 은 다음 제출을 막지 않는다 ──────────────────────────────────
{
  const local = memoryStorage({ [FUSION_PAID_REQUEST_KEY]: "{not json" });
  const session = memoryStorage();
  check("corrupt/null", readFusionPaidRequest({ local, session, now: 1 }) === null, "손상된 기록을 결제 증빙으로 읽었다");
  check("corrupt/cleans", local.size() === 0, "손상된 기록을 지우지 않았다");
}

// ── ⑤ 구 키(sessionStorage id 문자열)를 1회 흡수한다 ──────────────────────────
{
  const local = memoryStorage();
  const session = memoryStorage({ [FUSION_PAID_REQUEST_LEGACY_KEY]: REQUEST_ID });
  const migrated = readFusionPaidRequest({ local, session, now: 5_000 });
  check("legacy/absorbs", migrated?.requestId === REQUEST_ID, "배포 직전에 결제한 사용자의 증빙을 버렸다");
  check("legacy/removes-old", session.size() === 0, "구 키를 지우지 않아 흡수가 반복된다");
  check("legacy/persists-new", readFusionPaidRequest({ local, session, now: 6_000 })?.requestId === REQUEST_ID, "흡수한 증빙이 새 키에 남지 않았다");
}

// ── ⑥ 결과를 받으면 두 키 모두 사라진다(다음 상담은 새 결제) ──────────────────
{
  const local = memoryStorage();
  const session = memoryStorage({ [FUSION_PAID_REQUEST_LEGACY_KEY]: "old-id" });
  writeFusionPaidRequest({ requestId: REQUEST_ID, body: FIRST_BODY }, { local, session, now: 1 });
  clearFusionPaidRequest({ local, session });
  check("clear/local", local.size() === 0, "소진된 결제 기록이 남았다");
  check("clear/legacy", session.size() === 0, "구 키가 남아 다음 상담이 죽은 id 를 쓴다");
  check("clear/read", readFusionPaidRequest({ local, session, now: 2 }) === null, "지운 뒤에도 증빙이 읽힌다");
}

// ── ⑦ 저장소를 못 쓰는 브라우저에서도 생성이 죽지 않는다 ─────────────────────
{
  const hostile = { getItem() { throw new Error("SecurityError"); }, setItem() { throw new Error("QuotaExceededError"); }, removeItem() { throw new Error("SecurityError"); } };
  let threw = "";
  try {
    writeFusionPaidRequest({ requestId: REQUEST_ID, body: FIRST_BODY }, { local: hostile, session: hostile, now: 1 });
    readFusionPaidRequest({ local: hostile, session: hostile, now: 1 });
    clearFusionPaidRequest({ local: hostile, session: hostile });
  } catch (error) { threw = String(error?.message || error); }
  check("hostile/no-throw", !threw, `시크릿 창에서 예외가 새어 나왔다: ${threw}`);
}

// ── ⑧ 화면이 실제로 저장본을 보내는지 (fail-closed 소스 단언) ─────────────────
// 로직만 맞고 화면이 여전히 폼에서 payload 를 다시 만들면 이 가드는 아무것도 지키지 못한다.
{
  const clientPath = path.join(ROOT, "app/fusion-fortune/FusionFortuneClient.tsx");
  const client = readFileSync(clientPath, "utf8");
  check("client/imports-store", client.includes('from "@/lib/fusion-paid-request-store"'), "화면이 보관소 모듈을 쓰지 않는다 — 저장 로직이 다시 복제됐다");
  check(
    "client/sends-stored-body",
    /const requestBody: FusionRequestBody = paidRequestBodyRef\.current \|\|/.test(client),
    "재시도가 저장본 대신 폼에서 payload 를 다시 만든다 — 2026-09-03 사고의 원인 그대로다",
  );
  check(
    "client/persists-before-post",
    client.indexOf("rememberPaidRequest(requestId, requestBody);") > 0
      && client.indexOf("rememberPaidRequest(requestId, requestBody);") < client.indexOf("/api/fusion-fortune/generate/stream"),
    "입력을 스트림 POST 전에 저장하지 않는다 — 그 사이에 닫힌 탭의 질문이 사라진다",
  );
  check("client/no-legacy-helpers", !client.includes("storePaidRequestId("), "옛 저장 헬퍼가 남아 두 저장소가 갈라진다");
}

if (failures.length) {
  console.error(`[verify-fusion-fortune-retry-payload] FAIL — ${failures.length}건`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("[verify-fusion-fortune-retry-payload] PASS — 새로고침 뒤 재시도 payload 동일 · 결제키 영속화 · 화면 배선 (인메모리, 네트워크·LLM 없음)");

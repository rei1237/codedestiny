/**
 * 스테이징 워커에 **의도적으로 넣지 않는** 시크릿의 정본.
 *
 * 두 소비처가 같은 목록을 봐야 한다:
 *   - scripts/sync-cloudflare-worker-secrets.mjs — 동기화에서 제외한다.
 *   - scripts/env-parity.mjs --remote --target=staging — 없다고 실패시키지 않고 경고만 한다.
 *
 * 🔴 두 곳에 따로 적으면 반드시 어긋난다. 실제로 2026-08-20 에 어긋났다 — 동기화는 결제
 * 자격증명을 뺐는데 패리티 검사는 "프로덕션 필수 키가 없다"며 스테이징 배포를 통째로 막았다.
 * 한쪽만 고치면 다음 사람이 반대쪽을 풀게 되고, 그때 프로덕션 채널키가 스테이징으로 돌아온다.
 */

export function normalizeSecretKey(rawKey) {
  return String(rawKey || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_")
    .toUpperCase();
}

/**
 * 스테이징에서 비워 두는 이유. 비워 두지 않는 키면 빈 문자열을 돌려준다.
 *
 * 계열(prefix)로 막는 것이 목록보다 안전하다 — SECRET_KEYS 에는 같은 값의 별칭이 여러 표기로
 * 들어 있어서(PORTONE_channel · PORTONE_Store · PORTONE_webhookurl …) 이름을 하나씩 적으면
 * 그중 하나가 빠지고, 빠진 그 하나가 프로덕션 채널키다.
 */
export function stagingDeferralReason(key) {
  const name = normalizeSecretKey(key);

  if (/^PORTONE_/.test(name) || /^INI/.test(name) || name === "MID") {
    return "결제는 PortOne 테스트 채널 값으로만 채운다 — 프로덕션 자격증명이 들어가면 실제 카드가 승인된다";
  }
  if (name === "GEMINIF_API_KEY" || name === "ANTHROPIC_API_KEY") {
    return "과금 LLM 키는 스테이징에 넣지 않는다 — 필요할 때만 --only-key 로 넣고 되돌린다";
  }
  if (name === "MONGO_DB_NAME" || name === "MONGO_NAME") {
    return "DB 분리를 덮는다 — resolveMongoDbName 이 이 키를 MONGODB_DB_NAME 보다 먼저 읽는다";
  }
  // 🔴 아래 둘은 '스테이징에서 관리자 로그인을 못 한다'가 아니라 '프로덕션 값을 복제하지
  //    않는다'는 뜻이다. 스테이징 전용 값을 .env.staging.local 에 두고 --only-key 로 넣는다
  //    (--only-key 는 이 제외 목록을 우회한다 — sync-cloudflare-worker-secrets.mjs 의
  //    targetFilteredKeys). 2026-08-30: 이 문구가 'fail-closed 로 둔다' 하나뿐이라
  //    스테이징 관리자 로그인이 영구 차단으로 읽혔고, 원인 추적에 몇 시간이 들었다.
  if (name === "ADMIN_ENTRY_PASSWORD_HASH") {
    return "프로덕션 진입 비밀번호를 복제하지 않는다 — 스테이징 전용 해시를 .env.staging.local 에 두고 --only-key 로 넣는다";
  }
  if (name === "FLOWER_ADMIN_SECRET") {
    return "관리자 토큰 서명 키를 공유하면 스테이징에서 발급한 토큰이 프로덕션에서도 통과한다(페이로드에 환경 표식이 없다) — 스테이징 전용 값을 .env.staging.local 에 두고 --only-key 로 넣는다";
  }

  return "";
}

export function isDeferredOnStaging(key) {
  return stagingDeferralReason(key) !== "";
}

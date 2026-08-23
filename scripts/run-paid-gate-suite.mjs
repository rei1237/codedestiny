#!/usr/bin/env node
/**
 * Paid Flow Gates 스위트 러너 — 결제·인증·운세 가드를 **한 번에 다 돌리고**, 실패를 **귀책별로**
 * 나눠서 보고한다.
 *
 * 🔴 왜 만들었나 (2026-08-16 측정).
 * 이 게이트가 "모든 PR 을 막는" 실제 메커니즘은 플레이크가 아니라 **main 이 빨간불인데 아무도
 * 모르는 상태**였다. 사슬 전체가 기계적으로 재현된다:
 *   ① PR #678(`docs: split CLAUDE.md…`)은 이 워크플로를 아예 깨우지 않았다 — 트리거 `paths:` 에
 *      `CLAUDE.md`·`docs/**` 가 없다. 2026-08-15 15:29Z 머지.
 *   ② 그런데 `verify:nakshatra-premium` 은 `CLAUDE.md` 본문 문장을 단언한다. 문장이
 *      `docs/context/payment-gating.md` 로 옮겨가면서 **머지 직후부터 main 이 빨간불**이 됐다.
 *   ③ 80분 뒤 무관한 두 브랜치(`perf/inp-tap-fixed-cost`·`fix/pg-window-idempotency-scope`)가
 *      같은 스텝에서 동시에 죽었다. 두 작성자 모두 자기 변경을 의심하며 시간을 태웠다.
 * 트리거를 넓히는 것은 답이 아니다 — 가드가 읽는 파일 전체를 `paths:` 에 넣으면 2026-08-08 에
 * 일부러 좁혀 둔 트리거가 다시 "모든 변경"이 된다. 그래서 **귀책을 실행으로 판정**한다.
 *
 * 무엇이 달라지나:
 *   1) **첫 실패에서 멈추지 않는다.** 예전에는 48개 스텝이 순차라 깨진 가드가 2개면 왕복이 2번
 *      (회당 약 6분)이었다. 이제 한 번에 전부 보인다.
 *   2) **병렬 실행.** 2026-08-15 실측(run 31892017330)으로 스위트 304초 중 상위 5개가 206초였다.
 *      느린 것부터 채우는 풀로 벽시계를 줄인다.
 *   3) **귀책 판정.** 실패한 가드만 merge-base 워크트리에서 다시 돌린다. 거기서도 실패하면
 *      `PRE-EXISTING` — 이 PR 의 잘못이 아니므로 **경고로 낮추고 통과**시키되, 로그와 Job Summary
 *      에 "main 이 이미 빨간불" 을 크게 남긴다. base 가 통과했는데 head 가 실패하면 `NEW` 이고
 *      그건 그대로 실패다.
 *   4) **base 를 못 구하면 전부 NEW 로 본다**(fail-closed). "모른다"를 "안전하다"로 읽지 않는다.
 *      main push 런에는 base 가 없으므로 자동으로 이 경로를 탄다 — 그게 main 건강 신호다.
 *
 * 🔴 목록은 여기 한 벌뿐이다. `npm run <name>` 형태로 적는 이유는 `verify:guard-wiring` 이
 *    워크플로 → 이 파일 → 이름 순으로 간선을 따라가 배선을 계산하기 때문이다. 이름을 벗기면
 *    48개 가드가 통째로 "미배선"으로 떨어진다.
 *
 * 사용:
 *   node scripts/run-paid-gate-suite.mjs [--base <sha>] [--jobs N] [--verbose] [--only <substr>]
 */

import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const BASE_WORKTREE = path.join(ROOT, ".paid-gate-base");

/**
 * 스위트. `heavy` 는 2026-08-15 실측(run 31892017330)에서 8초를 넘긴 항목이고, 스케줄링 힌트일
 * 뿐 판정에는 쓰이지 않는다 — 느린 것을 먼저 띄워야 꼬리가 짧아진다.
 */
const SUITE = [
  { run: "npm test", heavy: true, why: "예전에는 파일 6개만 손으로 지목해 돌렸다. 나머지 48개 테스트 파일은 어디서도 실행되지 않았고, ESM 목이 낡아 스위트가 통째로 죽어도(로그인 열거·무차별 대입, 리프레시 재사용 탐지, 구독 자동갱신 동시성) 아무도 몰랐다." },
  { run: "npm run verify:profile-current-switch", heavy: true, why: "카드 전환이 한 번에 나가고(중복 PATCH 금지), 일시 장애에 되돌아가지 않으며, 401 은 세션 갱신 후 1회만 재시도하는지. 되돌림 회귀는 '카드를 눌러도 이전 프로필로 돌아간다'로 나타났다." },
  { run: "npm run verify:profile-server-first", heavy: true, why: "정적 마커로는 '캡처 리스너 둘이 같은 클릭을 각각 처리한다'를 못 잡는다. 실제 크롬으로 클릭을 쏴서 토글 호출 횟수를 센다." },
  { run: "npm run verify:profile-card-add-entry", heavy: true, why: "카드 보유자의 '추가' 진입점이 두 번 사라진 적이 있다(fd25c7cd9, #248). 마커로는 안 잡혀 jsdom 으로 실제 버튼 라벨과 편집 플래그 전이를 확인한다." },
  { run: "npm run verify:portone-single-payment", heavy: true, why: "PortOne 단건결제 회귀." },
  { run: "npm run verify:paid-gate-profile-scope", heavy: true, why: "🔴 명시 profileId 가 빠지면 서버가 destinyProfilesCurrentId 로 폴백해 **옛 카드에 결제**된다('이용권 있는데 결제창', '결제했는데 다른 카드에 해제'). 실제로 게이트를 열어 요청 body 를 본다." },
  { run: "npm run verify:checkout-pass-card", heavy: true, why: "문자열 마커로는 '이용권 카드가 있다'까지만 본다. 2026-08 정책 전환으로 그 카드가 **이용권 검사 지점**이 됐으므로, jsdom 에서 실제로 눌러 두 갈래(커버→무료 통과 / 미커버→상점 인계)가 갈라지는지와 앱에서 /points 로 새지 않는지를 실행으로 확인한다." },
  { run: "npm run verify:pg-window-no-conflict", heavy: true, why: "🔴 App Router 유료 기능 전체는 셸 코어가 아니라 js/destiny-profile.js 코어를 탄다. 셸만 고친 수정이 이 경로에 도달하지 않아 '결제창이 안 뜬다'가 반복됐다(#467·#471·#497). jsdom 에서 그 코어를 실제로 돌려 시도별 멱등키·재클릭·SDK 동시성·409/422 재시도를 확인한다." },
  { run: "npm run verify:profile-loading-stability", heavy: true, why: "이용권 갱신이 스스로 쏘는 cd:auth-changed 되울림에 프로필 카드가 로딩으로 되돌아가지 않는지. verify:auth-event-loop 가 '필터가 소스에 있는가'를 본다면 이쪽은 '그래서 실제로 카드가 안 흔들리는가'를 jsdom 에서 실행해 본다." },

  { run: "npm run verify:security-hardening", why: "보안 하드닝 회귀 가드." },
  { run: "npm run verify:auth-event-loop", why: "cd:auth-changed 재검증 증폭 루프 재발 방지 — source 필터 하나만 빠져도 이용권 확인마다 캐시가 전멸하고 홈이 다시 그려진다(증상이 '가끔 느리다'로만 보인다)." },
  { run: "npm run verify:auth-changed-coverage", why: "위 가드는 '손으로 쓴 목록의 리스너에 필터가 있는가'를 본다. 목록에 없는 파일에 리스너가 새로 생기면 못 본다 — 그래서 사고가 두 번 났다(G-3 셸 미러, G-7 프로필 카드 무한 로딩). 이쪽은 소스에서 리스너를 전수 발견해 전부 filtered/benign 으로 분류돼 있는지 본다." },
  { run: "npm run verify:auth-session-stability", why: "형제 가드인데 배선이 빠져 있어서, 하네스가 깨진 채로 방치됐다(auth-client 가 새 모듈을 import 하자 import 매핑 표에 없어 스크립트가 그냥 던졌다)." },
  { run: "npm run verify:auth-hint-single-source", why: "로그인 힌트(hasClientAuthHint 류) 판정이 js/core/auth-hint.js 단일 정본에서 다시 사본으로 갈라지는 것을 막는다 — 힌트가 잘못 false 로 갈라지면 일부 소비처가 서버를 안 부르고 게스트 응답을 합성해, 로그인된 사용자가 로그아웃된 것처럼 보이는 장애가 난 적이 있다." },
  { run: "npm run verify:auth-p0p1", why: "🔴 handleMe 가 쿠키를 지우지 않는다는 단언은 jest 커버가 아예 없어서, 여기 없으면 '로그아웃 → 재로그인 → 즉시 튕김' 의 절반이 CI 검증 0 이 된다." },
  { run: "npm run verify:paid-feature-billing-policy", why: "유료 기능 과금 정책." },
  { run: "npm run verify:ai-prompt-billing-policy", why: "AI 프롬프트 과금 정책." },
  { run: "npm run verify:palm-flow", why: "손금: 프로덕션 빌드가 output:'export' 라 app/api 라우트가 통째로 빠진다는 사실 때문에 Gemini Vision 이 로컬에서만 돌고 실제 사용자는 정적 템플릿을 받고 있었다(2026-07 발견)." },
  { run: "npm run verify:payment-choice-parity", why: "결제창 렌더러 3종의 정합성 — TTL 이 5분/15분으로 갈라진 채 배포된 흉터가 이 가드의 출발점이다." },
  { run: "npm run verify:payment-copy-dictionary", why: "결제 문구가 코드 폴백과 사전 사이에서 갈라지는지. cdTranslate 는 키가 없으면 폴백이 아니라 'Translation pending' 을 내므로 한국어만 멀쩡하고 나머지 11개 로케일이 깨진다 — 2026-08-20 전수 조사에서 21건이 나왔고 그중 둘은 **PG창 통과 뒤의 결제 성공 오버레이**였다." },
  { run: "npm run verify:entry-fanout", why: "홈 진입 팬아웃 계약. 워밍이 채우던 것이 **이용권 스냅샷**이라, 이 계약이 깨지면 결제창 fast-path 와 이용권 판정이 함께 흔들린다. auth/me 의 degraded 응답을 스냅샷에 쓰면 tier:'free' 가 굳어 **이용권 보유자에게 결제창이 뜬다** — 돈 문제다." },
  { run: "npm run verify:pass-recovery-path", why: "이용권 구제 경로의 회귀 방지. 과거 두 사고가 모두 '핸들러·소비자는 남고 진입점만 사라진' 형태라 이름 grep 으로는 정상으로 보였다." },
  { run: "npm run verify:saju-fun-content-gate", why: "재밌는 사주 콘텐츠 타일: 상세 팝업이 결제보다 먼저 뜨는지 + 해금 후 CTA 가 카드를 열었다 닫지 않는지(이중 처리). 여기서는 6미러 불변식만 본다." },
  { run: "npm run verify:profile-fresh-signup", why: "가입 직후 프로필 카드가 /api/profile 왕복을 기다리지 않고 즉시 최종 상태로 뜨는지. 힌트를 쓰는 쪽(AuthShell.tsx)과 읽는 쪽(js/destiny-profile.js)이 키·형식으로만 이어져 있어서 한쪽만 바뀌면 힌트가 조용히 무효가 된다." },
  { run: "npm run verify:human-design", why: "휴먼 디자인은 결정론 계산이 곧 상품이다(회당 10,000원). 만다라 배열/앵커가 한 칸 어긋나거나 Design 순간을 '88일 차감'으로 근사하면 결과는 여전히 '그럴듯하게' 나오고 테스트도 통과한다 — 그래서 구조 불변식(프로그래밍 파트너 32쌍·합 360°·간극 0)과 금지 구현 패턴, 그리고 외부 계산기 기대값 기입 여부를 fail-closed 로 강제한다." },
  { run: "npm run verify:human-design-ai", why: "🔴 AI 해석의 계약은 '계산 결과만 해석한다' 하나다. 프롬프트에 출생 데이터가 한 줄이라도 새면 모델이 자기가 다시 계산해 확정 타입·프로파일과 다른 값을 쓰기 시작하는데, 결과는 여전히 그럴듯해서 아무도 모른다. 폴백 문턱(fallbackMinChars)이 빠지면 8% 분량이 정상 결제 결과로 나가고, 사후 검산이 빠지면 모순된 해석이 저장된다. LLM 실호출 0회로 이 셋을 본다." },
  { run: "npm run verify:human-design-report", why: "🔴 휴먼 디자인 프리미엄 리포트(회당 10,000원)는 18유닛을 여러 요청에 걸쳐 만든다. 계약이 어긋나는 방식이 전부 조용하다 — 프롬프트에 출생 데이터가 새면 모델이 다시 계산하고, 폴백 문턱이 빠지면 8% 분량이 정상 결제 결과가 되며, 락이 빠지면 이중 클릭이 LLM 팬아웃을 두 배로 만들고, /generate 에 결제 검증을 넣으면 결제한 사용자가 중간에 막힌다. 분량·토큰·타임아웃 예산의 부등식과 사후 검산의 오탐 여부까지 LLM 실호출 0회로 본다." },
  { run: "npm run verify:oracle-consultation", why: "🔴 타로 오라클 상담(회당 5,000원)은 2026-08-21 에 로컬 템플릿 빌더에서 Gemini 실호출로 바뀌면서 과금 유형이 영구 해금 → 회당으로 뒤집힌 기능이다. 생성이 실패해도 프롬프트 원문 폴백이 남아 화면은 정상으로 보이므로, 실패가 결제된 채로 조용히 지나간다. HTTP 500 재시도 상한·깨진 JSON 거부·키 부재 시 즉시 실패(재시도 0)를 LLM 실호출 0회로 고정한다." },
  { run: "npm run verify:paid-gate-ui", why: "'이용권 선검사 → 미커버 시에만 결제창' 순서를 소스 순서로 못박는다." },
  { run: "npm run verify:master-love-codex-flow", why: "마스터 러브 코덱스 플로우." },
  { run: "npm run verify:master-love-codex-budget", why: "배치 시간 예산 — 없으면 /generate 가 엣지 100초 컷에 잘려 클라이언트가 JSON 대신 게이트웨이 HTML 을 받는다. LLM 을 호출하지 않는다(순수 함수·상수만 검증)." },
  { run: "npm run verify:nakshatra-flow", why: "27수 계산 결정성(크로스워크 앵커·파다·다샤)." },
  { run: "npm run verify:nakshatra-ai-flow", why: "심화 상담 계약(3덱 21섹션·분량 하한·배치 생성 락/재개·폴백 짧은 응답 차단)." },
  { run: "npm run verify:nakshatra-premium", why: "영구 해금 리포트 2종 — 결정론 본문의 분량·무결성과 결제 계약(해금 상태만 읽음·paymentMode 미지정·확인 실패를 미구매로 취급 금지)." },
  { run: "npm run verify:master-love-codex-compat", why: "궁합 판정이 결정론을 잃거나 축 점수가 한쪽으로 쏠리면 20장이 모든 짝에게 같은 말을 한다." },
  { run: "npm run verify:payment-freeze", why: "🔴 재작성 기간 한정 가드. worker/payments/ 로 결제를 옮기는 동안 구현이 두 벌 존재하는데, 가장 비싼 사고는 충돌이 아니라 **조용한 분기**다 — 구 코드에만 얹은 정책은 컷오버 순간 소리 없이 사라진다. 구 결제 코드가 전부 삭제되면 이 항목도 함께 지운다." },
  { run: "npm run verify:billing-pass-policy", why: "이용권 정책." },
  { run: "npm run verify:checkout-auth-recovery", why: "결제 POST(checkout·confirm)의 401 리프레시 복구 계약 — fetchJsonWithAuth 본문을 실제로 구동해 같은 키·같은 body 1회 재전송(이중 주문 금지)과 coin-gate 제외, 확정 401 의 로그인 모달 종단, PR #470 단일비행 바이패스 회귀까지 실행으로 확인한다." },
  { run: "npm run verify:direct-confirm-pending-recovery", why: "승인 후 복구 계약 — 복귀 티켓 수명과 202 PENDING_CONFIRMATION 이 '결제가 완료되지 않았어요'(재결제 유도)로 세탁되지 않는 분기를 브레이스 균형 슬라이스로 7셸+dp 에서 고정한다." },
  { run: "npm run verify:paid-feature-common-flow", why: "유료 기능 공통 플로우." },
  { run: "npm run verify:paid-gate-price-coverage", why: "결제창 '0원' 회귀 방지. 9bc21abc6 이 호출부 3곳에서 cost 를 지웠는데 가드 36개 중 하나도 울지 않았다 — 전부 '공통 게이트를 쓰는가'만 보고 '그 게이트가 가격을 푸는가'는 아무도 안 봤다. 결과는 단건 0원 + 월정석 카드 영구 비활성이었다. 이 가드는 호출부를 전수 발견해 출하되는 해석기로 실제 실행해 본다." },
  { run: "npm run verify:static-paid-gate-failsafe", why: "정적 셸 유료 게이트 페일세이프." },
  { run: "npm run verify:saju-unlock-entitlement-regression", why: "배선이 없던 시절 결제창 문구가 재작성된 뒤 깨진 채로 방치됐고, 아무도 알아채지 못했다." },
  { run: "npm run verify:profile-card-action-policy", why: "프로필 카드 액션 정책." },
  { run: "npm run verify:app-store-billing-policy", why: "앱이 결제창을 건너뛰고 Play 로 직행하면 월정석이 도달 불가해진다." },
  { run: "npm run verify:payment-concurrency-guards", why: "결제 동시성 가드." },
  { run: "npm run verify:monthly-credit-lots", why: "월정석 원장." },
  { run: "npm run verify:worker-security-guards", why: "워커 보안 가드." },
  { run: "npm run verify:deploy-base-guard", why: "배포 스테일 베이스 가드가 무력화되면 증상이 '배포가 그냥 잘 됨'이라 아무도 모르고, 다음 사고는 남의 워커 커밋이 프로덕션에서 사라지는 형태로 온다." },
  { run: "npm run verify:no-secret-leak", why: "비밀정보 노출." },
  { run: "npm run verify:llm-token-usage", why: "AI 상담 가드는 어느 워크플로에도 걸려 있지 않아 조용히 낡았다 — 결제창 라벨이 'AI 상담' → '전문가 상담' 으로 바뀐 뒤 ziwei·karma 가드가 오래 빨간불이었는데 CI 가 안 돌리니 아무도 몰랐다." },
  { run: "npm run verify:llm-generation-resilience", why: "LLM 생성 내성." },
  { run: "npm run verify:workers-ai-fallback", why: "Workers AI 폴백 체인." },
  { run: "npm run verify:analysis-basis-contract", why: "분석 근거 계약." },
  { run: "npm run verify:astrology-sectioned", why: "점성술 섹션 생성." },
  { run: "npm run verify:ai-consultation-flows", why: "목록 정본은 package.json 의 verify:ai-consultation-flows 하나다. 여기에 다시 늘어놓으면 배포 경로(deploy:critical)와 CI 가 서로 다른 목록을 갖게 되고, 그 드리프트가 곧 'CI 에서만 터지는 게이트'가 된다." },

  // verify:all-paid-services-payment-flow 는 여기 넣지 않는다 — 코드 가드가 아니라 MONGO_URI
  // 실환경을 요구하는 라이브 점검이라, 시크릿 없는 PR 러너에서는 항상 실패한다.
];

// ─────────────────────────────────────────────────────────────── 실행 도구

function arg(name, fallback = "") {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const hasFlag = (name) => process.argv.includes(name);

function git(args, options = {}) {
  // stdio:"ignore" 를 주면 execFileSync 가 null 을 돌려준다 — 그대로 .trim() 하면 러너가 죽고,
  // 그 죽음이 "base 를 못 구했다"로 접혀 귀책 판정이 통째로 사라진다.
  const out = execFileSync("git", args, { encoding: "utf8", cwd: ROOT, ...options });
  return String(out ?? "").trim();
}

/** 한 항목을 돌리고 { code, output, ms } 를 돌려준다. 출력은 모아 두었다가 필요할 때만 찍는다. */
function runEntry(entry, cwd) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(entry.run, {
      cwd,
      shell: true,
      // 출력을 모아 두었다가 필요할 때만 찍으므로 ANSI 색은 잡음이 된다.
      env: { ...process.env, FORCE_COLOR: "0" },
    });
    let output = "";
    const collect = (chunk) => { output += chunk; };
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    child.on("error", (error) => {
      resolve({ code: 1, output: `${output}\n[runner] spawn 실패: ${error.message}`, ms: Date.now() - started });
    });
    child.on("close", (code) => {
      resolve({ code: code ?? 1, output, ms: Date.now() - started });
    });
  });
}

/** 느린 것부터 채우는 고정폭 풀. 항목 하나가 끝나면 다음 항목이 즉시 그 자리에 들어간다. */
async function runPool(entries, jobs, cwd, onDone) {
  const queue = [...entries].sort((a, b) => Number(Boolean(b.heavy)) - Number(Boolean(a.heavy)));
  const results = new Map();
  let cursor = 0;
  async function worker() {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= queue.length) return;
      const entry = queue[index];
      const result = await runEntry(entry, cwd);
      results.set(entry.run, result);
      if (onDone) onDone(entry, result);
    }
  }
  await Promise.all(Array.from({ length: Math.min(jobs, queue.length) }, worker));
  return results;
}

// ─────────────────────────────────────────────────────────────── 귀책 판정

/**
 * merge-base 를 워크트리로 펼친다. 실패하면 null — 그때는 모든 실패를 NEW 로 본다(fail-closed).
 *
 * 워크트리를 **레포 안에** 두는 이유: 가드들이 jsdom·esbuild 를 import 하는데, Node 는 스크립트
 * 위치에서 위로 올라가며 node_modules 를 찾는다. 그래도 `npm run` 이 PATH 에 얹는 `.bin` 은
 * 안 잡히므로 심볼릭 링크를 함께 건다(jest 가 여기에 있다).
 */
function prepareBaseWorktree(baseRef) {
  let sha;
  try {
    sha = git(["merge-base", baseRef, "HEAD"]);
  } catch {
    try { sha = git(["rev-parse", "--verify", `${baseRef}^{commit}`]); }
    catch { return null; }
  }
  try {
    fs.rmSync(BASE_WORKTREE, { recursive: true, force: true });
    git(["worktree", "prune"]);
    git(["worktree", "add", "--detach", BASE_WORKTREE, sha], { stdio: "ignore" });
    const link = path.join(BASE_WORKTREE, "node_modules");
    if (!fs.existsSync(link)) {
      fs.symlinkSync(path.join(ROOT, "node_modules"), link, process.platform === "win32" ? "junction" : "dir");
    }
    return { dir: BASE_WORKTREE, sha };
  } catch (error) {
    console.log(`[paid-gate-suite] base 워크트리를 만들지 못했다: ${error.message}`);
    return null;
  }
}

function cleanupBaseWorktree() {
  try { git(["worktree", "remove", "--force", BASE_WORKTREE], { stdio: "ignore" }); } catch { /* 아래에서 지운다 */ }
  try { fs.rmSync(BASE_WORKTREE, { recursive: true, force: true }); } catch { /* 남아도 다음 런이 지운다 */ }
  try { git(["worktree", "prune"]); } catch { /* 무시 */ }
}

// ─────────────────────────────────────────────────────────────── 보고

const gh = {
  group: (title) => (process.env.GITHUB_ACTIONS ? console.log(`::group::${title}`) : console.log(`\n──── ${title}`)),
  endGroup: () => (process.env.GITHUB_ACTIONS ? console.log("::endgroup::") : undefined),
  error: (message) => console.log(process.env.GITHUB_ACTIONS ? `::error::${message}` : `ERROR: ${message}`),
  warning: (message) => console.log(process.env.GITHUB_ACTIONS ? `::warning::${message}` : `WARN: ${message}`),
};

function writeSummary(lines) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) return;
  try { fs.appendFileSync(file, `${lines.join("\n")}\n`); } catch { /* 요약 실패가 게이트를 좌우하지는 않는다 */ }
}

const seconds = (ms) => `${(ms / 1000).toFixed(1)}s`;

// ─────────────────────────────────────────────────────────────── 본체

async function main() {
  const only = arg("--only");
  const entries = only ? SUITE.filter((e) => e.run.includes(only)) : SUITE;
  if (!entries.length) {
    console.error(`[paid-gate-suite] --only ${only} 에 걸리는 항목이 없다`);
    process.exit(1);
  }
  const requested = Number(arg("--jobs", ""));
  const jobs = Number.isFinite(requested) && requested >= 1
    ? Math.floor(requested)
    : Math.max(2, Math.min(4, os.availableParallelism?.() ?? os.cpus().length));
  const verbose = hasFlag("--verbose");
  const baseRef = arg("--base");

  console.log(`[paid-gate-suite] ${entries.length}개 항목 · 동시 실행 ${jobs}`);
  const wallStarted = Date.now();

  const results = await runPool(entries, jobs, ROOT, (entry, result) => {
    const mark = result.code === 0 ? "ok  " : "FAIL";
    console.log(`  ${mark} ${entry.run} (${seconds(result.ms)})`);
    if (verbose && result.output.trim()) {
      gh.group(`출력: ${entry.run}`);
      console.log(result.output.trimEnd());
      gh.endGroup();
    }
  });

  const failed = entries.filter((entry) => results.get(entry.run).code !== 0);
  console.log(`\n[paid-gate-suite] 벽시계 ${seconds(Date.now() - wallStarted)} · 통과 ${entries.length - failed.length} / 실패 ${failed.length}`);

  if (!failed.length) {
    writeSummary([`### Paid Flow Gates — 전부 통과 (${entries.length}개, ${seconds(Date.now() - wallStarted)})`]);
    return 0;
  }

  for (const entry of failed) {
    gh.group(`실패 출력: ${entry.run}`);
    console.log(results.get(entry.run).output.trimEnd());
    gh.endGroup();
  }

  // ── 귀책 판정: 실패한 것만 base 에서 다시 돌린다.
  let base = null;
  if (baseRef) base = prepareBaseWorktree(baseRef);
  const preExisting = [];
  const introduced = [];

  if (!base) {
    if (baseRef) console.log("[paid-gate-suite] base 를 펼치지 못해 귀책 판정을 건너뛴다 — 전부 이 PR 책임으로 본다(fail-closed)");
    else console.log("[paid-gate-suite] --base 가 없다 — 전부 이 변경 책임으로 본다(fail-closed)");
    introduced.push(...failed);
  } else {
    console.log(`\n[paid-gate-suite] 실패 ${failed.length}개를 merge-base(${base.sha.slice(0, 9)})에서 재실행해 귀책을 가린다`);
    try {
      const baseResults = await runPool(failed, jobs, base.dir, (entry, result) => {
        console.log(`  base ${result.code === 0 ? "통과" : "실패"} ${entry.run} (${seconds(result.ms)})`);
      });
      for (const entry of failed) {
        (baseResults.get(entry.run).code !== 0 ? preExisting : introduced).push(entry);
      }
      for (const entry of preExisting) {
        gh.group(`base 실패 출력: ${entry.run}`);
        console.log(baseResults.get(entry.run).output.trimEnd());
        gh.endGroup();
      }
    } finally {
      cleanupBaseWorktree();
    }
  }

  const summary = ["### Paid Flow Gates"];
  if (introduced.length) {
    summary.push(`**이 변경이 깨뜨린 가드 ${introduced.length}개**`, ...introduced.map((e) => `- \`${e.run}\``));
    for (const entry of introduced) gh.error(`${entry.run} — 이 변경이 깨뜨렸다(merge-base 에서는 통과)`);
  }
  if (preExisting.length) {
    summary.push(
      `**main 이 이미 빨간불인 가드 ${preExisting.length}개 (이 PR 책임 아님)**`,
      ...preExisting.map((e) => `- \`${e.run}\``),
      "",
      "이 항목들은 merge-base 에서도 실패한다. 이 PR 을 고쳐도 초록불이 되지 않으니 **별도 PR 로 고쳐야 한다.**",
    );
    for (const entry of preExisting) gh.warning(`${entry.run} — merge-base 에서도 실패한다. main 이 이미 빨간불이며 이 PR 책임이 아니다.`);
  }
  writeSummary(summary);

  if (introduced.length) {
    console.log(`\n[paid-gate-suite] FAIL — 이 변경이 깨뜨린 가드 ${introduced.length}개` + (preExisting.length ? ` (그 밖에 main 귀책 ${preExisting.length}개)` : ""));
    return 1;
  }
  console.log(`\n[paid-gate-suite] PASS(경고) — 실패 ${preExisting.length}개는 전부 merge-base 에서도 실패한다. main 을 고치는 별도 PR 이 필요하다.`);
  return 0;
}

// process.exit() 로 끊으면 파이프에 남은 출력이 잘릴 수 있다 — 실패 로그가 잘리면 이 러너의
// 존재 이유가 사라지므로 exitCode 만 세우고 자연 종료를 기다린다.
main().then(
  (code) => { process.exitCode = code; },
  (error) => {
    console.error(`[paid-gate-suite] 러너가 죽었다: ${error?.stack || error}`);
    cleanupBaseWorktree();
    process.exitCode = 1;
  },
);

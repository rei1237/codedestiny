import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

/* 절대경로를 박아두면 worktree 에서 돌려도 메인 트리 파일을 검사해 통과/실패가 거짓이 된다. */
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..").replace(/\\/g, "/");

const dom = new JSDOM(`<!doctype html><html><head></head><body>
  <div id="dpMasterCard"></div>
</body></html>`, { url: "https://code-destiny.com/", runScripts: "outside-only" });

const { window } = dom;

// localStorage 스텁 (jsdom 기본 구현이 있지만 명시적으로 초기화)
const mem = new Map();
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: {
    get length() { return mem.size; },
    key: (i) => Array.from(mem.keys())[i] ?? null,
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { mem.set(String(k), String(v)); },
    removeItem: (k) => { mem.delete(k); },
    clear: () => mem.clear(),
  },
});

window.fetch = () => Promise.reject(new Error("offline in harness"));
// jsdom 은 pretendToBeVisual 없이는 rAF 를 안 준다. 이 파일의 토스트·연출이 쓰는 API 라 스텁이 필요하다.
window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
window.cancelAnimationFrame = (id) => clearTimeout(id);

const source = readFileSync(`${root}/js/destiny-profile.js`, "utf8");
window.eval(source);

const CDLevel = window.CDLevel;
assert.ok(CDLevel, "window.CDLevel 미노출");

console.log("=== 프로필 카드 레벨 시스템 스모크 ===");

// [1] 레벨 곡선이 서버 공식 min(200 + 100*(n-1), 1500) 과 일치하는가
assert.equal(CDLevel.expToNext(1), 200);
assert.equal(CDLevel.expToNext(2), 300);
assert.equal(CDLevel.expToNext(13), 1400);
assert.equal(CDLevel.expToNext(14), 1500, "14레벨부터는 상한 1500 고정");
assert.equal(CDLevel.expToNext(98), 1500);
assert.equal(CDLevel.levelState(0).currentLevel, 1);
assert.equal(CDLevel.levelState(199).currentLevel, 1);
assert.equal(CDLevel.levelState(200).currentLevel, 2);
assert.equal(CDLevel.levelState(499).currentLevel, 2);
assert.equal(CDLevel.levelState(500).currentLevel, 3);
const s = CDLevel.levelState(560);
assert.equal(s.currentLevel, 3);
assert.equal(s.currentLevelExp, 60);
assert.equal(s.nextLevelExp, 400);

// 사용자와 약속한 두 지점: Lv.5 는 2주치, Lv.99 는 만렙
assert.equal(CDLevel.minExpForLevel(5), 1400, "Lv.5 누적은 1,400 EXP(무료 일일 90 기준 약 2주)");
assert.equal(CDLevel.minExpForLevel(99), 137900, "Lv.99 누적은 137,900 EXP");
// 만렙을 넘겨도 레벨이 더 오르지 않는다
assert.equal(CDLevel.levelState(999999).currentLevel, 99, "만렙은 99에서 멈춘다");
console.log("[1] 레벨 곡선 서버 일치 + 만렙 상한 OK");

// [2] minExpForLevel 역함수 정합
for (let lv = 1; lv <= 12; lv += 1) {
  assert.equal(CDLevel.levelState(CDLevel.minExpForLevel(lv)).currentLevel, lv, `minExpForLevel(${lv})`);
}
console.log("[2] 레벨 보존 환산(minExpForLevel) OK");

// [3] 출석은 하루 1회만 지급된다
const today = CDLevel.kstDate(0);
const first = CDLevel.award("checkin", today);
assert.equal(first.changed, true, "첫 출석은 지급돼야 함");
assert.equal(first.gainedExp, 20);
const second = CDLevel.award("checkin", today);
assert.equal(second.changed, false, "같은 날 재출석은 중복 지급되면 안 됨");
assert.equal(CDLevel.snapshot().totalExp, 20);
assert.equal(CDLevel.snapshot().streakDays, 1);
console.log("[3] 출석 하루 1회 멱등 OK");

// [4] 퀘스트는 하루 3개까지, 같은 퀘스트 중복 불가
const quests = CDLevel.snapshot().quests;
assert.equal(quests.length, 3, "오늘의 퀘스트는 3개");
assert.equal(CDLevel.award("quest", quests[0].id).changed, true);
assert.equal(CDLevel.award("quest", quests[0].id).changed, false, "같은 퀘스트 중복 지급 금지");
assert.equal(CDLevel.award("quest", quests[1].id).changed, true);
assert.equal(CDLevel.award("quest", quests[2].id).changed, true);
assert.equal(CDLevel.award("quest", "extra-quest").changed, false, "하루 3개 한도 초과 금지");
assert.equal(CDLevel.snapshot().totalExp, 20 + 15 * 3);
console.log("[4] 퀘스트 한도/중복 방지 OK");

// [5] 알 수 없는 종류는 지급되지 않는다
assert.equal(CDLevel.award("hack", "x").changed, false);
assert.equal(CDLevel.snapshot().totalExp, 65);
console.log("[5] 화이트리스트 밖 종류 거부 OK");

// [6] 퀘스트가 날짜마다 실제로 바뀌는가.
// 사주 RPG가 하드코딩 preview 3종을 영구히 돌려주던 P0의 재발 방지선이다.
const seen = new Set();
const realNow = window.Date.now;
const base = realNow();
for (let d = 0; d < 10; d += 1) {
  window.Date.now = () => base + d * 24 * 60 * 60 * 1000;
  seen.add(CDLevel.snapshot().quests.map((q) => q.id).join(","));
}
window.Date.now = realNow;
assert.ok(seen.size >= 5, `날짜가 바뀌어도 퀘스트가 거의 고정됨 (10일 중 고유 조합 ${seen.size}개)`);
console.log(`[6] 날짜별 퀘스트 변화 OK (10일 중 고유 조합 ${seen.size}개)`);

// [7] 새로고침(스토어 재파싱) 후에도 진행이 유지되는가
const raw = mem.get("cd_level_v1");
assert.ok(raw, "cd_level_v1 저장 안 됨");
const parsed = JSON.parse(raw);
assert.equal(parsed.totalExp, 65);
assert.equal(parsed.streakDays, 1);
console.log("[7] localStorage 영속 OK");

// [8] 카드 UI가 접근성 속성을 갖춘 채로 배선돼 있는가
for (const marker of [
  "var DP_LEVEL_MARKER = 'profile-card-level-v20260721'",
  "data-cd-level-marker=",
  'role="progressbar"',
  "aria-valuenow=",
  'aria-controls="dpLvlQuests"',
  "aria-pressed=",
  "prefers-reduced-motion",
  "_dpBuildLevelStrip()",
  "_dpBootLevelDaily()",
]) {
  assert.ok(source.includes(marker), `프로필 카드 레벨 UI 마커 누락 -> ${marker}`);
}
// 진행바는 레이아웃을 다시 잡는 width가 아니라 transform으로 채워야 한다
assert.ok(source.includes("transform:scaleX("), "EXP 바가 transform 기반이 아님");
console.log("[8] 카드 UI 마커·접근성 배선 OK");

// [9] 클라이언트 낙관적 지급값이 서버 화이트리스트와 어긋나지 않는가
const workerSource = readFileSync(`${root}/worker/routes/rpg.js`, "utf8");
assert.ok(workerSource.includes('const ACCOUNT_PROFILE_SCOPE = "__account__";'), "계정 스코프 상수 누락");
assert.ok(workerSource.includes('path === "/award"'), "/api/rpg/award 라우트 누락");
assert.ok(workerSource.includes('path === "/adopt"'), "/api/rpg/adopt 라우트 누락");
// 클라이언트가 스스로 신고할 수 있는 종류만 양쪽 값이 같아야 한다.
for (const [kind, exp, limit] of [["checkin", 20, 1], ["quest", 15, 3], ["paid", 30, 3]]) {
  const serverRule = new RegExp(`${kind}:\\s*\\{\\s*exp:\\s*${exp},\\s*dailyLimit:\\s*${limit}`);
  assert.match(workerSource, serverRule, `서버 AWARD_RULES.${kind} 값 불일치`);
  assert.match(source, serverRule, `클라 CD_LEVEL_AWARD.${kind} 값 불일치`);
}

// 공유·연속출석은 서버가 사건을 직접 보고 적립한다.
// EXP 가 월정석으로 이어지므로 이 둘이 클라 화이트리스트에 있으면 자기신고 창구가 열린다.
assert.match(workerSource, /share:\s*\{\s*exp:\s*25,\s*dailyLimit:\s*1[^}]*serverOnly:\s*true/, "서버 share 규칙이 serverOnly가 아님");
assert.match(workerSource, /streak:\s*\{[^}]*serverOnly:\s*true/, "서버 streak 규칙이 serverOnly가 아님");
assert.ok(workerSource.includes("rule.serverOnly === true"), "HTTP 핸들러가 serverOnly 종류를 거부하지 않음");
const clientAwardTable = source.slice(source.indexOf("var CD_LEVEL_AWARD"), source.indexOf("var CD_LEVEL_QUEST_POOL"));
assert.ok(!clientAwardTable.includes("share:"), "클라 화이트리스트에 share가 노출됨(자기신고 가능해짐)");
assert.ok(!clientAwardTable.includes("streak:"), "클라 화이트리스트에 streak가 노출됨");
// 레벨 곡선 상수는 두 파일이 같은 값을 써야 한다(어긋나면 로그인 전후로 레벨이 튄다)
assert.ok(workerSource.includes("const BASE_LEVEL_EXP = 200;"), "서버 BASE_LEVEL_EXP 변경됨");
assert.ok(workerSource.includes("const LEVEL_EXP_GROWTH = 100;"), "서버 LEVEL_EXP_GROWTH 변경됨");
assert.ok(workerSource.includes("const LEVEL_EXP_STEP_CAP = 1500;"), "서버 곡선 상한 변경됨");
assert.ok(workerSource.includes("const MAX_LEVEL = 99;"), "서버 만렙 상수 변경됨");
assert.ok(source.includes("var CD_LEVEL_BASE_EXP = 200;"), "클라 곡선 상수 불일치");
assert.ok(source.includes("var CD_LEVEL_GROWTH = 100;"), "클라 곡선 상수 불일치");
assert.ok(source.includes("var CD_LEVEL_STEP_CAP = 1500;"), "클라 곡선 상한 불일치");
assert.ok(source.includes("var CD_LEVEL_MAX = 99;"), "클라 만렙 상수 불일치");
console.log("[9] 클라↔서버 지급 규칙·곡선 상수 일치 OK");

// [10] 결제 경로 무침투 — EXP는 재화가 아니므로 RPG 라우트가 결제/차감 모듈을 건드리면 안 된다
for (const forbidden of ["billing-policy", "paid-feature-registry", "content-unlocks", "portone"]) {
  assert.ok(
    !workerSource.includes(`from "../lib/${forbidden}`),
    `RPG 라우트가 결제 모듈을 import 함 -> ${forbidden}`,
  );
}
assert.ok(!workerSource.includes("forceDeduct"), "RPG 라우트에 차감 로직이 섞임");
console.log("[10] 결제 경로 무침투 OK");

// [11] 사주 RPG 시트가 프로필 카드와 같은 저장소·곡선을 쓰는가
const sheetSource = readFileSync(`${root}/js/entertain-engine.js`, "utf8");
assert.ok(!sheetSource.includes("UNLOCK SAVED ON SERVER"), "로컬 저장인데 서버 저장이라 표기함");
assert.ok(sheetSource.includes("getRpgStorageNotice"), "저장 위치 안내 헬퍼 누락");
assert.ok(sheetSource.includes("api.award('quest'"), "시트 퀘스트 완료가 공용 저장소를 거치지 않음");
assert.ok(!sheetSource.includes("RPG_LOCAL_STORAGE_PREFIX"), "프로필별 분산 저장 키가 남아 있음");
// 퀘스트가 날짜마다 달라지는 구조인지 (preview-* 하드코딩 회귀 차단)
assert.ok(!sheetSource.includes("'preview-balance'"), "하드코딩 preview 퀘스트가 되살아남");
assert.ok(sheetSource.includes("'daily-' + dateKey + '-' + pick.id"), "퀘스트 id에 날짜가 없음");
// 모달 접근성·모션 감소·터치 타깃
assert.ok(sheetSource.includes('role="dialog" aria-modal="true"'), "레벨업 모달 dialog 시맨틱 누락");
assert.ok(sheetSource.includes("closeRpgModal"), "모달 Esc/포커스 복귀 처리 누락");
assert.ok(sheetSource.includes("@media (prefers-reduced-motion: reduce){.ent-rpg-complete-btn"), "모션 감소 대응 누락");
assert.ok(sheetSource.includes("min-height:44px;min-width:92px"), "완료 버튼 터치 타깃 미달");
console.log("[11] 사주 RPG 시트 정합·접근성 OK");

// [12] 마일스톤 정의가 클라와 서버에서 어긋나지 않는가
// (오프라인에서도 그려야 해서 양쪽에 표가 있다. 지워서 합칠 수 없으니 값이 같은지를 고정한다.)
for (const [level, key] of [
  [3, "secret_fortune_level_3"],
  [5, "personality_title_level_5"],
  [7, "passive_expand_level_7"],
  [10, "job_class_expand_level_10"],
  [15, "growth_report_preview_level_15"],
  [20, "master_skill_phrase_level_20"],
]) {
  assert.ok(workerSource.includes(`rewardKey: "${key}"`), `서버 마일스톤 누락 -> ${key}`);
  assert.match(
    sheetSource,
    new RegExp(`level:\\s*${level},\\s*key:\\s*'${key}'`),
    `클라 마일스톤이 서버와 불일치 -> Lv.${level} ${key}`,
  );
}
console.log("[12] 마일스톤 정의 클라↔서버 일치 OK");

// [13] 메인 홈에 얹히는 서버 왕복이 가벼운가.
// 홈은 트래픽이 가장 높은 화면이라, 여기서 무겁게 읽으면 과거에 이 기능을 로컬 전용으로
// 되돌리게 만든 것과 같은 종류의 Mongo 부하가 된다. 그래서 계약을 코드로 고정한다.
const liteStart = workerSource.indexOf("async function getRpgProgressLite");
assert.ok(liteStart > 0, "경량 진행도 엔드포인트(getRpgProgressLite)가 없습니다.");
const liteEnd = workerSource.indexOf("\n}", liteStart);
const liteBody = workerSource.slice(liteStart, liteEnd);

for (const forbidden of [
  "User.findById",          // 인증은 JWT 검증만 — 사용자 문서를 읽지 않는다
  "ProfileCard.find",       // 카드 조회 불필요
  "buildSajuContext",       // lunar-javascript 변환은 CPU를 크게 먹는다
  "buildQuestSet",          // 퀘스트는 클라이언트가 로컬에서 만든다
  "UserDailyQuestLog",      // 오늘 로그 조회 불필요
  "loadRpgProgress",        // 읽기 요청이 문서를 생성하면 안 된다
  "requireAuth",            // DB 폴백 경로가 있는 인증은 쓰지 않는다
]) {
  assert.ok(!liteBody.includes(forbidden), `경량 엔드포인트가 무거운 경로를 부릅니다 -> ${forbidden}`);
}
assert.ok(liteBody.includes("peekAccessTokenUserId"), "경량 엔드포인트가 JWT 전용 인증을 쓰지 않습니다.");
assert.ok(liteBody.includes("UserRpgProgress.findOne"), "경량 엔드포인트가 진행도를 읽지 않습니다.");
assert.equal(
  (liteBody.match(/\.findOne\(|\.find\(|\.create\(|\.updateOne\(/g) || []).length,
  1,
  "경량 엔드포인트의 DB 접근은 findOne 1회여야 합니다.",
);
assert.ok(workerSource.includes("readRpgProgressFromCache"), "진행도 서버 캐시가 없습니다.");
assert.ok(workerSource.includes("invalidateRpgProgressCacheForUser"), "적립 후 캐시 무효화가 없습니다.");

// 클라이언트도 무거운 /status 가 아니라 /progress 를 하루 1회만 불러야 한다
assert.ok(source.includes("'/api/rpg/progress'"), "클라가 경량 엔드포인트를 쓰지 않습니다.");
assert.ok(!source.includes("'/api/rpg/status'"), "클라가 아직 무거운 /status 를 부릅니다.");
assert.ok(source.includes("lastSyncedDate"), "하루 1회 동기화 가드가 없습니다.");
assert.ok(source.includes("requestIdleCallback"), "동기화가 첫 페인트 이후로 미뤄지지 않습니다.");
console.log("[13] 홈 서버 왕복 경량 계약(1 read + 캐시 + 하루 1회) OK");

// [14] 레벨 마일스톤 월정석 보상 — 금액이 실제 돈이라 표와 상한을 코드로 고정한다.
const rewardTable = workerSource.slice(
  workerSource.indexOf("const LEVEL_MONTHLY_CREDIT_REWARDS"),
  workerSource.indexOf("const LEVEL_REWARD_TOTAL_CREDIT_CAP"),
);
const rewardRows = Array.from(
  rewardTable.matchAll(/level:\s*(\d+),\s*credits:\s*(\d+),\s*minPayments:\s*(\d+),\s*minPaidKrw:\s*(\d+)/g),
).map((m) => ({
  level: Number(m[1]),
  credits: Number(m[2]),
  minPayments: Number(m[3]),
  minPaidKrw: Number(m[4]),
}));
assert.equal(rewardRows.length, 7, "마일스톤 개수가 바뀌었거나 단계별 결제 조건이 빠졌습니다");
assert.deepEqual(
  rewardRows.find((r) => r.level === 5),
  { level: 5, credits: 500, minPayments: 1, minPaidKrw: 3000 },
  "Lv.5 보상은 500 월정석(=5,000원) / 결제 1회 · 3,000원이어야 합니다",
);
assert.deepEqual(
  rewardRows.find((r) => r.level === 99),
  { level: 99, credits: 5000, minPayments: 30, minPaidKrw: 200000 },
  "Lv.99 보상은 5,000 월정석(=50,000원) / 결제 30회 · 200,000원이어야 합니다",
);
/* 🔴 정산 루프가 첫 미달에서 break 하므로, 요구 실적이 레벨 순서로 단조 증가하지 않으면
   뒤쪽의 더 느슨한 단계가 영영 안 나간다. */
for (let i = 1; i < rewardRows.length; i += 1) {
  assert.ok(rewardRows[i].level > rewardRows[i - 1].level, "마일스톤 레벨이 오름차순이 아닙니다");
  assert.ok(
    rewardRows[i].minPayments >= rewardRows[i - 1].minPayments
      && rewardRows[i].minPaidKrw >= rewardRows[i - 1].minPaidKrw,
    `요구 결제 실적이 단조 증가하지 않습니다 (Lv.${rewardRows[i].level})`,
  );
}
// 월정석 1개 = 10원 (KRW_PER_COIN 100 ÷ MEMBERSHIP_CREDIT_PER_COIN 10)
const billingPolicySource = readFileSync(`${root}/worker/lib/billing-policy.js`, "utf8");
assert.ok(billingPolicySource.includes("KRW_PER_COIN = 100"), "코인 환산 상수가 바뀌었습니다");
assert.ok(billingPolicySource.includes("MEMBERSHIP_CREDIT_PER_COIN = 10"), "월정석 환산 상수가 바뀌었습니다");
const totalCredits = rewardRows.reduce((sum, r) => sum + r.credits, 0);
assert.equal(totalCredits, 10000, `마일스톤 합계가 10,000 월정석(=100,000원)이 아닙니다: ${totalCredits}`);
assert.ok(
  workerSource.includes("const LEVEL_REWARD_TOTAL_CREDIT_CAP = 10000;"),
  "누적 지급 상한이 합계와 어긋납니다",
);

// 지급 조건(단계별 결제 실적 + 가입 14일)이 지급보다 앞에 있어야 한다
const settleBody = workerSource.slice(
  workerSource.indexOf("async function settleLevelMonthlyCreditRewards"),
  workerSource.indexOf("async function ensureRpgIndexes"),
);
assert.ok(settleBody.includes("resolveLevelRewardStats"), "지급 실적 집계가 없습니다");
assert.ok(settleBody.includes("meetsLevelRewardRequirement"), "단계별 요구 실적 판정이 없습니다");
assert.ok(
  settleBody.indexOf("meetsLevelRewardRequirement") < settleBody.indexOf("grantMonthlyCreditLot"),
  "단계 조건 검사가 지급보다 뒤에 있습니다",
);
assert.ok(workerSource.includes("LEVEL_REWARD_MIN_ACCOUNT_AGE_MS = 14 * 24 * 60 * 60 * 1000"), "가입 14일 조건 누락");
// 🔴 예전 구현은 countDocuments(...).limit(1) 이라 결제 횟수가 1에서 잘렸다 — 단계별 조건이 무의미해진다.
assert.ok(!workerSource.includes("Payment.countDocuments"), "결제 실적을 다시 countDocuments 로 세고 있습니다(횟수가 잘립니다)");
const statsBody = workerSource.slice(
  workerSource.indexOf("async function resolveLevelRewardStats"),
  workerSource.indexOf("function meetsLevelRewardRequirement"),
);
assert.ok(statsBody.includes("Payment.find("), "결제 실적 집계가 실제 문서를 읽지 않습니다");
assert.ok(statsBody.includes("LEVEL_REWARD_PAYMENT_SCAN_LIMIT"), "결제 실적 집계에 비용 상한이 없습니다");
assert.ok(statsBody.includes("amount <= 0"), "0원 결제를 실적에서 걸러내지 않습니다");
assert.ok(statsBody.includes("LEVEL_REWARD_NON_CASH_METHODS"), "비현금 결제 제외가 없습니다");
/* 🔴 월정석으로 이용권을 사도 Payment 문서가 생긴다(payments.js). 이걸 실적으로 세면
   "보상 월정석 → 이용권 구매 → 다음 보상 개방" 순환 파밍이 성립한다. */
assert.match(
  workerSource,
  /LEVEL_REWARD_NON_CASH_METHODS\s*=\s*\[[^\]]*"monthly_credit"/,
  "월정석 결제가 실적 제외 목록에 없습니다(순환 파밍 가능)",
);
const meetsBody = workerSource.slice(
  workerSource.indexOf("function meetsLevelRewardRequirement"),
  workerSource.indexOf("function meetsLevelRewardRequirement") + 400,
);
for (const marker of ["accountAgeOk", "minPayments", "minPaidKrw"]) {
  assert.ok(meetsBody.includes(marker), `단계 조건 판정에 ${marker} 가 없습니다`);
}
// 월정석은 오직 이 한 통로로만 나가야 한다
assert.ok(
  (workerSource.match(/grantMonthlyCreditLot\(/g) || []).length === 1,
  "월정석 지급 호출이 여러 곳입니다",
);
assert.ok(!workerSource.includes("consumeMonthlyCreditLots"), "RPG 라우트가 월정석 차감을 건드립니다");
console.log(
  `[14] 마일스톤 보상 표(합계 ${totalCredits.toLocaleString()} 월정석 = ${(totalCredits * 10).toLocaleString()}원)`
  + ` / 최종 요구 결제 ${rewardRows[rewardRows.length - 1].minPayments}회 · `
  + `${rewardRows[rewardRows.length - 1].minPaidKrw.toLocaleString()}원 · 조건·상한 OK`,
);

// [15] 클라 보상표는 서버 표의 사본이다. 한쪽만 바꾸면 사용자에게 거짓 금액을 보여준다.
const clientRewardTable = source.slice(
  source.indexOf("var CD_LEVEL_REWARD_TABLE"),
  source.indexOf("var CD_LEVEL_REWARD_KRW_PER_CREDIT"),
);
const clientRewardRows = Array.from(
  clientRewardTable.matchAll(/level:\s*(\d+),\s*credits:\s*(\d+),\s*payments:\s*(\d+),\s*krw:\s*(\d+)/g),
).map((m) => ({
  level: Number(m[1]),
  credits: Number(m[2]),
  minPayments: Number(m[3]),
  minPaidKrw: Number(m[4]),
}));
assert.deepEqual(
  clientRewardRows,
  rewardRows,
  "클라(CD_LEVEL_REWARD_TABLE)와 서버(LEVEL_MONTHLY_CREDIT_REWARDS) 보상표·요구 실적이 다릅니다",
);
assert.ok(source.includes("CD_LEVEL_REWARD_KRW_PER_CREDIT = 10"), "클라 월정석 환산 상수가 서버와 다릅니다");
const lotsSource = readFileSync(`${root}/worker/lib/monthly-credit-lots.js`, "utf8");
assert.ok(lotsSource.includes("30 * 24 * 60 * 60 * 1000"), "월정석 lot TTL(30일) 상수가 바뀌었습니다");
assert.ok(source.includes("CD_LEVEL_REWARD_EXPIRE_DAYS = 30"), "클라 소멸 안내(30일)가 서버 TTL과 다릅니다");
console.log("[15] 클라·서버 보상표 일치 + 소멸 기간 안내 일치 OK");

// [16] 설명 UI와 지급 연출이 실제로 배선돼 있는가(서버 응답을 버리던 회귀 방지).
assert.ok(source.includes("data-dp-level-reward"), "레벨 보상 요약 줄이 없습니다");
assert.ok(source.includes("function _dpOpenLevelRewardSheet"), "보상 안내 시트가 없습니다");
assert.ok(source.includes("function _dpCelebrateLevelUp"), "레벨업 연출이 없습니다");
const postAwardBody = source.slice(
  source.indexOf("function _cdLevelPostAward"),
  source.indexOf("function _cdLevelApplyServer"),
);
assert.ok(
  postAwardBody.includes("monthlyCreditGrants"),
  "award 응답의 monthlyCreditGrants 를 다시 버리고 있습니다(연출이 영영 안 뜹니다)",
);
// 수령 조건은 사용자에게 그대로 노출한다
assert.ok(source.includes("가입 후 14일"), "수령 조건(가입 14일) 안내가 없습니다");
assert.ok(
  source.includes("누적 결제 횟수와 금액이 함께 올라갑니다"),
  "단계별 결제 조건 안내가 없습니다",
);
assert.ok(
  source.includes("월정석·이용권으로 이용한 건은 결제 실적에 포함되지 않아요"),
  "비현금 결제 제외 고지가 없습니다",
);
// 각 단계 행이 요구 실적과 내 진행도를 보여줘야 한다
assert.ok(source.includes("dp-lvlrw__req"), "시트 행에 단계별 요구 실적이 없습니다");
assert.ok(source.includes("function _dpBuildLevelRewardProgress"), "내 결제 실적 표시가 없습니다");
assert.ok(source.includes("dp-lvlrw__mine"), "내 결제 실적 줄의 스타일 훅이 없습니다");
// 시트 진입 없이 홈에서 보상 상태를 자동 조회하면 트래픽 1위 화면에 왕복이 얹힌다
const rewardStatusCalls = (source.match(/'\/api\/rpg\/level-rewards'/g) || []).length;
assert.equal(rewardStatusCalls, 1, "레벨 보상 상태 조회 호출부가 1곳(시트 열람)이 아닙니다");
console.log("[16] 보상 설명 UI·연출 배선 + 시트 전용 조회 OK");

// [17] 신규 수령 통로가 기존 정산 함수를 거치는가(자격·상한 우회 금지).
assert.ok(workerSource.includes('path === "/level-rewards"'), "GET /level-rewards 라우트가 없습니다");
assert.ok(workerSource.includes('path === "/level-rewards/claim"'), "POST /level-rewards/claim 라우트가 없습니다");
const claimBody = workerSource.slice(
  workerSource.indexOf("async function claimLevelRewards"),
  workerSource.indexOf("export async function handleRpgRoutes"),
);
assert.ok(
  claimBody.includes("settleLevelMonthlyCreditRewards"),
  "수령 라우트가 기존 정산 함수를 거치지 않습니다(자격 검사 우회 위험)",
);
assert.ok(!claimBody.includes("grantMonthlyCreditLot"), "수령 라우트가 지급을 직접 호출합니다");
// 지급 원장 한 줄 — 없으면 월정석 내역에 레벨 보상 흔적이 남지 않는다
assert.ok(settleBody.includes("recordLevelRewardLedger"), "레벨 보상 지급 원장 기록이 없습니다");
assert.ok(workerSource.includes('sourceId = `rpg-level_${level}`'), "원장 sourceId 규칙이 바뀌었습니다");
console.log("[17] 수령 라우트 정산 경유 + 지급 원장 기록 OK");

// [17-b] 실렌더 — node --check 는 선언 없는 변수를 못 잡는다. 스트립/시트/연출을 실제로 그려 본다.
const stripHtml = CDLevel.buildStrip();
assert.ok(stripHtml.includes("data-dp-level-reward"), "스트립에 보상 요약 줄이 없습니다");
assert.ok(
  /다음 보상 · Lv\.\d+/.test(stripHtml) || stripHtml.includes("로그인 후 지급") || stripHtml.includes("모든 레벨 보상"),
  "보상 요약 문구가 비어 있습니다",
);
assert.ok(stripHtml.indexOf("data-dp-level-reward") > stripHtml.indexOf("EXP</div>"), "보상 줄이 EXP 바 아래가 아닙니다");
assert.ok(stripHtml.indexOf("data-dp-level-reward") < stripHtml.indexOf("dpLvlQuests"), "보상 줄이 퀘스트 목록보다 뒤에 있습니다");

assert.equal(typeof CDLevel.openRewardSheet, "function", "보상 시트 진입점이 노출되지 않았습니다");
CDLevel.openRewardSheet();
const sheet = window.document.querySelector(".dp-lvlrw");
assert.ok(sheet, "보상 시트가 DOM 에 붙지 않았습니다");
assert.equal(
  sheet.querySelectorAll(".dp-lvlrw__row").length,
  rewardRows.length,
  "시트 보상 행 개수가 표와 다릅니다",
);
assert.ok(sheet.textContent.includes("월정석 500개"), "시트에 보상 금액이 안 보입니다");
assert.ok(sheet.textContent.includes("30일 뒤 소멸"), "시트에 소멸 안내가 없습니다");
// 단계별 요구 실적이 각 행에 실제로 렌더돼야 한다
assert.ok(sheet.textContent.includes("결제 1회 · 3,000원"), "Lv.5 요구 실적이 안 보입니다");
assert.ok(sheet.textContent.includes("결제 30회 · 200,000원"), "Lv.99 요구 실적이 안 보입니다");
assert.equal(sheet.querySelectorAll(".dp-lvlrw__req").length, 7, "요구 실적 줄이 모든 단계에 없습니다");
CDLevel.openRewardSheet(); // 이중 오픈 방지
assert.equal(window.document.querySelectorAll(".dp-lvlrw").length, 1, "보상 시트가 중복으로 열립니다");
sheet.querySelector("[data-dp-lvlrw-close]").click();
assert.equal(window.document.querySelectorAll(".dp-lvlrw").length, 0, "보상 시트가 닫히지 않습니다");

CDLevel.celebrate({ level: 5, grants: [{ level: 5, credits: 500, krw: 5000 }], force: true });
const party = window.document.querySelector(".dp-lvlup");
assert.ok(party, "레벨업 연출이 DOM 에 붙지 않았습니다");
assert.ok(party.textContent.includes("Lv.5 달성"), "연출에 레벨 표기가 없습니다");
assert.ok(party.querySelector("[data-dp-lvlup-count]"), "지급량 카운트 노드가 없습니다");
assert.equal(party.querySelectorAll(".dp-lvlup__spark").length, 12, "월정석 파티클이 없습니다");
party.querySelector("[data-dp-lvlup-close]").click();
console.log("[17-b] 시트·연출 실렌더 OK");

// [18] 루트/public 사본 동기화 — 어긋나면 홈만 반영되고 독립 정적 페이지가 옛 코드로 남는다.
const publicSource = readFileSync(`${root}/public/js/destiny-profile.js`, "utf8");
assert.equal(publicSource, source, "js/destiny-profile.js 와 public/js 사본이 다릅니다 (npm run sync:public)");
console.log("[18] 루트·public 사본 동일 OK");

console.log("\n모든 스모크 검사 통과.\n");

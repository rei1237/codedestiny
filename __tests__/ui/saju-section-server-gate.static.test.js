/**
 * 사주 종합(section_summary)·대운 풀이(section_daewun)·퀀텀 명리 엔진(rpt_quantumCard)·
 * 극T 관계 회로(sukuyo-extreme-t-relationship)·숙요 인연 도감(sukuyo-relationship-encyclopedia)·에너지 원정 리포트(rpt_energyCoordCard)
 * 본문이 브라우저로 되돌아오지 않게 막는 가드.
 *
 * 2026-10-12 이전: renderSummary·대운 풀이 생성기가 js/saju-engine.js 에 통째로 실려 있어
 * 콘솔에서 함수 하나만 부르면 결제 없이 본문이 나왔다. 이제 본문은 /api/saju/section 이
 * 해금을 확인한 뒤 worker/lib/saju-section 렌더러로 만든다.
 *
 * 🔴 정적 호스팅이라 js/·public/ 아래 파일은 URL 로 그대로 열린다. sync:public 은 소스에서
 *    지운 선언을 미러에서 지우지 않을 수 있으므로 미러(public/)까지 함께 본다.
 * 🔴 여기는 배치만 본다. 해금이 실제로 막히는지는 __tests__/worker/saju-section.test.js 가 맡는다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const stripComments = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n")
  .map((line) => line.replace(/^\s*\/\/.*$/, ""))
  .join("\n");

function browserServedFiles() {
  const out = ["index.html"];
  const skip = new Set(["node_modules", ".git", "coverage"]);
  for (const rel of ["js", "public"]) {
    (function walk(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (skip.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(js|html)$/.test(entry.name)) out.push(path.relative(root, full).split(path.sep).join("/"));
      }
    })(path.join(root, rel));
  }
  assert.ok(out.length > 100, `서빙 파일을 ${out.length}개만 찾았다 — 스캐너가 빗나갔다`);
  assert.ok(out.includes("public/js/saju-engine.js"), "미러의 사주 엔진을 못 봤다 — 배포되는 쪽을 안 보는 가드는 가드가 아니다");
  return out;
}

test("종합·대운 유료 렌더러와 문장이 브라우저 경로에 없다", () => {
  // 함수·표 이름과, 유료 본문에만 있는 장 제목.
  const FORBIDDEN = [
    "generateDetailedAdvice", "generateNeoFactPunch", "getDaewunBranchEvidence", "buildDaewunReadingGuide",
    "buildDaewunDetailHtml", "_buildMonthCommandFromEngine", "HEALTH_DATA", "GAEUN_TIPS", "cycleRoleConditions",
    "보유 십성 랭킹", "내면과 겉모습의 간격", "관계에서 반드시 기억할 것", "대운과 세운, 다음 시기를 함께 읽기",
    // 서버 이전 뒤 덧붙인 장(올해·내년 처방, 전체 대운 지도, 전환기 체크리스트).
    "_sajuSeunYearReading", "_sajuDaewunMapHtml", "_sajuDaewunTransitionHtml", "올해·내년 처방", "전체 대운 지도", "전환기 체크리스트",
    // 퀀텀 명리 엔진(rpt_quantumCard) 본문. 장 제목은 마케팅 문구에도 있어 코드 이름과 본문에만 있는 문장을 본다.
    "function renderQuantumStrategy(", "QUANTUM_MYEONGRI_ENGINE_V3", "qProfessionalSummary", "qNatalRelations", "qFlowAdvice", "qEvidenceHtml",
    "원국과 운의 계산 상태가 일치하지 않아 합·충 해석을 보류했습니다",
    // 극T 관계 회로(sukuyo-extreme-t-relationship) 해금 패널. 장 제목은 무료 잠금 안내에도 있어 생성기 이름과 본문 문장을 본다.
    "getPaidBandRowsMap", "buildSajuRows", "relationshipRows", "workMoneyRows", "prescriptionRows", "renderExtremeTPaidPanels",
    "친구가 힘들다고 하면 원인보다 기분부터 받아줍니다", "싸우면 감정전보다 구조 분석으로 들어갑니다", "기준과 정리력이 강해 판단의 칼날이 선명합니다",
    // 숙요 인연 도감(sukuyo-relationship-encyclopedia) 27숙 숙별 풀이. 관계 제목·키워드는 무료 미리보기에도 있어 풀이 필드와 문장을 본다.
    "renderSukuyoEncyclopediaPaid", "loveReading", "marriageReading", "friendshipReading", "businessReading", "<b>오래 가기 위한 전략</b>",
    "이 숙은 당신에게 거울처럼", "이 숙은 설명하기 어려운 익숙", "닮은 지점은 인정하고",
    // 에너지 원정 리포트(rpt_energyCoordCard) 본문·룰렛 추첨. 무료 스텁은 renderEnergyCoordStub 이다.
    "function renderEnergyCoord(", "setupEnergyRoulette", "energyTravelStory", "pickRouletteDestination", "scoreRouletteDestination",
    "나무가 많은 곳을 걷는 여행은 몸의 호흡을 위로 열고",
  ];
  const offenders = [];
  for (const rel of browserServedFiles()) {
    const source = stripComments(read(rel));
    for (const needle of FORBIDDEN) if (source.includes(needle)) offenders.push(`${rel} → ${needle}`);
  }
  assert.deepEqual(offenders, [], "브라우저 파일에 유료 본문 생성기가 남아 있다:\n  " + offenders.join("\n  "));
  // 옮긴 정본이 서버에 있어야 한다(옮기다 만 상태 방지).
  const paid = read("worker/lib/saju-section/paid-renderers.src.js");
  for (const name of ["generateDetailedAdvice", "getDaewunBranchEvidence", "buildDaewunDetailHtml"]) {
    assert.ok(paid.includes("function " + name + "("), `${name} 정본이 서버에 없다`);
  }
  assert.ok(read("worker/lib/saju-section/paid-quantum.src.js").includes("function renderQuantumStrategy(p, natal, bazi){"), "퀀텀 명리 엔진 정본이 서버에 없다");
  assert.ok(read("worker/lib/saju-section/paid-extreme-t.src.js").includes("function renderExtremeTPaidPanels(p, natal, johu) {"), "극T 해금 패널 정본이 서버에 없다");
  assert.ok(read("worker/lib/saju-section/paid-encyclopedia.src.js").includes("function renderSukuyoEncyclopediaPaid(input) {"), "숙요 인연 도감 정본이 서버에 없다");
  assert.ok(read("worker/lib/saju-section/paid-energy.src.js").includes("function renderEnergyCoord(natal){"), "에너지 원정 리포트 정본이 서버에 없다");
});

test("극T 해금 패널 문장의 번역은 공개 사전(public/i18n)에 없다", () => {
  // 정적 사전도 URL 로 그대로 열린다. 유료 문장 번역은 서버 전용 사본(paid-extreme-t.i18n.json)에만 둔다.
  const paidKeys = [...new Set(read("worker/lib/saju-section/paid-extreme-t.src.js").match(/_extremeTText\("([^"]+)"\)/g).map((m) => m.slice(15, -2)))];
  assert.ok(paidKeys.length > 100, `극T 유료 문장 키를 ${paidKeys.length}개만 찾았다`);
  const offenders = [];
  for (const file of fs.readdirSync(path.join(root, "public/i18n")).filter((name) => name.endsWith(".json"))) {
    const table = JSON.parse(read(`public/i18n/${file}`)).extremeT || {};
    for (const key of paidKeys) if (key in table) offenders.push(`${file} → ${key}`);
  }
  assert.deepEqual(offenders, [], "공개 사전에 극T 유료 문장이 남아 있다:\n  " + offenders.slice(0, 20).join("\n  "));
  const serverOnly = JSON.parse(read("worker/lib/saju-section/paid-extreme-t.i18n.json"));
  assert.ok(Object.keys(serverOnly).includes("en") && paidKeys.every((key) => key in serverOnly.en), "서버 전용 극T 번역 사본이 비었다");
});

test("브라우저는 본문을 서버에만 묻는다", () => {
  const client = stripComments(read("js/core/saju/section-client.js"));
  assert.match(client, /'\/api\/saju\/section'/, "서버 본문 요청 경로가 없다");
  const engine = stripComments(read("js/saju-engine.js"));
  assert.match(engine, /function renderSummary\(\)\{[^}]*CdSajuSectionClient\.loadSummary\(\)/, "renderSummary 가 서버 로더를 거치지 않는다");
  assert.match(engine, /function showDwDetail\([^)]*\)\{[^}]*CdSajuSectionClient\.showDaewun\(/, "showDwDetail 이 서버 로더를 거치지 않는다");
  assert.match(client, /requestBody\('rpt_quantumCard'\)/, "퀀텀 카드가 서버 본문을 요청하지 않는다");
  assert.match(client, /var EXTREME_T_KEY = 'sukuyo-extreme-t-relationship';[\s\S]*requestBody\(EXTREME_T_KEY\)/, "극T 패널이 서버 본문을 요청하지 않는다");
  assert.match(stripComments(read("js/saju-engine-tarot-sukuyo-quantum.js")), /sectionClient\.loadExtremeT\(area,/, "극T 해금 화면이 서버 로더를 거치지 않는다");
  assert.match(client, /var ENCYCLOPEDIA_KEY = 'sukuyo-relationship-encyclopedia';[\s\S]*featureKey: ENCYCLOPEDIA_KEY/, "인연 도감이 서버 본문을 요청하지 않는다");
  assert.match(stripComments(read("js/saju-engine-tarot-sukuyo-quantum.js")), /sectionClient\.loadEncyclopedia\(resultHost, input,/, "인연 도감 해금 화면이 서버 로더를 거치지 않는다");
  assert.match(read("js/core/saju/reportDashboard.js"), /case 'quantumCard':[\s\S]{0,200}CdSajuSectionClient\.loadQuantum\(\)/, "퀀텀 카드 열기가 서버 로더를 거치지 않는다");
  assert.match(client, /rpt_energyCoordCard: \{[\s\S]{0,120}area: 'energyCoordSection'/, "에너지 원정 리포트가 서버 본문을 요청하지 않는다");
  assert.match(read("js/core/saju/reportDashboard.js"), /case 'energyCoordCard':[\s\S]{0,200}CdSajuSectionClient\.loadCard\('rpt_energyCoordCard'\)/, "에너지 원정 리포트 열기가 서버 로더를 거치지 않는다");
  assert.match(read("index.html"), /<script defer src="\/js\/core\/saju\/section-client\.js"><\/script>/, "index.html 이 본문 로더를 싣지 않는다");
});

test("영냥이 귀인 문구와 현실 체크는 문장 역할·테마 토큰을 지킨다", () => {
  const paid = read("worker/lib/saju-section/paid-renderers.src.js");
  assert.match(paid, /var guiinNounByDomNeo=\{/);
  assert.match(paid, /guiinNounByDomNeo\[domE\].*<\/b>와의 만남/);
  assert.match(paid, /귀인\('\+\(guiinNounByDomNeo\[domE\]/);
  assert.match(paid, /영냥이의 현실 체크[\s\S]*background:var\(--cd-surface-2\);border-color:var\(--cd-border\)/);
  assert.match(paid, /영냥이가 네 사주에서 본 것[\s\S]*color:var\(--cd-text-muted\)/);
  const realityCheck = paid.slice(paid.indexOf("function generateNeoFactPunch("), paid.indexOf("function getDaewunBranchEvidence("));
  assert.doesNotMatch(realityCheck, /#e53935|#FF6B6B|#ff9800|#FFA726|#9c27b0|#CE93D8|#e65100|#FF8A65/);
});

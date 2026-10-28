/**
 * 사주 종합(section_summary)·대운 풀이(section_daewun)·퀀텀 명리 엔진(rpt_quantumCard)·
 * 극T 관계 회로(sukuyo-extreme-t-relationship)·숙요 인연 도감(sukuyo-relationship-encyclopedia)·숙요 본성 심화 해석(sukuyo-nature-deep-dive)
 * ·숙요 기본/정밀 궁합(compat-sukuyo-compatibility·premium-sukuyo-compat-extra)·에너지 원정 리포트(rpt_energyCoordCard)
 * ·요주의 빌런 블랙리스트(rpt_villainCard)·명리 헬스 리포트(rpt_healthReportCard)
 * ·나의 매력 클래스(rpt_specialCharmCard)·인생 스킬 트리(rpt_skillTreeCard) 본문이 브라우저로 되돌아오지 않게 막는 가드.
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
    // 숙요 본성 심화 해석(sukuyo-nature-deep-dive) 6종 카드·달빛 성향·연애·돈과 일·감정 리듬. 잠금 카드·탭 연결·무료 기본 해석은 브라우저에 남는다.
    "syBuildSukuyoNatureDeepDiveHtml", "renderSukuyoNatureDeepDivePaid", "syComputeReadingMetrics", "syBuildLoveAttractionType",
    "syBuildCollaborationTipText", "syDedupeReadingTexts", "아침 참고 구간", "<h5>관계가 깊어지는 순간</h5>", "<h5>피하면 좋은 패턴</h5>",
    "새로운 일을 발견하면 쉬는 시간까지 계획으로 채우기 쉽습니다", "무언가를 처음 시작하는 착수기와 환절기에",
    // 숙요 기본 궁합·정밀 궁합 확장(회당 결제) 생성기·장별 문장표. 입력 폼·잠금 카드·관계 미니맵·AI 상담 카드는 브라우저에 남는다.
    "function syBuildEnhancedSukuyoResult", "precisionExtensionSections", "SY_SEAT_CHAPTERS", "SY_RELATION_SYNTHESIS", "function syBuildRelationChapters",
    "function syBuildPastLifeChapter", "syBuildSukuyoExpertFinal", "syBuildSukuyoCompatYearlyForecast", "syBuildRelationshipTiming",
    "숙요에서는 이 관계를 우열이 아니라 공명으로 읽습니다", "두 사람 모두 같은 자리에 서기 때문에 이 관계에는 밀고 당기는 축이 없습니다",
    // 에너지 원정 리포트(rpt_energyCoordCard) 본문·룰렛 추첨. 무료 스텁은 renderEnergyCoordStub 이다.
    "function renderEnergyCoord(", "setupEnergyRoulette", "energyTravelStory", "pickRouletteDestination", "scoreRouletteDestination",
    "나무가 많은 곳을 걷는 여행은 몸의 호흡을 위로 열고",
    // 요주의 빌런 블랙리스트(rpt_villainCard) 본문. 복사·자가진단 버튼 연결(section-client.js)은 원본 그대로 브라우저에 남는다.
    "function renderVillain(", "buildSajuVillainBlacklist", "SAJU_VILLAIN_BLUEPRINTS", "SAJU_VILLAIN_SCORE_RULES", "_sajuVillainComicMeta",
    "빌런명은 웃자고 붙인 별명입니다",
    // 명리 헬스 리포트(rpt_healthReportCard) 본문. 무료 스텁은 renderHealthReportStub, 접기 높이 연결은 section-client.js 에 남는다.
    "function buildWellnessHealthReport(", "HEALTH_ELEMENT_KNOWLEDGE", "renderHealthWellnessStyle", "HEALTH_FOOD_PLAN", "HEALTH_FOOD_DB",
    "getHealthSignalGuideV2", "오늘은 몸을 설득하려 애쓰지 않아도 됩니다",
    // 나의 매력 클래스(rpt_specialCharmCard) 본문. renderSpecialCharm 이름은 무료 카드 틀·AI 프롬프트 카드를 까는 함수로 남는다.
    "MOONLIGHT RPG CHARM CARD", "axisFactPack", "sinsalDetailRows", "stylePrescription", "situationTone",
    "조용한 눈빛과 말 사이의 여백이 상대를 오래 머물게 만듭니다",
    // 인생 스킬 트리(rpt_skillTreeCard) 클래스 시트. renderSkillTree 이름은 무료 스텁을 까는 함수로, 시트 스타일과 퀘스트 칸은 브라우저에 남는다.
    "ILJU_INNATE_DB", "_buildHeroSVG", "addTenGodWeight", "lockedDB", "levelUpText",
    "홀로서기의 전투 기술", "마르지 않는 영원한 영감의 원천",
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
  assert.ok(read("worker/lib/saju-section/paid-nature-deep-dive.src.js").includes("function renderSukuyoNatureDeepDivePaid(lunarObj) {"), "숙요 본성 심화 해석 정본이 서버에 없다");
  assert.ok(read("worker/lib/saju-section/paid-sukuyo-compat.src.js").includes("function renderSukuyoCompatPaid(input) {"), "숙요 궁합 정본이 서버에 없다");
  assert.ok(read("worker/lib/saju-section/paid-energy.src.js").includes("function renderEnergyCoord(natal){"), "에너지 원정 리포트 정본이 서버에 없다");
  assert.ok(read("worker/lib/saju-section/paid-villain.src.js").includes("function renderVillain(p, power) {"), "빌런 블랙리스트 정본이 서버에 없다");
  assert.ok(read("worker/lib/saju-section/paid-health.src.js").includes("function buildWellnessHealthReport(p, natal, johu, pw, jg) {"), "명리 헬스 리포트 정본이 서버에 없다");
  assert.ok(read("worker/lib/saju-section/paid-charm.src.js").includes("function renderSpecialCharm(p, natal) {"), "나의 매력 클래스 정본이 서버에 없다");
  assert.ok(read("worker/lib/saju-section/paid-skill.src.js").includes("function renderSkillTree(p, natal){"), "인생 스킬 트리 정본이 서버에 없다");
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
  assert.match(client, /var NATURE_KEY = 'sukuyo-nature-deep-dive';[\s\S]*featureKey: NATURE_KEY/, "본성 심화 해석이 서버 본문을 요청하지 않는다");
  assert.match(stripComments(read("js/saju-engine-tarot-sukuyo-quantum.js")), /client\.loadNatureDeepDive\(host, \{/, "본성 심화 해석 해금 화면이 서버 로더를 거치지 않는다");
  assert.match(client, /var COMPAT_KEYS = \{ 'compat-sukuyo-compatibility': 'html', 'premium-sukuyo-compat-extra': 'precisionHtml' \};/, "숙요 궁합이 서버 본문을 요청하지 않는다");
  const sukuyoShell = stripComments(read("js/saju-engine-tarot-sukuyo-quantum.js"));
  assert.match(sukuyoShell, /sectionClient\.loadSukuyoCompat\(Object\.assign\(\{ featureKey: SY_PAID_FEATURES\.compatibility\.key,/, "기본 궁합 해금 화면이 서버 로더를 거치지 않는다");
  assert.match(sukuyoShell, /precisionClient\.loadSukuyoCompat\(Object\.assign\(\{\s*featureKey: SY_PAID_FEATURES\.compatibilityPrecision\.key,/, "정밀 궁합 확장이 서버 로더를 거치지 않는다");
  assert.match(read("js/core/saju/reportDashboard.js"), /case 'quantumCard':[\s\S]{0,200}CdSajuSectionClient\.loadQuantum\(\)/, "퀀텀 카드 열기가 서버 로더를 거치지 않는다");
  assert.match(client, /rpt_energyCoordCard: \{[\s\S]{0,120}area: 'energyCoordSection'/, "에너지 원정 리포트가 서버 본문을 요청하지 않는다");
  assert.match(read("js/core/saju/reportDashboard.js"), /case 'energyCoordCard':[\s\S]{0,200}CdSajuSectionClient\.loadCard\('rpt_energyCoordCard'\)/, "에너지 원정 리포트 열기가 서버 로더를 거치지 않는다");
  assert.match(client, /rpt_villainCard: \{[\s\S]{0,120}area: 'villainResult'/, "빌런 블랙리스트가 서버 본문을 요청하지 않는다");
  assert.match(read("js/core/saju/reportDashboard.js"), /case 'villainCard':[\s\S]{0,200}CdSajuSectionClient\.loadCard\('rpt_villainCard'\)/, "빌런 블랙리스트 열기가 서버 로더를 거치지 않는다");
  assert.match(client, /rpt_healthReportCard: \{[\s\S]{0,120}area: 'healthReportSection'/, "명리 헬스 리포트가 서버 본문을 요청하지 않는다");
  assert.match(read("js/core/saju/reportDashboard.js"), /case 'healthReportCard':[\s\S]{0,200}CdSajuSectionClient\.loadCard\('rpt_healthReportCard'\)/, "명리 헬스 리포트 열기가 서버 로더를 거치지 않는다");
  assert.match(client, /rpt_specialCharmCard: \{[\s\S]{0,120}area: 'specialCharmBody'/, "나의 매력 클래스가 서버 본문을 요청하지 않는다");
  assert.match(read("js/core/saju/reportDashboard.js"), /case 'specialCharmCard':[\s\S]{0,400}CdSajuSectionClient\.loadCard\('rpt_specialCharmCard'\)/, "나의 매력 클래스 열기가 서버 로더를 거치지 않는다");
  assert.match(client, /rpt_skillTreeCard: \{[\s\S]{0,120}area: 'skillTreeBody'/, "인생 스킬 트리가 서버 본문을 요청하지 않는다");
  assert.match(read("js/core/saju/reportDashboard.js"), /case 'skillTreeCard':[\s\S]{0,400}CdSajuSectionClient\.loadCard\('rpt_skillTreeCard'\)/, "인생 스킬 트리 열기가 서버 로더를 거치지 않는다");
  assert.match(read("index.html"), /<script defer src="\/js\/core\/saju\/section-client\.js\?v=build-[a-f0-9]{12}"><\/script>/, "index.html 이 본문 로더를 싣지 않는다");
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

test("시크릿 하우스 에피소드 엔진과 엔딩 문장이 브라우저 경로에 없다", () => {
  // 장면 표·호감 가중치·반응 대사·엔딩 판정과 결과 카드 문장. 출연진 프로필과 첫 케미(calcBase)는 무료로 남는다.
  const FORBIDDEN = [
    "const ED=", "SCENE_DATA", "soloDelta", "RXN_BY_EL", "SAJU_MENT", "ENDING_COPY", "calculateEnding", "CHARACTER_STORY_VOICE",
    "resolveDynamicScene", "getCompatDynamics",
    "한강 새벽 피크닉", "봄비가 내리던 날처럼", "박하늘은 감정 카드를 오래 쥐고", "과합(달콤하지만 부담)", "최상위 호감 + 고궁합",
  ];
  const files = [...new Set(["secret-house_real.html", ...browserServedFiles()])];
  assert.ok(files.includes("public/secret-house_real.html"), "시크릿 하우스 미러를 못 봤다");
  const offenders = [];
  for (const rel of files) {
    const source = stripComments(read(rel));
    for (const needle of FORBIDDEN) if (source.includes(needle)) offenders.push(`${rel} → ${needle}`);
  }
  assert.deepEqual(offenders, [], "브라우저 파일에 시크릿 하우스 유료 엔진이 남아 있다:\n  " + offenders.join("\n  "));
  const paid = read("worker/lib/saju-section/paid-secret-house.src.js");
  for (const name of ["handleChoice(choice,btn,scene)", "buildResult()", "calculateEnding(targetChar)"]) {
    assert.ok(paid.includes("function " + name + "{"), `${name} 정본이 서버에 없다`);
  }
  const page = stripComments(read("secret-house_real.html"));
  assert.match(page, /const HOUSE_ENDPOINT='\/api\/saju\/section';/, "시크릿 하우스가 서버 걸음을 요청하지 않는다");
  assert.match(page, /const HOUSE_FEATURE='rpt_secretHouseEntryCard';/, "시크릿 하우스 해금 키가 다르다");
  assert.match(page, /history:G\.picks\.slice\(\)/, "시크릿 하우스는 고른 글자만 보내야 한다");
});

test("십이운성 동물점 결과 문장·상세 탭·심층 리포트가 브라우저 번들 경로에 없다", () => {
  // 대표 동물·네 기둥 운성·도감 이름은 무료로 남고, 결과 카드 문장(STAGE_SEEDS)·10개 탭·심층 리포트는 서버만 만든다.
  const FORBIDDEN = [
    "STAGE_SEEDS", "ensureSummaryLength", "TWELVE_GROWTH_ANIMAL_RESULT_TEXT_TRANSLATIONS", "ANIMAL_INTERPRETATION_TEXT_TRANSLATIONS", "STAGE_KEYWORDS",
    "function resolveTwelveGrowthAnimalResult(", "function buildTwelveAnimalSections(", "function buildDetailedInterpretation(",
    "새벽의 싹을 여는 탐험형", "오늘은 과한 예측보다 작은 실행을 반복해 리듬을 확인하세요", "본능적으로 선택하는 방식과 가까운 관계에서 드러나는 결", "이별의 순간에는",
  ];
  const files = [...browserServedFiles()];
  for (const rel of ["app", "components", "lib", "src"]) {
    if (!fs.existsSync(path.join(root, rel))) continue;
    (function walk(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) files.push(path.relative(root, full).split(path.sep).join("/"));
      }
    })(path.join(root, rel));
  }
  assert.ok(files.includes("app/saju/animal-destiny/components/AnimalResultScreen.tsx"), "동물점 결과 화면을 못 봤다");
  const offenders = [];
  for (const rel of files) {
    const source = stripComments(read(rel));
    for (const needle of FORBIDDEN) if (source.includes(needle)) offenders.push(`${rel} → ${needle}`);
  }
  assert.deepEqual(offenders, [], "브라우저 파일에 동물점 유료 문장이 남아 있다:\n  " + offenders.join("\n  "));
  const paid = read("worker/lib/saju-section/paid-animal.src.js");
  for (const name of ["resolveTwelveGrowthAnimalResult(", "buildTwelveAnimalSections(", "buildDetailedInterpretation("]) {
    assert.ok(paid.includes("function " + name), `${name} 정본이 서버에 없다`);
  }
  const loader = read("app/saju/animal-destiny/lib/paidReading.ts");
  assert.match(loader, /const FEATURE_KEY = "animal-destiny-unlock";/, "동물점 해금 키가 다르다");
  assert.match(loader, /authFetch\("\/api\/saju\/section"/, "동물점이 서버 풀이를 요청하지 않는다");
});

test("점성술 상담 심화 분석 4종과 봉인된 별의 방 4종 생성기가 브라우저 경로에 없다", () => {
  // 무료 차트·요약과 잠금 게이트는 남고, 네 심화 본문은 /api/astro/section 이 출생 단위 해금을 확인한 뒤 만든다.
  const FORBIDDEN = [
    "_astroCounselJobScores", "_astroCounselCareer(", "_astroCounselPlanetRow", "_astroCounselRelationship(", "roleLens",
    "차트의 직업 신호가 이 역할에서 비교적 안정적으로", "astro-counsel-job-list\">", "관계는 혼자 완성한 성향을 비추는 거울입니다",
    "_astroCounselDeepPanel", "_astroCounselChip(", "_astroCounselPlacementLine", "일과 역할: 사회에 남길 별의 이름", "커리어가 흘러가는 통로", "7하우스 룰러의 생활화",
  ];
  const offenders = [];
  for (const rel of browserServedFiles()) {
    const source = stripComments(read(rel));
    for (const needle of FORBIDDEN) if (source.includes(needle)) offenders.push(`${rel} → ${needle}`);
  }
  assert.deepEqual(offenders, [], "브라우저 파일에 점성술 심화 분석 생성기가 남아 있다:\n  " + offenders.join("\n  "));
  const paid = read("worker/lib/astro-section/paid-counsel.src.js");
  for (const name of ["_astroCounselJobScores(", "_astroCounselCareer(", "_astroCounselPlanetRow(", "_astroCounselRelationship(", "_astroCounselDeepBodies("]) {
    assert.ok(paid.includes("function " + name), `${name} 정본이 서버에 없다`);
  }
  const stellar = read("worker/lib/astro-section/paid-stellar.src.js");
  for (const name of ["_astroCounselDeepPanel(", "_astroCounselChip(", "_astroCounselPlacementLine(", "_astroCounselStellarBodies("]) {
    assert.ok(stellar.includes("function " + name), `${name} 정본이 서버에 없다`);
  }
  const loader = read("js/core/astro/section-client.js");
  assert.match(loader, /var ENDPOINT = '\/api\/astro\/section';/, "점성술 심화 분석이 서버 본문을 요청하지 않는다");
  assert.match(read("index.html"), /<script defer src="\/js\/core\/astro\/section-client\.js"><\/script>/, "점성술 본문 배달 스크립트가 빠졌다");
});

// 자미두수 명반 상세 유료 장(출생 단위 해금). 명반 계산·무료 미리보기·잠금 카드는 브라우저에 남고, 유료 본문 생성기는 서버(paid-ziwei.src.js)로 옮겼다.
const ZIWEI_SERVER_KEYS = ["ziwei_decade_luck", "ziwei_twelve_palaces", "ziwei_love_deep", "ziwei_symbolic_layer"];
test("자미두수 유료 장 생성기와 본문 문장이 브라우저 경로에 없다", () => {
  const FORBIDDEN = [
    // 대한 운세(ziwei_decade_luck): 12대한 타임라인과 1년운 안쪽 10년 대한 표.
    "PALACE_DAHAN_THEME", "zwDahanBuildSections", "zwDahanSambangSajeong", "zwFlowDecadeSummary",
    "동료·협력자의 조력이 운명을 바꾸는 시기", "의 주제를 3년 단위 목표로 나누고",
    // 12궁 정밀 해설(ziwei_twelve_palaces): 12궁 핵심 지도 표와 궁별 정밀 카드.
    "buildZwSummaryTableHtml", "buildZwTwelvePalaceDeepHtml", "ZW_PALACE_DEEP_FRAME", "ZW_BR_DEEP_PHRASE", "zwDeepPalaceBranchIdx",
    "가장 가까운 사람들과 어떻게 협력하는가", "이 자리에서 별의 성질이 힘 있게 드러납니다",
    // 부부궁 심화 상담(ziwei_love_deep): 인연 별 그림 장, 연애 상담 장, 부부궁 정밀 카드.
    "buildZwSpouseDeepHtml", "ZW_BAD_STAR_EFFECT", "zwDeepBrTag", "loveDeepOracle", "healingAffirmation", "redFlagScenario", "marriageTimingCounselHtml",
    "ziwei-love-counsel-summary-v20260615-step2", "경계선 3종(연락·약속·사적 거리)을 문장으로 합의하고", "갈등 유형별 대화 스크립트",
    // 상징 보조층(ziwei_symbolic_layer): 본명·현실축·사화·그림자 인장 장과 인장 서사.
    "buildZwSymbolicDeepHtml", "olympusSealMergedHtml", "zwFlowSealCard", "zwFlowSealSummaryChip", "natalShadowSeal",
    "ziwei-olympus-guardian-v20260606", "인장 서사 — 상징을 생활 언어로 풀기", "에서 길어 올린 상징입니다.",
  ];
  const offenders = [];
  for (const rel of browserServedFiles()) {
    const source = stripComments(read(rel));
    for (const needle of FORBIDDEN) if (source.includes(needle)) offenders.push(`${rel} → ${needle}`);
  }
  assert.deepEqual(offenders, [], "브라우저 파일에 자미두수 유료 본문 생성기가 남아 있다:\n  " + offenders.join("\n  "));
  const paid = read("worker/lib/saju-section/paid-ziwei.src.js");
  assert.ok(paid.includes("function renderZiweiPaidBodies(idx, pName, stars, pd, opts) {"), "자미두수 유료 장 정본이 서버에 없다");
  for (const needle of FORBIDDEN) assert.ok(paid.includes(needle), `${needle} 정본이 서버에 없다`);
});

test("자미두수 유료 장은 서버 본문 칸으로만 열린다", () => {
  const engine = stripComments(read("js/saju-engine.js"));
  const client = stripComments(read("js/core/saju/section-client.js"));
  assert.match(client, /function loadZiwei\(slot\) \{[\s\S]*?ziweiBody\(featureKey\)[\s\S]*?request\(body\)/, "자미두수 칸이 서버 본문을 요청하지 않는다");
  assert.match(engine, /var CD_ZW_SERVER_KEYS = \[([^\]]*)\];/, "서버 본문 키 목록이 없다");
  const listed = engine.match(/var CD_ZW_SERVER_KEYS = \[([^\]]*)\];/)[1].split(",").map((s) => s.trim().replace(/'/g, ""));
  assert.deepEqual(listed, ZIWEI_SERVER_KEYS, "브라우저 서버 본문 키와 이전 목록이 다르다");
  assert.match(engine, /var client=window\.CdSajuSectionClient;[\s\S]{0,400}client\.loadZiwei\(slots\[i\]\)/,"자미두수 칸이 서버 로더를 거치지 않는다");
  for (const key of ZIWEI_SERVER_KEYS) assert.ok(engine.includes(`_cdZwServerSlot('${key}')`), `${key} 본문 자리에 서버 칸이 없다`);
  assert.match(engine, /window\.__cdZiweiSectionInput = \{/, "명반 모달이 서버 입력 스냅샷을 남기지 않는다");
  // 부부궁 심화 장의 별 그림은 서버 본문이 배달된 뒤에 그린다.
  assert.ok(engine.includes("window.__cdZwDrawLoveStar = function(scope){"), "부부궁 별 그림 훅이 없다");
  assert.ok(engine.includes("window.__cdZwServerBodyDelivered=_cdZwServerBodyDelivered;"), "서버 본문 배달 훅이 없다");
  assert.match(client, /root\.__cdZwServerBodyDelivered\(slot, featureKey, data\)/, "서버 로더가 배달 훅을 부르지 않는다");
});

// 자미두수 궁합(compat-ziwei-compatibility, 회당 결제). 입력 폼·결제 게이트·보관함 저장·AI 상담 카드는 브라우저에 남고,
// 진태양시 보정·두 명반·리포트 생성기는 서버(paid-ziwei.src.js renderZiweiCompatPaid)로 옮겼다.
test("자미두수 궁합 리포트 생성기가 브라우저 경로에 없다", () => {
  const FORBIDDEN = [
    "bizSharedWealth", "weakestCategory", "layer1Bonus", "pastLifeHtml", "periodOverlap", "conflictTrigger",
    "두 명반의 근거를 따라 읽는 관계 종합 리포트", "점수 구성과 입력 기준", "기대 하나씩 나누기", "보정 항목: 주성 성향",
  ];
  const offenders = [];
  for (const rel of browserServedFiles()) {
    const source = stripComments(read(rel));
    for (const needle of FORBIDDEN) if (source.includes(needle)) offenders.push(`${rel} → ${needle}`);
  }
  assert.deepEqual(offenders, [], "브라우저 파일에 자미두수 궁합 생성기가 남아 있다:\n  " + offenders.join("\n  "));
  const paid = read("worker/lib/saju-section/paid-ziwei.src.js");
  assert.ok(paid.includes("function renderZiweiCompatPaid(input) {"), "자미두수 궁합 정본이 서버에 없다");
  for (const needle of FORBIDDEN) assert.ok(paid.includes(needle), `${needle} 정본이 서버에 없다`);
  const engine = stripComments(read("js/saju-engine.js"));
  const client = stripComments(read("js/core/saju/section-client.js"));
  assert.match(client, /function loadZiweiCompat\(options\) \{[\s\S]*?ziweiBody\(featureKey\)[\s\S]*?requestPerUse\(body, featureKey, 'html'\)/, "자미두수 궁합이 서버 본문을 요청하지 않는다");
  assert.match(engine, /window\._runZwCompatibilityCore = function\(\) \{[\s\S]*?window\.CdSajuSectionClient\.loadZiweiCompat\(\{[\s\S]*?access: archiveContext/, "자미두수 궁합이 결제 기록과 함께 서버 로더를 부르지 않는다");
});

test("점성술 시나스트리 궁합(유명인·직접 입력) 생성기가 브라우저 경로에 없다", () => {
  // 무료 유명인 목록·입력 칸·결제 게이트만 남고, 본문·점수·AI 프롬프트는 /api/astro/synastry 가 회당 결제를 확인한 뒤 만든다.
  const FORBIDDEN = [
    "_syScore(", "_syBuildNarrative", "_syOverlayTuning", "_syPairWeight", "_syAspect(", "_syTopAspect", "_syWsHouseOf",
    "_astroBuildIncludedSynastryPrompt", "_SY_OV_TUNE", "조화형 인연 - 마음, 가치관, 행동 템포가", "과제가 많은 인연 - 경계 설정과 합의가",
    "감정 정리 루틴 + 갈등 복기 규칙",
  ];
  const offenders = [];
  for (const rel of browserServedFiles()) {
    const source = stripComments(read(rel));
    for (const needle of FORBIDDEN) if (source.includes(needle)) offenders.push(`${rel} → ${needle}`);
  }
  assert.deepEqual(offenders, [], "브라우저 파일에 시나스트리 궁합 생성기가 남아 있다:\n  " + offenders.join("\n  "));
  const paid = read("worker/lib/astro-section/paid-synastry.src.js");
  for (const name of ["_syScore(", "_syBuildNarrative(", "_astroBuildIncludedSynastryPrompt(", "_astroSynastryCelebBodies(", "_astroSynastryDirectBodies("]) {
    assert.ok(paid.includes("function " + name), `${name} 정본이 서버에 없다`);
  }
  const engine = read("js/saju-engine.js");
  assert.match(engine, /_cdAIPromptRequestJson\('\/api\/astro\/synastry'/, "시나스트리 궁합이 서버 본문을 요청하지 않는다");
});

test("점성술 앞으로 12개월(astro_yearly_transit) 본문 생성기가 브라우저 경로에 없다", () => {
  // 무료 머리("가장 큰 변화의 달")만 남고, 기간·날짜·분야별 본문은 /api/astro/section 이 출생 단위 해금을 확인한 뒤 만든다.
  const FORBIDDEN = [
    "function renderYear(", "renderYear:", "function year(", "LORD_YEAR", "LORD_ERA", "FIELD_TONE", "RETRO_FIELD", "RETRO_TIP",
    "NATAL_FIELDS", "ECLIPSE_TYPE", "themeLines", "eventSentence", "배움과 기회로 무대가 넓어지는 해예요",
    "지난 인연이 떠오르기 쉬워요. 새 고백보다", "큰 구매나 투자는 이 기간 뒤로 미루세요",
  ];
  const offenders = [];
  for (const rel of browserServedFiles()) {
    const source = stripComments(read(rel));
    for (const needle of FORBIDDEN) if (source.includes(needle)) offenders.push(`${rel} → ${needle}`);
  }
  assert.deepEqual(offenders, [], "브라우저 파일에 12개월 본문 생성기가 남아 있다:\n  " + offenders.join("\n  "));
  const paid = read("worker/lib/astro-section/paid-yearly.cjs");
  for (const name of ["year(", "renderYear(", "themeLines(", "eventSentence("]) assert.ok(paid.includes("function " + name), `${name} 정본이 서버에 없다`);
  const engine = read("js/saju-engine.js");
  assert.match(engine, /_astroCounselPaidGate\('astro_yearly_transit', 50, [^)]*, ''\)\)/, "12개월 게이트가 브라우저 본문을 싣는다");
  assert.match(read("js/core/astro/section-client.js"), /astro_yearly_transit: true/, "12개월 본문이 서버를 요청하지 않는다");
});

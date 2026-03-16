// ============================================================
// src/index.ts
// 베다 점성술 엔진 — 메인 진입점 & 테스트
//
// 샘플 테스트: 1990년 1월 1일 오후 12시, 서울
// ============================================================

import { ChartBuilder } from "./core/charts";
import { DestinyEngine, calcAshtakootMilan } from "./analysis/destiny-engine";
import { BirthInput, DestinyReport, FullCompatibilityReport } from "./types";

// ─── 유틸리티 ─────────────────────────────────────────────

function printSeparator(title: string) {
  const line = "═".repeat(60);
  console.log(`\n${line}`);
  console.log(`  ${title}`);
  console.log(line);
}

function printJSON(label: string, data: unknown) {
  console.log(`\n📊 ${label}:`);
  console.log(JSON.stringify(data, null, 2));
}

// ─── 메인 테스트 함수 ─────────────────────────────────────

/**
 * 샘플 출생 데이터로 7대 운명 분석 전체를 실행합니다.
 *
 * 테스트 데이터:
 * - 출생일: 1990년 1월 1일 오후 12:00 (정오)
 * - 출생지: 서울, 대한민국 (37.5665°N, 126.9780°E)
 * - 타임존: KST (UTC+9)
 */
async function runMainTest() {
  printSeparator("베다 점성술 엔진 v1.0 — 테스트 실행");
  console.log("📍 테스트 데이터: 1990-01-01 12:00 PM KST, 서울 (37.57°N, 126.98°E)");

  // ── 출생 정보 설정 ──────────────────────────────────────
  const birthInput: BirthInput = {
    datetime: new Date("1990-01-01T03:00:00.000Z"), // 12:00 KST = 03:00 UTC
    latitude:  37.5665,
    longitude: 126.9780,
    timezoneOffset: 9,
    gender: "M",
    name: "홍길동",
  };

  // ── 차트 빌더 초기화 (swisseph 없을 경우 useMock: true) ──
  // 프로덕션에서는 { useMock: false } 또는 인자 없이 사용
  const builder = new ChartBuilder({ useMock: true });

  console.log("\n⏳ 차트 계산 중...");
  const chartData = await builder.build(birthInput);

  printSeparator("Phase 1 & 2 — 차트 기본 데이터");

  // 행성 위치 요약 출력
  console.log("\n🪐 행성 위치 (Sidereal / Lahiri Ayanamsa):");
  const planetTable: Record<string, string> = {};
  for (const [planet, pos] of Object.entries(chartData.rasi.planets)) {
    planetTable[planet] =
      `${pos.signName} ${pos.degreeInSign.toFixed(2)}° | ${pos.dignity}${pos.isRetrograde ? " ℞" : ""}`;
  }
  console.table(planetTable);

  // 상승궁
  console.log(`\n🌅 Lagna (상승궁): ${chartData.rasi.ascendantSign} ${(chartData.rasi.ascendant % 30).toFixed(2)}°`);

  // 낙샤트라
  console.log(
    `🌙 Moon Nakshatra: ${chartData.nakshatra.name} (Lord: ${chartData.nakshatra.lord}) | Pada ${chartData.nakshatra.pada}`
  );

  // 하우스 배치
  console.log("\n🏠 하우스 배치 (Whole Sign):");
  for (const house of chartData.rasi.houses) {
    const planets = house.planets.length > 0 ? house.planets.join(", ") : "비어 있음";
    console.log(`  H${house.number.toString().padStart(2, " ")} (${house.sign.padEnd(12)}): ${planets}`);
  }

  // 현재 대운/세운
  const maha = chartData.currentDasha.mahadasha;
  const anta = chartData.currentDasha.antardasha;
  console.log(
    `\n🕰️  현재 운: ${maha.planet} 대운 / ${anta.planet} 세운`
  );
  console.log(
    `   세운 기간: ${anta.startDate.toLocaleDateString("ko-KR")} ~ ${anta.endDate.toLocaleDateString("ko-KR")}`
  );

  // 다음 5개 대운 미리보기
  console.log("\n📅 Vimshottari Dasha — 향후 대운 미리보기:");
  const now = new Date();
  const futureDashas = chartData.dashas
    .filter(d => d.endDate > now)
    .slice(0, 5);
  for (const d of futureDashas) {
    const start = d.startDate.getFullYear();
    const end = d.endDate.getFullYear();
    console.log(`   ${d.planet.padEnd(9)} ${start}–${end} (${d.durationYears.toFixed(1)}년)`);
  }

  // ── Phase 3: 7대 운명 분석 ────────────────────────────
  printSeparator("Phase 3 — 7대 운명 분석 (JSON 출력)");

  const engine = new DestinyEngine();
  const report: DestinyReport = engine.generateReport(chartData);

  // ── 1. 타고난 성향 ────────────────────────────────────
  printSeparator("1️⃣  타고난 성향 (Innate Personality)");
  console.log(`  Lagna:        ${report.personality.lagnaSign} — 지배 행성: ${report.personality.lagnaLord}`);
  console.log(`  Lagna Lord:   ${report.personality.lagnaLordPosition}`);
  console.log(`  Moon Nakshatra: ${report.personality.moonNakshatra} (${report.personality.moonNakshatraLord})`);
  console.log(`  핵심 성향:    ${report.personality.coreTraits.join(", ")}`);
  console.log(`  내면 그림자:  ${report.personality.subconscious.join(", ")}`);
  console.log(`  삶의 주제:    ${report.personality.lifeTheme}`);
  console.log(`  원소 분포:   `, report.personality.elementBalance);

  // ── 2. 재물운 ─────────────────────────────────────────
  printSeparator("2️⃣  재물운 (Wealth)");
  console.log(`  재물 점수:    ${report.wealth.wealthScore}/100`);
  console.log(`  주요 수입원:  ${report.wealth.primarySource}`);
  console.log(`  2하우스:      ${report.wealth.house2Status}`);
  console.log(`  11하우스:     ${report.wealth.house11Status}`);
  console.log(`  목성 영향:    ${report.wealth.jupiterInfluence}`);
  console.log(`  Hora 강도:    ${report.wealth.horaStrength}`);
  console.log(`  재물 요가:    ${report.wealth.wealthYogas.join("\n              ")}`);
  console.log(`  절정 기간:    ${report.wealth.peakWealthPeriods.join(", ")}`);
  console.log(`  조언:         ${report.wealth.advice}`);

  // ── 3. 천직 ───────────────────────────────────────────
  printSeparator("3️⃣  천직 (Vocation / Career)");
  console.log(`  주요 직업군:  ${report.career.primaryCareer.join(", ")}`);
  console.log(`  보조 직업군:  ${report.career.secondaryCareer.join(", ")}`);
  console.log(`  10H 지배행성: ${report.career.house10Lord}`);
  console.log(`  직업 요가:    ${report.career.careerYogas.join("\n              ")}`);
  console.log(`  D-10 분석:    ${report.career.dasamsaStrength}`);
  console.log(`  최적 활동기:  ${report.career.bestPeriod}`);
  console.log(`  조언:         ${report.career.advice}`);

  // ── 4. 차크라 ─────────────────────────────────────────
  printSeparator("4️⃣  차크라 에너지 (Chakra Energy)");
  console.log(`  전체 균형:    ${report.chakra.overallBalance}/100`);
  console.log(`  주도 차크라:  ${report.chakra.dominantChakra}`);
  console.log(`  차단 차크라:  ${report.chakra.blockedChakra}`);
  console.log("\n  차크라별 상태:");
  for (const c of report.chakra.chakras) {
    const bar = "█".repeat(Math.round(c.activationScore / 10)) +
                "░".repeat(10 - Math.round(c.activationScore / 10));
    console.log(`    ${c.name.padEnd(14)} [${bar}] ${c.activationScore}/100 (${c.status})`);
  }
  console.log(`\n  치유 조언:    ${report.chakra.healingAdvice.join("\n               ")}`);

  // ── 5. 연애운 ─────────────────────────────────────────
  printSeparator("5️⃣  연애운 (Romance)");
  console.log(`  7하우스:      ${report.romance.house7Sign} — 지배: ${report.romance.house7Lord}`);
  console.log(`  연애 카라카:  ${report.romance.venusOrJupiterSign}`);
  console.log(`  파트너 특성:  ${report.romance.partnerTraits.join(", ")}`);
  console.log(`  연애 스타일:  ${report.romance.romanticStyle}`);
  console.log(`  결혼 시기:    ${report.romance.marriageTimingHint}`);
  console.log(`  도전 영역:    ${report.romance.challengeAreas.join("\n              ")}`);
  console.log(`  Navamsa:      ${report.romance.navamsaInsight}`);
  console.log(`  조언:         ${report.romance.advice}`);

  // ── 6. 궁합 (샘플 2인) ────────────────────────────────
  printSeparator("6️⃣  궁합 — Ashtakoot Milan");

  // 두 번째 인물: 1992-03-15, 여성 (테스트용 서울)
  const birthInput2: BirthInput = {
    datetime: new Date("1992-03-15T03:30:00.000Z"), // 12:30 KST
    latitude:  37.5665,
    longitude: 126.9780,
    timezoneOffset: 9,
    gender: "F",
    name: "이영희",
  };
  const chartData2 = await builder.build(birthInput2);

  const compatibility: FullCompatibilityReport = engine.generateCompatibilityReport(
    chartData,
    chartData2,
    "홍길동",
    "이영희"
  );

  console.log(`\n  👨 ${compatibility.person1.name}: ${compatibility.person1.moonNakshatra}`);
  console.log(`  👩 ${compatibility.person2.name}: ${compatibility.person2.moonNakshatra}`);
  console.log(`\n  총점: ${compatibility.compatibility.totalScore}/36 (${compatibility.compatibility.percentage}%)`);
  console.log(`  판정: ${compatibility.compatibility.verdict}`);
  console.log("\n  항목별 점수:");
  for (const item of compatibility.compatibility.breakdown) {
    const filled = "●".repeat(item.actualScore);
    const empty  = "○".repeat(item.maxScore - item.actualScore);
    console.log(
      `    ${item.name.padEnd(22)} [${filled}${empty}] ${item.actualScore}/${item.maxScore}`
    );
  }
  console.log(`\n  강점:     ${compatibility.compatibility.strengths.join(", ") || "없음"}`);
  console.log(`  과제:     ${compatibility.compatibility.challenges.join(", ") || "없음"}`);
  console.log(`  조언:     ${compatibility.compatibility.advice}`);

  // ── 7. 요가 추천 ──────────────────────────────────────
  printSeparator("7️⃣  맞는 요가 (Suitable Yoga)");
  console.log(`  주도 원소:    ${report.yoga.dominantElement}`);
  console.log(`  결핍 원소:    ${report.yoga.deficientElement}`);
  console.log(`  주요 요가:    ${report.yoga.primaryYoga}`);
  console.log(`  보조 요가:    ${report.yoga.secondaryYoga}`);
  console.log(`  최적 시간:    ${report.yoga.bestPracticeTime}`);
  console.log("\n  추천 수련:");
  for (const p of report.yoga.practices) {
    console.log(`    ✦ ${p.name.padEnd(18)} → ${p.benefit} (${p.duration})`);
  }
  console.log(`  주의 수련:    ${report.yoga.avoidPractices.join(", ")}`);

  // ── 전체 JSON 출력 ────────────────────────────────────
  printSeparator("📦 최종 DestinyReport JSON");
  console.log(JSON.stringify(report, null, 2));

  printSeparator("✅ 테스트 완료");
  console.log("  모든 7개 모듈이 성공적으로 실행되었습니다.");
  console.log("  프로덕션 전환 시 useMock: false 로 변경하고");
  console.log("  npm install swisseph 을 실행하세요.\n");
}

// ─── 실행 ─────────────────────────────────────────────────
runMainTest().catch((err) => {
  console.error("❌ 오류 발생:", err);
  process.exit(1);
});

// 러브 코드 궁합 결정론 + 사주(일주) 경로 일치 검증.
// node에 TS 트랜스파일러가 없어, 이 레포의 다른 verify 스크립트처럼 소스 텍스트 단언과
// lunar-javascript 실계산(캐릭터 일간 역검증)을 함께 사용한다.
//
//   node scripts/verify-love-compat-determinism.mjs

import fs from "node:fs";
import path from "node:path";
import Lunar from "lunar-javascript";

const { Solar } = Lunar;
const ROOT = process.cwd();
const read = (relPath) => fs.readFileSync(path.join(ROOT, relPath), "utf8");

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

// ── 1) 엔진 순수성(결정론): 선택지·stats·난수·시각을 인자로도 본문에서도 참조하지 않는다 ──
const engine = read("app/saju/love-simulation/_engine/compatibilityEngine.ts");
check(
  /export function computeCompatibilityProfile\(\s*self: NormalizedSaju,\s*partner: NormalizedSaju,\s*weights: CompatWeights,?\s*\)/.test(engine),
  "computeCompatibilityProfile 시그니처는 (self, partner, weights)만 받아야 한다",
);
check(!/Math\.random/.test(engine), "엔진은 Math.random을 쓰면 안 된다");
check(!/new Date|Date\.now/.test(engine), "엔진은 Date를 쓰면 안 된다");
// 코드상 실제 참조(member access)만 검사 — 상단 설명 주석의 단어는 오탐이므로 제외.
const engineCode = engine.replace(/\/\/[^\n]*/g, "");
check(!/\bstats\s*[.[]|\bchoiceLog\b|\bchoice\s*[.[]/.test(engineCode), "엔진은 선택지/stats를 코드에서 참조하면 안 된다");

// ── 2) 사주 계산 경로 일치: normalizeSaju는 기본 분석과 동일한 computeNatalFromInput+KASI를 쓰고 timezone을 넘기지 않는다 ──
const norm = read("app/saju/love-simulation/_engine/normalizeSaju.ts");
check(/computeNatalFromInput/.test(norm) && /prefetchKasiContext/.test(norm), "normalizeSaju는 computeNatalFromInput + prefetchKasiContext를 써야 한다");
check(!/timezone\s*:/.test(norm), "normalizeSaju는 timezone을 넘기면 안 된다(기본 분석 일치)");

// ── 3) sajuAdapter: 공용 함수 export + calculateLocalResult가 이를 위임 ──
const adapter = read("app/saju/animal-destiny/lib/sajuAdapter.ts");
check(/export function computeNatalFromInput/.test(adapter), "sajuAdapter는 computeNatalFromInput을 export 해야 한다");
check(/export async function prefetchKasiContext/.test(adapter), "sajuAdapter는 prefetchKasiContext를 export 해야 한다");
check(/function calculateLocalResult[\s\S]{0,200}computeNatalFromInput\(input, kasi\)/.test(adapter), "calculateLocalResult는 computeNatalFromInput에 위임해야 한다(동물점 회귀 방지)");

// ── 4) 결과 화면: 점수/등급/관계유형은 profile에서만, 선택지 혼합 제거 ──
const comp = read("app/saju/love-simulation/_components/LoveSimulationEngine.tsx");
check(/buildSajuCompatibilityVerdict\(profile: CompatibilityProfile\)/.test(comp), "궁합 verdict 함수는 profile만 받아야 한다");
check(/buildSajuCompatibilityVerdict\(profile\)/.test(comp), "결과 화면은 profile로만 verdict를 만들어야 한다");
check(!/\*\s*0\.58|\*\s*0\.42/.test(comp), "선택지×사주 혼합 점수(0.58/0.42)는 제거돼야 한다");
check(/computeCompatibilityProfile\(selfNorm, partnerNorm, WEIGHTS\)/.test(comp), "진입 시 결정론 프로필을 계산해야 한다");

// ── 5) 캐릭터 일간(일주) 역검증: lunar-javascript(엔진과 동일 라이브러리)로 dayMaster 일치 ──
const HANJA_TO_KO = { 甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무", 己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계" };
const dayStemOf = (year, month, day, hour) => {
  const ganzhi = Solar.fromYmdHms(year, month, day, hour, 0, 0).getLunar().getDayInGanZhi();
  return HANJA_TO_KO[ganzhi[0]] || ganzhi[0];
};

const mvp = read("app/saju/love-simulation/_data/loveCodeMvp.ts");
const declared = {};
{
  const re = /id:\s*"([^"]+)"[\s\S]*?dayMaster:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(mvp))) declared[m[1]] = m[2];
}

const charts = read("app/saju/love-simulation/_data/characterCharts.ts");
const chartRe = /"?([a-z][a-z-]*)"?\s*:\s*\{[^}]*?birthDate:\s*"(\d{4})-(\d{2})-(\d{2})"[^}]*?birthTime:\s*"(\d{2}):\d{2}"/g;
let cm;
let charCount = 0;
while ((cm = chartRe.exec(charts))) {
  const [, id, y, mo, d, h] = cm;
  if (!(id in declared)) continue;
  charCount += 1;
  const want = declared[id].charAt(0); // dayMaster 천간
  const got = dayStemOf(Number(y), Number(mo), Number(d), Number(h));
  check(got === want, `캐릭터 ${id}: 일간 불일치(선언 ${want} vs 엔진 ${got}) — 생년월일 재지정 필요`);
}
check(charCount === 16, `캐릭터 원국 16개를 모두 파싱해야 한다(파싱 ${charCount}개)`);

if (failures.length) {
  console.error("❌ verify:love-compat FAIL");
  failures.forEach((f) => console.error("   - " + f));
  process.exit(1);
}
console.log(`✅ verify:love-compat OK — 궁합 결정론/사주 경로 일치/캐릭터 일간(${charCount}명) 검증 통과`);

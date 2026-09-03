// 프롬프트 허브 사주 명식 산출기 — 사용자가 입력한 출생 정보를 React 사주 엔진 정본
// (app/saju/animal-destiny/engine/localSajuCalculator.ts)으로 돌려, 프롬프트에 그대로 주입할
// 한국어 [사주 명식 산출 데이터] 블록을 만든다.
//
// 🔴 여기서 명리 계산을 새로 하지 않는다. 원국·오행·십성·격국·용신은 전부 엔진 반환값을 옮겨 적기만 하고,
//    대운 간지 흐름만 한국 음양력 코어의 daeun() 을 쓴다(엔진은 대운 시작 나이·방향까지만 낸다).
// 🔴 대운은 엔진과 코어의 방향·시작이 어긋나면 통째로 뺀다 — 둘은 일(日) 환산 관례가 달라
//    같은 값을 낼 의무가 없고, 어긋난 채로 찍으면 블록 안에서 서로 모순되는 근거가 된다.
import { BRANCH_HANGUL, branchIndexOf, daeun, formatPillar, STEM_HANJA, stemIndexOf, TERM_NAME_KO } from "@/lib/korean-calendar";
import { CHANG_SHENG, CHANG_SHENG_OFFSET, getXun, getXunKong, NAYIN } from "@/lib/saju/myeongri-tables";
import { calculateLocalSaju, type LocalSajuResult } from "../../saju/animal-destiny/engine/localSajuCalculator";

export type SajuFactsInput = {
  birthDate: string;
  calendarType?: string;
  leapMonth?: boolean;
  birthTime?: string;
  birthTimeUnknown?: boolean;
  birthPlace?: string;
  gender?: string;
};

type ParsedYmd = { year: number; month: number; day: number };

function parseYmd(value: string | undefined): ParsedYmd | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function parseHm(value: string | undefined): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || "").trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

// "음력"/"lunar" 만 음력, 그 외(빈값 포함)는 양력으로 본다(숙요점 산출기와 같은 판정).
function isLunarCalendar(value: string | undefined) {
  const key = String(value || "").trim().toLowerCase();
  return key === "음력" || key === "lunar";
}

function normalizeGender(value: string | undefined): "male" | "female" | "unknown" {
  const key = String(value || "").trim().toLowerCase();
  if (key === "남성" || key === "남" || key === "male" || key === "m") return "male";
  if (key === "여성" || key === "여" || key === "female" || key === "f") return "female";
  return "unknown";
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function formatDate(part: { year: number; month: number; day: number } | null | undefined) {
  if (!part) return "";
  return `${part.year}-${pad2(part.month)}-${pad2(part.day)}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** {십성: 점수} 에서 상위 몇 개만 "정인 1.15 · 정관 0.85" 로 줄인다. */
function topScores(scores: unknown, limit: number) {
  return Object.entries(asRecord(scores))
    .map(([name, value]) => ({ name, score: num(value) ?? 0 }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => `${row.name} ${row.score.toFixed(2)}`)
    .join(" · ");
}

const HOUR_POLICY_LABEL: Record<string, string> = {
  KST_CLOCK_TIME: "한국 표준시 시계 시각 그대로",
  LOCAL_MEAN_TIME: "출생지 경도 기준 평균태양시 보정",
  TRUE_SOLAR_TIME: "출생지 경도 + 균시차 기준 진태양시 보정",
};

// 엔진 내부 오행 키 → 한국어. 엔진이 영문 키로 돌려주는 자리(최강 오행·구조 이슈 근거)에만 쓴다.
const ELEMENT_KO: Record<string, string> = { wood: "목", fire: "화", earth: "토", metal: "금", water: "수" };

const PILLAR_KO: Record<string, string> = { year: "연주", month: "월주", day: "일주", hour: "시주" };

// 만세력 표(lib/saju/myeongri-tables.js)는 값을 간체 중국어로 들고 있고 그 파일은 손대지 않는 정본이라,
// 한글화는 소비자인 여기서 한다(worker/lib/life-book-ai-saju.js 와 같은 방식).
const NAYIN_KO: Record<string, string> = {
  海中金: "해중금", 沙中金: "사중금", 炉中火: "노중화", 山下火: "산하화", 大林木: "대림목",
  平地木: "평지목", 路旁土: "노방토", 壁上土: "벽상토", 剑锋金: "검봉금", 金箔金: "금박금",
  山头火: "산두화", 覆灯火: "복등화", 涧下水: "간하수", 天河水: "천하수", 城头土: "성두토",
  大驿土: "대역토", 白蜡金: "백랍금", 钗钏金: "차천금", 杨柳木: "양류목", 桑柘木: "상자목",
  泉中水: "천중수", 大溪水: "대계수", 屋上土: "옥상토", 沙中土: "사중토", 霹雳火: "벽력화",
  天上火: "천상화", 松柏木: "송백목", 石榴木: "석류목", 长流水: "장류수", 大海水: "대해수",
};

const CHANG_SHENG_KO: Record<string, string> = {
  长生: "장생", 沐浴: "목욕", 冠带: "관대", 临官: "임관", 帝旺: "제왕", 衰: "쇠",
  病: "병", 死: "사", 墓: "묘", 绝: "절", 胎: "태", 养: "양",
};

/** 한자 지지 한 글자 → 한글. 코어의 인덱스 조회를 그대로 쓴다. 못 읽으면 원문. */
function branchToKo(hanja: string) {
  const index = branchIndexOf(hanja);
  return index < 0 ? hanja : BRANCH_HANGUL[index];
}

/** 한자 간지 두 글자("甲子") → 한글("갑자"). 못 읽으면 원문. */
function ganjiToKo(hanja: string) {
  const stemIndex = stemIndexOf(hanja.charAt(0));
  const branchIndex = branchIndexOf(hanja.charAt(1));
  return stemIndex < 0 || branchIndex < 0 ? hanja : formatPillar(stemIndex, branchIndex, "hangul");
}

/** 엔진이 돌려주는 한글 기둥("갑술")을 만세력 표의 키인 한자("甲戌")로 바꾼다. 못 읽으면 "". */
function toHanjaPillar(pillar: { stem?: string; branch?: string } | null | undefined) {
  const stemIndex = stemIndexOf(pillar?.stem);
  const branchIndex = branchIndexOf(pillar?.branch);
  if (stemIndex < 0 || branchIndex < 0) return "";
  return formatPillar(stemIndex, branchIndex, "hanja");
}

/**
 * 만세력 파생값 — 납음·십이운성·순(旬).
 *
 * 🔴 십이운성 구현이 레포에 셋 있는데(오프셋 공식 / calculateTwelveLifeStage.ts 하드코딩 표 /
 * twelveStages.ts) 워커 상담이 쓰는 `myeongri-tables.js` 오프셋 공식 하나로 고정한다 —
 * 화면과 상담이 서로 다른 값을 말하지 않게 하려는 것이다.
 *
 * 🔴 공망은 **일주 기준 한 번만** 낸다. 표의 `getXunKong` 은 "그 기둥이 속한 순의 공망"이라
 * 기둥마다 다른 값이 나오는데, 해석에서 쓰는 공망은 일주가 속한 순의 공망이다.
 * 기둥별로 늘어놓으면 엔진의 공망 판정(natalAnalysis.shinsalAnalysis)과 어긋나 보인다.
 */
function buildManseryeokLines(
  pillars: Record<string, { stem?: string; branch?: string; ganji?: string } | null | undefined>,
  dayStemHangul: string,
) {
  const dayStemIndex = stemIndexOf(dayStemHangul);
  const changShengOffset = dayStemIndex < 0 ? undefined : CHANG_SHENG_OFFSET[STEM_HANJA[dayStemIndex]];

  const rows: string[] = [];
  for (const key of ["year", "month", "day", "hour"]) {
    const pillar = pillars[key];
    const hanja = toHanjaPillar(pillar);
    if (!hanja) continue;

    const parts = [`${PILLAR_KO[key]} ${pillar?.ganji || ""}`.trim()];
    const nayin = NAYIN[hanja];
    if (nayin) parts.push(`납음 ${NAYIN_KO[nayin] || nayin}`);

    const branchIndex = branchIndexOf(pillar?.branch);
    if (branchIndex >= 0 && Number.isFinite(changShengOffset)) {
      // 양간(짝수 인덱스)은 지지를 더하며 순행, 음간은 빼며 역행한다.
      const raw = (changShengOffset as number) + (dayStemIndex % 2 === 0 ? branchIndex : -branchIndex);
      const stage = CHANG_SHENG[((raw % 12) + 12) % 12];
      if (stage) parts.push(`십이운성 ${CHANG_SHENG_KO[stage] || stage}`);
    }

    const xun = getXun(hanja);
    if (xun) parts.push(`${ganjiToKo(xun)}순`);

    rows.push(`- 만세력 ${parts.join(" · ")}`);
  }

  const dayHanja = toHanjaPillar(pillars.day);
  const kong = dayHanja ? getXunKong(dayHanja) : "";
  if (kong) rows.push(`- 공망(空亡, 일주 기준): ${kong.split("").map(branchToKo).join("·")}`);

  return rows;
}

const TERM_SOURCE_LABEL: Record<string, string> = {
  kasi: "한국천문연구원(KASI) 발표값",
  "korean-calendar-core": "한국 음양력 코어 절기표",
  "validated-table": "검증된 절기표",
  "fixed-fallback": "고정 근사값(정밀도 낮음)",
};

function formatTerm(term: unknown) {
  const row = asRecord(term);
  // 엔진의 term.index 는 12절 기준이라 24절기 표에 그대로 못 넣는다. 황경으로 되짚어 한글 이름을 쓴다
  // (엔진이 돌려주는 한자 이름에는 간체자가 섞여 있다 — 芒种).
  const longitude = num(row.solarLongitude);
  const nameKo = longitude === null ? "" : TERM_NAME_KO[(((longitude - 285) / 15) % 24 + 24) % 24] || "";
  const name = nameKo || text(row.name);
  if (!name) return "";
  const iso = text(row.isoLocal).replace("T", " ").slice(0, 16);
  const source = TERM_SOURCE_LABEL[text(row.source)] || text(row.source);
  return `${name}${iso ? ` ${iso} KST` : ""}${source ? ` (근거: ${source})` : ""}`;
}

/**
 * 대운 줄. 성별이 없으면 순행/역행 자체가 정해지지 않아 엔진이 "unknown" 을 돌려주므로 추측하지 않는다.
 *
 * 간지 흐름은 한국 음양력 코어 daeun() 하나만 쓴다 — 입운 시점과 간지를 같은 곳에서 뽑아야
 * 블록 안에서 서로 어긋나지 않는다. 엔진의 방향은 교차검증용으로만 쓰고, 어긋나면 흐름을 뺀다.
 */
function buildDaewoonLines(local: LocalSajuResult, birth: ParsedYmd, hm: { hour: number; minute: number } | null, gender: "male" | "female" | "unknown") {
  if (gender === "unknown") {
    return ["- 대운: 성별을 입력하지 않아 순행/역행이 정해지지 않습니다. 대운을 단정하지 말고 성별 확인을 먼저 제안하세요."];
  }
  const forward = local.daewoonDirection === "forward";
  const directionKo = forward ? "순행" : "역행";
  const baseTerm = formatTerm(local.daewoonStart.baseTerm);
  const flow =
    local.daewoonDirection === "unknown"
      ? null
      : daeun(
          { year: birth.year, month: birth.month, day: birth.day, hour: hm?.hour ?? 12, minute: hm?.minute ?? 0 },
          { gender: gender === "male" ? "M" : "F", count: 9 },
        );
  if (!flow || flow.forward !== forward) {
    // 방향이 어긋나면(또는 엔진이 방향을 못 정하면) 간지 흐름은 내지 않는다 — 틀린 흐름보다 없는 편이 낫다.
    const startAge = local.daewoonStartAge;
    return [
      `- 대운: ${local.daewoonDirection === "unknown" ? "방향 미산출" : directionKo}${startAge === null ? "" : ` · 대운수 약 ${startAge}세`}` +
        `${baseTerm ? ` (기준 절기 ${baseTerm})` : ""}`,
    ];
  }
  const start = flow.start;
  const lines = [
    `- 대운: ${directionKo} · 출생 후 ${start.years}년 ${start.months}개월 ${start.days}일에 입운${baseTerm ? ` (기준 절기 ${baseTerm})` : ""}`,
  ];
  const nowYear = new Date().getFullYear();
  // 코어는 간지를 못 정한 구간을 stemIndex: null 로 돌려준다. filter 로는 좁혀지지 않는 유니온이라
  // map 안에서 걸러 낸 뒤 빈 문자열을 떨군다.
  const cycles = flow.cycles
    .map((cycle) => {
      if (cycle.stemIndex === null || cycle.branchIndex === null) return "";
      const label = `${cycle.startYear}~${cycle.endYear} ${formatPillar(cycle.stemIndex, cycle.branchIndex, "hangul")}`;
      return nowYear >= cycle.startYear && nowYear <= cycle.endYear ? `${label}(현재 대운)` : label;
    })
    .filter(Boolean);
  if (cycles.length) lines.push(`- 대운 흐름(연도 구간): ${cycles.join(" · ")}`);
  return lines;
}

/**
 * 사주 명식 산출 데이터 블록. 생년월일을 못 읽거나 엔진이 실패하면 빈 문자열을 돌려주어
 * 호출부가 조용히 골격만 출력하도록 한다(숙요점 산출기와 같은 계약).
 */
export function buildSajuPromptFacts(input: SajuFactsInput): string {
  try {
    const birth = parseYmd(input.birthDate);
    if (!birth) return "";
    const hm = input.birthTimeUnknown ? null : parseHm(input.birthTime);
    const hasTime = Boolean(hm);
    const gender = normalizeGender(input.gender);
    const lunarInput = isLunarCalendar(input.calendarType);

    const local = calculateLocalSaju({
      year: birth.year,
      month: birth.month,
      day: birth.day,
      hour: hm?.hour,
      minute: hm?.minute,
      hasTime,
      calendarType: lunarInput ? "lunar" : "solar",
      lunarLeap: lunarInput && Boolean(input.leapMonth),
      timezone: "Asia/Seoul",
      birthplace: text(input.birthPlace),
      gender,
    });

    const natal = local.natalAnalysis;
    const dayMaster = asRecord(natal.dayMaster);
    const monthCommand = asRecord(natal.monthCommand);
    const fiveElements = asRecord(natal.fiveElements);
    const tenGods = asRecord(natal.tenGods);
    const gyeokguk = asRecord(natal.gyeokgukAnalysis);
    const yongshin = asRecord(natal.yongshinAnalysis);
    const johu = asRecord(natal.johu);
    const evidence = asRecord(local.calculationEvidence);
    const solarDate = formatDate(asRecord(evidence.solarDate) as unknown as ParsedYmd);

    const lines: string[] = ["[사주 명식 산출 데이터]"];

    lines.push(`- 입력 생년월일: ${input.birthDate} (${lunarInput ? `음력${input.leapMonth ? " 윤달" : ""}` : "양력"})`);
    if (solarDate && solarDate !== input.birthDate) lines.push(`- 절기 판정에 쓴 양력 환산일: ${solarDate}`);
    lines.push(`- 출생 시각: ${hasTime ? `${input.birthTime} (한국 표준시)` : "미상 — 시주(時柱)를 세우지 않았습니다"}`);
    if (text(input.birthPlace)) lines.push(`- 출생 지역(입력): ${text(input.birthPlace)}`);

    const pillars = local.pillars;
    lines.push(
      `- 사주 원국: 연주 ${pillars.year.ganji} / 월주 ${pillars.month.ganji} / 일주 ${pillars.day.ganji} / 시주 ${pillars.hour?.ganji || "미산출(출생 시각 미상)"}`,
    );
    lines.push(...buildManseryeokLines(pillars as never, text(dayMaster.stem) || local.dayStem));

    const strength = text(dayMaster.strength);
    const strengthIndex = num(dayMaster.strengthIndex);
    lines.push(
      `- 일간: ${text(dayMaster.stem) || local.dayStem}(${text(dayMaster.elementKo)}, ${dayMaster.polarity === "yin" ? "음" : "양"})` +
        `${strength ? ` · 신강신약 ${strength}` : ""}${strengthIndex === null ? "" : ` (강약지수 ${strengthIndex})`}`,
    );

    const hiddenStems = Array.isArray(monthCommand.hiddenStems) ? (monthCommand.hiddenStems as Array<Record<string, unknown>>) : [];
    lines.push(
      `- 월령(月令): 월지 ${text(monthCommand.branch)} · ${text(monthCommand.season)} · 사령 ${text(monthCommand.commandingElementKo)}` +
        (hiddenStems.length ? ` · 월지 지장간 ${hiddenStems.map((row) => `${text(row.stem)}(${text(row.tenGod)})`).join(", ")}` : ""),
    );

    const ranking = Array.isArray(fiveElements.ranking) ? (fiveElements.ranking as Array<Record<string, unknown>>) : [];
    if (ranking.length) {
      lines.push(`- 오행 유효세력(강한 순): ${ranking.map((row) => `${text(row.elementKo)} ${num(row.power) ?? 0}`).join(" > ")}`);
    }

    const visibleTenGods = topScores(tenGods.visible, 4);
    const hiddenTenGods = topScores(tenGods.hidden, 4);
    if (visibleTenGods) lines.push(`- 십성(천간에 드러난 것): ${visibleTenGods}`);
    if (hiddenTenGods) lines.push(`- 십성(지장간에 숨은 것): ${hiddenTenGods}`);

    const finalGyeokguk = text(gyeokguk.finalGyeokguk);
    if (finalGyeokguk) {
      const candidates = Array.isArray(gyeokguk.candidates) ? (gyeokguk.candidates as Array<Record<string, unknown>>) : [];
      const top = asRecord(candidates.find((row) => text(row.name) === finalGyeokguk) || candidates[0]);
      // 월지 지장간 후보의 reason 문자열은 엔진이 조사를 잘못 붙여 만든다("정가 천간에 투출"). 구조화 필드로 다시 쓴다.
      const reason =
        text(top.source) === "월지 지장간" && text(top.monthHiddenStem)
          ? `월지 ${text(monthCommand.branch)}의 ${text(top.hiddenRole)} ${text(top.monthHiddenStem)}(${text(top.tenGod)}) ${top.protruded ? "천간 투출" : "천간 미투출"}`
          : text(top.reason);
      lines.push(
        `- 격국: ${finalGyeokguk}(${text(gyeokguk.finalType)})${reason ? ` — ${reason}` : ""}` +
          (text(top.caution) ? ` · 주의: ${text(top.caution)}` : ""),
      );
    }

    const yongshinKo = text(yongshin.coreYongshinKo);
    if (yongshinKo) {
      const heesin = (yongshin.heesinKo as string[] | undefined)?.filter(Boolean) || [];
      const gisin = (yongshin.gisinKo as string[] | undefined)?.filter(Boolean) || [];
      lines.push(
        `- 용신: ${yongshinKo}${heesin.length ? ` · 희신 ${heesin.join(", ")}` : ""}${gisin.length ? ` · 기신 ${gisin.join(", ")}` : ""}`,
      );
      // 🔴 judgment.reason 문자열은 쓰지 않는다 — 엔진이 오행을 중복해 넣고 조사도 어긋난 채 만든다
      //    ("화, 화가 균형을 잡는다"). 같은 판단을 구조화된 필드에서 직접 조립한다.
      const judgment = asRecord(yongshin.judgment);
      const judgeParts = [
        text(judgment.dayMasterStrength) && `일간 ${text(judgment.dayMasterStrength)}`,
        text(judgment.gyeokguk) && `격국 ${text(judgment.gyeokguk)}`,
        ELEMENT_KO[text(judgment.strongestElement)] && `최강 오행 ${ELEMENT_KO[text(judgment.strongestElement)]}`,
      ].filter(Boolean);
      if (judgeParts.length) lines.push(`- 용신 판단 근거: ${judgeParts.join(" · ")}`);
      const disease = asRecord(yongshin.disease);
      if (text(disease.name)) lines.push(`- 병약(病藥): ${text(disease.name)} — ${text(disease.reason)}`);
      const required = asRecord(yongshin.requiredExplanation);
      const roots = [
        ...(Array.isArray(required.heavenlyStemLocations) ? (required.heavenlyStemLocations as Array<Record<string, unknown>>) : []).map(
          (row) => `${PILLAR_KO[text(row.pillar)] || text(row.pillar)} 천간 ${text(row.stem)}`,
        ),
        ...(Array.isArray(required.branchLocations) ? (required.branchLocations as Array<Record<string, unknown>>) : []).map(
          (row) => `${PILLAR_KO[text(row.pillar)] || text(row.pillar)} 지지 ${text(row.branch)}`,
        ),
        ...(Array.isArray(required.hiddenStemLocations) ? (required.hiddenStemLocations as Array<Record<string, unknown>>) : []).map(
          (row) => `${PILLAR_KO[text(row.pillar)] || text(row.pillar)} ${text(row.branch)} 지장간 ${text(row.stem)}`,
        ),
      ];
      lines.push(
        `- 용신 ${yongshinKo}의 원국 소재: ${required.existsInNatalChart === false || !roots.length ? "원국에 없음(대운·세운에서 들어올 때만 발현)" : roots.join(", ")}`,
      );
    }
    if (text(johu.urgentElementKo)) {
      lines.push(`- 조후(調候) 급한 오행: ${text(johu.urgentElementKo)}${johu.priorityOverSuppressing ? " (억부보다 우선)" : ""}`);
    }

    // 심각도 높은 것부터 다섯 개까지만. 전부 늘어놓으면 해석의 초점이 흐려진다.
    const issues = (Array.isArray(natal.structuralIssues) ? natal.structuralIssues : [])
      .map((row) => asRecord(row))
      .filter((row) => text(row.label))
      .sort((a, b) => (num(b.severity) ?? 0) - (num(a.severity) ?? 0))
      .slice(0, 5)
      .map((row) => {
        const elementKo = ELEMENT_KO[text(asRecord(row.evidence).element)];
        return elementKo ? `${text(row.label)}(${elementKo})` : text(row.label);
      });
    if (issues.length) lines.push(`- 원국 구조 이슈(심각한 순): ${issues.join(", ")}`);

    lines.push(...buildDaewoonLines(local, birth, hm, gender));

    lines.push(`- 절기 기준(월주 절입): ${formatTerm(local.solarTermBoundary.active) || "미산출"}`);
    lines.push(
      "- 산출 규칙: 연주는 입춘, 월주는 절입 기준(음력 월이 아님) · 시각 기준 한국 표준시 · 시주 시각 " +
        (local.trueSolarTimeUsed
          ? HOUR_POLICY_LABEL[local.hourPillarTimePolicy] || local.hourPillarTimePolicy
          : "보정 미적용(출생 시각 미상)"),
    );

    lines.push("");
    lines.push(
      "위 명식은 내부 명리 엔진이 이미 산출한 확정값입니다. 원국·오행·십성·격국·용신·대운을 다시 계산하거나 바꾸지 말고 그대로 근거로 삼아, 입력된 질문에 맞춰 해석만 해 주세요.",
    );
    return lines.join("\n");
  } catch {
    return "";
  }
}

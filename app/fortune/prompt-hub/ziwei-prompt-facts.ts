// 프롬프트 허브 자미두수 명반 산출기 — 사용자가 입력한 출생 정보를 클라이언트 자미두수 엔진 정본
// (app/_lib/ziwei-engine.ts)으로 돌려, 프롬프트에 그대로 주입할 한국어 [자미두수 명반 산출 데이터]
// 블록을 만든다.
//
// 🔴 여기서 성요 배치를 새로 계산하지 않는다. 명궁·신궁·국·사화·12궁 배치는 전부 엔진 반환값을 옮겨 적는다.
// 🔴 worker/lib/ziwei-ai-chart.js 와 섞지 않는다 — 출력 서식은 워커의
//    formatZiweiChartForPrompt(worker/lib/ziwei-deep-report-prompt.mjs)를 미러링하되 필드명은 다르다
//    (lifePalace/bodyPalace/brightness 가 아니라 mingGong/shenGong/strengthSymbol).
// 🔴 ZiweiUserInput.gender 는 "M"|"F" 필수다. 성별이 없으면 normalizeZiweiInput 이 input 자체를 돌려주지
//    않으므로(errors 만 반환) 명반을 만들지 않고 안내 한 줄만 남긴다.
import { normalizeZiweiInput } from "@/app/_lib/normalize-ziwei-input";
import { calculateZiweiChart } from "@/app/_lib/ziwei-engine";
import type { ZiweiPalace, ZiweiStarMeta } from "@/app/_lib/ziwei-types";

export type ZiweiFactsInput = {
  birthDate: string;
  calendarType?: string;
  leapMonth?: boolean;
  birthTime?: string;
  birthTimeUnknown?: boolean;
  birthPlace?: string;
  gender?: string;
  /** 자미두수 도구의 "분석 궁" 선택값. 요약 분량에서 함께 실을 궁 하나를 고른다. */
  palace?: string;
};

export type ZiweiFactsOptions = {
  /** "full" = 12궁 전체(자미두수 도구), "summary" = 명궁·신궁·생년사화 + 선택 궁(종합). */
  scope?: "full" | "summary";
};

/** 성별 미입력 안내 — 명반 없이 이 한 줄만 나간다. */
export const ZIWEI_GENDER_REQUIRED_LINE =
  "- 자미두수: 성별을 입력하면 명반(12궁 성요 배치·사화)을 산출해 드립니다.";

function parseYmd(value: string | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function parseHm(value: string | undefined) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || "").trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

// "음력"/"lunar" 만 음력, 그 외(빈값 포함)는 양력으로 본다(사주·숙요점 산출기와 같은 판정).
function isLunarCalendar(value: string | undefined) {
  const key = String(value || "").trim().toLowerCase();
  return key === "음력" || key === "lunar";
}

/** 허브 입력("여성")을 엔진이 요구하는 "M"|"F" 로. 못 읽으면 null — 이때 명반을 만들지 않는다. */
function normalizeGender(value: string | undefined): "M" | "F" | null {
  const key = String(value || "").trim().toLowerCase();
  if (key === "남성" || key === "남" || key === "male" || key === "m") return "M";
  if (key === "여성" || key === "여" || key === "female" || key === "f") return "F";
  return null;
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

// 도구의 "분석 궁" 선택지와 엔진 궁 이름이 한 곳에서 어긋난다(부처궁 ↔ 부부궁).
const PALACE_ALIAS: Record<string, string> = { 부처궁: "부부궁", 처첩궁: "부부궁", 관록: "관록궁", 명궁: "명궁" };

function resolvePalace(palaces: ZiweiPalace[], label: string): ZiweiPalace | null {
  const wanted = PALACE_ALIAS[label] || label;
  if (!wanted) return null;
  return palaces.find((palace) => palace.name === wanted || palace.normalizedName === wanted) || null;
}

/** "태음△" · 사화가 붙은 별은 "파군◎(화권)". 강약 기호가 없으면 이름만(추정 금지). */
function starText(star: ZiweiStarMeta) {
  const name = text(star?.name);
  if (!name) return "";
  const transformation = text(star?.transformation);
  return `${name}${text(star?.strengthSymbol)}${transformation ? `(${transformation})` : ""}`;
}

function starList(stars: ZiweiStarMeta[] | undefined) {
  return (stars || []).map(starText).filter(Boolean).join(" ");
}

/** "· 명궁(묘): 주성 태음△ / 보좌 … / 흉성 …" — 워커 formatZiweiChartForPrompt 의 행 서식. */
function palaceRow(palace: ZiweiPalace) {
  const main = starList(palace.mainStars);
  const aux = starList(palace.auxiliaryStars);
  const malefic = starList(palace.maleficStars);
  let row = `  · ${palace.name}(${palace.branch || palace.earthlyBranch || "-"}): 주성 ${main || "없음(공궁)"}`;
  if (aux) row += ` / 보좌 ${aux}`;
  if (malefic) row += ` / 흉성 ${malefic}`;
  return row;
}

export function buildZiweiPromptFacts(input: ZiweiFactsInput, options: ZiweiFactsOptions = {}): string {
  try {
    const scope = options.scope === "summary" ? "summary" : "full";
    const birth = parseYmd(input.birthDate);
    if (!birth) return "";

    const gender = normalizeGender(input.gender);
    if (!gender) return ZIWEI_GENDER_REQUIRED_LINE;

    const hm = input.birthTimeUnknown ? null : parseHm(input.birthTime);
    const lunarInput = isLunarCalendar(input.calendarType);

    const normalized = normalizeZiweiInput({
      birthYear: birth.year,
      birthMonth: birth.month,
      birthDay: birth.day,
      birthHour: hm?.hour,
      birthMinute: hm?.minute,
      unknownHour: !hm,
      gender,
      calendarType: lunarInput ? "lunar" : "solar",
      isLeapMonth: lunarInput && Boolean(input.leapMonth),
      birthPlace: text(input.birthPlace),
      locale: "ko",
    });
    if (!normalized.input) return "";

    const chart = calculateZiweiChart(normalized.input);
    const palaces = chart.palaces || [];

    const lines: string[] = ["[자미두수 명반 산출 데이터]"];
    lines.push(`- 입력 생년월일: ${input.birthDate} (${lunarInput ? `음력${input.leapMonth ? " 윤달" : ""}` : "양력"})`);
    lines.push(
      `- 출생 시각: ${hm ? `${input.birthTime} (한국 표준시)` : "미상 — 시(時)를 정오로 두고 배치했으므로 명궁·신궁은 참고값입니다"}`,
    );
    lines.push(`- 성별: ${gender === "M" ? "남성" : "여성"}`);
    lines.push(`- 명궁(命宮): ${chart.mingGong || "미상"} · 신궁(身宮): ${chart.shenGong || "미상"}`);
    lines.push(`- 생년간지: ${chart.yearGan}${chart.yearZhi} · 국(局): ${chart.juInfo || "미상"}`);

    const byType = chart.fourTransformations?.byType || {};
    const sihua = (["록", "권", "과", "기"] as const)
      .map((type) => {
        const entry = byType[type];
        if (!entry?.starName) return "";
        return `화${type} ${entry.starName}${entry.palaceName ? `(${entry.palaceName})` : ""}`;
      })
      .filter(Boolean)
      .join(" · ");
    if (sihua) lines.push(`- 생년사화(四化): ${sihua}`);

    lines.push(
      "- 강약 표기 범례: ◎=묘(최상) · O=득(득지) · ▲=리(이로움) · △=평(균형) · X=함(주의). 기호가 없는 별은 강약 미표기(추정 금지).",
    );

    if (scope === "full") {
      lines.push("- 12궁 배치(강약 포함):");
      for (const palace of palaces) lines.push(palaceRow(palace));

      const palaceNameById = new Map(palaces.map((palace) => [palace.id, palace.name]));
      const periods = (chart.majorPeriods || [])
        .map((period) => `${palaceNameById.get(period.palaceId) || period.palaceId} ${period.range}`)
        .join(" · ");
      if (periods) lines.push(`- 대한(大限) 구간: ${periods}`);
    } else {
      const mingGong = palaces.find((palace) => palace.id === "ming");
      const selected = resolvePalace(palaces, text(input.palace));
      const shown = [mingGong, selected && selected.id !== "ming" ? selected : null].filter(Boolean) as ZiweiPalace[];
      if (shown.length) {
        lines.push("- 궁 배치(요약):");
        for (const palace of shown) lines.push(palaceRow(palace));
      }
    }

    lines.push("- 산출 규칙: 시각 기준 한국 표준시 · 음력 입력은 양력으로 환산한 뒤 배치 · 궁명은 한국 자미두수 통용 명칭");

    if (scope === "full") {
      lines.push("");
      lines.push(
        "위 명반은 내부 자미두수 엔진이 이미 산출한 확정값입니다. 궁의 위치·별의 배치·강약·사화를 다시 계산하거나 바꾸지 말고 그대로 근거로 삼아, 입력된 질문에 맞춰 해석만 해 주세요. 표에 없는 별을 만들어 넣지 마세요.",
      );
    }
    return lines.join("\n");
  } catch {
    return "";
  }
}

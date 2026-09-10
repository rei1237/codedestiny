// 숙요의 본명숙은 한국 음양력 월일 룩업이 아니라 Swiss Ephemeris 달 황경을
// 공통 27등분 매퍼에 넣어 산출한다. 음력은 표시·입력 검증용으로만 사용한다.
import { solarToLunar } from "@/lib/korean-calendar";
import {
  buildSukuyoAiCompatibility,
  describeSukuyoDirectionalRelation,
} from "@/worker/lib/sukuyo-ai-calculation.js";
import { buildSukuyoFromMoonLongitude } from "@/worker/lib/sukuyo-astronomy.js";
import type { SukuyoPromptAstronomy } from "./sukuyo-prompt-astronomy";

// 프롬프트 허브 숙요점 도구 전용 — 이미 계산된 Swiss Ephemeris 달 황경을
// 공통 27숙 매퍼로 옮겨 한국어 [산출 데이터] 블록을 만든다. 황경이 없는
// 호출은 오래된 음력 월일 룩업으로 대체하지 않고 계산 필요 상태를 명시한다.

export type SukuyoFactsInput = {
  birthDate: string;
  calendarType?: string;
  leapMonth?: boolean;
  partnerBirthDate?: string;
  partnerCalendarType?: string;
  partnerLeapMonth?: boolean;
  relationshipType?: string;
  birthTime?: string;
  birthTimeUnknown?: boolean;
  birthPlace?: string;
  birthTimezone?: string;
  moonLongitude?: number;
  partnerMoonLongitude?: number;
  astronomy?: SukuyoPromptAstronomy | null;
  partnerAstronomy?: SukuyoPromptAstronomy | null;
};

type ParsedYmd = { year: number; month: number; day: number };
type LunarBirth = { lunarMonth: number; lunarDay: number; isLeapMonth: boolean };

function parseYmd(value: string | undefined): ParsedYmd | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

// "음력"/"lunar" 만 음력, 그 외(빈값 포함)는 양력으로 본다.
function isLunarCalendar(value: string | undefined) {
  const key = String(value || "").trim().toLowerCase();
  return key === "음력" || key === "lunar" || key === "lunar_leap";
}

// 코어 지원 범위(1900~2100) 밖이면 null 이다 — 조용히 중국 달력으로 떨어지지 않는다.
function toLunarBirth(birth: ParsedYmd, calendarType: string | undefined, leapMonth = false): LunarBirth | null {
  if (isLunarCalendar(calendarType)) {
    return { lunarMonth: birth.month, lunarDay: birth.day, isLeapMonth: leapMonth };
  }
  const lunar = solarToLunar(birth.year, birth.month, birth.day);
  if (!lunar) return null;
  return { lunarMonth: lunar.lunarMonth, lunarDay: lunar.lunarDay, isLeapMonth: lunar.isLeapMonth };
}

function mansionFor(
  birthDate: string,
  calendarType: string | undefined,
  leapMonth: boolean,
  moonLongitude?: number,
) {
  const birth = parseYmd(birthDate);
  if (!birth) return null;
  const lunar = toLunarBirth(birth, calendarType, leapMonth);
  if (!lunar) return null;
  // 이 동기 프롬프트 조립기는 이미 계산된 Swiss 황경만 소비한다. 황경이 없는
  // 호출은 오래된 음력 룩업으로 대체하지 않고 빈 근거 블록으로 남긴다.
  const mansion = buildSukuyoFromMoonLongitude(moonLongitude, {
    lunarMonth: lunar.lunarMonth,
    lunarDay: lunar.lunarDay,
    isLeapMonth: lunar.isLeapMonth,
    source: "swiss-ephemeris-lahiri",
  });
  if (!mansion) return null;
  return mansion;
}

function astronomyLines(label: string, astronomy?: SukuyoPromptAstronomy | null) {
  if (!astronomy) return [];
  const lines: string[] = [];
  const longitude = Number(astronomy.moonSiderealLongitude ?? astronomy.moonEclipticLongitude);
  if (Number.isFinite(longitude)) lines.push(`- ${label} 달 황경: ${longitude.toFixed(6)}° (지심·항성·라히리)`);
  if (astronomy.utcIso) lines.push(`- ${label} UTC: ${astronomy.utcIso}`);
  if (Number.isFinite(Number(astronomy.julianDate))) lines.push(`- ${label} JD(UT): ${Number(astronomy.julianDate).toFixed(8)}`);
  const location = astronomy.birthTimeContext?.location;
  const trueSolar = astronomy.birthTimeContext?.trueSolar;
  if (location && trueSolar) {
    const correctedDate = [trueSolar.year, trueSolar.month, trueSolar.day]
      .every((value) => Number.isFinite(Number(value)))
      ? `${trueSolar.year}-${String(trueSolar.month).padStart(2, "0")}-${String(trueSolar.day).padStart(2, "0")} ${String(trueSolar.hour ?? 0).padStart(2, "0")}:${String(trueSolar.minute ?? 0).padStart(2, "0")}`
      : "";
    lines.push(
      `- ${label} 진태양시: ${correctedDate || "미산출"} · 경도 보정 ${Number(trueSolar.longitudeCorrectionMinutes || 0).toFixed(2)}분`
        + ` · 출생지 좌표 ${Number(location.latitude).toFixed(4)}, ${Number(location.longitude).toFixed(4)}`
        + `${location.provided === true ? "" : " (출생지 미입력으로 서울 기준)"}`,
    );
  }
  return lines;
}

function mansionLabel(mansion: any) {
  const ko = String(mansion?.nameKo || "").trim();
  const han = String(mansion?.nameHan || "").trim();
  const name = ko ? `${ko}숙` : "본명숙";
  return han ? `${name}(${han}宿)` : name;
}

function mansionLine(mansion: any) {
  const meta = [mansion?.direction, mansion?.element].filter(Boolean).join("/");
  const keywords = Array.isArray(mansion?.keywords) ? mansion.keywords.slice(0, 3).join(", ") : "";
  const parts = [mansionLabel(mansion)];
  if (meta) parts.push(meta);
  if (keywords) parts.push(`키워드: ${keywords}`);
  return parts.join(" · ");
}

/**
 * 숙요점 프롬프트에 붙일 산출 데이터 블록. 생년월일이 없거나 계산이 실패하면 빈 문자열을
 * 돌려주어 호출부가 조용히 골격만 출력하도록 한다(회귀 방지).
 */
export function buildSukuyoPromptFacts(input: SukuyoFactsInput): string {
  try {
    const myMansion = mansionFor(input.birthDate, input.calendarType, input.leapMonth === true, input.moonLongitude);
    if (!myMansion) return "";

    const lines: string[] = ["[숙요점 산출 데이터]"];
    lines.push(`- 나의 본명숙: ${mansionLine(myMansion)}`);
    lines.push(...astronomyLines("나의", input.astronomy));

    const partnerMansion = input.partnerBirthDate
      ? mansionFor(input.partnerBirthDate, input.partnerCalendarType, input.partnerLeapMonth === true, input.partnerMoonLongitude)
      : null;

    if (!partnerMansion) {
      lines.push("- 상대 본명숙: 미입력 (상대 생년월일을 넣으면 두 사람의 구요 관계까지 산출됩니다)");
      lines.push("- 산출 기준: KST/출생지 시간대 → UTC·JD → Swiss Ephemeris 라히리 달 황경의 27등분");
      lines.push("");
      lines.push(
        "위 값은 이미 정확히 산출된 확정 데이터입니다. 본명숙을 다시 계산하지 말고 그대로 해석에 사용하세요.",
      );
      return lines.join("\n");
    }

    lines.push(`- 상대의 본명숙: ${mansionLine(partnerMansion)}`);
    lines.push(...astronomyLines("상대", input.partnerAstronomy));

    const compatibility = buildSukuyoAiCompatibility(myMansion, partnerMansion);
    const directional = describeSukuyoDirectionalRelation(
      compatibility.forwardDistance,
      compatibility.reverseDistance,
    );
    const totalScore = Math.max(
      1,
      Math.min(
        99,
        Math.round(
          (Number(compatibility.chemistryScore) +
            Number(compatibility.stabilityScore) +
            (100 - Number(compatibility.conflictScore))) /
            3,
        ),
      ),
    );

    if (input.relationshipType) lines.push(`- 관계 유형(입력): ${input.relationshipType}`);
    lines.push(
      `- 두 사람의 구요 관계: ${compatibility.relationType}(${compatibility.relationTypeHan}) · 거리 ${compatibility.distanceLabel}(${compatibility.directionFromAToB} / ${compatibility.directionFromBToA})`,
    );
    lines.push(
      `- 궁합 지수: 케미 ${compatibility.chemistryScore} / 안정 ${compatibility.stabilityScore} / 갈등 ${compatibility.conflictScore} (종합 궁합 ${totalScore})`,
    );
    if (directional) {
      lines.push(`- 나의 자리: ${directional.aRoleLabel} — ${directional.aRoleMeaning}`);
      lines.push(`- 상대의 자리: ${directional.bRoleLabel} — ${directional.bRoleMeaning}`);
      if (directional.directionalDistanceGuide) {
        lines.push(`- 방향 해설: ${directional.directionalDistanceGuide}`);
      }
    }
    const guide = compatibility.roleActionGuide;
    if (guide?.meAction) lines.push(`- 역할 가이드(나): ${guide.meAction}`);
    if (guide?.otherAction) lines.push(`- 역할 가이드(상대): ${guide.otherAction}`);
    lines.push("- 산출 기준: KST/출생지 시간대 → UTC·JD → Swiss Ephemeris 라히리 달 황경의 27등분 + 27숙 구요 관계");
    lines.push("");
    lines.push(
      "위 값은 이미 정확히 산출된 확정 데이터입니다. 본명숙·관계·지수를 다시 계산하지 말고 그대로 해석의 근거로 삼아, 두 사람의 결과 관계의 리듬을 풀어 주세요.",
    );
    return lines.join("\n");
  } catch {
    return "";
  }
}

// 🔴 음력일은 한국 음양력 코어에서만 나온다. lunar-javascript 는 **중국 표준시(CST) 기준 중국 음력**이라
// 삭이 CST 23시대에 들면 그 달 전체의 음력일이 하루 밀린다 — 실측 2026-08-27 기준 1900~2100 전수
// 73,414일 중 2,997일(4.08%)이 갈린다. 27수는 음력 월·일로 직접 결정되므로 그 하루가 곧 다른 수(宿)다.
import { solarToLunar } from "@/lib/korean-calendar";
import {
  buildSukuyoAiCompatibility,
  buildSukuyoFromLunar,
  describeSukuyoDirectionalRelation,
} from "@/worker/lib/sukuyo-ai-calculation.js";

// 프롬프트 허브 숙요점 도구 전용 — 사용자가 입력한 생년월일(양/음력)을 음력 본명숙으로
// 정규화하고, 정본 숙요 엔진(worker/lib/sukuyo-ai-calculation.js)으로 나·상대 본명숙과
// 구요 관계를 산출해 프롬프트에 주입할 한국어 [산출 데이터] 블록을 만든다.
// 계산 규칙·상수는 만들지 않고 fortune-tea-house 궁합 어댑터와 동일한 순수 함수를 재사용한다.

export type SukuyoFactsInput = {
  birthDate: string;
  calendarType?: string;
  partnerBirthDate?: string;
  partnerCalendarType?: string;
  relationshipType?: string;
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
  return key === "음력" || key === "lunar";
}

// 코어 지원 범위(1900~2100) 밖이면 null 이다 — 조용히 중국 달력으로 떨어지지 않는다.
function toLunarBirth(birth: ParsedYmd, calendarType: string | undefined): LunarBirth | null {
  if (isLunarCalendar(calendarType)) {
    return { lunarMonth: birth.month, lunarDay: birth.day, isLeapMonth: false };
  }
  const lunar = solarToLunar(birth.year, birth.month, birth.day);
  if (!lunar) return null;
  return { lunarMonth: lunar.lunarMonth, lunarDay: lunar.lunarDay, isLeapMonth: lunar.isLeapMonth };
}

function mansionFor(birthDate: string, calendarType: string | undefined) {
  const birth = parseYmd(birthDate);
  if (!birth) return null;
  const lunar = toLunarBirth(birth, calendarType);
  if (!lunar) return null;
  const mansion = buildSukuyoFromLunar(lunar.lunarMonth, lunar.lunarDay, { isLeapMonth: lunar.isLeapMonth, source: "korean-calendar-core" });
  if (!mansion) return null;
  return mansion;
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
    const myMansion = mansionFor(input.birthDate, input.calendarType);
    if (!myMansion) return "";

    const lines: string[] = ["[숙요점 산출 데이터]"];
    lines.push(`- 나의 본명숙: ${mansionLine(myMansion)}`);

    const partnerMansion = input.partnerBirthDate
      ? mansionFor(input.partnerBirthDate, input.partnerCalendarType)
      : null;

    if (!partnerMansion) {
      lines.push("- 상대 본명숙: 미입력 (상대 생년월일을 넣으면 두 사람의 구요 관계까지 산출됩니다)");
      lines.push("- 산출 기준: 음력 월일 기반 본명숙 (내부 숙요 엔진 확정값)");
      lines.push("");
      lines.push(
        "위 값은 이미 정확히 산출된 확정 데이터입니다. 본명숙을 다시 계산하지 말고 그대로 해석에 사용하세요.",
      );
      return lines.join("\n");
    }

    lines.push(`- 상대의 본명숙: ${mansionLine(partnerMansion)}`);

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
    lines.push("- 산출 기준: 음력 월일 기반 본명숙 + 27숙 구요 관계 (내부 숙요 엔진 확정값)");
    lines.push("");
    lines.push(
      "위 값은 이미 정확히 산출된 확정 데이터입니다. 본명숙·관계·지수를 다시 계산하지 말고 그대로 해석의 근거로 삼아, 두 사람의 결과 관계의 리듬을 풀어 주세요.",
    );
    return lines.join("\n");
  } catch {
    return "";
  }
}

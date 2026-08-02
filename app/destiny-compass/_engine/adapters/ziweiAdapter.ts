/**
 * 자미두수 어댑터 — 결정론 명반(calculateZiweiChart)을 읽기 전용으로 소비해
 * 12궁 강도·사화·문창문곡을 방향성 기여로 변환한다.
 * 입력 매핑에 사용하는 parseBirthDate/parseBirthTime는 사주와 동일 파서(재사용).
 * timezone은 자미 자체 입력 필드일 뿐, 사주 계산 경로에는 주입하지 않는다(하드 제약 2).
 */
import type { EngineAdapter } from "./types";
import type { CompassInput, DirectionKey, EngineContribution, Evidence } from "../types";
import type { AnimalDestinyInput } from "@/app/saju/animal-destiny/lib/types";
import type { ZiweiUserInput } from "@/app/_lib/ziwei-types";
import { calculateZiweiChart } from "@/app/_lib/ziwei-engine";
import { parseBirthDate, parseBirthTime } from "@/app/saju/animal-destiny/lib/sajuAdapter";
import { ZIWEI_PALACE_DIRECTION, ZIWEI_STUDY_STARS, DIRECTION_KEYS } from "../constants";

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

const SIHUA_LABELS = ["화록", "화권", "화과", "화기"] as const;

function starNames(stars: unknown): string[] {
  return (Array.isArray(stars) ? stars : [])
    .map((s) => String((s as { name?: unknown })?.name ?? "").trim())
    .filter(Boolean);
}

function toZiweiInput(birth: AnimalDestinyInput): ZiweiUserInput {
  const { year, month, day } = parseBirthDate(birth.birthDate);
  const { hour, minute, hasTime } = parseBirthTime(birth.birthTime);
  return {
    name: birth.name || "",
    birthYear: year,
    birthMonth: month,
    birthDay: day,
    birthHour: hour ?? 12,
    birthMinute: minute ?? 0,
    unknownHour: !hasTime,
    gender: birth.gender === "female" ? "F" : "M", // unknown→M(자미는 M/F 필수)
    calendarType: birth.calendarType || "solar",
    isLeapMonth: Boolean(birth.lunarLeap),
    timezone: "Asia/Seoul",
  };
}

export const ziweiAdapter: EngineAdapter = {
  system: "ziwei",
  baseWeight: 0.2,
  isAvailable(): boolean {
    return true;
  },
  async contribute(input: CompassInput): Promise<EngineContribution> {
    const chart = calculateZiweiChart(toZiweiInput(input.birth));
    const directions: Partial<Record<DirectionKey, number>> = {};

    const palaces = Array.isArray(chart.palaces) ? chart.palaces : [];
    const maxScore = Math.max(1, ...palaces.map((p) => Number(p.score) || 0));

    for (const p of palaces) {
      const routes = ZIWEI_PALACE_DIRECTION[p.id];
      if (!routes || routes.length === 0) continue;
      const norm = clamp01((Number(p.score) || 0) / maxScore);
      for (const [dir, w] of routes) {
        directions[dir] = (directions[dir] || 0) + norm * w;
      }
      // 사화 보정: 화록 궁 +부스트, 화기 궁 감점(해당 궁의 방향에)
      const sihua = Array.isArray(p.sihua) ? p.sihua : [];
      if (sihua.includes("화록")) for (const [dir] of routes) directions[dir] = (directions[dir] || 0) + 0.12;
      if (sihua.includes("화기")) for (const [dir] of routes) directions[dir] = (directions[dir] || 0) - 0.1;
    }

    // 문창·문곡(보좌성) → study 기여
    const hasStudyStar = palaces.some((p) =>
      (Array.isArray(p.allStars) ? p.allStars : []).some((s) => ZIWEI_STUDY_STARS.includes(s.name)),
    );
    if (hasStudyStar) directions.study = (directions.study || 0) + 0.15;

    for (const k of DIRECTION_KEYS) {
      if (directions[k] !== undefined) directions[k] = clamp01(directions[k] as number);
    }

    // 시주 결측이면 시주 궁 불확실 → 품질 감점
    const dataQuality = input.birth.birthTime ? 1 : 0.75;

    // 근거(원 용어) — 지금까지 자미만 evidence가 비어 있어 "명반을 봤다"는 말의 뿌리를 보여주지 못했다.
    // 🔴 신규 배열이므로 순서를 뒤에서 바꾸지 말 것(0번이 명궁이라는 전제로 UI가 라벨을 뽑는다).
    const evidence: Evidence[] = [];
    const ming = palaces.find((p) => p.id === "ming");
    if (ming) {
      const mainStars = starNames(ming.mainStars);
      evidence.push({
        system: "ziwei",
        term: `명궁 ${mainStars.length ? mainStars.join("·") : "무주성"}`,
        detail: `${ming.name} · ${ming.branch || ming.earthlyBranch || ""}`.trim(),
        id: "ziwei.ming",
        group: "core",
      });
      const triad = (ming.sanFangSiZheng?.palaceNames || []).filter(Boolean);
      if (triad.length) {
        evidence.push({
          system: "ziwei",
          term: "명궁 삼방사정",
          detail: triad.join(" · "),
          id: "ziwei.sanfang",
          group: "structure",
        });
      }
      const triadStars = starNames(ming.sanFangSiZheng?.mainStars);
      if (triadStars.length) {
        evidence.push({
          system: "ziwei",
          term: "삼방 회조 주성",
          detail: triadStars.join(" · "),
          id: "ziwei.sanfangStars",
          group: "structure",
        });
      }
      if (ming.dahan) {
        evidence.push({ system: "ziwei", term: "명궁 대한", detail: String(ming.dahan), id: "ziwei.dahan", group: "flow" });
      }
    }

    // 사화 착지 궁 — 화록/화권/화과/화기가 각각 어느 궁에 떨어졌는지.
    const sihuaRows: string[] = [];
    for (const label of SIHUA_LABELS) {
      const host = palaces.find((p) => (Array.isArray(p.sihua) ? p.sihua : []).includes(label));
      if (host) sihuaRows.push(`${label} → ${host.name}`);
    }
    if (sihuaRows.length) {
      evidence.push({
        system: "ziwei",
        term: "사화 착지",
        detail: sihuaRows.join(" · "),
        id: "ziwei.sihua",
        // 화기는 주의 신호 — 사화가 섞여 있으면 중립으로 둔다.
        tone: sihuaRows.some((r) => r.startsWith("화기")) ? "caution" : "positive",
        group: "structure",
      });
    }

    // 궁 강약 — 방향 점수의 뿌리가 어느 궁이었는지 보여준다(점수 산출식은 위와 동일한 p.score).
    const ranked = [...palaces].sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0) || a.id.localeCompare(b.id));
    if (ranked.length >= 2) {
      evidence.push({
        system: "ziwei",
        term: "궁 강약",
        detail: `강한 궁 ${ranked[0].name} · 약한 궁 ${ranked[ranked.length - 1].name}`,
        id: "ziwei.palaceRank",
        group: "flow",
      });
    }

    if (hasStudyStar) {
      evidence.push({ system: "ziwei", term: "문창·문곡 동반", detail: "배움·문서 계열 보좌성", id: "ziwei.studyStar", group: "structure" });
    }

    return { directions, dataQuality, evidence: evidence.length ? evidence : undefined };
  },
};

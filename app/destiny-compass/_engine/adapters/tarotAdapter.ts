/**
 * 타로(메이저 아르카나) 어댑터 — 생년월일 + 오늘 날짜(dateSeed)로 결정되는 '오늘의 카드' 22매 중 1매를
 * 전통 정위(upright) 상징 의미에 근거해 8방위 기여로 변환한다.
 * 하루 단위로 카드가 바뀌어(dateSeed) 명식 기반 엔진(사주·자미·숙요)에 '오늘의 결'을 얹는다.
 * 결정론: 난수·Date 미사용 — 문자열 시드의 순수 해시(FNV-1a)로 카드를 고른다. 외부 엔진 비의존(자체 상징 매핑).
 */
import type { EngineAdapter } from "./types";
import type { CompassInput, DirectionKey, EngineContribution } from "../types";

interface Arcana {
  /** 카드명(한국어) */
  ko: string;
  /** 핵심 키워드(근거 표시) */
  keyword: string;
  /** 방위 기여(합 ≈ 1) */
  dirs: [DirectionKey, number][];
}

// 메이저 아르카나 22매 → 방위. 전통 정위 의미 기반(상징 원형).
const MAJOR_ARCANA: readonly Arcana[] = [
  { ko: "바보", keyword: "새로운 시작·도약", dirs: [["venture", 0.6], ["study", 0.4]] },
  { ko: "마법사", keyword: "의지·실현", dirs: [["venture", 0.55], ["career", 0.45]] },
  { ko: "여사제", keyword: "직관·내면", dirs: [["study", 0.55], ["rest", 0.45]] },
  { ko: "여황제", keyword: "풍요·돌봄", dirs: [["love", 0.5], ["wealth", 0.5]] },
  { ko: "황제", keyword: "권위·구조", dirs: [["career", 0.6], ["wealth", 0.4]] },
  { ko: "교황", keyword: "배움·가르침", dirs: [["study", 0.55], ["relationship", 0.45]] },
  { ko: "연인", keyword: "결합·선택", dirs: [["love", 0.6], ["relationship", 0.4]] },
  { ko: "전차", keyword: "추진·승리", dirs: [["career", 0.5], ["venture", 0.5]] },
  { ko: "힘", keyword: "용기·인내", dirs: [["health", 0.55], ["love", 0.45]] },
  { ko: "은둔자", keyword: "성찰·고요", dirs: [["study", 0.5], ["rest", 0.5]] },
  { ko: "운명의 수레바퀴", keyword: "전환·기회", dirs: [["wealth", 0.55], ["venture", 0.45]] },
  { ko: "정의", keyword: "균형·공정", dirs: [["career", 0.5], ["relationship", 0.5]] },
  { ko: "매달린 사람", keyword: "멈춤·새 관점", dirs: [["rest", 0.6], ["study", 0.4]] },
  { ko: "죽음", keyword: "변화·매듭", dirs: [["rest", 0.5], ["venture", 0.5]] },
  { ko: "절제", keyword: "조화·절도", dirs: [["health", 0.55], ["relationship", 0.45]] },
  { ko: "악마", keyword: "집착 점검", dirs: [["wealth", 0.5], ["health", 0.5]] },
  { ko: "탑", keyword: "급변·재정비", dirs: [["rest", 0.55], ["venture", 0.45]] },
  { ko: "별", keyword: "희망·치유", dirs: [["study", 0.5], ["health", 0.5]] },
  { ko: "달", keyword: "직관·불확실", dirs: [["rest", 0.55], ["love", 0.45]] },
  { ko: "태양", keyword: "성취·활력", dirs: [["career", 0.5], ["love", 0.5]] },
  { ko: "심판", keyword: "각성·부름", dirs: [["venture", 0.55], ["study", 0.45]] },
  { ko: "세계", keyword: "완성·성취", dirs: [["career", 0.5], ["relationship", 0.5]] },
];

// FNV-1a 계열 순수 해시(난수 아님) — 문자열 시드 → 32bit 부호없는 정수.
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

export const tarotAdapter: EngineAdapter = {
  system: "tarot",
  baseWeight: 0.15,
  isAvailable(input: CompassInput): boolean {
    return Boolean(input.birth?.birthDate && input.dateSeed);
  },
  async contribute(input: CompassInput): Promise<EngineContribution> {
    // 생년월일 + 오늘(dateSeed) → 오늘의 카드(하루 단위 회전, 결정론).
    const seed = `${input.birth.birthDate}|${input.dateSeed}`;
    const h = hashSeed(seed);
    const card = MAJOR_ARCANA[h % MAJOR_ARCANA.length];
    // 강도: 시드 상위 비트로 0.8~1.0 변조(카드 가중치에 곱) — 결정론.
    const intensity = 0.8 + 0.2 * (((h >>> 8) % 1000) / 1000);

    const directions: Partial<Record<DirectionKey, number>> = {};
    for (const [dir, w] of card.dirs) {
      directions[dir] = clamp01((directions[dir] || 0) + w * intensity);
    }

    // 타로는 '지금'에 말한다 → 근시일 가중.
    const timelineHint = { d30: intensity, d90: intensity * 0.7, y1: intensity * 0.4, y3: intensity * 0.2 };

    return {
      directions,
      timelineHint,
      // 상징 신호 — 명식 확정 신호(사주·자미)보다 낮은 품질.
      dataQuality: 0.7,
      // 🔴 evidence[0] 고정 — MapResult가 이 term으로 운명 도감 카드를 수집한다(`tarot:바보`).
      //    역방향(역위)은 이 엔진이 뽑지 않는다. 없는 것을 근거로 만들지 않기 위해 정위만 남긴다.
      evidence: [
        { system: "tarot", term: `${card.ko}(정위)`, detail: card.keyword, id: "tarot.card", group: "today" },
        {
          system: "tarot",
          term: "카드가 가리키는 방향",
          detail: card.dirs.map(([dir, w]) => `${dir} ${Math.round(w * 100)}%`).join(" · "),
          id: "tarot.dirs",
          group: "today",
        },
      ],
    };
  },
};

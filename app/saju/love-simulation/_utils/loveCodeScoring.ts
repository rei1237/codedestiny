import type { LoveStats } from "../_data/loveCodeMvp";

function clampStat(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function applyEffects(stats: LoveStats, effects: Partial<LoveStats>): LoveStats {
  return {
    affection: clampStat(stats.affection + (effects.affection ?? 0)),
    trust: clampStat(stats.trust + (effects.trust ?? 0)),
    chemistry: clampStat(stats.chemistry + (effects.chemistry ?? 0)),
    tension: clampStat(stats.tension + (effects.tension ?? 0)),
    stability: clampStat(stats.stability + (effects.stability ?? 0)),
  };
}

export function resolveResult(stats: LoveStats) {
  const score = stats.affection + stats.trust + stats.chemistry + stats.stability - stats.tension * 0.6;

  if (score >= 260) {
    return {
      title: "운명의 코드가 열린 관계",
      body: "서로의 속도와 감정의 결을 알아보는 힘이 좋습니다. 천천히 쌓은 신뢰가 설렘을 오래 지탱합니다.",
    };
  }

  if (score >= 220) {
    return {
      title: "천천히 가까워지는 인연",
      body: "마음의 온도는 충분히 따뜻합니다. 서두르지 않고 상대의 리듬을 존중할수록 관계가 깊어집니다.",
    };
  }

  if (score >= 180) {
    return {
      title: "조율이 필요한 설렘",
      body: "끌림은 살아 있지만 표현의 속도 차이가 있습니다. 질문보다 확인, 판단보다 배려가 관계를 안정시킵니다.",
    };
  }

  return {
    title: "거리감 조절이 필요한 관계",
    body: "마음이 닿기 전에 긴장이 먼저 올라왔습니다. 상대의 불편 신호를 가볍게 넘기지 않는 것이 다음 흐름의 열쇠입니다.",
  };
}

export function getRelationshipMetrics(stats: LoveStats) {
  return [
    { label: "관계 온도", value: Math.round((stats.affection + stats.trust) / 2) },
    { label: "마음의 거리", value: Math.round((100 - stats.tension + stats.stability) / 2) },
    { label: "설렘의 흐름", value: Math.round((stats.chemistry + stats.affection) / 2) },
  ];
}

type GradeMeta = {
  destinyGrade: string;
  gradeTitle: string;
  pairingTitle: string;
};

const AURA_TYPES = [
  "가을의 울림",
  "별빛 공명",
  "네온 심연",
  "유리 새벽",
  "달빛 파동",
  "오로라 리듬",
  "장미 성운",
  "코튼 스타",
  "블루 플레어",
  "선셋 벨벳",
] as const;

const AURA_MATERIALS = [
  "Aurora Glass",
  "Moonlight Velvet",
  "Neon Prism",
  "Starlight Chrome",
  "Rose Quartz Film",
  "Midnight Opal",
  "Crystal Haze",
  "Silver Echo",
] as const;

const ENERGY_COLORS = [
  "#F472B6",
  "#A78BFA",
  "#60A5FA",
  "#2DD4BF",
  "#F59E0B",
  "#FB7185",
  "#22D3EE",
  "#C084FC",
] as const;

const TAG_POOL = ["몽환형", "안정형", "폭발형", "치유형", "응원형", "직진형", "설렘형", "서사형"] as const;

const EDITION_POOL = ["LIMITED AURA CARD", "FANSIGN EDITION", "DESTINY VERIFIED", "BACKSTAGE PASS"] as const;

const FANSIGN_POOL = [
  "Always shine with your rhythm.",
  "Keep your glow and trust your tempo.",
  "See you at the next stage.",
  "Your light makes this stage brighter.",
  "Tonight, your heartbeat is the chorus.",
] as const;

function hashText(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function getDestinyGrade(score: number): GradeMeta {
  if (score >= 90) {
    return {
      destinyGrade: "LEGENDARY",
      gradeTitle: "Soul Stage",
      pairingTitle: "Miracle Pairing",
    };
  }

  if (score >= 75) {
    return {
      destinyGrade: "SPECIAL",
      gradeTitle: "Stage Chemistry",
      pairingTitle: "Glowing Pairing",
    };
  }

  if (score >= 60) {
    return {
      destinyGrade: "RARE",
      gradeTitle: "Gentle Harmony",
      pairingTitle: "Soft Spark Pairing",
    };
  }

  if (score >= 40) {
    return {
      destinyGrade: "MOOD MATCH",
      gradeTitle: "Growing Link",
      pairingTitle: "Warm-Up Pairing",
    };
  }

  return {
    destinyGrade: "DISTANT SIGNAL",
    gradeTitle: "Unstable Beat",
    pairingTitle: "Slow Sync Pairing",
  };
}

export function getAuraTheme(seed: string, score: number) {
  const hash = hashText(`${seed}:${score}`);
  const auraType = AURA_TYPES[hash % AURA_TYPES.length];
  const auraMaterial = AURA_MATERIALS[(hash * 7 + score) % AURA_MATERIALS.length];
  const energyColor = ENERGY_COLORS[(hash * 5 + score) % ENERGY_COLORS.length];
  const editionLabel = EDITION_POOL[(hash + score * 3) % EDITION_POOL.length];

  return {
    auraType,
    auraMaterial,
    energyColor,
    editionLabel,
  };
}

export function getMoodKeywords(seed: string, count = 3) {
  const hash = hashText(seed);
  const picked: string[] = [];

  for (let index = 0; index < TAG_POOL.length && picked.length < count; index += 1) {
    const value = TAG_POOL[(hash + index * 3) % TAG_POOL.length];
    if (!picked.includes(value)) picked.push(value);
  }

  return picked;
}

export function getFansignMessage(seed: string, score: number) {
  const hash = hashText(`${seed}:${score}:fansign`);
  return FANSIGN_POOL[hash % FANSIGN_POOL.length];
}

export function getPairingAlias(userName: string, biasName: string, score: number) {
  const compactUser = String(userName || "YOU").trim().slice(0, 10) || "YOU";
  const compactBias = String(biasName || "BIAS").trim().slice(0, 10) || "BIAS";

  if (score >= 90) return `${compactUser} x ${compactBias} Miracle Unit`;
  if (score >= 75) return `${compactUser} x ${compactBias} Glow Unit`;
  if (score >= 60) return `${compactUser} x ${compactBias} Spark Unit`;
  if (score >= 40) return `${compactUser} x ${compactBias} Rhythm Unit`;
  return `${compactUser} x ${compactBias} Signal Unit`;
}

export function getStageAuraComment(score: number, auraType: string) {
  if (score >= 90) return `무대 중앙에서 ${auraType}이 폭발하듯 퍼지는 하이라이트 타입`;
  if (score >= 75) return `${auraType}이 조명과 함께 살아나 관객 몰입을 끌어올리는 타입`;
  if (score >= 60) return `${auraType}이 잔광처럼 남아 서서히 깊어지는 무드 타입`;
  if (score >= 40) return `${auraType}이 천천히 맞물리며 성장하는 연결 타입`;
  return `${auraType}이 미세하게 반응하며 타이밍을 맞춰가는 탐색 타입`;
}

export function getCheerPoint(score: number, relationMood: string) {
  if (score >= 90) return `피크 타임 응원에 강점: ${relationMood} 루틴을 짧고 강하게 유지해 보세요.`;
  if (score >= 75) return `집중 응원에 강점: ${relationMood} 감성 메시지를 1일 1회 기록해 보세요.`;
  if (score >= 60) return `안정 응원에 강점: ${relationMood} 플레이리스트 3곡으로 텐션을 맞춰 보세요.`;
  if (score >= 40) return `성장 응원에 강점: ${relationMood} 루틴을 주 2회로 천천히 고정해 보세요.`;
  return `리듬 적응이 우선: ${relationMood} 감성보다 휴식-응원 균형을 먼저 잡아 보세요.`;
}

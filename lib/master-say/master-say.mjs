// 마스터 말풍선: 유료 AI 상담 결과(숙요 궁합·점성술·베다점)의 장 사이에 끼는 마스터 한마디.
// 🔴 LLM 을 부르지 않는다. 결과 본문(LLM 원문)은 바꾸지 않고 고정 문구 + 표정만 고른다(narrator-webtoon-result-spec §10).
// 🔴 문구 규칙은 타로 화자와 같다: 60자 이하, 2문장 이하, 단정어·이모지·상대 마음 단정 금지(test 가 correctLine 으로 검사).
// 🔴 서한비: "박지은" 금지. 윤달: 공망 스포일러·pain 표정 금지(src/features/expert-characters 주석).
// 마스터 매핑 정본은 components/fortune/master-profiles.ts·ConsultationReading 의 masterByKind 와 같다(숙요=hanbi, 점성술·베다=yun).

export const MASTER_SAY_VERSION = 'master-say-v1';
export const MASTER_SAY_DOMAINS = ['sukuyo', 'astrology', 'vedic', 'nakshatra', 'saju', 'humanDesign', 'healingTarot', 'mingriTarot', 'numerology'];
export const MASTER_BY_DOMAIN = {
  sukuyo: 'hanbi', astrology: 'yun', vedic: 'yun', nakshatra: 'yun',
  // 꿀꿀 무료 결과(2026-11-22): 연이가 장마다 한마디씩 짚는다. 장 키로 고른다.
  saju: 'yeoni', humanDesign: 'yeoni', healingTarot: 'yeoni', mingriTarot: 'yeoni', numerology: 'yeoni',
};

// 서한비(숙요 궁합): 차분한 장부 화법. 관계는 "빚·거리·갚음"으로 말하고 상대의 마음은 단정하지 않는다.
const SUKUYO_BY_KEY = {
  overview: ['reveal', '먼저 두 분 사이의 장부 전체를 펼쳐 볼게요. 좋은 곳도 취약한 곳도 같은 무게로요.'],
  twoStars: ['thinking', '두 분의 달이 머문 자리를 나란히 놓았어요. 각자의 본바탕부터 볼게요.'],
  evidence_basis: ['idle', '계산된 값만 근거로 삼았어요. 하나씩 따져 보셔도 좋아요.'],
  attraction: ['greet', '서로에게 끌리는 이유는 한 가지가 아니에요. 여섯 갈래로 나눠 볼게요.'],
  emotionalDirection: ['thinking', '마음이 흐르는 방향을 재어 볼게요. 누구 탓이 아니라 방향의 문제예요.'],
  communication: ['comfort', '말이 닿는 길을 함께 찾아요. 오늘부터 해 볼 수 있는 것만 골랐어요.'],
  energyFlow: ['thinking', '관계에도 계절이 있어요. 단계마다 어디서 숨이 차는지 짚어 볼게요.'],
  conflict: ['caution', '엇갈림은 되풀이되면 빚이 돼요. 터지는 자리를 미리 봐 둘게요.'],
  caution: ['caution', '이 자리는 그냥 두면 불어나요. 그래서 먼저 말씀드리는 거예요.'],
  karma: ['reveal', '이 인연이 왜 이어졌는지 살펴봐요. 전생 이야기는 상징으로만 읽을게요.'],
  mutualGrowth: ['comfort', '서로에게서 받은 것도 장부에 적혀 있어요. 갚을 것만 있는 건 아니에요.'],
  radiantMoment: ['greet', '이제 가장 빛나는 장면을 꺼내 볼게요. 장부에는 이런 쪽도 있답니다.'],
  domains: ['idle', '관계도 자리마다 어울림이 달라요. 낮은 곳은 낮다고 말씀드릴게요.'],
  outlook: ['thinking', '앞으로의 시간을 구간으로 나눠 재어 볼게요. 두 갈래 길을 함께 놓을게요.'],
  closingLetter: ['comfort', '마지막은 편지로 맺을게요. 서두르지 않아도 돼요.'],
};

// 윤달: 장 키를 모르는 화면(점성술·베다)은 위치(처음·중간·끝)로 고른다. 점성술=논리형(열두 집·각도), 베다=카르마형(업·다르마·다샤).
const YUN = {
  astrology: {
    open: ['reveal', '태어난 분의 하늘을 펼쳤어요. 태양·달·상승궁, 세 축부터 짚을게요.'],
    turn: [
      ['thinking', '행성이 어느 집에 앉았는지가 생활 장면을 정해요. 하나씩 볼게요.'],
      ['idle', '각도 하나도 근거 없이 말하지 않을게요. 차트에 있는 것만 읽어요.'],
      ['reveal', '여기서 두 행성이 서로를 바라봐요. 이 각도가 되풀이되는 장면이에요.'],
      ['caution', '생시가 흔들리면 이 부분은 조심해서 읽어야 해요. 한계도 같이 말할게요.'],
    ],
    close: ['comfort', '열두 집 문은 다 열어 뒀어요. 궁금할 때 다시 들러요.'],
  },
  vedic: {
    open: ['greet', '별의 계절을 읽을 거예요. 달이 머문 나크샤트라가 첫 열쇠예요.'],
    turn: [
      ['thinking', '업과 다르마는 같은 자리에서 갈려요. 어느 쪽으로 쓰는지가 관건이에요.'],
      ['reveal', '지금 흐르는 다샤의 계절이에요. 이 시기를 어떻게 쓸지 같이 봐요.'],
      ['idle', '라그나에서 하우스를 차례로 세어 볼게요. 서두르지 않아요.'],
      ['caution', '이 시기는 무리하면 결이 거칠어져요. 속도를 낮추는 쪽이 이로워요.'],
    ],
    close: ['comfort', '별의 계절은 돌고 돌아요. 다음 계절이 궁금해지면 들러요.'],
  },
};

// 나크샤트라 무료 결정판(동양 27숙 ↔ 인도 27 나크샤트라 나란히 읽기): 다샤·라그나가 없어 베다 풀과 따로 둔다. 장 키로 고른다.
const NAKSHATRA_BY_KEY = {
  intro: ['greet', '같은 달을 동양과 인도, 두 눈으로 나란히 볼게요. 이름이 달라도 달은 하나예요.'],
  unified: ['thinking', '두 눈이 만나는 곳과 갈리는 곳을 짚어 볼게요. 갈리는 쪽에서 더 많이 배워요.'],
  closing: ['comfort', '달은 오늘도 자리를 옮겨요. 더 깊은 이야기가 궁금하면 들러요.'],
};

// 연이(꿀꿀 무료 결과): 다정한 손금 상담가 화법. 결과 값을 단정하지 않고 "같이 짚어 보자"로 이끈다.
const YEONI_BY_KEY = {
  saju: {
    pillars: ['reveal', '태어난 날의 네 기둥이에요. 해·달·날·시가 한 줄로 섰어요.'],
    elements: ['thinking', '다섯 기운이 얼마나 모였는지 볼게요. 많고 적음은 좋고 나쁨이 아니에요.'],
    close: ['comfort', '오늘은 바탕만 짚었어요. 더 궁금하면 언제든 다시 펼쳐 봐요.'],
  },
  humanDesign: {
    type: ['greet', '먼저 에너지의 종류부터 볼게요. 나를 움직이는 엔진 같은 거예요.'],
    strategy: ['thinking', '전략은 일이 잘 풀리는 순서예요. 오늘 하나만 시험해 봐요.'],
    authority: ['reveal', '결정을 맡길 자리를 짚어 볼게요. 머리보다 먼저 듣는 곳이에요.'],
    profile: ['idle', '프로필은 삶에서 맡는 역할의 결이에요. 두 숫자를 나란히 봐요.'],
    centers: ['thinking', '색이 찬 센터와 빈 센터를 나눠 볼게요. 빈 곳은 배우는 자리예요.'],
    channels: ['reveal', '이어진 채널은 꾸준히 쓰는 힘이에요. 어디가 이어졌는지 봐요.'],
    gates: ['idle', '게이트 하나하나는 작은 재능이에요. 천천히 훑어봐도 돼요.'],
    reading: ['comfort', '여기까지가 차트의 큰 그림이에요. 오늘 와닿은 한 줄만 챙겨 가요.'],
  },
  healingTarot: {
    intro: ['greet', '뽑은 카드를 같이 펼쳐 볼게요. 마음이 쉬어 가는 자리예요.'],
    advice: ['comfort', '카드가 건네는 말이에요. 지금 마음에 닿는 만큼만 받아요.'],
    cards: ['thinking', '카드 한 장씩 그림을 들여다볼게요. 눈에 먼저 띄는 곳이 있나요?'],
    routine: ['reveal', '오늘 해 볼 작은 습관이에요. 하나만 골라도 충분해요.'],
  },
  mingriTarot: {
    positions: ['reveal', '자리마다 놓인 카드를 볼게요. 사주의 기운과 나란히 놓았어요.'],
    energy: ['thinking', '카드에 흐르는 오행을 짚어 볼게요. 어느 쪽으로 기우는지 봐요.'],
    sipsin: ['idle', '십신으로 보면 관계와 일의 결이 드러나요. 하나씩 풀어 볼게요.'],
    synthesis: ['comfort', '마지막으로 한데 모아 볼게요. 오늘의 한 걸음만 챙겨 가요.'],
  },
  numerology: {
    profile: ['greet', '생일 숫자로 나를 먼저 그려 봤어요. 숫자마다 결이 달라요.'],
  },
};

/** 모든 문구(테스트·감사용). */
export function allMasterSayLines() {
  const rows = Object.entries(SUKUYO_BY_KEY).map(([key, [mood, text]]) => ({ domain: 'sukuyo', key, mood, text }));
  rows.push(...Object.entries(NAKSHATRA_BY_KEY).map(([key, [mood, text]]) => ({ domain: 'nakshatra', key, mood, text })));
  for (const [domain, byKey] of Object.entries(YEONI_BY_KEY)) rows.push(...Object.entries(byKey).map(([key, [mood, text]]) => ({ domain, key, mood, text })));
  for (const domain of ['astrology', 'vedic']) {
    const pool = YUN[domain];
    rows.push({ domain, key: 'open', mood: pool.open[0], text: pool.open[1] }, { domain, key: 'close', mood: pool.close[0], text: pool.close[1] });
    pool.turn.forEach(([mood, text], i) => rows.push({ domain, key: `turn${i + 1}`, mood, text }));
  }
  return rows;
}

/**
 * 장 하나 앞뒤에 끼울 마스터 한마디를 고른다. 같은 입력 = 같은 결과(SSR·재열람 일치).
 * @param {{domain:'sukuyo'|'astrology'|'vedic'|'nakshatra'|'saju'|'humanDesign'|'healingTarot'|'mingriTarot'|'numerology', sectionKey?:string, index?:number, total?:number}} input
 * @returns {{character:'hanbi'|'yun'|'yeoni', mood:string, text:string, domain:string}|null} 지원하지 않는 분야는 null
 */
export function masterSayFor({ domain, sectionKey, index = 0, total = 0 } = {}) {
  const character = MASTER_BY_DOMAIN[domain];
  if (!character) return null;
  let entry;
  if (domain === 'sukuyo') {
    entry = SUKUYO_BY_KEY[sectionKey];
  } else if (domain === 'nakshatra') {
    entry = NAKSHATRA_BY_KEY[sectionKey];
  } else if (YEONI_BY_KEY[domain]) {
    entry = YEONI_BY_KEY[domain][sectionKey];
  } else {
    const pool = YUN[domain];
    if (index <= 0) entry = pool.open;
    else if (total > 1 && index >= total - 1) entry = pool.close;
    else entry = pool.turn[(index - 1) % pool.turn.length];
  }
  if (!entry) return null;
  return { character, mood: entry[0], text: entry[1], domain };
}

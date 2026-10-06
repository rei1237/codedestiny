import { threadsTextWeight } from "../threads.js";
import { POST_TEXT_LIMIT, THREADS_PROFILE_LINK_CTA } from "./shared.js";

export const THREADS_BRAND_PROMO_START_DATE = "2026-10-07";

export const THREADS_BRAND_PROMOS = Object.freeze([
  {
    type: "neo",
    path: "/neo-operation-room/",
    hashtag: "네오의팩폭작전실",
    hook: "네오의 팩폭 작전실은 지금 고민을 다음 행동으로 정리하는 운세 PT야.",
    body: "사주·자미두수·베다점·점성술 중 보고 싶은 체계를 고르고 지금 고민을 적어봐. 계산 근거와 반복되는 선택, 시기 흐름을 짚어 강점·주의점, 오늘의 행동과 7일 계획까지 정리해 주는 운세 PT. 다음 수를 고를 기준이 필요하다면 네오의 팩폭 작전실에서 작전을 세워.",
  },
  {
    type: "ggulggul",
    path: "/ggulggul/",
    hashtag: "꿀꿀운세",
    hook: "오늘의 흐름이 궁금할 땐 꽃돼지 연이와 꿀꿀운세를 둘러봐요.",
    body: "오늘의 무료 운세와 사주·만세력, 타로 기본 풀이를 살펴보고 내 질문에 맞는 길을 골라봐요. 꽃돼지 연이와 영냥이, 네오가 함께하는 꿀꿀운세에서 오늘의 흐름을 가볍게 확인해 보세요.",
  },
  {
    type: "tea-house",
    path: "/fortune-tea-house/",
    hashtag: "운명의찻집",
    hook: "말로 꺼내기 어려운 고민도 운명의 찻집에서는 천천히 풀어놓아도 괜찮아요.",
    body: "마음에 걸리는 질문을 적고 상담 방식을 고르면, 연이가 타로·사주·사주 궁합·숙요점 중 선택한 체계의 근거로 살펴봐요. 카드와 감정, 상황을 연결해 다음 대화의 실마리와 마음을 돌보는 조언을 전하는 운명의 찻집이에요.",
  },
  {
    type: "yeongnyangi",
    path: "/yeongnyangi/",
    hashtag: "영냥이상담",
    hook: "기질부터 관계와 일·돈의 흐름까지, 영냥이와 고민을 차근히 살펴봐요.",
    body: "영냥이의 초융합 운세는 각 체계의 계산 근거를 나누어 기질·관계·일과 돈의 흐름을 함께 살펴봐요. 겹치는 해석과 서로 다른 지점을 구분해, 지금의 선택과 실천 순서를 정리하는 질문형 운세 상담이에요.",
  },
  {
    type: "master-love-codex",
    path: "/master-love-codex/",
    hashtag: "마스터인연의서",
    hook: "사랑할 때마다 반복되는 마음의 지도를 펼쳐보고 싶다면.",
    body: "사주와 자미두수에서 찾은 단서로 타고난 연애 기질, 마음이 열리는 조건, 가까워지고 멀어지는 리듬, 갈등과 회복의 언어를 다섯 막 스무 장에 담은 마스터 인연의 서. 나와 인연의 지도를 천천히 펼쳐보세요.",
  },
]);

const PROMO_BY_TYPE = new Map(THREADS_BRAND_PROMOS.map((promo) => [promo.type, promo]));
const PROMO_START_UTC_DAY = Date.parse(`${THREADS_BRAND_PROMO_START_DATE}T00:00:00Z`);

/** 수요일 정오 사주 슬롯에서 주 1건 발행할 서비스 홍보를 정한다. 시작 순서는 네오다. */
export function getWeeklyThreadsBrandPromo(dateKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ""))) return null;
  const date = new Date(`${dateKey}T12:00:00+09:00`);
  const utcDay = date.getUTCDay();
  const utcDate = Date.parse(`${dateKey}T00:00:00Z`);
  const daysSinceStart = (utcDate - PROMO_START_UTC_DAY) / 86_400_000;
  if (!Number.isFinite(utcDate) || utcDay !== 3 || daysSinceStart < 0 || daysSinceStart % 7 !== 0) return null;
  return THREADS_BRAND_PROMOS[(daysSinceStart / 7) % THREADS_BRAND_PROMOS.length];
}

export function createThreadsBrandPromoProvider(promo) {
  if (!promo || PROMO_BY_TYPE.get(promo.type) !== promo) throw new Error("unknown_threads_brand_promo");
  return {
    PATH: promo.path,
    CONTENT_TYPE: "service_promotion",
    SOURCE_BASIS: "reviewed_threads_brand_promo",
    buildFacts: async (_env, now) => ({ type: promo.type, date: new Date(now).toISOString().slice(0, 10) }),
    writeCopy: async () => ({
      copy: { hook: promo.hook, body: promo.body },
      model: null,
      rejected: [],
    }),
    format: (_facts, copy) => {
      const text = `${copy.body}\n\n${THREADS_PROFILE_LINK_CTA}\n\n#${promo.hashtag}`;
      if (threadsTextWeight(text) > POST_TEXT_LIMIT) throw new Error("threads_brand_promo_text_too_long");
      return text;
    },
  };
}

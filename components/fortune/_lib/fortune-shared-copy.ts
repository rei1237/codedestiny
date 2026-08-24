// 유료 결과 화면들이 **함께 쓰는** 공용 컴포넌트의 로케일 카피.
//
// 배경: 결과 화면 본체는 서비스마다 카피 표를 갖췄는데(작명·베다점·인연의 서·자미두수 PDF),
// 그 화면들이 공통으로 얹는 껍데기 — 페이지 뷰어의 "한 장씩 보기 / 다음 장", 근거 패널의
// "이 상담이 계산한 값" — 는 한국어로 박혀 있었다. 그래서 일본어 작명첩을 여는 사용자가
// 본문은 일본어인데 넘김 버튼만 한국어인 화면을 봤다.
//
// 🔴 여기 있는 것은 **한 곳만 고치면 11개 이상의 유료 화면이 함께 낫는 자리**다.
//    사용처(2026-08-25 전수): astrology-ai · destiny-compass · island-consult · life-book-ai ·
//    love-secret-ai · naming-ai · sukuyo-compatibility-ai · vedic-ai · ziwei-ai ·
//    master-love-codex(CodexReader) · neo-war-room. 그래서 문구를 바꿀 때는 그 전부에 나간다는
//    사실을 먼저 볼 것.
//
// 🔴 범위는 ko·en·ja·zh-CN·zh-TW 다섯이다(레포 관행). 나머지 일곱은 영어로 폴백한다.

import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

export type FortuneSharedCopy = {
  /** 페이지 뷰어 — 한 장씩/전체 보기 토글 */
  viewModeGroupAria: string;
  viewOneByOne: string;
  viewAll: string;
  pagerRoleDescription: string;
  pageNavAria: (deckLabel: string) => string;
  prevPageAria: string;
  prevPageLabel: string;
  nextPageAria: string;
  nextPageLabel: string;
  /** 분석 근거 패널·로딩 */
  basisTitle: string;
  basisNote: string;
  basisLoadingLabel: string;
  basisLoadingDetail: string;
  /** 용어 설명 말풍선 */
  glossaryAria: (term: string) => string;
  /** 연이 스프라이트 기본 대체 텍스트 */
  yeonSpriteAlt: string;
};

const SHARED_KO: FortuneSharedCopy = {
  viewModeGroupAria: "결과 보기 방식",
  viewOneByOne: "한 장씩 보기",
  viewAll: "전체 보기",
  pagerRoleDescription: "페이지 넘김 보기",
  pageNavAria: (deckLabel) => `${deckLabel} 페이지 이동`,
  prevPageAria: "이전 장",
  prevPageLabel: "← 이전 장",
  nextPageAria: "다음 장",
  nextPageLabel: "다음 장 →",
  basisTitle: "이 상담이 계산한 값",
  basisNote: "전문가가 지어낸 값이 아니라, 입력하신 정보로 계산된 결과입니다.",
  basisLoadingLabel: "상담문을 엮고 있습니다",
  basisLoadingDetail: "잠시만 기다려 주세요",
  glossaryAria: (term) => `${term} 용어 설명`,
  yeonSpriteAlt: "연이 스프라이트",
};

const SHARED_EN: FortuneSharedCopy = {
  viewModeGroupAria: "Reading mode",
  viewOneByOne: "One page at a time",
  viewAll: "Read it all",
  pagerRoleDescription: "Page-turn view",
  pageNavAria: (deckLabel) => `${deckLabel} page navigation`,
  prevPageAria: "Previous page",
  prevPageLabel: "← Previous",
  nextPageAria: "Next page",
  nextPageLabel: "Next →",
  basisTitle: "What this reading calculated",
  basisNote: "These are not figures the reader invented — they were calculated from what you entered.",
  basisLoadingLabel: "Weaving your reading together",
  basisLoadingDetail: "This will take a moment",
  glossaryAria: (term) => `What ${term} means`,
  yeonSpriteAlt: "Yeoni sprite",
};

const SHARED_JA: FortuneSharedCopy = {
  viewModeGroupAria: "結果の表示方法",
  viewOneByOne: "1ページずつ見る",
  viewAll: "全体を見る",
  pagerRoleDescription: "ページめくり表示",
  pageNavAria: (deckLabel) => `${deckLabel}のページ移動`,
  prevPageAria: "前のページ",
  prevPageLabel: "← 前へ",
  nextPageAria: "次のページ",
  nextPageLabel: "次へ →",
  basisTitle: "この鑑定が計算した値",
  basisNote: "占い手が作った数字ではなく、ご入力の情報から計算した結果です。",
  basisLoadingLabel: "鑑定文を編んでいます",
  basisLoadingDetail: "少しだけお待ちください",
  glossaryAria: (term) => `${term}の用語説明`,
  yeonSpriteAlt: "ヨニのスプライト",
};

const SHARED_ZH_CN: FortuneSharedCopy = {
  viewModeGroupAria: "结果查看方式",
  viewOneByOne: "逐页查看",
  viewAll: "查看全文",
  pagerRoleDescription: "翻页视图",
  pageNavAria: (deckLabel) => `${deckLabel}的翻页导航`,
  prevPageAria: "上一页",
  prevPageLabel: "← 上一页",
  nextPageAria: "下一页",
  nextPageLabel: "下一页 →",
  basisTitle: "这次咨询计算出的数值",
  basisNote: "这些不是占卜师杜撰的数字，而是依你填写的信息计算得出的。",
  basisLoadingLabel: "正在编写咨询正文",
  basisLoadingDetail: "请稍候片刻",
  glossaryAria: (term) => `${term}的术语说明`,
  yeonSpriteAlt: "缘伊的精灵图",
};

const SHARED_ZH_TW: FortuneSharedCopy = {
  viewModeGroupAria: "結果檢視方式",
  viewOneByOne: "逐頁檢視",
  viewAll: "檢視全文",
  pagerRoleDescription: "翻頁檢視",
  pageNavAria: (deckLabel) => `${deckLabel}的翻頁導覽`,
  prevPageAria: "上一頁",
  prevPageLabel: "← 上一頁",
  nextPageAria: "下一頁",
  nextPageLabel: "下一頁 →",
  basisTitle: "這次諮詢計算出的數值",
  basisNote: "這些不是占卜師杜撰的數字，而是依你填寫的資訊計算得出的。",
  basisLoadingLabel: "正在編寫諮詢正文",
  basisLoadingDetail: "請稍候片刻",
  glossaryAria: (term) => `${term}的術語說明`,
  yeonSpriteAlt: "緣伊的精靈圖",
};

/** 🔴 ko·en·ja·zh-CN·zh-TW 만 채운다. 나머지 일곱은 영어로 폴백. */
const FORTUNE_SHARED_COPY: Partial<Record<LoadingLocale, FortuneSharedCopy>> = {
  ko: SHARED_KO,
  en: SHARED_EN,
  ja: SHARED_JA,
  "zh-CN": SHARED_ZH_CN,
  "zh-TW": SHARED_ZH_TW,
};

export function getFortuneSharedCopy(locale: LoadingLocale): FortuneSharedCopy {
  return FORTUNE_SHARED_COPY[locale] || SHARED_EN;
}

/**
 * 렌더 시점의 로케일을 그대로 읽는다.
 * 🔴 구독하지 않는 것이 맞다 — 이 레포에서 언어 전환은 경로 이동(`/ja`·`/zh`·`/en`)이라
 *    화면 안에서 로케일이 바뀌지 않는다(app/components/AppChrome.tsx 의 localeFromPathname).
 *    작명·베다점 결과 화면 카피도 같은 모양이다.
 */
export function currentFortuneSharedCopy(): FortuneSharedCopy {
  return getFortuneSharedCopy(getCurrentLoadingLocale());
}

export { SHARED_EN as FORTUNE_SHARED_COPY_EN, SHARED_KO as FORTUNE_SHARED_COPY_KO, FORTUNE_SHARED_COPY };

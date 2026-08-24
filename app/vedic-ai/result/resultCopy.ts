// 베다점 상담 결과 화면의 로케일 카피.
//
// 배경: 입력 화면(`app/vedic-ai/VedicAiClient.tsx`)은 `VEDIC_AI_COPY` 로 로케일이 갈리는데,
// 결제가 끝나고 사용자가 실제로 상담 결과를 받아 보는 이 화면은 한국어가 하드코딩돼 있었다.
// AI 응답 본문은 요청 스코프 앰비언트 파이프가 이미 사용자의 언어로 뽑아 주므로, 그 결과가
// 한국어 껍데기 안에 담겨 나가던 상태였다(작명 결과 화면과 정확히 같은 결함).
//
// 🔴 범위는 ko·en·ja·zh-CN·zh-TW 다섯이다 — 이 레포의 기존 관행이고
//    `app/naming-ai/result/resultCopy.ts` · `app/components/ziwei/_lib/ziwei-deep-pdf-copy.ts`
//    와 같다. 나머지 일곱은 영어로 폴백한다.
//
// 🔴 여기 있는 것은 전부 **화면 표시 문구**다. LLM 응답에서 파싱하는 라벨·헤딩은 하나도 없다
//    (섹션 제목은 `splitAssistantSections` 가 응답에서 그대로 뽑아 쓴다). 둘을 헷갈리지 말 것.

import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

export type VedicResultCopy = {
  backToConsult: string;
  loadingSaved: string;
  loginTitle: string;
  loginBody: string;
  missingTitle: string;
  missingBody: string;
  listHeading: string;
  topicFallback: string;
  emptyTitle: string;
  emptyBody: string;
  myQuestion: string;
  footerNote: string;
  /** 섹션 제목이 비었을 때 페이지 뷰어 탭에 들어가는 말. */
  chapterFallback: (index: number) => string;
  deckLabel: string;
};

const RESULT_KO: VedicResultCopy = {
  backToConsult: "베다점 전문가 상담으로 돌아가기",
  loadingSaved: "저장된 별의 지도를 여는 중입니다.",
  loginTitle: "로그인이 필요합니다",
  loginBody: "저장된 베다점 상담은 본인 계정으로 로그인해야 다시 볼 수 있습니다.",
  missingTitle: "상담 기록을 찾지 못했습니다",
  missingBody: "주소가 잘못되었거나 다른 계정의 상담일 수 있습니다.",
  listHeading: "지난 베다점 상담 다시 보기",
  topicFallback: "베다점 전문가 상담",
  emptyTitle: "아직 저장된 상담이 없습니다",
  emptyBody: "상담을 완료하면 이곳에서 언제든 다시 볼 수 있습니다.",
  myQuestion: "나의 질문",
  footerNote: "별의 지도는 저장되어 언제든 다시 열람할 수 있습니다.",
  chapterFallback: (index) => `${index}장`,
  deckLabel: "베다점 상담 전문",
};

const RESULT_EN: VedicResultCopy = {
  backToConsult: "Back to the Vedic astrology consultation",
  loadingSaved: "Opening your saved star map.",
  loginTitle: "Sign-in required",
  loginBody: "A saved Vedic consultation can only be reopened from the account that created it.",
  missingTitle: "We couldn't find that consultation",
  missingBody: "The address may be wrong, or the consultation may belong to another account.",
  listHeading: "Revisit your past Vedic consultations",
  topicFallback: "Vedic astrology consultation",
  emptyTitle: "No saved consultations yet",
  emptyBody: "Once a consultation is finished it stays here for you to reopen any time.",
  myQuestion: "Your question",
  footerNote: "Your star map is saved, so you can open it again whenever you like.",
  chapterFallback: (index) => `Chapter ${index}`,
  deckLabel: "The full Vedic consultation",
};

const RESULT_JA: VedicResultCopy = {
  backToConsult: "ヴェーダ占星術の専門相談に戻る",
  loadingSaved: "保存された星の地図を開いています。",
  loginTitle: "ログインが必要です",
  loginBody: "保存されたヴェーダ占星術の相談は、ご本人のアカウントでログインすると再び見られます。",
  missingTitle: "相談の記録が見つかりませんでした",
  missingBody: "アドレスが誤っているか、別のアカウントの相談かもしれません。",
  listHeading: "これまでのヴェーダ占星術の相談を見返す",
  topicFallback: "ヴェーダ占星術の専門相談",
  emptyTitle: "保存された相談はまだありません",
  emptyBody: "相談が終わると、ここからいつでも見返せます。",
  myQuestion: "わたしの質問",
  footerNote: "星の地図は保存されているので、いつでも開き直せます。",
  chapterFallback: (index) => `第${index}章`,
  deckLabel: "ヴェーダ占星術相談の全文",
};

const RESULT_ZH_CN: VedicResultCopy = {
  backToConsult: "返回吠陀占星专家咨询",
  loadingSaved: "正在打开已保存的星图。",
  loginTitle: "需要登录",
  loginBody: "已保存的吠陀占星咨询，需用本人账号登录后才能再次查看。",
  missingTitle: "未找到咨询记录",
  missingBody: "可能是网址有误，或这条咨询属于其他账号。",
  listHeading: "重看过往的吠陀占星咨询",
  topicFallback: "吠陀占星专家咨询",
  emptyTitle: "还没有已保存的咨询",
  emptyBody: "完成咨询后，随时可以在这里重新查看。",
  myQuestion: "我的提问",
  footerNote: "星图已保存，随时都能再次打开。",
  chapterFallback: (index) => `第${index}章`,
  deckLabel: "吠陀占星咨询全文",
};

const RESULT_ZH_TW: VedicResultCopy = {
  backToConsult: "返回吠陀占星專家諮詢",
  loadingSaved: "正在開啟已儲存的星圖。",
  loginTitle: "需要登入",
  loginBody: "已儲存的吠陀占星諮詢，需以本人帳號登入後才能再次查看。",
  missingTitle: "找不到諮詢紀錄",
  missingBody: "可能是網址有誤，或這則諮詢屬於其他帳號。",
  listHeading: "重看過往的吠陀占星諮詢",
  topicFallback: "吠陀占星專家諮詢",
  emptyTitle: "還沒有已儲存的諮詢",
  emptyBody: "完成諮詢後，隨時可以在這裡重新查看。",
  myQuestion: "我的提問",
  footerNote: "星圖已儲存，隨時都能再次開啟。",
  chapterFallback: (index) => `第${index}章`,
  deckLabel: "吠陀占星諮詢全文",
};

/** 🔴 ko·en·ja·zh-CN·zh-TW 만 채운다. 나머지 일곱은 영어로 폴백. */
const VEDIC_RESULT_COPY: Partial<Record<LoadingLocale, VedicResultCopy>> = {
  ko: RESULT_KO,
  en: RESULT_EN,
  ja: RESULT_JA,
  "zh-CN": RESULT_ZH_CN,
  "zh-TW": RESULT_ZH_TW,
};

export function getVedicResultCopy(locale: LoadingLocale): VedicResultCopy {
  return VEDIC_RESULT_COPY[locale] || RESULT_EN;
}

/**
 * 렌더 시점의 로케일을 그대로 읽는다.
 * 🔴 구독하지 않는 것이 맞다 — 이 레포에서 언어 전환은 경로 이동(`/ja`·`/zh`·`/en`)이라
 *    화면 안에서 로케일이 바뀌는 일이 없다(app/components/AppChrome.tsx 의 localeFromPathname).
 *    같은 이유로 작명 결과 화면도 같은 모양이다.
 */
export function currentVedicResultCopy(): VedicResultCopy {
  return getVedicResultCopy(getCurrentLoadingLocale());
}

export { RESULT_EN as VEDIC_RESULT_COPY_EN, RESULT_KO as VEDIC_RESULT_COPY_KO, VEDIC_RESULT_COPY };

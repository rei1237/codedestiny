// 제보 유형 정본.
//
// 🔴 id 문자열은 DB 에 저장되는 스키마다(worker/lib/feedback-models.js 의 FEEDBACK_CATEGORIES 와 일치).
//    데이터가 쌓인 뒤 id 를 바꾸면 기존 행이 고아가 된다. 라벨·설명·필드만 안전하게 수정 가능하다.
//
// 이 파일 하나가 카테고리 그리드·조건부 필드·관리자 화면 필터를 모두 구동한다.

export type FeedbackCategoryId =
  | "bug"
  | "feature"
  | "ui"
  | "typo"
  | "ai-quality"
  | "payment"
  | "translation"
  | "performance"
  | "mobile"
  | "etc";

export interface FeedbackDetailField {
  key: string;
  label: string;
  placeholder: string;
  /** textarea 로 렌더할지 여부. false 면 단일 행 input. */
  multiline?: boolean;
  required?: boolean;
  /** 지정하면 select 로 렌더한다. */
  options?: string[];
  /** 자동 수집값으로 채우고 읽기 전용으로 표시한다. */
  autoFillFrom?: "userAgent" | "platform" | "connection";
}

export interface FeedbackCategory {
  id: FeedbackCategoryId;
  emoji: string;
  label: string;
  hint: string;
  /** 첨부 스크린샷이 특히 도움이 되는 유형 */
  emphasizeAttachment?: boolean;
  /** 제보 대상 URL 을 필수로 받을지 */
  requireUrl?: boolean;
  /** 민감정보 입력 경고 배너 문구 */
  warning?: string;
  /** 확인 시 보상이 있음을 알리는 안내 문구 */
  rewardNote?: string;
  fields: FeedbackDetailField[];
}

const REPRO_FIELD: FeedbackDetailField = {
  key: "repro",
  label: "재현 방법",
  placeholder: "1. 사주 결과 화면에서\n2. 하단 '공유' 버튼을 누르면\n3. 아무 반응이 없습니다",
  multiline: true,
  required: true,
};

const EXPECTED_FIELD: FeedbackDetailField = {
  key: "expected",
  label: "기대했던 결과",
  placeholder: "공유 시트가 열릴 것으로 기대했습니다",
};

const ACTUAL_FIELD: FeedbackDetailField = {
  key: "actual",
  label: "실제 결과",
  placeholder: "화면이 잠깐 어두워졌다가 그대로입니다",
};

export const FEEDBACK_CATEGORIES: readonly FeedbackCategory[] = Object.freeze([
  {
    id: "bug",
    emoji: "🐞",
    label: "버그",
    hint: "동작하지 않아요",
    emphasizeAttachment: true,
    rewardNote: "실제 버그로 확인되면 제보 1건당 월정석 300개를 드려요.",
    fields: [REPRO_FIELD, EXPECTED_FIELD, ACTUAL_FIELD],
  },
  {
    id: "feature",
    emoji: "💡",
    label: "기능 제안",
    hint: "이런 게 있었으면",
    fields: [
      {
        key: "expected",
        label: "이 기능이 왜 필요한가요?",
        placeholder: "친구와 궁합을 본 뒤 결과를 나란히 비교하고 싶어요",
        multiline: true,
      },
    ],
  },
  {
    id: "ui",
    emoji: "🎨",
    label: "UI 개선",
    hint: "보기 불편해요",
    emphasizeAttachment: true,
    fields: [
      {
        key: "expected",
        label: "어떻게 바뀌면 좋을까요?",
        placeholder: "글자가 작아서 읽기 힘들어요. 조금 더 크면 좋겠습니다",
        multiline: true,
      },
    ],
  },
  {
    id: "typo",
    emoji: "📝",
    label: "오탈자",
    hint: "글자가 틀렸어요",
    requireUrl: true,
    fields: [
      { key: "wrongText", label: "잘못된 문구", placeholder: "화면에 적힌 그대로 붙여넣어 주세요" },
      { key: "suggestedText", label: "이렇게 고쳐주세요", placeholder: "제안하는 문구" },
    ],
  },
  {
    id: "ai-quality",
    emoji: "🤖",
    label: "AI 결과 품질",
    hint: "답변이 이상해요",
    fields: [
      { key: "featureName", label: "어떤 기능인가요?", placeholder: "예) 사주 전문가 상담, 타로 리딩" },
      { key: "inputSummary", label: "입력한 내용", placeholder: "어떤 질문·정보를 넣으셨나요?", multiline: true },
      { key: "outputSummary", label: "받은 답변에서 이상했던 부분", placeholder: "답변을 붙여넣거나 요약해 주세요", multiline: true },
    ],
  },
  {
    id: "payment",
    emoji: "💳",
    label: "결제 문제",
    hint: "결제가 안 돼요",
    warning: "카드번호·비밀번호·CVC 등 결제 정보는 절대 입력하지 마세요. 주문번호만으로 확인할 수 있습니다.",
    fields: [
      { key: "orderId", label: "주문번호", placeholder: "주문내역 화면에서 확인할 수 있습니다" },
      { key: "payMethod", label: "결제 수단", placeholder: "선택해 주세요", options: ["단건 결제(카드)", "이용권", "월정석", "기타"] },
    ],
  },
  {
    id: "translation",
    emoji: "🌎",
    label: "번역 오류",
    hint: "번역이 어색해요",
    requireUrl: true,
    fields: [
      { key: "language", label: "언어", placeholder: "선택해 주세요", options: ["English", "日本語", "中文", "기타"] },
      { key: "wrongText", label: "어색한 번역", placeholder: "화면에 표시된 문구" },
      { key: "suggestedText", label: "제안하는 번역", placeholder: "이렇게 바꾸면 자연스럽습니다" },
    ],
  },
  {
    id: "performance",
    emoji: "⚡",
    label: "속도 문제",
    hint: "너무 느려요",
    requireUrl: true,
    fields: [
      {
        key: "delay",
        label: "얼마나 기다리셨나요?",
        placeholder: "선택해 주세요",
        options: ["3초 이내지만 답답함", "3~10초", "10~30초", "30초 이상", "끝내 안 나옴"],
      },
      { key: "network", label: "네트워크", placeholder: "자동으로 확인합니다", autoFillFrom: "connection" },
    ],
  },
  {
    id: "mobile",
    emoji: "📱",
    label: "모바일 문제",
    hint: "폰에서만 이상해요",
    emphasizeAttachment: true,
    fields: [
      { key: "device", label: "기기명", placeholder: "예) iPhone 15 Pro, 갤럭시 S24" },
      { key: "browser", label: "브라우저", placeholder: "자동으로 확인합니다", autoFillFrom: "userAgent" },
    ],
  },
  {
    id: "etc",
    emoji: "✨",
    label: "기타",
    hint: "그 밖의 의견",
    fields: [],
  },
]);

export function getFeedbackCategory(id: string | null | undefined): FeedbackCategory | null {
  if (!id) return null;
  return FEEDBACK_CATEGORIES.find((category) => category.id === id) || null;
}

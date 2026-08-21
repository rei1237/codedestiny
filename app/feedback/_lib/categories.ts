// 제보 유형 정본.
//
// 🔴 id 문자열은 DB 에 저장되는 스키마다(worker/lib/feedback-models.js 의 FEEDBACK_CATEGORIES 와 일치).
//    데이터가 쌓인 뒤 id 를 바꾸면 기존 행이 고아가 된다. 라벨·설명·필드는 로케일 카피(_lib/copy.ts)로
//    분리했고, 여기 남은 것은 구조(순서·필드 종류·자동입력·경고 배지 여부)뿐이다.
//
// 이 파일 하나가 카테고리 그리드·조건부 필드·관리자 화면 필터를 모두 구동한다.

import type { FeedbackCategoryCopy } from "./copy";

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

export interface FeedbackDetailFieldMeta {
  key: string;
  /** textarea 로 렌더할지 여부. false 면 단일 행 input. */
  multiline?: boolean;
  required?: boolean;
  /** 지정하면 select 로 렌더한다(옵션 문구는 카피에서 가져온다). */
  hasOptions?: boolean;
  /** 자동 수집값으로 채우고 읽기 전용으로 표시한다. */
  autoFillFrom?: "userAgent" | "platform" | "connection";
}

export interface FeedbackCategoryMeta {
  id: FeedbackCategoryId;
  emoji: string;
  /** 첨부 스크린샷이 특히 도움이 되는 유형 */
  emphasizeAttachment?: boolean;
  /** 제보 대상 URL 을 필수로 받을지 */
  requireUrl?: boolean;
  fields: FeedbackDetailFieldMeta[];
}

export interface FeedbackDetailField {
  key: string;
  label: string;
  placeholder: string;
  multiline?: boolean;
  required?: boolean;
  options?: string[];
  autoFillFrom?: "userAgent" | "platform" | "connection";
}

export interface FeedbackCategory {
  id: FeedbackCategoryId;
  emoji: string;
  label: string;
  hint: string;
  emphasizeAttachment?: boolean;
  requireUrl?: boolean;
  warning?: string;
  rewardNote?: string;
  fields: FeedbackDetailField[];
}

export const FEEDBACK_CATEGORIES_META: readonly FeedbackCategoryMeta[] = Object.freeze([
  {
    id: "bug",
    emoji: "🐞",
    emphasizeAttachment: true,
    fields: [
      { key: "repro", multiline: true, required: true },
      { key: "expected" },
      { key: "actual" },
    ],
  },
  {
    id: "feature",
    emoji: "💡",
    fields: [{ key: "expected", multiline: true }],
  },
  {
    id: "ui",
    emoji: "🎨",
    emphasizeAttachment: true,
    fields: [{ key: "expected", multiline: true }],
  },
  {
    id: "typo",
    emoji: "📝",
    requireUrl: true,
    fields: [{ key: "wrongText" }, { key: "suggestedText" }],
  },
  {
    id: "ai-quality",
    emoji: "🤖",
    fields: [
      { key: "featureName" },
      { key: "inputSummary", multiline: true },
      { key: "outputSummary", multiline: true },
    ],
  },
  {
    id: "payment",
    emoji: "💳",
    fields: [
      { key: "orderId" },
      { key: "payMethod", hasOptions: true },
    ],
  },
  {
    id: "translation",
    emoji: "🌎",
    requireUrl: true,
    fields: [
      { key: "language", hasOptions: true },
      { key: "wrongText" },
      { key: "suggestedText" },
    ],
  },
  {
    id: "performance",
    emoji: "⚡",
    requireUrl: true,
    fields: [
      { key: "delay", hasOptions: true },
      { key: "network", autoFillFrom: "connection" },
    ],
  },
  {
    id: "mobile",
    emoji: "📱",
    emphasizeAttachment: true,
    fields: [
      { key: "device" },
      { key: "browser", autoFillFrom: "userAgent" },
    ],
  },
  {
    id: "etc",
    emoji: "✨",
    fields: [],
  },
]);

export function buildFeedbackCategories(copy: Record<FeedbackCategoryId, FeedbackCategoryCopy>): FeedbackCategory[] {
  return FEEDBACK_CATEGORIES_META.map((meta) => {
    const categoryCopy = copy[meta.id];
    return {
      id: meta.id,
      emoji: meta.emoji,
      label: categoryCopy.label,
      hint: categoryCopy.hint,
      emphasizeAttachment: meta.emphasizeAttachment,
      requireUrl: meta.requireUrl,
      warning: categoryCopy.warning,
      rewardNote: categoryCopy.rewardNote,
      fields: meta.fields.map((fieldMeta) => {
        const fieldCopy = categoryCopy.fields[fieldMeta.key];
        return {
          key: fieldMeta.key,
          label: fieldCopy.label,
          placeholder: fieldCopy.placeholder,
          multiline: fieldMeta.multiline,
          required: fieldMeta.required,
          options: fieldMeta.hasOptions ? fieldCopy.options : undefined,
          autoFillFrom: fieldMeta.autoFillFrom,
        };
      }),
    };
  });
}

export function getFeedbackCategory(
  id: string | null | undefined,
  categories: readonly FeedbackCategory[],
): FeedbackCategory | null {
  if (!id) return null;
  return categories.find((category) => category.id === id) || null;
}

// 제보 유형 정본.
//
// 🔴 id 문자열은 DB 에 저장되는 스키마다(worker/lib/feedback-models.js 의 FEEDBACK_CATEGORIES 와 일치).
//    데이터가 쌓인 뒤 id 를 바꾸면 기존 행이 고아가 된다. 라벨·설명·필드만 안전하게 수정 가능하다.
//
// 이 파일 하나가 카테고리 그리드·조건부 필드·관리자 화면 필터를 모두 구동한다.
// 🔴 표시 문구(label/hint/warning/rewardNote/필드 label·placeholder·options)는 _lib/copy.ts 의
//    FeedbackCopy.categories 에서 로케일별로 가져온다 — 이 파일은 구조(키·필수 여부·자동입력)만 갖는다.

import type { FeedbackCopy } from "./copy";

export type FeedbackCategoryId = keyof FeedbackCopy["categories"];

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

interface FieldSkeleton {
  key: string;
  multiline?: boolean;
  required?: boolean;
  hasOptions?: boolean;
  autoFillFrom?: "userAgent" | "platform" | "connection";
}

interface CategorySkeleton {
  id: FeedbackCategoryId;
  emoji: string;
  emphasizeAttachment?: boolean;
  requireUrl?: boolean;
  hasWarning?: boolean;
  hasRewardNote?: boolean;
  fields: FieldSkeleton[];
}

const CATEGORY_SKELETONS: readonly CategorySkeleton[] = Object.freeze([
  {
    id: "bug", emoji: "🐞", emphasizeAttachment: true, hasRewardNote: true,
    fields: [
      { key: "repro", multiline: true, required: true },
      { key: "expected" },
      { key: "actual" },
    ],
  },
  { id: "feature", emoji: "💡", fields: [{ key: "expected", multiline: true }] },
  { id: "ui", emoji: "🎨", emphasizeAttachment: true, fields: [{ key: "expected", multiline: true }] },
  {
    id: "typo", emoji: "📝", requireUrl: true,
    fields: [{ key: "wrongText" }, { key: "suggestedText" }],
  },
  {
    id: "ai-quality", emoji: "🤖",
    fields: [
      { key: "featureName" },
      { key: "inputSummary", multiline: true },
      { key: "outputSummary", multiline: true },
    ],
  },
  {
    id: "payment", emoji: "💳", hasWarning: true,
    fields: [{ key: "orderId" }, { key: "payMethod", hasOptions: true }],
  },
  {
    id: "translation", emoji: "🌎", requireUrl: true,
    fields: [{ key: "language", hasOptions: true }, { key: "wrongText" }, { key: "suggestedText" }],
  },
  {
    id: "performance", emoji: "⚡", requireUrl: true,
    fields: [{ key: "delay", hasOptions: true }, { key: "network", autoFillFrom: "connection" }],
  },
  {
    id: "mobile", emoji: "📱", emphasizeAttachment: true,
    fields: [{ key: "device" }, { key: "browser", autoFillFrom: "userAgent" }],
  },
  { id: "etc", emoji: "✨", fields: [] },
]);

/** 구조(키·필수 여부·자동입력)와 로케일 카피를 합쳐 화면이 쓰는 완전한 카테고리 목록을 만든다. */
export function buildFeedbackCategories(copy: FeedbackCopy): readonly FeedbackCategory[] {
  return CATEGORY_SKELETONS.map((skeleton) => {
    const categoryCopy = copy.categories[skeleton.id];
    return {
      id: skeleton.id,
      emoji: skeleton.emoji,
      label: categoryCopy.label,
      hint: categoryCopy.hint,
      emphasizeAttachment: skeleton.emphasizeAttachment,
      requireUrl: skeleton.requireUrl,
      warning: skeleton.hasWarning ? categoryCopy.warning : undefined,
      rewardNote: skeleton.hasRewardNote ? categoryCopy.rewardNote : undefined,
      fields: skeleton.fields.map((field) => {
        const fieldCopy = categoryCopy.fields[field.key];
        return {
          key: field.key,
          label: fieldCopy.label,
          placeholder: fieldCopy.placeholder,
          multiline: field.multiline,
          required: field.required,
          options: field.hasOptions ? fieldCopy.options : undefined,
          autoFillFrom: field.autoFillFrom,
        };
      }),
    };
  });
}

export function getFeedbackCategory(id: string | null | undefined, copy: FeedbackCopy): FeedbackCategory | null {
  if (!id) return null;
  return buildFeedbackCategories(copy).find((category) => category.id === id) || null;
}

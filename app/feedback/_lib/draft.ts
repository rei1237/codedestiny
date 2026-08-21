// 작성 중 자동 저장.
//
// 키를 사용자별로 나누지 않는 것은 의도적이다 — 비로그인 상태에서 쓰다가
// /login?next=/feedback 왕복을 하고 돌아와도 초안이 그대로 살아 있어야 한다.
//
// 🔴 파일 바이트는 절대 저장하지 않는다. 업로드가 끝난 R2 키/URL 만 담는다.

import type { LoadingLocale } from "@/constants/loadingMessages";
import type { FeedbackAttachment } from "./api";
import { getFeedbackDateLocaleTag } from "./copy";

const DRAFT_KEY = "cd-feedback-draft:v1";
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_STORED_TEXT = 4000;

export interface FeedbackDraft {
  v: 1;
  savedAt: number;
  category: string;
  title: string;
  content: string;
  url: string;
  details: Record<string, string>;
  attachments: FeedbackAttachment[];
  sendEnvironment: boolean;
}

function clamp(value: string, max = MAX_STORED_TEXT): string {
  return String(value || "").slice(0, max);
}

export function saveDraft(draft: Omit<FeedbackDraft, "v" | "savedAt">): void {
  if (typeof window === "undefined") return;
  try {
    const payload: FeedbackDraft = {
      v: 1,
      savedAt: Date.now(),
      category: clamp(draft.category, 40),
      title: clamp(draft.title, 200),
      content: clamp(draft.content),
      url: clamp(draft.url, 1000),
      details: Object.fromEntries(
        Object.entries(draft.details || {}).slice(0, 12).map(([key, value]) => [key, clamp(value, 1000)]),
      ),
      attachments: (draft.attachments || []).slice(0, 3),
      sendEnvironment: draft.sendEnvironment !== false,
    };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch {
    // 시크릿 모드·할당량 초과. 자동 저장은 부가 기능이라 조용히 넘어간다.
  }
}

export function loadDraft(): FeedbackDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as FeedbackDraft;
    if (!parsed || parsed.v !== 1) return null;
    if (!Number.isFinite(parsed.savedAt) || Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
      clearDraft();
      return null;
    }
    // 내용이 아무것도 없는 초안은 복원 배너를 띄울 가치가 없다.
    if (!parsed.title?.trim() && !parsed.content?.trim() && !(parsed.attachments || []).length) return null;

    return parsed;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // 무시
  }
}

export function formatSavedAt(savedAt: number, locale: LoadingLocale = "ko"): string {
  try {
    return new Date(savedAt).toLocaleString(getFeedbackDateLocaleTag(locale), {
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

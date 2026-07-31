// 관리자 제보실 API 래퍼.
// adminFetch 를 재사용한다 — admin/reviews·admin/content 처럼 토큰/자격증명 로직을 다시 복제하지 않는다.

import { adminFetch } from "../../cms/_lib/admin-api";

export interface AdminFeedbackEntry {
  key: string;
  label: string;
  value: string;
}

export interface AdminFeedbackAttachment {
  key: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface AdminFeedbackReply {
  body: string;
  authorName: string;
  emailed: boolean;
  createdAt: string;
}

export interface AdminFeedbackItem {
  id: string;
  ticketNo: string;
  userId: string;
  authorName: string;
  authorEmail: string;
  category: string;
  categoryLabel: string;
  title: string;
  content: string;
  url: string;
  locale: string;
  status: string;
  statusLabel: string;
  priority: string;
  priorityLabel: string;
  details: AdminFeedbackEntry[];
  client: AdminFeedbackEntry[];
  attachments: AdminFeedbackAttachment[];
  replies: AdminFeedbackReply[];
  assigneeId: string;
  assigneeName: string;
  tags: string[];
  adminNote: string;
  autoFlagReasons: string[];
  userAgent: string;
  upvoteCount: number;
  isPublic: boolean;
  notifiedAt: string;
  notifyError: string;
  resolvedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminFeedbackCounts {
  all: number;
  new: number;
  in_progress: number;
  resolved: number;
  on_hold: number;
  rejected: number;
}

export interface AdminFeedbackListResponse {
  ok: boolean;
  items: AdminFeedbackItem[];
  counts: AdminFeedbackCounts;
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface AdminFeedbackListParams {
  status?: string;
  category?: string;
  priority?: string;
  q?: string;
  hasAttachment?: boolean;
  sort?: string;
  page?: number;
}

export function listFeedback(params: AdminFeedbackListParams, signal?: AbortSignal) {
  const search = new URLSearchParams();
  if (params.status && params.status !== "all") search.set("status", params.status);
  if (params.category && params.category !== "all") search.set("category", params.category);
  if (params.priority && params.priority !== "all") search.set("priority", params.priority);
  if (params.q) search.set("q", params.q);
  if (params.hasAttachment) search.set("hasAttachment", "1");
  if (params.sort) search.set("sort", params.sort);
  if (params.page && params.page > 1) search.set("page", String(params.page));

  const query = search.toString();
  return adminFetch<AdminFeedbackListResponse>(`/api/admin/feedback${query ? `?${query}` : ""}`, { signal });
}

/**
 * 단건 조회. 관리자 알림 메일의 `?id=` 딥링크는 현재 필터·페이지에 그 제보가 없을 수 있어
 * 목록에서 찾는 것만으로는 빈 화면이 된다 — 그때 이걸로 직접 가져온다.
 */
export function fetchFeedbackDetail(id: string) {
  return adminFetch<{ ok: boolean; item: AdminFeedbackItem }>(`/api/admin/feedback/${id}`);
}

export function fetchSummary() {
  return adminFetch<{ ok: boolean; counts: AdminFeedbackCounts; adminFeedbackEmailConfigured: boolean }>(
    "/api/admin/feedback/summary",
  );
}

export interface AdminFeedbackPatch {
  status?: string;
  priority?: string;
  assigneeName?: string;
  assigneeId?: string;
  tags?: string[];
  adminNote?: string;
}

export function patchFeedback(id: string, patch: AdminFeedbackPatch) {
  return adminFetch<{ ok: boolean; item: AdminFeedbackItem }>(`/api/admin/feedback/${id}`, {
    method: "PATCH",
    body: patch,
  });
}

export function replyToFeedback(id: string, body: string, notifyUser: boolean) {
  return adminFetch<{ ok: boolean; item: AdminFeedbackItem; emailed: boolean; emailError: string }>(
    `/api/admin/feedback/${id}/replies`,
    { method: "POST", body: { body, notifyUser } },
  );
}

export function deleteFeedback(id: string) {
  return adminFetch<{ ok: boolean; id: string }>(`/api/admin/feedback/${id}`, { method: "DELETE" });
}

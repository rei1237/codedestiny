"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor } from "@tiptap/react";
import ImageExtension from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { getApiBaseUrl } from "../../../_lib/api-config";
import { uploadInsightImage } from "../_lib/imageUpload";
import { sanitizeInsightHtml } from "../_lib/sanitizeContent";

type EditorMode = "create" | "edit";
type SaveStatus = "draft" | "scheduled" | "published" | "archived" | "private";
type ContentType = "fortune_insight" | "saju" | "tarot" | "astrology" | "jamidusu" | "sookyo" | "vedic" | "palmistry" | "physiognomy" | "notice" | "landing" | "seo_page" | "general";
type ContentFormat = "html" | "markdown" | "blocks";
type SeoCheckLevel = "pass" | "warn" | "error";
type PublicationCheck = {
  ok: boolean;
  dbReady: boolean;
  publicUrl: string;
  apiStatus?: { ok?: boolean; status?: number; error?: string };
  pageStatus?: { ok?: boolean; status?: number; error?: string };
  pageMeta?: {
    hasTitle?: boolean;
    hasDescription?: boolean;
    hasCanonical?: boolean;
    canonicalMatches?: boolean;
    hasOgTitle?: boolean;
    hasOgImage?: boolean;
    noIndex?: boolean;
  } | null;
  feedCoverage?: Record<string, { ok?: boolean; status?: number; containsSlug?: boolean; url?: string }> | null;
  purgeStatus?: string;
  checkedAt?: string;
};
type ContentRevision = {
  id: string;
  revision: number;
  reason?: string;
  savedAt?: string | null;
  savedBy?: string;
  title?: string;
  status?: string;
};

type SeoCheckItem = {
  key: string;
  label: string;
  level: SeoCheckLevel;
  message: string;
};

type InsightEditorPageProps = {
  mode: EditorMode;
  insightId?: string;
};

type InsightEditorCopy = {
  adminLoginRequired: string;
  adminPermissionDenied: string;
  linkPrompt: string;
  featuredImageFallback: string;
  featuredUploaded: string;
  featuredUploadFailed: string;
  editorNotReady: string;
  bodyImagePrompt: string;
  bodyImageFallback: string;
  relatedImageSuffix: string;
  bodyInserted: string;
  bodyUploadFailed: string;
  restoreConfirm: string;
  restoreFailed: string;
  restored: string;
  restoreNetworkFailed: string;
  missingEditId: string;
  detailLoadFailed: string;
  detailNetworkFailed: string;
  titleRequired: string;
  scheduleRequired: string;
  scheduleFutureRequired: string;
  seoFatal: string;
  seoWarnConfirm: string;
  saveFailed: string;
  saveNetworkFailed: string;
  autoSaving: string;
  autoSavedPrefix: string;
  autoSaveFailed: string;
  publishedVerified: string;
  publishedCheckNeeded: string;
  scheduledSaved: string;
  archivedSaved: string;
  privateSaved: string;
  draftSaved: string;
  editHeading: string;
  createHeading: string;
  pageSummary: string;
  scheduledAt: string;
  preview: string;
  closePreview: string;
  saving: string;
  saveDraft: string;
  saveArchive: string;
  publish: string;
  schedulePublish: string;
  scheduling: string;
  publicOk: string;
  publicNeedsCheck: string;
  publicUrlOpen: string;
  typeNames: Record<ContentType, string>;
  fieldHints: {
    title: string;
    subtitle: string;
    category: string;
    tags: string;
    excerpt: string;
    featuredAlt: string;
    featuredUrl: string;
  };
  uploadFeatured: string;
  uploading: string;
  uploadPolicy: string;
  featuredPreview: string;
  seo: {
    title: string;
    titleOk: string;
    titleMissing: string;
    metaLength: string;
    metaMissing: string;
    metaWarn: (count: number) => string;
    metaOk: (count: number) => string;
    h1Count: string;
    h1Ok: string;
    h1Error: (count: number) => string;
    h2Count: string;
    h2Ok: (count: number) => string;
    h2Warn: string;
    imageAlt: string;
    imageAltOk: string;
    imageAltEmpty: string;
    imageAltError: (count: number) => string;
    bodyLength: string;
    bodyOk: (count: number) => string;
    bodyShort: (count: number) => string;
    slugDuplicate: string;
    slugCheckFailed: string;
    slugDuplicated: string;
    slugOk: string;
    noIndexState: string;
    noIndexWarn: string;
    noIndexOk: string;
    featuredImage: string;
    featuredOk: string;
    featuredWarn: string;
  };
};

const INSIGHT_EDITOR_COPY_EN: InsightEditorCopy = {
  adminLoginRequired: "Admin login is required. Please sign in again.",
  adminPermissionDenied: "Admin permission could not be verified. Please sign in with an admin account again.",
  linkPrompt: "Enter link URL.",
  featuredImageFallback: "Featured image",
  featuredUploaded: "Featured image uploaded.",
  featuredUploadFailed: "Featured image upload failed.",
  editorNotReady: "The editor is not ready yet.",
  bodyImagePrompt: "Enter body image alt text.",
  bodyImageFallback: "Body image",
  relatedImageSuffix: " related image",
  bodyInserted: "Body image inserted.",
  bodyUploadFailed: "Body image upload failed.",
  restoreConfirm: "Restore the selected previous version? Current state will be kept as a pre-restore version.",
  restoreFailed: "Could not restore the version.",
  restored: "Restored the previous version.",
  restoreNetworkFailed: "A network error prevented restoring the version.",
  missingEditId: "Could not find the article ID to edit.",
  detailLoadFailed: "Could not load article information.",
  detailNetworkFailed: "A network error prevented loading article information.",
  titleRequired: "Enter a title.",
  scheduleRequired: "Select a scheduled publish time.",
  scheduleFutureRequired: "Set the scheduled publish time after the current time.",
  seoFatal: "SEO has critical errors, so publishing cannot continue. Fix the checklist items.",
  seoWarnConfirm: "SEO warnings remain. Continue after checking them?",
  saveFailed: "Could not save.",
  saveNetworkFailed: "A network error prevented saving.",
  autoSaving: "Auto-saving...",
  autoSavedPrefix: "Auto-saved",
  autoSaveFailed: "Auto-save failed",
  publishedVerified: "Published save complete · public URL confirmed",
  publishedCheckNeeded: "Published save complete · check the public reflection result",
  scheduledSaved: "Scheduled publish saved",
  archivedSaved: "Archived save complete",
  privateSaved: "Private save complete",
  draftSaved: "Draft saved",
  editHeading: "Edit Content Article",
  createHeading: "Create Content Article",
  pageSummary: "Representative/body image upload + basic SEO image metadata",
  scheduledAt: "Scheduled publish time",
  preview: "Preview",
  closePreview: "Close preview",
  saving: "Saving...",
  saveDraft: "Save Draft",
  saveArchive: "Archive Save",
  publish: "Publish",
  schedulePublish: "Schedule Publish",
  scheduling: "Scheduling...",
  publicOk: "Public reflection confirmed",
  publicNeedsCheck: "Public reflection needs check",
  publicUrlOpen: "Open public URL",
  typeNames: {
    fortune_insight: "Fortune Insight",
    saju: "Saju",
    tarot: "Tarot",
    astrology: "Astrology",
    jamidusu: "Zi Wei",
    sookyo: "Sukuyo",
    vedic: "Vedic",
    palmistry: "Palmistry",
    physiognomy: "Face Reading",
    notice: "Notice",
    landing: "Landing",
    seo_page: "SEO Page",
    general: "General",
  },
  fieldHints: {
    ["title"]: "Title",
    ["subtitle"]: "Subtitle",
    category: "Category",
    tags: "Tags, comma-separated",
    excerpt: "Summary",
    featuredAlt: "Featured image alt text",
    featuredUrl: "Featured image URL, direct entry allowed",
  },
  uploadFeatured: "Upload featured image",
  uploading: "Uploading...",
  uploadPolicy: "Allowed: jpg, jpeg, png, webp / max 6MB",
  featuredPreview: "Featured image preview (automatically used as OG image)",
  seo: {
    ["title"]: "Title",
    titleOk: "Title is entered.",
    titleMissing: "Title is empty.",
    metaLength: "Meta description length",
    metaMissing: "metaDescription is empty.",
    metaWarn: (count) => `Currently ${count} characters. Check the 70-180 character recommendation.`,
    metaOk: (count) => `Currently ${count} characters, which is appropriate.`,
    h1Count: "H1 count",
    h1Ok: "There is exactly one H1.",
    h1Error: (count) => `There are ${count} H1 tags. Exactly one is required.`,
    h2Count: "H2 count",
    h2Ok: (count) => `There are ${count} H2 tags.`,
    h2Warn: "At least one H2 is required.",
    imageAlt: "Image alt",
    imageAltOk: "All body image alt text is entered.",
    imageAltEmpty: "There are no body images, or no alt text is missing.",
    imageAltError: (count) => `${count} body images have empty alt text.`,
    bodyLength: "Body text length",
    bodyOk: (count) => `Body text is ${count} characters.`,
    bodyShort: (count) => `Body text is short at ${count} characters. 300+ characters are recommended.`,
    slugDuplicate: "Slug duplicate",
    slugCheckFailed: "Duplicate slug check failed. Check server validation when saving.",
    slugDuplicated: "The same slug already exists.",
    slugOk: "No duplicate slug found.",
    noIndexState: "noIndex status",
    noIndexWarn: "noIndex is on, so search indexing is restricted.",
    noIndexOk: "noIndex is off, so indexing is available.",
    featuredImage: "Featured image",
    featuredOk: "Featured image is set.",
    featuredWarn: "No featured image is set, so share previews may be weaker.",
  },
};

const INSIGHT_EDITOR_COPY_KO: InsightEditorCopy = {
  ...INSIGHT_EDITOR_COPY_EN,
  adminLoginRequired: "관리자 로그인이 필요합니다. 다시 로그인해 주세요.",
  adminPermissionDenied: "관리자 권한이 확인되지 않았습니다. 관리자 계정으로 다시 로그인해 주세요.",
  linkPrompt: "링크 URL을 입력하세요.",
  featuredImageFallback: "대표 이미지",
  featuredUploaded: "대표 이미지를 업로드했습니다.",
  featuredUploadFailed: "대표 이미지 업로드에 실패했습니다.",
  editorNotReady: "에디터가 아직 준비되지 않았습니다.",
  bodyImagePrompt: "본문 이미지 alt 텍스트를 입력하세요.",
  bodyImageFallback: "본문 이미지",
  relatedImageSuffix: " 관련 이미지",
  bodyInserted: "본문 이미지를 삽입했습니다.",
  bodyUploadFailed: "본문 이미지 업로드에 실패했습니다.",
  restoreConfirm: "선택한 이전 버전으로 복구할까요? 현재 상태는 복구 전 버전으로 보관됩니다.",
  restoreFailed: "버전 복구에 실패했습니다.",
  restored: "이전 버전으로 복구했습니다.",
  restoreNetworkFailed: "네트워크 오류로 버전을 복구하지 못했습니다.",
  missingEditId: "수정할 글 ID를 찾을 수 없습니다.",
  detailLoadFailed: "글 정보를 불러오지 못했습니다.",
  detailNetworkFailed: "네트워크 오류로 글 정보를 불러오지 못했습니다.",
  titleRequired: "제목을 입력해 주세요.",
  scheduleRequired: "예약 발행 시간을 선택해 주세요.",
  scheduleFutureRequired: "예약 발행 시간은 현재 시각 이후로 설정해 주세요.",
  seoFatal: "SEO 치명적 오류가 있어 발행할 수 없습니다. 점검 항목을 수정해 주세요.",
  seoWarnConfirm: "SEO 경고가 있습니다. 확인 후 진행하시겠습니까?",
  saveFailed: "저장에 실패했습니다.",
  saveNetworkFailed: "네트워크 오류로 저장하지 못했습니다.",
  autoSaving: "자동저장 중...",
  autoSavedPrefix: "자동저장 완료",
  autoSaveFailed: "자동저장 실패",
  publishedVerified: "발행 저장 완료 · 공개 URL 확인 완료",
  publishedCheckNeeded: "발행 저장 완료 · 공개 확인 결과를 확인해 주세요",
  scheduledSaved: "예약 발행 저장 완료",
  archivedSaved: "보관 저장 완료",
  privateSaved: "비공개 저장 완료",
  draftSaved: "임시저장 완료",
  editHeading: "콘텐츠 글 수정",
  createHeading: "콘텐츠 글 작성",
  pageSummary: "대표/본문 이미지 업로드 + 기본 SEO 이미지 메타",
  scheduledAt: "예약 발행 시간",
  preview: "미리보기",
  closePreview: "미리보기 닫기",
  saving: "저장 중...",
  saveDraft: "임시저장",
  saveArchive: "보관 저장",
  publish: "발행",
  schedulePublish: "예약 발행",
  scheduling: "예약 중...",
  publicOk: "공개 반영 확인 완료",
  publicNeedsCheck: "공개 반영 확인 필요",
  publicUrlOpen: "공개 URL 열기",
  typeNames: {
    fortune_insight: "운세 인사이트",
    saju: "사주",
    tarot: "타로",
    astrology: "점성술",
    jamidusu: "자미두수",
    sookyo: "숙요",
    vedic: "베다",
    palmistry: "손금",
    physiognomy: "관상",
    notice: "공지",
    landing: "랜딩",
    seo_page: "SEO 페이지",
    general: "일반",
  },
  fieldHints: {
    ["title"]: "제목",
    ["subtitle"]: "부제목",
    category: "카테고리",
    tags: "태그 (쉼표로 구분)",
    excerpt: "요약",
    featuredAlt: "대표 이미지 alt 텍스트",
    featuredUrl: "대표 이미지 URL (직접 입력도 가능)",
  },
  uploadFeatured: "대표 이미지 업로드",
  uploading: "업로드 중...",
  uploadPolicy: "허용 형식: jpg, jpeg, png, webp / 최대 6MB",
  featuredPreview: "대표 이미지 미리보기 (OG 이미지로 자동 사용)",
  seo: {
    ...INSIGHT_EDITOR_COPY_EN.seo,
    ["title"]: "제목",
    titleOk: "제목이 입력되어 있습니다.",
    titleMissing: "제목이 비어 있습니다.",
    metaLength: "메타 설명 길이",
    metaMissing: "metaDescription이 비어 있습니다.",
    metaWarn: (count) => `현재 ${count}자입니다. 70~180자 권장을 확인해 주세요.`,
    metaOk: (count) => `현재 ${count}자로 적절합니다.`,
    h1Count: "H1 개수",
    h1Ok: "H1이 1개입니다.",
    h1Error: (count) => `H1이 ${count}개입니다. 정확히 1개여야 합니다.`,
    h2Count: "H2 개수",
    h2Ok: (count) => `H2가 ${count}개 있습니다.`,
    h2Warn: "H2가 최소 1개 필요합니다.",
    imageAlt: "이미지 alt",
    imageAltOk: "본문 이미지 alt가 모두 입력되어 있습니다.",
    imageAltEmpty: "본문 이미지가 없거나 alt 누락이 없습니다.",
    imageAltError: (count) => `alt가 비어 있는 본문 이미지가 ${count}개 있습니다.`,
    bodyLength: "본문 글자 수",
    bodyOk: (count) => `본문 ${count}자입니다.`,
    bodyShort: (count) => `본문 ${count}자로 짧습니다. 300자 이상 권장합니다.`,
    slugDuplicate: "slug 중복",
    slugCheckFailed: "중복 slug 확인에 실패했습니다. 저장 시 서버 검증 결과를 확인해 주세요.",
    slugDuplicated: "동일한 slug가 이미 존재합니다.",
    slugOk: "중복 slug가 없습니다.",
    noIndexState: "noIndex 상태",
    noIndexWarn: "noIndex가 켜져 있어 검색엔진 색인이 제한됩니다.",
    noIndexOk: "noIndex가 꺼져 있어 색인 가능합니다.",
    featuredImage: "대표 이미지",
    featuredOk: "대표 이미지가 설정되어 있습니다.",
    featuredWarn: "대표 이미지가 없어 공유 미리보기가 약해질 수 있습니다.",
  },
};

const INSIGHT_EDITOR_COPY: Record<LoadingLocale, InsightEditorCopy> = {
  ko: INSIGHT_EDITOR_COPY_KO,
  en: INSIGHT_EDITOR_COPY_EN,
  ja: INSIGHT_EDITOR_COPY_EN,
  "zh-CN": INSIGHT_EDITOR_COPY_EN,
  "zh-TW": INSIGHT_EDITOR_COPY_EN,
  vi: INSIGHT_EDITOR_COPY_EN,
  hi: INSIGHT_EDITOR_COPY_EN,
  es: INSIGHT_EDITOR_COPY_EN,
  fr: INSIGHT_EDITOR_COPY_EN,
  de: INSIGHT_EDITOR_COPY_EN,
  nl: INSIGHT_EDITOR_COPY_EN,
  ms: INSIGHT_EDITOR_COPY_EN,
};

const INSIGHT_EDITOR_DATE_LOCALES: Record<LoadingLocale, string> = {
  ko: "ko-KR",
  en: "en-US",
  ja: "ja-JP",
  "zh-CN": "zh-CN",
  "zh-TW": "zh-TW",
  vi: "vi-VN",
  hi: "hi-IN",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  nl: "nl-NL",
  ms: "ms-MY",
};

const FLOWER_ADMIN_TOKEN_RE = /^[A-Za-z0-9_-]{20,}\.[0-9a-f]{64}$/;
const LOCAL_ADMIN_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function isLocalAdminHost(hostname: string): boolean {
  return LOCAL_ADMIN_HOSTS.has(String(hostname || "").trim().toLowerCase());
}

function getFlowerAdminTokenClient(): string {
  if (typeof window === "undefined") return "";

  try {
    const fromSession = String(sessionStorage.getItem("flower_admin_token") || "").trim();
    if (FLOWER_ADMIN_TOKEN_RE.test(fromSession)) return fromSession;
  } catch {}

  return "";
}

function buildAdminHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...(extraHeaders || {}) };
  const adminToken = getFlowerAdminTokenClient();
  if (adminToken) headers["x-admin-token"] = adminToken;
  return headers;
}

function resolveAdminRequestCredentials(apiBase: string): RequestCredentials {
  if (typeof window === "undefined") return "include";

  const base = String(apiBase || "").trim();
  if (!base) return "include";

  try {
    const target = new URL(base);
    const current = new URL(window.location.origin);
    if (target.origin === current.origin) return "include";
    if (isLocalAdminHost(target.hostname) && isLocalAdminHost(current.hostname)) return "include";
    return "omit";
  } catch {
    return "include";
  }
}

function getInsightEditorCopy(locale: LoadingLocale) {
  return INSIGHT_EDITOR_COPY[locale] || INSIGHT_EDITOR_COPY.en;
}

function getAdminAccessMessage(status: number, copy: InsightEditorCopy): string {
  if (status === 401) return copy.adminLoginRequired;
  return copy.adminPermissionDenied;
}

function getAdminLoginRedirectPath(): string {
  if (typeof window === "undefined") return "/admin/login";
  return `/admin/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
}

function clearFlowerAdminTokenClient(): void {
  if (typeof window === "undefined") return;
  try { sessionStorage.removeItem("flower_admin_token"); } catch {}
  try { sessionStorage.removeItem("flower_admin_password_ok"); } catch {}
}

function slugify(input: string): string {
  return String(input || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 120);
}

function parseTags(tagsText: string): string[] {
  return String(tagsText || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 40);
}

function parseKeywords(keywordsText: string): string[] {
  return String(keywordsText || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 50);
}

function getCheckBadgeClass(level: SeoCheckLevel): string {
  if (level === "error") return "border-rose-700 bg-rose-900/40 text-rose-200";
  if (level === "warn") return "border-amber-700 bg-amber-900/30 text-amber-200";
  return "border-emerald-700 bg-emerald-900/30 text-emerald-200";
}

function getLevelText(level: SeoCheckLevel): string {
  if (level === "error") return "치명";
  if (level === "warn") return "경고";
  return "양호";
}

function toDateTimeLocalValue(value: unknown): string {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) return "";
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 16);
}

function fromDateTimeLocalValue(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function extractHeadingAndImageStats(node: unknown, stats = { h1: 0, h2: 0, imageCount: 0, imageMissingAlt: 0 }) {
  if (!node || typeof node !== "object") return stats;

  const typedNode = node as {
    type?: unknown;
    attrs?: { level?: unknown; alt?: unknown };
    content?: unknown;
  };

  if (typedNode.type === "heading") {
    const level = Number(typedNode.attrs?.level || 0);
    if (level === 1) stats.h1 += 1;
    if (level === 2) stats.h2 += 1;
  }

  if (typedNode.type === "image") {
    stats.imageCount += 1;
    const alt = String(typedNode.attrs?.alt || "").trim();
    if (!alt) stats.imageMissingAlt += 1;
  }

  if (Array.isArray(typedNode.content)) {
    for (const child of typedNode.content) {
      extractHeadingAndImageStats(child, stats);
    }
  }

  return stats;
}

function editorButtonClass(active = false): string {
  if (active) return "rounded-lg border border-violet-500 bg-violet-700/60 px-2.5 py-1.5 text-xs text-white";
  return "rounded-lg border border-slate-700 bg-[#1b1b2b] px-2.5 py-1.5 text-xs text-slate-200 hover:border-slate-500";
}

const InsightImage = ImageExtension.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute("width"),
      },
      height: {
        default: null,
        parseHTML: (element) => element.getAttribute("height"),
      },
      loading: {
        default: "lazy",
        parseHTML: (element) => element.getAttribute("loading") || "lazy",
      },
    };
  },
});

export default function InsightEditorPage({ mode, insightId = "" }: InsightEditorPageProps) {
  const router = useRouter();
  const apiBase = useMemo(() => getApiBaseUrl(), []);
  const endpointBase = `${apiBase || ""}/api/admin/content`;
  const requestCredentials = useMemo(() => resolveAdminRequestCredentials(apiBase), [apiBase]);
  const isEditMode = mode === "edit";

  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const copy = getInsightEditorCopy(locale);
  const dateLocale = INSIGHT_EDITOR_DATE_LOCALES[locale] || INSIGHT_EDITOR_DATE_LOCALES.en;
  const [contentType, setContentType] = useState<ContentType>("fortune_insight");
  const [contentFormat, setContentFormat] = useState<ContentFormat>("html");
  const [contentStatus, setContentStatus] = useState<SaveStatus>("draft");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("");
  const [tagsText, setTagsText] = useState("");

  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [keywordsText, setKeywordsText] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [ogTitle, setOgTitle] = useState("");
  const [ogDescription, setOgDescription] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [twitterTitle, setTwitterTitle] = useState("");
  const [twitterDescription, setTwitterDescription] = useState("");
  const [twitterImage, setTwitterImage] = useState("");
  const [noIndex, setNoIndex] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);

  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [featuredImageAlt, setFeaturedImageAlt] = useState("");
  const [featuredImageWidth, setFeaturedImageWidth] = useState(0);
  const [featuredImageHeight, setFeaturedImageHeight] = useState(0);

  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savingStatus, setSavingStatus] = useState<SaveStatus | "">("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [contentLoaded, setContentLoaded] = useState(false);
  const [uploadingFeatured, setUploadingFeatured] = useState(false);
  const [uploadingBody, setUploadingBody] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);
  const [seoChecking, setSeoChecking] = useState(false);
  const [seoChecks, setSeoChecks] = useState<SeoCheckItem[]>([]);
  const [publicationCheck, setPublicationCheck] = useState<PublicationCheck | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [revisions, setRevisions] = useState<ContentRevision[]>([]);
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [restoringRevisionId, setRestoringRevisionId] = useState("");
  const [editorVersion, setEditorVersion] = useState(0);
  const [autoSaveStatus, setAutoSaveStatus] = useState("");
  const lastAutoSaveSignatureRef = useRef("");

  const featuredInputRef = useRef<HTMLInputElement | null>(null);
  const bodyInputRef = useRef<HTMLInputElement | null>(null);

  const editor = useEditor({
    extensions: [
      // StarterKit v3 가 Link 를 이미 번들한다. 별도 LinkExtension 을 함께 등록하면
      // "Duplicate extension names found: ['link']" 경고와 함께 두 인스턴스가 경쟁한다.
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true },
      }),
      InsightImage,
    ],
    content: "<p></p>",
    editorProps: {
      attributes: {
        class:
          "min-h-[420px] md:min-h-[520px] rounded-b-2xl border border-t-0 border-[#2f2f45] bg-[#10101a] px-5 py-5 text-[17px] leading-8 text-slate-100 focus:outline-none [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-5 [&_h1]:mb-3 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-3 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:border-violet-500 [&_blockquote]:pl-4 [&_blockquote]:text-slate-300 [&_hr]:my-6 [&_hr]:border-t [&_hr]:border-slate-700 [&_a]:text-violet-300 [&_a]:underline [&_img]:my-4 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:border [&_img]:border-slate-700",
      },
    },
    onUpdate: () => {
      setEditorVersion(Date.now());
    },
  });

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    window.addEventListener("storage", syncLocale);
    return () => {
      window.removeEventListener("cd:locale-ready", syncLocale);
      window.removeEventListener("storage", syncLocale);
    };
  }, []);

  function applyLink() {
    if (!editor) return;
    const oldHref = String(editor.getAttributes("link")?.href || "");
    const nextHref = window.prompt(copy.linkPrompt, oldHref || "https://");
    if (nextHref === null) return;

    if (!nextHref.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: nextHref.trim() }).run();
  }

  async function uploadFeaturedImage(file: File) {
    setError("");
    setMessage("");
    setUploadingFeatured(true);
    try {
      const uploaded = await uploadInsightImage({
        apiBase,
        file,
        usage: "featured",
        alt: featuredImageAlt || title || copy.featuredImageFallback,
        adminToken: getFlowerAdminTokenClient(),
      });
      setFeaturedImageUrl(uploaded.url);
      setFeaturedImageAlt(uploaded.alt || featuredImageAlt || title || copy.featuredImageFallback);
      setFeaturedImageWidth(uploaded.width || 0);
      setFeaturedImageHeight(uploaded.height || 0);
      if (!String(ogImage || "").trim()) setOgImage(uploaded.url);
      if (!String(twitterImage || "").trim()) setTwitterImage(uploaded.url);
      setMessage(copy.featuredUploaded);
    } catch (uploadError) {
      setError(String((uploadError as Error)?.message || copy.featuredUploadFailed));
    } finally {
      setUploadingFeatured(false);
    }
  }

  async function uploadAndInsertBodyImage(file: File) {
    if (!editor) {
      setError(copy.editorNotReady);
      return;
    }

    setError("");
    setMessage("");
    setUploadingBody(true);
    try {
      const alt = window.prompt(copy.bodyImagePrompt, title ? `${title}${copy.relatedImageSuffix}` : copy.bodyImageFallback) || "";
      const uploaded = await uploadInsightImage({
        apiBase,
        file,
        usage: "body",
        alt,
        adminToken: getFlowerAdminTokenClient(),
      });

      editor.chain().focus().setImage({
        src: uploaded.url,
        alt: uploaded.alt || alt,
        width: uploaded.width > 0 ? uploaded.width : undefined,
        height: uploaded.height > 0 ? uploaded.height : undefined,
      }).run();

      setMessage(copy.bodyInserted);
    } catch (uploadError) {
      setError(String((uploadError as Error)?.message || copy.bodyUploadFailed));
    } finally {
      setUploadingBody(false);
    }
  }

  function resolveCanonicalUrl(slugValue: string): string {
    const safeSlug = slugify(slugValue || "");
    const origin = typeof window !== "undefined" ? window.location.origin : "https://code-destiny.com";
    if (!safeSlug) return "";
    return `${origin.replace(/\/+$/, "")}/insights/${safeSlug}`;
  }

  function resolveSeoFields() {
    const safeSlug = slugify(slug || title);
    const textBody = String(editor?.getText({ blockSeparator: "\n" }) || "")
      .replace(/\s+/g, " ")
      .trim();
    const firstParagraph = String(
      (editor?.getText({ blockSeparator: "\n" }) || "")
        .split("\n")
        .map((line) => line.trim())
        .find(Boolean) || "",
    );

    const resolvedMetaTitle = String(metaTitle || "").trim() || String(title || "").trim();
    const resolvedMetaDescription = String(metaDescription || "").trim()
      || String(excerpt || "").trim()
      || firstParagraph;
    const resolvedOgTitle = String(ogTitle || "").trim() || resolvedMetaTitle;
    const resolvedOgDescription = String(ogDescription || "").trim() || resolvedMetaDescription;
    const resolvedOgImage = String(ogImage || "").trim() || String(featuredImageUrl || "").trim();
    const resolvedTwitterTitle = String(twitterTitle || "").trim() || resolvedOgTitle;
    const resolvedTwitterDescription = String(twitterDescription || "").trim() || resolvedOgDescription;
    const resolvedTwitterImage = String(twitterImage || "").trim() || resolvedOgImage;
    const resolvedCanonicalUrl = String(canonicalUrl || "").trim() || resolveCanonicalUrl(safeSlug);
    const resolvedKeywords = parseKeywords(keywordsText).length > 0 ? parseKeywords(keywordsText) : parseTags(tagsText);

    return {
      safeSlug,
      textBody,
      resolvedMetaTitle,
      resolvedMetaDescription,
      resolvedOgTitle,
      resolvedOgDescription,
      resolvedOgImage,
      resolvedTwitterTitle,
      resolvedTwitterDescription,
      resolvedTwitterImage,
      resolvedCanonicalUrl,
      resolvedKeywords,
    };
  }

  async function checkDuplicateSlug(candidateSlug: string): Promise<{ duplicated: boolean; checkFailed: boolean }> {
    if (!candidateSlug) return { duplicated: false, checkFailed: false };

    try {
      const url = new URL(endpointBase, window.location.origin);
      url.searchParams.set("includeTrash", "1");
      url.searchParams.set("q", candidateSlug);
      url.searchParams.set("pageSize", "100");

      const res = await fetch(url.toString(), {
        method: "GET",
        credentials: requestCredentials,
        headers: buildAdminHeaders(),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) return { duplicated: false, checkFailed: true };

      const items = Array.isArray(data?.items) ? data.items : [];
      const duplicated = items.some((item: unknown) => {
        const typedItem = item as { slug?: unknown; _id?: unknown };
        const slugValue = String(typedItem.slug || "").trim().toLowerCase();
        const idValue = String(typedItem._id || "");
        if (isEditMode && insightId && idValue === insightId) return false;
        return slugValue === candidateSlug.toLowerCase();
      });

      return { duplicated, checkFailed: false };
    } catch {
      return { duplicated: false, checkFailed: true };
    }
  }

  async function runSeoChecks(): Promise<{ items: SeoCheckItem[]; hasError: boolean; hasWarn: boolean }> {
    setSeoChecking(true);
    try {
      const resolved = resolveSeoFields();
      const stats = extractHeadingAndImageStats(editor?.getJSON?.() || {});
      const descriptionLength = resolved.resolvedMetaDescription.length;
      const textLength = resolved.textBody.replace(/\s+/g, "").length;
      const duplicateResult = await checkDuplicateSlug(resolved.safeSlug);

      const checks: SeoCheckItem[] = [];

      checks.push({
        key: "title",
        label: copy.seo.title,
        level: title.trim() ? "pass" : "error",
        message: title.trim() ? copy.seo.titleOk : copy.seo.titleMissing,
      });

      checks.push({
        key: "slug",
        label: "slug",
        level: resolved.safeSlug ? "pass" : "error",
        message: resolved.safeSlug ? "slug가 준비되어 있습니다." : "slug가 비어 있습니다.",
      });

      if (!resolved.resolvedMetaDescription) {
        checks.push({
          key: "metaDescription",
          label: copy.seo.metaLength,
          level: "error",
          message: copy.seo.metaMissing,
        });
      } else if (descriptionLength < 70 || descriptionLength > 180) {
        checks.push({
          key: "metaDescription",
          label: copy.seo.metaLength,
          level: "warn",
          message: copy.seo.metaWarn(descriptionLength),
        });
      } else {
        checks.push({
          key: "metaDescription",
          label: copy.seo.metaLength,
          level: "pass",
          message: copy.seo.metaOk(descriptionLength),
        });
      }

      checks.push({
        key: "h1",
        label: copy.seo.h1Count,
        level: stats.h1 === 1 ? "pass" : "error",
        message: stats.h1 === 1 ? copy.seo.h1Ok : copy.seo.h1Error(stats.h1),
      });

      checks.push({
        key: "h2",
        label: copy.seo.h2Count,
        level: stats.h2 >= 1 ? "pass" : "error",
        message: stats.h2 >= 1 ? copy.seo.h2Ok(stats.h2) : copy.seo.h2Warn,
      });

      checks.push({
        key: "imageAlt",
        label: copy.seo.imageAlt,
        level: stats.imageMissingAlt === 0 ? "pass" : "error",
        message: stats.imageMissingAlt === 0
          ? (stats.imageCount > 0 ? copy.seo.imageAltOk : copy.seo.imageAltEmpty)
          : copy.seo.imageAltError(stats.imageMissingAlt),
      });

      checks.push({
        key: "bodyLength",
        label: copy.seo.bodyLength,
        level: textLength >= 300 ? "pass" : "warn",
        message: textLength >= 300 ? copy.seo.bodyOk(textLength) : copy.seo.bodyShort(textLength),
      });

      if (duplicateResult.checkFailed) {
        checks.push({
          key: "slugDuplicate",
          label: copy.seo.slugDuplicate,
          level: "warn",
          message: copy.seo.slugCheckFailed,
        });
      } else {
        checks.push({
          key: "slugDuplicate",
          label: copy.seo.slugDuplicate,
          level: duplicateResult.duplicated ? "error" : "pass",
          message: duplicateResult.duplicated ? copy.seo.slugDuplicated : copy.seo.slugOk,
        });
      }

      checks.push({
        key: "noIndex",
        label: copy.seo.noIndexState,
        level: noIndex ? "warn" : "pass",
        message: noIndex ? copy.seo.noIndexWarn : copy.seo.noIndexOk,
      });

      checks.push({
        key: "featuredImage",
        label: copy.seo.featuredImage,
        level: featuredImageUrl.trim() ? "pass" : "warn",
        message: featuredImageUrl.trim() ? copy.seo.featuredOk : copy.seo.featuredWarn,
      });

      setSeoChecks(checks);

      const hasError = checks.some((item) => item.level === "error");
      const hasWarn = checks.some((item) => item.level === "warn");
      return { items: checks, hasError, hasWarn };
    } finally {
      setSeoChecking(false);
    }
  }

  async function runPublishFinalization(contentId: string): Promise<PublicationCheck | null> {
    if (!contentId) return null;

    let purgeStatus = "not_requested";
    try {
      const purgeRes = await fetch(`${endpointBase}/${encodeURIComponent(contentId)}/cache-purge`, {
        method: "POST",
        credentials: requestCredentials,
        headers: buildAdminHeaders({ "Content-Type": "application/json" }),
        cache: "no-store",
      });
      const purgeData = await purgeRes.json().catch(() => ({}));
      purgeStatus = String(purgeData?.purge?.status || (purgeRes.ok ? "requested" : "failed"));
    } catch {
      purgeStatus = "failed";
    }

    try {
      const statusRes = await fetch(`${endpointBase}/${encodeURIComponent(contentId)}/publish-status`, {
        method: "GET",
        credentials: requestCredentials,
        headers: buildAdminHeaders(),
        cache: "no-store",
      });
      const statusData = await statusRes.json().catch(() => ({}));
      const publication = statusData?.publication || {};
      const nextCheck: PublicationCheck = {
        ok: Boolean(publication?.ok),
        dbReady: Boolean(publication?.dbReady),
        publicUrl: String(publication?.publicUrl || ""),
        apiStatus: publication?.apiStatus || undefined,
        pageStatus: publication?.pageStatus || undefined,
        pageMeta: publication?.pageMeta || null,
        feedCoverage: publication?.feedCoverage || null,
        purgeStatus,
        checkedAt: String(publication?.checkedAt || new Date().toISOString()),
      };
      setPublicationCheck(nextCheck);
      return nextCheck;
    } catch {
      const failedCheck: PublicationCheck = {
        ok: false,
        dbReady: false,
        publicUrl: "",
        purgeStatus,
        checkedAt: new Date().toISOString(),
      };
      setPublicationCheck(failedCheck);
      return failedCheck;
    }
  }

  const loadRevisions = useCallback(async (contentId = insightId) => {
    if (!contentId) return;
    try {
      const res = await fetch(`${endpointBase}/${encodeURIComponent(contentId)}/revisions`, {
        method: "GET",
        credentials: requestCredentials,
        headers: buildAdminHeaders(),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      setRevisions(Array.isArray(data?.revisions) ? data.revisions : []);
    } catch {}
  }, [endpointBase, insightId, requestCredentials]);

  async function restoreRevision(revisionId: string) {
    if (!insightId || !revisionId) return;
    const proceed = window.confirm(copy.restoreConfirm);
    if (!proceed) return;

    setRestoringRevisionId(revisionId);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`${endpointBase}/${encodeURIComponent(insightId)}/restore`, {
        method: "POST",
        credentials: requestCredentials,
        headers: buildAdminHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ revisionId }),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(String(data?.message || copy.restoreFailed));
        return;
      }
      setMessage(copy.restored);
      await loadRevisions(insightId);
      window.location.reload();
    } catch {
      setError(copy.restoreNetworkFailed);
    } finally {
      setRestoringRevisionId("");
    }
  }

  useEffect(() => {
    if (!isEditMode) {
      setLoading(false);
      return;
    }

    if (!insightId) {
      setError(copy.missingEditId);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadDetail() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${endpointBase}/${insightId}`, {
          method: "GET",
          credentials: requestCredentials,
          headers: buildAdminHeaders(),
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            if (res.status === 401) clearFlowerAdminTokenClient();
            if (!cancelled) setError(getAdminAccessMessage(res.status, copy));
            router.replace(getAdminLoginRedirectPath());
            return;
          }
          if (!cancelled) setError(String(data?.message || copy.detailLoadFailed));
          return;
        }

        const item = data?.item || {};
        if (cancelled) return;

        setContentType((String(item.type || "fortune_insight").trim().toLowerCase() as ContentType) || "fortune_insight");
        setContentFormat((String(item.contentFormat || "html").trim().toLowerCase() as ContentFormat) || "html");
        setContentStatus((String(item.status || "draft").trim().toLowerCase() as SaveStatus) || "draft");

        setTitle(String(item.title || ""));
        setSubtitle(String(item.subtitle || ""));
        setSlug(String(item.slug || ""));
        setSlugEdited(Boolean(item.slug));
        setExcerpt(String(item.summary || item.excerpt || ""));
        setCategory(String(item.category || ""));
        setTagsText(Array.isArray(item.tags) ? item.tags.map((tag: unknown) => String(tag)).join(", ") : "");
        setMetaTitle(String(item?.seo?.metaTitle || item.metaTitle || ""));
        setMetaDescription(String(item?.seo?.metaDescription || item.metaDescription || ""));
        setKeywordsText(Array.isArray(item.keywords) ? item.keywords.map((tag: unknown) => String(tag)).join(", ") : "");
        setCanonicalUrl(String(item?.seo?.canonicalUrl || item.canonicalUrl || ""));
        setOgTitle(String(item?.seo?.ogTitle || item.ogTitle || ""));
        setOgDescription(String(item?.seo?.ogDescription || item.ogDescription || ""));
        setOgImage(String(item?.seo?.ogImage || item.ogImage || ""));
        setTwitterTitle(String(item.twitterTitle || ""));
        setTwitterDescription(String(item.twitterDescription || ""));
        setTwitterImage(String(item.twitterImage || ""));
        setNoIndex(Boolean(item.noIndex));
        setIsFeatured(Boolean(item.isFeatured));
        setScheduledAt(toDateTimeLocalValue(item.publishedAt));
        setFeaturedImageUrl(String(item?.thumbnailUrl || item?.featuredImage?.url || ""));
        setFeaturedImageAlt(String(item?.featuredImage?.alt || ""));
        setFeaturedImageWidth(Math.max(0, Number(item?.featuredImage?.width || 0) || 0));
        setFeaturedImageHeight(Math.max(0, Number(item?.featuredImage?.height || 0) || 0));

        if (editor) {
          if (item.contentJson && typeof item.contentJson === "object") {
            editor.commands.setContent(item.contentJson);
          } else {
            editor.commands.setContent(sanitizeInsightHtml(String(item.contentHtml || "<p></p>")) || "<p></p>");
          }
        }

        setContentLoaded(true);
        await loadRevisions(insightId);
      } catch {
        if (!cancelled) setError(copy.detailNetworkFailed);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDetail();
    return () => {
      cancelled = true;
    };
  }, [copy, editor, endpointBase, insightId, isEditMode, loadRevisions, requestCredentials, router]);

  useEffect(() => {
    if (isEditMode) return;
    if (!editor) return;
    if (contentLoaded) return;

    editor.commands.setContent("<p></p>");
    setContentLoaded(true);
  }, [contentLoaded, editor, isEditMode]);

  async function saveWithStatus(status: SaveStatus, options: { silent?: boolean; auto?: boolean } = {}) {
    if (!options.silent) {
      setError("");
      setMessage("");
    }

    if (!title.trim()) {
      if (!options.silent) setError(copy.titleRequired);
      return;
    }

    if (!editor) {
      if (!options.silent) setError(copy.editorNotReady);
      return;
    }

    if (status === "scheduled" && !fromDateTimeLocalValue(scheduledAt)) {
      if (!options.silent) setError(copy.scheduleRequired);
      return;
    }

    if (status === "scheduled") {
      const scheduledDate = fromDateTimeLocalValue(scheduledAt);
      if (scheduledDate && new Date(scheduledDate).getTime() <= Date.now()) {
        if (!options.silent) setError(copy.scheduleFutureRequired);
        return;
      }
    }

    if (status === "published" || status === "scheduled") {
      const checkResult = await runSeoChecks();
      if (checkResult.hasError) {
        setSeoOpen(true);
        if (!options.silent) setError(copy.seoFatal);
        return;
      }

      if (checkResult.hasWarn) {
        const proceed = window.confirm(copy.seoWarnConfirm);
        if (!proceed) return;
      }
    }

    if (options.auto) {
      setAutoSaveStatus(copy.autoSaving);
    } else {
      setSavingStatus(status);
      setPublicationCheck(null);
    }
    try {
      const html = sanitizeInsightHtml(editor.getHTML());
      const seo = resolveSeoFields();
      const payload = {
        type: contentType,
        title: title.trim(),
        subtitle: subtitle.trim(),
        slug: seo.safeSlug,
        summary: excerpt.trim(),
        excerpt: excerpt.trim(),
        category: category.trim(),
        tags: parseTags(tagsText),
        content: html,
        contentFormat,
        thumbnailUrl: featuredImageUrl.trim(),
        seo: {
          metaTitle: seo.resolvedMetaTitle,
          metaDescription: seo.resolvedMetaDescription,
          ogTitle: seo.resolvedOgTitle,
          ogDescription: seo.resolvedOgDescription,
          ogImage: seo.resolvedOgImage,
          canonicalUrl: seo.resolvedCanonicalUrl,
        },
        metaTitle: seo.resolvedMetaTitle,
        metaDescription: seo.resolvedMetaDescription,
        keywords: seo.resolvedKeywords,
        canonicalUrl: seo.resolvedCanonicalUrl,
        ogTitle: seo.resolvedOgTitle,
        ogDescription: seo.resolvedOgDescription,
        ogImage: seo.resolvedOgImage,
        twitterTitle: seo.resolvedTwitterTitle,
        twitterDescription: seo.resolvedTwitterDescription,
        twitterImage: seo.resolvedTwitterImage,
        noIndex,
        isFeatured,
        featuredImage: {
          url: featuredImageUrl.trim(),
          alt: (featuredImageAlt || title).trim(),
          width: Math.max(0, Number(featuredImageWidth || 0) || 0),
          height: Math.max(0, Number(featuredImageHeight || 0) || 0),
        },
        status,
        publishedAt: status === "scheduled" ? fromDateTimeLocalValue(scheduledAt) : undefined,
        contentHtml: html,
        contentJson: editor.getJSON(),
      };

      const targetUrl = isEditMode ? `${endpointBase}/${insightId}` : endpointBase;
      const method = isEditMode ? "PATCH" : "POST";

      const res = await fetch(targetUrl, {
        method,
        credentials: requestCredentials,
        headers: buildAdminHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          if (res.status === 401) clearFlowerAdminTokenClient();
          if (!options.silent) setError(getAdminAccessMessage(res.status, copy));
          router.replace(getAdminLoginRedirectPath());
          return;
        }
        if (options.auto) {
          setAutoSaveStatus(copy.autoSaveFailed);
        } else {
          setError(String(data?.message || copy.saveFailed));
        }
        return;
      }

      const savedItem = data?.item || {};
      const savedId = String(savedItem?._id || savedItem?.id || insightId || "");
      let publishCheck: PublicationCheck | null = null;
      if (status === "published" && savedId) {
        publishCheck = await runPublishFinalization(savedId);
      }
      if (savedId) await loadRevisions(savedId);
      setContentStatus(status);

      if (!isEditMode) {
        const newId = savedId;
        if (newId) {
          router.replace(`/admin/insights/edit?id=${encodeURIComponent(newId)}`);
          return;
        }
      }

      if (options.auto) {
        setAutoSaveStatus(`${copy.autoSavedPrefix} ${new Date().toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" })}`);
      } else {
        setMessage(status === "published"
          ? (publishCheck?.ok ? copy.publishedVerified : copy.publishedCheckNeeded)
          : status === "scheduled" ? copy.scheduledSaved
          : status === "archived" ? copy.archivedSaved : status === "private" ? copy.privateSaved : copy.draftSaved);
      }
    } catch {
      if (options.auto) {
        setAutoSaveStatus(copy.autoSaveFailed);
      } else {
        setError(copy.saveNetworkFailed);
      }
    } finally {
      if (!options.auto) setSavingStatus("");
    }
  }

  useEffect(() => {
    if (!isEditMode || contentStatus !== "draft" || !contentLoaded || !editor || !title.trim() || savingStatus) return;
    const html = editor.getHTML();
    const signature = JSON.stringify({
      title,
      subtitle,
      slug,
      excerpt,
      category,
      tagsText,
      html,
      editorVersion,
    });
    if (signature === lastAutoSaveSignatureRef.current) return;

    const timer = window.setTimeout(() => {
      lastAutoSaveSignatureRef.current = signature;
      void saveWithStatus("draft", { silent: true, auto: true });
    }, 30000);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, contentLoaded, contentStatus, editor, editorVersion, excerpt, isEditMode, savingStatus, slug, subtitle, tagsText, title]);

  return (
    <main className="min-h-screen bg-[#0d0d1a] text-slate-100 px-3 py-4 md:px-8 md:py-8">
      <section className="mx-auto w-full max-w-6xl space-y-4">
        <div className="sticky top-0 z-30 rounded-2xl border border-[#2a2a3e] bg-[#13131f]/95 px-3 py-3 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-lg md:text-xl font-bold">{isEditMode ? copy.editHeading : copy.createHeading}</h1>
              <p className="text-xs text-slate-400 mt-0.5">{copy.pageSummary}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
                className="rounded-lg border border-[#313145] bg-[#1e1e2e] px-3 py-2 text-sm text-slate-100"
                aria-label={copy.scheduledAt}
              />
              <button
                type="button"
                onClick={() => setPreviewOpen((open) => !open)}
                className="rounded-lg bg-blue-700 hover:bg-blue-600 px-3 py-2 text-sm"
              >
                {previewOpen ? copy.closePreview : copy.preview}
              </button>
              <button
                type="button"
                onClick={() => saveWithStatus("draft")}
                disabled={Boolean(savingStatus)}
                className="rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-60 px-3 py-2 text-sm"
              >
                {savingStatus === "draft" ? copy.saving : copy.saveDraft}
              </button>
              <button
                type="button"
                onClick={() => saveWithStatus("archived")}
                disabled={Boolean(savingStatus)}
                className="rounded-lg bg-amber-700 hover:bg-amber-600 disabled:opacity-60 px-3 py-2 text-sm"
              >
                {savingStatus === "archived" ? copy.saving : copy.saveArchive}
              </button>
              <button
                type="button"
                onClick={() => saveWithStatus("published")}
                disabled={Boolean(savingStatus)}
                className="rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 px-3 py-2 text-sm font-medium"
              >
                {savingStatus === "published" ? copy.saving : copy.publish}
              </button>
              <button
                type="button"
                onClick={() => saveWithStatus("scheduled")}
                disabled={Boolean(savingStatus)}
                className="rounded-lg bg-blue-700 hover:bg-blue-600 disabled:opacity-60 px-3 py-2 text-sm font-medium"
              >
                {savingStatus === "scheduled" ? copy.scheduling : copy.schedulePublish}
              </button>
            </div>
          </div>

          {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
          {message ? <p className="mt-2 text-sm text-emerald-300">{message}</p> : null}
          {autoSaveStatus ? <p className="mt-2 text-xs text-slate-400">{autoSaveStatus}</p> : null}
          {publicationCheck ? (
            <div className={`mt-3 rounded-xl border px-3 py-2 text-xs ${publicationCheck.ok ? "border-emerald-700 bg-emerald-900/25 text-emerald-100" : "border-amber-700 bg-amber-900/25 text-amber-100"}`}>
              <p className="font-semibold">{publicationCheck.ok ? copy.publicOk : copy.publicNeedsCheck}</p>
              <p className="mt-1">
                DB {publicationCheck.dbReady ? "OK" : copy.publicNeedsCheck} · API {publicationCheck.apiStatus?.status || "-"} · Page {publicationCheck.pageStatus?.status || "-"} · Cache {publicationCheck.purgeStatus || "-"}
              </p>
              {publicationCheck.pageMeta ? (
                <p className="mt-1">
                  Meta title {publicationCheck.pageMeta.hasTitle ? "OK" : copy.publicNeedsCheck} · description {publicationCheck.pageMeta.hasDescription ? "OK" : copy.publicNeedsCheck} · canonical {publicationCheck.pageMeta.canonicalMatches ? "OK" : copy.publicNeedsCheck} · robots {publicationCheck.pageMeta.noIndex ? "noindex" : "index"}
                </p>
              ) : null}
              {publicationCheck.feedCoverage ? (
                <p className="mt-1">
                  sitemap {publicationCheck.feedCoverage.sitemap?.containsSlug ? "OK" : copy.publicNeedsCheck} · RSS {publicationCheck.feedCoverage.rss?.containsSlug ? "OK" : copy.publicNeedsCheck} · insights RSS {publicationCheck.feedCoverage.insightsRss?.containsSlug ? "OK" : copy.publicNeedsCheck}
                </p>
              ) : null}
              {publicationCheck.publicUrl ? (
                <a className="mt-1 inline-flex text-violet-200 underline" href={publicationCheck.publicUrl} target="_blank" rel="noreferrer">
                  {copy.publicUrlOpen}
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-[#2a2a3e] bg-[#13131f] p-4 md:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as ContentType)}
              className="rounded-lg bg-[#1e1e2e] border border-[#313145] px-3 py-2.5 text-sm"
            >
              {Object.entries(copy.typeNames).map(([value, text]) => (
                <option key={value} value={value}>{text}</option>
              ))}
            </select>
            <select
              value={contentFormat}
              onChange={(e) => setContentFormat(e.target.value as ContentFormat)}
              className="rounded-lg bg-[#1e1e2e] border border-[#313145] px-3 py-2.5 text-sm"
            >
              <option value="html">HTML</option>
              <option value="markdown">Markdown</option>
              <option value="blocks">Blocks(JSON)</option>
            </select>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                const value = e.target.value;
                setTitle(value);
                if (!slugEdited) setSlug(slugify(value));
              }}
              placeholder={copy.fieldHints.title}
              className="md:col-span-2 rounded-xl bg-[#1e1e2e] border border-[#313145] px-4 py-3 text-2xl md:text-3xl font-semibold placeholder-slate-600"
            />
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder={copy.fieldHints.subtitle}
              className="md:col-span-2 rounded-lg bg-[#1e1e2e] border border-[#313145] px-3 py-2.5 text-sm"
            />
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlugEdited(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="slug"
              className="rounded-lg bg-[#1e1e2e] border border-[#313145] px-3 py-2.5 text-sm"
            />
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={copy.fieldHints.category}
              className="rounded-lg bg-[#1e1e2e] border border-[#313145] px-3 py-2.5 text-sm"
            />
            <input
              type="text"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder={copy.fieldHints.tags}
              className="md:col-span-2 rounded-lg bg-[#1e1e2e] border border-[#313145] px-3 py-2.5 text-sm"
            />
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder={copy.fieldHints.excerpt}
              className="md:col-span-2 rounded-lg bg-[#1e1e2e] border border-[#313145] px-3 py-2.5 text-sm min-h-[88px]"
            />
            <input
              type="text"
              value={featuredImageAlt}
              onChange={(e) => setFeaturedImageAlt(e.target.value)}
              placeholder={copy.fieldHints.featuredAlt}
              className="rounded-lg bg-[#1e1e2e] border border-[#313145] px-3 py-2.5 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={0}
                value={featuredImageWidth || 0}
                onChange={(e) => setFeaturedImageWidth(Math.max(0, Number(e.target.value || 0) || 0))}
                placeholder="width"
                className="rounded-lg bg-[#1e1e2e] border border-[#313145] px-3 py-2.5 text-sm"
              />
              <input
                type="number"
                min={0}
                value={featuredImageHeight || 0}
                onChange={(e) => setFeaturedImageHeight(Math.max(0, Number(e.target.value || 0) || 0))}
                placeholder="height"
                className="rounded-lg bg-[#1e1e2e] border border-[#313145] px-3 py-2.5 text-sm"
              />
            </div>
            <div className="md:col-span-2 flex flex-wrap items-center gap-2">
              <input
                ref={featuredInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  uploadFeaturedImage(file);
                  event.currentTarget.value = "";
                }}
              />
              <button
                type="button"
                disabled={uploadingFeatured}
                onClick={() => featuredInputRef.current?.click()}
                className="rounded-lg bg-violet-700 hover:bg-violet-600 disabled:opacity-60 px-3 py-2 text-sm"
              >
                {uploadingFeatured ? copy.uploading : copy.uploadFeatured}
              </button>
              <p className="text-xs text-slate-400">{copy.uploadPolicy}</p>
            </div>
            {featuredImageUrl ? (
              <div className="md:col-span-2 rounded-xl border border-slate-700 bg-slate-900/50 p-3">
                <p className="text-xs text-slate-400 mb-2">{copy.featuredPreview}</p>
                <img
                  src={featuredImageUrl}
                  alt={featuredImageAlt || title || copy.featuredImageFallback}
                  width={featuredImageWidth || undefined}
                  height={featuredImageHeight || undefined}
                  loading="lazy"
                  className="max-h-64 w-auto rounded-lg border border-slate-700"
                />
              </div>
            ) : null}
            <input
              type="text"
              value={featuredImageUrl}
              onChange={(e) => setFeaturedImageUrl(e.target.value)}
              placeholder={copy.fieldHints.featuredUrl}
              className="md:col-span-2 rounded-lg bg-[#1e1e2e] border border-[#313145] px-3 py-2.5 text-sm"
            />
          </div>
        </div>

        <section className="rounded-2xl border border-[#2a2a3e] bg-[#13131f] p-4 md:p-6 space-y-4">
          <button
            type="button"
            onClick={() => setSeoOpen((open) => !open)}
            className="w-full flex items-center justify-between rounded-xl border border-[#313145] bg-[#1a1a2b] px-4 py-3 text-left"
          >
            <div>
              <h2 className="text-base font-semibold">SEO 설정</h2>
              <p className="text-xs text-slate-400 mt-1">검색/공유 정보 직접 입력 + 자동 기본값 지원</p>
            </div>
            <span className="text-sm text-slate-300">{seoOpen ? "접기" : "펼치기"}</span>
          </button>

          {seoOpen ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder="metaTitle (비우면 제목 사용)" className="md:col-span-2 rounded-lg bg-[#1e1e2e] border border-[#313145] px-3 py-2.5 text-sm" />
                <textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder="metaDescription (비우면 요약/본문 첫 문단 사용)" className="md:col-span-2 rounded-lg bg-[#1e1e2e] border border-[#313145] px-3 py-2.5 text-sm min-h-[80px]" />
                <input value={keywordsText} onChange={(e) => setKeywordsText(e.target.value)} placeholder="keywords (쉼표 구분)" className="md:col-span-2 rounded-lg bg-[#1e1e2e] border border-[#313145] px-3 py-2.5 text-sm" />
                <input value={canonicalUrl} onChange={(e) => setCanonicalUrl(e.target.value)} placeholder="canonicalUrl (비우면 도메인+slug 자동 생성)" className="md:col-span-2 rounded-lg bg-[#1e1e2e] border border-[#313145] px-3 py-2.5 text-sm" />
                <input value={ogTitle} onChange={(e) => setOgTitle(e.target.value)} placeholder="ogTitle (비우면 metaTitle 사용)" className="rounded-lg bg-[#1e1e2e] border border-[#313145] px-3 py-2.5 text-sm" />
                <input value={ogImage} onChange={(e) => setOgImage(e.target.value)} placeholder="ogImage (비우면 대표 이미지 사용)" className="rounded-lg bg-[#1e1e2e] border border-[#313145] px-3 py-2.5 text-sm" />
                <textarea value={ogDescription} onChange={(e) => setOgDescription(e.target.value)} placeholder="ogDescription (비우면 metaDescription 사용)" className="md:col-span-2 rounded-lg bg-[#1e1e2e] border border-[#313145] px-3 py-2.5 text-sm min-h-[70px]" />
                <input value={twitterTitle} onChange={(e) => setTwitterTitle(e.target.value)} placeholder="twitterTitle (비우면 ogTitle 사용)" className="rounded-lg bg-[#1e1e2e] border border-[#313145] px-3 py-2.5 text-sm" />
                <input value={twitterImage} onChange={(e) => setTwitterImage(e.target.value)} placeholder="twitterImage (비우면 ogImage 사용)" className="rounded-lg bg-[#1e1e2e] border border-[#313145] px-3 py-2.5 text-sm" />
                <textarea value={twitterDescription} onChange={(e) => setTwitterDescription(e.target.value)} placeholder="twitterDescription (비우면 ogDescription 사용)" className="md:col-span-2 rounded-lg bg-[#1e1e2e] border border-[#313145] px-3 py-2.5 text-sm min-h-[70px]" />
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-slate-200">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={noIndex} onChange={(e) => setNoIndex(e.target.checked)} />
                  noIndex
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
                  isFeatured
                </label>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-3">
                <p className="text-xs text-slate-400">자동 기본값 규칙</p>
                <p className="text-xs text-slate-300 mt-1">meta/og/twitter/canonical이 비어 있으면 제목, 요약, 대표 이미지, slug 기준으로 자동 채워집니다.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => { void runSeoChecks(); }}
                  disabled={seoChecking}
                  className="rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-60 px-3 py-2 text-sm"
                >
                  {seoChecking ? "점검 중..." : "SEO 점검 실행"}
                </button>
                <p className="text-xs text-slate-400">초록: 양호 / 노랑: 경고 / 빨강: 발행 차단</p>
              </div>

              {seoChecks.length > 0 ? (
                <div className="space-y-2">
                  {seoChecks.map((item) => (
                    <div key={item.key} className={`rounded-lg border px-3 py-2 ${getCheckBadgeClass(item.level)}`}>
                      <p className="text-xs font-semibold">[{getLevelText(item.level)}] {item.label}</p>
                      <p className="text-xs mt-1">{item.message}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        {isEditMode ? (
          <section className="rounded-2xl border border-[#2a2a3e] bg-[#13131f] p-4 md:p-6 space-y-3">
            <button
              type="button"
              onClick={() => {
                setRevisionsOpen((open) => !open);
                void loadRevisions();
              }}
              className="w-full flex items-center justify-between rounded-xl border border-[#313145] bg-[#1a1a2b] px-4 py-3 text-left"
            >
              <div>
                <h2 className="text-base font-semibold">버전 이력</h2>
                <p className="mt-1 text-xs text-slate-400">저장 전 상태를 최대 20개까지 보관합니다.</p>
              </div>
              <span className="text-sm text-slate-300">{revisionsOpen ? "접기" : "펼치기"}</span>
            </button>

            {revisionsOpen ? (
              <div className="space-y-2">
                {revisions.length === 0 ? (
                  <p className="rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2 text-xs text-slate-400">아직 복구 가능한 이전 버전이 없습니다.</p>
                ) : revisions.map((revision) => (
                  <div key={revision.id || revision.revision} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2">
                    <div>
                      <p className="text-sm text-slate-100">v{revision.revision} · {revision.title || "제목 없음"}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{revision.status || "draft"} · {revision.savedAt ? new Date(revision.savedAt).toLocaleString("ko-KR") : "-"}</p>
                    </div>
                    <button
                      type="button"
                      disabled={restoringRevisionId === revision.id}
                      onClick={() => restoreRevision(revision.id)}
                      className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs hover:bg-amber-600 disabled:opacity-60"
                    >
                      {restoringRevisionId === revision.id ? "복구 중..." : "이 버전 복구"}
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="rounded-2xl border border-[#2a2a3e] bg-[#13131f] overflow-hidden">
          <div className="border-b border-[#2f2f45] bg-[#171727] px-3 py-2">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => editor?.chain().focus().setParagraph().run()} className={editorButtonClass(Boolean(editor?.isActive("paragraph")))}>본문</button>
              <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} className={editorButtonClass(Boolean(editor?.isActive("heading", { level: 1 })))}>H1</button>
              <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className={editorButtonClass(Boolean(editor?.isActive("heading", { level: 2 })))}>H2</button>
              <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} className={editorButtonClass(Boolean(editor?.isActive("heading", { level: 3 })))}>H3</button>
              <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} className={editorButtonClass(Boolean(editor?.isActive("bold")))}>굵게</button>
              <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} className={editorButtonClass(Boolean(editor?.isActive("italic")))}>기울임</button>
              <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()} className={editorButtonClass(Boolean(editor?.isActive("bulletList")))}>목록</button>
              <button type="button" onClick={() => editor?.chain().focus().toggleOrderedList().run()} className={editorButtonClass(Boolean(editor?.isActive("orderedList")))}>번호 목록</button>
              <button type="button" onClick={() => editor?.chain().focus().toggleBlockquote().run()} className={editorButtonClass(Boolean(editor?.isActive("blockquote")))}>인용문</button>
              <button type="button" onClick={() => editor?.chain().focus().setHorizontalRule().run()} className={editorButtonClass(false)}>구분선</button>
              <button type="button" onClick={applyLink} className={editorButtonClass(Boolean(editor?.isActive("link")))}>링크</button>
              <input
                ref={bodyInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  uploadAndInsertBodyImage(file);
                  event.currentTarget.value = "";
                }}
              />
              <button
                type="button"
                disabled={uploadingBody}
                onClick={() => bodyInputRef.current?.click()}
                className={editorButtonClass(false)}
              >
                {uploadingBody ? "업로드 중..." : "이미지 삽입"}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="min-h-[420px] md:min-h-[520px] px-5 py-5 text-sm text-slate-400">불러오는 중...</div>
          ) : (
            <EditorContent editor={editor} />
          )}
        </div>

        {previewOpen ? (
          <section className="rounded-2xl border border-blue-800/70 bg-[#101827] p-4 md:p-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-blue-100">편집 내용 미리보기</h2>
                <p className="mt-1 text-xs text-slate-400">현재 에디터 HTML 기준으로 렌더링됩니다.</p>
              </div>
              <button
                type="button"
                className="rounded-lg bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600"
                onClick={() => setPreviewOpen(false)}
              >
                닫기
              </button>
            </div>
            <article
              className="prose prose-invert max-w-none rounded-xl border border-slate-700 bg-[#0d0d1a] px-5 py-5 prose-headings:text-white prose-a:text-violet-300 prose-img:rounded-lg"
              dangerouslySetInnerHTML={{ __html: sanitizeInsightHtml(editor?.getHTML?.() || "<p></p>") }}
            />
          </section>
        ) : null}

        <div className="flex flex-wrap gap-2 justify-between items-center pb-6">
          <Link href="/admin/insights" className="text-sm text-slate-300 hover:text-white underline underline-offset-2">
            목록으로 돌아가기
          </Link>
          <p className="text-xs text-slate-500">저장 시 contentHtml + contentJson 동시 저장</p>
        </div>
      </section>
    </main>
  );
}

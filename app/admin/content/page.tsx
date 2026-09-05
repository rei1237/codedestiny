"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import ImageExtension from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";
import Image from "next/image";
import Link from "next/link";
import {
  Archive,
  Bold,
  Clock,
  ExternalLink,
  Eye,
  Heading1,
  Heading2,
  History,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Plus,
  Quote,
  RefreshCw,
  Sparkles,
  RotateCcw,
  Save,
  Search,
  Send,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { getApiBaseUrl } from "../../_lib/api-config";
import { adminFetch, describeAdminError, getFlowerAdminToken, type AdminErrorView } from "../_lib/admin-api";
import AdminErrorState from "../_components/AdminErrorState";
import { ADMIN_CARD, ADMIN_CARD_HAIR, ADMIN_INPUT, ADMIN_INPUT_ICON, ADMIN_TOOLBAR, adminButton } from "../_components/ui";
import { uploadInsightImage } from "../insights/_lib/imageUpload";
import { sanitizeInsightHtml } from "../insights/_lib/sanitizeContent";

type ContentStatus = "draft" | "scheduled" | "published" | "archived" | "private" | "trash";
type ContentType =
  | "fortune_insight"
  | "saju"
  | "tarot"
  | "astrology"
  | "jamidusu"
  | "sookyo"
  | "vedic"
  | "palmistry"
  | "physiognomy"
  | "notice"
  | "landing"
  | "seo_page"
  | "general";
type FilterStatus = "all" | ContentStatus;
type SortKey = "updated" | "published" | "title" | "views";

type ContentItem = {
  id?: string;
  _id?: string;
  type?: ContentType | string;
  title?: string;
  subtitle?: string;
  slug?: string;
  summary?: string;
  excerpt?: string;
  content?: string;
  contentFormat?: string;
  contentHtml?: string;
  contentJson?: unknown;
  thumbnailUrl?: string;
  featuredImage?: {
    url?: string;
    alt?: string;
    width?: number;
    height?: number;
  };
  category?: string;
  tags?: string[];
  status?: ContentStatus;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    canonicalUrl?: string;
  };
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  noIndex?: boolean;
  isFeatured?: boolean;
  viewCount?: number;
  readingTime?: number;
  publishedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
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

type PublicationCheck = {
  ok?: boolean;
  dbReady?: boolean;
  publicUrl?: string;
  apiStatus?: { ok?: boolean; status?: number };
  pageStatus?: { ok?: boolean; status?: number };
  pageMeta?: {
    hasTitle?: boolean;
    hasDescription?: boolean;
    canonicalMatches?: boolean;
    noIndex?: boolean;
  } | null;
  feedCoverage?: Record<string, { containsSlug?: boolean; status?: number; url?: string }> | null;
  purgeStatus?: string;
  checkedAt?: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type FormState = {
  id: string;
  type: ContentType;
  status: ContentStatus;
  title: string;
  subtitle: string;
  slug: string;
  summary: string;
  category: string;
  tagsText: string;
  featuredImageUrl: string;
  featuredImageAlt: string;
  featuredImageWidth: number;
  featuredImageHeight: number;
  metaTitle: string;
  metaDescription: string;
  keywordsText: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  noIndex: boolean;
  isFeatured: boolean;
  scheduledAt: string;
};


type AdminContentCopy = {
  types: Record<ContentType, string>;
  filters: Record<FilterStatus, string>;
  states: Record<ContentStatus, string>;
  sort: Record<SortKey, string>;
  allTypes: string;
  searchHint: string;
  search: string;
  scheduledAt: string;
  titleHint: string;
  subtitleHint: string;
  categoryHint: string;
  tagsHint: string;
  summaryHint: string;
  imageUrlHint: string;
  imageAltHint: string;
  restore: string;
  logout: string;
  linkUrl: string;
  featuredImageFallback: string;
  bodyImageAltPrompt: string;
  bodyImageAltFallback: string;
  bodyImageAltSuffix: string;
  uploadInProgress: string;
  botOps: string;
  publish: string;
  saveDraft: string;
  privateState: string;
  archive: string;
  publicationSection: string;
  publicationCheck: string;
  publicationOk: string;
  needsCheck: string;
  publicUrl: string;
  versionSection: string;
  refresh: string;
  noRevisions: string;
  noTitle: string;
  seoOk: string;
  seoCheckCountSuffix: string;
  featured: string;
  errors: {
    loginRequired: string;
    permissionRequired: string;
    listLoadFailed: string;
    listNetworkFailed: string;
    detailLoadFailed: string;
    detailNetworkFailed: string;
    imageUploadFailed: string;
    imageInsertFailed: string;
    titleRequired: string;
    editorNotReady: string;
    scheduleRequired: string;
    scheduleFutureRequired: string;
    saveFailed: string;
    saveNetworkFailed: string;
    restoreFailed: string;
    restoreNetworkFailed: string;
  };
  notices: {
    featuredUploaded: string;
    bodyInserted: string;
    publishedVerified: string;
    publishedCheckNeeded: string;
    scheduledSaved: string;
    archived: string;
    privateSaved: string;
    draftSaved: string;
    restoreConfirm: string;
    restored: string;
  };
};

const ADMIN_CONTENT_COPY_EN: AdminContentCopy = {
  types: {
    fortune_insight: "Fortune Insight",
    saju: "Saju",
    tarot: "Tarot",
    astrology: "Astrology",
    jamidusu: "Zi Wei",
    sookyo: "Sukuyo",
    vedic: "Vedic Astrology",
    palmistry: "Palmistry",
    physiognomy: "Face Reading",
    notice: "Notice",
    landing: "Landing",
    seo_page: "SEO Page",
    general: "General",
  },
  filters: {
    all: "All",
    draft: "Draft",
    scheduled: "Scheduled",
    published: "Published",
    private: "Private",
    archived: "Archived",
    trash: "Trash",
  },
  states: {
    draft: "Draft",
    scheduled: "Scheduled",
    published: "Published",
    archived: "Archived",
    private: "Private",
    trash: "Trash",
  },
  sort: {
    updated: "Recently updated",
    published: "Recently published",
    ["title"]: "Title",
    views: "Views",
  },
  allTypes: "All types",
  searchHint: "Title, slug, tags",
  search: "Search",
  scheduledAt: "Scheduled publish time",
  titleHint: "Title",
  subtitleHint: "Subtitle",
  categoryHint: "Category",
  tagsHint: "Tags, comma-separated",
  summaryHint: "Summary",
  imageUrlHint: "Image URL",
  imageAltHint: "Alt text",
  restore: "Restore",
  logout: "Log out",
  linkUrl: "Link URL",
  featuredImageFallback: "Featured image",
  bodyImageAltPrompt: "Body image description",
  bodyImageAltFallback: "Body image",
  bodyImageAltSuffix: " related image",
  uploadInProgress: "Uploading...",
  botOps: "Chatbot Operations",
  publish: "Publish",
  saveDraft: "Save Draft",
  privateState: "Private",
  archive: "Archive",
  publicationSection: "Publication Check",
  publicationCheck: "Check Reflection",
  publicationOk: "Public reflection complete",
  needsCheck: "Needs check",
  publicUrl: "Public URL",
  versionSection: "Versions",
  refresh: "Refresh",
  noRevisions: "No saved previous versions.",
  noTitle: "Untitled",
  seoOk: "Good",
  seoCheckCountSuffix: " checks",
  featured: "Featured",
  errors: {
    loginRequired: "Admin login is required.",
    permissionRequired: "Admin permission is required.",
    listLoadFailed: "Could not load the article list.",
    listNetworkFailed: "A network error prevented loading the article list.",
    detailLoadFailed: "Could not load the article.",
    detailNetworkFailed: "A network error prevented loading the article.",
    imageUploadFailed: "Image upload failed.",
    imageInsertFailed: "Image insertion failed.",
    titleRequired: "Enter a title.",
    editorNotReady: "The editor is not ready yet.",
    scheduleRequired: "Select a scheduled publish time.",
    scheduleFutureRequired: "The scheduled publish time must be in the future.",
    saveFailed: "Could not save.",
    saveNetworkFailed: "A network error prevented saving.",
    restoreFailed: "Could not restore the version.",
    restoreNetworkFailed: "A network error prevented restoring the version.",
  },
  notices: {
    featuredUploaded: "Featured image uploaded.",
    bodyInserted: "Body image inserted.",
    publishedVerified: "Published and public reflection confirmed.",
    publishedCheckNeeded: "Published. Please check public reflection status.",
    scheduledSaved: "Saved as scheduled publication.",
    archived: "Moved to archive.",
    privateSaved: "Saved as private.",
    draftSaved: "Draft saved.",
    restoreConfirm: "Restore the selected version? Current content will be kept as a new revision.",
    restored: "Restored the selected version.",
  },
};

const ADMIN_CONTENT_COPY_KO: AdminContentCopy = {
  ...ADMIN_CONTENT_COPY_EN,
  types: {
    fortune_insight: "운세 인사이트",
    saju: "사주",
    tarot: "타로",
    astrology: "점성술",
    jamidusu: "자미두수",
    sookyo: "숙요",
    vedic: "베다 점성술",
    palmistry: "손금",
    physiognomy: "관상",
    notice: "공지",
    landing: "랜딩",
    seo_page: "SEO 페이지",
    general: "일반",
  },
  filters: {
    all: "전체",
    draft: "임시저장",
    scheduled: "예약",
    published: "발행",
    private: "비공개",
    archived: "보관",
    trash: "휴지통",
  },
  states: {
    draft: "임시저장",
    scheduled: "예약",
    published: "발행",
    archived: "보관",
    private: "비공개",
    trash: "휴지통",
  },
  sort: {
    updated: "최근 수정",
    published: "최근 발행",
    ["title"]: "제목순",
    views: "조회순",
  },
  allTypes: "전체 유형",
  searchHint: "제목, slug, 태그",
  search: "검색",
  scheduledAt: "예약 발행 시간",
  titleHint: "제목",
  subtitleHint: "부제목",
  categoryHint: "카테고리",
  tagsHint: "태그, 쉼표로 구분",
  summaryHint: "요약",
  imageUrlHint: "이미지 URL",
  imageAltHint: "alt 텍스트",
  restore: "복구",
  logout: "로그아웃",
  linkUrl: "링크 URL",
  featuredImageFallback: "대표 이미지",
  bodyImageAltPrompt: "본문 이미지 설명",
  bodyImageAltFallback: "본문 이미지",
  bodyImageAltSuffix: " 관련 이미지",
  uploadInProgress: "업로드 중...",
  botOps: "챗봇 운영",
  publish: "발행",
  saveDraft: "임시저장",
  privateState: "비공개",
  archive: "보관",
  publicationSection: "발행 확인",
  publicationCheck: "반영 확인",
  publicationOk: "공개 반영 완료",
  needsCheck: "확인 필요",
  publicUrl: "공개 URL",
  versionSection: "버전",
  refresh: "새로고침",
  noRevisions: "저장된 이전 버전이 없습니다.",
  noTitle: "제목 없음",
  seoOk: "정상",
  seoCheckCountSuffix: "개 점검",
  featured: "추천 글",
  errors: {
    loginRequired: "관리자 로그인이 필요합니다.",
    permissionRequired: "관리자 권한이 필요합니다.",
    listLoadFailed: "글 목록을 불러오지 못했습니다.",
    listNetworkFailed: "네트워크 오류로 글 목록을 불러오지 못했습니다.",
    detailLoadFailed: "글을 불러오지 못했습니다.",
    detailNetworkFailed: "네트워크 오류로 글을 불러오지 못했습니다.",
    imageUploadFailed: "이미지 업로드에 실패했습니다.",
    imageInsertFailed: "이미지 삽입에 실패했습니다.",
    titleRequired: "제목을 입력해 주세요.",
    editorNotReady: "편집기가 아직 준비되지 않았습니다.",
    scheduleRequired: "예약 발행 시간을 선택해 주세요.",
    scheduleFutureRequired: "예약 발행 시간은 현재 이후여야 합니다.",
    saveFailed: "저장에 실패했습니다.",
    saveNetworkFailed: "네트워크 오류로 저장하지 못했습니다.",
    restoreFailed: "버전 복구에 실패했습니다.",
    restoreNetworkFailed: "네트워크 오류로 버전을 복구하지 못했습니다.",
  },
  notices: {
    featuredUploaded: "대표 이미지를 업로드했습니다.",
    bodyInserted: "본문 이미지를 삽입했습니다.",
    publishedVerified: "발행했고 공개 반영까지 확인했습니다.",
    publishedCheckNeeded: "발행했습니다. 공개 반영 상태를 확인해 주세요.",
    scheduledSaved: "예약 발행으로 저장했습니다.",
    archived: "보관으로 이동했습니다.",
    privateSaved: "비공개로 저장했습니다.",
    draftSaved: "임시저장했습니다.",
    restoreConfirm: "선택한 버전으로 복구할까요? 현재 내용은 새 리비전으로 보관됩니다.",
    restored: "선택한 버전으로 복구했습니다.",
  },
};

const ADMIN_CONTENT_COPY: Record<LoadingLocale, AdminContentCopy> = {
  ko: ADMIN_CONTENT_COPY_KO,
  en: ADMIN_CONTENT_COPY_EN,
  ja: ADMIN_CONTENT_COPY_EN,
  "zh-CN": ADMIN_CONTENT_COPY_EN,
  "zh-TW": ADMIN_CONTENT_COPY_EN,
  vi: ADMIN_CONTENT_COPY_EN,
  hi: ADMIN_CONTENT_COPY_EN,
  es: ADMIN_CONTENT_COPY_EN,
  fr: ADMIN_CONTENT_COPY_EN,
  de: ADMIN_CONTENT_COPY_EN,
  nl: ADMIN_CONTENT_COPY_EN,
  ms: ADMIN_CONTENT_COPY_EN,
};

const ADMIN_CONTENT_DATE_LOCALES: Record<LoadingLocale, string> = {
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

const CONTENT_TYPES: Array<{ value: ContentType }> = [
  { value: "fortune_insight" },
  { value: "saju" },
  { value: "tarot" },
  { value: "astrology" },
  { value: "jamidusu" },
  { value: "sookyo" },
  { value: "vedic" },
  { value: "palmistry" },
  { value: "physiognomy" },
  { value: "notice" },
  { value: "landing" },
  { value: "seo_page" },
  { value: "general" },
];

const STATUS_OPTIONS: Array<{ value: FilterStatus }> = [
  { value: "all" },
  { value: "draft" },
  { value: "scheduled" },
  { value: "published" },
  { value: "private" },
  { value: "archived" },
  { value: "trash" },
];

const SORT_OPTIONS: Array<{ value: SortKey }> = [
  { value: "updated" },
  { value: "published" },
  { value: "title" },
  { value: "views" },
];

const EMPTY_FORM: FormState = {
  id: "",
  type: "fortune_insight",
  status: "draft",
  title: "",
  subtitle: "",
  slug: "",
  summary: "",
  category: "",
  tagsText: "",
  featuredImageUrl: "",
  featuredImageAlt: "",
  featuredImageWidth: 0,
  featuredImageHeight: 0,
  metaTitle: "",
  metaDescription: "",
  keywordsText: "",
  canonicalUrl: "",
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  noIndex: false,
  isFeatured: false,
  scheduledAt: "",
};

const EMPTY_PAGINATION: Pagination = {
  page: 1,
  limit: 80,
  total: 0,
  totalPages: 1,
};


/* 토큰 처리는 app/admin/_lib/admin-api.ts 하나만 쓴다 — 여기서 재구현하지 않는다.
   이미지 업로드만 토큰 원문을 요구해서(멀티파트라 adminFetch 를 못 탄다) 그 하나만 남겨 둔다. */
const getFlowerAdminTokenClient = getFlowerAdminToken;

function getItemId(item: ContentItem): string {
  return String(item.id || item._id || "");
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

function splitCommaText(value: string, maxItems: number): string[] {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function stripHtml(value: string): string {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getAdminContentCopy(locale: LoadingLocale) {
  return ADMIN_CONTENT_COPY[locale] || ADMIN_CONTENT_COPY.en;
}

function formatDate(value: string | null | undefined, locale: LoadingLocale): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(ADMIN_CONTENT_DATE_LOCALES[locale] || ADMIN_CONTENT_DATE_LOCALES.en, {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDateTimeLocalValue(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 16);
}

function fromDateTimeLocalValue(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function statusLabel(status: string | undefined, copy: AdminContentCopy): string {
  const key = String(status || "draft") as ContentStatus;
  return key in copy.states ? copy.states[key] : copy.states.draft;
}

function statusBadgeClass(status?: string): string {
  if (status === "published") return "border-emerald-700 bg-emerald-950 text-emerald-200";
  if (status === "scheduled") return "border-sky-700 bg-sky-950 text-sky-200";
  if (status === "archived") return "border-amber-700 bg-amber-950 text-amber-200";
  if (status === "private") return "border-zinc-600 bg-zinc-900 text-zinc-200";
  if (status === "trash") return "border-rose-700 bg-rose-950 text-rose-200";
  return "border-slate-700 bg-slate-900 text-slate-200";
}

function normalizeFormFromItem(item: ContentItem): FormState {
  const seo = item.seo || {};
  const featuredImage = item.featuredImage || {};
  return {
    id: getItemId(item),
    type: (String(item.type || "fortune_insight") as ContentType) || "fortune_insight",
    status: item.status || "draft",
    title: String(item.title || ""),
    subtitle: String(item.subtitle || ""),
    slug: String(item.slug || ""),
    summary: String(item.summary || item.excerpt || ""),
    category: String(item.category || ""),
    tagsText: Array.isArray(item.tags) ? item.tags.join(", ") : "",
    featuredImageUrl: String(item.thumbnailUrl || featuredImage.url || ""),
    featuredImageAlt: String(featuredImage.alt || item.title || ""),
    featuredImageWidth: Math.max(0, Number(featuredImage.width || 0) || 0),
    featuredImageHeight: Math.max(0, Number(featuredImage.height || 0) || 0),
    metaTitle: String(seo.metaTitle || item.metaTitle || ""),
    metaDescription: String(seo.metaDescription || item.metaDescription || ""),
    keywordsText: Array.isArray(item.keywords) ? item.keywords.join(", ") : "",
    canonicalUrl: String(seo.canonicalUrl || item.canonicalUrl || ""),
    ogTitle: String(seo.ogTitle || item.ogTitle || ""),
    ogDescription: String(seo.ogDescription || item.ogDescription || ""),
    ogImage: String(seo.ogImage || item.ogImage || ""),
    noIndex: Boolean(item.noIndex),
    isFeatured: Boolean(item.isFeatured),
    scheduledAt: toDateTimeLocalValue(item.publishedAt || ""),
  };
}

function buildCanonicalUrl(slug: string): string {
  if (!slug || typeof window === "undefined") return "";
  return `${window.location.origin.replace(/\/+$/, "")}/insights/${slug}`;
}

function readBodyText(editor: ReturnType<typeof useEditor> | null): string {
  return String(editor?.getText({ blockSeparator: "\n" }) || "").replace(/\s+/g, " ").trim();
}

function makePlainExcerpt(text: string): string {
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, 180);
}

function editorButtonClass(active = false): string {
  return active
    ? "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-violet-500 bg-violet-700 text-white"
    : "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500";
}

// 톤·크기·포커스는 app/admin/_components/ui.ts 와 styles/admin-yehwa.css 한 곳에서 정한다.
// 함수 이름을 그대로 두어 호출부는 건드리지 않는다.
function commandButtonClass(tone: "neutral" | "primary" | "success" | "warn" = "neutral"): string {
  return adminButton(tone);
}

export default function AdminContentPage() {
  const apiBase = useMemo(() => getApiBaseUrl(), []);
  // endpointBase 는 URL 조립(쿼리스트링)용으로만 남는다 — 실제 요청 경로는 adminFetch 가 apiBase 를 붙인다.
  const endpointBase = `${apiBase || ""}/api/admin/content`;

  const featuredInputRef = useRef<HTMLInputElement | null>(null);
  const bodyImageInputRef = useRef<HTMLInputElement | null>(null);
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const copy = getAdminContentCopy(locale);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>(EMPTY_PAGINATION);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | ContentType>("all");
  const [sort, setSort] = useState<SortKey>("updated");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [slugEdited, setSlugEdited] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState<ContentStatus | "">("");
  const [uploading, setUploading] = useState<"featured" | "body" | "">("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  // 목록 실패는 별도로 들고 있는다 — 공용 error 하나로 처리하면 목록 칸에 "글이 없습니다."가 같이 뜬다.
  const [listErrorView, setListErrorView] = useState<AdminErrorView | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);
  const [revisions, setRevisions] = useState<ContentRevision[]>([]);
  const [publicationCheck, setPublicationCheck] = useState<PublicationCheck | null>(null);
  const [restoringRevisionId, setRestoringRevisionId] = useState("");

  const editor = useEditor({
    extensions: [
      // StarterKit v3 가 Link 를 이미 번들한다. 별도 LinkExtension 을 함께 등록하면
      // "Duplicate extension names found: ['link']" 경고와 함께 두 인스턴스가 경쟁한다.
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true },
      }),
      ImageExtension.configure({
        allowBase64: false,
      }),
    ],
    content: "<p></p>",
    editorProps: {
      attributes: {
        class:
          "min-h-[470px] rounded-b-lg border border-t-0 border-slate-700 bg-[#10121c] px-5 py-5 text-[16px] leading-8 text-slate-100 outline-none [&_a]:text-violet-300 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-violet-500 [&_blockquote]:pl-4 [&_blockquote]:text-slate-300 [&_h1]:mb-3 [&_h1]:mt-5 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-xl [&_h3]:font-semibold [&_hr]:my-6 [&_hr]:border-slate-700 [&_img]:my-4 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg [&_img]:border [&_img]:border-slate-700 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_ul]:list-disc [&_ul]:pl-6",
      },
    },
    immediatelyRender: false,
  });

  const selectedId = form.id;
  const resolvedSlug = slugify(form.slug || form.title);
  const editorHtml = sanitizeInsightHtml(editor?.getHTML() || "");
  const bodyText = readBodyText(editor);
  const resolvedSummary = form.summary.trim() || makePlainExcerpt(bodyText);
  const resolvedMetaTitle = form.metaTitle.trim() || form.title.trim();
  const resolvedMetaDescription = form.metaDescription.trim() || resolvedSummary;
  const publicUrl = resolvedSlug ? `/insights/${resolvedSlug}` : "";

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

  // 401/403 리다이렉트는 adminFetch 가 담당한다(app/admin/_lib/admin-api.ts).

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setError("");
    setListErrorView(null);
    try {
      const url = new URL(endpointBase, typeof window === "undefined" ? "http://localhost" : window.location.origin);
      if (filterStatus !== "all") url.searchParams.set("status", filterStatus);
      if (typeFilter !== "all") url.searchParams.set("type", typeFilter);
      if (query.trim()) url.searchParams.set("keyword", query.trim());
      url.searchParams.set("sort", sort);
      url.searchParams.set("page", "1");
      url.searchParams.set("limit", "80");

      const data = await adminFetch<Record<string, any>>(`/api/admin/content?${url.searchParams.toString()}`);

      setItems(Array.isArray(data?.items) ? data.items : []);
      setPagination({
        page: Math.max(1, Number(data?.pagination?.page || 1) || 1),
        limit: Math.max(1, Number(data?.pagination?.limit || 80) || 80),
        total: Math.max(0, Number(data?.pagination?.total || 0) || 0),
        totalPages: Math.max(1, Number(data?.pagination?.totalPages || 1) || 1),
      });
    } catch (caught) {
      setListErrorView(describeAdminError(caught, copy.errors.listNetworkFailed));
      setItems([]);
      setPagination(EMPTY_PAGINATION);
    } finally {
      setLoadingList(false);
    }
  }, [copy.errors.listNetworkFailed, endpointBase, filterStatus, query, sort, typeFilter]);

  const loadRevisions = useCallback(async (contentId: string) => {
    if (!contentId) {
      setRevisions([]);
      return;
    }

    try {
      const data = await adminFetch<Record<string, any>>(`/api/admin/content/${encodeURIComponent(contentId)}/revisions`);
      setRevisions(Array.isArray(data?.revisions) ? data.revisions : []);
    } catch {}
  }, []);

  const loadDetail = useCallback(async (contentId: string) => {
    if (!contentId || !editor) return;
    setLoadingDetail(true);
    setError("");
    setMessage("");
    setPublicationCheck(null);

    try {
      const data = await adminFetch<Record<string, any>>(`/api/admin/content/${encodeURIComponent(contentId)}`);

      const item = data?.item as ContentItem;
      const nextForm = normalizeFormFromItem(item || {});
      setForm(nextForm);
      setSlugEdited(Boolean(nextForm.slug));

      const contentJson = item?.contentJson;
      if (contentJson && typeof contentJson === "object" && !Array.isArray(contentJson)) {
        editor.commands.setContent(contentJson);
      } else {
        editor.commands.setContent(sanitizeInsightHtml(String(item?.contentHtml || item?.content || "<p></p>")) || "<p></p>");
      }

      await loadRevisions(nextForm.id);
    } catch (caught) {
      setError(describeAdminError(caught, copy.errors.detailNetworkFailed).message);
    } finally {
      setLoadingDetail(false);
    }
  }, [copy.errors.detailNetworkFailed, editor, loadRevisions]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  // /admin/content?id=... 로 들어오면 그 글을 바로 연다. 예전에는 인사이트 목록의 "수정" 버튼이
  // id 를 붙여 보냈는데 받는 쪽이 읽지 않아 항상 빈 편집기가 떴다.
  useEffect(() => {
    if (typeof window === "undefined" || !editor) return;
    const requestedId = new URLSearchParams(window.location.search).get("id") || "";
    if (!requestedId) return;
    void loadDetail(requestedId);
    // 새로고침 때 같은 글을 다시 여는 것은 맞지만, 주소창에 남은 id 가 "새 글" 버튼과 충돌하지 않도록 지운다.
    window.history.replaceState(null, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  function startNewPost() {
    setForm(EMPTY_FORM);
    setSlugEdited(false);
    setRevisions([]);
    setPublicationCheck(null);
    setError("");
    setMessage("");
    setPreviewOpen(false);
    editor?.commands.setContent("<p></p>");
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateTitle(value: string) {
    setForm((prev) => ({
      ...prev,
      title: value,
      slug: slugEdited ? prev.slug : slugify(value),
      featuredImageAlt: prev.featuredImageAlt || value,
    }));
  }

  function applyLink() {
    if (!editor) return;
    const previousHref = String(editor.getAttributes("link")?.href || "");
    const href = window.prompt("링크 URL", previousHref || "https://");
    if (href === null) return;
    if (!href.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
  }

  async function uploadFeaturedImage(file: File) {
    setUploading("featured");
    setError("");
    setMessage("");
    try {
      const uploaded = await uploadInsightImage({
        apiBase,
        file,
        usage: "featured",
        alt: form.featuredImageAlt || form.title || copy.featuredImageFallback,
        adminToken: getFlowerAdminTokenClient(),
      });
      setForm((prev) => ({
        ...prev,
        featuredImageUrl: uploaded.url,
        featuredImageAlt: uploaded.alt || prev.featuredImageAlt || prev.title,
        featuredImageWidth: uploaded.width || 0,
        featuredImageHeight: uploaded.height || 0,
        ogImage: prev.ogImage || uploaded.url,
      }));
      setMessage(copy.notices.featuredUploaded);
    } catch (uploadError) {
      setError(String((uploadError as Error)?.message || copy.errors.imageUploadFailed));
    } finally {
      setUploading("");
    }
  }

  async function uploadBodyImage(file: File) {
    if (!editor) return;
    setUploading("body");
    setError("");
    setMessage("");
    try {
      const alt = window.prompt(copy.bodyImageAltPrompt, form.title ? `${form.title}${copy.bodyImageAltSuffix}` : copy.bodyImageAltFallback) || "";
      const uploaded = await uploadInsightImage({
        apiBase,
        file,
        usage: "body",
        alt,
        adminToken: getFlowerAdminTokenClient(),
      });
      editor
        .chain()
        .focus()
        .setImage({
          src: uploaded.url,
          alt: uploaded.alt || alt,
          width: uploaded.width > 0 ? uploaded.width : undefined,
          height: uploaded.height > 0 ? uploaded.height : undefined,
        })
        .run();
      setMessage(copy.notices.bodyInserted);
    } catch (uploadError) {
      setError(String((uploadError as Error)?.message || copy.errors.imageInsertFailed));
    } finally {
      setUploading("");
    }
  }

  function buildPayload(status: ContentStatus) {
    const html = sanitizeInsightHtml(editor?.getHTML() || "");
    const safeSlug = slugify(form.slug || form.title);
    const summary = form.summary.trim() || makePlainExcerpt(stripHtml(html));
    const metaTitle = form.metaTitle.trim() || form.title.trim();
    const metaDescription = form.metaDescription.trim() || summary;
    const ogTitle = form.ogTitle.trim() || metaTitle;
    const ogDescription = form.ogDescription.trim() || metaDescription;
    const ogImage = form.ogImage.trim() || form.featuredImageUrl.trim();
    const canonicalUrl = form.canonicalUrl.trim() || buildCanonicalUrl(safeSlug);

    return {
      type: form.type,
      status,
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      slug: safeSlug,
      summary,
      excerpt: summary,
      category: form.category.trim(),
      tags: splitCommaText(form.tagsText, 40),
      content: html,
      contentFormat: "html",
      contentHtml: html,
      contentJson: editor?.getJSON() || {},
      thumbnailUrl: form.featuredImageUrl.trim(),
      featuredImage: {
        url: form.featuredImageUrl.trim(),
        alt: (form.featuredImageAlt || form.title).trim(),
        width: Math.max(0, Number(form.featuredImageWidth || 0) || 0),
        height: Math.max(0, Number(form.featuredImageHeight || 0) || 0),
      },
      seo: {
        metaTitle,
        metaDescription,
        ogTitle,
        ogDescription,
        ogImage,
        canonicalUrl,
      },
      metaTitle,
      metaDescription,
      keywords: splitCommaText(form.keywordsText, 50),
      canonicalUrl,
      ogTitle,
      ogDescription,
      ogImage,
      noIndex: form.noIndex,
      isFeatured: form.isFeatured,
      publishedAt: status === "scheduled" ? fromDateTimeLocalValue(form.scheduledAt) : undefined,
    };
  }

  function validateBeforeSave(status: ContentStatus): boolean {
    if (!form.title.trim()) {
      setError(copy.errors.titleRequired);
      return false;
    }
    if (!editor) {
      setError(copy.errors.editorNotReady);
      return false;
    }
    if (status === "scheduled") {
      const scheduledAt = fromDateTimeLocalValue(form.scheduledAt);
      if (!scheduledAt) {
        setError(copy.errors.scheduleRequired);
        return false;
      }
      if (new Date(scheduledAt).getTime() <= Date.now()) {
        setError(copy.errors.scheduleFutureRequired);
        return false;
      }
    }
    return true;
  }

  async function runPublicationCheck(contentId: string): Promise<PublicationCheck | null> {
    if (!contentId) return null;
    try {
      await adminFetch(`/api/admin/content/${encodeURIComponent(contentId)}/cache-purge`, {
        method: "POST",
        body: {},
      }).catch(() => null);

      const data = await adminFetch<Record<string, any>>(`/api/admin/content/${encodeURIComponent(contentId)}/publish-status`);
      const check = data?.publication || null;
      setPublicationCheck(check);
      return check;
    } catch {
      return null;
    }
  }

  async function saveWithStatus(status: ContentStatus) {
    if (!validateBeforeSave(status)) return;
    setSaving(status);
    setError("");
    setMessage("");
    setPublicationCheck(null);

    try {
      const isEdit = Boolean(form.id);
      const path = isEdit ? `/api/admin/content/${encodeURIComponent(form.id)}` : "/api/admin/content";
      const data = await adminFetch<Record<string, any>>(path, {
        method: isEdit ? "PATCH" : "POST",
        body: buildPayload(status),
      });

      const item = data?.item as ContentItem;
      const nextForm = normalizeFormFromItem(item || {});
      setForm(nextForm);
      setSlugEdited(Boolean(nextForm.slug));
      await loadRevisions(nextForm.id);
      await loadList();

      if (status === "published") {
        const check = await runPublicationCheck(nextForm.id);
        setMessage(check?.ok ? copy.notices.publishedVerified : copy.notices.publishedCheckNeeded);
      } else if (status === "scheduled") {
        setMessage(copy.notices.scheduledSaved);
      } else if (status === "archived") {
        setMessage(copy.notices.archived);
      } else if (status === "private") {
        setMessage(copy.notices.privateSaved);
      } else {
        setMessage(copy.notices.draftSaved);
      }
    } catch (caught) {
      setError(describeAdminError(caught, copy.errors.saveNetworkFailed).message);
    } finally {
      setSaving("");
    }
  }

  async function restoreRevision(revisionId: string) {
    if (!form.id || !revisionId) return;
    if (!window.confirm(copy.notices.restoreConfirm)) return;

    setRestoringRevisionId(revisionId);
    setError("");
    setMessage("");
    try {
      const data = await adminFetch<Record<string, any>>(`/api/admin/content/${encodeURIComponent(form.id)}/restore`, {
        method: "POST",
        body: { revisionId },
      });
      const item = data?.item as ContentItem;
      setForm(normalizeFormFromItem(item || {}));
      if (item?.contentJson && typeof item.contentJson === "object" && !Array.isArray(item.contentJson)) {
        editor?.commands.setContent(item.contentJson);
      } else {
        editor?.commands.setContent(sanitizeInsightHtml(String(item?.contentHtml || item?.content || "<p></p>")) || "<p></p>");
      }
      await loadRevisions(getItemId(item || {}));
      await loadList();
      setMessage(copy.notices.restored);
    } catch (caught) {
      setError(describeAdminError(caught, copy.errors.restoreNetworkFailed).message);
    } finally {
      setRestoringRevisionId("");
    }
  }

  const seoWarnings = [
    !resolvedSlug ? "slug 필요" : "",
    !resolvedMetaTitle ? "metaTitle 필요" : "",
    resolvedMetaDescription.length < 70 ? "metaDescription 짧음" : "",
    !form.featuredImageUrl.trim() ? "대표 이미지 없음" : "",
  ].filter(Boolean);

  return (
    <main className="min-h-screen">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[360px_1fr]">
        <aside className="border-b border-slate-800 bg-[#10121b] lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div>
              <h1 className="text-base font-semibold">관리자 글 편집</h1>
              <p className="text-xs text-slate-400">{pagination.total.toLocaleString("ko-KR")}개</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={startNewPost} className={editorButtonClass()} title="새 글">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-3 border-b border-slate-800 p-4">
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                setQuery(searchInput);
              }}
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  className={ADMIN_INPUT_ICON}
                  placeholder={copy.searchHint}
                />
              </div>
              <button type="submit" className={editorButtonClass()} title={copy.search}>
                <Search className="h-4 w-4" />
              </button>
            </form>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value as FilterStatus)}
                className={ADMIN_INPUT}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{copy.filters[option.value]}</option>
                ))}
              </select>
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as "all" | ContentType)}
                className={ADMIN_INPUT}
              >
                <option value="all">{copy.allTypes}</option>
                {CONTENT_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>{copy.types[option.value]}</option>
                ))}
              </select>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
                className={ADMIN_INPUT}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{copy.sort[option.value]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2 border-b border-slate-800 bg-slate-900/40 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-200/70">{copy.botOps}</p>
            <Link
              href="/admin/prompts"
              className="group block rounded-xl border border-amber-700 bg-gradient-to-br from-amber-950/80 to-slate-900 p-3 text-sm text-amber-100 transition hover:border-amber-400 hover:from-amber-900/80 hover:to-amber-900/40"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg border border-amber-300/40 bg-amber-300/10 p-1.5">
                  <Sparkles className="h-4 w-4 text-amber-200" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-amber-100">프롬프트 랩</p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">사주·타로·꿈해몽 등 각 운세가 실제로 AI에 보내는 프롬프트를 결제 없이 뽑아 봅니다.</p>
                  <p className="mt-2 inline-flex items-center text-[11px] text-amber-200">
                    프롬프트 랩 열기
                    <ExternalLink className="ml-1 h-3 w-3 opacity-80 transition group-hover:translate-x-0.5" />
                  </p>
                </div>
              </div>
            </Link>
          </div>

          <div className="max-h-[calc(100vh-182px)] overflow-y-auto">
            {loadingList ? (
              <div className="p-4 text-sm text-slate-400">불러오는 중...</div>
            ) : listErrorView ? (
              <div className="p-4">
                <AdminErrorState view={listErrorView} onRetry={() => { void loadList(); }} retrying={loadingList} />
              </div>
            ) : items.length === 0 ? (
              <div className="p-4 text-sm text-slate-400">글이 없습니다.</div>
            ) : (
              <div className="divide-y divide-slate-800">
                {items.map((item) => {
                  const id = getItemId(item);
                  const active = id && id === selectedId;
                  return (
                    <button
                      key={id || item.slug}
                      type="button"
                      onClick={() => { void loadDetail(id); }}
                      className={`w-full px-4 py-3 text-left hover:bg-slate-900 ${active ? "bg-slate-900" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-sm font-medium text-slate-100">{item.title || copy.noTitle}</p>
                        <span className={`shrink-0 rounded-lg border px-2 py-0.5 text-[11px] ${statusBadgeClass(item.status)}`}>
                          {statusLabel(item.status, copy)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
                        <span className="truncate">/{item.slug || "-"}</span>
                        <span>{formatDate(item.updatedAt || item.createdAt, locale)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <section className="min-w-0">
          <div className={ADMIN_TOOLBAR}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`rounded-lg border px-2 py-0.5 text-xs ${statusBadgeClass(form.status)}`}>
                    {statusLabel(form.status, copy)}
                  </span>
                  {selectedId ? <span className="text-xs text-slate-500">ID {selectedId}</span> : <span className="text-xs text-slate-500">새 글</span>}
                  {loadingDetail ? <span className="text-xs text-slate-500">불러오는 중...</span> : null}
                </div>
                <p className="mt-1 truncate text-sm text-slate-400">{publicUrl || "/insights/..."}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {publicUrl ? (
                  <a href={publicUrl} target="_blank" rel="noreferrer" className={commandButtonClass()}>
                    <ExternalLink className="h-4 w-4" />
                    열기
                  </a>
                ) : null}
                <button type="button" onClick={() => setPreviewOpen((open) => !open)} className={commandButtonClass()}>
                  <Eye className="h-4 w-4" />
                  미리보기
                </button>
                <button type="button" onClick={() => { void saveWithStatus("draft"); }} disabled={Boolean(saving)} className={commandButtonClass()}>
                  <Save className="h-4 w-4" />
                  {saving === "draft" ? "저장 중" : "임시저장"}
                </button>
                <button type="button" onClick={() => { void saveWithStatus("scheduled"); }} disabled={Boolean(saving)} className={commandButtonClass("warn")}>
                  <Clock className="h-4 w-4" />
                  예약
                </button>
                <button type="button" onClick={() => { void saveWithStatus("published"); }} disabled={Boolean(saving)} className={commandButtonClass("primary")}>
                  <Send className="h-4 w-4" />
                    {copy.publish}
                </button>
              </div>
            </div>
            {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
            {message ? <p className="mt-2 text-sm text-emerald-300">{message}</p> : null}
          </div>

          <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 space-y-4">
              <section className={`${ADMIN_CARD} ${ADMIN_CARD_HAIR} rounded-lg p-4`}>
                <div className="grid gap-3 md:grid-cols-2">
                  <select
                    value={form.type}
                    onChange={(event) => updateForm("type", event.target.value as ContentType)}
                    className={ADMIN_INPUT}
                  >
                    {CONTENT_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>{copy.types[option.value]}</option>
                    ))}
                  </select>
                  <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(event) => updateForm("scheduledAt", event.target.value)}
                    className={ADMIN_INPUT}
                    aria-label={copy.scheduledAt}
                  />
                  <input
                    value={form.title}
                    onChange={(event) => updateTitle(event.target.value)}
                    className="md:col-span-2 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-2xl font-semibold outline-none focus:border-violet-500"
                    placeholder={copy.titleHint}
                  />
                  <input
                    value={form.subtitle}
                    onChange={(event) => updateForm("subtitle", event.target.value)}
                    className={`md:col-span-2 ${ADMIN_INPUT}`}
                    placeholder={copy.subtitleHint}
                  />
                  <input
                    value={form.slug}
                    onChange={(event) => {
                      setSlugEdited(true);
                      updateForm("slug", slugify(event.target.value));
                    }}
                    className={ADMIN_INPUT}
                    placeholder="slug"
                  />
                  <input
                    value={form.category}
                    onChange={(event) => updateForm("category", event.target.value)}
                    className={ADMIN_INPUT}
                    placeholder={copy.categoryHint}
                  />
                  <input
                    value={form.tagsText}
                    onChange={(event) => updateForm("tagsText", event.target.value)}
                    className={`md:col-span-2 ${ADMIN_INPUT}`}
                    placeholder={copy.tagsHint}
                  />
                  <textarea
                    value={form.summary}
                    onChange={(event) => updateForm("summary", event.target.value)}
                    className={`md:col-span-2 min-h-[84px] ${ADMIN_INPUT}`}
                    placeholder={copy.summaryHint}
                  />
                </div>
              </section>

              <section className={`${ADMIN_CARD} ${ADMIN_CARD_HAIR} rounded-lg`}>
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 p-3">
                  <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} className={editorButtonClass(editor?.isActive("bold"))} title="굵게">
                    <Bold className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} className={editorButtonClass(editor?.isActive("italic"))} title="기울임">
                    <Italic className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} className={editorButtonClass(editor?.isActive("heading", { level: 1 }))} title="H1">
                    <Heading1 className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className={editorButtonClass(editor?.isActive("heading", { level: 2 }))} title="H2">
                    <Heading2 className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()} className={editorButtonClass(editor?.isActive("bulletList"))} title="목록">
                    <List className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => editor?.chain().focus().toggleOrderedList().run()} className={editorButtonClass(editor?.isActive("orderedList"))} title="번호 목록">
                    <ListOrdered className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => editor?.chain().focus().toggleBlockquote().run()} className={editorButtonClass(editor?.isActive("blockquote"))} title="인용">
                    <Quote className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={applyLink} className={editorButtonClass(editor?.isActive("link"))} title="링크">
                    <LinkIcon className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => bodyImageInputRef.current?.click()} className={editorButtonClass()} title="본문 이미지">
                    <ImagePlus className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => editor?.chain().focus().undo().run()} className={editorButtonClass()} title="되돌리기">
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <input
                    ref={bodyImageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      if (file) void uploadBodyImage(file);
                      event.currentTarget.value = "";
                    }}
                  />
                  {uploading === "body" ? <span className="text-xs text-slate-400">이미지 업로드 중...</span> : null}
                </div>
                <EditorContent editor={editor} />
              </section>

              {previewOpen ? (
                <section className={`${ADMIN_CARD} ${ADMIN_CARD_HAIR} rounded-lg p-5`}>
                  <article className="mx-auto max-w-3xl text-slate-100">
                    <p className="mb-2 text-sm text-slate-400">{form.category || "미분류"}</p>
                    <h2 className="text-3xl font-bold">{form.title || "제목 없음"}</h2>
                    {form.subtitle ? <p className="mt-2 text-lg text-slate-300">{form.subtitle}</p> : null}
                    {form.featuredImageUrl ? (
                      <Image
                        src={form.featuredImageUrl}
                        alt={form.featuredImageAlt || form.title}
                        width={Math.max(1, form.featuredImageWidth || 1200)}
                        height={Math.max(1, form.featuredImageHeight || 630)}
                        unoptimized
                        className="mt-5 max-h-96 w-full rounded-lg object-cover"
                      />
                    ) : null}
                    {resolvedSummary ? <p className="mt-5 text-slate-300">{resolvedSummary}</p> : null}
                    <div className="mt-6 leading-8 [&_a]:text-violet-300 [&_blockquote]:border-l-4 [&_blockquote]:border-violet-500 [&_blockquote]:pl-4 [&_h1]:text-3xl [&_h2]:text-2xl [&_h3]:text-xl [&_img]:max-w-full" dangerouslySetInnerHTML={{ __html: editorHtml }} />
                  </article>
                </section>
              ) : null}
            </div>

            <aside className="space-y-4">
              <section className={`${ADMIN_CARD} ${ADMIN_CARD_HAIR} rounded-lg p-4`}>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">대표 이미지</h2>
                  <button type="button" onClick={() => featuredInputRef.current?.click()} className={commandButtonClass()}>
                    <Upload className="h-4 w-4" />
                    업로드
                  </button>
                </div>
                <input
                  ref={featuredInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (file) void uploadFeaturedImage(file);
                    event.currentTarget.value = "";
                  }}
                />
                {uploading === "featured" ? <p className="mt-3 text-xs text-slate-400">{copy.uploadInProgress}</p> : null}
                {form.featuredImageUrl ? (
                  <Image
                    src={form.featuredImageUrl}
                    alt={form.featuredImageAlt || form.title}
                    width={Math.max(1, form.featuredImageWidth || 640)}
                    height={Math.max(1, form.featuredImageHeight || 360)}
                    unoptimized
                    className="mt-3 max-h-48 w-full rounded-lg object-cover"
                  />
                ) : null}
                <div className="mt-3 space-y-2">
                  <input
                    value={form.featuredImageUrl}
                    onChange={(event) => updateForm("featuredImageUrl", event.target.value)}
                    className={ADMIN_INPUT}
                    placeholder={copy.imageUrlHint}
                  />
                  <input
                    value={form.featuredImageAlt}
                    onChange={(event) => updateForm("featuredImageAlt", event.target.value)}
                    className={ADMIN_INPUT}
                    placeholder={copy.imageAltHint}
                  />
                </div>
              </section>

              <section className={`${ADMIN_CARD} ${ADMIN_CARD_HAIR} rounded-lg p-4`}>
                <button type="button" onClick={() => setSeoOpen((open) => !open)} className="flex w-full items-center justify-between text-left text-sm font-semibold">
                  SEO
                  <span className="text-xs text-slate-400">{seoWarnings.length ? `${seoWarnings.length}${copy.seoCheckCountSuffix}` : copy.seoOk}</span>
                </button>
                {seoWarnings.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {seoWarnings.map((warning) => (
                      <span key={warning} className="rounded-lg border border-amber-700 bg-amber-950 px-2 py-1 text-xs text-amber-200">{warning}</span>
                    ))}
                  </div>
                ) : null}
                {seoOpen ? (
                  <div className="mt-3 space-y-2">
                    <input value={form.metaTitle} onChange={(event) => updateForm("metaTitle", event.target.value)} className={ADMIN_INPUT} placeholder="metaTitle" />
                    <textarea value={form.metaDescription} onChange={(event) => updateForm("metaDescription", event.target.value)} className={`min-h-[72px] ${ADMIN_INPUT}`} placeholder="metaDescription" />
                    <input value={form.keywordsText} onChange={(event) => updateForm("keywordsText", event.target.value)} className={ADMIN_INPUT} placeholder="keywords" />
                    <input value={form.canonicalUrl} onChange={(event) => updateForm("canonicalUrl", event.target.value)} className={ADMIN_INPUT} placeholder="canonicalUrl" />
                    <input value={form.ogTitle} onChange={(event) => updateForm("ogTitle", event.target.value)} className={ADMIN_INPUT} placeholder="ogTitle" />
                    <textarea value={form.ogDescription} onChange={(event) => updateForm("ogDescription", event.target.value)} className={`min-h-[72px] ${ADMIN_INPUT}`} placeholder="ogDescription" />
                    <input value={form.ogImage} onChange={(event) => updateForm("ogImage", event.target.value)} className={ADMIN_INPUT} placeholder="ogImage" />
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input type="checkbox" checked={form.noIndex} onChange={(event) => updateForm("noIndex", event.target.checked)} />
                      noIndex
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input type="checkbox" checked={form.isFeatured} onChange={(event) => updateForm("isFeatured", event.target.checked)} />
                      {copy.featured}
                    </label>
                  </div>
                ) : null}
              </section>

              <section className={`${ADMIN_CARD} ${ADMIN_CARD_HAIR} rounded-lg p-4`}>
                <h2 className="text-sm font-semibold">{copy.publicationSection}</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => { if (form.id) void runPublicationCheck(form.id); }} disabled={!form.id} className={commandButtonClass()}>
                    <RefreshCw className="h-4 w-4" />
                    {copy.publicationCheck}
                  </button>
                  <button type="button" onClick={() => { void saveWithStatus("private"); }} disabled={Boolean(saving)} className={commandButtonClass()}>
                    <Archive className="h-4 w-4" />
                    {copy.privateState}
                  </button>
                  <button type="button" onClick={() => { void saveWithStatus("archived"); }} disabled={Boolean(saving)} className={commandButtonClass("warn")}>
                    <Archive className="h-4 w-4" />
                    {copy.archive}
                  </button>
                </div>
                {publicationCheck ? (
                  <div className={`mt-3 rounded-lg border p-3 text-xs ${publicationCheck.ok ? "border-emerald-700 bg-emerald-950 text-emerald-200" : "border-amber-700 bg-amber-950 text-amber-200"}`}>
                    <p className="font-semibold">{publicationCheck.ok ? copy.publicationOk : copy.needsCheck}</p>
                    <p className="mt-1">API {publicationCheck.apiStatus?.status || "-"} · Page {publicationCheck.pageStatus?.status || "-"} · Cache {publicationCheck.purgeStatus || "-"}</p>
                    {publicationCheck.publicUrl ? <a className="mt-2 inline-flex underline" href={publicationCheck.publicUrl} target="_blank" rel="noreferrer">{copy.publicUrl}</a> : null}
                  </div>
                ) : null}
              </section>

              <section className={`${ADMIN_CARD} ${ADMIN_CARD_HAIR} rounded-lg p-4`}>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">{copy.versionSection}</h2>
                  <button type="button" onClick={() => { void loadRevisions(form.id); }} disabled={!form.id} className={editorButtonClass()} title={copy.refresh}>
                    <History className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {revisions.length === 0 ? (
                    <p className="text-xs text-slate-500">{copy.noRevisions}</p>
                  ) : revisions.map((revision) => (
                    <div key={revision.id} className="flex items-center justify-between gap-2 border-b border-slate-800 py-2 last:border-b-0">
                      <div className="min-w-0">
                        <p className="truncate text-xs text-slate-200">v{revision.revision} · {revision.title || copy.noTitle}</p>
                        <p className="text-[11px] text-slate-500">{formatDate(revision.savedAt, locale)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { void restoreRevision(revision.id); }}
                        disabled={restoringRevisionId === revision.id}
                        className={editorButtonClass()}
                        title={copy.restore}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

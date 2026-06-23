"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import ImageExtension from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
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
  LogOut,
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
import { getApiBaseUrl } from "../../_lib/api-config";
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

const FLOWER_ADMIN_TOKEN_RE = /^[A-Za-z0-9_-]{20,}\.[0-9a-f]{64}$/;
const LOCAL_ADMIN_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

const CONTENT_TYPES: Array<{ value: ContentType; label: string }> = [
  { value: "fortune_insight", label: "운세 인사이트" },
  { value: "saju", label: "사주" },
  { value: "tarot", label: "타로" },
  { value: "astrology", label: "점성술" },
  { value: "jamidusu", label: "자미두수" },
  { value: "sookyo", label: "숙요" },
  { value: "vedic", label: "베다 점성술" },
  { value: "palmistry", label: "손금" },
  { value: "physiognomy", label: "관상" },
  { value: "notice", label: "공지" },
  { value: "landing", label: "랜딩" },
  { value: "seo_page", label: "SEO 페이지" },
  { value: "general", label: "일반" },
];

const STATUS_OPTIONS: Array<{ value: FilterStatus; label: string }> = [
  { value: "all", label: "전체" },
  { value: "draft", label: "임시저장" },
  { value: "scheduled", label: "예약" },
  { value: "published", label: "발행" },
  { value: "private", label: "비공개" },
  { value: "archived", label: "보관" },
  { value: "trash", label: "휴지통" },
];

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "updated", label: "최근 수정" },
  { value: "published", label: "최근 발행" },
  { value: "title", label: "제목순" },
  { value: "views", label: "조회순" },
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

function isLocalAdminHost(hostname: string): boolean {
  return LOCAL_ADMIN_HOSTS.has(String(hostname || "").trim().toLowerCase());
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

function getFlowerAdminTokenClient(): string {
  if (typeof window === "undefined") return "";

  try {
    const token = String(sessionStorage.getItem("flower_admin_token") || "").trim();
    if (FLOWER_ADMIN_TOKEN_RE.test(token)) return token;
  } catch {}

  try {
    const token = String(localStorage.getItem("flower_admin_token") || "").trim();
    if (FLOWER_ADMIN_TOKEN_RE.test(token)) return token;
  } catch {}

  return "";
}

function buildAdminHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...(extraHeaders || {}) };
  const token = getFlowerAdminTokenClient();
  if (token) headers["x-admin-token"] = token;
  return headers;
}

function clearAdminToken(): void {
  try { sessionStorage.removeItem("flower_admin_token"); } catch {}
  try { sessionStorage.removeItem("flower_admin_password_ok"); } catch {}
  try { localStorage.removeItem("flower_admin_token"); } catch {}
  try { localStorage.removeItem("flower_admin_password_ok"); } catch {}
}

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

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR", {
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

function statusLabel(status?: string): string {
  if (status === "published") return "발행";
  if (status === "scheduled") return "예약";
  if (status === "archived") return "보관";
  if (status === "private") return "비공개";
  if (status === "trash") return "휴지통";
  return "임시저장";
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

function commandButtonClass(tone: "neutral" | "primary" | "success" | "warn" = "neutral"): string {
  if (tone === "primary") return "inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50";
  if (tone === "success") return "inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50";
  if (tone === "warn") return "inline-flex items-center gap-2 rounded-lg bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50";
  return "inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 hover:border-slate-500 disabled:opacity-50";
}

export default function AdminContentPage() {
  const apiBase = useMemo(() => getApiBaseUrl(), []);
  const endpointBase = `${apiBase || ""}/api/admin/content`;
  const requestCredentials = useMemo(() => resolveAdminRequestCredentials(apiBase), [apiBase]);

  const featuredInputRef = useRef<HTMLInputElement | null>(null);
  const bodyImageInputRef = useRef<HTMLInputElement | null>(null);
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);
  const [revisions, setRevisions] = useState<ContentRevision[]>([]);
  const [publicationCheck, setPublicationCheck] = useState<PublicationCheck | null>(null);
  const [restoringRevisionId, setRestoringRevisionId] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
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

  const redirectToLogin = useCallback(() => {
    clearAdminToken();
    const next = typeof window === "undefined" ? "/admin/content" : `${window.location.pathname}${window.location.search}`;
    window.location.assign(`/admin/login?next=${encodeURIComponent(next)}`);
  }, []);

  const handleAuthFailure = useCallback((status: number) => {
    if (status === 401 || status === 403) {
      setError(status === 401 ? "관리자 로그인이 필요합니다." : "관리자 권한이 필요합니다.");
      redirectToLogin();
      return true;
    }
    return false;
  }, [redirectToLogin]);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setError("");
    try {
      const url = new URL(endpointBase, typeof window === "undefined" ? "http://localhost" : window.location.origin);
      if (filterStatus !== "all") url.searchParams.set("status", filterStatus);
      if (typeFilter !== "all") url.searchParams.set("type", typeFilter);
      if (query.trim()) url.searchParams.set("keyword", query.trim());
      url.searchParams.set("sort", sort);
      url.searchParams.set("page", "1");
      url.searchParams.set("limit", "80");

      const res = await fetch(url.toString(), {
        method: "GET",
        credentials: requestCredentials,
        headers: buildAdminHeaders(),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (handleAuthFailure(res.status)) return;
      if (!res.ok) {
        setError(String(data?.message || "글 목록을 불러오지 못했습니다."));
        setItems([]);
        setPagination(EMPTY_PAGINATION);
        return;
      }

      setItems(Array.isArray(data?.items) ? data.items : []);
      setPagination({
        page: Math.max(1, Number(data?.pagination?.page || 1) || 1),
        limit: Math.max(1, Number(data?.pagination?.limit || 80) || 80),
        total: Math.max(0, Number(data?.pagination?.total || 0) || 0),
        totalPages: Math.max(1, Number(data?.pagination?.totalPages || 1) || 1),
      });
    } catch {
      setError("네트워크 오류로 글 목록을 불러오지 못했습니다.");
      setItems([]);
      setPagination(EMPTY_PAGINATION);
    } finally {
      setLoadingList(false);
    }
  }, [endpointBase, filterStatus, handleAuthFailure, query, requestCredentials, sort, typeFilter]);

  const loadRevisions = useCallback(async (contentId: string) => {
    if (!contentId) {
      setRevisions([]);
      return;
    }

    try {
      const res = await fetch(`${endpointBase}/${encodeURIComponent(contentId)}/revisions`, {
        method: "GET",
        credentials: requestCredentials,
        headers: buildAdminHeaders(),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setRevisions(Array.isArray(data?.revisions) ? data.revisions : []);
    } catch {}
  }, [endpointBase, requestCredentials]);

  const loadDetail = useCallback(async (contentId: string) => {
    if (!contentId || !editor) return;
    setLoadingDetail(true);
    setError("");
    setMessage("");
    setPublicationCheck(null);

    try {
      const res = await fetch(`${endpointBase}/${encodeURIComponent(contentId)}`, {
        method: "GET",
        credentials: requestCredentials,
        headers: buildAdminHeaders(),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (handleAuthFailure(res.status)) return;
      if (!res.ok) {
        setError(String(data?.message || "글을 불러오지 못했습니다."));
        return;
      }

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
    } catch {
      setError("네트워크 오류로 글을 불러오지 못했습니다.");
    } finally {
      setLoadingDetail(false);
    }
  }, [editor, endpointBase, handleAuthFailure, loadRevisions, requestCredentials]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

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
        alt: form.featuredImageAlt || form.title || "대표 이미지",
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
      setMessage("대표 이미지를 업로드했습니다.");
    } catch (uploadError) {
      setError(String((uploadError as Error)?.message || "이미지 업로드에 실패했습니다."));
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
      const alt = window.prompt("본문 이미지 설명", form.title ? `${form.title} 관련 이미지` : "본문 이미지") || "";
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
      setMessage("본문 이미지를 삽입했습니다.");
    } catch (uploadError) {
      setError(String((uploadError as Error)?.message || "이미지 삽입에 실패했습니다."));
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
      setError("제목을 입력해 주세요.");
      return false;
    }
    if (!editor) {
      setError("편집기가 아직 준비되지 않았습니다.");
      return false;
    }
    if (status === "scheduled") {
      const scheduledAt = fromDateTimeLocalValue(form.scheduledAt);
      if (!scheduledAt) {
        setError("예약 발행 시간을 선택해 주세요.");
        return false;
      }
      if (new Date(scheduledAt).getTime() <= Date.now()) {
        setError("예약 발행 시간은 현재 이후여야 합니다.");
        return false;
      }
    }
    return true;
  }

  async function runPublicationCheck(contentId: string): Promise<PublicationCheck | null> {
    if (!contentId) return null;
    try {
      await fetch(`${endpointBase}/${encodeURIComponent(contentId)}/cache-purge`, {
        method: "POST",
        credentials: requestCredentials,
        headers: buildAdminHeaders({ "Content-Type": "application/json" }),
        cache: "no-store",
      }).catch(() => null);

      const res = await fetch(`${endpointBase}/${encodeURIComponent(contentId)}/publish-status`, {
        method: "GET",
        credentials: requestCredentials,
        headers: buildAdminHeaders(),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return null;
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
      const url = isEdit ? `${endpointBase}/${encodeURIComponent(form.id)}` : endpointBase;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        credentials: requestCredentials,
        headers: buildAdminHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(buildPayload(status)),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (handleAuthFailure(res.status)) return;
      if (!res.ok) {
        setError(String(data?.message || "저장에 실패했습니다."));
        return;
      }

      const item = data?.item as ContentItem;
      const nextForm = normalizeFormFromItem(item || {});
      setForm(nextForm);
      setSlugEdited(Boolean(nextForm.slug));
      await loadRevisions(nextForm.id);
      await loadList();

      if (status === "published") {
        const check = await runPublicationCheck(nextForm.id);
        setMessage(check?.ok ? "발행했고 공개 반영까지 확인했습니다." : "발행했습니다. 공개 반영 상태를 확인해 주세요.");
      } else if (status === "scheduled") {
        setMessage("예약 발행으로 저장했습니다.");
      } else if (status === "archived") {
        setMessage("보관으로 이동했습니다.");
      } else if (status === "private") {
        setMessage("비공개로 저장했습니다.");
      } else {
        setMessage("임시저장했습니다.");
      }
    } catch {
      setError("네트워크 오류로 저장하지 못했습니다.");
    } finally {
      setSaving("");
    }
  }

  async function restoreRevision(revisionId: string) {
    if (!form.id || !revisionId) return;
    if (!window.confirm("선택한 버전으로 복구할까요? 현재 내용은 새 리비전으로 보관됩니다.")) return;

    setRestoringRevisionId(revisionId);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`${endpointBase}/${encodeURIComponent(form.id)}/restore`, {
        method: "POST",
        credentials: requestCredentials,
        headers: buildAdminHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ revisionId }),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (handleAuthFailure(res.status)) return;
      if (!res.ok) {
        setError(String(data?.message || "버전 복구에 실패했습니다."));
        return;
      }
      const item = data?.item as ContentItem;
      setForm(normalizeFormFromItem(item || {}));
      if (item?.contentJson && typeof item.contentJson === "object" && !Array.isArray(item.contentJson)) {
        editor?.commands.setContent(item.contentJson);
      } else {
        editor?.commands.setContent(sanitizeInsightHtml(String(item?.contentHtml || item?.content || "<p></p>")) || "<p></p>");
      }
      await loadRevisions(getItemId(item || {}));
      await loadList();
      setMessage("선택한 버전으로 복구했습니다.");
    } catch {
      setError("네트워크 오류로 버전을 복구하지 못했습니다.");
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
    <main className="min-h-screen bg-[#0d0f18] text-slate-100">
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
              <button type="button" onClick={redirectToLogin} className={editorButtonClass()} title="로그아웃">
                <LogOut className="h-4 w-4" />
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
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm outline-none focus:border-violet-500"
                  placeholder="제목, slug, 태그"
                />
              </div>
              <button type="submit" className={editorButtonClass()} title="검색">
                <Search className="h-4 w-4" />
              </button>
            </form>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value as FilterStatus)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as "all" | ContentType)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs"
              >
                <option value="all">전체 유형</option>
                {CONTENT_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2 border-b border-slate-800 bg-slate-900/40 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-200/70">챗봇 운영</p>
            <Link
              href="/admin/insights?service=saju#adminPromptLab"
              className="group block rounded-xl border border-amber-700 bg-gradient-to-br from-amber-950/80 to-slate-900 p-3 text-sm text-amber-100 transition hover:border-amber-400 hover:from-amber-900/80 hover:to-amber-900/40"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg border border-amber-300/40 bg-amber-300/10 p-1.5">
                  <Sparkles className="h-4 w-4 text-amber-200" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-amber-100">사주 프롬프트 설정</p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">사주운세 프롬프트 규칙을 한곳에서 관리하고 샘플 프롬프트를 즉시 확인하세요.</p>
                  <p className="mt-2 inline-flex items-center text-[11px] text-amber-200">
                    설정 화면 열기
                    <ExternalLink className="ml-1 h-3 w-3 opacity-80 transition group-hover:translate-x-0.5" />
                  </p>
                </div>
              </div>
            </Link>
          </div>

          <div className="max-h-[calc(100vh-182px)] overflow-y-auto">
            {loadingList ? (
              <div className="p-4 text-sm text-slate-400">불러오는 중...</div>
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
                        <p className="line-clamp-2 text-sm font-medium text-slate-100">{item.title || "제목 없음"}</p>
                        <span className={`shrink-0 rounded-lg border px-2 py-0.5 text-[11px] ${statusBadgeClass(item.status)}`}>
                          {statusLabel(item.status)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
                        <span className="truncate">/{item.slug || "-"}</span>
                        <span>{formatDate(item.updatedAt || item.createdAt)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <section className="min-w-0">
          <div className="sticky top-0 z-20 border-b border-slate-800 bg-[#0d0f18]/95 px-4 py-3 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`rounded-lg border px-2 py-0.5 text-xs ${statusBadgeClass(form.status)}`}>
                    {statusLabel(form.status)}
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
                  발행
                </button>
              </div>
            </div>
            {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
            {message ? <p className="mt-2 text-sm text-emerald-300">{message}</p> : null}
          </div>

          <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 space-y-4">
              <section className="rounded-lg border border-slate-800 bg-[#12141f] p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <select
                    value={form.type}
                    onChange={(event) => updateForm("type", event.target.value as ContentType)}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  >
                    {CONTENT_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(event) => updateForm("scheduledAt", event.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    aria-label="예약 발행 시간"
                  />
                  <input
                    value={form.title}
                    onChange={(event) => updateTitle(event.target.value)}
                    className="md:col-span-2 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-2xl font-semibold outline-none focus:border-violet-500"
                    placeholder="제목"
                  />
                  <input
                    value={form.subtitle}
                    onChange={(event) => updateForm("subtitle", event.target.value)}
                    className="md:col-span-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    placeholder="부제목"
                  />
                  <input
                    value={form.slug}
                    onChange={(event) => {
                      setSlugEdited(true);
                      updateForm("slug", slugify(event.target.value));
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    placeholder="slug"
                  />
                  <input
                    value={form.category}
                    onChange={(event) => updateForm("category", event.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    placeholder="카테고리"
                  />
                  <input
                    value={form.tagsText}
                    onChange={(event) => updateForm("tagsText", event.target.value)}
                    className="md:col-span-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    placeholder="태그, 쉼표로 구분"
                  />
                  <textarea
                    value={form.summary}
                    onChange={(event) => updateForm("summary", event.target.value)}
                    className="md:col-span-2 min-h-[84px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    placeholder="요약"
                  />
                </div>
              </section>

              <section className="rounded-lg border border-slate-800 bg-[#12141f]">
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
                <section className="rounded-lg border border-slate-800 bg-[#12141f] p-5">
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
              <section className="rounded-lg border border-slate-800 bg-[#12141f] p-4">
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
                {uploading === "featured" ? <p className="mt-3 text-xs text-slate-400">업로드 중...</p> : null}
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
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    placeholder="이미지 URL"
                  />
                  <input
                    value={form.featuredImageAlt}
                    onChange={(event) => updateForm("featuredImageAlt", event.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    placeholder="alt 텍스트"
                  />
                </div>
              </section>

              <section className="rounded-lg border border-slate-800 bg-[#12141f] p-4">
                <button type="button" onClick={() => setSeoOpen((open) => !open)} className="flex w-full items-center justify-between text-left text-sm font-semibold">
                  SEO
                  <span className="text-xs text-slate-400">{seoWarnings.length ? `${seoWarnings.length}개 점검` : "정상"}</span>
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
                    <input value={form.metaTitle} onChange={(event) => updateForm("metaTitle", event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="metaTitle" />
                    <textarea value={form.metaDescription} onChange={(event) => updateForm("metaDescription", event.target.value)} className="min-h-[72px] w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="metaDescription" />
                    <input value={form.keywordsText} onChange={(event) => updateForm("keywordsText", event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="keywords" />
                    <input value={form.canonicalUrl} onChange={(event) => updateForm("canonicalUrl", event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="canonicalUrl" />
                    <input value={form.ogTitle} onChange={(event) => updateForm("ogTitle", event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="ogTitle" />
                    <textarea value={form.ogDescription} onChange={(event) => updateForm("ogDescription", event.target.value)} className="min-h-[72px] w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="ogDescription" />
                    <input value={form.ogImage} onChange={(event) => updateForm("ogImage", event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="ogImage" />
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input type="checkbox" checked={form.noIndex} onChange={(event) => updateForm("noIndex", event.target.checked)} />
                      noIndex
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input type="checkbox" checked={form.isFeatured} onChange={(event) => updateForm("isFeatured", event.target.checked)} />
                      추천 글
                    </label>
                  </div>
                ) : null}
              </section>

              <section className="rounded-lg border border-slate-800 bg-[#12141f] p-4">
                <h2 className="text-sm font-semibold">발행 확인</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => { if (form.id) void runPublicationCheck(form.id); }} disabled={!form.id} className={commandButtonClass()}>
                    <RefreshCw className="h-4 w-4" />
                    반영 확인
                  </button>
                  <button type="button" onClick={() => { void saveWithStatus("private"); }} disabled={Boolean(saving)} className={commandButtonClass()}>
                    <Archive className="h-4 w-4" />
                    비공개
                  </button>
                  <button type="button" onClick={() => { void saveWithStatus("archived"); }} disabled={Boolean(saving)} className={commandButtonClass("warn")}>
                    <Archive className="h-4 w-4" />
                    보관
                  </button>
                </div>
                {publicationCheck ? (
                  <div className={`mt-3 rounded-lg border p-3 text-xs ${publicationCheck.ok ? "border-emerald-700 bg-emerald-950 text-emerald-200" : "border-amber-700 bg-amber-950 text-amber-200"}`}>
                    <p className="font-semibold">{publicationCheck.ok ? "공개 반영 완료" : "확인 필요"}</p>
                    <p className="mt-1">API {publicationCheck.apiStatus?.status || "-"} · 페이지 {publicationCheck.pageStatus?.status || "-"} · 캐시 {publicationCheck.purgeStatus || "-"}</p>
                    {publicationCheck.publicUrl ? <a className="mt-2 inline-flex underline" href={publicationCheck.publicUrl} target="_blank" rel="noreferrer">공개 URL</a> : null}
                  </div>
                ) : null}
              </section>

              <section className="rounded-lg border border-slate-800 bg-[#12141f] p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">버전</h2>
                  <button type="button" onClick={() => { void loadRevisions(form.id); }} disabled={!form.id} className={editorButtonClass()} title="새로고침">
                    <History className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {revisions.length === 0 ? (
                    <p className="text-xs text-slate-500">저장된 이전 버전이 없습니다.</p>
                  ) : revisions.map((revision) => (
                    <div key={revision.id} className="flex items-center justify-between gap-2 border-b border-slate-800 py-2 last:border-b-0">
                      <div className="min-w-0">
                        <p className="truncate text-xs text-slate-200">v{revision.revision} · {revision.title || "제목 없음"}</p>
                        <p className="text-[11px] text-slate-500">{formatDate(revision.savedAt)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { void restoreRevision(revision.id); }}
                        disabled={restoringRevisionId === revision.id}
                        className={editorButtonClass()}
                        title="복구"
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

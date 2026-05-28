"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor } from "@tiptap/react";
import LinkExtension from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useMemo, useRef, useState } from "react";
import { getApiBaseUrl } from "../../../_lib/api-config";
import { uploadInsightImage } from "../_lib/imageUpload";
import { sanitizeInsightHtml } from "../_lib/sanitizeContent";

type EditorMode = "create" | "edit";
type SaveStatus = "draft" | "published" | "archived" | "private";
type ContentType = "fortune_insight" | "saju" | "tarot" | "astrology" | "jamidusu" | "sookyo" | "vedic" | "palmistry" | "physiognomy" | "notice" | "landing" | "seo_page" | "general";
type ContentFormat = "html" | "markdown" | "blocks";
type SeoCheckLevel = "pass" | "warn" | "error";

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

const FLOWER_ADMIN_TOKEN_RE = /^[A-Za-z0-9_-]{20,}\.[0-9a-f]{64}$/;

function getFlowerAdminTokenClient(): string {
  if (typeof window === "undefined") return "";

  try {
    const fromSession = String(sessionStorage.getItem("flower_admin_token") || "").trim();
    if (FLOWER_ADMIN_TOKEN_RE.test(fromSession)) return fromSession;
  } catch (e) {}

  try {
    const fromLocal = String(localStorage.getItem("flower_admin_token") || "").trim();
    if (FLOWER_ADMIN_TOKEN_RE.test(fromLocal)) return fromLocal;
  } catch (e) {}

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
    return new URL(base).origin === window.location.origin ? "include" : "omit";
  } catch (e) {
    return "include";
  }
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

  const [contentType, setContentType] = useState<ContentType>("fortune_insight");
  const [contentFormat, setContentFormat] = useState<ContentFormat>("html");
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
  const [contentLoaded, setContentLoaded] = useState(false);
  const [uploadingFeatured, setUploadingFeatured] = useState(false);
  const [uploadingBody, setUploadingBody] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);
  const [seoChecking, setSeoChecking] = useState(false);
  const [seoChecks, setSeoChecks] = useState<SeoCheckItem[]>([]);

  const featuredInputRef = useRef<HTMLInputElement | null>(null);
  const bodyInputRef = useRef<HTMLInputElement | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
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
  });

  function applyLink() {
    if (!editor) return;
    const oldHref = String(editor.getAttributes("link")?.href || "");
    const nextHref = window.prompt("링크 URL을 입력하세요.", oldHref || "https://");
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
        alt: featuredImageAlt || title || "대표 이미지",
        adminToken: getFlowerAdminTokenClient(),
      });
      setFeaturedImageUrl(uploaded.url);
      setFeaturedImageAlt(uploaded.alt || featuredImageAlt || title || "대표 이미지");
      setFeaturedImageWidth(uploaded.width || 0);
      setFeaturedImageHeight(uploaded.height || 0);
      if (!String(ogImage || "").trim()) setOgImage(uploaded.url);
      if (!String(twitterImage || "").trim()) setTwitterImage(uploaded.url);
      setMessage("대표 이미지를 업로드했습니다.");
    } catch (uploadError) {
      setError(String((uploadError as Error)?.message || "대표 이미지 업로드에 실패했습니다."));
    } finally {
      setUploadingFeatured(false);
    }
  }

  async function uploadAndInsertBodyImage(file: File) {
    if (!editor) {
      setError("에디터가 아직 준비되지 않았습니다.");
      return;
    }

    setError("");
    setMessage("");
    setUploadingBody(true);
    try {
      const alt = window.prompt("본문 이미지 alt 텍스트를 입력하세요.", title ? `${title} 관련 이미지` : "본문 이미지") || "";
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

      setMessage("본문 이미지를 삽입했습니다.");
    } catch (uploadError) {
      setError(String((uploadError as Error)?.message || "본문 이미지 업로드에 실패했습니다."));
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
    } catch (e) {
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
        label: "제목",
        level: title.trim() ? "pass" : "error",
        message: title.trim() ? "제목이 입력되어 있습니다." : "제목이 비어 있습니다.",
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
          label: "메타 설명 길이",
          level: "error",
          message: "metaDescription이 비어 있습니다.",
        });
      } else if (descriptionLength < 70 || descriptionLength > 180) {
        checks.push({
          key: "metaDescription",
          label: "메타 설명 길이",
          level: "warn",
          message: `현재 ${descriptionLength}자입니다. 70~180자 권장을 확인해 주세요.`,
        });
      } else {
        checks.push({
          key: "metaDescription",
          label: "메타 설명 길이",
          level: "pass",
          message: `현재 ${descriptionLength}자로 적절합니다.`,
        });
      }

      checks.push({
        key: "h1",
        label: "H1 개수",
        level: stats.h1 === 1 ? "pass" : "error",
        message: stats.h1 === 1 ? "H1이 1개입니다." : `H1이 ${stats.h1}개입니다. 정확히 1개여야 합니다.`,
      });

      checks.push({
        key: "h2",
        label: "H2 개수",
        level: stats.h2 >= 1 ? "pass" : "error",
        message: stats.h2 >= 1 ? `H2가 ${stats.h2}개 있습니다.` : "H2가 최소 1개 필요합니다.",
      });

      checks.push({
        key: "imageAlt",
        label: "이미지 alt",
        level: stats.imageMissingAlt === 0 ? "pass" : "error",
        message: stats.imageMissingAlt === 0
          ? (stats.imageCount > 0 ? "본문 이미지 alt가 모두 입력되어 있습니다." : "본문 이미지가 없거나 alt 누락이 없습니다.")
          : `alt가 비어 있는 본문 이미지가 ${stats.imageMissingAlt}개 있습니다.`,
      });

      checks.push({
        key: "bodyLength",
        label: "본문 글자 수",
        level: textLength >= 300 ? "pass" : "warn",
        message: textLength >= 300 ? `본문 ${textLength}자입니다.` : `본문 ${textLength}자로 짧습니다. 300자 이상 권장합니다.`,
      });

      if (duplicateResult.checkFailed) {
        checks.push({
          key: "slugDuplicate",
          label: "slug 중복",
          level: "warn",
          message: "중복 slug 확인에 실패했습니다. 저장 시 서버 검증 결과를 확인해 주세요.",
        });
      } else {
        checks.push({
          key: "slugDuplicate",
          label: "slug 중복",
          level: duplicateResult.duplicated ? "error" : "pass",
          message: duplicateResult.duplicated ? "동일한 slug가 이미 존재합니다." : "중복 slug가 없습니다.",
        });
      }

      checks.push({
        key: "noIndex",
        label: "noIndex 상태",
        level: noIndex ? "warn" : "pass",
        message: noIndex ? "noIndex가 켜져 있어 검색엔진 색인이 제한됩니다." : "noIndex가 꺼져 있어 색인 가능합니다.",
      });

      checks.push({
        key: "featuredImage",
        label: "대표 이미지",
        level: featuredImageUrl.trim() ? "pass" : "warn",
        message: featuredImageUrl.trim() ? "대표 이미지가 설정되어 있습니다." : "대표 이미지가 없어 공유 미리보기가 약해질 수 있습니다.",
      });

      setSeoChecks(checks);

      const hasError = checks.some((item) => item.level === "error");
      const hasWarn = checks.some((item) => item.level === "warn");
      return { items: checks, hasError, hasWarn };
    } finally {
      setSeoChecking(false);
    }
  }

  useEffect(() => {
    if (!isEditMode) {
      setLoading(false);
      return;
    }

    if (!insightId) {
      setError("수정할 글 ID를 찾을 수 없습니다.");
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
            router.replace("/admin/login");
            return;
          }
          if (!cancelled) setError(String(data?.message || "글 정보를 불러오지 못했습니다."));
          return;
        }

        const item = data?.item || {};
        if (cancelled) return;

        setContentType((String(item.type || "fortune_insight").trim().toLowerCase() as ContentType) || "fortune_insight");
        setContentFormat((String(item.contentFormat || "html").trim().toLowerCase() as ContentFormat) || "html");

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
      } catch (e) {
        if (!cancelled) setError("네트워크 오류로 글 정보를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDetail();
    return () => {
      cancelled = true;
    };
  }, [editor, endpointBase, insightId, isEditMode, requestCredentials, router]);

  useEffect(() => {
    if (isEditMode) return;
    if (!editor) return;
    if (contentLoaded) return;

    editor.commands.setContent("<p></p>");
    setContentLoaded(true);
  }, [contentLoaded, editor, isEditMode]);

  async function saveWithStatus(status: SaveStatus) {
    setError("");
    setMessage("");

    if (!title.trim()) {
      setError("제목을 입력해 주세요.");
      return;
    }

    if (!editor) {
      setError("에디터가 아직 준비되지 않았습니다.");
      return;
    }

    if (status === "published") {
      const checkResult = await runSeoChecks();
      if (checkResult.hasError) {
        setSeoOpen(true);
        setError("SEO 치명적 오류가 있어 발행할 수 없습니다. 점검 항목을 수정해 주세요.");
        return;
      }

      if (checkResult.hasWarn) {
        const proceed = window.confirm("SEO 경고가 있습니다. 확인 후 발행하시겠습니까?");
        if (!proceed) return;
      }
    }

    setSavingStatus(status);
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
          router.replace("/admin/login");
          return;
        }
        setError(String(data?.message || "저장에 실패했습니다."));
        return;
      }

      if (!isEditMode) {
        const newId = String(data?.item?._id || "");
        if (newId) {
          router.replace(`/admin/insights/edit?id=${encodeURIComponent(newId)}`);
          return;
        }
      }

      setMessage(status === "published" ? "발행 저장 완료" : status === "archived" ? "보관 저장 완료" : status === "private" ? "비공개 저장 완료" : "임시저장 완료");
    } catch (e) {
      setError("네트워크 오류로 저장하지 못했습니다.");
    } finally {
      setSavingStatus("");
    }
  }

  return (
    <main className="min-h-screen bg-[#0d0d1a] text-slate-100 px-3 py-4 md:px-8 md:py-8">
      <section className="mx-auto w-full max-w-6xl space-y-4">
        <div className="sticky top-0 z-30 rounded-2xl border border-[#2a2a3e] bg-[#13131f]/95 px-3 py-3 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-lg md:text-xl font-bold">{isEditMode ? "콘텐츠 글 수정" : "콘텐츠 글 작성"}</h1>
              <p className="text-xs text-slate-400 mt-0.5">대표/본문 이미지 업로드 + 기본 SEO 이미지 메타</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => saveWithStatus("draft")}
                disabled={Boolean(savingStatus)}
                className="rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-60 px-3 py-2 text-sm"
              >
                {savingStatus === "draft" ? "저장 중..." : "임시저장"}
              </button>
              <button
                type="button"
                onClick={() => saveWithStatus("archived")}
                disabled={Boolean(savingStatus)}
                className="rounded-lg bg-amber-700 hover:bg-amber-600 disabled:opacity-60 px-3 py-2 text-sm"
              >
                {savingStatus === "archived" ? "저장 중..." : "보관 저장"}
              </button>
              <button
                type="button"
                onClick={() => saveWithStatus("published")}
                disabled={Boolean(savingStatus)}
                className="rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 px-3 py-2 text-sm font-medium"
              >
                {savingStatus === "published" ? "저장 중..." : "발행"}
              </button>
            </div>
          </div>

          {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
          {message ? <p className="mt-2 text-sm text-emerald-300">{message}</p> : null}
        </div>

        <div className="rounded-2xl border border-[#2a2a3e] bg-[#13131f] p-4 md:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as ContentType)}
              className="rounded-lg bg-[#1e1e2e] border border-[#313145] px-3 py-2.5 text-sm"
            >
              <option value="fortune_insight">운세 인사이트</option>
              <option value="saju">사주</option>
              <option value="tarot">타로</option>
              <option value="astrology">점성술</option>
              <option value="jamidusu">자미두수</option>
              <option value="sookyo">숙요</option>
              <option value="vedic">베다</option>
              <option value="palmistry">손금</option>
              <option value="physiognomy">관상</option>
              <option value="notice">공지</option>
              <option value="landing">랜딩</option>
              <option value="seo_page">SEO 페이지</option>
              <option value="general">일반</option>
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
              placeholder="제목"
              className="md:col-span-2 rounded-xl bg-[#1e1e2e] border border-[#313145] px-4 py-3 text-2xl md:text-3xl font-semibold placeholder-slate-600"
            />
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="부제목"
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
              placeholder="카테고리"
              className="rounded-lg bg-[#1e1e2e] border border-[#313145] px-3 py-2.5 text-sm"
            />
            <input
              type="text"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="태그 (쉼표로 구분)"
              className="md:col-span-2 rounded-lg bg-[#1e1e2e] border border-[#313145] px-3 py-2.5 text-sm"
            />
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="요약"
              className="md:col-span-2 rounded-lg bg-[#1e1e2e] border border-[#313145] px-3 py-2.5 text-sm min-h-[88px]"
            />
            <input
              type="text"
              value={featuredImageAlt}
              onChange={(e) => setFeaturedImageAlt(e.target.value)}
              placeholder="대표 이미지 alt 텍스트"
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
                {uploadingFeatured ? "업로드 중..." : "대표 이미지 업로드"}
              </button>
              <p className="text-xs text-slate-400">허용 형식: jpg, jpeg, png, webp / 최대 6MB</p>
            </div>
            {featuredImageUrl ? (
              <div className="md:col-span-2 rounded-xl border border-slate-700 bg-slate-900/50 p-3">
                <p className="text-xs text-slate-400 mb-2">대표 이미지 미리보기 (OG 이미지로 자동 사용)</p>
                <img
                  src={featuredImageUrl}
                  alt={featuredImageAlt || title || "대표 이미지"}
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
              placeholder="대표 이미지 URL (직접 입력도 가능)"
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

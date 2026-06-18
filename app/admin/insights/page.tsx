"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../../_lib/api-config";

type InsightStatus = "draft" | "scheduled" | "published" | "archived" | "private" | "trash";
type FilterKey = "all" | InsightStatus;
type SortKey = "latest" | "updated" | "views";
type ContentType = "all" | "fortune_insight" | "saju" | "tarot" | "astrology" | "jamidusu" | "sookyo" | "vedic" | "palmistry" | "physiognomy" | "notice" | "landing" | "seo_page" | "general";

type InsightItem = {
  id?: string;
  _id: string;
  type?: string;
  title: string;
  slug: string;
  summary?: string;
  category?: string;
  status: InsightStatus;
  viewCount?: number;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
};

type PublicationCheck = {
  ok: boolean;
  dbReady?: boolean;
  publicUrl?: string;
  apiStatus?: { status?: number; ok?: boolean };
  pageStatus?: { status?: number; ok?: boolean };
  pageMeta?: {
    hasTitle?: boolean;
    hasDescription?: boolean;
    canonicalMatches?: boolean;
    noIndex?: boolean;
  } | null;
  feedCoverage?: Record<string, { containsSlug?: boolean; status?: number; url?: string }> | null;
  purgeStatus?: string;
};

type ContentDiag = {
  dbConnected?: boolean;
  counts?: {
    allContent?: number;
    fortuneInsights?: number;
    published?: number;
    draft?: number;
    scheduled?: number;
    scheduledReady?: number;
    archived?: number;
    missingSlug?: number;
    publishedMissingMetaDescription?: number;
    publishedMissingFeaturedImage?: number;
    publishedNoIndex?: number;
  };
  dynamicFeeds?: Record<string, { ok?: boolean; status?: number; merged?: boolean; error?: string; url?: string }>;
};

type ContentPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type PromptLabService = "saju" | "tarot" | "sukuyo" | "astrology" | "ziwei" | "vedic";
type PromptLabDomain = "general" | "love" | "compatibility" | "career" | "money" | "health" | "life_direction" | "personality";
type PromptLabTimeCorrectionPolicy = "auto" | "clock" | "local_mean" | "true_solar";
type PromptLabDayChangePolicy = "auto" | "midnight" | "late_zi_next_day" | "true_solar_zi_next_day";
type PromptLabEarthStorageMode = "conservative" | "standard" | "active";
type PromptLabEarthStorageScope = "natal" | "natal_daewoon" | "natal_sewoon" | "natal_daewoon_sewoon" | "all";

type PromptLabForm = {
  service: PromptLabService;
  domain: PromptLabDomain;
  name: string;
  gender: "" | "M" | "F";
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  birthPlace: string;
  latitude: string;
  longitude: string;
  timezone: string;
  timeCorrectionPolicy: PromptLabTimeCorrectionPolicy;
  dayChangePolicy: PromptLabDayChangePolicy;
  earthStorageOpeningEnabled: boolean;
  earthStorageOpeningMode: PromptLabEarthStorageMode;
  earthStorageOpeningScope: PromptLabEarthStorageScope;
  question: string;
};

type PromptLabResult = {
  ok?: boolean;
  service?: PromptLabService;
  serviceLabel?: string;
  domain?: string;
  domainLabel?: string;
  title?: string;
  prompt?: string;
  generatedPrompt?: string;
  summaryIntent?: string;
  analysisAngles?: string[];
  recommendedFollowUpQuestions?: string[];
  adminFreeExecution?: boolean;
  generatedAt?: string;
  engineContextSummary?: {
    marker?: string;
    sourceLayers?: string[];
    hiddenStemCount?: number;
    hiddenStemExposureCount?: number;
    touganCount?: number;
    tuchulCount?: number;
    earthStorageOpeningCount?: number;
    earthStorageOpenings?: Array<{
      sourceBranch?: string;
      triggerBranch?: string;
      relationType?: string;
      openingStrength?: string;
      timingLabel?: string;
    }>;
    promptConfig?: {
      earthStorageOpening?: {
        enabled?: boolean;
        mode?: string;
        scope?: string;
      };
    };
    doChung?: {
      exists?: boolean;
      repeatedBranch?: string;
      repeatedCount?: number;
      inducedOppositeBranch?: string;
      strength?: string;
      summaryForPrompt?: string;
    };
  } | null;
  advancedFactors?: {
    hiddenStems?: unknown[];
    hiddenStemExposures?: unknown[];
    doChung?: {
      exists?: boolean;
      repeatedBranch?: string;
      repeatedCount?: number;
      inducedOppositeBranch?: string;
      strength?: string;
      summaryForPrompt?: string;
    };
  } | null;
};

const PROMPT_LAB_SERVICES: Array<{ key: PromptLabService; label: string }> = [
  { key: "saju", label: "사주" },
  { key: "tarot", label: "타로" },
  { key: "sukuyo", label: "숙요" },
  { key: "astrology", label: "점성술" },
  { key: "ziwei", label: "자미두수" },
  { key: "vedic", label: "베다점" },
];

const PROMPT_LAB_DOMAINS: Array<{ key: PromptLabDomain; label: string }> = [
  { key: "general", label: "전체 흐름" },
  { key: "love", label: "연애/관계" },
  { key: "compatibility", label: "궁합" },
  { key: "career", label: "직업/진로" },
  { key: "money", label: "재물/사업" },
  { key: "health", label: "건강/리듬" },
  { key: "life_direction", label: "인생 흐름" },
  { key: "personality", label: "기질/성향" },
];

const DEFAULT_PROMPT_LAB_FORM: PromptLabForm = {
  service: "saju",
  domain: "general",
  name: "",
  gender: "",
  birthDate: "",
  birthTime: "",
  birthTimeUnknown: true,
  birthPlace: "",
  latitude: "",
  longitude: "",
  timezone: "Asia/Seoul",
  timeCorrectionPolicy: "auto",
  dayChangePolicy: "auto",
  earthStorageOpeningEnabled: true,
  earthStorageOpeningMode: "standard",
  earthStorageOpeningScope: "natal_daewoon_sewoon",
  question: "올해 제 운의 흐름에서 가장 강하게 열리는 문과 조심해야 할 기운은 무엇인가요?",
};

const SAJU_PROMPT_ADVANCED_RULES = [
  "월지 지장간을 가장 무겁게 잡고 일지 지장간은 관계와 내면 반응에 연결",
  "모든 지장간은 일간 기준 십성으로 변환",
  "원국 천간에 드러난 지장간은 투간으로 분리",
  "대운·세운 천간에 드러난 지장간은 투출로 분리",
  "도충은 같은 지지 3개 이상 중첩과 반대 충 유도 구조로만 반영",
  "辰·戌·丑·未 토 지지는 형충해파 자극 시 개고로 열린 지장간까지 반영",
];

const PROMPT_LAB_SERVICE_REQUIREMENTS: Record<PromptLabService, {
  needsCoordinates: boolean;
  needsExactTime: boolean;
  supportsTimeCorrection: boolean;
  note: string;
}> = {
  saju: {
    needsCoordinates: true,
    needsExactTime: false,
    supportsTimeCorrection: true,
    note: "사주는 지역 좌표가 있으면 실제 사주 분석과 같은 진태양시/야자시 보정으로 명식이 열립니다.",
  },
  tarot: {
    needsCoordinates: false,
    needsExactTime: false,
    supportsTimeCorrection: false,
    note: "타로는 질문의 결을 중심으로 펼쳐집니다.",
  },
  sukuyo: {
    needsCoordinates: false,
    needsExactTime: false,
    supportsTimeCorrection: false,
    note: "숙요는 생년월일의 달빛 결을 중심으로 살핍니다.",
  },
  astrology: {
    needsCoordinates: true,
    needsExactTime: true,
    supportsTimeCorrection: false,
    note: "점성술은 ASC, 하우스, MC가 위도·경도와 정확한 생시에 기대어 솟아납니다.",
  },
  ziwei: {
    needsCoordinates: false,
    needsExactTime: true,
    supportsTimeCorrection: false,
    note: "자미두수는 명궁과 신궁을 위해 생시가 필요합니다.",
  },
  vedic: {
    needsCoordinates: true,
    needsExactTime: true,
    supportsTimeCorrection: false,
    note: "베다점은 라그나와 나크샤트라가 위도·경도와 정확한 생시에 기대어 떠오릅니다.",
  },
};

const PROMPT_LAB_TIME_CORRECTION_OPTIONS: Array<{ key: PromptLabTimeCorrectionPolicy; label: string }> = [
  { key: "auto", label: "자동 보정" },
  { key: "clock", label: "표준시" },
  { key: "local_mean", label: "평균태양시" },
  { key: "true_solar", label: "진태양시" },
];

const PROMPT_LAB_DAY_CHANGE_OPTIONS: Array<{ key: PromptLabDayChangePolicy; label: string }> = [
  { key: "auto", label: "자동 야자시" },
  { key: "midnight", label: "자정 기준" },
  { key: "late_zi_next_day", label: "야자시 다음날" },
  { key: "true_solar_zi_next_day", label: "진태양시 야자시" },
];

const PROMPT_LAB_EARTH_STORAGE_MODE_OPTIONS: Array<{ key: PromptLabEarthStorageMode; label: string }> = [
  { key: "conservative", label: "보수적" },
  { key: "standard", label: "표준" },
  { key: "active", label: "적극적" },
];

const PROMPT_LAB_EARTH_STORAGE_SCOPE_OPTIONS: Array<{ key: PromptLabEarthStorageScope; label: string }> = [
  { key: "natal", label: "원국 내부 형충해파" },
  { key: "natal_daewoon", label: "원국 + 대운" },
  { key: "natal_sewoon", label: "원국 + 세운" },
  { key: "natal_daewoon_sewoon", label: "원국 + 대운 + 세운" },
  { key: "all", label: "월운/일진까지 포함" },
];

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

  try {
    const fromLocal = String(localStorage.getItem("flower_admin_token") || "").trim();
    if (FLOWER_ADMIN_TOKEN_RE.test(fromLocal)) return fromLocal;
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

function getAdminAccessMessage(status: number): string {
  if (status === 401) return "관리자 로그인이 필요합니다. 다시 로그인해 주세요.";
  return "관리자 권한이 확인되지 않았습니다. 관리자 계정으로 다시 로그인해 주세요.";
}

function clearFlowerAdminTokenClient(): void {
  if (typeof window === "undefined") return;
  try { sessionStorage.removeItem("flower_admin_token"); } catch {}
  try { sessionStorage.removeItem("flower_admin_password_ok"); } catch {}
  try { localStorage.removeItem("flower_admin_token"); } catch {}
  try { localStorage.removeItem("flower_admin_password_ok"); } catch {}
}

const FILTER_OPTIONS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "전체" },
  { key: "draft", label: "임시저장" },
  { key: "scheduled", label: "예약됨" },
  { key: "published", label: "발행됨" },
  { key: "archived", label: "보관" },
  { key: "private", label: "비공개(레거시)" },
  { key: "trash", label: "휴지통(레거시)" },
];

const TYPE_OPTIONS: Array<{ key: ContentType; label: string }> = [
  { key: "all", label: "전체 타입" },
  { key: "fortune_insight", label: "운세 인사이트" },
  { key: "saju", label: "사주" },
  { key: "tarot", label: "타로" },
  { key: "astrology", label: "점성술" },
  { key: "jamidusu", label: "자미두수" },
  { key: "sookyo", label: "숙요" },
  { key: "vedic", label: "베다" },
  { key: "palmistry", label: "손금" },
  { key: "physiognomy", label: "관상" },
  { key: "notice", label: "공지" },
  { key: "landing", label: "랜딩" },
  { key: "seo_page", label: "SEO 페이지" },
  { key: "general", label: "일반" },
];

const ADMIN_CONTENT_LIST_PAGE_SIZE = 100;
const ADMIN_CONTENT_LIST_MAX_PAGES = 200;
const EMPTY_CONTENT_PAGINATION: ContentPagination = {
  page: 1,
  limit: ADMIN_CONTENT_LIST_PAGE_SIZE,
  total: 0,
  totalPages: 1,
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: InsightStatus) {
  if (status === "draft") return "임시저장";
  if (status === "scheduled") return "예약됨";
  if (status === "published") return "발행됨";
  if (status === "archived") return "보관됨";
  if (status === "private") return "비공개";
  return "휴지통";
}

function statusBadgeClass(status: InsightStatus) {
  if (status === "published") return "bg-emerald-900/50 text-emerald-200 border-emerald-700";
  if (status === "scheduled") return "bg-blue-900/50 text-blue-200 border-blue-700";
  if (status === "archived") return "bg-orange-900/40 text-orange-200 border-orange-700";
  if (status === "private") return "bg-amber-900/40 text-amber-200 border-amber-700";
  if (status === "trash") return "bg-rose-900/40 text-rose-200 border-rose-700";
  return "bg-slate-800 text-slate-200 border-slate-700";
}

function countText(value?: number) {
  return Number(value || 0).toLocaleString("ko-KR");
}

function feedStatusText(feed?: { ok?: boolean; status?: number; merged?: boolean }) {
  if (!feed) return "미확인";
  if (!feed.ok) return `오류 ${feed.status || "-"}`;
  return feed.merged ? "동적 반영" : "정적 응답";
}

export default function AdminInsightsPage() {
  const router = useRouter();
  const apiBase = useMemo(() => getApiBaseUrl(), []);
  const endpointBase = `${apiBase || ""}/api/admin/content`;
  const promptLabEndpoint = `${apiBase || ""}/api/admin/prompt-lab/generate`;
  const promptLabGeocodeEndpoint = `${apiBase || ""}/api/admin/prompt-lab/geocode`;
  const requestCredentials = useMemo(() => resolveAdminRequestCredentials(apiBase), [apiBase]);

  const [filter, setFilter] = useState<FilterKey>("all");
  const [typeFilter, setTypeFilter] = useState<ContentType>("all");
  const [sort, setSort] = useState<SortKey>("latest");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<InsightItem[]>([]);
  const [pagination, setPagination] = useState<ContentPagination>(EMPTY_CONTENT_PAGINATION);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [forbiddenMessage, setForbiddenMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [publicationChecks, setPublicationChecks] = useState<Record<string, PublicationCheck>>({});
  const [diag, setDiag] = useState<ContentDiag | null>(null);
  const [promptLabForm, setPromptLabForm] = useState<PromptLabForm>(DEFAULT_PROMPT_LAB_FORM);
  const [promptLabLoading, setPromptLabLoading] = useState(false);
  const [promptLabGeocoding, setPromptLabGeocoding] = useState(false);
  const [promptLabError, setPromptLabError] = useState("");
  const [promptLabResult, setPromptLabResult] = useState<PromptLabResult | null>(null);
  const promptLabRequirement = PROMPT_LAB_SERVICE_REQUIREMENTS[promptLabForm.service];

  async function loadDiag() {
    try {
      const res = await fetch(`${endpointBase}/diag`, {
        method: "GET",
        credentials: requestCredentials,
        headers: buildAdminHeaders(),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setDiag(data as ContentDiag);
    } catch {}
  }

  async function loadList() {
    setLoading(true);
    setError("");

    try {
      const collectedItems: InsightItem[] = [];
      let page = 1;
      let nextPagination: ContentPagination = EMPTY_CONTENT_PAGINATION;

      while (page <= ADMIN_CONTENT_LIST_MAX_PAGES) {
        const url = new URL(endpointBase, window.location.origin);
        if (filter !== "all") url.searchParams.set("status", filter);
        if (typeFilter !== "all") url.searchParams.set("type", typeFilter);
        if (query.trim()) url.searchParams.set("keyword", query.trim());
        url.searchParams.set("sort", sort);
        url.searchParams.set("page", String(page));
        url.searchParams.set("limit", String(ADMIN_CONTENT_LIST_PAGE_SIZE));

        const res = await fetch(url.toString(), {
          method: "GET",
          credentials: requestCredentials,
          headers: buildAdminHeaders(),
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));

        if (res.status === 401 || res.status === 403) {
          if (res.status === 401) clearFlowerAdminTokenClient();
          setForbidden(true);
          setForbiddenMessage(getAdminAccessMessage(res.status));
          setError("");
          setItems([]);
          setPagination(EMPTY_CONTENT_PAGINATION);
          return;
        }

        if (!res.ok) {
          setError(String(data?.message || "목록을 불러오지 못했습니다."));
          setItems([]);
          setPagination(EMPTY_CONTENT_PAGINATION);
          return;
        }

        const pageItems = Array.isArray(data?.items) ? data.items : [];
        const rawPagination = data?.pagination || {};
        const total = Math.max(0, Number(rawPagination.total || pageItems.length || 0) || 0);
        const limit = Math.max(1, Number(rawPagination.limit || ADMIN_CONTENT_LIST_PAGE_SIZE) || ADMIN_CONTENT_LIST_PAGE_SIZE);
        const totalPages = Math.max(1, Number(rawPagination.totalPages || Math.ceil(total / limit) || 1) || 1);
        const currentPage = Math.max(1, Number(rawPagination.page || page) || page);

        collectedItems.push(...pageItems);
        nextPagination = { page: currentPage, limit, total, totalPages };

        if (currentPage >= totalPages || pageItems.length === 0) break;
        page = currentPage + 1;
      }

      setForbidden(false);
      setForbiddenMessage("");
      setItems(collectedItems);
      setPagination(nextPagination);
      void loadDiag();
    } catch {
      setError("네트워크 오류로 목록을 불러오지 못했습니다.");
      setItems([]);
      setPagination(EMPTY_CONTENT_PAGINATION);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadList();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpointBase, filter, typeFilter, sort, query, requestCredentials]);

  async function updateStatus(id: string, status: InsightStatus) {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`${endpointBase}/${id}`, {
        method: "PATCH",
        credentials: requestCredentials,
        headers: buildAdminHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status }),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(String(data?.message || "상태 변경에 실패했습니다."));
        return;
      }
      await loadList();
    } finally {
      setBusyId("");
    }
  }

  async function moveToTrash(id: string) {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`${endpointBase}/${id}`, {
        method: "DELETE",
        credentials: requestCredentials,
        headers: buildAdminHeaders(),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(String(data?.message || "휴지통 이동에 실패했습니다."));
        return;
      }
      await loadList();
    } finally {
      setBusyId("");
    }
  }

  async function checkPublication(id: string) {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`${endpointBase}/${encodeURIComponent(id)}/publish-status`, {
        method: "GET",
        credentials: requestCredentials,
        headers: buildAdminHeaders(),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(String(data?.message || "공개 상태 확인에 실패했습니다."));
        return;
      }
      setPublicationChecks((prev) => ({
        ...prev,
        [id]: data?.publication || { ok: false },
      }));
    } finally {
      setBusyId("");
    }
  }

  async function purgeContentCache(id: string) {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`${endpointBase}/${encodeURIComponent(id)}/cache-purge`, {
        method: "POST",
        credentials: requestCredentials,
        headers: buildAdminHeaders({ "Content-Type": "application/json" }),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(String(data?.message || "캐시 갱신 요청에 실패했습니다."));
        return;
      }
      setPublicationChecks((prev) => ({
        ...prev,
        [id]: {
          ...(prev[id] || { ok: false }),
          publicUrl: data?.purge?.files?.[0] || prev[id]?.publicUrl || "",
          purgeStatus: String(data?.purge?.status || "requested"),
        },
      }));
    } finally {
      setBusyId("");
    }
  }

  function updatePromptLabField<K extends keyof PromptLabForm>(key: K, value: PromptLabForm[K]) {
    setPromptLabForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "service") {
        const requirement = PROMPT_LAB_SERVICE_REQUIREMENTS[value as PromptLabService];
        if (requirement?.needsExactTime) next.birthTimeUnknown = false;
        if (!requirement?.supportsTimeCorrection) {
          next.timeCorrectionPolicy = "auto";
          next.dayChangePolicy = "auto";
        }
      }
      return next;
    });
  }

  async function geocodePromptLabBirthPlace() {
    const queryText = promptLabForm.birthPlace.trim();
    if (!queryText) {
      setPromptLabError("출생지를 먼저 입력해 주세요.");
      return;
    }

    setPromptLabGeocoding(true);
    setPromptLabError("");
    try {
      const url = new URL(promptLabGeocodeEndpoint, window.location.origin);
      url.searchParams.set("q", queryText);
      const res = await fetch(url.toString(), {
        method: "GET",
        credentials: requestCredentials,
        headers: buildAdminHeaders(),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401 || res.status === 403) {
        if (res.status === 401) clearFlowerAdminTokenClient();
        setForbidden(true);
        const message = getAdminAccessMessage(res.status);
        setForbiddenMessage(message);
        setPromptLabError(message);
        return;
      }

      if (!res.ok || !data?.ok) {
        setPromptLabError(String(data?.message || "지역 좌표를 찾지 못했습니다."));
        return;
      }

      setForbidden(false);
      setForbiddenMessage("");
      setPromptLabForm((prev) => ({
        ...prev,
        birthPlace: String(data?.label || data?.query || prev.birthPlace),
        latitude: Number.isFinite(Number(data?.latitude)) ? String(Number(data.latitude).toFixed(6)) : prev.latitude,
        longitude: Number.isFinite(Number(data?.longitude)) ? String(Number(data.longitude).toFixed(6)) : prev.longitude,
        timezone: String(data?.timezone || prev.timezone || "Asia/Seoul"),
      }));
    } catch {
      setPromptLabError("지역 좌표를 불러오지 못했습니다.");
    } finally {
      setPromptLabGeocoding(false);
    }
  }

  async function generatePromptLab() {
    setPromptLabError("");
    setPromptLabResult(null);

    if (!promptLabForm.birthDate) {
      setPromptLabError("생년월일을 입력해 주세요.");
      return;
    }

    if (promptLabRequirement.needsExactTime && (promptLabForm.birthTimeUnknown || !promptLabForm.birthTime)) {
      setPromptLabError("선택한 기능은 정확한 생시가 필요합니다.");
      return;
    }

    if (promptLabRequirement.needsCoordinates && (!promptLabForm.latitude || !promptLabForm.longitude)) {
      setPromptLabError("선택한 기능은 출생지 좌표가 필요합니다. 지역을 입력한 뒤 좌표를 자동 입력해 주세요.");
      return;
    }

    if (promptLabForm.question.trim().length < 5) {
      setPromptLabError("질문을 조금 더 구체적으로 입력해 주세요.");
      return;
    }

    setPromptLabLoading(true);
    try {
      const res = await fetch(promptLabEndpoint, {
        method: "POST",
        credentials: requestCredentials,
        headers: buildAdminHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(promptLabForm),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401 || res.status === 403) {
        if (res.status === 401) clearFlowerAdminTokenClient();
        setForbidden(true);
        const message = getAdminAccessMessage(res.status);
        setForbiddenMessage(message);
        setPromptLabError(message);
        return;
      }

      if (!res.ok) {
        setPromptLabError(String(data?.message || "프롬프트 생성에 실패했습니다."));
        return;
      }

      setForbidden(false);
      setForbiddenMessage("");
      setPromptLabResult(data as PromptLabResult);
    } catch {
      setPromptLabError("네트워크 오류로 프롬프트를 만들지 못했습니다.");
    } finally {
      setPromptLabLoading(false);
    }
  }

  async function copyPromptLabPrompt() {
    const promptText = promptLabResult?.prompt || promptLabResult?.generatedPrompt || "";
    if (!promptText || typeof navigator === "undefined" || !navigator.clipboard) return;
    await navigator.clipboard.writeText(promptText);
  }

  return (
    <main className="min-h-screen bg-[#0d0d1a] text-slate-100 px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">관리자 콘텐츠 센터</h1>
            <p className="text-sm text-slate-400 mt-1">사이트 전체 글/콘텐츠 목록 관리</p>
          </div>
          <button
            type="button"
            className="rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2 text-sm font-medium"
            onClick={() => router.push("/admin/insights/new")}
          >
            새 글 작성
          </button>
        </header>

        {diag ? (
          <section className="rounded-2xl border border-[#2a2a3e] bg-[#13131f] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold">콘텐츠 운영 상태</h2>
                <p className="mt-1 text-xs text-slate-400">발행, 예약, SEO, sitemap/RSS 반영 상태</p>
              </div>
              <button
                type="button"
                onClick={() => { void loadDiag(); }}
                className="rounded-lg bg-slate-700 px-3 py-2 text-xs hover:bg-slate-600"
              >
                상태 새로고침
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                <p className="text-xs text-slate-400">DB</p>
                <p className={diag.dbConnected ? "mt-1 text-sm font-semibold text-emerald-300" : "mt-1 text-sm font-semibold text-rose-300"}>{diag.dbConnected ? "연결됨" : "확인 필요"}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                <p className="text-xs text-slate-400">전체</p>
                <p className="mt-1 text-lg font-semibold">{countText(diag.counts?.allContent)}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                <p className="text-xs text-slate-400">발행</p>
                <p className="mt-1 text-lg font-semibold text-emerald-300">{countText(diag.counts?.published)}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                <p className="text-xs text-slate-400">임시저장</p>
                <p className="mt-1 text-lg font-semibold">{countText(diag.counts?.draft)}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                <p className="text-xs text-slate-400">예약</p>
                <p className="mt-1 text-lg font-semibold text-blue-300">{countText(diag.counts?.scheduled)}</p>
                {Number(diag.counts?.scheduledReady || 0) > 0 ? <p className="mt-1 text-[11px] text-amber-300">발행 시각 도달 {countText(diag.counts?.scheduledReady)}</p> : null}
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                <p className="text-xs text-slate-400">메타 누락</p>
                <p className={Number(diag.counts?.publishedMissingMetaDescription || 0) > 0 ? "mt-1 text-lg font-semibold text-amber-300" : "mt-1 text-lg font-semibold text-emerald-300"}>{countText(diag.counts?.publishedMissingMetaDescription)}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                <p className="text-xs text-slate-400">이미지 누락</p>
                <p className={Number(diag.counts?.publishedMissingFeaturedImage || 0) > 0 ? "mt-1 text-lg font-semibold text-amber-300" : "mt-1 text-lg font-semibold text-emerald-300"}>{countText(diag.counts?.publishedMissingFeaturedImage)}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                <p className="text-xs text-slate-400">noindex 발행</p>
                <p className={Number(diag.counts?.publishedNoIndex || 0) > 0 ? "mt-1 text-lg font-semibold text-rose-300" : "mt-1 text-lg font-semibold text-emerald-300"}>{countText(diag.counts?.publishedNoIndex)}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
              <p className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs">sitemap: {feedStatusText(diag.dynamicFeeds?.sitemap)}</p>
              <p className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs">RSS: {feedStatusText(diag.dynamicFeeds?.rss)}</p>
              <p className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs">insights RSS: {feedStatusText(diag.dynamicFeeds?.insightsRss)}</p>
            </div>
          </section>
        ) : null}

        <section id="adminPromptLab" className="rounded-2xl border border-amber-900/60 bg-[#15110d] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-amber-100">프롬프트 실험실</h2>
              <p className="mt-1 text-xs text-amber-100/60">푸터 꽃 관리자 진입 전용 · 결제 없이 생년월일 기반 프롬프트 생성</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { void generatePromptLab(); }}
                disabled={promptLabLoading}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-[#1b1205] hover:bg-amber-500 disabled:opacity-50"
              >
                {promptLabLoading ? "생성 중" : "프롬프트 생성"}
              </button>
              <button
                type="button"
                onClick={() => { void copyPromptLabPrompt(); }}
                disabled={!promptLabResult?.prompt && !promptLabResult?.generatedPrompt}
                className="rounded-lg border border-amber-700 bg-amber-950/40 px-4 py-2 text-sm text-amber-100 hover:bg-amber-900/50 disabled:opacity-50"
              >
                복사
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-5">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="block text-xs text-amber-100/70">
                  점술
                  <select
                    value={promptLabForm.service}
                    onChange={(e) => updatePromptLabField("service", e.target.value as PromptLabService)}
                    className="mt-1 w-full rounded-lg border border-amber-900/70 bg-[#201811] px-3 py-2 text-sm text-amber-50"
                  >
                    {PROMPT_LAB_SERVICES.map((option) => (
                      <option key={option.key} value={option.key}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs text-amber-100/70">
                  질문 성격
                  <select
                    value={promptLabForm.domain}
                    onChange={(e) => updatePromptLabField("domain", e.target.value as PromptLabDomain)}
                    className="mt-1 w-full rounded-lg border border-amber-900/70 bg-[#201811] px-3 py-2 text-sm text-amber-50"
                  >
                    {PROMPT_LAB_DOMAINS.map((option) => (
                      <option key={option.key} value={option.key}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <p className="rounded-lg border border-amber-900/60 bg-amber-950/25 px-3 py-2 text-xs leading-5 text-amber-100/75">
                {promptLabRequirement.note}
                {promptLabRequirement.needsCoordinates ? " 위도·경도 필요." : " 위도·경도 선택."}
                {promptLabRequirement.needsExactTime ? " 정확한 생시 필요." : " 생시 미상 허용."}
              </p>
              {promptLabForm.service === "saju" ? (
                <div className="rounded-lg border border-amber-900/60 bg-[#201811] px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-amber-100">사주 질문 고급 규칙</p>
                    <label className="inline-flex items-center gap-2 text-xs text-amber-100/75">
                      <input
                        type="checkbox"
                        checked={promptLabForm.earthStorageOpeningEnabled}
                        onChange={(e) => updatePromptLabField("earthStorageOpeningEnabled", e.target.checked)}
                        className="h-4 w-4 rounded border-amber-800 bg-[#201811]"
                      />
                      토 지지 개고
                    </label>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <label className="block text-xs text-amber-100/70">
                      개고 해석 강도
                      <select
                        value={promptLabForm.earthStorageOpeningMode}
                        onChange={(e) => updatePromptLabField("earthStorageOpeningMode", e.target.value as PromptLabEarthStorageMode)}
                        className="mt-1 w-full rounded-lg border border-amber-900/70 bg-[#15110d] px-3 py-2 text-sm text-amber-50"
                      >
                        {PROMPT_LAB_EARTH_STORAGE_MODE_OPTIONS.map((option) => (
                          <option key={option.key} value={option.key}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-xs text-amber-100/70">
                      개고 적용 범위
                      <select
                        value={promptLabForm.earthStorageOpeningScope}
                        onChange={(e) => updatePromptLabField("earthStorageOpeningScope", e.target.value as PromptLabEarthStorageScope)}
                        className="mt-1 w-full rounded-lg border border-amber-900/70 bg-[#15110d] px-3 py-2 text-sm text-amber-50"
                      >
                        {PROMPT_LAB_EARTH_STORAGE_SCOPE_OPTIONS.map((option) => (
                          <option key={option.key} value={option.key}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="mt-2 grid gap-1 text-xs leading-5 text-amber-100/75">
                    {SAJU_PROMPT_ADVANCED_RULES.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                    <span>관계별 개고 강도: 충 매우 강함 · 형 강함 · 파 중간 · 해 약함</span>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="block text-xs text-amber-100/70">
                  이름
                  <input
                    type="text"
                    value={promptLabForm.name}
                    onChange={(e) => updatePromptLabField("name", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-amber-900/70 bg-[#201811] px-3 py-2 text-sm text-amber-50"
                    placeholder="선택"
                  />
                </label>
                <label className="block text-xs text-amber-100/70">
                  성별
                  <select
                    value={promptLabForm.gender}
                    onChange={(e) => updatePromptLabField("gender", e.target.value as PromptLabForm["gender"])}
                    className="mt-1 w-full rounded-lg border border-amber-900/70 bg-[#201811] px-3 py-2 text-sm text-amber-50"
                  >
                    <option value="">선택 안 함</option>
                    <option value="F">여성</option>
                    <option value="M">남성</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="block text-xs text-amber-100/70">
                  생년월일
                  <input
                    type="date"
                    value={promptLabForm.birthDate}
                    onChange={(e) => updatePromptLabField("birthDate", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-amber-900/70 bg-[#201811] px-3 py-2 text-sm text-amber-50"
                  />
                </label>
                <label className="block text-xs text-amber-100/70">
                  출생시간
                  <input
                    type="time"
                    value={promptLabForm.birthTime}
                    onChange={(e) => {
                      updatePromptLabField("birthTime", e.target.value);
                      updatePromptLabField("birthTimeUnknown", false);
                    }}
                    disabled={promptLabForm.birthTimeUnknown && !promptLabRequirement.needsExactTime}
                    className="mt-1 w-full rounded-lg border border-amber-900/70 bg-[#201811] px-3 py-2 text-sm text-amber-50 disabled:opacity-50"
                  />
                </label>
              </div>

              <label className="inline-flex items-center gap-2 text-xs text-amber-100/70">
                <input
                  type="checkbox"
                  checked={promptLabForm.birthTimeUnknown}
                  onChange={(e) => updatePromptLabField("birthTimeUnknown", e.target.checked)}
                  disabled={promptLabRequirement.needsExactTime}
                  className="h-4 w-4 rounded border-amber-800 bg-[#201811]"
                />
                출생시간 미상
              </label>

              {promptLabRequirement.supportsTimeCorrection ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="block text-xs text-amber-100/70">
                    생시 보정
                    <select
                      value={promptLabForm.timeCorrectionPolicy}
                      onChange={(e) => updatePromptLabField("timeCorrectionPolicy", e.target.value as PromptLabTimeCorrectionPolicy)}
                      className="mt-1 w-full rounded-lg border border-amber-900/70 bg-[#201811] px-3 py-2 text-sm text-amber-50"
                    >
                      {PROMPT_LAB_TIME_CORRECTION_OPTIONS.map((option) => (
                        <option key={option.key} value={option.key}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs text-amber-100/70">
                    일진 기준
                    <select
                      value={promptLabForm.dayChangePolicy}
                      onChange={(e) => updatePromptLabField("dayChangePolicy", e.target.value as PromptLabDayChangePolicy)}
                      className="mt-1 w-full rounded-lg border border-amber-900/70 bg-[#201811] px-3 py-2 text-sm text-amber-50"
                    >
                      {PROMPT_LAB_DAY_CHANGE_OPTIONS.map((option) => (
                        <option key={option.key} value={option.key}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <label className="block text-xs text-amber-100/70 sm:col-span-3">
                  출생지
                  <input
                    type="text"
                    value={promptLabForm.birthPlace}
                    onChange={(e) => updatePromptLabField("birthPlace", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-amber-900/70 bg-[#201811] px-3 py-2 text-sm text-amber-50"
                    placeholder="예: 서울"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => { void geocodePromptLabBirthPlace(); }}
                  disabled={promptLabGeocoding || !promptLabForm.birthPlace.trim()}
                  className="rounded-lg border border-amber-700 bg-amber-950/40 px-3 py-2 text-sm text-amber-100 hover:bg-amber-900/50 disabled:opacity-50 sm:col-span-3"
                >
                  {promptLabGeocoding ? "좌표 찾는 중" : "지역으로 위도·경도 자동 입력"}
                </button>
                <input
                  type="text"
                  value={promptLabForm.latitude}
                  onChange={(e) => updatePromptLabField("latitude", e.target.value)}
                  className="rounded-lg border border-amber-900/70 bg-[#201811] px-3 py-2 text-sm text-amber-50"
                  placeholder="위도"
                />
                <input
                  type="text"
                  value={promptLabForm.longitude}
                  onChange={(e) => updatePromptLabField("longitude", e.target.value)}
                  className="rounded-lg border border-amber-900/70 bg-[#201811] px-3 py-2 text-sm text-amber-50"
                  placeholder="경도"
                />
                <input
                  type="text"
                  value={promptLabForm.timezone}
                  onChange={(e) => updatePromptLabField("timezone", e.target.value)}
                  className="rounded-lg border border-amber-900/70 bg-[#201811] px-3 py-2 text-sm text-amber-50"
                  placeholder="Asia/Seoul"
                />
              </div>

              <label className="block text-xs text-amber-100/70">
                질문
                <textarea
                  value={promptLabForm.question}
                  onChange={(e) => updatePromptLabField("question", e.target.value)}
                  className="mt-1 min-h-[126px] w-full rounded-lg border border-amber-900/70 bg-[#201811] px-3 py-2 text-sm text-amber-50"
                />
              </label>
              {promptLabError ? (
                <p className="rounded-lg border border-rose-700/70 bg-rose-950/30 px-3 py-2 text-xs text-rose-200">{promptLabError}</p>
              ) : null}
            </div>

            <div className="space-y-3 lg:col-span-7">
              {promptLabResult ? (
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <p className="rounded-lg border border-amber-900/60 bg-[#201811] px-3 py-2 text-xs text-amber-100/80">점술<br /><span className="text-sm font-semibold text-amber-50">{promptLabResult.serviceLabel || promptLabResult.service || "-"}</span></p>
                  <p className="rounded-lg border border-amber-900/60 bg-[#201811] px-3 py-2 text-xs text-amber-100/80">질문 성격<br /><span className="text-sm font-semibold text-amber-50">{promptLabResult.domainLabel || promptLabResult.domain || "-"}</span></p>
                  <p className="rounded-lg border border-amber-900/60 bg-[#201811] px-3 py-2 text-xs text-amber-100/80">참조 축<br /><span className="text-sm font-semibold text-amber-50">{promptLabResult.analysisAngles?.length || 0}</span></p>
                  <p className="rounded-lg border border-amber-900/60 bg-[#201811] px-3 py-2 text-xs text-amber-100/80">결제<br /><span className="text-sm font-semibold text-emerald-300">{promptLabResult.adminFreeExecution ? "없음" : "-"}</span></p>
                </div>
              ) : null}
              {promptLabResult?.service === "saju" && promptLabResult.engineContextSummary ? (
                <div className="rounded-lg border border-amber-900/60 bg-[#201811] px-3 py-2">
                  <p className="text-xs font-semibold text-amber-100">사주 계산 근거 미리보기</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-amber-100/75 md:grid-cols-4">
                    <span>지장간 {promptLabResult.engineContextSummary.hiddenStemCount || 0}</span>
                    <span>투간 {promptLabResult.engineContextSummary.touganCount || 0}</span>
                    <span>투출 {promptLabResult.engineContextSummary.tuchulCount || 0}</span>
                    <span>개고 {promptLabResult.engineContextSummary.earthStorageOpeningCount || 0}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-amber-100/75 md:grid-cols-4">
                    <span>도충 {promptLabResult.engineContextSummary.doChung?.exists ? "있음" : "없음"}</span>
                    <span>개고 범위 {promptLabResult.engineContextSummary.promptConfig?.earthStorageOpening?.scope || "-"}</span>
                    <span>개고 강도 {promptLabResult.engineContextSummary.promptConfig?.earthStorageOpening?.mode || "-"}</span>
                    <span>개고 반영 {promptLabResult.engineContextSummary.promptConfig?.earthStorageOpening?.enabled === false ? "OFF" : "ON"}</span>
                  </div>
                  {promptLabResult.engineContextSummary.doChung?.exists ? (
                    <p className="mt-2 text-xs leading-5 text-amber-100/70">
                      {promptLabResult.engineContextSummary.doChung.repeatedBranch || "-"} {promptLabResult.engineContextSummary.doChung.repeatedCount || "-"}회 중첩 → {promptLabResult.engineContextSummary.doChung.inducedOppositeBranch || "-"} / {promptLabResult.engineContextSummary.doChung.strength || "-"}
                    </p>
                  ) : null}
                  {promptLabResult.engineContextSummary.earthStorageOpenings?.length ? (
                    <p className="mt-2 text-xs leading-5 text-amber-100/70">
                      {promptLabResult.engineContextSummary.earthStorageOpenings.slice(0, 2).map((row) => `${row.sourceBranch || "-"}-${row.triggerBranch || "-"} ${row.relationType || "-"} ${row.openingStrength || "-"}`).join(" · ")}
                    </p>
                  ) : null}
                  <p className="mt-2 text-[11px] text-amber-100/50">{promptLabResult.engineContextSummary.marker || ""}</p>
                </div>
              ) : null}
              <textarea
                readOnly
                value={promptLabResult?.prompt || promptLabResult?.generatedPrompt || ""}
                className="min-h-[432px] w-full rounded-lg border border-amber-900/70 bg-[#0f0c09] px-3 py-3 font-mono text-xs leading-5 text-amber-50"
                placeholder="생성된 프롬프트가 여기에 머무릅니다."
              />
              {promptLabResult?.recommendedFollowUpQuestions?.length ? (
                <div className="rounded-lg border border-amber-900/60 bg-[#201811] px-3 py-2">
                  <p className="text-xs font-semibold text-amber-100">후속 질문</p>
                  <ul className="mt-2 space-y-1 text-xs text-amber-100/75">
                    {promptLabResult.recommendedFollowUpQuestions.slice(0, 4).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <aside className="lg:col-span-3 rounded-2xl border border-[#2a2a3e] bg-[#13131f] p-3">
            <p className="text-xs uppercase tracking-wider text-slate-500 px-2 py-1">관리자 메뉴</p>
            <nav className="mt-2 space-y-1">
              <Link
                href="/admin/content"
                className="block rounded-lg px-3 py-2 text-sm bg-violet-900/40 border border-violet-700 text-violet-100"
              >
                콘텐츠 관리
              </Link>
              <Link
                href="/admin/insights"
                className="block rounded-lg px-3 py-2 text-sm bg-slate-800 border border-slate-700 text-slate-200"
              >
                인사이트 전용 보기
              </Link>
              <a
                href="#adminPromptLab"
                className="block rounded-lg px-3 py-2 text-sm bg-amber-950/40 border border-amber-800 text-amber-100"
              >
                프롬프트 실험실
              </a>
            </nav>
          </aside>

          <section className="lg:col-span-9 rounded-2xl border border-[#2a2a3e] bg-[#13131f] p-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              {FILTER_OPTIONS.map((option) => {
                const active = filter === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setFilter(option.key)}
                    className={`rounded-lg border px-3 py-1.5 text-sm ${active ? "border-violet-600 bg-violet-900/40 text-violet-100" : "border-slate-700 bg-slate-900 text-slate-300"}`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setQuery(searchInput.trim());
                }}
                placeholder="제목 또는 slug 검색"
                className="md:col-span-5 rounded-lg bg-[#1e1e2e] border border-[#313145] px-3 py-2 text-sm"
              />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as ContentType)}
                className="md:col-span-2 rounded-lg bg-[#1e1e2e] border border-[#313145] px-3 py-2 text-sm"
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>{option.label}</option>
                ))}
              </select>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="md:col-span-3 rounded-lg bg-[#1e1e2e] border border-[#313145] px-3 py-2 text-sm"
              >
                <option value="latest">최신순</option>
                <option value="updated">수정일순</option>
                <option value="views">조회수순</option>
              </select>
              <button
                type="button"
                onClick={() => setQuery(searchInput.trim())}
                className="md:col-span-2 rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-2 text-sm"
              >
                검색
              </button>
            </div>

            {forbidden ? (
              <div className="rounded-xl border border-rose-700/60 bg-rose-900/20 p-5">
                <p className="text-rose-200 font-semibold">{forbiddenMessage || "관리자 로그인이 필요합니다."}</p>
                <p className="text-sm text-rose-200/80 mt-1">로그인 토큰을 새로 발급받으면 콘텐츠 목록과 편집 기능을 사용할 수 있습니다.</p>
                <button
                  type="button"
                  onClick={() => router.push(`/admin/login?next=${encodeURIComponent("/admin/content")}`)}
                  className="mt-3 rounded-lg bg-rose-700 hover:bg-rose-600 px-3 py-2 text-sm"
                >
                  관리자 로그인으로 이동
                </button>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-xl border border-rose-700/60 bg-rose-900/20 p-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 text-sm text-slate-300">
                목록을 불러오는 중입니다...
              </div>
            ) : null}

            {!loading && !forbidden && items.length === 0 ? (
              <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-8 text-center">
                <p className="text-base font-semibold text-slate-200">아직 등록된 인사이트 글이 없습니다.</p>
                <p className="text-sm text-slate-400 mt-1">새 글 작성 버튼으로 첫 글을 준비해 주세요.</p>
              </div>
            ) : null}

            {!loading && !forbidden && items.length > 0 ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                  <p>
                    목록 {items.length.toLocaleString("ko-KR")} / {pagination.total.toLocaleString("ko-KR")}개
                  </p>
                  {pagination.total > items.length ? (
                    <p>최대 {ADMIN_CONTENT_LIST_MAX_PAGES * ADMIN_CONTENT_LIST_PAGE_SIZE}개까지 표시</p>
                  ) : null}
                </div>

                <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-800">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-900 text-slate-300">
                      <tr>
                        <th className="text-left px-3 py-2">제목</th>
                        <th className="text-left px-3 py-2">slug</th>
                        <th className="text-left px-3 py-2">카테고리</th>
                        <th className="text-left px-3 py-2">타입</th>
                        <th className="text-left px-3 py-2">상태</th>
                        <th className="text-right px-3 py-2">조회수</th>
                        <th className="text-left px-3 py-2">작성일</th>
                        <th className="text-left px-3 py-2">수정일</th>
                        <th className="text-left px-3 py-2">발행일</th>
                        <th className="text-left px-3 py-2">액션</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item._id} className="border-t border-slate-800">
                          <td className="px-3 py-2 max-w-[220px] truncate">{item.title || "(제목 없음)"}</td>
                          <td className="px-3 py-2 text-slate-400">/{item.slug}</td>
                          <td className="px-3 py-2">{item.category || "-"}</td>
                          <td className="px-3 py-2 text-slate-300">{item.type || "fortune_insight"}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs ${statusBadgeClass(item.status)}`}>
                              {statusLabel(item.status)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">{Number(item.viewCount || 0).toLocaleString("ko-KR")}</td>
                          <td className="px-3 py-2 text-slate-400">{formatDate(item.createdAt)}</td>
                          <td className="px-3 py-2 text-slate-400">{formatDate(item.updatedAt)}</td>
                          <td className="px-3 py-2 text-slate-400">{formatDate(item.publishedAt)}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1.5">
                              <button type="button" className="rounded bg-slate-700 hover:bg-slate-600 px-2 py-1 text-xs" onClick={() => router.push(`/admin/insights/edit?id=${encodeURIComponent(item._id)}`)}>수정</button>
                              <button type="button" className="rounded bg-blue-700 hover:bg-blue-600 px-2 py-1 text-xs" onClick={() => window.open(`/insights/${item.slug}`, "_blank", "noopener,noreferrer")}>미리보기</button>
                              <button type="button" disabled={busyId === item._id || item.status === "draft"} className="rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 px-2 py-1 text-xs" onClick={() => updateStatus(item._id, "draft")}>임시저장</button>
                              <button type="button" disabled={busyId === item._id || item.status === "published"} className="rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 px-2 py-1 text-xs" onClick={() => updateStatus(item._id, "published")}>발행</button>
                              <button type="button" disabled={busyId === item._id || item.status === "trash"} className="rounded bg-rose-700 hover:bg-rose-600 disabled:opacity-50 px-2 py-1 text-xs" onClick={() => moveToTrash(item._id)}>보관</button>
                              <button type="button" disabled={busyId === item._id} className="rounded bg-blue-700 hover:bg-blue-600 disabled:opacity-50 px-2 py-1 text-xs" onClick={() => checkPublication(item._id)}>공개확인</button>
                              <button type="button" disabled={busyId === item._id} className="rounded bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 px-2 py-1 text-xs" onClick={() => purgeContentCache(item._id)}>캐시갱신</button>
                            </div>
                            {publicationChecks[item._id] ? (
                              <p className={`mt-1 text-[11px] ${publicationChecks[item._id].ok ? "text-emerald-300" : "text-amber-300"}`}>
                                공개 {publicationChecks[item._id].ok ? "OK" : "확인 필요"} · API {publicationChecks[item._id].apiStatus?.status || "-"} · 페이지 {publicationChecks[item._id].pageStatus?.status || "-"} · 캐시 {publicationChecks[item._id].purgeStatus || "-"}
                                <br />
                                메타 {publicationChecks[item._id].pageMeta?.hasTitle && publicationChecks[item._id].pageMeta?.hasDescription ? "OK" : "확인 필요"} · canonical {publicationChecks[item._id].pageMeta?.canonicalMatches ? "OK" : "확인 필요"} · sitemap {publicationChecks[item._id].feedCoverage?.sitemap?.containsSlug ? "포함" : "미포함"} · RSS {publicationChecks[item._id].feedCoverage?.rss?.containsSlug ? "포함" : "미포함"}
                              </p>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden space-y-3">
                  {items.map((item) => (
                    <article key={item._id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm leading-5">{item.title || "(제목 없음)"}</h3>
                        <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] ${statusBadgeClass(item.status)}`}>
                          {statusLabel(item.status)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 break-all">/{item.slug}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                        <p>카테고리: {item.category || "-"}</p>
                        <p>타입: {item.type || "fortune_insight"}</p>
                        <p>조회수: {Number(item.viewCount || 0).toLocaleString("ko-KR")}</p>
                        <p>작성일: {formatDate(item.createdAt)}</p>
                        <p>수정일: {formatDate(item.updatedAt)}</p>
                        <p className="col-span-2">발행일: {formatDate(item.publishedAt)}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" className="rounded bg-slate-700 hover:bg-slate-600 px-2 py-1 text-xs" onClick={() => router.push(`/admin/insights/edit?id=${encodeURIComponent(item._id)}`)}>수정</button>
                        <button type="button" className="rounded bg-blue-700 hover:bg-blue-600 px-2 py-1 text-xs" onClick={() => window.open(`/insights/${item.slug}`, "_blank", "noopener,noreferrer")}>미리보기</button>
                        <button type="button" disabled={busyId === item._id || item.status === "draft"} className="rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 px-2 py-1 text-xs" onClick={() => updateStatus(item._id, "draft")}>임시저장</button>
                        <button type="button" disabled={busyId === item._id || item.status === "published"} className="rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 px-2 py-1 text-xs" onClick={() => updateStatus(item._id, "published")}>발행</button>
                        <button type="button" disabled={busyId === item._id || item.status === "trash"} className="rounded bg-rose-700 hover:bg-rose-600 disabled:opacity-50 px-2 py-1 text-xs" onClick={() => moveToTrash(item._id)}>보관</button>
                        <button type="button" disabled={busyId === item._id} className="rounded bg-blue-700 hover:bg-blue-600 disabled:opacity-50 px-2 py-1 text-xs" onClick={() => checkPublication(item._id)}>공개확인</button>
                        <button type="button" disabled={busyId === item._id} className="rounded bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 px-2 py-1 text-xs" onClick={() => purgeContentCache(item._id)}>캐시갱신</button>
                      </div>
                      {publicationChecks[item._id] ? (
                        <p className={`text-[11px] ${publicationChecks[item._id].ok ? "text-emerald-300" : "text-amber-300"}`}>
                          공개 {publicationChecks[item._id].ok ? "OK" : "확인 필요"} · API {publicationChecks[item._id].apiStatus?.status || "-"} · 페이지 {publicationChecks[item._id].pageStatus?.status || "-"} · 캐시 {publicationChecks[item._id].purgeStatus || "-"}
                          <br />
                          메타 {publicationChecks[item._id].pageMeta?.hasTitle && publicationChecks[item._id].pageMeta?.hasDescription ? "OK" : "확인 필요"} · canonical {publicationChecks[item._id].pageMeta?.canonicalMatches ? "OK" : "확인 필요"} · sitemap {publicationChecks[item._id].feedCoverage?.sitemap?.containsSlug ? "포함" : "미포함"} · RSS {publicationChecks[item._id].feedCoverage?.rss?.containsSlug ? "포함" : "미포함"}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              </>
            ) : null}
          </section>
        </section>
      </div>
    </main>
  );
}

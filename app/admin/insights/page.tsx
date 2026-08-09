"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
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
type PromptLabCalendarType = "solar" | "lunar" | "lunar_leap";

type PromptLabForm = {
  service: PromptLabService;
  domain: PromptLabDomain;
  name: string;
  gender: "" | "M" | "F";
  birthDate: string;
  calendarType: PromptLabCalendarType;
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

type AdminInsightsCopy = {
  headerTitle: string;
  headerDescription: string;
  newPost: string;
  opsTitle: string;
  opsDescription: string;
  refreshStatus: string;
  dbLabel: string;
  connected: string;
  needsCheck: string;
  total: string;
  published: string;
  draft: string;
  scheduled: string;
  scheduledReadyPrefix: string;
  missingMeta: string;
  missingImage: string;
  noIndexPublished: string;
  sitemapLabel: string;
  rssLabel: string;
  insightsRssLabel: string;
  feedUnchecked: string;
  feedError: string;
  feedDynamic: string;
  feedStatic: string;
  promptLabTitle: string;
  promptLabDescription: string;
  generating: string;
  generatePrompt: string;
  copy: string;
  serviceLabel: string;
  domainLabel: string;
  advancedRulesTitle: string;
  earthStorageEnabledLabel: string;
  earthStorageModeLabel: string;
  earthStorageScopeLabel: string;
  nameLabel: string;
  namePlaceholder: string;
  genderLabel: string;
  genderNone: string;
  genderFemale: string;
  genderMale: string;
  birthDateLabel: string;
  calendarLabel: string;
  solar: string;
  lunar: string;
  lunarLeap: string;
  birthTimeLabel: string;
  unknownBirthTime: string;
  timeCorrectionLabel: string;
  dayChangeLabel: string;
  birthPlaceLabel: string;
  birthPlacePlaceholder: string;
  geocoding: string;
  geocode: string;
  latitudePlaceholder: string;
  longitudePlaceholder: string;
  questionLabel: string;
  resultService: string;
  resultDomain: string;
  resultAngles: string;
  resultPayment: string;
  none: string;
  sajuPreviewTitle: string;
  hiddenStem: string;
  tougan: string;
  tuchul: string;
  earthOpening: string;
  dochung: string;
  earthScope: string;
  earthMode: string;
  earthApplied: string;
  overlapUnit: string;
  followUp: string;
  generatedPromptPlaceholder: string;
  menuTitle: string;
  contentManagement: string;
  insightView: string;
  reviewManagement: string;
  promptLabNav: string;
  searchPlaceholder: string;
  search: string;
  forbiddenHint: string;
  adminLoginButton: string;
  loadingList: string;
  emptyTitle: string;
  emptyBody: string;
  listLabel: string;
  itemCountSuffix: string;
  maxDisplayPrefix: string;
  maxDisplaySuffix: string;
  tableTitle: string;
  tableSlug: string;
  tableCategory: string;
  tableType: string;
  tableStatus: string;
  tableViews: string;
  tableCreated: string;
  tableUpdated: string;
  tablePublished: string;
  tableActions: string;
  noTitle: string;
  edit: string;
  preview: string;
  saveDraft: string;
  publish: string;
  archive: string;
  publicationCheck: string;
  cacheRefresh: string;
  publicationPublic: string;
  publicationApi: string;
  publicationPage: string;
  publicationCache: string;
  publicationMeta: string;
  publicationCanonical: string;
  publicationSitemap: string;
  publicationRss: string;
  publicationOk: string;
  publicationNeedsCheck: string;
  included: string;
  notIncluded: string;
  mobileCategory: string;
  mobileType: string;
  mobileViews: string;
  mobileCreated: string;
  mobileUpdated: string;
  mobilePublished: string;
  adminLoginRequired: string;
  adminPermissionDenied: string;
  coordinateRequired: string;
  coordinateOptional: string;
  exactTimeRequired: string;
  unknownTimeAllowed: string;
  relationStrength: string;
  defaultQuestion: string;
  filters: Record<FilterKey, string>;
  contentTypes: Record<ContentType, string>;
  sortOptions: Record<SortKey, string>;
  statuses: Record<InsightStatus, string>;
  promptServices: Record<PromptLabService, string>;
  promptDomains: Record<PromptLabDomain, string>;
  timeCorrectionOptions: Record<PromptLabTimeCorrectionPolicy, string>;
  dayChangeOptions: Record<PromptLabDayChangePolicy, string>;
  earthStorageModeOptions: Record<PromptLabEarthStorageMode, string>;
  earthStorageScopeOptions: Record<PromptLabEarthStorageScope, string>;
  serviceNotes: Record<PromptLabService, string>;
  sajuAdvancedRules: string[];
  errors: {
    listLoadFailed: string;
    listNetworkFailed: string;
    statusUpdateFailed: string;
    trashMoveFailed: string;
    publicationCheckFailed: string;
    cachePurgeFailed: string;
    birthPlaceRequired: string;
    geocodeFailed: string;
    geocodeNetworkFailed: string;
    birthDateRequired: string;
    exactBirthTimeRequired: string;
    coordinatesRequired: string;
    questionTooShort: string;
    promptGenerateFailed: string;
    promptNetworkFailed: string;
  };
};

const ADMIN_INSIGHTS_COPY_KO: AdminInsightsCopy = {
  headerTitle: "관리자 콘텐츠 센터",
  headerDescription: "사이트 전체 글과 콘텐츠 목록을 관리합니다.",
  newPost: "새 글 작성",
  opsTitle: "콘텐츠 운영 상태",
  opsDescription: "발행, 예약, SEO, sitemap/RSS 반영 상태",
  refreshStatus: "상태 새로고침",
  dbLabel: "DB",
  connected: "연결됨",
  needsCheck: "확인 필요",
  total: "전체",
  published: "발행",
  draft: "임시저장",
  scheduled: "예약",
  scheduledReadyPrefix: "발행 시각 도달",
  missingMeta: "메타 누락",
  missingImage: "이미지 누락",
  noIndexPublished: "noindex 발행",
  sitemapLabel: "sitemap",
  rssLabel: "RSS",
  insightsRssLabel: "insights RSS",
  feedUnchecked: "미확인",
  feedError: "오류",
  feedDynamic: "동적 반영",
  feedStatic: "정적 응답",
  promptLabTitle: "프롬프트 실험실",
  promptLabDescription: "푸터 꽃 관리자 진입 전용 · 결제 없이 생년월일 기반 프롬프트 생성",
  generating: "생성 중",
  generatePrompt: "프롬프트 생성",
  copy: "복사",
  serviceLabel: "점술",
  domainLabel: "질문 성격",
  advancedRulesTitle: "사주 질문 고급 규칙",
  earthStorageEnabledLabel: "토 지지 개고",
  earthStorageModeLabel: "개고 해석 강도",
  earthStorageScopeLabel: "개고 적용 범위",
  nameLabel: "이름",
  namePlaceholder: "선택",
  genderLabel: "성별",
  genderNone: "선택 안 함",
  genderFemale: "여성",
  genderMale: "남성",
  birthDateLabel: "생년월일",
  calendarLabel: "양력/음력",
  solar: "양력",
  lunar: "음력",
  lunarLeap: "윤달",
  birthTimeLabel: "출생시간",
  unknownBirthTime: "출생시간 미상",
  timeCorrectionLabel: "생시 보정",
  dayChangeLabel: "일진 기준",
  birthPlaceLabel: "출생지",
  birthPlacePlaceholder: "예: 서울",
  geocoding: "좌표 찾는 중",
  geocode: "지역으로 위도·경도 자동 입력",
  latitudePlaceholder: "위도",
  longitudePlaceholder: "경도",
  questionLabel: "질문",
  resultService: "점술",
  resultDomain: "질문 성격",
  resultAngles: "참조 축",
  resultPayment: "결제",
  none: "없음",
  sajuPreviewTitle: "사주 계산 근거 미리보기",
  hiddenStem: "지장간",
  tougan: "투간",
  tuchul: "투출",
  earthOpening: "개고",
  dochung: "도충",
  earthScope: "개고 범위",
  earthMode: "개고 강도",
  earthApplied: "개고 반영",
  overlapUnit: "회 중첩",
  followUp: "후속 질문",
  generatedPromptPlaceholder: "생성된 프롬프트가 여기에 머무릅니다.",
  menuTitle: "관리자 메뉴",
  contentManagement: "콘텐츠 관리",
  insightView: "인사이트 전용 보기",
  reviewManagement: "리뷰 관리",
  promptLabNav: "프롬프트 실험실",
  searchPlaceholder: "제목 또는 slug 검색",
  search: "검색",
  forbiddenHint: "로그인 토큰을 새로 발급받으면 콘텐츠 목록과 편집 기능을 사용할 수 있습니다.",
  adminLoginButton: "관리자 로그인으로 이동",
  loadingList: "목록을 불러오는 중입니다...",
  emptyTitle: "아직 등록된 인사이트 글이 없습니다.",
  emptyBody: "새 글 작성 버튼으로 첫 글을 준비해 주세요.",
  listLabel: "목록",
  itemCountSuffix: "개",
  maxDisplayPrefix: "최대",
  maxDisplaySuffix: "개까지 표시",
  tableTitle: "제목",
  tableSlug: "slug",
  tableCategory: "카테고리",
  tableType: "타입",
  tableStatus: "상태",
  tableViews: "조회수",
  tableCreated: "작성일",
  tableUpdated: "수정일",
  tablePublished: "발행일",
  tableActions: "액션",
  noTitle: "(제목 없음)",
  edit: "수정",
  preview: "미리보기",
  saveDraft: "임시저장",
  publish: "발행",
  archive: "보관",
  publicationCheck: "공개확인",
  cacheRefresh: "캐시갱신",
  publicationPublic: "공개",
  publicationApi: "API",
  publicationPage: "페이지",
  publicationCache: "캐시",
  publicationMeta: "메타",
  publicationCanonical: "canonical",
  publicationSitemap: "sitemap",
  publicationRss: "RSS",
  publicationOk: "OK",
  publicationNeedsCheck: "확인 필요",
  included: "포함",
  notIncluded: "미포함",
  mobileCategory: "카테고리",
  mobileType: "타입",
  mobileViews: "조회수",
  mobileCreated: "작성일",
  mobileUpdated: "수정일",
  mobilePublished: "발행일",
  adminLoginRequired: "관리자 로그인이 필요합니다. 다시 로그인해 주세요.",
  adminPermissionDenied: "관리자 권한이 확인되지 않았습니다. 관리자 계정으로 다시 로그인해 주세요.",
  coordinateRequired: "위도·경도 필요.",
  coordinateOptional: "위도·경도 선택.",
  exactTimeRequired: "정확한 생시 필요.",
  unknownTimeAllowed: "생시 미상 허용.",
  relationStrength: "관계별 개고 강도: 충 매우 강함 · 형 강함 · 파 중간 · 해 약함",
  defaultQuestion: "올해 제 운의 흐름에서 가장 강하게 열리는 문과 조심해야 할 기운은 무엇인가요?",
  filters: {
    all: "전체",
    draft: "임시저장",
    scheduled: "예약됨",
    published: "발행됨",
    archived: "보관",
    private: "비공개(레거시)",
    trash: "휴지통(레거시)",
  },
  contentTypes: {
    all: "전체 타입",
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
  sortOptions: {
    latest: "최신순",
    updated: "수정일순",
    views: "조회수순",
  },
  statuses: {
    draft: "임시저장",
    scheduled: "예약됨",
    published: "발행됨",
    archived: "보관됨",
    private: "비공개",
    trash: "휴지통",
  },
  promptServices: {
    saju: "사주",
    tarot: "타로",
    sukuyo: "숙요",
    astrology: "점성술",
    ziwei: "자미두수",
    vedic: "베다점",
  },
  promptDomains: {
    general: "전체 흐름",
    love: "연애/관계",
    compatibility: "궁합",
    career: "직업/진로",
    money: "재물/사업",
    health: "건강/리듬",
    life_direction: "인생 흐름",
    personality: "기질/성향",
  },
  timeCorrectionOptions: {
    auto: "자동 보정",
    clock: "표준시",
    local_mean: "평균태양시",
    true_solar: "진태양시",
  },
  dayChangeOptions: {
    auto: "자동 야자시",
    midnight: "자정 기준",
    late_zi_next_day: "야자시 다음날",
    true_solar_zi_next_day: "진태양시 야자시",
  },
  earthStorageModeOptions: {
    conservative: "보수적",
    standard: "표준",
    active: "적극적",
  },
  earthStorageScopeOptions: {
    natal: "원국 내부 형충해파",
    natal_daewoon: "원국 + 대운",
    natal_sewoon: "원국 + 세운",
    natal_daewoon_sewoon: "원국 + 대운 + 세운",
    all: "월운/일진까지 포함",
  },
  serviceNotes: {
    saju: "사주는 지역 좌표가 있으면 실제 사주 분석과 같은 진태양시/야자시 보정으로 명식이 열립니다.",
    tarot: "타로는 질문의 결을 중심으로 펼쳐집니다.",
    sukuyo: "숙요는 생년월일의 달빛 결을 중심으로 살핍니다.",
    astrology: "점성술은 ASC, 하우스, MC가 위도·경도와 정확한 생시에 기대어 솟아납니다.",
    ziwei: "자미두수는 명궁과 신궁을 위해 생시가 필요합니다.",
    vedic: "베다점은 라그나와 나크샤트라가 위도·경도와 정확한 생시에 기대어 떠오릅니다.",
  },
  sajuAdvancedRules: [
    "월지 지장간을 가장 무겁게 잡고 일지 지장간은 관계와 내면 반응에 연결",
    "모든 지장간은 일간 기준 십성으로 변환",
    "원국 천간에 드러난 지장간은 투간으로 분리",
    "대운·세운 천간에 드러난 지장간은 투출로 분리",
    "도충은 같은 지지 3개 이상 중첩과 반대 충 유도 구조로만 반영",
    "辰·戌·丑·未 토 지지는 형충해파 자극 시 개고로 열린 지장간까지 반영",
  ],
  errors: {
    listLoadFailed: "목록을 불러오지 못했습니다.",
    listNetworkFailed: "네트워크 오류로 목록을 불러오지 못했습니다.",
    statusUpdateFailed: "상태 변경에 실패했습니다.",
    trashMoveFailed: "휴지통 이동에 실패했습니다.",
    publicationCheckFailed: "공개 상태 확인에 실패했습니다.",
    cachePurgeFailed: "캐시 갱신 요청에 실패했습니다.",
    birthPlaceRequired: "출생지를 먼저 입력해 주세요.",
    geocodeFailed: "지역 좌표를 찾지 못했습니다.",
    geocodeNetworkFailed: "지역 좌표를 불러오지 못했습니다.",
    birthDateRequired: "생년월일을 입력해 주세요.",
    exactBirthTimeRequired: "선택한 기능은 정확한 생시가 필요합니다.",
    coordinatesRequired: "선택한 기능은 출생지 좌표가 필요합니다. 지역을 입력한 뒤 좌표를 자동 입력해 주세요.",
    questionTooShort: "질문을 조금 더 구체적으로 입력해 주세요.",
    promptGenerateFailed: "프롬프트 생성에 실패했습니다.",
    promptNetworkFailed: "네트워크 오류로 프롬프트를 만들지 못했습니다.",
  },
};

const ADMIN_INSIGHTS_COPY_EN: AdminInsightsCopy = {
  ...ADMIN_INSIGHTS_COPY_KO,
  headerTitle: "Admin Content Center",
  headerDescription: "Manage all site articles and content entries.",
  newPost: "New Post",
  opsTitle: "Content Operations Status",
  opsDescription: "Publication, scheduling, SEO, sitemap, and RSS reflection status",
  refreshStatus: "Refresh Status",
  connected: "Connected",
  needsCheck: "Needs check",
  total: "Total",
  published: "Published",
  draft: "Drafts",
  scheduled: "Scheduled",
  scheduledReadyPrefix: "Ready to publish",
  missingMeta: "Missing meta",
  missingImage: "Missing image",
  noIndexPublished: "Published noindex",
  feedUnchecked: "Unchecked",
  feedError: "Error",
  feedDynamic: "Dynamic",
  feedStatic: "Static",
  promptLabTitle: "Prompt Lab",
  promptLabDescription: "Footer flower admin only · Generate birth-data prompts without payment",
  generating: "Generating",
  generatePrompt: "Generate Prompt",
  copy: "Copy",
  serviceLabel: "Service",
  domainLabel: "Question Type",
  advancedRulesTitle: "Advanced Saju Prompt Rules",
  earthStorageEnabledLabel: "Open earth branches",
  earthStorageModeLabel: "Opening intensity",
  earthStorageScopeLabel: "Opening scope",
  nameLabel: "Name",
  namePlaceholder: "Optional",
  genderLabel: "Gender",
  genderNone: "Not selected",
  genderFemale: "Female",
  genderMale: "Male",
  birthDateLabel: "Birth date",
  calendarLabel: "Calendar",
  solar: "Solar",
  lunar: "Lunar",
  lunarLeap: "Leap month",
  birthTimeLabel: "Birth time",
  unknownBirthTime: "Birth time unknown",
  timeCorrectionLabel: "Time correction",
  dayChangeLabel: "Day boundary",
  birthPlaceLabel: "Birth place",
  birthPlacePlaceholder: "Example: Seoul",
  geocoding: "Finding coordinates",
  geocode: "Auto-fill latitude and longitude",
  latitudePlaceholder: "Latitude",
  longitudePlaceholder: "Longitude",
  questionLabel: "Question",
  resultService: "Service",
  resultDomain: "Question Type",
  resultAngles: "Angles",
  resultPayment: "Payment",
  none: "None",
  sajuPreviewTitle: "Saju calculation evidence preview",
  hiddenStem: "Hidden stems",
  tougan: "Heavenly exposure",
  tuchul: "Luck exposure",
  earthOpening: "Earth opening",
  dochung: "Do-chung",
  earthScope: "Opening scope",
  earthMode: "Opening mode",
  earthApplied: "Opening applied",
  overlapUnit: "overlaps",
  followUp: "Follow-up Questions",
  generatedPromptPlaceholder: "The generated prompt will appear here.",
  menuTitle: "Admin Menu",
  contentManagement: "Content Management",
  insightView: "Insights View",
  reviewManagement: "Review Management",
  promptLabNav: "Prompt Lab",
  searchPlaceholder: "Search title or slug",
  search: "Search",
  forbiddenHint: "Renew the login token to use content list and editing features.",
  adminLoginButton: "Go to Admin Login",
  loadingList: "Loading the list...",
  emptyTitle: "No insight posts have been registered yet.",
  emptyBody: "Use the new post button to prepare the first article.",
  listLabel: "List",
  itemCountSuffix: "items",
  maxDisplayPrefix: "Showing up to",
  maxDisplaySuffix: "items",
  tableTitle: "Title",
  tableCategory: "Category",
  tableType: "Type",
  tableStatus: "Status",
  tableViews: "Views",
  tableCreated: "Created",
  tableUpdated: "Updated",
  tablePublished: "Published",
  tableActions: "Actions",
  noTitle: "(Untitled)",
  edit: "Edit",
  preview: "Preview",
  saveDraft: "Save Draft",
  publish: "Publish",
  archive: "Archive",
  publicationCheck: "Check Public",
  cacheRefresh: "Refresh Cache",
  publicationPublic: "Public",
  publicationPage: "Page",
  publicationCache: "Cache",
  publicationMeta: "Meta",
  publicationNeedsCheck: "Needs check",
  included: "Included",
  notIncluded: "Missing",
  mobileCategory: "Category",
  mobileType: "Type",
  mobileViews: "Views",
  mobileCreated: "Created",
  mobileUpdated: "Updated",
  mobilePublished: "Published",
  adminLoginRequired: "Admin login is required. Please sign in again.",
  adminPermissionDenied: "Admin permission could not be verified. Please sign in with an admin account again.",
  coordinateRequired: "Latitude and longitude required.",
  coordinateOptional: "Latitude and longitude optional.",
  exactTimeRequired: "Exact birth time required.",
  unknownTimeAllowed: "Unknown birth time allowed.",
  relationStrength: "Earth-opening strength by relation: clash very strong · penalty strong · break medium · harm light",
  defaultQuestion: "In this year's flow of fortune, which gate opens most strongly for me, and what energy should I handle with care?",
  filters: {
    all: "All",
    draft: "Draft",
    scheduled: "Scheduled",
    published: "Published",
    archived: "Archived",
    private: "Private (legacy)",
    trash: "Trash (legacy)",
  },
  contentTypes: {
    all: "All types",
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
  sortOptions: {
    latest: "Newest",
    updated: "Recently updated",
    views: "Most viewed",
  },
  statuses: {
    draft: "Draft",
    scheduled: "Scheduled",
    published: "Published",
    archived: "Archived",
    private: "Private",
    trash: "Trash",
  },
  promptServices: {
    saju: "Saju",
    tarot: "Tarot",
    sukuyo: "Sukuyo",
    astrology: "Astrology",
    ziwei: "Zi Wei",
    vedic: "Vedic",
  },
  promptDomains: {
    general: "Overall Flow",
    love: "Love / Relationship",
    compatibility: "Compatibility",
    career: "Career",
    money: "Money / Business",
    health: "Health / Rhythm",
    life_direction: "Life Direction",
    personality: "Temperament",
  },
  timeCorrectionOptions: {
    auto: "Auto correction",
    clock: "Clock time",
    local_mean: "Local mean time",
    true_solar: "True solar time",
  },
  dayChangeOptions: {
    auto: "Auto late-zi",
    midnight: "Midnight",
    late_zi_next_day: "Late-zi next day",
    true_solar_zi_next_day: "True-solar late-zi",
  },
  earthStorageModeOptions: {
    conservative: "Conservative",
    standard: "Standard",
    active: "Active",
  },
  earthStorageScopeOptions: {
    natal: "Natal branch relations",
    natal_daewoon: "Natal + Daewoon",
    natal_sewoon: "Natal + annual luck",
    natal_daewoon_sewoon: "Natal + Daewoon + annual luck",
    all: "Include monthly and daily luck",
  },
  serviceNotes: {
    saju: "With regional coordinates, Saju opens the chart with true solar time and late-zi correction like a full reading.",
    tarot: "Tarot unfolds around the texture of the question.",
    sukuyo: "Sukuyo reads the moonlit pattern of the birth date.",
    astrology: "Astrology relies on latitude, longitude, and exact birth time for ASC, houses, and MC.",
    ziwei: "Zi Wei needs birth time to open the life and body palaces.",
    vedic: "Vedic astrology relies on latitude, longitude, and exact birth time for lagna and nakshatra.",
  },
  sajuAdvancedRules: [
    "Weight the month branch hidden stems most heavily and connect the day branch hidden stems to relationship and inner response.",
    "Convert all hidden stems into ten-god relationships from the day master.",
    "Separate hidden stems revealed in natal heavenly stems as heavenly exposure.",
    "Separate hidden stems revealed in Daewoon and annual luck heavenly stems as luck exposure.",
    "Apply do-chung only for three or more repeated branches that induce the opposing clash.",
    "For Chen, Xu, Chou, and Wei earth branches, include hidden stems opened by penalty, clash, harm, or break stimulation.",
  ],
  errors: {
    listLoadFailed: "Could not load the list.",
    listNetworkFailed: "A network error prevented loading the list.",
    statusUpdateFailed: "Could not update the status.",
    trashMoveFailed: "Could not move the item to trash.",
    publicationCheckFailed: "Could not check public status.",
    cachePurgeFailed: "Could not request cache refresh.",
    birthPlaceRequired: "Enter the birth place first.",
    geocodeFailed: "Could not find coordinates for that location.",
    geocodeNetworkFailed: "Could not load location coordinates.",
    birthDateRequired: "Enter the birth date.",
    exactBirthTimeRequired: "The selected service requires an exact birth time.",
    coordinatesRequired: "The selected service requires birth-place coordinates. Enter a place and auto-fill the coordinates.",
    questionTooShort: "Please make the question a little more specific.",
    promptGenerateFailed: "Could not generate the prompt.",
    promptNetworkFailed: "A network error prevented prompt generation.",
  },
};

const ADMIN_INSIGHTS_COPY_JA: AdminInsightsCopy = {
  ...ADMIN_INSIGHTS_COPY_EN,
  headerTitle: "管理者コンテンツセンター",
  headerDescription: "サイト全体の記事とコンテンツ一覧を管理します。",
  newPost: "新規作成",
  opsTitle: "コンテンツ運用状態",
  opsDescription: "公開、予約、SEO、sitemap/RSS 反映状態",
  refreshStatus: "状態を更新",
  connected: "接続済み",
  needsCheck: "確認が必要",
  total: "全体",
  published: "公開",
  draft: "下書き",
  scheduled: "予約",
  scheduledReadyPrefix: "公開時刻到達",
  missingMeta: "メタ不足",
  missingImage: "画像不足",
  noIndexPublished: "noindex 公開",
  promptLabTitle: "プロンプト実験室",
  promptLabDescription: "フッター花管理者専用 · 決済なしで生年月日ベースのプロンプトを生成",
  generating: "生成中",
  generatePrompt: "プロンプト生成",
  copy: "コピー",
  serviceLabel: "占術",
  domainLabel: "質問の性格",
  advancedRulesTitle: "四柱推命質問の高度ルール",
  earthStorageEnabledLabel: "土支の開庫",
  earthStorageModeLabel: "開庫の強度",
  earthStorageScopeLabel: "開庫の範囲",
  nameLabel: "名前",
  namePlaceholder: "任意",
  genderLabel: "性別",
  genderNone: "選択しない",
  genderFemale: "女性",
  genderMale: "男性",
  birthDateLabel: "生年月日",
  calendarLabel: "暦",
  solar: "新暦",
  lunar: "旧暦",
  lunarLeap: "閏月",
  birthTimeLabel: "出生時刻",
  unknownBirthTime: "出生時刻不明",
  timeCorrectionLabel: "時刻補正",
  dayChangeLabel: "日替わり基準",
  birthPlaceLabel: "出生地",
  birthPlacePlaceholder: "例: ソウル",
  geocoding: "座標検索中",
  geocode: "地域から緯度・経度を自動入力",
  latitudePlaceholder: "緯度",
  longitudePlaceholder: "経度",
  questionLabel: "質問",
  generatedPromptPlaceholder: "生成されたプロンプトがここに表示されます。",
  menuTitle: "管理者メニュー",
  contentManagement: "コンテンツ管理",
  insightView: "インサイト専用表示",
  reviewManagement: "レビュー管理",
  promptLabNav: "プロンプト実験室",
  searchPlaceholder: "タイトルまたは slug 検索",
  search: "検索",
  forbiddenHint: "ログイントークンを再発行すると、一覧と編集機能を利用できます。",
  adminLoginButton: "管理者ログインへ",
  loadingList: "一覧を読み込んでいます...",
  emptyTitle: "登録されたインサイト記事はまだありません。",
  emptyBody: "新規作成ボタンで最初の記事を準備してください。",
  edit: "編集",
  preview: "プレビュー",
  saveDraft: "下書き",
  publish: "公開",
  archive: "保管",
  publicationCheck: "公開確認",
  cacheRefresh: "キャッシュ更新",
  adminLoginRequired: "管理者ログインが必要です。もう一度ログインしてください。",
  adminPermissionDenied: "管理者権限を確認できませんでした。管理者アカウントでもう一度ログインしてください。",
  defaultQuestion: "今年の運の流れで、私に最も強く開く扉と注意すべき気は何ですか。",
};

const ADMIN_INSIGHTS_COPY_ZH_CN: AdminInsightsCopy = {
  ...ADMIN_INSIGHTS_COPY_EN,
  headerTitle: "管理员内容中心",
  headerDescription: "管理全站文章与内容列表。",
  newPost: "新建文章",
  opsTitle: "内容运营状态",
  opsDescription: "发布、预约、SEO、sitemap/RSS 反映状态",
  refreshStatus: "刷新状态",
  connected: "已连接",
  needsCheck: "需要确认",
  total: "全部",
  published: "已发布",
  draft: "草稿",
  scheduled: "预约",
  scheduledReadyPrefix: "已到发布时间",
  missingMeta: "缺少 meta",
  missingImage: "缺少图片",
  noIndexPublished: "noindex 发布",
  promptLabTitle: "提示词实验室",
  promptLabDescription: "仅供页脚花朵管理员入口使用 · 无需付款即可生成基于生日的提示词",
  generating: "生成中",
  generatePrompt: "生成提示词",
  copy: "复制",
  serviceLabel: "占术",
  domainLabel: "问题类型",
  advancedRulesTitle: "四柱问题高级规则",
  earthStorageEnabledLabel: "土支开库",
  earthStorageModeLabel: "开库强度",
  earthStorageScopeLabel: "开库范围",
  nameLabel: "姓名",
  namePlaceholder: "可选",
  genderLabel: "性别",
  genderNone: "不选择",
  genderFemale: "女性",
  genderMale: "男性",
  birthDateLabel: "出生日期",
  calendarLabel: "历法",
  solar: "阳历",
  lunar: "阴历",
  lunarLeap: "闰月",
  birthTimeLabel: "出生时间",
  unknownBirthTime: "出生时间不详",
  timeCorrectionLabel: "时间校正",
  dayChangeLabel: "换日基准",
  birthPlaceLabel: "出生地",
  birthPlacePlaceholder: "例：首尔",
  geocoding: "正在查找坐标",
  geocode: "按地区自动填入经纬度",
  latitudePlaceholder: "纬度",
  longitudePlaceholder: "经度",
  questionLabel: "问题",
  generatedPromptPlaceholder: "生成的提示词会显示在这里。",
  menuTitle: "管理员菜单",
  contentManagement: "内容管理",
  insightView: "仅看洞察",
  reviewManagement: "评价管理",
  promptLabNav: "提示词实验室",
  searchPlaceholder: "搜索标题或 slug",
  search: "搜索",
  forbiddenHint: "重新获取登录令牌后，可使用内容列表与编辑功能。",
  adminLoginButton: "前往管理员登录",
  loadingList: "正在加载列表...",
  emptyTitle: "还没有登记洞察文章。",
  emptyBody: "请用新建文章按钮准备第一篇文章。",
  edit: "编辑",
  preview: "预览",
  saveDraft: "保存草稿",
  publish: "发布",
  archive: "归档",
  publicationCheck: "公开确认",
  cacheRefresh: "刷新缓存",
  adminLoginRequired: "需要管理员登录。请重新登录。",
  adminPermissionDenied: "无法确认管理员权限。请使用管理员账户重新登录。",
  defaultQuestion: "今年我的运势中最强开启的门是什么，我需要谨慎面对的能量又是什么？",
};

const ADMIN_INSIGHTS_COPY_ZH_TW: AdminInsightsCopy = {
  ...ADMIN_INSIGHTS_COPY_ZH_CN,
  headerTitle: "管理員內容中心",
  headerDescription: "管理全站文章與內容清單。",
  newPost: "新增文章",
  opsDescription: "發布、預約、SEO、sitemap/RSS 反映狀態",
  refreshStatus: "重新整理狀態",
  connected: "已連線",
  needsCheck: "需要確認",
  published: "已發布",
  scheduledReadyPrefix: "已到發布時間",
  missingMeta: "缺少 meta",
  missingImage: "缺少圖片",
  noIndexPublished: "noindex 發布",
  promptLabTitle: "提示詞實驗室",
  promptLabDescription: "僅供頁尾花朵管理員入口使用 · 無需付款即可產生以生日為基礎的提示詞",
  generatePrompt: "產生提示詞",
  copy: "複製",
  serviceLabel: "占術",
  domainLabel: "問題類型",
  earthStorageEnabledLabel: "土支開庫",
  birthTimeLabel: "出生時間",
  unknownBirthTime: "出生時間不詳",
  geocode: "依地區自動填入經緯度",
  generatedPromptPlaceholder: "產生的提示詞會顯示在這裡。",
  menuTitle: "管理員選單",
  contentManagement: "內容管理",
  insightView: "僅看洞察",
  reviewManagement: "評價管理",
  promptLabNav: "提示詞實驗室",
  searchPlaceholder: "搜尋標題或 slug",
  forbiddenHint: "重新取得登入權杖後，可使用內容清單與編輯功能。",
  adminLoginButton: "前往管理員登入",
  emptyTitle: "尚未登錄洞察文章。",
  emptyBody: "請用新增文章按鈕準備第一篇文章。",
  saveDraft: "儲存草稿",
  publish: "發布",
  archive: "封存",
  cacheRefresh: "重新整理快取",
  adminLoginRequired: "需要管理員登入。請重新登入。",
  adminPermissionDenied: "無法確認管理員權限。請使用管理員帳號重新登入。",
};

const ADMIN_INSIGHTS_COPY: Record<LoadingLocale, AdminInsightsCopy> = {
  ko: ADMIN_INSIGHTS_COPY_KO,
  en: ADMIN_INSIGHTS_COPY_EN,
  ja: ADMIN_INSIGHTS_COPY_JA,
  "zh-CN": ADMIN_INSIGHTS_COPY_ZH_CN,
  "zh-TW": ADMIN_INSIGHTS_COPY_ZH_TW,
  vi: ADMIN_INSIGHTS_COPY_EN,
  hi: ADMIN_INSIGHTS_COPY_EN,
  es: ADMIN_INSIGHTS_COPY_EN,
  fr: ADMIN_INSIGHTS_COPY_EN,
  de: ADMIN_INSIGHTS_COPY_EN,
  nl: ADMIN_INSIGHTS_COPY_EN,
  ms: ADMIN_INSIGHTS_COPY_EN,
};

const ADMIN_DATE_LOCALES: Record<LoadingLocale, string> = {
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

const PROMPT_LAB_SERVICES: Array<{ key: PromptLabService }> = [
  { key: "saju" },
  { key: "tarot" },
  { key: "sukuyo" },
  { key: "astrology" },
  { key: "ziwei" },
  { key: "vedic" },
];

const PROMPT_LAB_DOMAINS: Array<{ key: PromptLabDomain }> = [
  { key: "general" },
  { key: "love" },
  { key: "compatibility" },
  { key: "career" },
  { key: "money" },
  { key: "health" },
  { key: "life_direction" },
  { key: "personality" },
];

const DEFAULT_PROMPT_LAB_FORM_BASE: Omit<PromptLabForm, "question"> = {
  service: "saju",
  domain: "general",
  name: "",
  gender: "",
  birthDate: "",
  calendarType: "solar",
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
};

const PROMPT_LAB_SERVICE_REQUIREMENTS: Record<PromptLabService, {
  needsCoordinates: boolean;
  needsExactTime: boolean;
  supportsTimeCorrection: boolean;
}> = {
  saju: {
    needsCoordinates: true,
    needsExactTime: false,
    supportsTimeCorrection: true,
  },
  tarot: {
    needsCoordinates: false,
    needsExactTime: false,
    supportsTimeCorrection: false,
  },
  sukuyo: {
    needsCoordinates: false,
    needsExactTime: false,
    supportsTimeCorrection: false,
  },
  astrology: {
    needsCoordinates: true,
    needsExactTime: true,
    supportsTimeCorrection: false,
  },
  ziwei: {
    needsCoordinates: false,
    needsExactTime: true,
    supportsTimeCorrection: false,
  },
  vedic: {
    needsCoordinates: true,
    needsExactTime: true,
    supportsTimeCorrection: false,
  },
};

const PROMPT_LAB_TIME_CORRECTION_OPTIONS: Array<{ key: PromptLabTimeCorrectionPolicy }> = [
  { key: "auto" },
  { key: "clock" },
  { key: "local_mean" },
  { key: "true_solar" },
];

const PROMPT_LAB_DAY_CHANGE_OPTIONS: Array<{ key: PromptLabDayChangePolicy }> = [
  { key: "auto" },
  { key: "midnight" },
  { key: "late_zi_next_day" },
  { key: "true_solar_zi_next_day" },
];

const PROMPT_LAB_EARTH_STORAGE_MODE_OPTIONS: Array<{ key: PromptLabEarthStorageMode }> = [
  { key: "conservative" },
  { key: "standard" },
  { key: "active" },
];

const PROMPT_LAB_EARTH_STORAGE_SCOPE_OPTIONS: Array<{ key: PromptLabEarthStorageScope }> = [
  { key: "natal" },
  { key: "natal_daewoon" },
  { key: "natal_sewoon" },
  { key: "natal_daewoon_sewoon" },
  { key: "all" },
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

function getAdminInsightsCopy(locale: LoadingLocale) {
  return ADMIN_INSIGHTS_COPY[locale] || ADMIN_INSIGHTS_COPY.en;
}

function createDefaultPromptLabForm(locale: LoadingLocale): PromptLabForm {
  return {
    ...DEFAULT_PROMPT_LAB_FORM_BASE,
    question: getAdminInsightsCopy(locale).defaultQuestion,
  };
}

const DEFAULT_PROMPT_LAB_QUESTIONS = new Set(
  Object.values(ADMIN_INSIGHTS_COPY).map((copy) => copy.defaultQuestion),
);

function getAdminAccessMessage(status: number, copy: AdminInsightsCopy): string {
  if (status === 401) return copy.adminLoginRequired;
  return copy.adminPermissionDenied;
}

function clearFlowerAdminTokenClient(): void {
  if (typeof window === "undefined") return;
  try { sessionStorage.removeItem("flower_admin_token"); } catch {}
  try { sessionStorage.removeItem("flower_admin_password_ok"); } catch {}
}

const FILTER_OPTIONS: Array<{ key: FilterKey }> = [
  { key: "all" },
  { key: "draft" },
  { key: "scheduled" },
  { key: "published" },
  { key: "archived" },
  { key: "private" },
  { key: "trash" },
];

const TYPE_OPTIONS: Array<{ key: ContentType }> = [
  { key: "all" },
  { key: "fortune_insight" },
  { key: "saju" },
  { key: "tarot" },
  { key: "astrology" },
  { key: "jamidusu" },
  { key: "sookyo" },
  { key: "vedic" },
  { key: "palmistry" },
  { key: "physiognomy" },
  { key: "notice" },
  { key: "landing" },
  { key: "seo_page" },
  { key: "general" },
];

const SORT_OPTIONS: Array<{ key: SortKey }> = [
  { key: "latest" },
  { key: "updated" },
  { key: "views" },
];

const ADMIN_CONTENT_LIST_PAGE_SIZE = 100;
const ADMIN_CONTENT_LIST_MAX_PAGES = 200;
const EMPTY_CONTENT_PAGINATION: ContentPagination = {
  page: 1,
  limit: ADMIN_CONTENT_LIST_PAGE_SIZE,
  total: 0,
  totalPages: 1,
};

function formatDate(value: string | null | undefined, locale: LoadingLocale) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(ADMIN_DATE_LOCALES[locale] || ADMIN_DATE_LOCALES.en, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: InsightStatus, copy: AdminInsightsCopy) {
  return copy.statuses[status] || copy.statuses.trash;
}

function statusBadgeClass(status: InsightStatus) {
  if (status === "published") return "bg-emerald-900/50 text-emerald-200 border-emerald-700";
  if (status === "scheduled") return "bg-blue-900/50 text-blue-200 border-blue-700";
  if (status === "archived") return "bg-orange-900/40 text-orange-200 border-orange-700";
  if (status === "private") return "bg-amber-900/40 text-amber-200 border-amber-700";
  if (status === "trash") return "bg-rose-900/40 text-rose-200 border-rose-700";
  return "bg-slate-800 text-slate-200 border-slate-700";
}

function countText(value: number | undefined, locale: LoadingLocale) {
  return Number(value || 0).toLocaleString(ADMIN_DATE_LOCALES[locale] || ADMIN_DATE_LOCALES.en);
}

function feedStatusText(feed: { ok?: boolean; status?: number; merged?: boolean } | undefined, copy: AdminInsightsCopy) {
  if (!feed) return copy.feedUnchecked;
  if (!feed.ok) return `${copy.feedError} ${feed.status || "-"}`;
  return feed.merged ? copy.feedDynamic : copy.feedStatic;
}

function contentTypeLabel(value: string | undefined, copy: AdminInsightsCopy) {
  const key = String(value || "fortune_insight") as ContentType;
  return key in copy.contentTypes ? copy.contentTypes[key] : String(value || "fortune_insight");
}

function promptServiceLabel(value: string | undefined, fallback: string | undefined, copy: AdminInsightsCopy) {
  const key = String(value || "") as PromptLabService;
  return key in copy.promptServices ? copy.promptServices[key] : fallback || value || "-";
}

function promptDomainLabel(value: string | undefined, fallback: string | undefined, copy: AdminInsightsCopy) {
  const key = String(value || "") as PromptLabDomain;
  return key in copy.promptDomains ? copy.promptDomains[key] : fallback || value || "-";
}

export default function AdminInsightsPage() {
  const router = useRouter();
  const apiBase = useMemo(() => getApiBaseUrl(), []);
  const endpointBase = `${apiBase || ""}/api/admin/content`;
  const promptLabEndpoint = `${apiBase || ""}/api/admin/prompt-lab/generate`;
  const promptLabGeocodeEndpoint = `${apiBase || ""}/api/admin/prompt-lab/geocode`;
  const requestCredentials = useMemo(() => resolveAdminRequestCredentials(apiBase), [apiBase]);

  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const copy = getAdminInsightsCopy(locale);
  const dateLocale = ADMIN_DATE_LOCALES[locale] || ADMIN_DATE_LOCALES.en;
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
  const [promptLabForm, setPromptLabForm] = useState<PromptLabForm>(() => createDefaultPromptLabForm(getCurrentLoadingLocale()));
  const [promptLabLoading, setPromptLabLoading] = useState(false);
  const [promptLabGeocoding, setPromptLabGeocoding] = useState(false);
  const [promptLabError, setPromptLabError] = useState("");
  const [promptLabResult, setPromptLabResult] = useState<PromptLabResult | null>(null);
  const promptLabRequirement = PROMPT_LAB_SERVICE_REQUIREMENTS[promptLabForm.service];

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

  useEffect(() => {
    setPromptLabForm((prev) => (
      DEFAULT_PROMPT_LAB_QUESTIONS.has(prev.question) ? { ...prev, question: copy.defaultQuestion } : prev
    ));
  }, [copy.defaultQuestion]);

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
          setForbiddenMessage(getAdminAccessMessage(res.status, copy));
          setError("");
          setItems([]);
          setPagination(EMPTY_CONTENT_PAGINATION);
          return;
        }

        if (!res.ok) {
          setError(String(data?.message || copy.errors.listLoadFailed));
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
      setError(copy.errors.listNetworkFailed);
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
        setError(String(data?.message || copy.errors.statusUpdateFailed));
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
        setError(String(data?.message || copy.errors.trashMoveFailed));
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
        setError(String(data?.message || copy.errors.publicationCheckFailed));
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
        setError(String(data?.message || copy.errors.cachePurgeFailed));
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
      setPromptLabError(copy.errors.birthPlaceRequired);
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
        const message = getAdminAccessMessage(res.status, copy);
        setForbiddenMessage(message);
        setPromptLabError(message);
        return;
      }

      if (!res.ok || !data?.ok) {
        setPromptLabError(String(data?.message || copy.errors.geocodeFailed));
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
      setPromptLabError(copy.errors.geocodeNetworkFailed);
    } finally {
      setPromptLabGeocoding(false);
    }
  }

  async function generatePromptLab() {
    setPromptLabError("");
    setPromptLabResult(null);

    if (!promptLabForm.birthDate) {
      setPromptLabError(copy.errors.birthDateRequired);
      return;
    }

    if (promptLabRequirement.needsExactTime && (promptLabForm.birthTimeUnknown || !promptLabForm.birthTime)) {
      setPromptLabError(copy.errors.exactBirthTimeRequired);
      return;
    }

    if (promptLabRequirement.needsCoordinates && (!promptLabForm.latitude || !promptLabForm.longitude)) {
      setPromptLabError(copy.errors.coordinatesRequired);
      return;
    }

    if (promptLabForm.question.trim().length < 5) {
      setPromptLabError(copy.errors.questionTooShort);
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
        const message = getAdminAccessMessage(res.status, copy);
        setForbiddenMessage(message);
        setPromptLabError(message);
        return;
      }

      if (!res.ok) {
        setPromptLabError(String(data?.message || copy.errors.promptGenerateFailed));
        return;
      }

      setForbidden(false);
      setForbiddenMessage("");
      setPromptLabResult(data as PromptLabResult);
    } catch {
      setPromptLabError(copy.errors.promptNetworkFailed);
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
            <h1 className="text-xl md:text-2xl font-bold">{copy.headerTitle}</h1>
            <p className="text-sm text-slate-400 mt-1">{copy.headerDescription}</p>
          </div>
          <button
            type="button"
            className="rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2 text-sm font-medium"
            onClick={() => router.push("/admin/insights/new")}
          >
            {copy.newPost}
          </button>
        </header>

        {diag ? (
          <section className="rounded-2xl border border-[#2a2a3e] bg-[#13131f] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold">{copy.opsTitle}</h2>
                <p className="mt-1 text-xs text-slate-400">{copy.opsDescription}</p>
              </div>
              <button
                type="button"
                onClick={() => { void loadDiag(); }}
                className="rounded-lg bg-slate-700 px-3 py-2 text-xs hover:bg-slate-600"
              >
                {copy.refreshStatus}
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                <p className="text-xs text-slate-400">{copy.dbLabel}</p>
                <p className={diag.dbConnected ? "mt-1 text-sm font-semibold text-emerald-300" : "mt-1 text-sm font-semibold text-rose-300"}>{diag.dbConnected ? copy.connected : copy.needsCheck}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                <p className="text-xs text-slate-400">{copy.total}</p>
                <p className="mt-1 text-lg font-semibold">{countText(diag.counts?.allContent, locale)}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                <p className="text-xs text-slate-400">{copy.published}</p>
                <p className="mt-1 text-lg font-semibold text-emerald-300">{countText(diag.counts?.published, locale)}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                <p className="text-xs text-slate-400">{copy.draft}</p>
                <p className="mt-1 text-lg font-semibold">{countText(diag.counts?.draft, locale)}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                <p className="text-xs text-slate-400">{copy.scheduled}</p>
                <p className="mt-1 text-lg font-semibold text-blue-300">{countText(diag.counts?.scheduled, locale)}</p>
                {Number(diag.counts?.scheduledReady || 0) > 0 ? <p className="mt-1 text-[11px] text-amber-300">{copy.scheduledReadyPrefix} {countText(diag.counts?.scheduledReady, locale)}</p> : null}
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                <p className="text-xs text-slate-400">{copy.missingMeta}</p>
                <p className={Number(diag.counts?.publishedMissingMetaDescription || 0) > 0 ? "mt-1 text-lg font-semibold text-amber-300" : "mt-1 text-lg font-semibold text-emerald-300"}>{countText(diag.counts?.publishedMissingMetaDescription, locale)}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                <p className="text-xs text-slate-400">{copy.missingImage}</p>
                <p className={Number(diag.counts?.publishedMissingFeaturedImage || 0) > 0 ? "mt-1 text-lg font-semibold text-amber-300" : "mt-1 text-lg font-semibold text-emerald-300"}>{countText(diag.counts?.publishedMissingFeaturedImage, locale)}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                <p className="text-xs text-slate-400">{copy.noIndexPublished}</p>
                <p className={Number(diag.counts?.publishedNoIndex || 0) > 0 ? "mt-1 text-lg font-semibold text-rose-300" : "mt-1 text-lg font-semibold text-emerald-300"}>{countText(diag.counts?.publishedNoIndex, locale)}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
              <p className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs">{copy.sitemapLabel}: {feedStatusText(diag.dynamicFeeds?.sitemap, copy)}</p>
              <p className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs">{copy.rssLabel}: {feedStatusText(diag.dynamicFeeds?.rss, copy)}</p>
              <p className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs">{copy.insightsRssLabel}: {feedStatusText(diag.dynamicFeeds?.insightsRss, copy)}</p>
            </div>
          </section>
        ) : null}

        <section id="adminPromptLab" className="rounded-2xl border border-amber-900/60 bg-[#15110d] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-amber-100">{copy.promptLabTitle}</h2>
              <p className="mt-1 text-xs text-amber-100/60">{copy.promptLabDescription}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { void generatePromptLab(); }}
                disabled={promptLabLoading}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-[#1b1205] hover:bg-amber-500 disabled:opacity-50"
              >
                {promptLabLoading ? copy.generating : copy.generatePrompt}
              </button>
              <button
                type="button"
                onClick={() => { void copyPromptLabPrompt(); }}
                disabled={!promptLabResult?.prompt && !promptLabResult?.generatedPrompt}
                className="rounded-lg border border-amber-700 bg-amber-950/40 px-4 py-2 text-sm text-amber-100 hover:bg-amber-900/50 disabled:opacity-50"
              >
                {copy.copy}
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-5">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="block text-xs text-amber-100/70">
                  {copy.serviceLabel}
                  <select
                    value={promptLabForm.service}
                    onChange={(e) => updatePromptLabField("service", e.target.value as PromptLabService)}
                    className="mt-1 w-full rounded-lg border border-amber-900/70 bg-[#201811] px-3 py-2 text-sm text-amber-50"
                  >
                    {PROMPT_LAB_SERVICES.map((option) => (
                      <option key={option.key} value={option.key}>{copy.promptServices[option.key]}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs text-amber-100/70">
                  {copy.domainLabel}
                  <select
                    value={promptLabForm.domain}
                    onChange={(e) => updatePromptLabField("domain", e.target.value as PromptLabDomain)}
                    className="mt-1 w-full rounded-lg border border-amber-900/70 bg-[#201811] px-3 py-2 text-sm text-amber-50"
                  >
                    {PROMPT_LAB_DOMAINS.map((option) => (
                      <option key={option.key} value={option.key}>{copy.promptDomains[option.key]}</option>
                    ))}
                  </select>
                </label>
              </div>

              <p className="rounded-lg border border-amber-900/60 bg-amber-950/25 px-3 py-2 text-xs leading-5 text-amber-100/75">
                {copy.serviceNotes[promptLabForm.service]}
                {" "}
                {promptLabRequirement.needsCoordinates ? copy.coordinateRequired : copy.coordinateOptional}
                {" "}
                {promptLabRequirement.needsExactTime ? copy.exactTimeRequired : copy.unknownTimeAllowed}
              </p>
              {promptLabForm.service === "saju" ? (
                <div className="rounded-lg border border-amber-900/60 bg-[#201811] px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-amber-100">{copy.advancedRulesTitle}</p>
                    <label className="inline-flex items-center gap-2 text-xs text-amber-100/75">
                      <input
                        type="checkbox"
                        checked={promptLabForm.earthStorageOpeningEnabled}
                        onChange={(e) => updatePromptLabField("earthStorageOpeningEnabled", e.target.checked)}
                        className="h-4 w-4 rounded border-amber-800 bg-[#201811]"
                      />
                      {copy.earthStorageEnabledLabel}
                    </label>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <label className="block text-xs text-amber-100/70">
                      {copy.earthStorageModeLabel}
                      <select
                        value={promptLabForm.earthStorageOpeningMode}
                        onChange={(e) => updatePromptLabField("earthStorageOpeningMode", e.target.value as PromptLabEarthStorageMode)}
                        className="mt-1 w-full rounded-lg border border-amber-900/70 bg-[#15110d] px-3 py-2 text-sm text-amber-50"
                      >
                        {PROMPT_LAB_EARTH_STORAGE_MODE_OPTIONS.map((option) => (
                          <option key={option.key} value={option.key}>{copy.earthStorageModeOptions[option.key]}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-xs text-amber-100/70">
                      {copy.earthStorageScopeLabel}
                      <select
                        value={promptLabForm.earthStorageOpeningScope}
                        onChange={(e) => updatePromptLabField("earthStorageOpeningScope", e.target.value as PromptLabEarthStorageScope)}
                        className="mt-1 w-full rounded-lg border border-amber-900/70 bg-[#15110d] px-3 py-2 text-sm text-amber-50"
                      >
                        {PROMPT_LAB_EARTH_STORAGE_SCOPE_OPTIONS.map((option) => (
                          <option key={option.key} value={option.key}>{copy.earthStorageScopeOptions[option.key]}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="mt-2 grid gap-1 text-xs leading-5 text-amber-100/75">
                    {copy.sajuAdvancedRules.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                    <span>{copy.relationStrength}</span>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="block text-xs text-amber-100/70">
                  {copy.nameLabel}
                  <input
                    type="text"
                    value={promptLabForm.name}
                    onChange={(e) => updatePromptLabField("name", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-amber-900/70 bg-[#201811] px-3 py-2 text-sm text-amber-50"
                    placeholder={copy.namePlaceholder}
                  />
                </label>
                <label className="block text-xs text-amber-100/70">
                  {copy.genderLabel}
                  <select
                    value={promptLabForm.gender}
                    onChange={(e) => updatePromptLabField("gender", e.target.value as PromptLabForm["gender"])}
                    className="mt-1 w-full rounded-lg border border-amber-900/70 bg-[#201811] px-3 py-2 text-sm text-amber-50"
                  >
                    <option value="">{copy.genderNone}</option>
                    <option value="F">{copy.genderFemale}</option>
                    <option value="M">{copy.genderMale}</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <label className="block text-xs text-amber-100/70">
                  {copy.birthDateLabel}
                  <input
                    type="date"
                    value={promptLabForm.birthDate}
                    onChange={(e) => updatePromptLabField("birthDate", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-amber-900/70 bg-[#201811] px-3 py-2 text-sm text-amber-50"
                  />
                </label>
                <label className="block text-xs text-amber-100/70">
                  {copy.calendarLabel}
                  <select
                    value={promptLabForm.calendarType}
                    onChange={(e) => updatePromptLabField("calendarType", e.target.value as PromptLabCalendarType)}
                    className="mt-1 w-full rounded-lg border border-amber-900/70 bg-[#201811] px-3 py-2 text-sm text-amber-50"
                  >
                    <option value="solar">{copy.solar}</option>
                    <option value="lunar">{copy.lunar}</option>
                    <option value="lunar_leap">{copy.lunarLeap}</option>
                  </select>
                </label>
                <label className="block text-xs text-amber-100/70">
                  {copy.birthTimeLabel}
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
                {copy.unknownBirthTime}
              </label>

              {promptLabRequirement.supportsTimeCorrection ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="block text-xs text-amber-100/70">
                    {copy.timeCorrectionLabel}
                    <select
                      value={promptLabForm.timeCorrectionPolicy}
                      onChange={(e) => updatePromptLabField("timeCorrectionPolicy", e.target.value as PromptLabTimeCorrectionPolicy)}
                      className="mt-1 w-full rounded-lg border border-amber-900/70 bg-[#201811] px-3 py-2 text-sm text-amber-50"
                    >
                      {PROMPT_LAB_TIME_CORRECTION_OPTIONS.map((option) => (
                        <option key={option.key} value={option.key}>{copy.timeCorrectionOptions[option.key]}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs text-amber-100/70">
                    {copy.dayChangeLabel}
                    <select
                      value={promptLabForm.dayChangePolicy}
                      onChange={(e) => updatePromptLabField("dayChangePolicy", e.target.value as PromptLabDayChangePolicy)}
                      className="mt-1 w-full rounded-lg border border-amber-900/70 bg-[#201811] px-3 py-2 text-sm text-amber-50"
                    >
                      {PROMPT_LAB_DAY_CHANGE_OPTIONS.map((option) => (
                        <option key={option.key} value={option.key}>{copy.dayChangeOptions[option.key]}</option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <label className="block text-xs text-amber-100/70 sm:col-span-3">
                  {copy.birthPlaceLabel}
                  <input
                    type="text"
                    value={promptLabForm.birthPlace}
                    onChange={(e) => updatePromptLabField("birthPlace", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-amber-900/70 bg-[#201811] px-3 py-2 text-sm text-amber-50"
                    placeholder={copy.birthPlacePlaceholder}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => { void geocodePromptLabBirthPlace(); }}
                  disabled={promptLabGeocoding || !promptLabForm.birthPlace.trim()}
                  className="rounded-lg border border-amber-700 bg-amber-950/40 px-3 py-2 text-sm text-amber-100 hover:bg-amber-900/50 disabled:opacity-50 sm:col-span-3"
                >
                  {promptLabGeocoding ? copy.geocoding : copy.geocode}
                </button>
                <input
                  type="text"
                  value={promptLabForm.latitude}
                  onChange={(e) => updatePromptLabField("latitude", e.target.value)}
                  className="rounded-lg border border-amber-900/70 bg-[#201811] px-3 py-2 text-sm text-amber-50"
                  placeholder={copy.latitudePlaceholder}
                />
                <input
                  type="text"
                  value={promptLabForm.longitude}
                  onChange={(e) => updatePromptLabField("longitude", e.target.value)}
                  className="rounded-lg border border-amber-900/70 bg-[#201811] px-3 py-2 text-sm text-amber-50"
                  placeholder={copy.longitudePlaceholder}
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
                {copy.questionLabel}
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
                  <p className="rounded-lg border border-amber-900/60 bg-[#201811] px-3 py-2 text-xs text-amber-100/80">{copy.resultService}<br /><span className="text-sm font-semibold text-amber-50">{promptServiceLabel(promptLabResult.service, promptLabResult.serviceLabel, copy)}</span></p>
                  <p className="rounded-lg border border-amber-900/60 bg-[#201811] px-3 py-2 text-xs text-amber-100/80">{copy.resultDomain}<br /><span className="text-sm font-semibold text-amber-50">{promptDomainLabel(promptLabResult.domain, promptLabResult.domainLabel, copy)}</span></p>
                  <p className="rounded-lg border border-amber-900/60 bg-[#201811] px-3 py-2 text-xs text-amber-100/80">{copy.resultAngles}<br /><span className="text-sm font-semibold text-amber-50">{promptLabResult.analysisAngles?.length || 0}</span></p>
                  <p className="rounded-lg border border-amber-900/60 bg-[#201811] px-3 py-2 text-xs text-amber-100/80">{copy.resultPayment}<br /><span className="text-sm font-semibold text-emerald-300">{promptLabResult.adminFreeExecution ? copy.none : "-"}</span></p>
                </div>
              ) : null}
              {promptLabResult?.service === "saju" && promptLabResult.engineContextSummary ? (
                <div className="rounded-lg border border-amber-900/60 bg-[#201811] px-3 py-2">
                  <p className="text-xs font-semibold text-amber-100">{copy.sajuPreviewTitle}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-amber-100/75 md:grid-cols-4">
                    <span>{copy.hiddenStem} {promptLabResult.engineContextSummary.hiddenStemCount || 0}</span>
                    <span>{copy.tougan} {promptLabResult.engineContextSummary.touganCount || 0}</span>
                    <span>{copy.tuchul} {promptLabResult.engineContextSummary.tuchulCount || 0}</span>
                    <span>{copy.earthOpening} {promptLabResult.engineContextSummary.earthStorageOpeningCount || 0}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-amber-100/75 md:grid-cols-4">
                    <span>{copy.dochung} {promptLabResult.engineContextSummary.doChung?.exists ? "ON" : "OFF"}</span>
                    <span>{copy.earthScope} {promptLabResult.engineContextSummary.promptConfig?.earthStorageOpening?.scope || "-"}</span>
                    <span>{copy.earthMode} {promptLabResult.engineContextSummary.promptConfig?.earthStorageOpening?.mode || "-"}</span>
                    <span>{copy.earthApplied} {promptLabResult.engineContextSummary.promptConfig?.earthStorageOpening?.enabled === false ? "OFF" : "ON"}</span>
                  </div>
                  {promptLabResult.engineContextSummary.doChung?.exists ? (
                    <p className="mt-2 text-xs leading-5 text-amber-100/70">
                      {promptLabResult.engineContextSummary.doChung.repeatedBranch || "-"} {promptLabResult.engineContextSummary.doChung.repeatedCount || "-"} {copy.overlapUnit} → {promptLabResult.engineContextSummary.doChung.inducedOppositeBranch || "-"} / {promptLabResult.engineContextSummary.doChung.strength || "-"}
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
                placeholder={copy.generatedPromptPlaceholder}
              />
              {promptLabResult?.recommendedFollowUpQuestions?.length ? (
                <div className="rounded-lg border border-amber-900/60 bg-[#201811] px-3 py-2">
                  <p className="text-xs font-semibold text-amber-100">{copy.followUp}</p>
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
            <p className="text-xs uppercase tracking-wider text-slate-500 px-2 py-1">{copy.menuTitle}</p>
            <nav className="mt-2 space-y-1">
              <Link
                href="/admin/content"
                className="block rounded-lg px-3 py-2 text-sm bg-violet-900/40 border border-violet-700 text-violet-100"
              >
                {copy.contentManagement}
              </Link>
              <Link
                href="/admin/insights"
                className="block rounded-lg px-3 py-2 text-sm bg-slate-800 border border-slate-700 text-slate-200"
              >
                {copy.insightView}
              </Link>
              <Link
                href="/admin/reviews"
                className="block rounded-lg px-3 py-2 text-sm bg-emerald-950/50 border border-emerald-800 text-emerald-100"
              >
                {copy.reviewManagement}
              </Link>
              <a
                href="#adminPromptLab"
                className="block rounded-lg px-3 py-2 text-sm bg-amber-950/40 border border-amber-800 text-amber-100"
              >
                {copy.promptLabNav}
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
                    {copy.filters[option.key]}
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
                placeholder={copy.searchPlaceholder}
                className="md:col-span-5 rounded-lg bg-[#1e1e2e] border border-[#313145] px-3 py-2 text-sm"
              />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as ContentType)}
                className="md:col-span-2 rounded-lg bg-[#1e1e2e] border border-[#313145] px-3 py-2 text-sm"
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>{copy.contentTypes[option.key]}</option>
                ))}
              </select>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="md:col-span-3 rounded-lg bg-[#1e1e2e] border border-[#313145] px-3 py-2 text-sm"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>{copy.sortOptions[option.key]}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setQuery(searchInput.trim())}
                className="md:col-span-2 rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-2 text-sm"
              >
                {copy.search}
              </button>
            </div>

            {forbidden ? (
              <div className="rounded-xl border border-rose-700/60 bg-rose-900/20 p-5">
                <p className="text-rose-200 font-semibold">{forbiddenMessage || copy.adminLoginRequired}</p>
                <p className="text-sm text-rose-200/80 mt-1">{copy.forbiddenHint}</p>
                <button
                  type="button"
                  onClick={() => router.push(`/admin/login?next=${encodeURIComponent("/admin/content")}`)}
                  className="mt-3 rounded-lg bg-rose-700 hover:bg-rose-600 px-3 py-2 text-sm"
                >
                  {copy.adminLoginButton}
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
                {copy.loadingList}
              </div>
            ) : null}

            {!loading && !forbidden && items.length === 0 ? (
              <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-8 text-center">
                <p className="text-base font-semibold text-slate-200">{copy.emptyTitle}</p>
                <p className="text-sm text-slate-400 mt-1">{copy.emptyBody}</p>
              </div>
            ) : null}

            {!loading && !forbidden && items.length > 0 ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                  <p>
                    {copy.listLabel} {items.length.toLocaleString(dateLocale)} / {pagination.total.toLocaleString(dateLocale)}{copy.itemCountSuffix}
                  </p>
                  {pagination.total > items.length ? (
                    <p>{copy.maxDisplayPrefix} {(ADMIN_CONTENT_LIST_MAX_PAGES * ADMIN_CONTENT_LIST_PAGE_SIZE).toLocaleString(dateLocale)}{copy.maxDisplaySuffix}</p>
                  ) : null}
                </div>

                <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-800">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-900 text-slate-300">
                      <tr>
                        <th className="text-left px-3 py-2">{copy.tableTitle}</th>
                        <th className="text-left px-3 py-2">{copy.tableSlug}</th>
                        <th className="text-left px-3 py-2">{copy.tableCategory}</th>
                        <th className="text-left px-3 py-2">{copy.tableType}</th>
                        <th className="text-left px-3 py-2">{copy.tableStatus}</th>
                        <th className="text-right px-3 py-2">{copy.tableViews}</th>
                        <th className="text-left px-3 py-2">{copy.tableCreated}</th>
                        <th className="text-left px-3 py-2">{copy.tableUpdated}</th>
                        <th className="text-left px-3 py-2">{copy.tablePublished}</th>
                        <th className="text-left px-3 py-2">{copy.tableActions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item._id} className="border-t border-slate-800">
                          <td className="px-3 py-2 max-w-[220px] truncate">{item.title || copy.noTitle}</td>
                          <td className="px-3 py-2 text-slate-400">/{item.slug}</td>
                          <td className="px-3 py-2">{item.category || "-"}</td>
                          <td className="px-3 py-2 text-slate-300">{contentTypeLabel(item.type, copy)}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs ${statusBadgeClass(item.status)}`}>
                              {statusLabel(item.status, copy)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">{Number(item.viewCount || 0).toLocaleString(dateLocale)}</td>
                          <td className="px-3 py-2 text-slate-400">{formatDate(item.createdAt, locale)}</td>
                          <td className="px-3 py-2 text-slate-400">{formatDate(item.updatedAt, locale)}</td>
                          <td className="px-3 py-2 text-slate-400">{formatDate(item.publishedAt, locale)}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1.5">
                              <button type="button" className="rounded bg-slate-700 hover:bg-slate-600 px-2 py-1 text-xs" onClick={() => router.push(`/admin/insights/edit?id=${encodeURIComponent(item._id)}`)}>{copy.edit}</button>
                              <button type="button" className="rounded bg-blue-700 hover:bg-blue-600 px-2 py-1 text-xs" onClick={() => window.open(`/insights/${item.slug}`, "_blank", "noopener,noreferrer")}>{copy.preview}</button>
                              <button type="button" disabled={busyId === item._id || item.status === "draft"} className="rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 px-2 py-1 text-xs" onClick={() => updateStatus(item._id, "draft")}>{copy.saveDraft}</button>
                              <button type="button" disabled={busyId === item._id || item.status === "published"} className="rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 px-2 py-1 text-xs" onClick={() => updateStatus(item._id, "published")}>{copy.publish}</button>
                              <button type="button" disabled={busyId === item._id || item.status === "trash"} className="rounded bg-rose-700 hover:bg-rose-600 disabled:opacity-50 px-2 py-1 text-xs" onClick={() => moveToTrash(item._id)}>{copy.archive}</button>
                              <button type="button" disabled={busyId === item._id} className="rounded bg-blue-700 hover:bg-blue-600 disabled:opacity-50 px-2 py-1 text-xs" onClick={() => checkPublication(item._id)}>{copy.publicationCheck}</button>
                              <button type="button" disabled={busyId === item._id} className="rounded bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 px-2 py-1 text-xs" onClick={() => purgeContentCache(item._id)}>{copy.cacheRefresh}</button>
                            </div>
                            {publicationChecks[item._id] ? (
                              <p className={`mt-1 text-[11px] ${publicationChecks[item._id].ok ? "text-emerald-300" : "text-amber-300"}`}>
                                {copy.publicationPublic} {publicationChecks[item._id].ok ? copy.publicationOk : copy.publicationNeedsCheck} · {copy.publicationApi} {publicationChecks[item._id].apiStatus?.status || "-"} · {copy.publicationPage} {publicationChecks[item._id].pageStatus?.status || "-"} · {copy.publicationCache} {publicationChecks[item._id].purgeStatus || "-"}
                                <br />
                                {copy.publicationMeta} {publicationChecks[item._id].pageMeta?.hasTitle && publicationChecks[item._id].pageMeta?.hasDescription ? copy.publicationOk : copy.publicationNeedsCheck} · {copy.publicationCanonical} {publicationChecks[item._id].pageMeta?.canonicalMatches ? copy.publicationOk : copy.publicationNeedsCheck} · {copy.publicationSitemap} {publicationChecks[item._id].feedCoverage?.sitemap?.containsSlug ? copy.included : copy.notIncluded} · {copy.publicationRss} {publicationChecks[item._id].feedCoverage?.rss?.containsSlug ? copy.included : copy.notIncluded}
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
                        <h3 className="font-semibold text-sm leading-5">{item.title || copy.noTitle}</h3>
                        <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] ${statusBadgeClass(item.status)}`}>
                          {statusLabel(item.status, copy)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 break-all">/{item.slug}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                        <p>{copy.mobileCategory}: {item.category || "-"}</p>
                        <p>{copy.mobileType}: {contentTypeLabel(item.type, copy)}</p>
                        <p>{copy.mobileViews}: {Number(item.viewCount || 0).toLocaleString(dateLocale)}</p>
                        <p>{copy.mobileCreated}: {formatDate(item.createdAt, locale)}</p>
                        <p>{copy.mobileUpdated}: {formatDate(item.updatedAt, locale)}</p>
                        <p className="col-span-2">{copy.mobilePublished}: {formatDate(item.publishedAt, locale)}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" className="rounded bg-slate-700 hover:bg-slate-600 px-2 py-1 text-xs" onClick={() => router.push(`/admin/insights/edit?id=${encodeURIComponent(item._id)}`)}>{copy.edit}</button>
                        <button type="button" className="rounded bg-blue-700 hover:bg-blue-600 px-2 py-1 text-xs" onClick={() => window.open(`/insights/${item.slug}`, "_blank", "noopener,noreferrer")}>{copy.preview}</button>
                        <button type="button" disabled={busyId === item._id || item.status === "draft"} className="rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 px-2 py-1 text-xs" onClick={() => updateStatus(item._id, "draft")}>{copy.saveDraft}</button>
                        <button type="button" disabled={busyId === item._id || item.status === "published"} className="rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 px-2 py-1 text-xs" onClick={() => updateStatus(item._id, "published")}>{copy.publish}</button>
                        <button type="button" disabled={busyId === item._id || item.status === "trash"} className="rounded bg-rose-700 hover:bg-rose-600 disabled:opacity-50 px-2 py-1 text-xs" onClick={() => moveToTrash(item._id)}>{copy.archive}</button>
                        <button type="button" disabled={busyId === item._id} className="rounded bg-blue-700 hover:bg-blue-600 disabled:opacity-50 px-2 py-1 text-xs" onClick={() => checkPublication(item._id)}>{copy.publicationCheck}</button>
                        <button type="button" disabled={busyId === item._id} className="rounded bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 px-2 py-1 text-xs" onClick={() => purgeContentCache(item._id)}>{copy.cacheRefresh}</button>
                      </div>
                      {publicationChecks[item._id] ? (
                        <p className={`text-[11px] ${publicationChecks[item._id].ok ? "text-emerald-300" : "text-amber-300"}`}>
                          {copy.publicationPublic} {publicationChecks[item._id].ok ? copy.publicationOk : copy.publicationNeedsCheck} · {copy.publicationApi} {publicationChecks[item._id].apiStatus?.status || "-"} · {copy.publicationPage} {publicationChecks[item._id].pageStatus?.status || "-"} · {copy.publicationCache} {publicationChecks[item._id].purgeStatus || "-"}
                          <br />
                          {copy.publicationMeta} {publicationChecks[item._id].pageMeta?.hasTitle && publicationChecks[item._id].pageMeta?.hasDescription ? copy.publicationOk : copy.publicationNeedsCheck} · {copy.publicationCanonical} {publicationChecks[item._id].pageMeta?.canonicalMatches ? copy.publicationOk : copy.publicationNeedsCheck} · {copy.publicationSitemap} {publicationChecks[item._id].feedCoverage?.sitemap?.containsSlug ? copy.included : copy.notIncluded} · {copy.publicationRss} {publicationChecks[item._id].feedCoverage?.rss?.containsSlug ? copy.included : copy.notIncluded}
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

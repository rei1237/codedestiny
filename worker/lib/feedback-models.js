// 버그 제보실 전용 DB 스키마.
//
// worker/lib/models.js(웹·앱 공용)는 건드리지 않는다. mongoose 모델 레지스트리는 전역이라
// 여기서 등록해도 동일하게 동작한다(review-models.js·app-store-models.js 선례).

import { mongoose } from "./db.js";

export const FEEDBACK_CATEGORIES = Object.freeze({
  BUG: "bug",
  FEATURE: "feature",
  UI: "ui",
  TYPO: "typo",
  AI_QUALITY: "ai-quality",
  PAYMENT: "payment",
  TRANSLATION: "translation",
  PERFORMANCE: "performance",
  MOBILE: "mobile",
  ETC: "etc",
});

export const FEEDBACK_CATEGORY_LIST = Object.freeze(Object.values(FEEDBACK_CATEGORIES));

// 라벨 정본은 여기 하나다. /feedback 이 GET /api/feedback/meta 로 이 값을 받아 쓰므로
// 프론트에 한글 라벨을 하드코딩하지 않는다(드리프트 방지).
export const FEEDBACK_CATEGORY_LABELS = Object.freeze({
  bug: "버그",
  feature: "기능 제안",
  ui: "UI 개선",
  typo: "오탈자",
  "ai-quality": "AI 결과 품질",
  payment: "결제 문제",
  translation: "번역 오류",
  performance: "속도 문제",
  mobile: "모바일 문제",
  etc: "기타",
});

export const FEEDBACK_STATUSES = Object.freeze({
  NEW: "new",
  IN_PROGRESS: "in_progress",
  RESOLVED: "resolved",
  ON_HOLD: "on_hold",
  REJECTED: "rejected",
});

export const FEEDBACK_STATUS_LIST = Object.freeze(Object.values(FEEDBACK_STATUSES));

// rejected 를 따로 두는 이유: 없으면 "버그 아님/수정 안 함" 판정이 전부 보류로 흘러가
// 보류 큐가 무덤이 된다. "언젠가 할 것"과 "안 하기로 했다"는 구분되어야 한다.
export const FEEDBACK_STATUS_LABELS = Object.freeze({
  new: "미확인",
  in_progress: "확인 중",
  resolved: "수정 완료",
  on_hold: "보류",
  rejected: "반려",
});

export const FEEDBACK_PRIORITIES = Object.freeze({ HIGH: "high", NORMAL: "normal", LOW: "low" });
export const FEEDBACK_PRIORITY_LIST = Object.freeze(Object.values(FEEDBACK_PRIORITIES));
export const FEEDBACK_PRIORITY_LABELS = Object.freeze({ high: "높음", normal: "보통", low: "낮음" });

// priority 는 문자열이라 그대로 정렬하면 알파벳순(high < low < normal)으로 뒤집힌다.
// 정렬 전용 숫자를 함께 저장한다 — 쓰기 경로가 생성/관리자 PATCH 둘뿐이라 훅 없이 유지한다.
export const FEEDBACK_PRIORITY_RANK = Object.freeze({ high: 0, normal: 1, low: 2 });

export function priorityRankOf(priority) {
  return FEEDBACK_PRIORITY_RANK[String(priority || "")] ?? FEEDBACK_PRIORITY_RANK.normal;
}

export const FEEDBACK_TITLE_MAX_LENGTH = 80;
export const FEEDBACK_CONTENT_MIN_LENGTH = 10;
export const FEEDBACK_CONTENT_MAX_LENGTH = 2000;
export const FEEDBACK_MAX_ATTACHMENTS = 3;
export const FEEDBACK_MAX_FILE_BYTES = 6 * 1024 * 1024;
export const FEEDBACK_ALLOWED_MIME = Object.freeze(["image/jpeg", "image/png", "image/webp"]);

// 첨부는 별도 컬렉션이 아니라 임베디드 배열이다. 항상 부모 제보와 함께만 조회되고,
// 건당 최대 3개 · 항목당 ~250B 라 문서 크기와 무관하다. 별도 컬렉션이면 상세 조회마다
// 2차 쿼리 + 삭제 시 고아 정리 로직이 필요해진다.
const feedbackFileSchema = new mongoose.Schema({
  key: { type: String, required: true, trim: true, maxlength: 512 },
  originalName: { type: String, default: "", trim: true, maxlength: 200 },
  mimeType: { type: String, default: "", trim: true, maxlength: 80 },
  // 클라이언트 신고값이 아니라 bucket.head() 로 읽은 R2 실측값을 저장한다.
  size: { type: Number, default: 0, min: 0 },
}, { _id: false });

// 답변은 단일 필드가 아니라 배열이다. 단일 필드면 두 번째 답변이 첫 답변을 덮어써
// 이미 제보자에게 노출된 내용이 소실된다. $set → $push 로 코드량은 같다.
const feedbackReplySchema = new mongoose.Schema({
  body: { type: String, required: true, trim: true, maxlength: 2000 },
  authorId: { type: String, default: "", trim: true, maxlength: 120 },
  authorName: { type: String, default: "", trim: true, maxlength: 60 },
  emailed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const feedbackSchema = new mongoose.Schema({
  // ── 작성자. 로그인 필수라 userId 는 항상 채워진다.
  userId: { type: String, required: true, trim: true, maxlength: 120, index: true },
  // authorName/authorEmail 은 스냅샷이다. User 문서가 바뀌거나 탈퇴해도 관리자 화면이
  // 깨지지 않도록 작성 시점 값을 박아둔다(Review.authorName 선례).
  authorName: { type: String, default: "", trim: true, maxlength: 60 },
  authorEmail: { type: String, default: "", trim: true, maxlength: 200, lowercase: true },

  // ── 본문
  category: { type: String, enum: FEEDBACK_CATEGORY_LIST, default: FEEDBACK_CATEGORIES.BUG, index: true },
  title: { type: String, required: true, trim: true, maxlength: FEEDBACK_TITLE_MAX_LENGTH },
  content: { type: String, required: true, trim: true, maxlength: FEEDBACK_CONTENT_MAX_LENGTH },
  locale: { type: String, enum: ["ko", "ja", "zh", "en"], default: "ko" },
  // 카테고리별 조건부 필드(재현 방법·기대 결과·주문번호 등)를 라벨과 함께 순서대로 담는다.
  // 카테고리가 늘어도 스키마를 바꾸지 않아도 되고, 관리자 화면은 저장된 순서대로 렌더한다.
  details: {
    type: [new mongoose.Schema({
      key: { type: String, default: "", trim: true, maxlength: 60 },
      label: { type: String, default: "", trim: true, maxlength: 60 },
      value: { type: String, default: "", trim: true, maxlength: 1000 },
    }, { _id: false })],
    default: [],
  },
  attachments: { type: [feedbackFileSchema], default: [] },

  // ── 처리 상태
  status: { type: String, enum: FEEDBACK_STATUS_LIST, default: FEEDBACK_STATUSES.NEW, index: true },
  priority: { type: String, enum: FEEDBACK_PRIORITY_LIST, default: FEEDBACK_PRIORITIES.NORMAL },
  priorityRank: { type: Number, default: FEEDBACK_PRIORITY_RANK.normal, min: 0, max: 2 },
  resolvedAt: { type: Date, default: null },

  // ── 자동 수집 환경정보. 클라이언트 신고값이라 위조 가능하며 재현 참고용이다.
  //    표시 순서를 사용자에게 고지한 순서와 일치시키기 위해 배열로 저장한다.
  client: {
    type: [new mongoose.Schema({
      key: { type: String, default: "", trim: true, maxlength: 40 },
      label: { type: String, default: "", trim: true, maxlength: 60 },
      value: { type: String, default: "", trim: true, maxlength: 500 },
    }, { _id: false })],
    default: [],
  },
  // 제보 대상 URL 은 목록/필터에서 자주 쓰므로 배열과 별개로 승격해 둔다.
  url: { type: String, default: "", trim: true, maxlength: 1000 },

  // ── 서버가 본 진실(위조 불가). 🔴 IP 원문은 저장하지 않는다 — 해시만.
  meta: {
    ipHash: { type: String, default: "", trim: true, maxlength: 96 },
    userAgent: { type: String, default: "", trim: true, maxlength: 300 },
    requestId: { type: String, default: "", trim: true, maxlength: 120 },
  },

  // ── 중복 탐지 + 자동 플래그
  contentHash: { type: String, default: "", trim: true, maxlength: 64, index: true },
  // screenReviewText 결과. 차단이 아니라 관리자 트리아지 신호로만 쓴다.
  autoFlagReasons: { type: [String], default: [] },

  // ── 관리자 운영
  assigneeId: { type: String, default: "", trim: true, maxlength: 120 },
  assigneeName: { type: String, default: "", trim: true, maxlength: 60 },
  tags: { type: [String], default: [] },
  adminNote: { type: String, default: "", trim: true, maxlength: 1000 },
  replies: { type: [feedbackReplySchema], default: [] },

  // ── 버그 확인 보상(월정석). ledgerSourceId 가 MonthlyCreditLedger 의 sourceId 와 같아
  // 같은 제보를 두 번 확정해도 중복 지급되지 않는다(grantMonthlyCreditLotDetailed 의 lotId 멱등).
  bugReward: {
    granted: { type: Boolean, default: false },
    amount: { type: Number, default: 0, min: 0 },
    grantedAt: { type: Date, default: null },
    grantedBy: { type: String, default: "", trim: true, maxlength: 120 },
    ledgerSourceId: { type: String, default: "", trim: true, maxlength: 160 },
  },

  // ── 확장 슬롯(스키마만 선언, 이번 패스에서 쓰기 경로 없음).
  //    upvoterIds 배열은 일부러 두지 않는다 — 무한 성장 필드를 미리 심으면 문서 크기 사고가 난다.
  //    추천 기능이 실제로 필요해지면 feedback_votes 별도 컬렉션으로 붙인다.
  upvoteCount: { type: Number, default: 0, min: 0 },
  isPublic: { type: Boolean, default: false },
  publicSummary: { type: String, default: "", trim: true, maxlength: 300 },
  publishedAt: { type: Date, default: null },
  badge: {
    awarded: { type: Boolean, default: false },
    badgeKey: { type: String, default: "", trim: true, maxlength: 60 },
    awardedAt: { type: Date, default: null },
  },

  // ── 알림 관측용
  notifiedAt: { type: Date, default: null },
  notifyError: { type: String, default: "", trim: true, maxlength: 300 },
}, { timestamps: true, collection: "feedbacks" });

// 내 제보 내역
feedbackSchema.index({ userId: 1, createdAt: -1 });
// 관리자 기본 큐 / 우선순위 큐
feedbackSchema.index({ status: 1, createdAt: -1 });
feedbackSchema.index({ status: 1, priorityRank: 1, createdAt: -1 });
// 카테고리 필터
feedbackSchema.index({ category: 1, status: 1, createdAt: -1 });
// 24시간 중복 탐지
feedbackSchema.index({ contentHash: 1, createdAt: -1 });
// 공개 처리완료 피드(확장 슬롯)
feedbackSchema.index(
  { isPublic: 1, publishedAt: -1 },
  { name: "public_resolved_feed", partialFilterExpression: { isPublic: true } },
);

// text 인덱스는 만들지 않는다 — Atlas 공유 티어는 컬렉션당 1개 제한 + 쓰기 증폭이 붙는데,
// 관리자 검색은 이미 status/category 로 좁혀진 뒤라 title 정규식으로 충분하다.
//
// {userId, contentHash} unique 도 쓰지 않는다 — 같은 버그가 재발했을 때 제보자가 영영
// 다시 신고할 수 없게 된다. 중복은 24시간 시간창 쿼리로 처리한다.
//
// NOTE: db.js는 autoIndex:false로 연결하므로 이 선언만으로는 실제 인덱스가 생성되지 않는다 —
// scripts/migrations/20260731-add-feedback-indexes.mjs 를 DB에 1회 실행할 것.
export const Feedback = mongoose.models.Feedback || mongoose.model("Feedback", feedbackSchema);

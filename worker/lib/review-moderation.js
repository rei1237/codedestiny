// 리뷰 자동 필터.
//
// 🔴 이 필터는 "차단 장치"가 아니다. 모든 사용자 리뷰는 이미 무조건 status:"pending"으로
// 저장되어 관리자 승인 전에는 어떤 공개 경로에서도 노출되지 않는다. 여기에 "필터에 걸리면
// 보류" 장치를 또 만들면 효과는 그대로면서 코드만 늘어난다(CLAUDE.md 원칙 6, 중첩 사전검사).
// 따라서 결과는 관리자 화면의 플래그 배지 + 위험 리뷰 우선 정렬 신호로만 쓴다.

export const REVIEW_FLAGS = Object.freeze({
  PROFANITY: "profanity",
  ADVERTISING: "advertising",
  PERSONAL_INFO: "personal_info",
  SPAM: "spam",
  COMPETITOR: "competitor",
  FALSE_PURCHASE_CLAIM: "false_purchase_claim",
});

export const REVIEW_FLAG_LABELS = Object.freeze({
  [REVIEW_FLAGS.PROFANITY]: "욕설·비속어",
  [REVIEW_FLAGS.ADVERTISING]: "광고·홍보",
  [REVIEW_FLAGS.PERSONAL_INFO]: "개인정보 노출",
  [REVIEW_FLAGS.SPAM]: "도배·반복",
  [REVIEW_FLAGS.COMPETITOR]: "타 서비스 언급",
  [REVIEW_FLAGS.FALSE_PURCHASE_CLAIM]: "허위 구매 주장",
});

// 자모 분리·반복 우회를 잡기 위해 비교 전에 공백/특수문자/반복을 걷어낸다.
function foldForMatching(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[\s.·,~!@#$%^&*()_+\-=[\]{};':"\\|<>/?]+/g, "")
    .replace(/(.)\1{2,}/g, "$1");
}

const PROFANITY_PATTERNS = [
  /시발|씨발|시바|씨바|ㅅㅂ|ㅆㅂ/,
  /병신|븅신|ㅂㅅ/,
  /개새끼|개색기|새끼|ㄱㅅㄲ/,
  /좆|좃같|존나|ㅈㄴ/,
  /지랄|ㅈㄹ/,
  /미친놈|미친년|또라이/,
  /꺼져|닥쳐/,
  /fuck|shit|bitch|asshole/,
];

const ADVERTISING_PATTERNS = [
  /https?:\/\//i,
  /www\.[a-z0-9-]+\.[a-z]{2,}/i,
  /[a-z0-9-]+\.(com|net|kr|co\.kr|io|me|shop|site)\b/i,
  /오픈\s*채팅|오픈카톡|오카방/,
  /카톡\s*아이디|카카오톡\s*아이디|카톡\s*[:：]/,
  /텔레\s*그램|telegram|@[a-z0-9_]{4,}/i,
  /디엠|dm\s*주세요|문의\s*주세요|상담\s*문의/i,
  /무료\s*체험|이벤트\s*중|할인\s*코드|쿠폰\s*코드/,
  /인스타|instagram|블로그\s*주소/i,
];

const PERSONAL_INFO_PATTERNS = [
  /01[016-9][-\s.]?\d{3,4}[-\s.]?\d{4}/,
  /\b\d{6}[-\s]?[1-4]\d{6}\b/,
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
  /\b\d{2,3}[-\s]\d{3,4}[-\s]\d{4}\b/,
];

const COMPETITOR_PATTERNS = [
  /점신|헬로우봇|포스텔러|천명|运势通/,
  /타로마스터|사주카페|철학관\s*추천/,
];

const FALSE_PURCHASE_CLAIM_PATTERNS = [
  /결제\s*했는데/,
  /돈\s*냈는데|환불\s*해\s*줘|환불\s*요청/,
  /구매\s*했는데.*안\s*(되|돼|나)/,
];

function hasSpamRepetition(text) {
  const raw = String(text || "");
  // 같은 문자 6회 이상 연속
  if (/(.)\1{5,}/.test(raw)) return true;

  // 같은 어절이 전체의 절반 이상
  const words = raw.split(/\s+/).filter((word) => word.length > 1);
  if (words.length >= 6) {
    const counts = new Map();
    for (const word of words) counts.set(word, (counts.get(word) || 0) + 1);
    const topCount = Math.max(...counts.values());
    if (topCount / words.length >= 0.5) return true;
  }

  return false;
}

function matchesAny(patterns, ...texts) {
  return patterns.some((pattern) => texts.some((text) => pattern.test(text)));
}

/**
 * 리뷰 본문을 훑어 관리자 검토가 필요한 신호를 뽑는다.
 *
 * @param {{title?: string, body?: string, isVerifiedPurchase?: boolean}} input
 * @returns {{flags: string[], labels: string[]}}
 */
export function screenReviewText({ title = "", body = "", isVerifiedPurchase = true } = {}) {
  const rawText = `${title} ${body}`.trim();
  const foldedText = foldForMatching(rawText);
  const flags = [];

  if (matchesAny(PROFANITY_PATTERNS, rawText, foldedText)) flags.push(REVIEW_FLAGS.PROFANITY);
  if (matchesAny(ADVERTISING_PATTERNS, rawText)) flags.push(REVIEW_FLAGS.ADVERTISING);
  if (matchesAny(PERSONAL_INFO_PATTERNS, rawText)) flags.push(REVIEW_FLAGS.PERSONAL_INFO);
  if (hasSpamRepetition(rawText)) flags.push(REVIEW_FLAGS.SPAM);
  if (matchesAny(COMPETITOR_PATTERNS, rawText, foldedText)) flags.push(REVIEW_FLAGS.COMPETITOR);

  // 구매 기록이 확인되지 않은 작성자가 결제/환불을 주장하는 경우에만 의미가 있다.
  if (!isVerifiedPurchase && matchesAny(FALSE_PURCHASE_CLAIM_PATTERNS, rawText)) {
    flags.push(REVIEW_FLAGS.FALSE_PURCHASE_CLAIM);
  }

  return {
    flags,
    labels: flags.map((flag) => REVIEW_FLAG_LABELS[flag] || flag),
  };
}

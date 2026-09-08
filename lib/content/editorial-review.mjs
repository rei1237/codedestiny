// A record is added only after the named reviewer confirms the actual manuscript.
// Original HTML, publication, and an automated audit do not establish human review.
export const CONTENT_REVIEWS = Object.freeze({});

export function contentPath(value) {
  try {
    return new URL(value, "https://code-destiny.com").pathname.replace(/\/+$/, "") || "/";
  } catch {
    return "";
  }
}

export function getContentReview(path, records = CONTENT_REVIEWS) {
  const review = records[contentPath(path)];
  if (review?.status !== "verified" || !String(review.reviewer || "").trim()
    || !/^\d{4}-\d{2}-\d{2}$/.test(review.reviewedAt || "")
    || actualContentDate(review.reviewedAt)?.slice(0, 10) !== review.reviewedAt
    || !String(review.evidence || "").trim()) return null;
  return review;
}

export function hasAdvertisingReview(path, records = CONTENT_REVIEWS) {
  return getContentReview(path, records)?.adsAllowed === true;
}

export function actualContentDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(String(value))) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (String(value).length === 10 && date.toISOString().slice(0, 10) !== value) return null;
  return date.toISOString();
}

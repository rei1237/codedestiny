// CMS 엔트리의 "지금 공개 상태인가" 판정. 워커 라우트와 프롬프트 리더가 같은 기준을 써야 하므로
// 여기 한 곳에만 둔다(두 곳이 다르면 어떤 엔트리는 관리자엔 발행됨으로 보이는데 서비스엔 안 나온다).
//
// 예약 발행을 위해 크론을 새로 걸지 않고 읽는 시점에 창(window)을 본다 — 기존 크론은 하루 1회라
// "8월 1일 00:00 공개"를 맞출 수 없고, wrangler.toml 은 수정 금지 파일이다.

export function buildCmsPublicStatusQuery(now = new Date()) {
  return {
    $and: [
      {
        $or: [
          { status: "published" },
          { status: "scheduled", publishAt: { $lte: now } },
        ],
      },
      {
        $or: [
          { publishAt: null },
          { publishAt: { $exists: false } },
          { publishAt: { $lte: now } },
        ],
      },
      {
        $or: [
          { unpublishAt: null },
          { unpublishAt: { $exists: false } },
          { unpublishAt: { $gt: now } },
        ],
      },
    ],
  };
}

/** 이미 손에 든 문서에 대한 같은 판정(빌드 스크립트·테스트에서 사용). */
export function isCmsEntryPublic(entry, now = new Date()) {
  const status = String(entry?.status || "");
  if (status !== "published" && status !== "scheduled") return false;

  const publishAt = entry?.publishAt ? new Date(entry.publishAt) : null;
  const unpublishAt = entry?.unpublishAt ? new Date(entry.unpublishAt) : null;

  if (status === "scheduled" && !publishAt) return false;
  if (publishAt && publishAt.getTime() > now.getTime()) return false;
  if (unpublishAt && unpublishAt.getTime() <= now.getTime()) return false;

  return true;
}

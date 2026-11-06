// 한국 날짜 기준 최초 공개일. 날짜 필드 도입 전의 두 발행증은
// Edition test issuer 실행 41998291580, 42052679533의 운영 게시 기록에서 복원했다.
const firstPublications = {
  '7779d4d37f7d2b8b4099d513': '2026-11-05',
  'c508c7e94ed35c24b5977105': '2026-11-06',
};

export function publicationDate(row) {
  return firstPublications[row.code] ?? row.publishedOn ?? null;
}

export function koreanPublicationDay(now) {
  return new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10);
}

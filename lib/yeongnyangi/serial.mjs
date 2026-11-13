// 영냥이 연재 공개 게이트. 빌드 시각(now) 기준으로 공개 회차를 계산한다.
// 공개 = status 'ready' + 페이지형(format 'pages') 12~24쪽 + 모든 쪽의 대체 텍스트와 이미지 파일(NN-{720,1122}.{avif,webp}) + publishAt <= now.
// 같은 now로 몇 번을 돌려도 결과가 같다(재실행 멱등). 테스트는 SERIAL_NOW로 기준 시각을 주입한다.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { SEASON_ONE } from './season-1.mjs';

export const PAGE_RANGE = [12, 24];
export const PAGE_WIDTHS = [720, 1122];
/** 연재 원본 이미지는 public/이 아닌 content/에 있다. 공개 회차만 빌드 직전 public/assets/로 복사된다. */
export const CONTENT_ROOT = 'content';
export const PUBLIC_PREFIX = '/assets/yeongnyangi/season-1/';

export function serialNow(env = process.env) {
  const raw = env.SERIAL_NOW;
  if (!raw) return new Date();
  const time = Date.parse(raw);
  if (Number.isNaN(time)) throw new Error(`SERIAL_NOW is not a date: ${raw}`);
  return new Date(time);
}

const pad = n => String(n).padStart(2, '0');

/** 쪽 하나가 실제로 쓰는 파일(너비별 AVIF·WebP)의 content/ 경로. */
export function pageFiles(episode, page, root = CONTENT_ROOT) {
  const base = join(root, PUBLIC_PREFIX.replace(/^\/assets\//, ''), episode.slug, pad(page.n));
  return PAGE_WIDTHS.flatMap(w => [`${base}-${w}.avif`, `${base}-${w}.webp`]);
}

export function completeness(episode, { root = CONTENT_ROOT, fileExists = existsSync } = {}) {
  const problems = [];
  if (episode.status !== 'ready') problems.push(`status ${episode.status}`);
  if (episode.format !== 'pages') return [...problems, `format ${episode.format}`];
  const pages = episode.pages || [];
  if (pages.length < PAGE_RANGE[0] || pages.length > PAGE_RANGE[1]) problems.push(`${pages.length} pages`);
  pages.forEach((page, index) => {
    if (page.n !== index + 1) problems.push(`page ${index + 1} numbered ${page.n}`);
    if (!page.alt?.trim()) problems.push(`page ${page.n} alt`);
    for (const file of pageFiles(episode, page, root)) if (!fileExists(file)) problems.push(`missing ${file}`);
  });
  return problems;
}

export function isPublished(episode, now, options) {
  return Date.parse(episode.publishAt) <= now.getTime() && completeness(episode, options).length === 0;
}

/** 공개 회차만, 회차 번호순. 각 항목에 주소(href)와 이미지 폴더(dir)를 붙인다. options.episodes로 연재표를 바꿔 끼울 수 있다(테스트용). */
export function publishedEpisodes(now = serialNow(), options = {}) {
  return (options.episodes || SEASON_ONE.episodes)
    .filter(episode => isPublished(episode, now, options))
    .map(episode => ({ ...episode, href: `/yeongnyangi/season-1/${episode.slug}/`, dir: `${PUBLIC_PREFIX}${episode.slug}` }));
}

export function latestEpisode(now = serialNow(), options) {
  const list = publishedEpisodes(now, options);
  return list[list.length - 1] || null;
}

/** 다음 공개 예정 시각만 알려 준다. 제목·이미지 같은 미공개 회차 내용은 노출하지 않는다. */
export function nextRelease(now = serialNow(), options = {}) {
  const published = new Set(publishedEpisodes(now, options).map(episode => episode.slug));
  const next = (options.episodes || SEASON_ONE.episodes).find(episode => !published.has(episode.slug));
  if (!next) return null;
  const at = Date.parse(next.publishAt);
  return { no: next.no, publishAt: at > now.getTime() ? next.publishAt : null };
}

export function formatKst(iso) {
  const parts = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: false }).formatToParts(new Date(iso));
  const get = type => parts.find(part => part.type === type)?.value;
  return `${get('month')} ${get('day')}일(${get('weekday')}) ${get('hour')}:${get('minute')}`;
}

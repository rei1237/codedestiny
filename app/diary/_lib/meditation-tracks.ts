/**
 * 명상 음악 목록. 셸 `js/luck-sync-diary.js:2244` 의 제목 23개와 URL 규칙을 그대로 옮긴 것이다.
 *
 * 🔴 `id` 형식(`meditation-<순번>`)을 셸과 같게 유지한다 — `meditationLogs[].trackId` 는
 * v2 공유 필드라, 형식이 갈리면 두 표면이 같은 곡을 다른 곡으로 기록한다.
 * 🔴 목록 순서를 바꾸지 않는다 — 순번이 곧 id 라, 사이에 한 곡을 끼우면 이미 저장된
 * 기록의 trackId 가 통째로 다른 곡을 가리키게 된다. 추가는 **끝에만** 한다.
 */

export interface DiaryMeditationTrack {
  id: string;
  title: string;
  url: string;
}

/** 셸 `:2244-2255` 축자 사본. */
const MEDITATION_TITLES = [
  "Crystal Garden",
  "Dawn in the Temple",
  "Fire Festival",
  "First Light on Water",
  "Flowing Light",
  "Focus Flow",
  "Inner Flame Awakening",
  "Midnight Pulse",
  "Moonlit Dawn",
  "Moonlit Forest Temple",
  "Moonlit Glass Box",
  "Moonlit River Return",
  "Moonlit Strategy Map",
  "Moonlit Temple Gate",
  "Rain Window Renewal",
  "Sacred Flame",
  "Starlight Drift",
  "Still Lake Dawn",
  "Still Lake Mind",
  "Sunrise Drum Circle",
  "The Memory of Water",
  "The Stars Remember Your Name",
  "Zero Point",
] as const;

export const DIARY_MEDITATION_TRACKS: readonly DiaryMeditationTrack[] = MEDITATION_TITLES.map(
  (title, index) => ({
    id: `meditation-${index}`,
    title,
    url: `https://music.code-destiny.com/Meditation/${encodeURIComponent(`${title}.mp3`)}`,
  }),
);

export function findMeditationTrack(trackId: string | null): DiaryMeditationTrack | null {
  if (!trackId) return null;
  return DIARY_MEDITATION_TRACKS.find((track) => track.id === trackId) || null;
}

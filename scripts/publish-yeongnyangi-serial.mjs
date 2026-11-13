#!/usr/bin/env node
// prebuild:cf 단계. 빌드 시각에 공개된 영냥이 연재 회차의 이미지만 content/ → public/assets/yeongnyangi/season-1/ 로 복사한다.
// 공개 전 회차의 이미지는 배포본에 들어가지 않으므로 직접 URL로도 열리지 않는다. 대상 폴더는 매번 새로 만든다(재실행 멱등).
//   node scripts/publish-yeongnyangi-serial.mjs            # 지금 시각 기준
//   SERIAL_NOW=2026-11-14T21:00:00+09:00 node scripts/...  # 기준 시각 주입(검증용)
//   --check  복사하지 않고 공개/보류 회차만 출력
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { SEASON_ONE } from '../lib/yeongnyangi/season-1.mjs';
import { completeness, pageFiles, publishedEpisodes, serialNow } from '../lib/yeongnyangi/serial.mjs';

const TARGET = join('public', 'assets', 'yeongnyangi', 'season-1');
const now = serialNow();
const check = process.argv.includes('--check');
const published = publishedEpisodes(now);
const publishedSlugs = new Set(published.map(episode => episode.slug));

for (const episode of SEASON_ONE.episodes) {
  const problems = completeness(episode);
  const state = publishedSlugs.has(episode.slug) ? 'published' : problems.length ? `held (${problems.slice(0, 3).join(', ')})` : `scheduled ${episode.publishAt}`;
  console.log(`[yeongnyangi-serial] ${episode.slug} ${state}`);
}

if (!check) {
  rmSync(TARGET, { recursive: true, force: true });
  for (const episode of published) {
    const dir = join(TARGET, episode.slug);
    mkdirSync(dir, { recursive: true });
    for (const page of episode.pages) for (const file of pageFiles(episode, page)) cpSync(file, join(dir, file.split(/[\\/]/).pop()));
  }
  console.log(`[yeongnyangi-serial] ${published.length} episode(s) copied at ${now.toISOString()}`);
}

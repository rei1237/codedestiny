#!/usr/bin/env node
/**
 * 셸 마케팅 카피 → `lib/marketing/feature-marketing-copy.generated.json`
 *
 * 왜 필요한가: 상세 시트 카피의 정본은 정적 셸 index.html 의 `FEATURE_MARKETING_COPY` 인데,
 * App Router 쪽 소비자(허브 상세 모달·초융합 가치 미리보기)는 셸을 읽을 수 없어 지금까지
 * **손으로 베낀 사본**을 들고 있었다. 그래서 카피가 세 갈래로 갈렸다. 이 스크립트가 정본을
 * 기계로 옮겨 그 손사본을 없앨 재료를 만든다.
 *
 * 산출물은 커밋한다 — 런타임(Cloudflare Workers/Pages)에는 index.html 을 파싱할 자리가 없다.
 * 신선도는 `__tests__/ui/feature-marketing-copy-generated.static.test.js` 가 매 PR 에서 문다.
 *
 * 사용: npm run sync:marketing-copy   (`sync:public` 이 체인으로 함께 돌린다)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

import {
  GENERATED_COPY_PATH,
  buildFeatureMarketingCopy,
  readShellHtml,
  serializeFeatureMarketingCopy,
} from "./lib/feature-marketing-extract.mjs";

const data = buildFeatureMarketingCopy(readShellHtml());

const itemCount = Object.keys(data.items).length;
const templateCount = Object.keys(data.templates).length;
const categoryCount = Object.keys(data.categoryKeyByKo).length;
const trustCount = data.trustNotes.paid.length + data.trustNotes.free.length;

// fail-closed: 추출이 깨지면 빈 JSON 을 커밋해 소비자를 조용히 비우는 대신 여기서 멈춘다.
if (!itemCount || !templateCount || !categoryCount || !trustCount) {
  console.error(
    `[sync:marketing-copy] 추출이 비었습니다(항목 ${itemCount} / 템플릿 ${templateCount} / ` +
    `카테고리 표기 ${categoryCount} / 신뢰 문구 ${trustCount}) — index.html 의 ` +
    "FEATURE_MARKETING_COPY 구조가 바뀌었는지 확인하세요.",
  );
  process.exit(1);
}

mkdirSync(dirname(GENERATED_COPY_PATH), { recursive: true });
writeFileSync(GENERATED_COPY_PATH, serializeFeatureMarketingCopy(data), "utf8");

const shown = relative(resolve(process.cwd()), GENERATED_COPY_PATH).split("\\").join("/");
console.log(
  `[sync:marketing-copy] OK — 항목 ${itemCount}개 / 템플릿 ${templateCount}종 / ` +
  `카테고리 표기 ${categoryCount}종 / 신뢰 문구 ${trustCount}줄 → ${shown}`,
);

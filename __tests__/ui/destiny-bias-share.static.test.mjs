// 최애운명 공유 카드·랜딩 정적 계약: 공유물에 생일이 들어갈 경로가 없고, 랜딩은 noindex 다.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const card = read("app/saju/destiny-bias/components/chemi/ChemiShareCard.tsx");
const landing = read("app/saju/destiny-bias/share/ShareLandingClient.tsx");
const page = read("app/saju/destiny-bias/share/page.tsx");
const client = read("app/saju/destiny-bias/DestinyBiasClient.tsx");

test("공유 카드 DOM 은 생일·명식 필드를 참조하지 않는다", () => {
  assert.doesNotMatch(card, /birth|pillars|inputHash/i);
  assert.match(card, /SHARE_CARD_WIDTH = 1080/);
  assert.match(card, /square: 1080, story: 1920/);
  assert.match(card, /닉네임 숨기기/);
});

test("공유 랜딩은 공개 요약만 그리고 두 CTA 를 가진다", () => {
  assert.doesNotMatch(landing, /birth|pillars|signals/i);
  assert.match(landing, /\^dbs_\[A-Za-z0-9_-\]\{24,80\}\$/);
  assert.match(landing, /같은 아이돌과 내 케미 확인하기/);
  assert.match(landing, /내 최애 선택하기/);
  assert.doesNotMatch(landing, /useSearchParams\(|from "next\/navigation"/);
});

test("공유 랜딩 페이지는 noindex 이고 정적 OG 를 쓴다", () => {
  assert.match(page, /robots: \{ index: false, follow: false \}/);
  assert.match(page, /og-default-1200x630\.png/);
});

test("공유 링크·초대 링크 URL 에 생일이 실리지 않는다", () => {
  const urlBuilders = client.match(/function (buildInviteUrl|withShareUtm)[\s\S]*?\n}/g) || [];
  assert.equal(urlBuilders.length, 2);
  for (const source of urlBuilders) assert.doesNotMatch(source, /birth/i);
  assert.match(client, /credentials: "omit"/);
  assert.match(client, /\/api\/destiny-bias\/share/);
});

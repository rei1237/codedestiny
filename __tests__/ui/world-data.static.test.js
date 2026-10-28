/**
 * /world 인물·장소·이야기 지도 데이터 가드.
 *  - 인물·장소 이미지가 모두 실제 public 파일인지 (깨진 이미지 = 빈 카드)
 *  - 인물 id 가 겹치지 않고 그룹이 비지 않는지 (#앵커 중복 방지)
 *  - 보이는 문구와 페이지 소스(주석 제외)에 영구 금지 이름·후반 스포일러가 없는지
 *  - 이야기 지도가 1부 끝과 2부 초입까지만 있는지
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const toDataUrl = (source) => `data:text/javascript;base64,${Buffer.from(source, "utf8").toString("base64")}`;
const publicFile = (src) => path.join(root, "public", src.replace(/^\//, ""));
// 주석 안의 금지어 설명은 제외하고, 사용자에게 나가는 문자열만 본다.
const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const FORBIDDEN_EXTRA = ["박지은", "박병하", "무성", "乙庚合", "흑월 소멸", "청토끼 퇴장", "서한비 개심", "무성=까마귀"];

async function loadWorld() {
  return import(toDataUrl(read("app/world/world-data.js")));
}

async function loadForbiddenNames() {
  const { FORBIDDEN_STORY_NAMES } = await import(pathToFileURL(path.join(root, "scripts/lib/novel-constraints.mjs")).href);
  return FORBIDDEN_STORY_NAMES;
}

test("인물·장소 이미지는 모두 실제 public 파일이고 대체 텍스트가 있다", async () => {
  const { CHARACTER_GROUPS, PLACES } = await loadWorld();
  const characters = CHARACTER_GROUPS.flatMap((group) => group.characters);
  assert.equal(characters.length, 11);
  for (const character of characters) {
    assert.ok(fs.existsSync(publicFile(character.portrait)), `${character.id} 초상 파일이 없다: ${character.portrait}`);
    assert.ok(character.alt, `${character.id} alt 가 비었다`);
    assert.ok(character.caption, `${character.id} caption 이 비었다`);
  }
  for (const place of PLACES) {
    assert.ok(fs.existsSync(publicFile(place.image)), `${place.name} 이미지 파일이 없다: ${place.image}`);
    assert.ok(place.alt, `${place.name} alt 가 비었다`);
  }
});

test("인물 그룹은 비지 않고 인물 id 는 전부 다르다", async () => {
  const { CHARACTER_GROUPS } = await loadWorld();
  for (const group of CHARACTER_GROUPS) {
    assert.ok(group.characters.length > 0, `${group.id} 그룹이 비었다`);
  }
  const ids = CHARACTER_GROUPS.flatMap((group) => group.characters.map((character) => character.id));
  assert.equal(new Set(ids).size, ids.length, "인물 id 가 겹친다");
});

test("보이는 문구와 페이지 소스에 영구 금지 이름과 후반 스포일러 문구가 없다", async () => {
  const world = await loadWorld();
  const forbidden = [...(await loadForbiddenNames()), ...FORBIDDEN_EXTRA];
  const visible = JSON.stringify({ groups: world.CHARACTER_GROUPS, places: world.PLACES, story: world.STORY_MAP });
  const pageSource = stripComments(read("app/world/page.js"));
  for (const word of forbidden) {
    assert.ok(!visible.includes(word), `world-data 문구에 금지어가 있다: ${word}`);
    assert.ok(!pageSource.includes(word), `page.js 에 금지어가 있다: ${word}`);
  }
});

test("이야기 지도는 1부 끝과 2부 초입까지만 담는다", async () => {
  const { STORY_MAP } = await loadWorld();
  assert.deepEqual(
    STORY_MAP.map((part) => part.part),
    ["1부 · 사주의 세계", "2부 · 돌아온 방"],
  );
  assert.equal(STORY_MAP[1].stops.length, 1, "2부는 초입 장소 하나만 다룬다");
});

test("검은 호랑이는 원본 이미지로 표시하고 정체를 노출하지 않는다", async () => {
  const { CHARACTER_GROUPS } = await loadWorld();
  const characters = CHARACTER_GROUPS.flatMap((group) => group.characters);
  const tiger = characters.find((character) => character.name === "의문의 검은 호랑이");
  assert.ok(tiger);
  assert.equal(tiger.portrait, "/images/novel/hanbi/base.webp");
  assert.ok(!JSON.stringify(characters).includes("서한비"));
  const seo = read("lib/seo/siteSeo.ts").match(/keywords: \[([^\]]*검은 호랑이[^\]]*)\]/);
  assert.ok(seo);
  assert.ok(!seo[0].includes("서한비"));
});

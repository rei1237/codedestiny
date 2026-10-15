/**
 * 전문가 상담 캐릭터 데이터(윤달·무성·서한비·연이) 가드.
 *  - 모든 mood·히어로·깃털 컷 경로가 실제 public 파일인지 (깨진 이미지 = 빈 무대)
 *  - 사용자에게 보이는 문구에 "박지은"·"궁합 사기꾼"이 없는지 (영구 금지)
 *  - 제외한 스프라이트(공망 스포일러·악역기·조종당하던 시기 표정·호랑이 hanbi 폴더)를 쓰지 않는지
 *  - 무성(미성년)에 외모·친밀감 문구가 없는지
 *
 * 레포 Jest 에는 TS 프리셋이 없다. node 24 타입 스트리핑으로 실제 소스를 실행해 값으로 본다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { stripTypeScriptTypes } = require("node:module");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const toDataUrl = (source) => `data:text/javascript;base64,${Buffer.from(source, "utf8").toString("base64")}`;
const strip = (relativePath) => stripTypeScriptTypes(read(relativePath), { mode: "strip" });

// 테스트 환경엔 CMS 발행본이 없으므로 "항상 원문" 대역이 실제 동작과 같다.
const CMS_STUB = toDataUrl("export function cmsText(_ns, _key, _field, fallback) { return fallback; }\n");

function rewrite(source, rewrites, label) {
  let next = source;
  for (const [specifier, replacement] of Object.entries(rewrites)) {
    const before = next;
    next = next.split(`"${specifier}"`).join(`"${replacement}"`);
    assert.notEqual(next, before, `${label}: import "${specifier}" 를 못 찾았다 — 하네스를 고칠 것`);
  }
  return next;
}

async function loadCharacters() {
  const lines = toDataUrl(rewrite(strip("src/features/expert-characters/lines.ts"), { "@/lib/cms/build-text": CMS_STUB }, "lines.ts"));
  const load = (key) => import(toDataUrl(rewrite(strip(`src/features/expert-characters/${key}.ts`), { "./lines": lines }, `${key}.ts`)));
  const [yun, musung, hanbi, yeoni] = await Promise.all([load("yun"), load("musung"), load("hanbi"), load("yeoni")]);
  return { yun: yun.yunCharacter, musung: musung.musungCharacter, hanbi: hanbi.hanbiCharacter, yeoni: yeoni.yeoniCharacter, featherStages: musung.MUSUNG_FEATHER_STAGES };
}

const KEYS = ["yun", "musung", "hanbi", "yeoni"];
const MOODS = ["idle", "greet", "thinking", "reveal", "caution", "comfort", "error", "empty"];
const publicFile = (src) => path.join(root, "public", src.replace(/^\//, ""));

function allSprites(character) {
  return [...MOODS.map((mood) => character.moods[mood]), character.hero, ...(character.talkFrames || [])];
}

function visibleText(character) {
  return [
    character.name.ko, character.name.en, character.title.ko, character.title.en,
    ...allSprites(character).map((sprite) => sprite.alt),
    ...Object.values(character.lines).map((line) => line.text),
    ...Object.values(character.linesEn),
  ].join("\n");
}

test("캐릭터마다 mood·히어로·말하기·깃털 컷이 모두 실제 파일이다", async () => {
  const characters = await loadCharacters();
  for (const key of KEYS) {
    const character = characters[key];
    assert.equal(character.key, key);
    for (const mood of MOODS) assert.ok(character.moods[mood], `${key}: mood "${mood}" 스프라이트가 없다`);
    for (const sprite of allSprites(character)) {
      assert.ok(sprite.alt.trim(), `${key}: ${sprite.src} 대체 텍스트가 비었다`);
      assert.ok(fs.existsSync(publicFile(sprite.src)), `${key}: ${sprite.src} 파일이 없다`);
    }
  }
  assert.equal(characters.featherStages.length, 3);
  for (const stage of characters.featherStages) assert.ok(fs.existsSync(publicFile(stage.src)), `${stage.src} 파일이 없다`);
});

test("대사 표: 모든 대사에 영어가 있고 mood 가 유효하다", async () => {
  const characters = await loadCharacters();
  for (const key of KEYS) {
    const { lines, linesEn } = characters[key];
    assert.ok(lines.hero, `${key}: hero 대사가 없다 — getExpertLine 의 대체 줄이다`);
    for (const [id, line] of Object.entries(lines)) {
      assert.equal(line.id, id);
      assert.ok(MOODS.includes(line.mood), `${key}:${id} mood "${line.mood}" 가 없다`);
      assert.ok(String(linesEn[id] || "").trim(), `${key}:${id} 영어 대사가 없다`);
    }
  }
});

test("금지 이름·원작 비하 표현이 사용자 문구에 없다", async () => {
  const characters = await loadCharacters();
  for (const key of KEYS) {
    const text = visibleText(characters[key]);
    for (const banned of ["박지은", "궁합 사기꾼", "Park Ji-eun", "Park Jieun"]) assert.ok(!text.includes(banned), `${key}: "${banned}" 노출`);
  }
  assert.equal(characters.hanbi.name.ko, "서한비");
});

test("제외한 스프라이트를 쓰지 않는다", async () => {
  const characters = await loadCharacters();
  const srcs = (key) => [...allSprites(characters[key]), ...(key === "musung" ? characters.featherStages : [])].map((sprite) => sprite.src);
  for (const src of srcs("yun")) assert.ok(!/\/(void|pain)\.webp$/.test(src), `윤달: 제외 스프라이트 ${src}`);
  for (const src of srcs("musung")) {
    assert.ok(!src.includes("/crow/"), `무성: 악역 형태 ${src}`);
    assert.ok(!/\/mu-0?(2|4|6)\.webp$/.test(src), `무성: 조종당하던 시기 표정 ${src}`);
  }
  for (const src of srcs("hanbi")) {
    assert.ok(!src.includes("/novel/hanbi/"), `서한비: novel/hanbi 는 호랑이 캐릭터다 — ${src}`);
    assert.ok(!/박지은|\/(angry|cry)\.webp$/.test(src), `서한비: 제외 스프라이트 ${src}`);
  }
  // 연이(손금)는 소설 캐주얼 연이만 쓴다 — 찻집 한복 버전·돼지 폼·상담에 안 맞는 표정은 제외.
  for (const src of srcs("yeoni")) {
    assert.ok(src.startsWith("/images/expert-characters/yeoni/"), `연이: 손금용으로 정규화한 컷이 아니다 — ${src}`);
    assert.ok(!/teahouse|pig/.test(src), `연이: 찻집·돼지 폼 ${src}`);
    assert.ok(!/\/(angry|cry|fear|sleep|onigiri|disappoint)\.webp$/.test(src), `연이: 제외 스프라이트 ${src}`);
  }
});

test("무성(미성년)에는 외모·친밀감 문구가 없다", async () => {
  const { musung } = await loadCharacters();
  const text = visibleText(musung);
  for (const banned of ["미소년", "꽃미남", "잘생", "귀여", "자기야", "오빠", "handsome", "cute", "pretty boy"]) {
    assert.ok(!text.toLowerCase().includes(banned.toLowerCase()), `무성: "${banned}" 노출`);
  }
});

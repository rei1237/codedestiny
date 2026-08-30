/**
 * 🔴 네오 작전실 "01 분석 방식" 카드의 상세 블록 로케일 정합성 가드.
 *
 * 선택한 카드가 펼쳐지면 detailBody(소개 문단)와 calculableData(계산 항목 칩)가 나온다.
 * 둘 다 로케일 표에 손으로 저작하는 값이라, 새 방식을 넣거나 표를 고칠 때 조용히 새는 자리가 셋이다.
 *  ① 로케일 표에 mode 를 빠뜨리면 getLocalizedNeoWarRoomMethodRegistry 의 스프레드가 undefined 를
 *     펼쳐 **한국어가 그대로 노출**된다(에러 없이 통과한다).
 *  ② calculableData 배열 길이가 로케일마다 다르면 언어별로 칩 개수 = 정보량이 달라진다.
 *  ③ detailBody 를 복붙하면 네 방식의 설명이 같아져 카드를 펼치는 의미가 사라진다.
 * 화면 렌더가 아니라 이 데이터 계약을 못 박는다.
 *
 * 레포 Jest 에는 TS 프리셋이 없어 이 모듈을 임포트할 수 없다. node 의 타입 스트리핑으로
 * 실제 소스를 그대로 실행한다(하네스는 neo-war-room-partner-input.test.js 와 같은 방식).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { stripTypeScriptTypes } = require("node:module");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

function toDataUrl(source) {
  return `data:text/javascript;base64,${Buffer.from(source, "utf8").toString("base64")}`;
}

/** .ts 를 타입만 벗겨 data: 모듈로 만든다. data URL 은 상대 경로를 못 푸므로 지정자도 갈아 끼운다. */
function loadTsModule(relativePath, rewrites = {}) {
  let source = stripTypeScriptTypes(read(relativePath), { mode: "strip" });
  for (const [specifier, replacement] of Object.entries(rewrites)) {
    const before = source;
    source = source.split(`"${specifier}"`).join(`"${replacement}"`);
    assert.notEqual(source, before, `${relativePath}: import "${specifier}" 를 못 찾았다 — 하네스를 고칠 것`);
  }
  return import(toDataUrl(source));
}

// 자산 URL 헬퍼는 이 가드와 무관하다. 원본 경로를 그대로 돌려주는 스텁으로 세운다.
const R2_URL_STUB = toDataUrl("export function getAssetUrlFromPublicPath(value) { return value; }\n");

function loadRegistry() {
  const assets = toDataUrl(
    stripTypeScriptTypes(read("src/features/neo-war-room/data/assets.ts"), { mode: "strip" })
      .split('"@/lib/r2-public-url"')
      .join(`"${R2_URL_STUB}"`),
  );
  return loadTsModule("src/features/neo-war-room/data/method-registry.ts", { "./assets": assets });
}

const AUTHORED_LOCALES = ["en", "ja", "zh-CN", "zh-TW"];

test("ko 상세 문단은 방식마다 다른 내용이어야 한다", async () => {
  const { neoWarRoomMethodRegistry } = await loadRegistry();
  assert.ok(neoWarRoomMethodRegistry.length >= 4, "방식이 4개 미만이다 — 레지스트리가 줄었으면 가드도 확인할 것");

  const seen = new Map();
  for (const item of neoWarRoomMethodRegistry) {
    assert.ok(item.detailBody && item.detailBody.trim().length >= 40, `${item.mode}: detailBody 가 비었거나 너무 짧다`);
    assert.ok(Array.isArray(item.calculableData) && item.calculableData.length > 0, `${item.mode}: calculableData 가 비었다`);
    // 칩은 값 자체를 React key 로 쓴다. 중복이 있으면 같은 key 두 개가 나간다.
    assert.equal(
      new Set(item.calculableData).size,
      item.calculableData.length,
      `${item.mode}: calculableData 에 중복 항목이 있다 — 칩의 React key 가 충돌한다`,
    );
    const duplicateOf = seen.get(item.detailBody);
    assert.equal(duplicateOf, undefined, `${item.mode}: detailBody 가 ${duplicateOf} 와 같다 — 복붙된 설명은 카드를 펼치는 의미가 없다`);
    seen.set(item.detailBody, item.mode);
  }
});

test("저작 로케일 4개는 상세 블록이 번역돼 있고 칩 개수가 ko 와 같다", async () => {
  const { neoWarRoomMethodRegistry, getLocalizedNeoWarRoomMethodRegistry } = await loadRegistry();
  const koByMode = new Map(neoWarRoomMethodRegistry.map((item) => [item.mode, item]));

  for (const locale of AUTHORED_LOCALES) {
    const localized = getLocalizedNeoWarRoomMethodRegistry(locale);
    assert.equal(localized.length, neoWarRoomMethodRegistry.length, `${locale}: 방식 개수가 ko 와 다르다`);

    for (const item of localized) {
      const ko = koByMode.get(item.mode);
      assert.ok(ko, `${locale}: ko 에 없는 mode ${item.mode}`);
      assert.notEqual(
        item.detailBody,
        ko.detailBody,
        `${locale}/${item.mode}: detailBody 가 ko 원문 그대로다 — 로케일 표에 항목이 빠졌을 때 스프레드가 조용히 한국어를 흘린다`,
      );
      assert.ok(item.detailBody && item.detailBody.trim().length >= 40, `${locale}/${item.mode}: detailBody 가 비었거나 너무 짧다`);
      assert.equal(
        item.calculableData.length,
        ko.calculableData.length,
        `${locale}/${item.mode}: 계산 항목 칩 개수가 ko(${ko.calculableData.length}) 와 다르다`,
      );
      assert.equal(
        new Set(item.calculableData).size,
        item.calculableData.length,
        `${locale}/${item.mode}: calculableData 에 중복 항목이 있다`,
      );
    }
  }
});

test("저작하지 않은 로케일은 en 으로 대신한다", async () => {
  const { getLocalizedNeoWarRoomMethodRegistry } = await loadRegistry();
  const es = getLocalizedNeoWarRoomMethodRegistry("es");
  const en = getLocalizedNeoWarRoomMethodRegistry("en");
  assert.deepEqual(
    es.map((item) => [item.mode, item.detailBody, item.calculableData]),
    en.map((item) => [item.mode, item.detailBody, item.calculableData]),
    "미저작 로케일이 en 폴백을 못 받는다 — 한국어가 새는 경로다",
  );
});

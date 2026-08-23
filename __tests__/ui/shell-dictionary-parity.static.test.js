const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

/**
 * 정적 셸의 번역 마커와 `public/i18n/ko.json` 이 같은 문구를 가리키는지 확인한다.
 *
 * 🔴 왜 이 가드가 있는가: `js/cd-lang-native.js` 는 `lang === 'ko'` 일 때 사전을 건너뛰고
 * 마크업 원문을 복원한다. 그래서 **셸 마크업이 정본이고 ko.json 은 사실상 안 읽힌다** —
 * 셸 문구를 고치고 사전을 안 고치면 한국어 화면만 멀쩡하고 나머지 11개 로케일이 옛 문구를
 * 계속 낸다. 에러도 없고 테스트도 안 깨진다. 2026-08-24 실측으로 그렇게 쌓인 드리프트가
 * 85건이었고, 그중에는 10,000원 해금 타일을 다른 서비스 이름으로 설명하던 4키와,
 * '범위 밖 단건결제' 자리에 '카카오톡 공유 보상' 을 내던 키가 있었다.
 *
 * 게다가 postbuild 의 `prerender-locale-shell-translations.mjs` 가 사전 값을
 * `dist/{en,ja,zh,zh-tw}/index.html` 에 정적으로 굽기 때문에 크롤러에도 옛 문구가 나간다.
 *
 * 판정 규칙: 마커가 가리키는 키의 ko 값은 **그 키가 셸에서 실제로 감싸고 있는 원문 중 하나와
 * 같아야** 한다. 같은 키가 서로 다른 원문 두 곳에 붙은 경우가 실제로 있어(예:
 * `home.hero2.primaryCta` 는 히어로 CTA 와 스티키 CTA 에 서로 다른 문구로 붙어 있다)
 * 정확히 하나로 못 박지 않는다 — 다만 **어느 쪽과도 다르면** 드리프트다.
 *
 * fail-closed: 마커를 못 찾으면(셸 구조 변경·마커 유실) 빈 루프로 통과하지 않고 실패한다.
 */

const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const norm = (value) => value.replace(/\s+/g, " ").trim();

function lookup(dict, key) {
  let node = dict;
  for (const part of key.split(".")) {
    if (node == null || typeof node !== "object") return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

/** key → 셸에서 그 키가 감싸는 원문들 */
function collectMarkers() {
  const document = new JSDOM(read("index.html")).window.document;
  const texts = new Map();
  const attrs = new Map();
  const add = (map, key, value) => {
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(norm(value));
  };

  for (const node of document.querySelectorAll("[data-cd-trans]")) {
    // 마커는 두 형태다: data-cd-trans="키" 또는 값 없는 data-cd-trans + data-key="키"
    const key = node.getAttribute("data-cd-trans") || node.getAttribute("data-key") || "";
    if (key) add(texts, key, node.textContent || "");
  }

  for (const node of document.querySelectorAll("[data-cd-trans-attr]")) {
    // 한 요소에 여러 속성이 걸릴 수 있다: "aria-label:키A, data-img-alt:키B"
    for (const part of (node.getAttribute("data-cd-trans-attr") || "").split(",")) {
      const [attr, key] = part.trim().split(":");
      if (!attr || !key) continue;
      const value = node.getAttribute(attr.trim());
      if (value != null) add(attrs, key.trim(), value);
    }
  }

  return { texts, attrs };
}

const { texts, attrs } = collectMarkers();
const ko = JSON.parse(read("public/i18n/ko.json"));

test("셸 텍스트 마커를 전수 발견한다", () => {
  assert.ok(
    texts.size >= 1000,
    `index.html 의 data-cd-trans 마커가 ${texts.size}개뿐이다 — 마커가 유실됐거나 셀렉터가 셸 구조를 못 따라가고 있다`,
  );
});

test("셸 속성 마커를 전수 발견한다", () => {
  assert.ok(
    attrs.size >= 200,
    `index.html 의 data-cd-trans-attr 마커가 ${attrs.size}개뿐이다 — 마커가 유실됐거나 셀렉터가 셸 구조를 못 따라가고 있다`,
  );
});

test("마커가 가리키는 키는 ko.json 에 있다", () => {
  const missing = [];
  for (const key of [...texts.keys(), ...attrs.keys()]) {
    if (lookup(ko, key) === undefined) missing.push(key);
  }
  assert.deepEqual(
    missing,
    [],
    `ko.json 에 없는 마커 키 ${missing.length}개 — 비-ko 로케일은 이 키에서 "Translation pending" 을 낸다`,
  );
});

test("ko.json 값이 셸 마크업 문구와 같다", () => {
  const drift = [];
  for (const [kind, map] of [["텍스트", texts], ["속성", attrs]]) {
    for (const [key, markups] of map) {
      const value = lookup(ko, key);
      if (value === undefined) continue; // 위 테스트가 따로 잡는다
      if (markups.has(norm(value))) continue;
      drift.push(`${kind} ${key}\n    셸  : ${[...markups].join(" | ")}\n    사전: ${norm(value)}`);
    }
  }
  assert.deepEqual(
    drift,
    [],
    `셸 마크업과 ko.json 이 어긋난 키 ${drift.length}개.\n` +
      `한국어는 사전을 건너뛰므로 화면에는 안 보이지만 나머지 11개 로케일이 옛 문구를 낸다.\n` +
      `i18n/authored/shellCopy-*.json 에 키를 넣고 ` +
      `node scripts/i18n-merge-authored.mjs --namespace shellCopy --core 로 반영할 것.\n\n` +
      drift.join("\n"),
  );
});

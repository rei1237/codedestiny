/**
 * 출생 기반 해금 키의 클라이언트 사본(js/core/birth-scope-unlocks.js)이 서버 정본
 * (worker/lib/paid-feature-registry.js)과 같은지 고정한다.
 *
 * 왜 필요한가: 셸·엔진은 이 사본으로 "어느 키를 계정 단위 localStorage 에서 빼고 프로필 단위로만
 * 다룰지"를 정한다. 서버에 키가 추가됐는데 사본이 낡으면 그 키는 계정 전체에 다시 새어 나간다.
 *
 * 확인하는 것:
 *   ① 파일 텍스트의 CD_BIRTH_SCOPED_UNLOCK_KEYS 배열 = 서버 BIRTH_SCOPED_UNLOCK_FEATURE_KEYS (순서 무관)
 *   ② 파일 텍스트의 별칭 표 = 서버 PAID_FEATURE_KEY_ALIASES 중 정규 키가 출생 기반인 항목
 *   ③ 실행 판정 cdIsBirthScopedUnlockKey 가 서버 isBirthScopedUnlockFeatureKey 와 같은 답을 낸다
 *      (출생 키·계정 키·별칭·`:` 접미사·public 사본)
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  ACCOUNT_SCOPED_UNLOCK_FEATURE_KEYS,
  BIRTH_SCOPED_UNLOCK_FEATURE_KEYS,
  PAID_FEATURE_KEY_ALIASES,
  isBirthScopedUnlockFeatureKey,
} from "../worker/lib/paid-feature-registry.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLIENT_FILE = "js/core/birth-scope-unlocks.js";
const require = createRequire(import.meta.url);

function readText(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function extractBlock(text, marker, open, close) {
  const start = text.indexOf(marker);
  assert.ok(start >= 0, `${CLIENT_FILE}: ${marker} not found`);
  const from = text.indexOf(open, start);
  const to = text.indexOf(close, from);
  assert.ok(from >= 0 && to > from, `${CLIENT_FILE}: ${marker} block is not parseable`);
  return text.slice(from + open.length, to);
}

function parseStringList(block) {
  return [...block.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

function parseAliasMap(block) {
  const result = {};
  for (const match of block.matchAll(/(?:"([^"]+)"|([A-Za-z_$][\w$]*))\s*:\s*"([^"]+)"/g)) {
    result[match[1] || match[2]] = match[3];
  }
  return result;
}

function sorted(list) {
  return [...list].sort();
}

function checkFile(rel) {
  const text = readText(rel);
  const clientKeys = parseStringList(extractBlock(text, "var CD_BIRTH_SCOPED_UNLOCK_KEYS = Object.freeze(", "[", "]);"));
  assert.equal(new Set(clientKeys).size, clientKeys.length, `${rel}: duplicate birth-scoped key`);
  assert.deepEqual(sorted(clientKeys), sorted(BIRTH_SCOPED_UNLOCK_FEATURE_KEYS), `${rel}: birth-scoped key list drifted from worker/lib/paid-feature-registry.js`);

  const clientAliases = parseAliasMap(extractBlock(text, "var CD_BIRTH_SCOPED_UNLOCK_KEY_ALIASES = Object.freeze(", "{", "});"));
  const serverAliases = Object.fromEntries(
    Object.entries(PAID_FEATURE_KEY_ALIASES).filter(([alias]) => isBirthScopedUnlockFeatureKey(alias)),
  );
  assert.deepEqual(clientAliases, serverAliases, `${rel}: birth-scoped alias table drifted from PAID_FEATURE_KEY_ALIASES`);

  const api = require(path.join(ROOT, rel));
  const probes = [
    ...BIRTH_SCOPED_UNLOCK_FEATURE_KEYS,
    ...ACCOUNT_SCOPED_UNLOCK_FEATURE_KEYS,
    ...Object.keys(PAID_FEATURE_KEY_ALIASES),
    ...BIRTH_SCOPED_UNLOCK_FEATURE_KEYS.map((key) => `${key}:2027`),
    "section_summary:",
    "music-track-001",
    "love-code",
    "",
  ];
  for (const probe of probes) {
    assert.equal(
      api.cdIsBirthScopedUnlockKey(probe),
      isBirthScopedUnlockFeatureKey(probe),
      `${rel}: cdIsBirthScopedUnlockKey(${JSON.stringify(probe)}) disagrees with the server`,
    );
  }
  for (const key of ACCOUNT_SCOPED_UNLOCK_FEATURE_KEYS) {
    assert.equal(api.cdIsBirthScopedUnlockKey(key), false, `${rel}: account key ${key} must stay account scoped`);
  }
}

checkFile(CLIENT_FILE);
const publicCopy = path.join("public", CLIENT_FILE);
if (fs.existsSync(path.join(ROOT, publicCopy))) checkFile(publicCopy);

console.log(`[verify-birth-scope-client-mirror] OK (${BIRTH_SCOPED_UNLOCK_FEATURE_KEYS.length} birth-scoped keys)`);

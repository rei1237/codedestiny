/* 바닐라 셸용 CMS 오버라이드 리더.
 *
 * 왜 필요한가: 숙요 27수 해설·자미두수 기본 명반처럼 사용자가 가장 많이 읽는 해설이
 * index.html + js/* 바닐라 셸 안에 `var X = {...}` 최상위 상수로 들어 있다. React 쪽
 * cmsText/cmsLines(빌드타임 정적 import)도, useCmsCopy(React 훅)도 여기선 쓸 수 없다.
 *
 * 그래서 빌드가 구워 둔 정적 JSON 한 장(/cms-static-overrides.json — 발행분만이라 보통 수 KB)을
 * 셸 부팅 때 한 번 받아 두고, 소비 지점은 동기 접근자 하나만 호출한다.
 *
 * 🔴 폴백 우선: 아직 안 왔거나 조회가 실패하면 호출부가 넘긴 기본값을 그대로 돌려준다.
 *    화면이 비지 않고, 네트워크를 기다리느라 렌더가 밀리지도 않는다.
 * 🔴 지연 장치를 겹치지 않는다: 이 파일은 셸의 기존 지연 로딩 체계(data-cd-lazy-src)에
 *    등록만 하고 자체 IntersectionObserver 같은 새 계층을 만들지 않는다(코딩 원칙 6).
 */
(function () {
  "use strict";

  if (window.__cdCmsStaticReady) return;
  window.__cdCmsStaticReady = true;

  var SOURCE_URL = "/cms-static-overrides.json";
  var entries = null; // { ns: { key: { field: value } } }

  function load() {
    try {
      fetch(SOURCE_URL, { credentials: "omit" })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (data) {
          var next = data && data.entries;
          if (next && typeof next === "object") entries = next;
        })
        .catch(function () { /* 오버라이드 없음 = 코드 기본값 사용 */ });
    } catch (e) {
      /* fetch 자체가 막힌 환경 — 기본값으로 동작 */
    }
  }

  function readField(ns, key, field) {
    if (!entries) return undefined;
    var group = entries[ns];
    if (!group) return undefined;
    var item = group[key];
    if (!item || typeof item !== "object") return undefined;
    return item[field];
  }

  /** 단일 문구. 값이 없거나 비어 있으면 fallback. */
  window.__cdCmsText = function (ns, key, field, fallback) {
    var value = readField(ns, key, field);
    return typeof value === "string" && value.trim() ? value : fallback;
  };

  /**
   * 표 형태 해설의 한 칸. lib/cms/build-text.ts 의 cmsRecord 와 같은 규칙이다
   * (엔트리 하나가 `{ recordKey: { field: text } }` 를 담고, 없는 칸은 기본값 유지).
   */
  window.__cdCmsRecord = function (ns, key, recordKey, field, fallback) {
    // record 네임스페이스는 필드가 `record` 하나뿐이고 그 안에 표가 들어 있다.
    var table = readField(ns, key, "record");
    if (!table || typeof table !== "object") return fallback;
    var row = table[String(recordKey)];
    if (!row || typeof row !== "object") return fallback;
    var value = row[field];
    return typeof value === "string" && value.trim() ? value : fallback;
  };

  /** 오버라이드 전체가 도착했는지. 진단용. */
  window.__cdCmsLoaded = function () { return entries !== null; };

  load();
})();

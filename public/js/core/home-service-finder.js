/**
 * 홈 통합 운세 탐색 엔진 (cd-home-service-finder-v20260819)
 *
 * 이 파일 하나가 홈의 서비스 탐색 두 지점을 모두 구동한다. 예전에는 각각 자기 데이터와
 * 자기 필터 로직을 따로 들고 있었다.
 *   - 운명의 문 디스커버(#fortuneGatewayDiscover): 인라인 SVC 30개 + 자체 필터
 *   - 전체 서비스 인덱스(#cdServiceIndex): DOM 스크래핑 + 검색만, **필터 칩 15개는 배선이 없어
 *     눌러도 아무 일도 일어나지 않았다**(2026-08-19 실측 — 저장소 전체에 data-fpurpose 를 읽는
 *     JS 가 0건이었다). 이 파일이 그 칩을 살린다.
 *
 * 🔴 DOM 스크래핑을 없애지 말 것. 레지스트리(js/core/service-registry.js)는 큐레이션된
 *    30여 개뿐이고, 컬렉션 타일 수백 개의 검색 커버리지는 스크래핑에만 있다. 두 결과를
 *    **병합**한다 — 태그를 가진 레지스트리 항목만 필터 대상이 되고, 스크래핑 항목은
 *    검색어 매칭 전용이다.
 *
 * 🔴 innerHTML 을 쓰지 않는다. 이전 게이트웨이 렌더러의 esc() 는 '&'→'&' 처럼 항등 매핑이라
 *    사실상 이스케이프가 아니었다. 노드를 직접 만들면 그 함정 자체가 없어진다.
 */
(function () {
  "use strict";

  var REGISTRY = window.__cdServiceRegistry || [];

  var PURPOSE_LABEL = {
    love: { label: "연애", emoji: "❤️" },
    money: { label: "재물", emoji: "💰" },
    career: { label: "직업", emoji: "💼" },
    family: { label: "가족/가정", emoji: "🏠" },
    life: { label: "인생", emoji: "🧭" },
    today: { label: "오늘", emoji: "🌙" },
    compatibility: { label: "궁합", emoji: "💕" },
    self: { label: "나 자신", emoji: "🔮" },
    etc: { label: "기타", emoji: "🎯" }
  };

  function norm(value) {
    return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  /* 가격 문자열 → 가격대 버킷. scripts/verify-home-service-registry.mjs 의 readPrice() 와
     같은 경계를 쓴다. 한쪽만 고치면 필터와 가드가 갈라진다. */
  function bucketOf(price) {
    var text = String(price || "").replace(/,/g, "").replace(/\s/g, "");
    if (/무료/.test(text)) return "free";
    if (text === "이용권") return "vvip";
    var m = text.match(/(\d{3,7})원/);
    if (!m) return "vvip";
    var won = Number(m[1]);
    if (won < 2000) return "low";
    if (won < 4000) return "mid";
    if (won < 8000) return "high";
    if (won < 20000) return "premium";
    return "vvip";
  }

  /* ── 레지스트리 정규화 ──────────────────────────────────────── */
  var CURATED = REGISTRY.map(function (item) {
    return {
      name: item.name,
      desc: item.desc || "",
      href: item.href || "",
      action: item.action || "",
      collection: "",
      price: item.price || "",
      bucket: bucketOf(item.price),
      purposes: item.purposes || [],
      methods: item.methods || [],
      badge: item.badge || "",
      tagged: true,
      hay: norm([item.name, item.desc, item.price, item.keys].join(" "))
    };
  });

  /* ── DOM 스크래핑 (태그 없음 · 검색 전용) ───────────────────── */
  var TILE_SELECTOR = [
    "#inputPage .moon-preview-card",
    "#inputPage .tarot-tile",
    "#inputPage .cd-pick-card",
    "#inputPage .moon-start-card",
    "#inputPage .prem-card",
    "#inputPage .feature-card"
  ].join(", ");

  function scrapeTiles(knownKeys) {
    var out = [];
    var nodes = document.querySelectorAll(TILE_SELECTOR);
    for (var i = 0; i < nodes.length; i += 1) {
      var el = nodes[i];
      if (el.closest("[data-cd-finder-results]")) continue;
      var nameEl = el.querySelector(
        ".moon-preview-card__name, strong, .tarot-tile__title, .feature-card__title"
      );
      var metaEl = el.querySelector(
        ".moon-preview-card__meta, .tarot-tile__meta, .tarot-tile__desc, .feature-card__meta"
      );
      var priceEl = el.querySelector(".tarot-tile__coin-badge");
      var name = String((nameEl && nameEl.textContent) || el.getAttribute("aria-label") || "").trim();
      if (!name) continue;

      var href = el.getAttribute("href");
      if (href && href.charAt(0) === "#") href = "";
      var action = el.getAttribute("data-action") || "";
      var collection = el.getAttribute("data-cd-open-collection") || "";
      if (!href && !action && !collection) continue;

      var key = name + "|" + (href || "") + "|" + action;
      if (knownKeys[key]) continue;
      knownKeys[key] = 1;

      var desc = String((metaEl && metaEl.textContent) || "").trim();
      var price = String((priceEl && priceEl.textContent) || "").trim();
      out.push({
        name: name,
        desc: desc,
        href: href || "",
        action: action,
        collection: collection,
        price: price,
        bucket: price ? bucketOf(price) : "",
        purposes: [],
        methods: [],
        badge: "",
        tagged: false,
        hay: norm([name, desc, price, el.getAttribute("aria-label")].join(" "))
      });
    }
    return out;
  }

  var catalogue = null;
  function ensureCatalogue() {
    if (catalogue) return catalogue;
    var known = Object.create(null);
    CURATED.forEach(function (item) {
      known[item.name + "|" + item.href + "|" + item.action] = 1;
    });
    catalogue = CURATED.concat(scrapeTiles(known));
    return catalogue;
  }

  /* ── 필터 ───────────────────────────────────────────────────── */
  function filterServices(state) {
    var query = norm(state.query);
    var purposes = state.purposes || [];
    var methods = state.methods || [];
    var buckets = state.buckets || [];
    var needsTags = purposes.length || methods.length || buckets.length;

    return ensureCatalogue().filter(function (item) {
      /* 태그가 없는 스크래핑 항목은 축 필터를 만족시킬 방법이 없다 —
         필터가 하나라도 켜지면 후보에서 빠지고, 순수 검색일 때만 나온다. */
      if (needsTags && !item.tagged) return false;
      if (purposes.length && !purposes.some(function (p) { return item.purposes.indexOf(p) !== -1; })) return false;
      if (methods.length && !methods.some(function (m) { return item.methods.indexOf(m) !== -1; })) return false;
      if (buckets.length && buckets.indexOf(item.bucket) === -1) return false;
      if (query && item.hay.indexOf(query) === -1) return false;
      return true;
    });
  }

  /* ── 결과 노드 ──────────────────────────────────────────────── */
  function openerNode(item, className) {
    var node = document.createElement(item.href ? "a" : "button");
    node.className = className;
    if (item.href) node.setAttribute("href", item.href);
    else node.type = "button";
    if (item.action) node.setAttribute("data-action", item.action);
    if (item.collection) node.setAttribute("data-cd-open-collection", item.collection);
    return node;
  }

  function translate(key, fallback) {
    try {
      return window.cdTranslate ? window.cdTranslate(key, null, fallback) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  /* 운명의 문 디스커버용 — 이름/설명/가격 3단 카드 */
  function renderRichResults(panel, list, state) {
    panel.textContent = "";
    if (!list.length) {
      panel.hidden = true;
      return;
    }
    var head = document.createElement("p");
    head.className = "fortune-gateway__recs-head";
    var single = (state.purposes || []).length === 1 ? PURPOSE_LABEL[state.purposes[0]] : null;
    head.textContent = single
      ? single.emoji + " " + single.label + "에 딱 맞는 운세를 골랐어요"
      : "찾으시는 운세를 골랐어요";
    panel.appendChild(head);

    var grid = document.createElement("div");
    grid.className = "fortune-gateway__recs-grid";
    list.forEach(function (item) {
      var node = openerNode(item, "fortune-gateway__rec");
      var name = document.createElement("span");
      name.className = "fortune-gateway__rec-name";
      name.appendChild(document.createTextNode(item.name));
      if (item.badge) {
        var badge = document.createElement("b");
        badge.textContent = item.badge;
        name.appendChild(badge);
      }
      node.appendChild(name);

      if (item.desc) {
        var desc = document.createElement("span");
        desc.className = "fortune-gateway__rec-desc";
        desc.textContent = item.desc;
        node.appendChild(desc);
      }

      var foot = document.createElement("span");
      foot.className = "fortune-gateway__rec-foot";
      var price = document.createElement("i");
      price.textContent = item.price;
      var go = document.createElement("em");
      go.textContent = "보러 가기 →";
      foot.appendChild(price);
      foot.appendChild(go);
      node.appendChild(foot);
      grid.appendChild(node);
    });
    panel.appendChild(grid);
    panel.hidden = false;
  }

  /* 전체 서비스 인덱스용 — 이름 + 한 줄 메타 */
  function renderCompactResults(panel, list) {
    panel.textContent = "";
    if (!list.length) {
      var empty = document.createElement("p");
      empty.className = "cd-svc-index__empty";
      empty.textContent = translate("home.svcIndex.empty", "검색 결과가 없어요. 다른 키워드로 찾아보세요.");
      panel.appendChild(empty);
      panel.hidden = false;
      return;
    }
    var frag = document.createDocumentFragment();
    list.slice(0, 24).forEach(function (item) {
      var node = openerNode(item, "cd-svc-hit");
      var name = document.createElement("strong");
      name.textContent = item.name;
      node.appendChild(name);
      var meta = item.desc || item.price;
      if (meta) {
        var metaEl = document.createElement("span");
        metaEl.textContent = item.price && item.desc ? item.desc + " · " + item.price : meta;
        node.appendChild(metaEl);
      }
      frag.appendChild(node);
    });
    panel.appendChild(frag);
    panel.hidden = false;
  }

  /* ── 마운트 ─────────────────────────────────────────────────── */
  function pressedValues(root, attr, selector) {
    var out = [];
    var nodes = root.querySelectorAll(selector + "[" + attr + '][aria-pressed="true"]');
    for (var i = 0; i < nodes.length; i += 1) out.push(nodes[i].getAttribute(attr));
    return out;
  }

  function mount(config) {
    var root = document.getElementById(config.rootId);
    var panel = document.getElementById(config.resultsId);
    if (!root || !panel) return null;
    panel.setAttribute("data-cd-finder-results", "");

    var input = config.inputId ? document.getElementById(config.inputId) : null;
    var progressive = config.filtersId ? document.getElementById(config.filtersId) : null;

    function state() {
      return {
        query: input ? input.value : "",
        purposes: config.purposeAttr ? pressedValues(root, config.purposeAttr, config.chipSelector) : [],
        methods: config.methodAttr ? pressedValues(root, config.methodAttr, config.filterChipSelector) : [],
        buckets: config.priceAttr ? pressedValues(root, config.priceAttr, config.filterChipSelector) : []
      };
    }

    function render() {
      var current = state();
      var active = current.query || current.purposes.length || current.methods.length || current.buckets.length;
      if (!active) {
        panel.hidden = true;
        panel.textContent = "";
        return;
      }
      var list = filterServices(current);
      if (config.layout === "rich") renderRichResults(panel, list, current);
      else renderCompactResults(panel, list);
    }

    /* 고민 칩 — 단일 선택(다시 누르면 해제) */
    if (config.purposeAttr) {
      var chips = root.querySelectorAll(config.chipSelector + "[" + config.purposeAttr + "]");
      Array.prototype.forEach.call(chips, function (chip) {
        chip.addEventListener("click", function () {
          var wasOn = chip.getAttribute("aria-pressed") === "true";
          Array.prototype.forEach.call(chips, function (other) {
            other.setAttribute("aria-pressed", "false");
          });
          if (!wasOn) chip.setAttribute("aria-pressed", "true");
          /* 목적을 고르면 방식·가격 필터를 드러낸다(단계적 탐색). */
          if (progressive) progressive.hidden = wasOn;
          render();
        });
      });
    }

    /* 방식·가격 칩 — 다중 선택 */
    if (config.filterChipSelector) {
      var multiAttrs = [config.methodAttr, config.priceAttr].filter(Boolean);
      var multiSelector = multiAttrs
        .map(function (attr) { return config.filterChipSelector + "[" + attr + "]"; })
        .join(", ");
      var fchips = multiSelector ? root.querySelectorAll(multiSelector) : [];
      Array.prototype.forEach.call(fchips, function (fchip) {
        fchip.addEventListener("click", function () {
          var on = fchip.getAttribute("aria-pressed") === "true";
          fchip.setAttribute("aria-pressed", on ? "false" : "true");
          render();
        });
      });
    }

    if (input) {
      var timer = 0;
      input.addEventListener("input", function () {
        window.clearTimeout(timer);
        timer = window.setTimeout(render, 120);
      });
      /* 카탈로그를 첫 타이핑 때 만들면 결과가 입력 뒤 500ms 를 넘겨 나타나 사용자 입력에
         귀속되지 못하고 CLS 로 계상된다(실측 0.3185 — docs/handoff/mobile-home-perf.md).
         🔴 focus 안에서 동기로 만들지 말 것 — 비용이 focus 지연으로 옮겨갈 뿐이다. */
      input.addEventListener("focus", warmCatalogue, { once: true });
    }

    return { render: render };
  }

  function warmCatalogue() {
    if (catalogue) return;
    var run = function () {
      try { ensureCatalogue(); } catch (_) {}
    };
    (window.requestIdleCallback || function (fn) { return window.setTimeout(fn, 0); })(run);
  }

  function boot() {
    mount({
      rootId: "fortuneGatewayDiscover",
      resultsId: "fortuneGatewayRecs",
      inputId: "fortuneGatewaySearch",
      /* filtersId 를 주지 않는다 — 방식·가격 필터는 처음부터 보인다.
         예전에는 고민 칩을 눌러야 드러나서 "방식만으로 찾기"가 불가능했다. */
      chipSelector: ".fortune-gateway__chip",
      filterChipSelector: ".fortune-gateway__fchip",
      purposeAttr: "data-purpose",
      methodAttr: "data-method",
      priceAttr: "data-price",
      layout: "rich"
    });

    /* #cdServiceIndex 의 검색·칩은 #cdFinder(fortuneGateway) 와 완전 중복이라 제거했다
       (2026-08-19, 사용자 요청). 이제 홈 검색은 #cdFinder 하나뿐이고, #cdServiceIndex 는
       헤더 + 펼치기 토글 + 컬렉션 그리드(#featureBegin) 로만 남는다. 두 번째 mount() 제거. */

    warmCatalogue();

    /* 네비 '전체 서비스' → 검색 섹션으로 스크롤 + 포커스 */
    document.addEventListener("click", function (event) {
      var jump = event.target instanceof Element ? event.target.closest("[data-cd-service-index-jump]") : null;
      if (!jump) return;
      var target = document.getElementById("cdServiceIndex");
      var input = document.getElementById("cdServiceSearchInput");
      if (!target) return;
      event.preventDefault();
      try {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (_) {
        location.hash = "cdServiceIndex";
      }
      window.setTimeout(function () {
        try { if (input) input.focus({ preventScroll: true }); } catch (_) {}
      }, 420);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

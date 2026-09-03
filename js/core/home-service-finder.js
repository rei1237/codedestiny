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

  var BUCKET_ORDER = ["free", "low", "mid", "high", "premium", "vvip"];

  function bucketOfWon(won) {
    if (won < 2000) return "low";
    if (won < 4000) return "mid";
    if (won < 8000) return "high";
    if (won < 20000) return "premium";
    return "vvip";
  }

  /* 가격 문자열 → 가격대 버킷 배열. scripts/verify-home-service-registry.mjs 의 readPrice() 와
     같은 경계를 쓴다. 한쪽만 고치면 필터와 가드가 갈라진다.
     🔴 범위 표기('5,000원~20,000원')는 시작가 하나가 아니라 걸치는 버킷을 전부 낸다 —
        단수로 파생하던 때 애니멀 토템(3,000원~5,000원)이 '5천원대' 칩에서 빠졌고,
        운명의 찻집(5,000원~20,000원)이 '1만원대' 에서 빠졌다. */
  function bucketsOf(price) {
    var text = String(price || "").replace(/,/g, "").replace(/\s/g, "");
    if (/무료/.test(text)) return ["free"];
    if (text === "이용권") return ["vvip"];
    var found = text.match(/\d{3,7}(?=원)/g);
    if (!found) return ["vvip"];
    var from = BUCKET_ORDER.indexOf(bucketOfWon(Number(found[0])));
    var to = BUCKET_ORDER.indexOf(bucketOfWon(Number(found[found.length - 1])));
    if (to < from) to = from;
    return BUCKET_ORDER.slice(from, to + 1);
  }

  /* 진입 전 상세 시트(#tilePvwOverlay)용 유료 판정.
     🔴 featureKey 가 있고 가격이 무료가 아닌 항목만 유료다. 경계 항목 둘이 여기서 갈린다 —
        `points`(이용권 상점: 키가 없다) 는 무료가 아니지만 유료 기능이 아니라 결제 지점 그
        자체다. 유료로 넘기면 셸 델리게이션이 앵커를 가로채고 CTA 가 `location.href` 로
        /points 를 여는데, 그건 앱에서 금지된 프로그래매틱 이동이다
        (docs/context/payment-gating.md ⑦ · docs/payment-policy-flow.md).
        `human-design`(키는 있으나 "무료 시작") 은 반대로 무료 쪽에 남아야 한다. */
  function isPaidItem(featureKey, price) {
    return !!featureKey && !!price && bucketsOf(price)[0] !== "free";
  }

  /* ── 레지스트리 정규화 ──────────────────────────────────────── */
  var CURATED = REGISTRY.map(function (item) {
    return {
      id: item.id,
      name: item.name,
      desc: item.desc || "",
      href: item.href || "",
      action: item.action || "",
      collection: "",
      price: item.price || "",
      buckets: bucketsOf(item.price),
      featureKey: item.featureKey || "",
      paid: isPaidItem(item.featureKey, item.price),
      purposes: item.purposes || [],
      methods: item.methods || [],
      badge: item.badge || "",
      roles: item.roles || [],
      tagged: true,
      hay: norm([item.name, item.desc, item.price, item.keys].join(" "))
    };
  });

  /* ── 기본 목록 (검색·칩을 건드리기 전) ──────────────────────
     예전에는 입력·칩 선택 전까지 아무것도 렌더하지 않아, 홈에서 가장 강한 탐색 도구가 빈 채로
     서 있고 그 뒤로 타일 62개를 사용자가 직접 훑어야 했다.

     🔴 기본으로 깔 것은 **바로 위 두 섹션이 이미 보여 주지 않는 것**이어야 한다 —
        #cdSignatureConsult(roles:"recommended" 4개) · #cdQuickServices(roles:"quick" 6개)가
        탐색기 **바로 위**에 붙어 있어서(index.html 11334 / 11451 / 11493), roles 를 가진 항목을
        여기 다시 깔면 같은 카드가 한 화면에 두 번 나오고 인터랙티브 요소만 늘어난다.
     그래서 roles 가 없고(= 상단 미노출) 무료로 시작할 수 있는 앞쪽 6개를 쓴다.
     'free' 판정은 bucketsOf() 하나에서만 파생한다 — 가격 문자열을 여기서 다시 해석하지 않는다.

     🔴 filterServices() 를 타지 않는다 — 그 안의 ensureCatalogue() 가 DOM 스윕(scrapeTiles)을
        돌려서, 지금은 idle 로 미뤄 둔 카탈로그 생성이 첫 렌더로 앞당겨진다. */
  var DEFAULT_PICKS = CURATED.filter(function (item) {
    return !item.roles.length && item.buckets[0] === "free";
  }).slice(0, 6);

  /* ── DOM 스크래핑 (태그 없음 · 검색 전용) ───────────────────── */
  var TILE_SELECTOR = [
    "#inputPage .moon-preview-card",
    "#inputPage .tarot-tile",
    "#inputPage .cd-pick-card",
    "#inputPage .prem-card",
    "#inputPage .feature-card"
  ].join(", ");

  /* 중복 제거는 표시 이름이 아니라 "무엇을 여는가" 로 판정한다. 이름 기반 키
     (`name|href|action`)는 이모지·수식어가 붙은 스크랩 타일(`🕯️ 정신분석 해몽`)을
     큐레이션 항목과 다른 항목으로 봐서 같은 기능을 두 번 노출시켰다. */
  function normHref(href) {
    var value = String(href || "").trim();
    if (!value || value.charAt(0) === "#") return "";
    value = value.split("#")[0].split("?")[0];
    if (value.length > 1 && value.charAt(value.length - 1) === "/") value = value.slice(0, -1);
    return value;
  }

  function registerKeys(known, action, featureKey, href, collection) {
    if (action) known["a:" + action] = 1;
    if (featureKey) known["f:" + featureKey] = 1;
    var path = normHref(href);
    if (path) known["h:" + path] = 1;
    if (!action && !featureKey && !path && collection) known["c:" + collection] = 1;
  }

  /* 액션·featureKey 가 있으면 그 식별자로만 판정한다 — 같은 href 를 공유하되 다른
     화면을 여는 항목(예: `/ziwei/` + `navigateToZiweiChart`)을 살려 두기 위해서다. */
  function isDuplicate(known, action, featureKey, href, collection) {
    if (action && known["a:" + action]) return true;
    if (featureKey && known["f:" + featureKey]) return true;
    if (action || featureKey) return false;
    var path = normHref(href);
    if (path) return !!known["h:" + path];
    return !!(collection && known["c:" + collection]);
  }

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

      var featureKey = el.getAttribute("data-feature-key") || "";
      if (isDuplicate(knownKeys, action, featureKey, href, collection)) continue;
      registerKeys(knownKeys, action, featureKey, href, collection);

      var desc = String((metaEl && metaEl.textContent) || "").trim();
      var price = String((priceEl && priceEl.textContent) || "").trim();
      out.push({
        name: name,
        desc: desc,
        href: href || "",
        action: action,
        collection: collection,
        price: price,
        buckets: price ? bucketsOf(price) : [],
        featureKey: featureKey,
        paid: isPaidItem(featureKey, price),
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
      registerKeys(known, item.action, item.featureKey, item.href, item.collection);
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
      /* 항목이 걸치는 버킷 중 하나라도 선택된 칩과 겹치면 통과한다 — 범위 가격이
         시작가 버킷에만 갇히지 않게 하는 지점이다. */
      if (buckets.length && !item.buckets.some(function (b) { return buckets.indexOf(b) !== -1; })) return false;
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
    /* 진입 전 상세 시트 신호(2026-09-01 결정 ⓒ). 이 카드는 원본 타일과 같은 기능으로 가는
       두 번째 입구인데, 지금까지 셸 델리게이션 선택자에 걸리는 표식이 하나도 없어 시트가
       열리지 않았다.
       🔴 data-coin-cost·data-tile-lock-cost·data-tile-lock-key 는 절대 붙이지 않는다 —
          셋 중 하나라도 있으면 _cdRunPerUseCoinGate 가 이 카드에서 결제 게이트를 무장한다.
          값 없는 data-feature-key 는 결제 키가 아니라는 것이 이 레포의 기존 규약이다
          (js/core/saju/reportDashboard.js 가 같은 조합을 쓴다).
       🔴 무료 항목에는 featureKey 를 싣지 않는다 — 시트가 카탈로그 가격을 찾아내면
          그 무료 기능을 '유료'로 프레이밍한다(index.html 의 _resolvePreviewData 주석). */
    if (item.paid) {
      if (item.featureKey) node.setAttribute("data-feature-key", item.featureKey);
      node.setAttribute("data-pvw-paid", "1");
    } else if (item.buckets[0] === "free") {
      node.setAttribute("data-pvw-free", "1");
    }
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
      /* 시트 제목은 _pvwTileText 가 [data-pvw-title] 의 textContent 로 읽는다. 배지(<b>)를
         제목에 섞지 않으려고 이름만 따로 감싼다 — 없으면 제목이 '기능 상세'로 떨어진다. */
      var nameText = document.createElement("span");
      nameText.setAttribute("data-pvw-title", "");
      nameText.textContent = item.name;
      name.appendChild(nameText);
      if (item.badge) {
        var badge = document.createElement("b");
        badge.textContent = item.badge;
        name.appendChild(badge);
      }
      node.appendChild(name);

      if (item.desc) {
        var desc = document.createElement("span");
        desc.className = "fortune-gateway__rec-desc";
        /* 카드는 언어 전환 이후에도 다시 그려지므로 마커를 같이 남긴다.
           data-cd-origin-text 를 한국어로 못 박아 두는 게 핵심이다 — 안 그러면
           markNativeNodes 가 방금 칠한 번역문을 원문으로 저장해, ko 로 되돌릴 때
           영어가 그대로 굳는다(cd-lang-native.js 의 applyNativeTranslations ko 분기). */
        var descKey = "home.svcDesc." + item.id;
        desc.setAttribute("data-cd-trans", "");
        desc.setAttribute("data-key", descKey);
        desc.setAttribute("data-cd-origin-text", item.desc);
        desc.classList.add("notranslate");
        desc.textContent = translate(descKey, item.desc);
        node.appendChild(desc);
      }

      var foot = document.createElement("span");
      foot.className = "fortune-gateway__rec-foot";
      var price = document.createElement("i");
      price.className = "fortune-gateway__rec-price";
      price.textContent = item.price;
      var go = document.createElement("em");
      go.className = "fortune-gateway__rec-go";
      go.setAttribute("data-cd-trans", "");
      go.setAttribute("data-key", "home.svcFinder.go");
      go.setAttribute("data-cd-origin-text", "보러 가기 →");
      go.classList.add("notranslate");
      go.textContent = translate("home.svcFinder.go", "보러 가기 →");
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
      /* 아무것도 고르지 않은 상태 = 기본 목록. 필터를 켰다가 모두 끄면 이리로 되돌아온다. */
      var list = active ? filterServices(current) : DEFAULT_PICKS;
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

    /* 첫 렌더로 기본 목록을 깐다. 이건 사용자 행동의 결과가 아니므로 aria-live 를 잠깐 떼어,
       스크린리더가 페이지 로드 직후 6개를 읽어 내려가지 않게 한다. 이후 렌더는 그대로 알린다. */
    var live = panel.getAttribute("aria-live");
    if (live) panel.removeAttribute("aria-live");
    render();
    if (live) panel.setAttribute("aria-live", live);

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

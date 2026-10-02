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
  // 홈에 같은 기능 타일이 없는 항목의 대체 이미지(달 컨셉). 기능 이미지는 featureTileImage 가 런타임에 찾는다.
  var DEFAULT_SERVICE_IMAGE = "/images/home/finder-moon.svg";
  /* 컬렉션 자산 일부는 Pages 가 아니라 R2 에만 있다(홈 타일은 index-inline-runtime 의
     resolveCollectionImageSrc 로 R2 에서 받는다). 로컬 경로가 404 면 R2 원본으로 한 번 물러난다. */
  var R2_ASSET_BASE = "https://assets.code-destiny.com/";

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
    return String(value || "").toLowerCase().replace(/\s+/g, "");
  }

  /* 검색 동의어(2026-10-03 운세 정원 개편) — 같은 고민·체계를 다르게 부르는 말.
     검색어에 한 단어가 들어 있으면 같은 묶음의 다른 단어로 바꾼 검색어도 함께 찾는다(OR).
     레지스트리 keys 에 모든 표기를 늘어놓지 않으려는 것이다. */
  var SYNONYM_GROUPS = [
    ["이직", "퇴사", "취업", "직장", "커리어", "진로", "직업"],
    ["재물", "금전", "돈", "재테크", "재정"],
    ["결혼", "배우자", "혼인", "결혼운"],
    ["재회", "다시만남", "헤어진"],
    ["궁합", "케미", "상성"],
    ["연애", "사랑", "썸", "인연"],
    ["자미두수", "자미", "紫微"],
    ["숙요점", "숙요", "27수", "이십칠수"],
    ["베다점", "베다", "나크샤트라", "인도점성술"],
    ["점성술", "별자리", "호로스코프", "서양점성술"],
    ["사주", "명리", "팔자", "만세력"],
    ["오늘", "오늘의운세", "일일운세", "데일리"]
  ].map(function (group) { return group.map(norm); });

  function queryVariants(query) {
    var out = [query];
    if (!query) return out;
    SYNONYM_GROUPS.forEach(function (group) {
      group.forEach(function (word) {
        if (query.indexOf(word) === -1) return;
        group.forEach(function (other) {
          var next = query.split(word).join(other);
          if (out.indexOf(next) === -1) out.push(next);
        });
      });
    });
    return out;
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
    var isFree = /무료/.test(text);
    if (text === "이용권") return ["vvip"];
    var found = text.match(/\d{3,7}(?=원)/g);
    if (!found) return isFree ? ["free"] : ["vvip"];
    var from = BUCKET_ORDER.indexOf(bucketOfWon(Number(found[0])));
    var to = BUCKET_ORDER.indexOf(bucketOfWon(Number(found[found.length - 1])));
    if (to < from) to = from;
    var paidBuckets = BUCKET_ORDER.slice(from, to + 1);
    return isFree ? ["free"].concat(paidBuckets) : paidBuckets;
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
      dedupeHref: item.dedupeHref || "",
      collection: "",
      price: item.price || "",
      buckets: bucketsOf(item.price),
      featureKey: item.featureKey || "",
      paid: isPaidItem(item.featureKey, item.price),
      purposes: item.purposes || [],
      methods: item.methods || [],
      badge: item.badge || "",
      roles: item.roles || [],
      image: item.image || "",
      imageAlt: item.imageAlt || (item.name ? item.name + " 대표 이미지" : "운세 서비스 대표 이미지"),
      tagged: true,
      hay: norm([item.name, item.desc, item.price, item.keys].join(" "))
    };
  });

  /* ── 기본 목록 (검색·칩을 건드리기 전) ──────────────────────
     예전에는 입력·칩 선택 전까지 아무것도 렌더하지 않아, 홈에서 가장 강한 탐색 도구가 빈 채로
     서 있고 그 뒤로 타일 62개를 사용자가 직접 훑어야 했다.

     🔴 기본으로 깔 것은 roles 를 가진 항목이 아니어야 한다 — roles:"recommended" 4개는
        #cdSignatureConsult 에 이미 나와 있어 다시 깔면 같은 카드가 한 화면에 두 번 나온다.
        roles:"quick"(사주·타로·자미두수·숙요·베다·점성술 허브) 6개는 #cdQuickServices 와 함께
        홈에서 빠졌고(2026-10-03) 모든 운세의 방식 칩·검색으로 들어간다 — 기본 목록 구성은 그대로 둔다.
     그래서 roles 가 없고 무료로 시작할 수 있는 앞쪽 6개를 쓴다.
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
    "#inputPage .prem-card",
    "#inputPage .feature-card"
  ].join(", ");
  var TILE_CLASS_SELECTOR = [
    ".moon-preview-card",
    ".tarot-tile",
    ".prem-card",
    ".feature-card"
  ].join(", ");

  /* 모바일은 닫힌 컬렉션의 카드를 DOM 에서 떼어 collection.__cdLazyCards 에만 둔다
     (index.html prepareCollectionLazyMounts) — TILE_SELECTOR 의 #inputPage 조상 조건은
     떼어낸(부모 없는) 카드에는 성립하지 않으므로, 클래스만으로 다시 판정해 더한다. */
  function lazyCollectionCards() {
    var out = [];
    var collections = document.querySelectorAll(".feat-collection, .tarot-collection");
    for (var c = 0; c < collections.length; c += 1) {
      var lazyCards = collections[c].__cdLazyCards || [];
      for (var d = 0; d < lazyCards.length; d += 1) {
        if (lazyCards[d].isConnected) continue;
        out.push(lazyCards[d]);
      }
    }
    return out;
  }

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

  /* 타일 이미지: 지연 로드 타일은 [data-img-src], 정적 타일은 <img> 를 읽는다. */
  function tileImageOf(el) {
    var wrap = el.matches("[data-img-src]") ? el : el.querySelector("[data-img-src]");
    if (wrap) return wrap.getAttribute("data-img-src") || "";
    var image = el.querySelector("img");
    var src = image ? (image.getAttribute("data-lazy-src") || image.getAttribute("src") || "") : "";
    return src.indexOf("data:") === 0 ? "" : src;
  }

  /* 검색 카드 이미지는 레지스트리에 저장하지 않고(파생값 금지), 같은 기능을 여는 홈 타일의
     이미지를 문서 순서상 첫 번째로 빌린다. 판정 키는 isDuplicate 와 같은 action·featureKey·href.
     검색 결과 자신은 제외한다 — 결과 카드 이미지를 다시 원본으로 삼으면 달 이미지가 번진다.
     모바일은 닫힌 컬렉션의 카드를 DOM 에서 떼어 collection.__cdLazyCards 에만 둔다
     (index.html prepareCollectionLazyMounts) — 그 카드도 함께 훑어야 모바일에서 달로 떨어지지 않는다. */
  var TILE_KEY_SELECTOR = "[data-action], [data-feature-key], a[href]";
  var featureImageIndex = null;
  function featureTileImage(item) {
    if (!featureImageIndex) {
      featureImageIndex = {};
      var nodes = Array.prototype.slice.call(document.querySelectorAll(TILE_KEY_SELECTOR));
      // 모바일은 결과 페이지도 통째로 분리한다. 검색 이미지를 위해 다시 마운트하지 않는다.
      var lazyMount = window.__cdMobileHomeLazyMount;
      var resultPage = lazyMount && lazyMount.peek ? lazyMount.peek("resultPage") : null;
      if (resultPage && !resultPage.isConnected) {
        nodes.push.apply(nodes, resultPage.querySelectorAll(TILE_KEY_SELECTOR));
      }
      lazyCollectionCards().forEach(function (card) {
        if (card.matches(TILE_KEY_SELECTOR)) nodes.push(card);
        nodes.push.apply(nodes, card.querySelectorAll(TILE_KEY_SELECTOR));
      });
      for (var i = 0; i < nodes.length; i += 1) {
        var el = nodes[i];
        if (el.closest("#cdFinder, [data-cd-finder-results], template")) continue;
        var src = tileImageOf(el);
        if (!src) continue;
        var keys = ["a:" + (el.getAttribute("data-action") || ""), "f:" + (el.getAttribute("data-feature-key") || ""), "h:" + imageHrefKey(el.getAttribute("href"))];
        for (var k = 0; k < keys.length; k += 1) {
          if (keys[k].length > 2 && !featureImageIndex[keys[k]]) featureImageIndex[keys[k]] = src;
        }
      }
    }
    return (item.action && featureImageIndex["a:" + item.action]) ||
      (item.featureKey && featureImageIndex["f:" + item.featureKey]) ||
      (imageHrefKey(item.href) && featureImageIndex["h:" + imageHrefKey(item.href)]) || "";
  }

  /* 이미지 판정용 href 키는 쿼리를 남긴다 — normHref 처럼 떼면 /index.html?action=… 항목이
     전부 "/index.html" 하나로 뭉쳐 남의 기능 이미지를 빌린다. */
  function imageHrefKey(href) {
    var value = String(href || "").trim();
    if (!value || value.charAt(0) === "#") return "";
    return value.split("#")[0].replace(/\/(?=\?|$)/, "") || "/";
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
    var nodes = Array.prototype.slice.call(document.querySelectorAll(TILE_SELECTOR));
    lazyCollectionCards().forEach(function (card) {
      if (card.matches(TILE_CLASS_SELECTOR)) nodes.push(card);
    });
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
        image: tileImageOf(el),
        imageAlt: (function () {
          var image = el.querySelector("img");
          return image && image.getAttribute("alt") || (name ? name + " 대표 이미지" : "운세 서비스 대표 이미지");
        })(),
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
      registerKeys(known, item.action, item.featureKey, item.dedupeHref || item.href, item.collection);
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
    /* 방식 '기타'(모든 운세 화면)는 레지스트리 밖 컬렉션 타일을 받는 칸이다. */
    var wantsEtc = methods.indexOf("etc") !== -1;
    var variants = queryVariants(query);

    return ensureCatalogue().filter(function (item) {
      /* 태그가 없는 스크래핑 항목은 축 필터를 만족시킬 방법이 없다 —
         필터가 하나라도 켜지면 후보에서 빠지고, 순수 검색일 때만 나온다. */
      if (needsTags && !item.tagged && !(wantsEtc && !purposes.length && !buckets.length)) return false;
      if (purposes.length && !purposes.some(function (p) { return item.purposes.indexOf(p) !== -1; })) return false;
      if (methods.length && item.tagged && !methods.some(function (m) { return item.methods.indexOf(m) !== -1; })) return false;
      /* 항목이 걸치는 버킷 중 하나라도 선택된 칩과 겹치면 통과한다 — 범위 가격이
         시작가 버킷에만 갇히지 않게 하는 지점이다. */
      if (buckets.length && !item.buckets.some(function (b) { return buckets.indexOf(b) !== -1; })) return false;
      if (query && !variants.some(function (v) { return item.hay.indexOf(v) !== -1; })) return false;
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

  function appendServiceImage(parent, item, className) {
    var media = document.createElement("span");
    media.className = className;
    var image = document.createElement("img");
    image.src = item.image || featureTileImage(item) || DEFAULT_SERVICE_IMAGE;
    image.alt = item.imageAlt || (item.name ? item.name + " 대표 이미지" : "운세 서비스 대표 이미지");
    image.loading = "lazy";
    image.decoding = "async";
    image.width = 320;
    image.height = 180;
    var path = image.getAttribute("src").split(/[?#]/)[0];
    var fallbacks = [
      path.indexOf("/fuctionassets/") === 0 ? R2_ASSET_BASE + path.slice("/fuctionassets/".length) : "",
      DEFAULT_SERVICE_IMAGE
    ].filter(function (src) { return src && src !== path; });
    image.addEventListener("error", function () {
      var next = fallbacks.shift();
      if (!next) return;
      image.dataset.cdFallback = "1";
      image.src = next;
    });
    media.appendChild(image);
    parent.appendChild(media);
  }

  function translate(key, fallback) {
    try {
      return window.cdTranslate ? window.cdTranslate(key, null, fallback) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  /* 운명의 문 디스커버용 — 이름/설명/가격 3단 카드 */
  function renderRichResults(panel, list, state, opts) {
    opts = opts || {};
    // 타일은 부팅 뒤에도 붙고 떨어진다(모바일 지연 마운트). 첫 렌더 시점의 색인을 굳히지 않는다.
    featureImageIndex = null;
    panel.textContent = "";
    if (!list.length && opts.emptyState) {
      panel.appendChild(opts.emptyState());
      panel.hidden = false;
      return;
    }
    if (!list.length) {
      var empty = document.createElement("p");
      empty.textContent = "일치하는 서비스가 없어요. 검색어나 필터를 바꿔보세요.";
      panel.appendChild(empty);
      panel.hidden = false;
      return;
    }
    var head = document.createElement("p");
    head.className = "fortune-gateway__recs-head";
    var single = (state.purposes || []).length === 1 ? PURPOSE_LABEL[state.purposes[0]] : null;
    head.setAttribute("data-cd-trans", "home.svcFinder.recommendations");
    head.textContent = (single ? single.emoji + " " : "")
      + translate("home.svcFinder.recommendations", "찾으시는 운세를 골랐어요");
    if (!opts.showAll) panel.appendChild(head);

    var grid = document.createElement("div");
    grid.className = "fortune-gateway__recs-grid";
    var visibleList = opts.showAll || state.query || (state.purposes || []).length || (state.methods || []).length || (state.buckets || []).length
      ? list
      : list.slice(0, 6);
    visibleList.forEach(function (item) {
      var node = openerNode(item, "fortune-gateway__rec");
      appendServiceImage(node, item, "fortune-gateway__rec-media");
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
    var clearButton = root.querySelector('[data-cd-search-clear]');
    var resetButton = root.querySelector('[data-cd-finder-reset]');
    var summary = document.getElementById(config.summaryId || 'fortuneGatewayResultSummary');
    var filterPanel = root.querySelector('.fortune-gateway__filter-panel');
    var filterCount = root.querySelector('[data-cd-filter-count]');
    /* 홈(꿀꿀 운세)에서는 입력·칩을 고르기 전에는 결과를 깔지 않는다(2026-10-01 홈 개편).
       단독 마운트(테스트·홈 밖)는 기존처럼 기본 목록을 보여 준다.
       모든 운세 화면(showAll)은 아무것도 고르지 않아도 레지스트리 전체를 깐다. */
    var homeFunnel = document.getElementById("cdHomeFunnel");
    var emptyUntilAsked = !config.showAll && Boolean(homeFunnel && homeFunnel.contains(root));
    var renderOpts = { showAll: Boolean(config.showAll), emptyState: config.emptyState ? function () { return config.emptyState(resetAll); } : null };

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
      if (clearButton) clearButton.hidden = !current.query;
      if (resetButton) resetButton.hidden = !active;
      if (filterCount && filterPanel) {
        var inPanel = filterPanel.querySelectorAll('[aria-pressed="true"]').length;
        filterCount.textContent = inPanel ? String(inPanel) : "";
        filterCount.hidden = !inPanel;
      }
      if (!active && emptyUntilAsked) {
        panel.textContent = "";
        panel.hidden = true;
        if (summary) summary.textContent = "";
        return;
      }
      /* 아무것도 고르지 않은 상태 = 기본 목록. 필터를 켰다가 모두 끄면 이리로 되돌아온다. */
      var list = active ? filterServices(current) : (config.showAll ? CURATED : DEFAULT_PICKS);
      renderRichResults(panel, list, current, renderOpts);
      if (summary) summary.textContent = active
        ? '조건에 맞는 서비스 ' + list.length + '개'
        : '전체 서비스 ' + list.length + '개';
      if (config.onRender) config.onRender(current);
    }

    function resetAll() {
      if (input) input.value = '';
      var pressed = root.querySelectorAll('[aria-pressed="true"]');
      Array.prototype.forEach.call(pressed, function (chip) { chip.setAttribute('aria-pressed', 'false'); });
      if (progressive) progressive.hidden = false;
      render();
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
    if (clearButton && input) {
      clearButton.addEventListener('click', function () {
        input.value = '';
        render();
        input.focus({ preventScroll: true });
      });
    }
    if (resetButton) resetButton.addEventListener('click', resetAll);

    /* 첫 렌더로 기본 목록을 깐다. 이건 사용자 행동의 결과가 아니므로 aria-live 를 잠깐 떼어,
       스크린리더가 페이지 로드 직후 6개를 읽어 내려가지 않게 한다. 이후 렌더는 그대로 알린다. */
    var live = panel.getAttribute("aria-live");
    if (live) panel.removeAttribute("aria-live");
    render();
    if (live) panel.setAttribute("aria-live", live);

    return { render: render, reset: resetAll };
  }

  function warmCatalogue() {
    if (catalogue) return;
    var run = function () {
      try { ensureCatalogue(); } catch (_) {}
    };
    (window.requestIdleCallback || function (fn) { return window.setTimeout(fn, 0); })(run);
  }

  /* ── 모든 운세 화면(2026-10-03 운세 정원 개편) ─────────────────
     검색·방식·고민 블록(#cdAllFortunesRoot) 하나를 두 곳에 옮겨 단다.
     모바일: 기존 '모든 운세' 개요 패널(#cdMobileFortuneOverview) 맨 위 — 그 아래 즐겨찾기·카테고리는 그대로.
     데스크톱: 시트 #cdAllFortunes(js/core/shell-sheet.js).
     노드를 옮기므로 입력값·칩 상태·리스너가 함께 따라간다. 카드·검색은 위 카탈로그 단일 출처다.
     상태는 sessionStorage 에만 둔다(URL 파라미터를 늘리지 않는다). 카드를 눌러 떠났다가
     뒤로 오면(bfcache 복원이든 새 로드든) 화면을 다시 열고 검색어·칩·스크롤을 되살린다. */
  var AF_KEY = "cd.allFortunes.v1";
  var AF_RETURN_MS = 30 * 60 * 1000;
  var allFortunes = null;

  function afRead() {
    try {
      var saved = JSON.parse(window.sessionStorage.getItem(AF_KEY) || "null");
      return saved && typeof saved === "object" ? saved : null;
    } catch (_) { return null; }
  }

  function afWrite(patch) {
    try {
      var next = Object.assign({}, afRead() || {}, patch);
      window.sessionStorage.setItem(AF_KEY, JSON.stringify(next));
    } catch (_) {}
  }

  function afScroller(root) {
    return root.closest("#cdMobileFortuneOverview") || root.closest(".cd-sheet__body");
  }

  function afApplySaved(root, saved) {
    var input = document.getElementById("cdAllFortunesSearch");
    if (input && typeof saved.query === "string") input.value = saved.query;
    var wanted = { "data-purpose": saved.purposes || [], "data-method": saved.methods || [] };
    Object.keys(wanted).forEach(function (attr) {
      var chips = root.querySelectorAll("[" + attr + "]");
      Array.prototype.forEach.call(chips, function (chip) {
        chip.setAttribute("aria-pressed", wanted[attr].indexOf(chip.getAttribute(attr)) !== -1 ? "true" : "false");
      });
    });
  }

  function afEmptyState(reset) {
    var box = document.createElement("div");
    box.className = "cd-af__empty";
    var title = document.createElement("p");
    title.className = "cd-af__empty-title";
    title.textContent = translate("home.gardenCopy.allEmpty", "찾는 운세가 없어요");
    var hint = document.createElement("p");
    hint.textContent = translate("home.gardenCopy.allEmptyHint", "다른 말로 찾거나 조건을 풀어 보세요.");
    var again = document.createElement("button");
    again.type = "button";
    again.className = "cd-af__empty-reset";
    again.textContent = translate("home.gardenCopy.allReset", "조건 초기화");
    again.addEventListener("click", reset);
    box.appendChild(title);
    box.appendChild(hint);
    box.appendChild(again);
    return box;
  }

  function ensureAllFortunes() {
    if (allFortunes) return allFortunes;
    var root = document.getElementById("cdAllFortunesRoot");
    if (!root) return null;
    var saved = afRead();
    if (saved) afApplySaved(root, saved);
    var api = mount({
      rootId: "cdAllFortunesRoot",
      resultsId: "cdAllFortunesResults",
      inputId: "cdAllFortunesSearch",
      summaryId: "cdAllFortunesSummary",
      chipSelector: ".cd-af__chip",
      filterChipSelector: ".cd-af__fchip",
      purposeAttr: "data-purpose",
      methodAttr: "data-method",
      showAll: true,
      emptyState: afEmptyState,
      onRender: function (current) {
        afWrite({ query: current.query, purposes: current.purposes, methods: current.methods });
      }
    });
    root.addEventListener("click", function (event) {
      var target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      if (target.closest("[data-cd-af-browse]")) {
        afBrowseCollections();
        return;
      }
      var card = target.closest("#cdAllFortunesResults a[href], #cdAllFortunesResults button");
      if (!card) return;
      var box = afScroller(root);
      afWrite({ scrollTop: box ? box.scrollTop : 0, returnAt: Date.now() });
      // 공용 디스패처(document 버블)보다 이 리스너가 먼저 돈다 — 실행 전에 닫는다.
      afCloseOverviewFor(root, card);
    });
    // 모바일 터치 브리지(js/mobile-interaction-patch.js)는 일부 액션(MBTI 등)을 document capture 에서
    // 직접 실행하고 전파를 멈춰 위 리스너까지 오지 않는다. 브리지가 처리한 클릭만 실행 뒤에 닫는다.
    // 브리지가 막은 고스트·스크롤 클릭은 처리 표시가 없으니 닫지 않는다.
    window.addEventListener("click", function (event) {
      var target = event.target instanceof Element ? event.target : null;
      var card = target && root.contains(target) ? target.closest("#cdAllFortunesResults button[data-action], #cdAllFortunesResults a[href][data-action]") : null;
      if (!card) return;
      window.setTimeout(function () {
        if (event.__cdMobileBridgeHandled) afCloseOverviewFor(root, card);
      }, 0);
    }, true);
    allFortunes = { root: root, api: api };
    return allFortunes;
  }

  // 모바일 오버레이(#cdMobileFortuneOverview, z 965)는 화면 안에서 실행되는 카드(무료 사주 입력 폼·MBTI 모달)를
  // 가린다. 데스크톱 시트가 링크·액션 클릭에 닫히듯(shell-sheet) 무료 data-action 카드는 오버레이를 닫는다.
  // 유료 카드는 상세 시트(#tilePvwOverlay)가 오버레이 위에 뜨므로 그대로 둔다.
  function afCloseOverviewFor(root, card) {
    if (root.getAttribute("data-cd-af-host") !== "overview") return;
    if (!card.hasAttribute("data-action") || card.hasAttribute("data-pvw-paid")) return;
    var overlay = window.cdMobileCollectionFullscreen;
    if (overlay && overlay.isOpen()) overlay.close();
  }

  // 데스크톱 시트의 '카테고리로 둘러보기' — 시트를 닫고 옛 경로(정원 컬렉션으로 스크롤)로 간다.
  // 시트가 닫히며 스크롤을 되돌리므로, 닫힘 이벤트 뒤에 움직인다.
  function afBrowseCollections() {
    var go = function () {
      if (typeof window.cdOpenAllFortunes === "function") window.cdOpenAllFortunes({ browse: true });
    };
    var sheets = window.CodeDestinyShellSheet;
    var sheet = document.getElementById("cdAllFortunes");
    if (sheets && sheet && sheets.isOpen("cdAllFortunes")) {
      sheet.addEventListener("cd:sheet-close", function () { window.setTimeout(go, 0); }, { once: true });
      sheets.close("cdAllFortunes");
    } else {
      go();
    }
  }

  // host 에 블록을 단다. before 가 있으면 그 앞에, 없으면 끝에.
  function attachAllFortunes(host, before) {
    var af = ensureAllFortunes();
    if (!af || !host) return false;
    if (af.root.parentNode !== host || (before && af.root.nextSibling !== before)) {
      host.insertBefore(af.root, before || null);
    }
    af.root.setAttribute("data-cd-af-host", host.id === "cdMobileFortuneOverview" ? "overview" : "sheet");
    return true;
  }

  function afRestoreScroll(top) {
    if (!allFortunes || !top) return;
    window.requestAnimationFrame(function () {
      var box = afScroller(allFortunes.root);
      if (box) box.scrollTop = top;
    });
  }

  function bootAllFortunes() {
    var sheet = document.getElementById("cdAllFortunes");
    if (sheet) {
      sheet.addEventListener("cd:sheet-open", function () {
        attachAllFortunes(sheet.querySelector(".cd-sheet__body"));
      });
    }
    window.addEventListener("pageshow", function (event) {
      var saved = afRead();
      if (!saved || !saved.returnAt) return;
      var fresh = Date.now() - saved.returnAt < AF_RETURN_MS;
      var entry = window.performance && performance.getEntriesByType ? performance.getEntriesByType("navigation")[0] : null;
      var back = event.persisted || Boolean(entry && entry.type === "back_forward");
      afWrite({ returnAt: 0 });
      if (!fresh || !back || typeof window.cdOpenAllFortunes !== "function") return;
      window.cdOpenAllFortunes();
      afRestoreScroll(saved.scrollTop || 0);
    });
  }

  window.CodeDestinyAllFortunes = {
    attach: attachAllFortunes,
    filter: function (state) { return filterServices(state || {}); }
  };

  function boot() {
    bootAllFortunes();
    var home = document.getElementById("cdHomeFunnel");
    var finder = document.getElementById("cdFinder");
    /* 홈 검색은 늘 펼쳐져 있다(2026-10-01). 입력 전에는 결과를 그리지 않으므로 마운트는 가볍다. */
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

    /* 카탈로그(타일 스크랩)는 홈에서는 검색 영역을 처음 만질 때 데운다 — 첫 화면 비용에 넣지 않는다. */
    if (home && finder && home.contains(finder)) {
      finder.addEventListener("focusin", warmCatalogue, { once: true });
      finder.addEventListener("pointerdown", warmCatalogue, { once: true });
    } else {
      warmCatalogue();
    }

    /* 네비 '전체 서비스' → 검색 섹션으로 스크롤 + 포커스 */
    document.addEventListener("click", function (event) {
      var jump = event.target instanceof Element ? event.target.closest("[data-cd-service-index-jump]") : null;
      if (!jump) return;
      if (document.getElementById("cdHomeFunnel")) {
        event.preventDefault();
        location.hash = "cdFinder";
        return;
      }
      var target = document.getElementById("cdServiceIndex");
      if (!target) return;
      event.preventDefault();
      try {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (_) {
        location.hash = "cdServiceIndex";
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

/* ─── 공유하기 함수 ─── */
const SHARE_TEXT_TRANSLATIONS = {
  ko: {
    "share.001": "🐷 꿀꿀 만세력",
    "share.002": "🐷 연이의 꿀꿀 타로",
    "share.003": "✨ 점성술 코즈믹 차트",
    "share.004": "무료 기본 숙요점 결과",
    "share.005": "🌌 자미두수 결과",
    "share.006": "사주 인생의 책",
    "share.007": "💕 연애 비책",
    "share.008": "사주 원국을 먼저 열어야 매일의 기운을 정확히 이어 받을 수 있습니다. 생년월일을 입력하고 사주 분석을 완료해 주세요.",
    "share.009": "저장된 프로필을 여는 계산 모듈을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.",
    "share.010": "저장된 프로필에서 사주 원국을 다시 여는 데 실패했습니다. 프로필을 다시 선택한 뒤 신청해 주세요.",
    "share.011": "운세 계산 모듈을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.",
    "share.012": "운세 데이터 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    "share.013": "잠시 후 다시 시도해 주세요.",
  },
};

function _shareText(key) {
  var ko = SHARE_TEXT_TRANSLATIONS.ko[key] || "";
  try {
    if (typeof window !== "undefined" && window && typeof window.cdTranslate === "function") {
      return window.cdTranslate(key, {}, ko);
    }
  } catch (_) {}
  return ko || "Translation pending";
}
var APP_VERSION = 'dev';
var APP_VERSION_KEY = 'app_version';
var APP_VERSION_RELOAD_GUARD = 'app_version_reload_guard';  // 무한 reload 방지
var APP_VERSION_DEFER_GUARD = 'app_version_defer_guard';
var SW_PURGED_VERSION_KEY = 'app_sw_purged_version';
var SW_RETIRE_ONCE_KEY = 'app_sw_retire_once';
var VERSION_GUARD_BANNER_ID = 'cd-version-update-banner';
// 🔴 요청 다이어트(2026-08-12): 15초 폴링 + focus + visibility 가 version.json 을 상시 때려
// 결제 임계경로(checkout POST·PortOne SDK)와 연결·대역폭을 다퉜다(실측 워터폴: 초기 연결 23초).
// 60초로 늘리고, 트리거 중첩은 아래 VERSION_GUARD_MIN_GAP_MS 쿨다운이 30초 1회로 묶는다.
var VERSION_CHECK_INTERVAL_MS = 60000;
var VERSION_GUARD_MIN_GAP_MS = 30000;
var SW_CACHE_PREFIXES = [
  'kkul-mansaeryeok-',
  'workbox',
  'code-destiny',
  'next',
  'tadagochi',
  'legacy'
];

function pickRuntimeVersion(payload) {
  if (!payload || typeof payload !== 'object') return APP_VERSION;
  var candidates = [payload.commitShort, payload.commit, payload.builtAt];
  for (var i = 0; i < candidates.length; i += 1) {
    var value = String(candidates[i] || '').trim();
    if (value) return value;
  }
  return APP_VERSION;
}

function resolveRuntimeVersion() {
  // no-store 가 이미 브라우저 캐시를 우회한다 — ?t= 캐시버스트는 캐시 키만 무한 분열시켜 매 요청을
  // 오리진까지 보냈다. 고정 URL 이면 중간 계층이 짧게라도 흡수할 수 있고, 응답 본문 계약은 동일하다.
  return fetch('/version.json', { cache: 'no-store' })
    .then(function(res) {
      if (!res.ok) return null;
      return res.json().catch(function() { return null; });
    })
    .then(function(payload) {
      APP_VERSION = pickRuntimeVersion(payload);
      return APP_VERSION;
    })
    .catch(function() {
      return APP_VERSION;
    });
}

/** 모든 SW 해제 + 모든 Cache Storage 삭제 */
function nukeAllCachesLegacy() {
  var tasks = [];
  if ('serviceWorker' in navigator) {
    tasks.push(
      navigator.serviceWorker.getRegistrations().then(function(regs) {
        return Promise.all(regs.map(function(reg) { return reg.unregister(); }));
      }).catch(function() {})
    );
  }
  if ('caches' in window) {
    tasks.push(
      caches.keys().then(function(keys) {
        return Promise.all(keys.map(function(key) { return caches.delete(key); }));
      }).catch(function() {})
    );
  }
  return Promise.all(tasks).catch(function() {});
}

function isVersionGuardVisibleElement(element) {
  if (!element) return false;
  if (element.hidden) return false;
  if (element.getAttribute && element.getAttribute('aria-hidden') === 'true') return false;
  try {
    var style = window.getComputedStyle ? window.getComputedStyle(element) : null;
    if (style && (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0)) return false;
  } catch (e) {}
  return true;
}

function getSukuyoVersionGuardReason() {
  var sukuyoModal = document.getElementById('sukuyoModalOverlay');
  if (isVersionGuardVisibleElement(sukuyoModal)) {
    var sukuyoCard = document.getElementById('sukuyoCard');
    var sukuyoSection = document.getElementById('sukuyoSection');
    var hasResult = isVersionGuardVisibleElement(sukuyoCard)
      || (sukuyoSection && String(sukuyoSection.textContent || '').trim().length > 20);
    return hasResult ? '숙요점 결과 열람 중' : '숙요점 열람 중';
  }

  var sukuyoBookModal = document.getElementById('sukuyoBookModal');
  if (isVersionGuardVisibleElement(sukuyoBookModal)) {
    if (isVersionGuardVisibleElement(document.getElementById('skResultScreen'))) return '숙요점 궁합 결과 열람 중';
    if (isVersionGuardVisibleElement(document.getElementById('skLoadingScreen'))) return '숙요점 궁합 생성 중';
    return '숙요점 궁합 입력 중';
  }

  return '';
}

function getActiveVersionGuardModalReason() {
  var selectors = [
    '#tilePvwOverlay.pvw-open',
    '#sajuLoaderOverlay[aria-hidden="false"]',
    '#cdPaidFeatureGate.is-open',
    '.MobileFeatureBottomSheet[aria-hidden="false"]',
    '[role="dialog"][aria-hidden="false"]',
    '.modal-overlay.is-open',
    '.modal-overlay.show'
  ];
  for (var i = 0; i < selectors.length; i += 1) {
    var node = null;
    try { node = document.querySelector(selectors[i]); } catch (e) { node = null; }
    if (isVersionGuardVisibleElement(node)) return '서비스 창 열람 중';
  }
  try {
    var lastAction = window.__cdLastMobileAction;
    if (lastAction && Number(lastAction.at) > 0 && Date.now() - Number(lastAction.at) < 3000) {
      return '서비스 진입 중';
    }
  } catch (e) {}
  return '';
}

function getActiveMobileCollectionGuardReason() {
  try {
    var isMobile = !window.matchMedia || window.matchMedia('(max-width: 768px), (hover: none) and (pointer: coarse)').matches;
    if (!isMobile) return '';
    if (document.querySelector('#inputPage [data-collection-open="true"]')) return 'mobile collection open';
  } catch (e) {}
  return '';
}

function isCriticalOperationInProgress() {
  try {
    if (window.__CD_PAYMENT_PROCESSING__) return '결제 처리 중';
    if (window.__CD_VERSION_GUARD_BLOCK__) return '중요 입력 작업 진행 중';
    if (document && document.body && document.body.dataset && document.body.dataset.cdVersionGuardBusy === '1') {
      return '핵심 작업 진행 중';
    }
    var sukuyoReason = getSukuyoVersionGuardReason();
    if (sukuyoReason) return sukuyoReason;
    var modalReason = getActiveVersionGuardModalReason();
    if (modalReason) return modalReason;
    var collectionReason = getActiveMobileCollectionGuardReason();
    if (collectionReason) return collectionReason;

    var active = document.activeElement;
    if (active) {
      var tagName = String(active.tagName || '').toLowerCase();
      var isEditable = !!active.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select';
      if (isEditable) {
        var value = String(active.value || '').trim();
        var text = String(active.textContent || '').trim();
        if (value || text) return '입력 중';
      }
    }
  } catch (e) {}

  return '';
}

function removeVersionUpdateBanner() {
  var existing = document.getElementById(VERSION_GUARD_BANNER_ID);
  if (existing && existing.parentNode) {
    existing.parentNode.removeChild(existing);
  }
}

function applyVersionRefresh(version) {
  return nukeAllCachesLegacy().then(function() {
    try { localStorage.setItem(APP_VERSION_KEY, version); } catch (e) {}
    try { localStorage.setItem(SW_PURGED_VERSION_KEY, version); } catch (e) {}
    try {
      sessionStorage.setItem(APP_VERSION_RELOAD_GUARD, version);
      sessionStorage.removeItem(APP_VERSION_DEFER_GUARD);
    } catch (e) {}
    var nextUrl;
    try {
      var parsed = new URL(window.location.href);
      parsed.searchParams.set('v', version);
      nextUrl = parsed.toString();
    } catch (e) {
      nextUrl = window.location.href;
    }
    window.location.replace(nextUrl);
    return version;
  });
}

function showVersionUpdateBanner(version, reason) {
  if (!document || !document.body) return;

  var messageText = reason
    ? ('현재 ' + reason + ' 상태여서 자동 새로고침을 보류했습니다.')
    : '준비되면 새로고침해 주세요. 지금 화면은 그대로 유지됩니다.';

  var existing = document.getElementById(VERSION_GUARD_BANNER_ID);
  if (existing) {
    var messageNode = existing.querySelector('[data-cd-version-message]');
    if (messageNode) {
      messageNode.textContent = messageText;
    }
    existing.setAttribute('data-version', version);
    return;
  }

  var banner = document.createElement('div');
  banner.id = VERSION_GUARD_BANNER_ID;
  banner.setAttribute('data-version', version);
  banner.style.position = 'fixed';
  banner.style.left = '12px';
  banner.style.right = '12px';
  banner.style.bottom = '12px';
  banner.style.zIndex = '2147483647';
  banner.style.background = '#fffbeb';
  banner.style.border = '1px solid rgba(217,119,6,0.35)';
  banner.style.borderRadius = '12px';
  banner.style.padding = '12px 14px';
  banner.style.boxShadow = '0 12px 30px rgba(0,0,0,0.18)';
  banner.style.color = '#7c2d12';
  banner.style.fontFamily = 'Pretendard, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
  banner.style.pointerEvents = 'none';

  var compactMobileBanner = false;
  try {
    compactMobileBanner = !!(window.matchMedia && window.matchMedia('(max-width: 640px), (pointer: coarse)').matches);
  } catch (e) {
    compactMobileBanner = false;
  }
  if (compactMobileBanner) {
    banner.style.left = 'auto';
    banner.style.right = '10px';
    banner.style.bottom = 'max(10px, env(safe-area-inset-bottom, 0px))';
    banner.style.width = 'min(168px, calc(100vw - 20px))';
    banner.style.padding = '8px';
    banner.style.borderRadius = '10px';
  }

  var title = document.createElement('div');
  title.textContent = '새 버전이 배포되었습니다.';
  title.style.fontSize = '14px';
  title.style.fontWeight = '700';
  title.style.marginBottom = '4px';
  if (compactMobileBanner) {
    title.style.fontSize = '12px';
    title.style.marginBottom = '2px';
  }

  var message = document.createElement('div');
  message.setAttribute('data-cd-version-message', '1');
  message.textContent = messageText;
  message.style.fontSize = '12px';
  message.style.opacity = '0.92';
  if (compactMobileBanner) {
    message.style.display = 'none';
  }

  var actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.gap = '8px';
  actions.style.justifyContent = 'flex-end';
  actions.style.marginTop = '10px';
  actions.style.pointerEvents = 'none';
  if (compactMobileBanner) {
    actions.style.gap = '5px';
    actions.style.marginTop = '6px';
    actions.style.justifyContent = 'stretch';
  }

  var laterButton = document.createElement('button');
  laterButton.type = 'button';
  laterButton.textContent = '나중에';
  laterButton.style.border = '1px solid rgba(120,53,15,0.2)';
  laterButton.style.background = '#ffffff';
  laterButton.style.color = '#7c2d12';
  laterButton.style.borderRadius = '8px';
  laterButton.style.padding = '6px 10px';
  laterButton.style.fontSize = '12px';
  laterButton.style.fontWeight = '700';
  laterButton.style.pointerEvents = 'auto';
  if (compactMobileBanner) {
    laterButton.style.flex = '1 1 0';
    laterButton.style.padding = '5px 6px';
    laterButton.style.fontSize = '11px';
  }
  laterButton.addEventListener('click', function() {
    try { sessionStorage.setItem(APP_VERSION_DEFER_GUARD, version); } catch (e) {}
    removeVersionUpdateBanner();
  });

  var refreshButton = document.createElement('button');
  refreshButton.type = 'button';
  refreshButton.textContent = '지금 새로고침';
  refreshButton.style.border = '0';
  refreshButton.style.background = '#b45309';
  refreshButton.style.color = '#ffffff';
  refreshButton.style.borderRadius = '8px';
  refreshButton.style.padding = '6px 10px';
  refreshButton.style.fontSize = '12px';
  refreshButton.style.fontWeight = '700';
  refreshButton.style.pointerEvents = 'auto';
  if (compactMobileBanner) {
    refreshButton.style.flex = '1 1 0';
    refreshButton.style.padding = '5px 6px';
    refreshButton.style.fontSize = '11px';
  }
  refreshButton.addEventListener('click', function() {
    applyVersionRefresh(version);
  });

  actions.appendChild(laterButton);
  actions.appendChild(refreshButton);

  banner.appendChild(title);
  banner.appendChild(message);
  banner.appendChild(actions);
  document.body.appendChild(banner);
}

var __versionGuardInFlight = false;
var __versionGuardLastStartedAt = 0;
function runNuclearVersionGuard() {
  // focus·visibilitychange·interval·이벤트가 겹쳐 version.json을 중복 요청하지 않도록 단일 실행 보장.
  if (__versionGuardInFlight) return Promise.resolve();
  // 🔴 ① 트리거가 겹쳐도 30초(VERSION_GUARD_MIN_GAP_MS)에 1회를 넘지 않는다 ② 결제 등 critical
  // operation 중에는 fetch 자체를 내보내지 않는다 — 예전에는 리로드만 막고 요청은 그대로 나가서
  // 결제 네트워크와 경쟁했다. 상태가 풀리면 cd:critical-operation-state 리스너와 60초 폴링이
  // 늦어도 한 주기 안에 재검사한다(자동 리로드는 이미 폐지, 배너 안내라 지연 비용이 없다).
  var now = Date.now();
  if (now - __versionGuardLastStartedAt < VERSION_GUARD_MIN_GAP_MS) return Promise.resolve();
  if (isCriticalOperationInProgress()) return Promise.resolve();
  __versionGuardLastStartedAt = now;
  __versionGuardInFlight = true;
  return resolveRuntimeVersion().then(function(version) {
    // dev 버전 또는 fetch 실패 시 아무 작업 안 함
    if (!version || version === 'dev') return version;

    var saved = '';
    try { saved = localStorage.getItem(APP_VERSION_KEY) || ''; } catch (e) { saved = ''; }

    // 저장값이 없다 = 이 브라우저/앱이 이 사이트를 처음 본다. 지금 손에 든 문서는 방금 받아온
    // 것이라(셸은 no-store, 앱은 번들 에셋) 같은 URL 을 다시 로드해도 달라질 것이 없다.
    // 이걸 "버전 불일치"로 흘려보내면 첫 방문·재설치·배포 직후 사용자가 전원 강제 리로드를
    // 한 번씩 겪는다(=메인 화면 이중 로딩). 버전만 기록하고 캐시 정리는 그대로 수행한다.
    if (!saved) {
      try { localStorage.setItem(APP_VERSION_KEY, version); } catch (e) {}
    }

    if (!saved || saved === version) {
      removeVersionUpdateBanner();
      // 버전 동일: SW/캐시만 정리 (이미 정리된 버전이면 skip)
      var purged = '';
      try { purged = localStorage.getItem(SW_PURGED_VERSION_KEY) || ''; } catch (e) {}
      if (purged !== version) {
        nukeAllCachesLegacy().then(function() {
          try { localStorage.setItem(SW_PURGED_VERSION_KEY, version); } catch (e) {}
        });
      }
      return version;
    }

    // 버전 불일치: 무한 reload 방지 체크
    var reloaded = '';
    try { reloaded = sessionStorage.getItem(APP_VERSION_RELOAD_GUARD) || ''; } catch (e) { reloaded = ''; }

    if (reloaded === version) {
      // 이미 이 버전으로 reload 했음 → 버전만 저장하고 종료
      try { localStorage.setItem(APP_VERSION_KEY, version); } catch (e) {}
      return version;
    }

    var deferred = '';
    try { deferred = sessionStorage.getItem(APP_VERSION_DEFER_GUARD) || ''; } catch (e) { deferred = ''; }
    if (deferred === version) {
      removeVersionUpdateBanner();
      return version;
    }

    // 🔴 자동 location.replace 는 하지 않는다(2026-08-01 폐지). 배포마다 저장된 버전과 다른 모든
    // 재방문자가 매번 자동 리로드를 1회씩 겪었고, 하필 noncritical-defer-loader 가 share.js 를
    // 첫 기능 탭/45초 방치/앱 전환 시점에 주입해 "탭했더니 화면이 통째로 새로고침됨"으로 보였다
    // (15초 interval + focus + visibilitychange 가 계속 재검사한다). 스토리지가 막힌 환경(iOS
    // 프라이빗 모드 등)에서는 무한 reload 방지 가드까지 무력화돼 15초마다 영구 리로드로 번졌다.
    // '/' · '/index.html' 은 no-store 라 다음 문서 이동에서 어차피 최신을 받는다 — 자동 리로드는
    // 신선도 유지의 필수 수단이 아니라 가장 거친 수단이었다. 캐시 정리는 그대로 하고 배너로 맡긴다.
    var blockingReason = isCriticalOperationInProgress();
    // 배너는 응답 없이 매 15초/포커스마다 재호출되므로, 캐시 정리는 이 버전당 한 번만 한다
    // (안 그러면 SW 해제·Cache Storage 삭제가 사용자가 새로고침을 누를 때까지 계속 반복된다).
    var purgedForVersion = '';
    try { purgedForVersion = localStorage.getItem(SW_PURGED_VERSION_KEY) || ''; } catch (e) {}
    if (purgedForVersion !== version) {
      nukeAllCachesLegacy().then(function() {
        try { localStorage.setItem(SW_PURGED_VERSION_KEY, version); } catch (e) {}
      });
    }
    showVersionUpdateBanner(version, blockingReason);
    return version;
  }).finally(function() {
    __versionGuardInFlight = false;
  });
}

runNuclearVersionGuard();

if (typeof window !== 'undefined') {
  setInterval(function() {
    runNuclearVersionGuard();
  }, VERSION_CHECK_INTERVAL_MS);

  window.addEventListener('focus', function() {
    runNuclearVersionGuard();
  });

  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
      runNuclearVersionGuard();
    }
  });

  window.addEventListener('cd:critical-operation-state', function() {
    runNuclearVersionGuard();
  });
}

function getShareText(){
  var name=USER_NAME||'사용자';
  var base=cdBuildShareUrl('saju');
  return name+'님의 사주 분석 결과를 확인해보세요! 🐷✨\n꿀꿀 만세력\n'+base;
}
function showToast(msg){
  var t=document.getElementById('shareToast');
  t.textContent=msg;t.classList.add('show');
  setTimeout(function(){t.classList.remove('show');},2500);
}

/* ═══════════════════════════════════════════════════════════════════
   공유 링크형 유입 — 결과 공유 링크가 "결제 유도 지점"으로 딥링크되고,
   로그인 사용자의 리퍼럴 코드가 링크에 실려 추천 가입 보상까지 이어지게 한다.
   · 딥링크: 기존 ?action= 디스패처(legacy-action-launcher.js) 재사용
   · 리퍼럴: 기존 /api/auth/referral/kakao-share 엔드포인트 재사용(서버 무변경)
   ─────────────────────────────────────────────────────────────────── */
// contentId → 홈 셸에서 해당 기능을 여는 검증된 data-action (빈 값이면 홈=사주 입력).
var CD_SHARE_ACTION_MAP = {
  saju: '',
  tarot: 'openTarotModal',
  astro: 'openAstroModal',
  sukuyo: 'openSukuyoModal',
  ziwei: 'openZiweiModal',
  lovesecret: '',
  lifebook: ''
};
var CD_SHARE_REFERRAL_SESSION_KEY = 'cd_share_referral_v1';
var __cdShareReferral = null; // { ref, rs, via } | {} (없음)

function cdReadCachedReferral(){
  if (__cdShareReferral) return __cdShareReferral;
  try {
    var cached = sessionStorage.getItem(CD_SHARE_REFERRAL_SESSION_KEY);
    if (cached) { __cdShareReferral = JSON.parse(cached) || {}; return __cdShareReferral; }
  } catch (_) {}
  return null;
}

// 세션당 1회만 인증 엔드포인트를 호출해 리퍼럴 파라미터를 미리 확보한다.
// (navigator.share 는 user-activation 이 필요하므로 공유 시점엔 동기 조회만 하도록 사전 프라이밍)
function cdPrimeReferralParams(){
  try {
    if (cdReadCachedReferral()) return;
    var token = '';
    try { token = localStorage.getItem('fortune_auth_token') || ''; } catch (_) {}
    if (!token) { __cdShareReferral = {}; return; } // 비로그인: 리퍼럴 없이 딥링크만
    var base = (typeof getApiBaseUrl === 'function') ? getApiBaseUrl() : '';
    fetch(base + '/api/auth/referral/kakao-share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: '{}'
    })
      .then(function(res){ return res.ok ? res.json() : null; })
      .then(function(data){
        if (data && data.ok && data.referralCode) {
          __cdShareReferral = { ref: data.referralCode, rs: data.referralShareToken || '', via: 'kakao_reward' };
          try { sessionStorage.setItem(CD_SHARE_REFERRAL_SESSION_KEY, JSON.stringify(__cdShareReferral)); } catch (_) {}
        } else {
          __cdShareReferral = {};
        }
      })
      .catch(function(){ __cdShareReferral = {}; });
  } catch (_) { __cdShareReferral = {}; }
}

// contentId 로 "결제 유도 지점" 딥링크 URL을 만든다(리퍼럴 파라미터 자동 부착).
function cdBuildShareUrl(contentId){
  var origin = 'https://code-destiny.com';
  try {
    if (window.location && window.location.origin && /^https?:/.test(window.location.origin)) origin = window.location.origin;
  } catch (_) {}
  var action = Object.prototype.hasOwnProperty.call(CD_SHARE_ACTION_MAP, contentId) ? CD_SHARE_ACTION_MAP[contentId] : '';
  var qs = [];
  if (action) qs.push('action=' + encodeURIComponent(action));
  var r = cdReadCachedReferral() || {};
  if (r.ref) {
    qs.push('ref=' + encodeURIComponent(r.ref));
    if (r.rs) qs.push('rs=' + encodeURIComponent(r.rs));
    qs.push('via=' + encodeURIComponent(r.via || 'kakao_reward'));
  }
  return origin + '/' + (qs.length ? ('?' + qs.join('&')) : '');
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'complete') {
    cdPrimeReferralParams();
  } else {
    window.addEventListener('load', function(){ cdPrimeReferralParams(); });
  }
  // 로그인/로그아웃 시 캐시를 비우고 다시 프라이밍(계정 전환 정합).
  window.addEventListener('cd:auth-changed', function(){
    try { sessionStorage.removeItem(CD_SHARE_REFERRAL_SESSION_KEY); } catch (_) {}
    __cdShareReferral = null;
    cdPrimeReferralParams();
  });
}

function shareKakao(){
  shareWithReward(function(){
    var text=getShareText();
    if(navigator.share){
      navigator.share({title:_shareText("share.001"),text:text,url:cdBuildShareUrl('saju')}).catch(function(){});
      return;
    }
    var encoded=encodeURIComponent(text);
    var a=document.createElement('a');a.href='kakaotalk://send?text='+encoded;a.click();
    setTimeout(function(){
      copyToClipboard(text,'카카오톡 앱이 없거나 PC에서는 링크를 복사했어요! 카카오톡에 붙여넣기 하세요 💬');
    },800);
  },'saju');
}
function shareInstagram(){
  var text=getShareText();
  copyToClipboard(text,'링크를 복사했어요! 📷 인스타그램 DM에 붙여넣기 하세요 ✨');
}
function shareTarotKakao(){
  shareWithReward(function(){
    var cName    = document.getElementById('tarotCardName').innerText || '운명의 카드';
    var cFortune = document.getElementById('destinyFortune').innerText || '';
    var cOracle  = document.getElementById('tarotOracleText').innerText || '';
    var tarotUrl = cdBuildShareUrl('tarot');
    var text = '🔮 [연이의 꿀꿀 타로] 🔮\n\n' + cName + '\n\n' + cFortune + '\n\n' + cOracle + '\n\n👉 무료 타로 보러가기: ' + tarotUrl;
    if(navigator.share){
      navigator.share({title:_shareText("share.002"),text:text,url:tarotUrl}).catch(function(){});
      return;
    }
    var a=document.createElement('a');a.href='kakaotalk://send?text='+encodeURIComponent(text);a.click();
    setTimeout(function(){copyToClipboard(text,'카카오톡 앱이 없거나 PC에서는 클립보드에 복사했어요! 💬');},1000);
  },'tarot');
}
function shareAstroKakao() {
  shareWithReward(function() {
    var name = (window.DestinyProfileManager && window.DestinyProfileManager.storage)
      ? ((window.DestinyProfileManager.storage.current() || {}).name || '나')
      : (window.USER_NAME || '나');
    var section = document.getElementById('astroResult');
    var preview = section ? _trimShareText(section.innerText, 240) : '';
    var base = cdBuildShareUrl('astro');
    var text = '✨ [점성술 코즈믹 차트 결과 공유]\n\n'
      + name + '님의 점성술 분석 결과입니다.\n'
      + (preview ? ('\n' + preview + '\n') : '\n')
      + '\n나도 무료로 확인하기 👇\n' + base;
    if (navigator.share) {
      navigator.share({ title: _shareText("share.003"), text: text, url: base }).catch(function(){});
      return;
    }
    var a = document.createElement('a');
    a.href = 'kakaotalk://send?text=' + encodeURIComponent(text);
    a.click();
    setTimeout(function() {
      copyToClipboard(text, '카카오톡 앱이 없거나 PC에서는 링크를 복사했어요! 카카오톡에 붙여넣기 하세요 💬');
    }, 800);
  }, 'astro');
}

function _trimShareText(raw, maxLen) {
  var s = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  return s.length > (maxLen || 220) ? s.slice(0, (maxLen || 220)) + '...' : s;
}

function shareSukuyoKakao() {
  shareWithReward(function() {
    var name = (window.DestinyProfileManager && window.DestinyProfileManager.storage)
      ? ((window.DestinyProfileManager.storage.current() || {}).name || '나')
      : (window.USER_NAME || '나');
    var basic = (window._syLastSukuyoBasicResult && typeof window._syLastSukuyoBasicResult === 'object')
      ? window._syLastSukuyoBasicResult
      : {};
    var displayIndex = basic.displayIndex || (Number.isFinite(Number(basic.mansionIdx)) ? Number(basic.mansionIdx) + 1 : '');
    var daily = (basic.daily && typeof basic.daily === 'object') ? basic.daily : {};
    var dailyMoon = (daily.moon && typeof daily.moon === 'object') ? daily.moon : {};
    var lines = [];
    if (basic.mansion) lines.push('본명숙: ' + basic.mansion + (displayIndex ? ' · ' + displayIndex + '/27' : ''));
    if (dailyMoon.label) lines.push('오늘 달 리듬: ' + dailyMoon.label);
    if (daily.insight) lines.push('핵심 조언: ' + _trimShareText(daily.insight, 90));
    var preview = lines.length ? lines.join('\n') : '';
    if (!preview) {
      var section = document.getElementById('sukuyoSection');
      preview = section ? _trimShareText(section.innerText, 180) : '';
    }
    var base = cdBuildShareUrl('sukuyo');
    var text = '[무료 기본 숙요점 결과]\n\n'
      + name + '님의 기본 숙요점 요약입니다.\n'
      + (preview ? ('\n' + preview + '\n') : '\n')
      + '\n나의 본명숙 확인하기\n' + base;
    if (navigator.share) {
      navigator.share({ title: _shareText("share.004"), text: text, url: base }).catch(function(){});
      return;
    }
    var a = document.createElement('a');
    a.href = 'kakaotalk://send?text=' + encodeURIComponent(text);
    a.click();
    setTimeout(function() {
      copyToClipboard(text, '숙요점 공유 문구를 복사했어요. 카카오톡에 붙여넣어 주세요.');
    }, 800);
  }, 'sukuyo');
}

function shareZiweiKakao() {
  shareWithReward(function() {
    var name = (window.DestinyProfileManager && window.DestinyProfileManager.storage)
      ? ((window.DestinyProfileManager.storage.current() || {}).name || '나')
      : (window.USER_NAME || '나');
    var section = document.getElementById('ziweiModalSection');
    var preview = section ? _trimShareText(section.innerText, 240) : '';
    var base = cdBuildShareUrl('ziwei');
    var text = '🌌 [자미두수 명반 결과 공유]\n\n'
      + name + '님의 자미두수 결과입니다.\n'
      + (preview ? ('\n' + preview + '\n') : '\n')
      + '\n나도 무료로 확인하기 👇\n' + base;
    if (navigator.share) {
      navigator.share({ title: _shareText("share.005"), text: text, url: base }).catch(function(){});
      return;
    }
    var a = document.createElement('a');
    a.href = 'kakaotalk://send?text=' + encodeURIComponent(text);
    a.click();
    setTimeout(function() {
      copyToClipboard(text, '카카오톡 앱이 없거나 PC에서는 링크를 복사했어요! 카카오톡에 붙여넣기 하세요 💬');
    }, 800);
  }, 'ziwei');
}
function shareLifeBookKakao() {
  shareWithReward(function () {
    var name = (window.__cdActiveBirthProfile && window.__cdActiveBirthProfile.name)
      || (window.USER_NAME || '사용자');
    var base = cdBuildShareUrl('lifebook');
    var text = '사주 [인생의 책 결과]\n\n'
      + name + '님의 인생의 책 결과를 공유합니다.\n\n'
      + '매력적인 문장으로 정리한 인생의 책 요약입니다.\n\n'
      + '아래 링크에서 확인하세요.\n' + base;
    if (navigator.share) {
      navigator.share({ title: _shareText("share.006"), text: text, url: base }).catch(function () {});
      return;
    }
    var a = document.createElement('a');
    a.href = 'kakaotalk://send?text=' + encodeURIComponent(text);
    a.click();
    setTimeout(function () {
      copyToClipboard(text, '클립보드에 복사되었습니다. PC에서는 우클릭 붙여넣기 후 공유하세요.');
    }, 800);
  }, 'lifebook');
}

function shareLoveSecretKakao() {
  shareWithReward(function () {
    var name = (window.__cdActiveBirthProfile && window.__cdActiveBirthProfile.name)
      || (window.USER_NAME || '사용자');
    var base = cdBuildShareUrl('lovesecret');
    var text = '💕 [연애 비책 — 운명이 설계한 사랑의 지도]\n\n'
      + name + '님만을 위한 사주 명리학자의 10가지 연애 전략을 받았어요!\n\n'
      + '🔑 연애 자아 분석 · 💘 매력 해독 · ⚔️ 밀당 전략 · 🌿 개운 처방전\n\n'
      + '나도 무료로 확인하기 👇\n' + base;
    if (navigator.share) {
      navigator.share({ title: _shareText("share.007"), text: text, url: base }).catch(function () {});
      return;
    }
    var a = document.createElement('a');
    a.href = 'kakaotalk://send?text=' + encodeURIComponent(text);
    a.click();
    setTimeout(function () {
      copyToClipboard(text, '카카오톡 앱이 없거나 PC에서는 링크를 복사했어요! 카카오톡에 붙여넣기 하세요 💬');
    }, 800);
  }, 'lovesecret');
}

/* ══════════════════════════════════════════════════════════════════
   궁합 초대 링크형 유입 (Phase 2a) — 최고 K팩터 바이럴 루프.
   A가 초대 링크를 공유 → B가 링크를 열면 궁합 폼이 A의 생일로 자동
   채워지고, B가 자기 사주를 확인하면 A×B 궁합(기존 유료 5,000원,
   pass-first)으로 이어진다. Phase1 리퍼럴도 그대로 승계된다.
   · 기존 유료 궁합 경로(runCompat/runCompatCore/analyzeCompat)는
     전혀 건드리지 않는다(매출 경로 회귀 위험 0).
   · 딥링크는 기존 ?action= 런처(openCompatInvite) 재사용, index.html
     6미러/워커 무변경. cp = A 생일의 base64url(JSON).
   · 무료 요약 티어는 수익 경로 리팩터링이 필요해 Phase 2b로 분리.
   ══════════════════════════════════════════════════════════════════ */
var CD_COMPAT_INVITE_SESSION_KEY = 'cd_compat_invite_v1';

function _cdB64UrlEncode(str){
  try {
    var b64 = btoa(unescape(encodeURIComponent(str)));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (_) { return ''; }
}
function _cdB64UrlDecode(b64){
  try {
    var s = String(b64 || '').replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return decodeURIComponent(escape(atob(s)));
  } catch (_) { return ''; }
}

// A(공유자)의 생일 데이터 — 사주 계산 시 채워지는 전역에서 읽는다(runCompatCore와 동일 소스).
function cdReadSelfBirthForInvite(){
  try {
    var meta = window._ziweiInputMeta || {};
    var d = meta.inputDate || {};
    var astro = window._astroBirth || null;
    var zb = window._ziweiBirth || null;
    var y = d.year || (astro && astro.year) || (zb && zb.year) || null;
    var m = d.month || (astro && astro.month) || (zb && zb.month) || null;
    var day = d.day || (astro && astro.day) || (zb && zb.day) || null;
    if (!y || !m || !day) return null;
    var h = (d.hour != null ? d.hour : ((astro && astro.hour) != null ? astro.hour : ((zb && zb.hour) != null ? zb.hour : 12)));
    var mi = (d.minute != null ? d.minute : ((astro && astro.minute) != null ? astro.minute : ((zb && zb.minute) != null ? zb.minute : 0)));
    var cal = meta.calType || 'solar';
    var nm = '';
    try {
      nm = (window.DestinyProfileManager && window.DestinyProfileManager.storage)
        ? ((window.DestinyProfileManager.storage.current() || {}).name || '')
        : '';
    } catch (_) {}
    if (!nm && typeof window.USER_NAME === 'string') nm = window.USER_NAME || '';
    return { n: String(nm || '').slice(0, 20), y: y, m: m, d: day, h: h, mi: mi, c: cal };
  } catch (_) { return null; }
}

function cdBuildCompatInviteUrl(){
  var self = cdReadSelfBirthForInvite();
  if (!self) return null;
  var cp = _cdB64UrlEncode(JSON.stringify(self));
  if (!cp) return null;
  var origin = 'https://code-destiny.com';
  try { if (window.location && window.location.origin && /^https?:/.test(window.location.origin)) origin = window.location.origin; } catch (_) {}
  var qs = ['action=openCompatInvite', 'cp=' + encodeURIComponent(cp)];
  var r = cdReadCachedReferral() || {};
  if (r.ref) {
    qs.push('ref=' + encodeURIComponent(r.ref));
    if (r.rs) qs.push('rs=' + encodeURIComponent(r.rs));
    qs.push('via=' + encodeURIComponent(r.via || 'kakao_reward'));
  }
  return origin + '/?' + qs.join('&');
}

function shareCompatInviteKakao(){
  var url = cdBuildCompatInviteUrl();
  if (!url) {
    if (typeof showToast === 'function') showToast('먼저 내 사주를 확인한 뒤 궁합 초대 링크를 만들 수 있어요 🐷');
    return;
  }
  var self = cdReadSelfBirthForInvite() || {};
  var who = self.n ? (self.n + '님') : '내';
  shareWithReward(function(){
    var text = '💞 [궁합 초대] ' + who + '과의 궁합, 같이 볼래요?\n\n'
      + '아래 링크를 열고 생년월일만 입력하면 ' + who + '과의 사주 궁합을 바로 확인할 수 있어요.\n\n' + url;
    if (navigator.share) {
      navigator.share({ title: '💞 궁합 초대', text: text, url: url }).catch(function(){});
      return;
    }
    var a = document.createElement('a');
    a.href = 'kakaotalk://send?text=' + encodeURIComponent(text);
    a.click();
    setTimeout(function(){ copyToClipboard(text, '궁합 초대 링크를 복사했어요! 카카오톡에 붙여넣어 주세요 💬'); }, 800);
  }, 'compat-invite');
}

// B(받는 사람) 화면: 궁합 폼에 A 정보 자동 채움.
function _cdApplyCompatInvitePrefill(inv){
  if (!inv || !inv.y || !inv.m || !inv.d) return false;
  var dateEl = document.getElementById('compatBirthDate');
  if (!dateEl) return false; // 폼 미존재(사주 미계산) — 등장 시 재시도
  function pad(n){ n = String(n); return n.length < 2 ? '0' + n : n; }
  try {
    var nameEl = document.getElementById('compatName');
    if (nameEl && inv.n) nameEl.value = inv.n;
    dateEl.value = inv.y + '-' + pad(inv.m) + '-' + pad(inv.d);
    var cal = (inv.c === 'lunar' || inv.c === 'lunar_leap') ? inv.c : 'solar';
    var calBtns = document.getElementsByName('compatCalType');
    for (var i = 0; i < calBtns.length; i++) { calBtns[i].checked = (calBtns[i].value === cal); }
    var hourEl = document.getElementById('compatBirthHour');
    if (hourEl && inv.h != null) hourEl.value = String(inv.h);
    var minEl = document.getElementById('compatBirthMinute');
    if (minEl && inv.mi != null) minEl.value = String(inv.mi);
  } catch (_) { return false; }
  return true;
}

function _cdShowCompatInviteBanner(inv){
  var who = (inv && inv.n) ? (inv.n + '님') : '상대방';
  var card = document.getElementById('compatCard');
  var host = document.getElementById('cdCompatInviteBanner');
  if (!host) {
    host = document.createElement('div');
    host.id = 'cdCompatInviteBanner';
    host.setAttribute('role', 'status');
    host.style.cssText = 'margin:12px 0;padding:14px 16px;border-radius:14px;background:linear-gradient(135deg,#fff3f8,#ffe3ec);border:1px solid rgba(216,27,96,0.22);color:#3c1830;font-size:.86rem;line-height:1.6;box-shadow:0 6px 18px rgba(216,27,96,0.12);';
    if (card && card.parentNode) card.parentNode.insertBefore(host, card);
    else document.body.appendChild(host);
  }
  host.innerHTML = '<b>💞 ' + who + '이(가) 궁합을 신청했어요!</b><br>'
    + '당신의 생년월일로 사주를 확인하면 ' + who + '과의 궁합을 바로 볼 수 있어요. 상대 정보는 미리 채워 두었습니다.';
}

function openCompatInvite(){
  // 런처가 fn() 직후 replaceState로 쿼리를 지우므로 cp를 최우선(동기) 확보.
  var cp = '';
  try { cp = new URLSearchParams(window.location.search || '').get('cp') || ''; } catch (_) {}
  var inv = null;
  if (cp) {
    var json = _cdB64UrlDecode(cp);
    if (json) { try { inv = JSON.parse(json); } catch (_) { inv = null; } }
  }
  if (!inv) {
    try { var cached = sessionStorage.getItem(CD_COMPAT_INVITE_SESSION_KEY); if (cached) inv = JSON.parse(cached); } catch (_) {}
  }
  if (!inv || !inv.y) return;
  try { sessionStorage.setItem(CD_COMPAT_INVITE_SESSION_KEY, JSON.stringify(inv)); } catch (_) {}

  _cdShowCompatInviteBanner(inv);
  var applied = _cdApplyCompatInvitePrefill(inv);
  if (!applied) {
    // 폼이 아직 없으면(사주 미계산) 폼 등장 시 1회 재적용(최대 30초).
    var tries = 0;
    var timer = setInterval(function(){
      tries += 1;
      if (_cdApplyCompatInvitePrefill(inv) || tries > 60) clearInterval(timer);
    }, 500);
  } else {
    var card = document.getElementById('compatCard');
    if (card) setTimeout(function(){ try { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {} }, 300);
  }
}

// A용 초대 버튼을 궁합 카드에 주입(index.html 미편집).
function _cdInjectCompatInviteButton(){
  try {
    var card = document.getElementById('compatCard');
    if (!card || document.getElementById('cdCompatInviteShareBtn')) return;
    var btn = document.createElement('button');
    btn.id = 'cdCompatInviteShareBtn';
    btn.type = 'button';
    btn.textContent = '💌 궁합 초대 링크 공유';
    btn.setAttribute('aria-label', '궁합 초대 링크 카카오톡 공유');
    btn.style.cssText = 'margin:8px 0 0;width:100%;padding:11px 14px;border:0;border-radius:12px;background:linear-gradient(135deg,#e8497f,#d81b60);color:#fff;font-size:.88rem;font-weight:800;cursor:pointer;box-shadow:0 6px 16px rgba(216,27,96,0.28);';
    btn.addEventListener('click', function(){ shareCompatInviteKakao(); });
    var runBtn = document.getElementById('compatRunBtn');
    if (runBtn && runBtn.parentNode) runBtn.parentNode.insertBefore(btn, runBtn.nextSibling);
    else card.appendChild(btn);
  } catch (_) {}
}

/* ══════════════════════════════════════════════════════════════════
   일반 운세 공유 일반화 — 기능별 bespoke 함수 없이, 어떤 운세 기능이든
   이 공용 함수로 결과를 공유한다(리퍼럴 자동 부착·shareWithReward 재사용).
   기존 per-feature 공유 함수(shareKakao/shareTarotKakao/…)는 전혀 건드리지
   않는다(회귀 위험 0). 신규 기능은 cdShareFortuneKakao({...})만 호출하면 된다.
   ══════════════════════════════════════════════════════════════════ */

// 홈이 아닌 임의 URL(예: /stories/…)에도 리퍼럴 파라미터를 부착한다.
function cdAppendReferralQuery(url){
  var r = cdReadCachedReferral() || {};
  if (!r.ref) return url;
  var sep = String(url || '').indexOf('?') >= 0 ? '&' : '?';
  var qs = ['ref=' + encodeURIComponent(r.ref)];
  if (r.rs) qs.push('rs=' + encodeURIComponent(r.rs));
  qs.push('via=' + encodeURIComponent(r.via || 'kakao_reward'));
  return url + sep + qs.join('&');
}

// 공용 운세 결과 공유. options: { contentId, title, header, cta, preview | previewSelector, maxLen }
// contentId 가 CD_SHARE_ACTION_MAP 에 있으면 해당 모달 딥링크, 없으면 홈으로(리퍼럴은 항상 부착).
function cdShareFortuneKakao(options){
  var opts = options || {};
  var contentId = opts.contentId || 'saju';
  shareWithReward(function(){
    var url = cdBuildShareUrl(contentId);
    var preview = opts.preview || '';
    if (!preview && opts.previewSelector) {
      var node = null;
      try { node = document.querySelector(opts.previewSelector); } catch (_) {}
      preview = node ? _trimShareText(node.innerText, opts.maxLen || 240) : '';
    }
    var header = opts.header || '✨ [코드 데스티니 운세]';
    var cta = opts.cta || '나도 무료로 확인하기 👇';
    var text = header + '\n\n' + (preview ? (preview + '\n\n') : '') + cta + '\n' + url;
    var title = opts.title || _shareText('share.001');
    if (navigator.share) {
      navigator.share({ title: title, text: text, url: url }).catch(function(){});
      return;
    }
    var a = document.createElement('a');
    a.href = 'kakaotalk://send?text=' + encodeURIComponent(text);
    a.click();
    setTimeout(function(){ copyToClipboard(text, '카카오톡 앱이 없거나 PC에서는 링크를 복사했어요! 카카오톡에 붙여넣기 하세요 💬'); }, 800);
  }, contentId);
}

// 라이트 노벨 공유 — 정본 스토리(/codedestiny-novel.html)로, 리퍼럴 승계. (storyId 레거시·무시)
function shareStoryKakao(storyId, storyTitle){
  shareWithReward(function(){
    var origin = 'https://code-destiny.com';
    try { if (window.location && window.location.origin && /^https?:/.test(window.location.origin)) origin = window.location.origin; } catch (_) {}
    var path = '/codedestiny-novel.html';
    var url = cdAppendReferralQuery(origin + path);
    var title = storyTitle || '연이와 네오의 운명 이야기';
    var text = '📖 [코드 데스티니 이야기] ' + title + '\n\n연이와 네오의 운명 여정, 무료로 읽어보세요 👇\n' + url;
    if (navigator.share) {
      navigator.share({ title: title, text: text, url: url }).catch(function(){});
      return;
    }
    var a = document.createElement('a');
    a.href = 'kakaotalk://send?text=' + encodeURIComponent(text);
    a.click();
    setTimeout(function(){ copyToClipboard(text, '이야기 링크를 복사했어요! 카카오톡에 붙여넣어 주세요 💬'); }, 800);
  }, 'story');
}

// 결과 카드 이미지 공유 — 대상 요소를 html2canvas로 캡처해 이미지로 공유(파일 공유 지원 시 File,
// 아니면 이미지 다운로드 + 링크 클립보드). html2canvas가 지연로드라 없으면 1회 로드 후 진행.
// options: { contentId, targetSelector | element, title, caption }
function _cdEnsureHtml2Canvas(cb){
  if (window.html2canvas) { cb(window.html2canvas); return; }
  var loader = document.getElementById('cdH2CShareLoader');
  var onReady = function(){ cb(window.html2canvas || null); };
  if (loader) { loader.addEventListener('load', onReady); loader.addEventListener('error', function(){ cb(null); }); return; }
  var s = document.createElement('script');
  s.id = 'cdH2CShareLoader';
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  s.crossOrigin = 'anonymous';
  s.referrerPolicy = 'no-referrer';
  s.onload = onReady;
  s.onerror = function(){ cb(null); };
  document.head.appendChild(s);
}
function cdShareResultCardImage(options){
  var opts = options || {};
  var contentId = opts.contentId || 'saju';
  var target = null;
  try { target = opts.element || (opts.targetSelector ? document.querySelector(opts.targetSelector) : null); } catch (_) {}
  if (!target) { if (typeof showToast === 'function') showToast('공유할 결과 카드를 찾지 못했어요'); return; }
  shareWithReward(function(){
    _cdEnsureHtml2Canvas(function(h2c){
      if (!h2c) {
        // 이미지 모듈 부재 → 텍스트 공유로 폴백(회귀 안전).
        cdShareFortuneKakao({ contentId: contentId, title: opts.title, header: opts.caption });
        return;
      }
      h2c(target, { backgroundColor: null, scale: 2, useCORS: true, logging: false }).then(function(canvas){
        var url = cdBuildShareUrl(contentId);
        canvas.toBlob(function(blob){
          if (!blob) { cdShareFortuneKakao({ contentId: contentId, title: opts.title, header: opts.caption }); return; }
          var file = null;
          try { file = new File([blob], 'code-destiny-result.png', { type: 'image/png' }); } catch (_) {}
          if (file && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
            navigator.share({ files: [file], title: opts.title || _shareText('share.001'), text: (opts.caption ? (opts.caption + '\n') : '') + url }).catch(function(){});
            return;
          }
          var dl = document.createElement('a');
          dl.href = URL.createObjectURL(blob);
          dl.download = 'code-destiny-result.png';
          document.body.appendChild(dl); dl.click(); document.body.removeChild(dl);
          setTimeout(function(){ try { URL.revokeObjectURL(dl.href); } catch (_) {} }, 4000);
          copyToClipboard(url, '결과 카드 이미지를 저장했어요! 링크도 함께 복사됐어요 💬');
        }, 'image/png');
      }).catch(function(){ cdShareFortuneKakao({ contentId: contentId, title: opts.title, header: opts.caption }); });
    });
  }, contentId);
}

/* 숙요 궁합초대 확장 — saju 궁합초대와 동일 cp(base64url 생일) 재사용하되, 대상이 React 라우트라
   레거시 DOM 프리필 대신 /sukuyo-compatibility-ai?cp= 딥링크로 보내고 React 클라가 personB를 채운다.
   (점성술 시나스트리는 리포에 존재하지 않아 대상 없음.) 기존 saju 궁합초대는 무변경(회귀 0). */
function cdBuildSukuyoCompatInviteUrl(){
  var self = cdReadSelfBirthForInvite();
  if (!self) return null;
  var cp = _cdB64UrlEncode(JSON.stringify(self));
  if (!cp) return null;
  var origin = 'https://code-destiny.com';
  try { if (window.location && window.location.origin && /^https?:/.test(window.location.origin)) origin = window.location.origin; } catch (_) {}
  return cdAppendReferralQuery(origin + '/sukuyo-compatibility-ai?cp=' + encodeURIComponent(cp));
}
function shareSukuyoCompatInviteKakao(){
  var url = cdBuildSukuyoCompatInviteUrl();
  if (!url) {
    if (typeof showToast === 'function') showToast('먼저 내 사주를 확인한 뒤 숙요 궁합 초대 링크를 만들 수 있어요 🐷');
    return;
  }
  var self = cdReadSelfBirthForInvite() || {};
  var who = self.n ? (self.n + '님') : '내';
  shareWithReward(function(){
    var text = '🌙 [숙요 궁합 초대] ' + who + '과의 숙요 궁합, 같이 볼래요?\n\n'
      + '아래 링크를 열면 ' + who + '의 정보가 상대 칸에 자동으로 채워져요.\n\n' + url;
    if (navigator.share) {
      navigator.share({ title: '🌙 숙요 궁합 초대', text: text, url: url }).catch(function(){});
      return;
    }
    var a = document.createElement('a');
    a.href = 'kakaotalk://send?text=' + encodeURIComponent(text);
    a.click();
    setTimeout(function(){ copyToClipboard(text, '숙요 궁합 초대 링크를 복사했어요! 카카오톡에 붙여넣어 주세요 💬'); }, 800);
  }, 'sukuyo-compat-invite');
}

/* 사주 결과 카드를 이미지로 공유한다. cdShareResultCardImage 는 구현이 끝나 있었는데
   호출부가 하나도 없어 죽어 있었다 — #shareSection 의 기존 버튼 줄에 항목 하나만
   더해 살린다(새 모달/오버레이를 만들지 않는다).
   캡처 실패나 html2canvas 부재는 cdShareResultCardImage 안에서 텍스트 공유로
   폴백하므로 여기서 따로 방어하지 않는다. */
function shareSajuResultImage() {
  cdShareResultCardImage({
    contentId: 'saju',
    targetSelector: '#sajuCard',
    title: _shareText('share.001'),
    caption: '내 사주 결과 카드예요. 나도 무료로 보기 👇'
  });
}

if (typeof window !== 'undefined') {
  window.cdShareFortuneKakao = cdShareFortuneKakao;
  window.cdShareResultCardImage = cdShareResultCardImage;
  window.shareSajuResultImage = shareSajuResultImage;
  window.shareStoryKakao = shareStoryKakao;
  window.cdAppendReferralQuery = cdAppendReferralQuery;
  window.cdBuildSukuyoCompatInviteUrl = cdBuildSukuyoCompatInviteUrl;
  window.shareSukuyoCompatInviteKakao = shareSukuyoCompatInviteKakao;
  window.shareCompatInviteKakao = shareCompatInviteKakao;
  window.openCompatInvite = openCompatInvite;
  var _cdCompatInviteInit = function(){
    _cdInjectCompatInviteButton();
    // 세션에 초대가 남아있고 URL에 cp가 없으면(리로드 등) 복원.
    try {
      var hasCp = new URLSearchParams(window.location.search || '').get('cp');
      if (!hasCp) {
        var cached = sessionStorage.getItem(CD_COMPAT_INVITE_SESSION_KEY);
        if (cached) {
          var inv = JSON.parse(cached);
          if (inv && inv.y) { _cdShowCompatInviteBanner(inv); _cdApplyCompatInvitePrefill(inv); }
        }
      }
    } catch (_) {}
  };
  if (document.readyState === 'complete') { _cdCompatInviteInit(); }
  else { window.addEventListener('load', _cdCompatInviteInit); }
}

/* ══════════════════════════════════════════════
   테마 에셋 동기화
   ══════════════════════════════════════════════ */
var THEME_MODE_KEY = 'fortuneThemeModeStateV1';
var THEME_MODE_STATE_META_KEY = 'fortuneThemeModeStateMetaV1';
var THEME_MODE_STATE_SCHEMA = '20260511-theme-state-v2';
var THEME_LOGO_REV = '20260511-mobile-logo-fix4';
// 🔴 로고만 맨 URL 을 쓴다(`?v=` 금지). head 의 preload·부트게이트·히어로·결제 오버레이 CSS 배경이
//    전부 `/icons/app-logo-512.webp` 를 공유하는데 여기만 키를 붙이면 같은 파일이 두 번 내려온다.
//    커밋 5c7abb303 이 정리한 "네 소비자가 맨 URL 하나를 공유한다" 계약. THEME_LOGO_REV 는
//    매니페스트·네오 아이콘에는 그대로 쓴다(그쪽은 preload 와 URL 을 공유하지 않는다).
var PIG_LOGO_URL = '/icons/app-logo-512.webp';
var PIG_LOGO_SRCSET = PIG_LOGO_URL + ' 96w, ' + PIG_LOGO_URL + ' 130w, ' + PIG_LOGO_URL + ' 512w';
var NEO_LOGO_URL = '/icons/neo.webp?v=' + THEME_LOGO_REV;
var NEO_LOGO_SRCSET = '/icons/neo-96.webp?v=' + THEME_LOGO_REV + ' 96w, /icons/neo-130.webp?v=' + THEME_LOGO_REV + ' 130w, ' + NEO_LOGO_URL + ' 512w';

function ensureThemeModeStateSchema() {
  try {
    var stateSchema = localStorage.getItem(THEME_MODE_STATE_META_KEY);
    if (stateSchema === THEME_MODE_STATE_SCHEMA) return;

    var rawMode = localStorage.getItem(THEME_MODE_KEY);
    if (rawMode !== 'neo' && rawMode !== 'pig') {
      localStorage.removeItem(THEME_MODE_KEY);
    }
    localStorage.setItem(THEME_MODE_STATE_META_KEY, THEME_MODE_STATE_SCHEMA);
  } catch (_) {}
}

ensureThemeModeStateSchema();

function isThemeLogoDebugEnabled() {
  try {
    if (window.__cdDebugThemeLogoSync === true || window.__cdDebugThemeLogoSync === false) {
      return window.__cdDebugThemeLogoSync;
    }
    var q = new URLSearchParams(window.location.search || '');
    var enabled = q.get('debugLogoSync') === '1' || localStorage.getItem('__cd_debug_logo_sync__') === '1';
    window.__cdDebugThemeLogoSync = !!enabled;
    return !!enabled;
  } catch (_) {
    return false;
  }
}

function logThemeLogoSync(reason, phase, pigLogo, neoLogo) {
  if (!isThemeLogoDebugEnabled() || typeof console === 'undefined' || typeof console.info !== 'function') return;

  var payload = {
    reason: reason || 'unspecified',
    phase: phase || 'after',
    pigSrc: pigLogo ? (pigLogo.getAttribute('src') || '') : '',
    pigSrcset: pigLogo ? (pigLogo.getAttribute('srcset') || '') : '',
    neoSrc: neoLogo ? (neoLogo.getAttribute('src') || '') : '',
    neoSrcset: neoLogo ? (neoLogo.getAttribute('srcset') || '') : '',
    isMobile: !!(window.matchMedia && window.matchMedia('(max-width: 768px)').matches),
    at: new Date().toISOString()
  };

  console.info('[DEBUG][logo-sync]', payload);
}

function installLogoMutationDebug() {
  if (!isThemeLogoDebugEnabled() || window.__cdLogoMutationDebugInstalled) return;
  window.__cdLogoMutationDebugInstalled = true;

  function watchById(id) {
    var target = document.getElementById(id);
    if (!target || typeof MutationObserver === 'undefined') return;

    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (!mutation || mutation.type !== 'attributes') return;
        if (mutation.attributeName !== 'src' && mutation.attributeName !== 'srcset') return;
        var src = target.getAttribute('src') || '';
        var srcset = target.getAttribute('srcset') || '';
        console.info('[DEBUG][logo-mutation]', {
          id: id,
          attr: mutation.attributeName,
          src: src,
          srcset: srcset,
          at: new Date().toISOString()
        });
      });
    });

    observer.observe(target, { attributes: true, attributeFilter: ['src', 'srcset'] });
  }

  watchById('honeypigLogo');
  watchById('neoLogo');
}

function readThemeModeState() {
  try {
    return localStorage.getItem(THEME_MODE_KEY) === 'neo';
  } catch (_) {
    return false;
  }
}

function writeThemeModeState(isNeo) {
  try {
    localStorage.setItem(THEME_MODE_KEY, isNeo ? 'neo' : 'pig');
  } catch (_) {}
}

function applyPwaThemeAssets(isNeo) {
  var manifestLink = document.querySelector('link[rel="manifest"]');
  if (manifestLink) {
    var manifestHref = (isNeo ? '/manifest-neo.json' : '/manifest.json') + '?v=' + THEME_LOGO_REV;
    manifestLink.setAttribute('href', manifestHref);
  }

  var faviconLink = document.getElementById('pwa-favicon');
  var appleIconLink = document.getElementById('pwa-apple-icon');
  if (isNeo) {
    if (faviconLink) { faviconLink.setAttribute('href', NEO_LOGO_URL); faviconLink.setAttribute('type', 'image/webp'); faviconLink.setAttribute('sizes', '192x192'); }
    if (appleIconLink) appleIconLink.setAttribute('href', NEO_LOGO_URL);
  } else {
    if (faviconLink) { faviconLink.setAttribute('href', PIG_LOGO_URL); faviconLink.setAttribute('type', 'image/webp'); faviconLink.setAttribute('sizes', '192x192'); }
    if (appleIconLink) appleIconLink.setAttribute('href', PIG_LOGO_URL);
  }
}

function syncThemeLogoSources(reason) {
  var pigLogo = document.getElementById('honeypigLogo');
  var neoLogo = document.getElementById('neoLogo');
  logThemeLogoSync(reason, 'before', pigLogo, neoLogo);

  if (pigLogo) {
    pigLogo.setAttribute('src', PIG_LOGO_URL);
    pigLogo.setAttribute('srcset', PIG_LOGO_SRCSET);
    pigLogo.setAttribute('sizes', '(max-width: 768px) 88px, 130px');
  }

  var pigSource = document.querySelector('.normal-logo picture source[type="image/webp"]');
  if (pigSource) {
    pigSource.setAttribute('srcset', PIG_LOGO_SRCSET);
    pigSource.setAttribute('sizes', '(max-width: 768px) 88px, 130px');
    pigSource.setAttribute('type', 'image/webp');
  }

  if (neoLogo) {
    neoLogo.setAttribute('src', NEO_LOGO_URL);
    neoLogo.setAttribute('srcset', NEO_LOGO_SRCSET);
    neoLogo.setAttribute('sizes', '(max-width: 768px) 88px, 130px');
  }

  logThemeLogoSync(reason, 'after', pigLogo, neoLogo);
}

function retireServiceWorkers() {
  var tasks = [];
  var prefixes = Array.isArray(SW_CACHE_PREFIXES) && SW_CACHE_PREFIXES.length > 0
    ? SW_CACHE_PREFIXES
    : ['kkul-mansaeryeok-', 'workbox', 'code-destiny', 'next', 'tadagochi', 'legacy'];

  if ('serviceWorker' in navigator) {
    tasks.push(
      navigator.serviceWorker.getRegistrations().then(function(regs) {
        return Promise.all(regs.map(function(reg) { return reg.unregister(); }));
      }).catch(function() {})
    );
  }

  if ('caches' in window) {
    tasks.push(
      caches.keys().then(function(keys) {
        return Promise.all(
          keys
            .filter(function(key) {
              var normalized = String(key || '').toLowerCase();
              return prefixes.some(function(prefix) {
                var token = String(prefix || '').toLowerCase();
                return normalized.indexOf(token) >= 0;
              });
            })
            .map(function(key) { return caches.delete(key); })
        );
      }).catch(function() {})
    );
  }

  return Promise.all(tasks).catch(function() {});
}

function retireServiceWorkersOnce(version) {
  var target = String(version || APP_VERSION || 'dev').trim() || 'dev';

  try {
    var already = localStorage.getItem(SW_RETIRE_ONCE_KEY) || '';
    if (already === target) {
      return Promise.resolve();
    }
  } catch (e) {}

  return retireServiceWorkers().finally(function() {
    try { localStorage.setItem(SW_RETIRE_ONCE_KEY, target); } catch (e) {}
  });
}

if ('serviceWorker' in navigator || 'caches' in window) {
  window.addEventListener('load', function() {
    runNuclearVersionGuard().finally(function() {
      retireServiceWorkersOnce(APP_VERSION);
    });
  });
}

function copyToClipboard(text,successMsg){
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(function(){
      showToast(successMsg||'복사 완료! ✅');
    }).catch(function(){fallbackCopy(text,successMsg);});
  }else{fallbackCopy(text,successMsg);}
}
function fallbackCopy(text,msg){
  var ta=document.createElement('textarea');
  ta.value=text;ta.style.position='fixed';ta.style.opacity='0';
  document.body.appendChild(ta);ta.select();
  try{document.execCommand('copy');showToast(msg||'복사 완료! ✅');}catch(e){showToast('직접 복사해주세요');}
  document.body.removeChild(ta);
}

/* ═══════════════════════════════════════
   NEO MODE — 팩폭 사자 네오 퍼소나 시스템
═══════════════════════════════════════ */
var NEO_MODE=false;
var THEME_PERF_PROBE_MS = 1200;
var THEME_AUTO_LITE_FPS = 46;
var THEME_AUTO_LITE_LONGTASK_COUNT = 2;
var THEME_AUTO_LITE_LONGTASK_MAX = 120;
var _themeToggleInFlight = false;
var _themeToggleUnlockTimer = null;
var _themeToggleApplyTextRaf = 0;
var _themeToggleHideTimer = null;
var _themePerfProbeInFlight = false;
var _themeAutoLiteEnabled = false;

function setThemeAutoLite(enabled, reason, metrics){
  var body = document.body;
  if(!body) return;
  _themeAutoLiteEnabled = !!enabled;
  body.classList.toggle('neo-auto-lite', _themeAutoLiteEnabled);
  if(_themeAutoLiteEnabled){
    body.setAttribute('data-neo-lite-reason', reason || 'auto');
  }else{
    body.removeAttribute('data-neo-lite-reason');
  }
  if(metrics && typeof console !== 'undefined' && console.info){
    console.info('[ThemePerf] auto-lite=' + (_themeAutoLiteEnabled ? 'on' : 'off')
      + ' fps=' + metrics.fps.toFixed(1)
      + ' longTasks=' + metrics.longTaskCount
      + ' maxLong=' + metrics.maxLongTask.toFixed(1) + 'ms'
      + (reason ? ' reason=' + reason : ''));
  }
}

function measureThemeTransitionPerformance(durationMs){
  return new Promise(function(resolve){
    var startedAt = (window.performance && performance.now) ? performance.now() : Date.now();
    var frameCount = 0;
    var longTaskCount = 0;
    var maxLongTask = 0;
    var observer = null;
    var done = false;

    if(window.PerformanceObserver){
      try {
        observer = new PerformanceObserver(function(list){
          list.getEntries().forEach(function(entry){
            var d = Number(entry && entry.duration) || 0;
            if(d >= 50){
              longTaskCount += 1;
              if(d > maxLongTask) maxLongTask = d;
            }
          });
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch(e) {
        observer = null;
      }
    }

    function finish(nowTs){
      if(done) return;
      done = true;
      if(observer){
        try { observer.disconnect(); } catch(e) {}
      }
      var endedAt = nowTs || ((window.performance && performance.now) ? performance.now() : Date.now());
      var elapsed = Math.max(1, endedAt - startedAt);
      var fps = frameCount * 1000 / elapsed;
      resolve({
        fps: fps,
        longTaskCount: longTaskCount,
        maxLongTask: maxLongTask,
        elapsedMs: elapsed
      });
    }

    function tick(ts){
      frameCount += 1;
      if((ts - startedAt) >= durationMs){
        finish(ts);
      }else{
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
    setTimeout(function(){ finish(); }, durationMs + 240);
  });
}

function probeThemePerfAndAutoLite(){
  if(_themePerfProbeInFlight) return;
  _themePerfProbeInFlight = true;

  measureThemeTransitionPerformance(THEME_PERF_PROBE_MS).then(function(metrics){
    var shouldLite = (metrics.fps < THEME_AUTO_LITE_FPS)
      || (metrics.longTaskCount >= THEME_AUTO_LITE_LONGTASK_COUNT)
      || (metrics.maxLongTask >= THEME_AUTO_LITE_LONGTASK_MAX);

    if(shouldLite){
      var reason = metrics.fps < THEME_AUTO_LITE_FPS
        ? 'fps-drop'
        : (metrics.maxLongTask >= THEME_AUTO_LITE_LONGTASK_MAX ? 'long-task-spike' : 'long-task-burst');
      setThemeAutoLite(true, reason, metrics);
    }else if(_themeAutoLiteEnabled && metrics.fps >= (THEME_AUTO_LITE_FPS + 8) && metrics.longTaskCount === 0){
      setThemeAutoLite(false, 'recovered', metrics);
    }else if(_themeAutoLiteEnabled){
      setThemeAutoLite(true, 'keep-lite', metrics);
    }
  }).finally(function(){
    _themePerfProbeInFlight = false;
  });
}

function isLowPerfThemeTransition(){
  var isNarrow = false;
  var prefersReducedMotion = false;
  try {
    isNarrow = !!(window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
    prefersReducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch(e) {}
  return isNarrow || prefersReducedMotion || _themeAutoLiteEnabled;
}

function runThemeTransitionFx(){
  var body = document.body;
  var glitchWrap = document.getElementById('neoGlitchWrap');

  if(isLowPerfThemeTransition()){
    body.classList.remove('neo-glitch-lite');
    setTimeout(function(){
      body.classList.add('neo-glitch-lite');
      setTimeout(function(){ body.classList.remove('neo-glitch-lite'); }, 260);
    }, 0);
    return;
  }

  if(!glitchWrap) return;
  glitchWrap.classList.remove('run');
  setTimeout(function(){
    glitchWrap.classList.add('run');
  }, 0);
  setTimeout(function(){ glitchWrap.classList.remove('run'); }, 620);
}

function isResultPageVisible(){
  var resultPage = document.getElementById('resultPage');
  if(!resultPage) return false;
  return window.getComputedStyle(resultPage).display !== 'none';
}

function setThemeToggleEnabled(enabled){
  var wrap = document.querySelector('.theme-switch-wrapper');
  var cb = document.getElementById('themeCheckbox');
  if(wrap){
    wrap.classList.toggle('theme-toggle-hidden', !enabled);
    wrap.classList.toggle('theme-toggle-active', !!enabled);
    wrap.setAttribute('aria-disabled', enabled ? 'false' : 'true');
    wrap.setAttribute('aria-hidden', enabled ? 'false' : 'true');
    // 데스크탑에서 enforceThemeToggleSticky의 인라인 !important 스타일이
    // CSS 클래스 display:none !important를 가릴 수 있으므로 인라인으로도 직접 제어
    if(!enabled){
      wrap.style.setProperty('display', 'none', 'important');
    } else {
      wrap.style.removeProperty('display');
    }
  }
  if(cb){
    cb.disabled = !enabled;
    if(!enabled) cb.blur();
  }
}

function scheduleThemeToggleAutoDisable(){
  setThemeToggleEnabled(true);
  // 자동 숨김 제거 — 항상 표시 유지
  if(_themeToggleHideTimer) clearTimeout(_themeToggleHideTimer);
  _themeToggleHideTimer = null;
}

function isHomePageVisible(){
  var inputPage = document.getElementById('inputPage');
  var resultPage = document.getElementById('resultPage');
  if(!inputPage || !resultPage) return false;
  var inputShown = window.getComputedStyle(inputPage).display !== 'none';
  var resultShown = window.getComputedStyle(resultPage).display !== 'none';
  return inputShown && !resultShown;
}

function reactivateThemeToggleFromHome(){
  setThemeToggleEnabled(true);
  scheduleThemeToggleAutoDisable();
}

function ensureThemeToggleCriticalStyles(){
  if(document.getElementById('cdThemeToggleCriticalStyle')) return;
  var style = document.createElement('style');
  style.id = 'cdThemeToggleCriticalStyle';
  style.textContent = ''
    + '.theme-toggle-label,.tsw-input{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important;}'
    + '.theme-switch-pill{--seg:80px;--pad:4px;display:inline-flex;align-items:center;padding:var(--pad);border-radius:100px;position:relative;overflow:hidden;cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation;background:rgba(255,255,255,.92);border:1.5px solid rgba(255,160,182,.5);box-shadow:0 8px 32px rgba(255,80,130,.15),0 2px 10px rgba(0,0,0,.06),inset 0 1px 0 #fff;backdrop-filter:blur(24px) saturate(180%);-webkit-backdrop-filter:blur(24px) saturate(180%);}'
    + '.tsp-option{position:relative;z-index:1;display:inline-flex;align-items:center;justify-content:center;gap:5px;width:var(--seg,80px);padding:9px 0;border-radius:100px;font-size:.82rem;font-weight:800;line-height:1;white-space:nowrap;pointer-events:none;}'
    + '.tsp-icon{font-size:1.05rem;line-height:1;pointer-events:none;}.tsp-name{pointer-events:none;}.tsp-pig{color:#fff6f9;text-shadow:0 1px 4px rgba(150,20,68,.3);}.tsp-lion{color:#8d86ad;}'
    + '.theme-switch-pill::before{content:"";position:absolute;top:var(--pad,4px);bottom:var(--pad,4px);left:var(--pad,4px);width:var(--seg,80px);border-radius:100px;background:linear-gradient(150deg,#ffe3ec 0%,#f9a8c6 46%,#e8497f 100%);box-shadow:0 4px 14px rgba(216,42,106,.38),inset 0 1px 0 rgba(255,255,255,.75);pointer-events:none;transition:transform .42s cubic-bezier(.34,1.56,.64,1);}'
    + '#themeCheckbox:checked + .theme-switch-pill{background:rgba(15,15,28,.98);border-color:rgba(232,213,163,.4);box-shadow:0 8px 32px rgba(0,0,0,.5),0 2px 10px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.05);}'
    + '#themeCheckbox:checked + .theme-switch-pill::before{transform:translateX(var(--seg,80px));background:linear-gradient(140deg,#3a3a5c 0%,#262640 50%,#17172a 100%);box-shadow:0 4px 18px rgba(232,213,163,.3),inset 0 1px 0 rgba(255,255,255,.07);}'
    + '#themeCheckbox:checked + .theme-switch-pill .tsp-pig{color:rgba(244,238,255,.3);text-shadow:none;}#themeCheckbox:checked + .theme-switch-pill .tsp-lion{color:#f7d97b;}';
  document.head.appendChild(style);
}

var NEO_TITLES={
  '사주 명식 (四柱命式)':'사주 명식 — 운명 회로도',
  '핵심 십성 (十星) — 탭하면 상세 분석!':'핵심 십성 — 당신의 심리 코드',
  '궁합 보기 (연애 · 사업 · 친구)':'궁합 분석 — 우리 케미는 어떨까?',
  '한난조습 (寒暖燥濕) 조후 분석':'에너지 극성 — 당신은 차갑나 뜨겁나',
  '종합 사주 풀이':'팩트 보고서 — 사주로 보는 당신의 특징',
  '오행 밸런스를 위한 여행지':'부족 오행 충전 원정 — 당장 떠나라',
  '에너지 원정 리포트 — 사주 맞춤 에너지 좌표':'확장 원정 — 네오의 기운 충전 좌표',
  '대박 로또 생성기 — 수리 에너지 공명 번호':'퀀텀 코드 추출 — 수리 공명 로또',
  '대운 (大運) — 억부+조후+종격 통합 판단':'대운 — 당신의 운명 궤도를 보라',
  '일운·월운 근대운':'단기 에너지 스캔 — 지금 당신의 흐름',
  '사주 편지':'직격 통보 — 팩폭 에피소드',
  '오늘의 운세':'당일 에너지 스코어',
  '사주로 보는 매력':'매력 에너지 분석 — 블랙홀리스트',
  '자선 모드 — 전생 업 분석':'전생 진단 — 업(業)의 잔재물',
  '오늘의 머큐리 진 로드 맵':'당일 머큐리 진 로드 맵'
};

function toggleNeoMode(nextMode){
  var cbLock = document.getElementById('themeCheckbox');
  if(cbLock && cbLock.disabled) return;
  if(_themeToggleInFlight) return;

  _themeToggleInFlight = true;
  if(_themeToggleUnlockTimer) clearTimeout(_themeToggleUnlockTimer);
  _themeToggleUnlockTimer = setTimeout(function(){
    _themeToggleInFlight = false;
  }, 460);

  NEO_MODE = (typeof nextMode === 'boolean') ? nextMode : !NEO_MODE;
  writeThemeModeState(NEO_MODE);
  var body=document.body;
  runThemeTransitionFx();

  // Keep glitch effect isolated to the dedicated overlay wrapper.
  // Body-wide glitch animation can override transform styles on many UI nodes.
  
  var cb = document.getElementById('themeCheckbox');
  if(cb) {
    if(cb.checked !== NEO_MODE) cb.checked = NEO_MODE;
    cb.setAttribute('aria-checked', NEO_MODE ? 'true' : 'false');
  }

  var neoIcon = document.getElementById('neoLionIcon');
  var neoLabel = document.getElementById('neoToggleLabel');

  if(NEO_MODE){
    body.classList.add('neo-mode');
    body.classList.remove('theme-pig');
    body.classList.add('theme-neo');
    if(neoIcon) neoIcon.textContent = '🦁';
    if(neoLabel) neoLabel.textContent = '🌸 연이 모드';
    var tLabel = document.getElementById('themeToggleLabel');
    if(tLabel) {
      tLabel.innerText = '🦁 팩폭 사자 네오 모드';
      tLabel.style.color = '#FFD700';
    }
    applyPwaThemeAssets(true);
  }else{
    body.classList.remove('neo-mode');
    body.classList.remove('theme-neo');
    body.classList.add('theme-pig');
    if(neoIcon) neoIcon.textContent = '🐷';
    if(neoLabel) neoLabel.textContent = 'NEO MODE';
    var tLabel = document.getElementById('themeToggleLabel');
    if(tLabel) {
      tLabel.innerText = '🌸 꽃돼지 연이 모드';
      tLabel.style.color = '#FF8BA7';
    }
    applyPwaThemeAssets(false);
  }
  syncThemeLogoSources('toggle');
  setTimeout(function(){ syncThemeLogoSources('toggle:timeout160'); }, 160);
  if(_themeToggleApplyTextRaf) cancelAnimationFrame(_themeToggleApplyTextRaf);
  _themeToggleApplyTextRaf = requestAnimationFrame(function(){
    applyNeoTexts();
    _themeToggleApplyTextRaf = 0;
  });
  // Toggle 직후 실제 성능을 측정해 필요 시 자동 경량 모드로 전환한다.
  probeThemePerfAndAutoLite();
  scheduleThemeToggleAutoDisable();
}

function applyNeoTexts(){
  var titles=document.querySelectorAll('.sec-title');
  titles.forEach(function(el){
    if(!el.getAttribute('data-warm')){
      var txt='';
      el.childNodes.forEach(function(n){if(n.nodeType===3) txt+=n.textContent.trim();});
      el.setAttribute('data-warm',txt);
      var neoTxt=null;
      Object.keys(NEO_TITLES).forEach(function(k){
        if(txt.indexOf(k)>=0) neoTxt=NEO_TITLES[k];
      });
      if(neoTxt) el.setAttribute('data-neo',neoTxt);
    }
    var neoVal=el.getAttribute('data-neo');
    if(!neoVal) return;
    el.childNodes.forEach(function(n){
      if(n.nodeType===3&&n.textContent.trim()){
        n.textContent=NEO_MODE?' '+neoVal:' '+el.getAttribute('data-warm');
      }
    });
  });

  var heroSub=document.getElementById('heroSub');
  if(heroSub&&heroSub.innerHTML.trim()){
    if(!heroSub.getAttribute('data-warm')) heroSub.setAttribute('data-warm',heroSub.innerHTML);
    if(NEO_MODE){
      var warm=heroSub.getAttribute('data-warm')||'';
      heroSub.innerHTML='<span style="color:#FFD700;font-weight:800;font-size:.85rem">🔱 NEO ANALYSIS ·</span> '+warm;
    }else{
      var savedW=heroSub.getAttribute('data-warm');
      if(savedW) heroSub.innerHTML=savedW;
    }
  }

  var ctd=document.getElementById('compatTypeDesc');
  if(ctd){
    if(NEO_MODE&&ctd.textContent.indexOf('유형을')>=0)
      ctd.textContent='에너지 충돌값을 계산합니다. 얼마나 튕기는지 볼까요.';
    else if(!NEO_MODE&&ctd.textContent.indexOf('충돌값')>=0)
      ctd.textContent='유형을 선택하면 해당 유형에 맞는 분석 문구와 권장 포인트가 표시됩니다.';
  }

  var letterTitle = document.getElementById('letterTitle');
  if(letterTitle){
    letterTitle.innerHTML = NEO_MODE ? '🦁 네오의 팩폭!' : '💖 연이의 편지';
  }
  // 결과 화면이 보일 때만 무거운 카드 재렌더를 수행해 모바일 전환 안정성을 높인다.
  if(isResultPageVisible() && window.G_PILLARS) {
    // 사주 분석 종합 요약 (NEO 전용 팩폭 ↔ 연이 조언 즉시 전환)
    if(typeof renderSummary === 'function' && window.G_NATAL) {
      try { renderSummary(window.G_PILLARS, window.G_JOHU || {badgeCls:'',badgeTxt:'',advice:''}, window.G_NATAL); } catch(e){}
    }
    if(typeof renderLetter === 'function') {
      renderLetter(window.G_PILLARS, window.G_NATAL, window.G_POWER, window.G_JONG);
    }
  }
  if(isResultPageVisible() && typeof renderDailyMonthlyFortune === 'function' && window.G_PILLARS) {
    renderDailyMonthlyFortune(window.G_PILLARS);
  }

  var hint=document.querySelector('#inputPage [style*="FF8BA7"]');
  if(hint){
    if(!hint.getAttribute('data-warm')) hint.setAttribute('data-warm',hint.innerHTML);
    if(NEO_MODE) hint.innerHTML='⚡ 시간 미입력 시 정오(12:00) 기준으로 처리합니다';
    else hint.innerHTML=hint.getAttribute('data-warm');
  }
}

function enforceThemeToggleSticky() {
  var wrap = document.querySelector('.theme-switch-wrapper');
  if (!wrap) return;
  // 숨김 상태(30초 경과 후)에는 위치 강제 설정 불필요 — display:none 유지
  if (wrap.classList.contains('theme-toggle-hidden')) return;

  // Avoid transformed ancestor issues on some mobile browsers.
  if (wrap.parentElement !== document.body) {
    document.body.appendChild(wrap);
  }

  // 모바일 Safari의 동적 뷰포트/스크롤 재계산에도 위치가 흔들리지 않도록 important로 고정
  wrap.style.setProperty('position', 'fixed', 'important');
  wrap.style.setProperty('left', 'auto', 'important');
  wrap.style.setProperty('right', 'max(12px, env(safe-area-inset-right, 0px))', 'important');
  wrap.style.setProperty('bottom', 'max(10px, env(safe-area-inset-bottom, 0px))', 'important');
  wrap.style.setProperty('top', 'auto', 'important');
  wrap.style.setProperty('transform', 'none', 'important');
  wrap.style.setProperty('z-index', '2147483000', 'important');
  wrap.style.setProperty('pointer-events', 'auto', 'important');
}

window.addEventListener('load',function(){
  installLogoMutationDebug();
  ensureThemeToggleCriticalStyles();
  var bootThemeNeo = readThemeModeState();
  var bootThemeCheckbox = document.getElementById('themeCheckbox');
  if (bootThemeNeo !== true && bootThemeCheckbox) {
    bootThemeNeo = !!bootThemeCheckbox.checked;
  }
  NEO_MODE = !!bootThemeNeo;

  if(typeof window.calculate==='function'){
    var _orig=window.calculate;
    window.calculate=function(){
      _orig.apply(this,arguments);
      if(NEO_MODE) setTimeout(applyNeoTexts,400);
    };
  }

  /* themeCheckbox: label 클릭 → checkbox change 이벤트 → toggleNeoMode() 단일 호출 */
  var themeCb = document.getElementById('themeCheckbox');
  if(themeCb){
    themeCb.addEventListener('change', function(){
      if(themeCb.disabled){
        themeCb.checked = NEO_MODE;
        return;
      }
      toggleNeoMode(!!themeCb.checked);
    });
    document.body.classList.add(NEO_MODE ? 'theme-neo' : 'theme-pig');
    if(NEO_MODE) document.body.classList.add('neo-mode');
    themeCb.checked = NEO_MODE;
    themeCb.setAttribute('aria-checked', NEO_MODE ? 'true' : 'false');
  }
  applyPwaThemeAssets(NEO_MODE);
  syncThemeLogoSources('boot');
  setTimeout(function(){ syncThemeLogoSources('boot:timeout900'); }, 900);
  var tLabel = document.getElementById('themeToggleLabel');
  if(NEO_MODE){
    if(tLabel) {
      tLabel.innerText = '🦁 팩폭 사자 네오 모드';
      tLabel.style.color = '#FFD700';
    }
  }
  // Home으로 돌아오면 토글을 다시 활성화하고 타이머를 재시작합니다.
  if(typeof window.resetApp === 'function' && !window.resetApp.__themeToggleWrapped){
    var _origResetApp = window.resetApp;
    window.resetApp = function(){
      var ret = _origResetApp.apply(this, arguments);
      reactivateThemeToggleFromHome();
      return ret;
    };
    window.resetApp.__themeToggleWrapped = true;
  }

  // 표시 상태가 바뀌어 홈이 다시 보이면 즉시 재활성화합니다.
  var inputPage = document.getElementById('inputPage');
  var resultPage = document.getElementById('resultPage');
  var pageObserver = new MutationObserver(function(){
    if(isHomePageVisible()) reactivateThemeToggleFromHome();
  });
  if(inputPage) pageObserver.observe(inputPage, { attributes:true, attributeFilter:['style','class'] });
  if(resultPage) pageObserver.observe(resultPage, { attributes:true, attributeFilter:['style','class'] });

  if(isHomePageVisible()) reactivateThemeToggleFromHome();
  else scheduleThemeToggleAutoDisable();

  enforceThemeToggleSticky();
  window.addEventListener('resize', enforceThemeToggleSticky, { passive: true });
  window.addEventListener('scroll', enforceThemeToggleSticky, { passive: true });
  window.addEventListener('touchmove', enforceThemeToggleSticky, { passive: true });
  window.addEventListener('orientationchange', function() {
    setTimeout(enforceThemeToggleSticky, 80);
  }, { passive: true });
});

function getSubscriptionApiBaseUrl() {
  try {
    if (typeof window !== 'undefined') {
      if (typeof window.getFortuneApiBaseUrl === 'function') {
        return String(window.getFortuneApiBaseUrl() || '').replace(/\/+$/, '');
      }
      if (window.CODE_DESTINY_API_BASE_URL) {
        return String(window.CODE_DESTINY_API_BASE_URL).replace(/\/+$/, '');
      }
      var custom = localStorage.getItem('fortune_api_base_url');
      if (custom) return String(custom).replace(/\/+$/, '');
      var host = String(location.hostname || '').toLowerCase();
      if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:4000';
      if (host === 'api.code-destiny.com') return location.origin;
      if (host.endsWith('.pages.dev')) return 'https://code-destiny.com';
      return location.origin;
    }
  } catch (_) {}
  return '';
}

function cloneSubscriptionData(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_) {
    return null;
  }
}

function getCheckedFormValue(name, fallback) {
  try {
    var nodes = document.getElementsByName(name);
    for (var i = 0; i < nodes.length; i += 1) {
      if (nodes[i].checked) return nodes[i].value || fallback;
    }
  } catch (_) {}
  return fallback;
}

function padSajuSubscriptionNumber(value) {
  var n = parseInt(value, 10);
  return String(Number.isFinite(n) ? n : 0).padStart(2, '0');
}

function normalizeSajuSubscriptionProfile(profile) {
  if (!profile || typeof profile !== 'object') return null;
  var birth = profile.birth && typeof profile.birth === 'object' ? profile.birth : {};
  var dateText = String(profile.birthDate || profile.birthIso || '').split(/[T\s]/)[0] || '';
  var dateParts = dateText
    ? (dateText.indexOf('-') >= 0 || dateText.indexOf('/') >= 0 ? dateText.split(/[-/]/) : [dateText.slice(0, 4), dateText.slice(4, 6), dateText.slice(6, 8)])
    : [];
  var year = parseInt(birth.year != null ? birth.year : (profile.birthYear != null ? profile.birthYear : dateParts[0]), 10);
  var month = parseInt(birth.month != null ? birth.month : (profile.birthMonth != null ? profile.birthMonth : dateParts[1]), 10);
  var day = parseInt(birth.day != null ? birth.day : (profile.birthDay != null ? profile.birthDay : dateParts[2]), 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  var hour = parseInt(birth.hour != null ? birth.hour : profile.birthHour, 10);
  var minute = parseInt(birth.minute != null ? birth.minute : profile.birthMinute, 10);
  var calType = String(birth.calType || profile.calType || profile.calendarType || 'solar').trim();
  if (calType !== 'lunar' && calType !== 'lunar_leap') calType = 'solar';
  return Object.assign({}, profile, {
    id: profile.id || profile.profileId,
    profileId: profile.profileId || profile.id,
    birth: Object.assign({}, birth, {
      year: year,
      month: month,
      day: day,
      hour: Number.isFinite(hour) ? hour : 12,
      minute: Number.isFinite(minute) ? minute : 0,
      calType: calType
    }),
    birthYear: year,
    birthMonth: month,
    birthDay: day,
    birthHour: Number.isFinite(hour) ? hour : 12,
    birthMinute: Number.isFinite(minute) ? minute : 0,
    birthDate: year + '-' + padSajuSubscriptionNumber(month) + '-' + padSajuSubscriptionNumber(day),
    calendarType: calType
  });
}

function getStoredSajuSubscriptionProfile() {
  try {
    var storage = window.DestinyProfileManager && window.DestinyProfileManager.storage;
    if (storage && typeof storage.current === 'function') {
      var current = normalizeSajuSubscriptionProfile(storage.current());
      if (current) return current;
    }
  } catch (_) {}
  return null;
}

function getSajuSubscriptionProfileCandidate() {
  return normalizeSajuSubscriptionProfile(window.__cdActiveBirthProfile)
    || getStoredSajuSubscriptionProfile()
    || normalizeSajuSubscriptionProfile(window.__destinyFlowerSajuSnapshot);
}

function hasUsableSajuSubscriptionPillars() {
  return !!(window.G_PILLARS && window.G_PILLARS.d && window.G_PILLARS.d.g && window.G_PILLARS.d.j);
}

function ensureSajuSubscriptionPillars() {
  if (hasUsableSajuSubscriptionPillars()) {
    return { ok: true, profile: getSajuSubscriptionProfileCandidate() };
  }
  var profile = getSajuSubscriptionProfileCandidate();
  if (!profile) {
    return { ok: false, missingProfile: true, error: _shareText("share.008") };
  }
  if (typeof window.computeProfileForModal !== 'function') {
    return { ok: false, error: _shareText("share.009") };
  }
  try {
    var computed = window.computeProfileForModal(profile);
    if (computed && hasUsableSajuSubscriptionPillars()) {
      return { ok: true, profile: profile };
    }
  } catch (_) {}
  return { ok: false, error: _shareText("share.010") };
}

function getBirthSubscriptionData(profile) {
  var profileBirth = profile && profile.birth && typeof profile.birth === 'object' ? profile.birth : null;
  var birthDateEl = document.getElementById('birthDate');
  var birthHourEl = document.getElementById('birthHour');
  var birthMinuteEl = document.getElementById('birthMinute');
  var profileDate = profile && profile.birthDate ? String(profile.birthDate).trim() : '';
  var hasFormBirthDate = !!(birthDateEl && birthDateEl.value);
  var birthDate = hasFormBirthDate ? String(birthDateEl.value).trim() : profileDate;
  var birthHour = birthHourEl && birthHourEl.value !== '' ? parseInt(birthHourEl.value, 10) : (profileBirth ? parseInt(profileBirth.hour, 10) : 12);
  var birthMinute = birthMinuteEl && birthMinuteEl.value !== '' ? parseInt(birthMinuteEl.value, 10) : (profileBirth ? parseInt(profileBirth.minute, 10) : 0);
  var calendarType = hasFormBirthDate ? getCheckedFormValue('calType', profileBirth ? profileBirth.calType : 'solar') : (profileBirth && profileBirth.calType) || getCheckedFormValue('calType', 'solar');
  var timezone = profile && profile.location && profile.location.tz ? profile.location.tz : 'Asia/Seoul';
  var birthDateDigits = String(birthDate || '').replace(/\D/g, '');
  return {
    birthDate: birthDate,
    birthYear: birthDateDigits.length >= 4 ? parseInt(birthDateDigits.slice(0, 4), 10) || undefined : undefined,
    birthHour: Number.isFinite(birthHour) ? birthHour : 12,
    birthMinute: Number.isFinite(birthMinute) ? birthMinute : 0,
    calendarType: calendarType || 'solar',
    timezone: timezone
  };
}

function buildSajuSubscriptionPayload(emailVal, subDaily, subMonthly, source, profileCandidate) {
  var ready = ensureSajuSubscriptionPillars();
  if (!ready.ok) {
    return { error: ready.error };
  }
  if (typeof getGanZhiForDate !== 'function' || typeof getMonthGanZhi !== 'function' || typeof analyzeFortuneGZ !== 'function') {
    return { error: _shareText("share.011") };
  }

  var today = new Date();
  var ty = today.getFullYear(), tm = today.getMonth() + 1, td = today.getDate(), th = today.getHours();
  var dayGZ = getGanZhiForDate(ty, tm, td, th);
  var monGZ = getMonthGanZhi(ty, tm);
  var dayRes = analyzeFortuneGZ(dayGZ, window.G_PILLARS, '오늘 일진');
  var monRes = analyzeFortuneGZ(monGZ, window.G_PILLARS, '이달 월운');

  if ((subDaily && !dayRes) || (subMonthly && !monRes)) {
    return { error: _shareText("share.012") };
  }

  var birth = getBirthSubscriptionData(profileCandidate || ready.profile);
  return {
    payload: {
      email: emailVal,
      subDaily: !!subDaily,
      subMonthly: false,
      source: source || 'saju-analysis',
      birthYear: birth.birthYear,
      birthDate: birth.birthDate,
      birthHour: birth.birthHour,
      birthMinute: birth.birthMinute,
      calendarType: birth.calendarType,
      timezone: birth.timezone,
      sajuSnapshot: {
        pillars: cloneSubscriptionData(window.G_PILLARS),
        natal: cloneSubscriptionData(window.G_NATAL || null),
        power: cloneSubscriptionData(window.G_POWER || null),
        johu: cloneSubscriptionData(window.G_JOHU || null),
        jong: cloneSubscriptionData(window.G_JONG || null),
        birth: cloneSubscriptionData(birth),
        dailyPreview: cloneSubscriptionData(dayRes || null),
        monthlyPreview: cloneSubscriptionData(monRes || null)
      }
    }
  };
}

var SAJU_SUBSCRIPTION_IN_FLIGHT = { result: false, home: false };

function getSajuSubscriptionConfig(scope) {
  var isHome = scope === 'home';
  return {
    scope: isHome ? 'home' : 'result',
    action: isHome ? 'subscribeEmailHome' : 'subscribeEmail',
    source: isHome ? 'home-after-saju-analysis' : 'saju-analysis',
    emailEl: document.getElementById(isHome ? 'subEmailHome' : 'subEmail'),
    dailyEl: document.getElementById(isHome ? 'subDailyHome' : 'subDaily'),
    monthlyEl: document.getElementById(isHome ? 'subMonthlyHome' : 'subMonthly'),
    statusEl: document.getElementById(isHome ? 'subEmailHomeStatus' : 'subEmailStatus')
  };
}

function setSajuSubscriptionStatus(scope, state, message) {
  var cfg = getSajuSubscriptionConfig(scope);
  var el = cfg.statusEl;
  if (!el) {
    if (message) showToast(message);
    return;
  }
  var palette = {
    info: ['rgba(30,41,59,.42)', 'rgba(148,163,184,.32)', '#e2e8f0'],
    pending: ['rgba(69,26,3,.44)', 'rgba(245,158,11,.38)', '#fde68a'],
    success: ['rgba(6,78,59,.42)', 'rgba(52,211,153,.38)', '#d1fae5'],
    error: ['rgba(127,29,29,.42)', 'rgba(248,113,113,.42)', '#fee2e2']
  };
  var colors = palette[state] || palette.info;
  el.textContent = message || '';
  el.dataset.state = state || 'info';
  el.style.display = message ? 'block' : 'none';
  el.style.background = colors[0];
  el.style.borderColor = colors[1];
  el.style.color = colors[2];
}

function setSajuSubscriptionPending(scope, pending) {
  var cfg = getSajuSubscriptionConfig(scope);
  var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-action="' + cfg.action + '"]'));
  [cfg.emailEl, cfg.dailyEl, cfg.monthlyEl].concat(buttons).forEach(function(node) {
    if (!node) return;
    node.disabled = !!pending;
    if (node.tagName === 'BUTTON') {
      if (!node.dataset.originalLabel) node.dataset.originalLabel = node.textContent || '';
      node.textContent = pending ? '신청 중...' : node.dataset.originalLabel;
      node.setAttribute('aria-busy', pending ? 'true' : 'false');
    }
  });
}

function isValidSubscriptionEmail(emailVal) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(emailVal || '').trim());
}

function guideSajuBeforeSubscription(scope) {
  setSajuSubscriptionStatus(scope || 'home', 'info', '사주 원국을 먼저 열어야 매일의 기운을 정확히 이어 받을 수 있습니다. 생년월일을 입력하고 사주 분석을 완료해 주세요.');
  try {
    var target = document.getElementById('destinyCardForm') || document.getElementById('birthDate') || document.getElementById('inputPage');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (_) {}
}

function getSajuSubscriptionSuccessMessage(data, emailVal) {
  if (data && data.message) return data.message;
  return emailVal + ' 주소로 사주 기반 일일 운세 구독이 등록되었습니다.';
}

async function submitSajuSubscription(scope) {
  var cfg = getSajuSubscriptionConfig(scope);
  if (SAJU_SUBSCRIPTION_IN_FLIGHT[cfg.scope]) return;
  var emailVal = cfg.emailEl && cfg.emailEl.value ? cfg.emailEl.value.trim() : '';
  var subDaily = !!(cfg.dailyEl && cfg.dailyEl.checked);
  var subMonthly = false;

  if (!emailVal) {
    setSajuSubscriptionStatus(cfg.scope, 'error', '이메일 주소를 입력해 주세요.');
    return;
  }
  if (!isValidSubscriptionEmail(emailVal)) {
    setSajuSubscriptionStatus(cfg.scope, 'error', '정확한 이메일 주소를 입력해 주세요.');
    return;
  }
  if (!subDaily) {
    setSajuSubscriptionStatus(cfg.scope, 'error', '일일 운세 이메일 수신을 선택해 주세요.');
    return;
  }
  var ready = ensureSajuSubscriptionPillars();
  if (!ready.ok && ready.missingProfile) {
    guideSajuBeforeSubscription(cfg.scope);
    return;
  }
  if (!ready.ok) {
    setSajuSubscriptionStatus(cfg.scope, 'error', ready.error);
    return;
  }

  var payloadResult = buildSajuSubscriptionPayload(emailVal, subDaily, subMonthly, cfg.source, ready.profile);
  if (payloadResult.error) {
    setSajuSubscriptionStatus(cfg.scope, 'error', payloadResult.error);
    return;
  }

  var apiBase = getSubscriptionApiBaseUrl();
  var endpoint = (apiBase ? apiBase : '') + '/api/subscriptions/daily-fortune';
  SAJU_SUBSCRIPTION_IN_FLIGHT[cfg.scope] = true;
  setSajuSubscriptionPending(cfg.scope, true);
  setSajuSubscriptionStatus(cfg.scope, 'info', '사주 원국과 오늘의 기운을 엮어 구독을 준비하고 있습니다.');

  try {
    var resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadResult.payload)
    });
    var data = await resp.json().catch(function(){ return {}; });

    if (!resp.ok) {
      var message = '구독 등록에 실패했습니다.';
      if (data && data.message) message = data.message;
      throw new Error(message);
    }

    var state = data && data.firstMailSent === false ? 'pending' : 'success';
    setSajuSubscriptionStatus(cfg.scope, state, getSajuSubscriptionSuccessMessage(data, emailVal));
    if (cfg.emailEl) cfg.emailEl.value = '';
  } catch (err) {
    var detail = err && err.message ? err.message : _shareText("share.013");
    setSajuSubscriptionStatus(cfg.scope, 'error', '구독 등록이 완료되지 않았습니다. ' + detail);
  } finally {
    SAJU_SUBSCRIPTION_IN_FLIGHT[cfg.scope] = false;
    setSajuSubscriptionPending(cfg.scope, false);
  }
}

async function subscribeEmail() {
  return submitSajuSubscription('result');
}

async function subscribeEmailHome() {
  return submitSajuSubscription('home');
}
window.subscribeEmail = subscribeEmail;
window.subscribeEmailHome = subscribeEmailHome;

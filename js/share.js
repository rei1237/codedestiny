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
  return SHARE_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}
var APP_VERSION = 'dev';
var APP_VERSION_KEY = 'app_version';
var APP_VERSION_RELOAD_GUARD = 'app_version_reload_guard';  // 무한 reload 방지
var APP_VERSION_DEFER_GUARD = 'app_version_defer_guard';
var SW_PURGED_VERSION_KEY = 'app_sw_purged_version';
var SW_RETIRE_ONCE_KEY = 'app_sw_retire_once';
var VERSION_GUARD_BANNER_ID = 'cd-version-update-banner';
var VERSION_CHECK_INTERVAL_MS = 15000;
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
  return fetch('/version.json?t=' + Date.now(), { cache: 'no-store' })
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

  var existing = document.getElementById(VERSION_GUARD_BANNER_ID);
  if (existing) {
    var messageNode = existing.querySelector('[data-cd-version-message]');
    if (messageNode) {
      messageNode.textContent = '현재 ' + reason + ' 상태여서 자동 새로고침을 보류했습니다.';
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
  message.textContent = '현재 ' + reason + ' 상태여서 자동 새로고침을 보류했습니다.';
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
function runNuclearVersionGuard() {
  // focus·visibilitychange·interval·이벤트가 겹쳐 version.json을 중복 요청하지 않도록 단일 실행 보장.
  if (__versionGuardInFlight) return Promise.resolve();
  __versionGuardInFlight = true;
  return resolveRuntimeVersion().then(function(version) {
    // dev 버전 또는 fetch 실패 시 아무 작업 안 함
    if (!version || version === 'dev') return version;

    var saved = '';
    try { saved = localStorage.getItem(APP_VERSION_KEY) || ''; } catch (e) { saved = ''; }

    if (saved === version) {
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

    var blockingReason = isCriticalOperationInProgress();
    if (blockingReason) {
      showVersionUpdateBanner(version, blockingReason);
      return version;
    }

    removeVersionUpdateBanner();

    // SW 전체 해제 + Cache Storage 전부 삭제 후 reload
    return applyVersionRefresh(version);
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
  var base=window.location.href.split('?')[0];
  return name+'님의 사주 분석 결과를 확인해보세요! 🐷✨\n꿀꿀 만세력\n'+base;
}
function showToast(msg){
  var t=document.getElementById('shareToast');
  t.textContent=msg;t.classList.add('show');
  setTimeout(function(){t.classList.remove('show');},2500);
}
function shareKakao(){
  shareWithReward(function(){
    var text=getShareText();
    if(navigator.share){
      navigator.share({title:_shareText("share.001"),text:text,url:window.location.href}).catch(function(){});
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
    var text = '🔮 [연이의 꿀꿀 타로] 🔮\n\n' + cName + '\n\n' + cFortune + '\n\n' + cOracle + '\n\n👉 무료 타로 보러가기: https://code-destiny.com';
    if(navigator.share){
      navigator.share({title:_shareText("share.002"),text:text,url:'https://code-destiny.com'}).catch(function(){});
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
    var base = window.location.href.split('?')[0];
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
    var base = window.location.href.split('?')[0];
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
    var base = window.location.href.split('?')[0];
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
  var name = (window.__cdActiveBirthProfile && window.__cdActiveBirthProfile.name)
    || (window.USER_NAME || '사용자');
  var base = window.location.href.split('?')[0];
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
}

function shareLoveSecretKakao() {
  shareWithReward(function () {
    var name = (window.__cdActiveBirthProfile && window.__cdActiveBirthProfile.name)
      || (window.USER_NAME || '사용자');
    var base = window.location.href.split('?')[0];
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

/* ══════════════════════════════════════════════
   테마 에셋 동기화
   ══════════════════════════════════════════════ */
var THEME_MODE_KEY = 'fortuneThemeModeStateV1';
var THEME_MODE_STATE_META_KEY = 'fortuneThemeModeStateMetaV1';
var THEME_MODE_STATE_SCHEMA = '20260511-theme-state-v2';
var THEME_LOGO_REV = '20260511-mobile-logo-fix4';
var PIG_LOGO_URL = '/icons/%EA%BF%80%EA%BF%80%20%EC%9A%B4%EC%84%B8%20%EB%A1%9C%EA%B3%A0.webp?v=' + THEME_LOGO_REV;
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
    + '.tsp-icon{font-size:1.05rem;line-height:1;pointer-events:none;}.tsp-name{pointer-events:none;}.tsp-pig{color:#e0305f;}.tsp-lion{color:#a8a8b8;}'
    + '.theme-switch-pill::before{content:"";position:absolute;top:var(--pad,4px);bottom:var(--pad,4px);left:var(--pad,4px);width:var(--seg,80px);border-radius:100px;background:linear-gradient(140deg,#ffe0ec 0%,#ffb0cc 50%,#ff82ae 100%);box-shadow:0 4px 14px rgba(255,90,145,.35),inset 0 1px 0 rgba(255,255,255,.75);pointer-events:none;transition:transform .42s cubic-bezier(.34,1.56,.64,1);}'
    + '#themeCheckbox:checked + .theme-switch-pill{background:rgba(10,10,18,.97);border-color:rgba(255,215,0,.3);box-shadow:0 8px 32px rgba(0,0,0,.5),0 2px 10px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.05);}'
    + '#themeCheckbox:checked + .theme-switch-pill::before{transform:translateX(var(--seg,80px));background:linear-gradient(140deg,#26263a 0%,#1b1b2c 50%,#10101e 100%);box-shadow:0 4px 18px rgba(255,215,0,.25),inset 0 1px 0 rgba(255,255,255,.07);}'
    + '#themeCheckbox:checked + .theme-switch-pill .tsp-pig{color:rgba(255,255,255,.2);}#themeCheckbox:checked + .theme-switch-pill .tsp-lion{color:#ffd700;}';
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

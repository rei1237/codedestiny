/* ─── 공유하기 함수 ─── */
var APP_VERSION = 'dev';
var APP_VERSION_KEY = 'app_version';
var APP_VERSION_RELOAD_GUARD = 'app_version_reload_guard';  // 무한 reload 방지
var APP_VERSION_DEFER_GUARD = 'app_version_defer_guard';
var SW_PURGED_VERSION_KEY = 'app_sw_purged_version';
var VERSION_GUARD_BANNER_ID = 'cd-version-update-banner';
var VERSION_CHECK_INTERVAL_MS = 45000;

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

function isCriticalOperationInProgress() {
  try {
    if (window.__CD_PAYMENT_PROCESSING__) return '결제 처리 중';
    if (window.__CD_PDF_EXPORT_IN_PROGRESS__) return 'PDF 생성/다운로드 중';
    if (window.__CD_VERSION_GUARD_BLOCK__) return '중요 입력 작업 진행 중';
    if (document && document.body && document.body.dataset && document.body.dataset.cdVersionGuardBusy === '1') {
      return '핵심 작업 진행 중';
    }

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
    window.location.reload();
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

  var title = document.createElement('div');
  title.textContent = '새 버전이 배포되었습니다.';
  title.style.fontSize = '14px';
  title.style.fontWeight = '700';
  title.style.marginBottom = '4px';

  var message = document.createElement('div');
  message.setAttribute('data-cd-version-message', '1');
  message.textContent = '현재 ' + reason + ' 상태여서 자동 새로고침을 보류했습니다.';
  message.style.fontSize = '12px';
  message.style.opacity = '0.92';

  var actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.gap = '8px';
  actions.style.justifyContent = 'flex-end';
  actions.style.marginTop = '10px';

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

function runNuclearVersionGuard() {
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
      navigator.share({title:'🐷 꿀꿀 만세력',text:text,url:window.location.href}).catch(function(){});
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
      navigator.share({title:'🐷 연이의 꿀꿀 타로',text:text,url:'https://code-destiny.com'}).catch(function(){});
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
      navigator.share({ title: '✨ 점성술 코즈믹 차트', text: text, url: base }).catch(function(){});
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
    var section = document.getElementById('sukuyoSection');
    var preview = section ? _trimShareText(section.innerText, 240) : '';
    var base = window.location.href.split('?')[0];
    var text = '💫 [숙요점 결과 공유]\n\n'
      + name + '님의 숙요점 결과입니다.\n'
      + (preview ? ('\n' + preview + '\n') : '\n')
      + '\n나도 무료로 확인하기 👇\n' + base;
    if (navigator.share) {
      navigator.share({ title: '💫 숙요점 결과', text: text, url: base }).catch(function(){});
      return;
    }
    var a = document.createElement('a');
    a.href = 'kakaotalk://send?text=' + encodeURIComponent(text);
    a.click();
    setTimeout(function() {
      copyToClipboard(text, '카카오톡 앱이 없거나 PC에서는 링크를 복사했어요! 카카오톡에 붙여넣기 하세요 💬');
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
      navigator.share({ title: '🌌 자미두수 결과', text: text, url: base }).catch(function(){});
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
    var base = window.location.href.split('?')[0];
    var text = '📜 [인생의 책 — 나만을 위한 사주 심층 분석]\n\n'
      + name + '님의 운명을 10가지 심층 분석으로 완전 해독했습니다.\n\n'
      + '🔮 사주 팔자 완전 분석 · 대운 10년 흐름 · 재물·사랑·직업 종합\n\n'
      + '나도 무료로 확인하기 👇\n' + base;
    if (navigator.share) {
      navigator.share({ title: '📜 인생의 책', text: text, url: base }).catch(function () {});
      return;
    }
    var a = document.createElement('a');
    a.href = 'kakaotalk://send?text=' + encodeURIComponent(text);
    a.click();
    setTimeout(function () {
      copyToClipboard(text, '카카오톡 앱이 없거나 PC에서는 링크를 복사했어요! 카카오톡에 붙여넣기 하세요 💬');
    }, 800);
  }, 'lifebook');
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
      navigator.share({ title: '💕 연애 비책', text: text, url: base }).catch(function () {});
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
   PWA 설치 비술 (홈 화면 부적 설치)
   ══════════════════════════════════════════════ */
var _pwaPrompt = null;
var _pwaInstalled = false;
var FAVORITE_MODE_KEY = 'fortuneFavoriteModeStateV1';
var THEME_MODE_KEY = 'fortuneThemeModeStateV1';
var THEME_LOGO_REV = '20260511-mobile-logo-fix2';
var PIG_LOGO_URL = '/icons/꿀꿀 운세 로고.webp?v=' + THEME_LOGO_REV;
var PIG_LOGO_SRCSET = PIG_LOGO_URL + ' 96w, ' + PIG_LOGO_URL + ' 130w, ' + PIG_LOGO_URL + ' 512w';
var SAMBA_LOGO_URL = '/icons/samba.webp?v=' + THEME_LOGO_REV;
var SAMBA_LOGO_SRCSET = '/icons/samba-96.webp?v=' + THEME_LOGO_REV + ' 96w, /icons/samba-130.webp?v=' + THEME_LOGO_REV + ' 130w, ' + SAMBA_LOGO_URL + ' 512w';

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
    var manifestHref = (isNeo ? '/manifest-samba.json' : '/manifest.json') + '?v=' + THEME_LOGO_REV;
    manifestLink.setAttribute('href', manifestHref);
  }

  var faviconLink = document.getElementById('pwa-favicon');
  var appleIconLink = document.getElementById('pwa-apple-icon');
  if (isNeo) {
    if (faviconLink) { faviconLink.setAttribute('href', SAMBA_LOGO_URL); faviconLink.setAttribute('type', 'image/webp'); faviconLink.setAttribute('sizes', '192x192'); }
    if (appleIconLink) appleIconLink.setAttribute('href', SAMBA_LOGO_URL);
  } else {
    if (faviconLink) { faviconLink.setAttribute('href', PIG_LOGO_URL); faviconLink.setAttribute('type', 'image/webp'); faviconLink.setAttribute('sizes', '192x192'); }
    if (appleIconLink) appleIconLink.setAttribute('href', PIG_LOGO_URL);
  }
}

function syncThemeLogoSources() {
  var pigLogo = document.getElementById('honeypigLogo');
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

  var neoLogo = document.getElementById('neoLogo');
  if (neoLogo) {
    neoLogo.setAttribute('src', SAMBA_LOGO_URL);
    neoLogo.setAttribute('srcset', SAMBA_LOGO_SRCSET);
    neoLogo.setAttribute('sizes', '(max-width: 768px) 88px, 130px');
  }
}

function getFavoriteModeLabels() {
  return {
    pig: '꽃돼지 연이의 운세 꽃밭 즐겨찾기',
    neo: '백사자 쌈바의 운세 플랫폼 즐겨찾기'
  };
}

function readFavoriteModeState() {
  try {
    var raw = localStorage.getItem(FAVORITE_MODE_KEY);
    var parsed = raw ? JSON.parse(raw) : null;
    return {
      pig: !!(parsed && parsed.pig),
      neo: !!(parsed && parsed.neo)
    };
  } catch (_) {
    return { pig: false, neo: false };
  }
}

function writeFavoriteModeState(nextState) {
  try {
    localStorage.setItem(FAVORITE_MODE_KEY, JSON.stringify({
      pig: !!(nextState && nextState.pig),
      neo: !!(nextState && nextState.neo)
    }));
  } catch (_) {}
}

function updateFavoriteButtonThemeText(isNeo) {
  var labels = getFavoriteModeLabels();
  var txt = isNeo ? labels.neo : labels.pig;
  var icon = isNeo ? '⭐' : '🌸';
  var savedState = readFavoriteModeState();
  var isSaved = isNeo ? savedState.neo : savedState.pig;
  var renderedText = (isSaved ? '✅ ' : '') + txt;

  var label = document.getElementById('favoriteLabel');
  if (label) label.textContent = renderedText;
  var labelHome = document.getElementById('favoriteLabelHome');
  if (labelHome) labelHome.textContent = renderedText;

  var btn = document.getElementById('btnFavorite');
  if (btn) {
    var iconEl = btn.querySelector('.btn-favorite-icon');
    if (iconEl) iconEl.textContent = icon;
  }
  var btnHome = document.getElementById('btnFavoriteHome');
  if (btnHome) {
    var iconElHome = btnHome.querySelector('.btn-favorite-icon');
    if (iconElHome) iconElHome.textContent = icon;
  }
}

function pulseFavoriteSaved() {
  ['btnFavorite', 'btnFavoriteHome'].forEach(function(id) {
    var btn = document.getElementById(id);
    if (!btn) return;
    btn.classList.add('saved');
    setTimeout(function(){ btn.classList.remove('saved'); }, 1200);
  });
}

function handleFavoriteAdd() {
  var isNeo = (typeof NEO_MODE !== 'undefined' && NEO_MODE) || document.body.classList.contains('neo-mode');
  var labels = getFavoriteModeLabels();
  var modeKey = isNeo ? 'neo' : 'pig';
  var title = isNeo ? labels.neo : labels.pig;
  var icon = isNeo ? '⭐' : '🌸';
  var savedState = readFavoriteModeState();
  var alreadySaved = !!savedState[modeKey];

  savedState[modeKey] = true;
  writeFavoriteModeState(savedState);
  updateFavoriteButtonThemeText(isNeo);
  pulseFavoriteSaved();

  var nativeAdded = false;

  try {
    if (window.external && typeof window.external.AddFavorite === 'function') {
      window.external.AddFavorite(window.location.href, title);
      nativeAdded = true;
    }
  } catch (_) {}

  try {
    if (window.sidebar && typeof window.sidebar.addPanel === 'function') {
      window.sidebar.addPanel(title, window.location.href, '');
      nativeAdded = true;
    }
  } catch (_) {}

  if (nativeAdded) {
    showToast(icon + ' ' + title + ' 즐겨찾기가 저장되었어요!');
    return;
  }

  if (alreadySaved) {
    showToast(icon + ' 이미 저장된 즐겨찾기예요.');
    return;
  }

  showToast(icon + ' ' + title + ' 즐겨찾기가 저장되었어요!');
}

// [UX FIX] PWA 팝업 조건: 30초 + 스크롤 50% AND 충족 시만 자동 표시
var _pwaBannerCond = { timer: false, scroll: false, prompted: false };
function _maybeTriggerPwaBanner() {
  if (_pwaBannerCond.prompted || !_pwaBannerCond.timer || !_pwaBannerCond.scroll) return;
  if (!_pwaPrompt || _pwaInstalled) return;
  _pwaBannerCond.prompted = true;
  var banner = document.getElementById('pwa-auto-banner');
  if (banner) banner.classList.add('pwa-auto-banner--visible');
}
setTimeout(function() {
  _pwaBannerCond.timer = true;
  _maybeTriggerPwaBanner();
}, 30000);
window.addEventListener('scroll', function _pwaScrollCheck() {
  var scrolled = window.scrollY + window.innerHeight;
  var total = document.documentElement.scrollHeight;
  if (total > 0 && scrolled / total >= 0.5) {
    _pwaBannerCond.scroll = true;
    _maybeTriggerPwaBanner();
    window.removeEventListener('scroll', _pwaScrollCheck);
  }
}, { passive: true });

window.addEventListener('beforeinstallprompt', function(e) {
  // 이벤트를 보관해 사용자 버튼 설치 흐름에서 재사용합니다.
  _pwaPrompt = e;
  var isNeo = (typeof NEO_MODE !== 'undefined' && NEO_MODE);
  updateFavoriteButtonThemeText(isNeo);
  var pigText = '꽃돼지 운세 서비스 앱 설치하기';
  var neoText = '팩폭 사자 운세 서비스 앱 설치하기';
  var btn = document.getElementById('btnPwaInstall');
  if (btn) {
    btn.classList.remove('installed');
    document.getElementById('pwaInstallLabel').textContent = isNeo ? neoText : pigText;
  }
  var btnHome = document.getElementById('btnPwaInstallHome');
  if (btnHome) {
    btnHome.classList.remove('installed');
    document.getElementById('pwaInstallLabelHome').textContent = isNeo ? neoText : pigText;
  }
});

window.addEventListener('appinstalled', function() {
  _pwaInstalled = true;
  _pwaPrompt = null;
  var btn = document.getElementById('btnPwaInstall');
  if (btn) {
    btn.classList.add('installed');
    document.getElementById('pwaInstallLabel').textContent = '✅ 부적 설치 완료';
  }
  var btnHome = document.getElementById('btnPwaInstallHome');
  if (btnHome) {
    btnHome.classList.add('installed');
    document.getElementById('pwaInstallLabelHome').textContent = '✅ 부적 설치 완료';
  }
  showToast('🔮 홈 화면에 부적이 설치되었어요!');
});

if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
  _pwaInstalled = true;
}

async function handlePwaInstall() {
  if (_pwaInstalled) {
    showToast('✅ 이미 홈 화면에 설치되어 있어요!');
    return;
  }

  if (_pwaPrompt) {
    // beforeinstallprompt 이벤트는 1회성입니다.
    // prompt() 호출 전에 참조를 분리해 재진입/중복 호출 문제를 방지합니다.
    var deferredPrompt = _pwaPrompt;
    _pwaPrompt = null;

    try {
      deferredPrompt.prompt();
      var result = await deferredPrompt.userChoice;
      if (result && result.outcome === 'accepted') {
        _pwaInstalled = true;
        showToast('🔮 홈 화면에 부적이 설치됩니다!');
      } else {
        showToast('설치를 취소했어요. 언제든 다시 설치할 수 있어요 ✨');
      }
    } catch (_) {
      showToast('설치 창을 열지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
    return;
  }

  var modal = document.getElementById('ios-install-modal');
  if (modal) modal.classList.add('open');
}

function closeIosModal() {
  var modal = document.getElementById('ios-install-modal');
  if (modal) modal.classList.remove('open');
}

// Ensure data-action routers can always resolve these handlers.
window.handleFavoriteAdd = handleFavoriteAdd;
window.handlePwaInstall = handlePwaInstall;
window.closeIosModal = closeIosModal;

// data-action 경로 문제로 설치 버튼이 누락되는 환경을 대비한 직접 바인딩.
function bindPwaInstallButtons() {
  ['btnPwaInstall', 'btnPwaInstallHome'].forEach(function(id) {
    var btn = document.getElementById(id);
    if (!btn || btn.dataset.pwaInstallBound === '1') return;
    btn.dataset.pwaInstallBound = '1';
    btn.addEventListener('click', function(ev) {
      if (ev && ev.cancelable) ev.preventDefault();
      handlePwaInstall();
    }, { passive: false });
  });
}

// data-action 경로 문제로 즐겨찾기 버튼이 누락되는 환경을 대비한 직접 바인딩.
function bindFavoriteButtons() {
  ['btnFavorite', 'btnFavoriteHome'].forEach(function(id) {
    var btn = document.getElementById(id);
    if (!btn || btn.dataset.favoriteBound === '1') return;
    btn.dataset.favoriteBound = '1';
    btn.addEventListener('click', function(ev) {
      if (ev && ev.cancelable) ev.preventDefault();
      handleFavoriteAdd();
    }, { passive: false });
  });
}

function retireServiceWorkers() {
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
        return Promise.all(
          keys
            .filter(function(key) {
              return SW_CACHE_PREFIXES.some(function(prefix) { return key.indexOf(prefix) === 0; });
            })
            .map(function(key) { return caches.delete(key); })
        );
      }).catch(function() {})
    );
  }

  return Promise.all(tasks).catch(function() {});
}

if ('serviceWorker' in navigator || 'caches' in window) {
  window.addEventListener('load', function() {
    runNuclearVersionGuard().finally(function() {
      retireServiceWorkers();
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
   NEO MODE — 팩폭 사자 쌈바 퍼소나 시스템
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
  '에너지 원정 리포트 — 사주 맞춤 에너지 좌표':'확장 원정 — 쌈바의 기운 충전 좌표',
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
      tLabel.innerText = '🦁 팩폭 사자 쌈바 모드';
      tLabel.style.color = '#FFD700';
    }
    /* 사자모드 manifest + 아이콘 교체 */
    applyPwaThemeAssets(true);
    /* PWA 설치 텍스트 변경 */
    var pwaLabel = document.getElementById('pwaInstallLabel');
    var pwaLabelHome = document.getElementById('pwaInstallLabelHome');
    if(pwaLabel && !pwaLabel.textContent.includes('완료')) pwaLabel.textContent = '팩폭 사자 운세 서비스 앱 설치하기';
    if(pwaLabelHome && !pwaLabelHome.textContent.includes('완료')) pwaLabelHome.textContent = '팩폭 사자 운세 서비스 앱 설치하기';
    updateFavoriteButtonThemeText(true);
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
    /* 연이모드 manifest + 아이콘 복원 */
    applyPwaThemeAssets(false);
    /* PWA 설치 텍스트 복원 */
    var pwaLabel = document.getElementById('pwaInstallLabel');
    var pwaLabelHome = document.getElementById('pwaInstallLabelHome');
    if(pwaLabel && !pwaLabel.textContent.includes('완료')) pwaLabel.textContent = '꽃돼지 운세 서비스 앱 설치하기';
    if(pwaLabelHome && !pwaLabelHome.textContent.includes('완료')) pwaLabelHome.textContent = '꽃돼지 운세 서비스 앱 설치하기';
    updateFavoriteButtonThemeText(false);
  }
  syncThemeLogoSources();
  setTimeout(syncThemeLogoSources, 160);
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
    letterTitle.innerHTML = NEO_MODE ? '🦁 쌈바의 팩폭!' : '💖 연이의 편지';
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
  ensureThemeToggleCriticalStyles();
  var bootThemeNeo;
  var bootThemeCheckbox = document.getElementById('themeCheckbox');
  if (bootThemeCheckbox) {
    bootThemeNeo = !!bootThemeCheckbox.checked;
  } else {
    bootThemeNeo = readThemeModeState();
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
  syncThemeLogoSources();
  setTimeout(syncThemeLogoSources, 900);
  var pwaLabel = document.getElementById('pwaInstallLabel');
  var pwaLabelHome = document.getElementById('pwaInstallLabelHome');
  var tLabel = document.getElementById('themeToggleLabel');
  if(NEO_MODE){
    if(pwaLabel && !pwaLabel.textContent.includes('완료')) pwaLabel.textContent = '팩폭 사자 운세 서비스 앱 설치하기';
    if(pwaLabelHome && !pwaLabelHome.textContent.includes('완료')) pwaLabelHome.textContent = '팩폭 사자 운세 서비스 앱 설치하기';
    if(tLabel) {
      tLabel.innerText = '🦁 팩폭 사자 쌈바 모드';
      tLabel.style.color = '#FFD700';
    }
  }
  updateFavoriteButtonThemeText(NEO_MODE);

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
  bindPwaInstallButtons();
  bindFavoriteButtons();
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

async function subscribeEmail() {
  const emailVal = document.getElementById('subEmail').value.trim();
  const subDaily = document.getElementById('subDaily').checked;
  const subMonthly = document.getElementById('subMonthly').checked;
  
  if(!emailVal) {
    alert('이메일 주소를 입력해주세요!');
    return;
  }
  if (!emailVal.includes('@')) {
    alert('유효한 이메일 주소를 입력해주세요.');
    return;
  }
  if(!subDaily && !subMonthly) {
    alert('일일 운세 또는 월별 운세 중 하나 이상을 선택해주세요!');
    return;
  }

  // 1) 사주 분석 여부 확인
  if(!window.G_PILLARS) {
    alert('운세 구독을 위해 먼저 상단에서 [사주 분석하기]를 완료해주세요!');
    return;
  }

  // 2) 오늘/이번달 정보 추출
  const today = new Date();
  const ty = today.getFullYear(), tm = today.getMonth() + 1, td = today.getDate(), th = today.getHours();
  const dayGZ = getGanZhiForDate(ty, tm, td, th);
  const monGZ = getMonthGanZhi(ty, tm);
  const dayRes = analyzeFortuneGZ(dayGZ, window.G_PILLARS, '오늘 일진');
  const monRes = analyzeFortuneGZ(monGZ, window.G_PILLARS, '이달 월운');

  if ((subDaily && !dayRes) || (subMonthly && !monRes)) {
    alert('운세 데이터 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
    return;
  }

  const apiBase = getSubscriptionApiBaseUrl();
  const endpoint = (apiBase ? apiBase : '') + '/api/subscriptions/daily-fortune';

  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: emailVal,
        subDaily: !!subDaily,
        subMonthly: !!subMonthly,
      }),
    });

    if (!resp.ok) {
      let message = '구독 등록에 실패했습니다.';
      try {
        const payload = await resp.json();
        if (payload && payload.message) message = payload.message;
      } catch (_) {}
      throw new Error(message);
    }

    alert(emailVal + ' 주소로 매일 운세 자동 발송 구독이 등록되었습니다!\n내일부터 매일 생성되는 운세 메일이 자동 전송됩니다.');
    document.getElementById('subEmail').value = '';
  } catch (err) {
    var detail = (err && err.message) ? ('\n\n오류: ' + err.message) : '';
    alert('구독 등록 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' + detail);
  }
}

// 홈 화면 전용 이메일 구독 (사주 분석 없이 바로 구독 가능)
async function subscribeEmailHome() {
  const emailVal = document.getElementById('subEmailHome').value.trim();
  const subDaily = document.getElementById('subDailyHome').checked;
  const subMonthly = document.getElementById('subMonthlyHome').checked;

  if (!emailVal) {
    alert('이메일 주소를 입력해주세요!');
    return;
  }
  if (!emailVal.includes('@')) {
    alert('유효한 이메일 주소를 입력해주세요.');
    return;
  }
  if (!subDaily && !subMonthly) {
    alert('일일 운세 또는 월별 운세 중 하나 이상을 선택해주세요!');
    return;
  }

  const apiBase = getSubscriptionApiBaseUrl();
  const endpoint = (apiBase ? apiBase : '') + '/api/subscriptions/daily-fortune';

  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailVal,
        subDaily: !!subDaily,
        subMonthly: !!subMonthly,
        source: 'home-page',
      }),
    });

    if (!resp.ok) {
      let message = '구독 등록에 실패했습니다.';
      try {
        const payload = await resp.json();
        if (payload && payload.message) message = payload.message;
      } catch (_) {}
      throw new Error(message);
    }

    alert(emailVal + ' 주소로 매일 일일 운세 자동 발송 구독이 등록되었습니다!\n내일부터 매일 생성되는 운세 메일이 자동 전송됩니다.');
    document.getElementById('subEmailHome').value = '';
  } catch (err) {
    var detail = (err && err.message) ? ('\n\n오류: ' + err.message) : '';
    alert('구독 등록 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' + detail);
  }
}
window.subscribeEmail = subscribeEmail;
window.subscribeEmailHome = subscribeEmailHome;

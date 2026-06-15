/* ═══════════════════════════════════════════════════════════════════════
   카카오톡 공유 보상 시스템  —  share-reward.js
   ─────────────────────────────────────────────────────────────────────
   • 공유 성공 시 이벤트 보상 자동 반영
   • 하루 3회 한도 (localStorage 기반 선행 체크 + 서버 이중 검증)
   • 같은 contentId 당일 재공유 시 보상 없음
   • 비로그인: 공유는 허용, 보상은 안내 토스트 표시
   ═══════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  /* ── 상수 ─────────────────────────────────────────────────────────── */
  var REWARD_AMOUNT       = 10;
  var DAILY_LIMIT         = 3;
  var STORAGE_KEY_PREFIX  = 'cd_share_reward_';
  var LS_AUTH_TOKEN_KEY   = 'fortune_auth_token';
  var LS_AUTH_USER_KEY    = 'fortune_auth_user';

  /* ── KST 날짜 키 (YYYYMMDD) ────────────────────────────────────────  */
  function _kstDateKey() {
    var kst = new Date(Date.now() + 9 * 3600 * 1000);
    return kst.toISOString().slice(0, 10).replace(/-/g, '');
  }

  /* ══════════════════════════════════════════════════════════════════
     localStorage 중복 방지 유틸
     저장 형식: { count: N, contentIds: ["saju", "tarot", ...] }
  ══════════════════════════════════════════════════════════════════ */

  function _readRecord() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY_PREFIX + _kstDateKey());
      var parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === 'object') {
        return {
          count:      Number(parsed.count || 0),
          contentIds: Array.isArray(parsed.contentIds) ? parsed.contentIds : [],
        };
      }
    } catch (_e) {}
    return { count: 0, contentIds: [] };
  }

  function _writeRecord(record) {
    try {
      localStorage.setItem(
        STORAGE_KEY_PREFIX + _kstDateKey(),
        JSON.stringify({ count: record.count, contentIds: record.contentIds }),
      );
      _pruneOldRecords();
    } catch (_e) {}
  }

  /** 오늘 날짜 이전 보상 기록 자동 정리 */
  function _pruneOldRecords() {
    try {
      var today = _kstDateKey();
      var toDelete = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(STORAGE_KEY_PREFIX) === 0 && k.slice(STORAGE_KEY_PREFIX.length) !== today) {
          toDelete.push(k);
        }
      }
      toDelete.forEach(function (k) { try { localStorage.removeItem(k); } catch (_e) {} });
    } catch (_e) {}
  }

  /**
   * 오늘 보상 횟수를 반환합니다.
   * @returns {number}
   */
  function getShareRewardUsedToday() {
    return _readRecord().count;
  }

  /**
   * 특정 contentId가 오늘 이미 보상 지급 대상인지 확인합니다.
   * @param {string} contentId
   * @returns {boolean}
   */
  function isShareRewardContentUsed(contentId) {
    return _readRecord().contentIds.indexOf(String(contentId)) !== -1;
  }

  /** 서버 지급 성공 후 클라이언트 기록에 반영합니다. */
  function _markUsed(contentId) {
    var record = _readRecord();
    record.count += 1;
    if (record.contentIds.indexOf(String(contentId)) === -1) {
      record.contentIds.push(String(contentId));
    }
    _writeRecord(record);
  }

  /* ══════════════════════════════════════════════════════════════════
     토스트 UI
  ══════════════════════════════════════════════════════════════════ */

  var _toastTimer = null;

  /** 토스트 엘리먼트를 body에 한 번만 주입합니다. */
  function _ensureToast() {
    if (document.getElementById('shareRewardToast')) return;
    var el = document.createElement('div');
    el.id = 'shareRewardToast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    var s = el.style;
    s.position       = 'fixed';
    s.bottom         = '88px';
    s.left           = '50%';
    s.transform      = 'translateX(-50%) translateY(16px)';
    s.background     = 'linear-gradient(135deg,rgba(40,24,8,0.96) 0%,rgba(90,50,10,0.96) 100%)';
    s.color          = '#ffe9b0';
    s.padding        = '13px 26px';
    s.borderRadius   = '999px';
    s.fontSize       = '0.94rem';
    s.fontWeight     = '600';
    s.whiteSpace     = 'nowrap';
    s.pointerEvents  = 'none';
    s.zIndex         = '99999';
    s.opacity        = '0';
    s.transition     = 'opacity 0.28s ease, transform 0.28s ease';
    s.maxWidth       = 'calc(100vw - 32px)';
    s.textAlign      = 'center';
    s.boxShadow      = '0 6px 24px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,220,100,0.18)';
    s.border         = '1px solid rgba(255,200,80,0.25)';
    document.body.appendChild(el);
  }

  /**
   * 하단 토스트 메시지를 표시합니다.
   * @param {string} msg
   */
  function showShareRewardToast(msg) {
    _ensureToast();
    var el = document.getElementById('shareRewardToast');
    if (!el) return;
    el.textContent = msg;
    el.style.opacity   = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(function () {
      el.style.opacity   = '0';
      el.style.transform = 'translateX(-50%) translateY(16px)';
    }, 2500);
  }

  /* ══════════════════════════════════════════════════════════════════
     인증 / 잔액 유틸
  ══════════════════════════════════════════════════════════════════ */

  function _isLoggedIn() {
    try { return !!(localStorage.getItem(LS_AUTH_TOKEN_KEY) || ''); } catch (_e) { return false; }
  }

  function _getToken() {
    try { return localStorage.getItem(LS_AUTH_TOKEN_KEY) || ''; } catch (_e) { return ''; }
  }

  function _getApiBase() {
    /* index.html의 getApiBaseUrl()이 있으면 사용, 없으면 빈 문자열 (same-origin) */
    return (typeof getApiBaseUrl === 'function') ? getApiBaseUrl() : '';
  }

  /** fortune_auth_user.points를 갱신하고 잔액 뱃지 UI를 업데이트합니다. */
  function _applyNewPoints(points) {
    var n = Number(points || 0);
    /* 1) localStorage 동기화 */
    try {
      var raw  = localStorage.getItem(LS_AUTH_USER_KEY);
      var user = (raw ? JSON.parse(raw) : null) || {};
      user.points = n;
      localStorage.setItem(LS_AUTH_USER_KEY, JSON.stringify(user));
    } catch (_e) {}
    /* 2) 전역 badge 갱신 (index.html IIFE 내 userBalance / updateBadge) */
    try {
      if (typeof userBalance !== 'undefined') userBalance = n;
      if (typeof updateBadge === 'function') updateBadge();
    } catch (_e) {}
    /* 3) DOM 직접 갱신 fallback */
    try {
      var el = document.getElementById('goldenGrainBalanceText');
      if (el) el.textContent = '보유 혜택 ' + n.toLocaleString('ko-KR');
    } catch (_e) {}
  }

  /* ══════════════════════════════════════════════════════════════════
     서버 보상 요청
  ══════════════════════════════════════════════════════════════════ */

  function _requestReward(contentId, onSuccess, onError) {
    var token = _getToken();
    fetch(_getApiBase() + '/api/fortune/pig-coin/share-reward', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + token,
      },
      body: JSON.stringify({ contentId: contentId }),
    })
      .then(function (res) {
        return res.json().then(function (data) { return { status: res.status, data: data }; });
      })
      .then(function (r) {
        if (r.status === 200) {
          onSuccess(r.data);
        } else {
          onError(r.status, r.data || {});
        }
      })
      .catch(function (err) {
        console.warn('[share-reward] network error', err);
        onError(0, { message: '네트워크 오류가 발생했습니다.' });
      });
  }

  /* ══════════════════════════════════════════════════════════════════
     메인 공개 API
  ══════════════════════════════════════════════════════════════════ */

  /**
   * 카카오톡 공유 실행 후 보상을 처리하는 래퍼 함수.
   *
   * @param {Function} shareFn   - 실제 공유를 수행하는 함수 (동기)
   * @param {string}   contentId - 콘텐츠 식별자
   *    예: 'saju' | 'tarot' | 'dream-tarot' | 'reunion' | 'zodiac'
   *        | 'astro' | 'sukuyo' | 'ziwei' | 'destiny-flower'
   *        | 'hwatu' | 'stonehenge' | 'secret-house' | 'poker'
   *
   * @example
   *   shareWithReward(function() { Kakao.Share.sendDefault({...}); }, 'tarot');
   */
  function shareWithReward(shareFn, contentId) {
    var cid = String(contentId || 'default').trim();

    /* ── 1. 공유 실행 (보상과 무관하게 항상 실행) ── */
    try { shareFn(); } catch (e) { console.warn('[share-reward] shareFn threw:', e); }

    /* ── 2. 비로그인: 안내 토스트만 표시 ── */
    if (!_isLoggedIn()) {
      setTimeout(function () {
        showShareRewardToast('로그인하면 보상을 받을 수 있어요 🐷');
      }, 700);
      return;
    }

    /* ── 3. 클라이언트 선행 중복 체크 (빠른 UX, 서버가 2차 검증) ── */
    var record = _readRecord();

    if (record.count >= DAILY_LIMIT) {
      setTimeout(function () { showShareRewardToast('오늘 보상은 모두 받았어요 🌸'); }, 700);
      return;
    }

    if (record.contentIds.indexOf(cid) !== -1) {
      setTimeout(function () { showShareRewardToast('이미 오늘 공유한 콘텐츠예요'); }, 700);
      return;
    }

    /* ── 4. 서버 보상 요청 (공유 딜레이 후 실행) ── */
    setTimeout(function () {
      _requestReward(
        cid,
        /* onSuccess */ function (data) {
          var newPoints  = data.user && data.user.points;
          var usedToday  = Number(data.usedToday  || record.count + 1);
          var limitPerDay = Number(data.limitPerDay || DAILY_LIMIT);
          _markUsed(cid);
          if (typeof newPoints === 'number') _applyNewPoints(newPoints);
          showShareRewardToast(
            '공유 보상 반영! (오늘 ' + usedToday + '/' + limitPerDay + '회)',
          );
        },
        /* onError */ function (status, data) {
          if (status === 429) {
            _markUsed(cid);
            showShareRewardToast('오늘 보상은 모두 받았어요 🌸');
          } else if (status === 409) {
            _markUsed(cid);
            showShareRewardToast('이미 오늘 공유한 콘텐츠예요');
          } else if (status === 401) {
            showShareRewardToast('로그인하면 보상을 받을 수 있어요 🐷');
          } else {
            /* 네트워크 오류 등: 조용히 실패 (공유 자체는 성공) */
            console.warn('[share-reward] reward error', status, data);
          }
        },
      );
    }, 900);
  }

  /* ── 전역 노출 ── */
  global.shareWithReward          = shareWithReward;
  global.showShareRewardToast     = showShareRewardToast;
  global.getShareRewardUsedToday  = getShareRewardUsedToday;
  global.isShareRewardContentUsed = isShareRewardContentUsed;

}(typeof window !== 'undefined' ? window : this));

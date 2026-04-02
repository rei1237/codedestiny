/**
 * 황금 돼지 코인 게이트 패치:
 * 1. stopPropagation → stopImmediatePropagation
 * 2. actionNode.click() → _cdInvokeActionDirect() (직접 액션 실행)
 * 3. capture phase touchend 게이트 추가 (모바일 bypass 차단)
 * 4. fortune.routes.js PIG_COIN_PACKAGES 5개로 완성
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;

// ─── 패치 대상 HTML 파일 ───────────────────────────────────────────────
const HTML_FILES = [
  path.join(ROOT, 'index.html'),
  path.join(ROOT, 'public', 'index.html'),
  path.join(ROOT, 'public', 'static', 'index.html'),
  path.join(ROOT, 'public', 'en-us', 'index.html'),
  path.join(ROOT, 'public', 'de-de', 'index.html'),
  path.join(ROOT, 'public', 'es-es', 'index.html'),
  path.join(ROOT, 'public', 'fr-fr', 'index.html'),
  path.join(ROOT, 'public', 'hi-in', 'index.html'),
  path.join(ROOT, 'public', 'ja-jp', 'index.html'),
  path.join(ROOT, 'public', 'ms-my', 'index.html'),
  path.join(ROOT, 'public', 'nl-nl', 'index.html'),
  path.join(ROOT, 'public', 'zh-cn', 'index.html'),
];

// ─── OLD: 기존 클릭 게이트 블록 ───────────────────────────────────────
const OLD_GATE = `  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;
    var actionNode = target.closest('[data-action]');
    if (!actionNode) return;
    var action = actionNode.getAttribute('data-action');

    // ── 회당 코인 게이트 (per-use) ──
    var tileCoinCost = Number(actionNode.getAttribute('data-coin-cost') || 0);
    if (tileCoinCost > 0 && action !== 'unlockPremiumFeature') {
      if (!perUseApproved[action]) {
        event.preventDefault();
        event.stopPropagation();
        (async function () {
          if (!hasAuthToken()) {
            if (window.confirm('🔒 로그인이 필요한 서비스입니다.\\n로그인 후 이용해 주세요.')) {
              window.location.href = '/login?next=%2F';
            }
            return;
          }
          if (userBalance < tileCoinCost) {
            if (window.confirm('황금 돼지 코인이 부족해요 🐷\\n보유: ' + Number(userBalance).toLocaleString('ko-KR') + '코인 / 필요: ' + tileCoinCost + '코인\\n충전 창을 여시겠습니까?')) {
              openChargeModal();
            }
            return;
          }
          var titleEl = actionNode.querySelector('.tarot-tile__title');
          var fname = titleEl ? titleEl.textContent.trim() : '서비스';
          if (!window.confirm('🪙 ' + fname + '\\n이용에 ' + tileCoinCost + '코인이 필요합니다.\\n(현재 보유: ' + Number(userBalance).toLocaleString('ko-KR') + '코인)\\n진행하시겠습니까?')) return;
          if (consumeInFlight) return;
          consumeInFlight = true;
          try {
            var r = await fetchJsonWithAuth('/api/fortune/pig-coin/consume', {
              method: 'POST',
              body: JSON.stringify({ cost: tileCoinCost, reason: fname + ' 이용' }),
            });
            if (r.status === 402) { openChargeModal(); return; }
            if (!r.ok) {
              window.alert((r.payload && r.payload.message) || '코인 차감에 실패했습니다. 다시 시도해 주세요.');
              return;
            }
            if (r.payload && r.payload.user && typeof r.payload.user.points === 'number') {
              userBalance = r.payload.user.points;
            } else {
              userBalance = Math.max(0, userBalance - tileCoinCost);
            }
            saveBalance();
            updateBadge();
            sessionStorage.setItem('cd_pa_' + action, '1');
            perUseApproved[action] = true;
            actionNode.click();
            setTimeout(function () { delete perUseApproved[action]; }, 1000);
          } catch (e) {
            console.error('[per-use coin gate]', e);
            window.alert('오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
          } finally {
            consumeInFlight = false;
          }
        })();
        return;
      }
      delete perUseApproved[action];
    }

    // ── 영구 해금 타일 게이트 ──
    var tileLockKey = actionNode.getAttribute('data-tile-lock-key');
    var tileLockCost = Number(actionNode.getAttribute('data-tile-lock-cost') || 0);
    if (tileLockKey && tileLockCost > 0 && !unlockedFeatureMap[tileLockKey]) {
      event.preventDefault();
      event.stopPropagation();
      (async function () {
        if (!hasAuthToken()) {
          if (window.confirm('🔒 로그인이 필요한 서비스입니다.\\n로그인 후 이용해 주세요.')) {
            window.location.href = '/login?next=%2F';
          }
          return;
        }
        var titleEl = actionNode.querySelector('.tarot-tile__title');
        var fname = titleEl ? titleEl.textContent.trim() : '서비스';
        if (!window.confirm('🔓 ' + fname + '\\n' + tileLockCost + '코인으로 영구 해금하시겠습니까?\\n(현재 보유: ' + Number(userBalance).toLocaleString('ko-KR') + '코인)\\n한 번 해금하면 계속 이용 가능합니다!')) return;
        if (userBalance < tileLockCost) {
          if (window.confirm('황금 돼지 코인이 부족해요 🐷\\n보유: ' + Number(userBalance).toLocaleString('ko-KR') + '코인 / 필요: ' + tileLockCost + '코인\\n충전 창을 여시겠습니까?')) {
            openChargeModal();
          }
          return;
        }
        if (consumeInFlight) return;
        consumeInFlight = true;
        try {
          var r = await fetchJsonWithAuth('/api/fortune/pig-coin/consume', {
            method: 'POST',
            body: JSON.stringify({ cost: tileLockCost, featureKey: tileLockKey, reason: fname + ' 영구 해금' }),
          });
          if (r.status === 402) { openChargeModal(); return; }
          if (!r.ok) {
            window.alert((r.payload && r.payload.message) || '해금 처리에 실패했습니다.');
            return;
          }
          if (r.payload && r.payload.user && typeof r.payload.user.points === 'number') {
            userBalance = r.payload.user.points;
          } else {
            userBalance = Math.max(0, userBalance - tileLockCost);
          }
          saveBalance();
          updateBadge();
          unlockedFeatureMap[tileLockKey] = true;
          saveTileLocks();
          sessionStorage.setItem('cd_pa_' + action, '1');
          window.alert('✅ ' + fname + ' 해금 완료!\\n이제 자유롭게 이용하실 수 있습니다 🌟');
          actionNode.click();
        } catch (e) {
          console.error('[tile unlock gate]', e);
          window.alert('오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
          consumeInFlight = false;
        }
      })();
      return;
    }

    if (action === 'openGoldenGrainCharge') {
      openChargeModal();
      return;
    }
    if (action === 'closeGoldenGrainCharge') {
      closeChargeModal();
      return;
    }
    if (action === 'selectGoldenPackage') {
      selectPackage(actionNode.getAttribute('data-package-id') || 'sample');
      return;
    }
    if (action === 'confirmGoldenCharge') {
      void applyCharge();
      return;
    }
    if (action === 'unlockPremiumFeature') {
      void tryUnlockFeature(actionNode);
      return;
    }
  }, true);`;

// ─── NEW: 수정된 게이트 블록 ──────────────────────────────────────────
const NEW_GATE = `  // 코인 차감 후 직접 액션 실행 (actionNode.click() 재호출 방식 대체)
  function _cdInvokeActionDirect(action, actionEl) {
    // <a href> 타일: href 경로로 직접 이동
    if (actionEl && actionEl.tagName === 'A') {
      var href = actionEl.getAttribute('href') || actionEl.getAttribute('data-fallback-href') || '';
      if (href && href !== '#' && !/^javascript:/i.test(href)) {
        window.location.href = href;
        return;
      }
    }
    // window[action] 함수가 있으면 직접 호출
    if (action && typeof window[action] === 'function') {
      window[action]();
      return;
    }
    // 폴백: perUseApproved 플래그 세팅 후 프로그래매틱 클릭
    perUseApproved[action] = true;
    try { actionEl.click(); } catch (_) {}
    setTimeout(function () { delete perUseApproved[action]; }, 800);
  }

  // 회당 코인 차감 공통 로직 (click / touchend 양쪽에서 사용)
  function _cdRunPerUseCoinGate(event, actionNode, action, tileCoinCost) {
    event.preventDefault();
    event.stopImmediatePropagation();
    (async function () {
      if (!hasAuthToken()) {
        if (window.confirm('🔒 로그인이 필요한 서비스입니다.\\n로그인 후 이용해 주세요.')) {
          window.location.href = '/login?next=%2F';
        }
        return;
      }
      if (userBalance < tileCoinCost) {
        if (window.confirm('황금 돼지 코인이 부족해요 🐷\\n보유: ' + Number(userBalance).toLocaleString('ko-KR') + '코인 / 필요: ' + tileCoinCost + '코인\\n충전 창을 여시겠습니까?')) {
          openChargeModal();
        }
        return;
      }
      var titleEl = actionNode.querySelector('.tarot-tile__title');
      var fname = titleEl ? titleEl.textContent.trim() : '서비스';
      if (!window.confirm('🪙 ' + fname + '\\n이용에 ' + tileCoinCost + '코인이 필요합니다.\\n(현재 보유: ' + Number(userBalance).toLocaleString('ko-KR') + '코인)\\n진행하시겠습니까?')) return;
      if (consumeInFlight) return;
      consumeInFlight = true;
      try {
        var r = await fetchJsonWithAuth('/api/fortune/pig-coin/consume', {
          method: 'POST',
          body: JSON.stringify({ cost: tileCoinCost, reason: fname + ' 이용' }),
        });
        if (r.status === 402) { openChargeModal(); return; }
        if (!r.ok) {
          window.alert((r.payload && r.payload.message) || '코인 차감에 실패했습니다. 다시 시도해 주세요.');
          return;
        }
        if (r.payload && r.payload.user && typeof r.payload.user.points === 'number') {
          userBalance = r.payload.user.points;
        } else {
          userBalance = Math.max(0, userBalance - tileCoinCost);
        }
        saveBalance();
        updateBadge();
        sessionStorage.setItem('cd_pa_' + action, '1');
        _cdInvokeActionDirect(action, actionNode);
      } catch (e) {
        console.error('[coin gate]', e);
        window.alert('오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      } finally {
        consumeInFlight = false;
      }
    })();
  }

  // touchend 캡처 게이트 — 모바일 직접 바인딩(터치) 우회 차단
  // ※ defer 스크립트(index-inline-runtime.js)보다 먼저 등록되어 touchend를 선점
  document.addEventListener('touchend', function (event) {
    if (!(event.target instanceof Element)) return;
    var actionNode = event.target.closest('[data-coin-cost]');
    if (!actionNode) return;
    var tileCoinCost = Number(actionNode.getAttribute('data-coin-cost') || 0);
    var action = actionNode.getAttribute('data-action') || '';
    if (tileCoinCost <= 0 || !action || action === 'unlockPremiumFeature') return;
    // 직접 호출 승인 상태면 그냥 통과 (직접 탐색 중이므로 플래그 정리)
    if (perUseApproved[action]) { delete perUseApproved[action]; return; }
    // 터치 해제 위치가 타일 영역 내인지 확인
    var t = event.changedTouches && event.changedTouches[0];
    if (t && typeof document.elementFromPoint === 'function') {
      var elAtPoint = document.elementFromPoint(t.clientX, t.clientY);
      if (elAtPoint && !actionNode.contains(elAtPoint) && elAtPoint !== actionNode) return;
    }
    _cdRunPerUseCoinGate(event, actionNode, action, tileCoinCost);
  }, { capture: true, passive: false });

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;
    var actionNode = target.closest('[data-action]');
    if (!actionNode) return;
    var action = actionNode.getAttribute('data-action');

    // ── 회당 코인 게이트 (per-use) ──
    var tileCoinCost = Number(actionNode.getAttribute('data-coin-cost') || 0);
    if (tileCoinCost > 0 && action !== 'unlockPremiumFeature') {
      if (!perUseApproved[action]) {
        _cdRunPerUseCoinGate(event, actionNode, action, tileCoinCost);
        return;
      }
      delete perUseApproved[action];
    }

    // ── 영구 해금 타일 게이트 ──
    var tileLockKey = actionNode.getAttribute('data-tile-lock-key');
    var tileLockCost = Number(actionNode.getAttribute('data-tile-lock-cost') || 0);
    if (tileLockKey && tileLockCost > 0 && !unlockedFeatureMap[tileLockKey]) {
      event.preventDefault();
      event.stopImmediatePropagation();
      (async function () {
        if (!hasAuthToken()) {
          if (window.confirm('🔒 로그인이 필요한 서비스입니다.\\n로그인 후 이용해 주세요.')) {
            window.location.href = '/login?next=%2F';
          }
          return;
        }
        var titleEl = actionNode.querySelector('.tarot-tile__title');
        var fname = titleEl ? titleEl.textContent.trim() : '서비스';
        if (!window.confirm('🔓 ' + fname + '\\n' + tileLockCost + '코인으로 영구 해금하시겠습니까?\\n(현재 보유: ' + Number(userBalance).toLocaleString('ko-KR') + '코인)\\n한 번 해금하면 계속 이용 가능합니다!')) return;
        if (userBalance < tileLockCost) {
          if (window.confirm('황금 돼지 코인이 부족해요 🐷\\n보유: ' + Number(userBalance).toLocaleString('ko-KR') + '코인 / 필요: ' + tileLockCost + '코인\\n충전 창을 여시겠습니까?')) {
            openChargeModal();
          }
          return;
        }
        if (consumeInFlight) return;
        consumeInFlight = true;
        try {
          var r = await fetchJsonWithAuth('/api/fortune/pig-coin/consume', {
            method: 'POST',
            body: JSON.stringify({ cost: tileLockCost, featureKey: tileLockKey, reason: fname + ' 영구 해금' }),
          });
          if (r.status === 402) { openChargeModal(); return; }
          if (!r.ok) {
            window.alert((r.payload && r.payload.message) || '해금 처리에 실패했습니다.');
            return;
          }
          if (r.payload && r.payload.user && typeof r.payload.user.points === 'number') {
            userBalance = r.payload.user.points;
          } else {
            userBalance = Math.max(0, userBalance - tileLockCost);
          }
          saveBalance();
          updateBadge();
          unlockedFeatureMap[tileLockKey] = true;
          saveTileLocks();
          sessionStorage.setItem('cd_pa_' + action, '1');
          window.alert('✅ ' + fname + ' 해금 완료!\\n이제 자유롭게 이용하실 수 있습니다 🌟');
          _cdInvokeActionDirect(action, actionNode);
        } catch (e) {
          console.error('[tile unlock gate]', e);
          window.alert('오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
          consumeInFlight = false;
        }
      })();
      return;
    }

    if (action === 'openGoldenGrainCharge') {
      openChargeModal();
      return;
    }
    if (action === 'closeGoldenGrainCharge') {
      closeChargeModal();
      return;
    }
    if (action === 'selectGoldenPackage') {
      selectPackage(actionNode.getAttribute('data-package-id') || 'sample');
      return;
    }
    if (action === 'confirmGoldenCharge') {
      void applyCharge();
      return;
    }
    if (action === 'unlockPremiumFeature') {
      void tryUnlockFeature(actionNode);
      return;
    }
  }, true);`;

// ─── fortune.routes.js PIG_COIN_PACKAGES 패치 ─────────────────────────
const ROUTES_FILE = path.join(ROOT, 'server', 'routes', 'fortune.routes.js');
const OLD_PACKAGES = `const PIG_COIN_PACKAGES = {
  sample: {
    name: "맛보기 한 줌",
    coins: 30,
    bonus: 0,
  },
  luckyMeal: {
    name: "행운의 한 끼",
    coins: 100,
    bonus: 10,
  },
  goldBarn: {
    name: "황금 돼지 곳간",
    coins: 300,
    bonus: 50,
  },
};`;
const NEW_PACKAGES = `const PIG_COIN_PACKAGES = {
  sample: {
    name: "맛보기 한 줌",
    coins: 30,
    bonus: 0,
  },
  luckyMeal: {
    name: "행운의 한 끼",
    coins: 100,
    bonus: 15,
  },
  goldBarn: {
    name: "황금 돼지 곳간",
    coins: 300,
    bonus: 60,
  },
  goldVault: {
    name: "황금 돼지 금고",
    coins: 700,
    bonus: 180,
  },
  emperorReserve: {
    name: "황금 돼지 제왕 보물고",
    coins: 1500,
    bonus: 500,
  },
};`;

// ─── 패치 실행 ────────────────────────────────────────────────────────
let totalPatched = 0;

for (const filePath of HTML_FILES) {
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP (not found): ${filePath}`);
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes(OLD_GATE)) {
    console.log(`SKIP (pattern not found): ${path.relative(ROOT, filePath)}`);
    continue;
  }
  const patched = content.replace(OLD_GATE, NEW_GATE);
  fs.writeFileSync(filePath, patched, 'utf8');
  console.log(`PATCHED: ${path.relative(ROOT, filePath)}`);
  totalPatched++;
}

// fortune.routes.js 패치
if (fs.existsSync(ROUTES_FILE)) {
  const content = fs.readFileSync(ROUTES_FILE, 'utf8');
  if (content.includes(OLD_PACKAGES)) {
    const patched = content.replace(OLD_PACKAGES, NEW_PACKAGES);
    fs.writeFileSync(ROUTES_FILE, patched, 'utf8');
    console.log('PATCHED: server/routes/fortune.routes.js');
    totalPatched++;
  } else {
    console.log('SKIP: fortune.routes.js (pattern not found)');
  }
}

console.log(`\n총 ${totalPatched}개 파일 패치 완료`);

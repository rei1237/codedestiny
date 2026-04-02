// _patch_locales.mjs
// 다국어 정적 페이지 황금 돼지 모달 UI/정책 일괄 패치 스크립트
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.dirname(__filename);
const LOCALES = ['de-de','en-us','es-es','fr-fr','hi-in','ja-jp','ms-my','nl-nl','zh-cn','static'];

/* ============================================================
   CSS: OLD → NEW
   ============================================================ */
const OLD_CSS = `.golden-grain-modal{position:fixed;inset:0;display:none;align-items:center;justify-content:center;padding:20px;z-index:100002;background:rgba(28,9,35,0.68);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}
.golden-grain-modal--open{display:flex}
.golden-grain-modal__card{width:min(560px,94vw);border-radius:26px;padding:22px 18px 18px;border:1px solid rgba(255,203,147,0.72);background:linear-gradient(165deg,#fff8ec 0%,#ffe8c9 46%,#ffd7bb 100%);box-shadow:0 22px 68px rgba(43,5,29,0.38);position:relative;overflow:hidden}
.golden-grain-modal__card::before{content:'';position:absolute;inset:-40% auto auto -14%;width:250px;height:250px;border-radius:50%;background:radial-gradient(circle,rgba(255,222,155,0.54) 0%,rgba(255,222,155,0) 72%);pointer-events:none}
.golden-grain-modal__close{position:absolute;top:12px;right:12px;width:38px;height:38px;border-radius:50%;border:1px solid rgba(160,64,21,0.24);background:rgba(255,255,255,0.76);color:#7f3606;font-size:1.2rem;font-weight:700;cursor:pointer}
.golden-grain-modal__title{margin:0 0 6px;font-family:'Noto Serif KR',serif;font-size:1.35rem;color:#812f00}
.golden-grain-modal__subtitle{margin:0 0 14px;font-size:.9rem;color:#8b4b24}
.golden-grain-piggy{width:84px;height:84px;margin:0 auto 14px;border-radius:50%;display:block;overflow:hidden;background:radial-gradient(circle at 30% 25%,#fff2cb 0%,#ffd972 56%,#f6b126 100%);border:2px solid rgba(211,133,17,0.62);box-shadow:inset 0 3px 10px rgba(255,255,255,0.56),0 8px 20px rgba(155,95,15,0.25)}
.golden-grain-piggy__img{width:100%;height:100%;object-fit:cover;display:block}
.golden-grain-piggy.is-shaking{animation:piggyShake .56s ease}
@keyframes piggyShake{0%{transform:rotate(0deg)}20%{transform:rotate(-8deg)}40%{transform:rotate(7deg)}60%{transform:rotate(-6deg)}80%{transform:rotate(4deg)}100%{transform:rotate(0deg)}}
.golden-grain-packages{display:grid;gap:10px}
.golden-grain-package{position:relative;border:1px solid rgba(255,171,101,0.42);border-radius:16px;padding:12px;background:rgba(255,255,255,0.78);cursor:pointer;transition:transform .25s ease,box-shadow .25s ease,border-color .25s ease}
.golden-grain-package:hover{transform:translateY(-1px);box-shadow:0 10px 20px rgba(169,56,95,0.14)}
.golden-grain-package.is-selected{border-color:rgba(245,124,0,0.9);box-shadow:0 12px 22px rgba(238,137,21,0.24);transform:translateY(-1px) scale(1.01)}
.golden-grain-package__top{display:flex;justify-content:space-between;gap:8px;align-items:center}
.golden-grain-package__best{position:absolute;top:10px;right:10px;display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:999px;background:linear-gradient(135deg,#ff5f45,#ff8c32);color:#fff;font-size:.66rem;font-weight:900;letter-spacing:.02em;box-shadow:0 6px 14px rgba(214,91,33,0.3)}
.golden-grain-package__name{font-weight:800;color:#742c16}
.golden-grain-package__coin{font-weight:900;color:#a6450f}
.golden-grain-package__meta{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-top:5px}
.golden-grain-package__price{font-size:.86rem;color:#7d4b2b}
.golden-grain-package__total{font-size:.79rem;font-weight:800;color:#8e4c11}
.golden-grain-package__bonus{display:inline-flex;margin-top:7px;padding:3px 8px;border-radius:999px;background:rgba(251,177,74,0.25);color:#8d4a04;font-size:.73rem;font-weight:700}
.golden-grain-modal__charge-btn{margin-top:14px;width:100%;border:none;border-radius:14px;padding:13px 14px;background:linear-gradient(135deg,#ff7aaa,#ffb15e);color:#fff;font-size:.98rem;font-weight:900;letter-spacing:.01em;cursor:pointer;transition:transform .2s ease,box-shadow .2s ease}
.golden-grain-modal__charge-btn:hover{transform:translateY(-1px);box-shadow:0 12px 22px rgba(214,99,31,0.34)}
.golden-grain-modal__notice{margin-top:10px;text-align:center;color:#9b5a23;font-weight:700;font-size:.78rem}
.golden-grain-modal__footer-copy{margin-top:11px;text-align:center;color:#8f4a33;font-weight:700;font-size:.82rem}
.golden-unlock-area{margin-top:16px;padding:14px;border-radius:14px;border:1px solid rgba(255,182,121,0.34);background:linear-gradient(160deg,rgba(255,242,226,0.9),rgba(255,232,241,0.82))}
.golden-unlock-title{font-size:.95rem;font-weight:900;color:#6f2d0d;margin:0 0 8px}
.golden-unlock-list{display:grid;gap:8px}
.golden-unlock-btn{width:100%;border:none;border-radius:12px;padding:12px;background:linear-gradient(135deg,#ff7ea1,#ffc36f);color:#fff;font-weight:900;cursor:pointer;transition:transform .2s ease,filter .2s ease}
.golden-unlock-btn:hover{transform:translateY(-1px);filter:brightness(1.04)}
.animate-bounce{animation:goldenBounce .72s ease}
@keyframes goldenBounce{0%,100%{transform:translateY(0)}35%{transform:translateY(-6px)}60%{transform:translateY(2px)}}
@media(max-width:768px){.golden-grain-badge{position:static;width:max-content;margin:12px auto 0}.logo-area{position:relative}}`;

const NEW_CSS = `.golden-grain-modal{position:fixed;inset:0;display:none;align-items:center;justify-content:center;padding:14px;z-index:100002;background:radial-gradient(circle at 20% 18%,rgba(255,205,131,.18) 0%,rgba(30,8,34,.74) 54%),rgba(23,8,29,.68);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}
.golden-grain-modal--open{display:flex}
.golden-grain-modal__card{width:min(620px,96vw);max-height:calc(100vh - 28px);display:flex;flex-direction:column;border-radius:28px;padding:18px 14px 14px;border:1px solid rgba(255,203,147,0.72);background:linear-gradient(165deg,#fff9ef 0%,#ffe9cc 44%,#ffd8bd 100%);box-shadow:0 22px 68px rgba(43,5,29,0.38);position:relative;overflow:hidden}
.golden-grain-modal__card::before{content:'';position:absolute;inset:-40% auto auto -14%;width:250px;height:250px;border-radius:50%;background:radial-gradient(circle,rgba(255,222,155,0.54) 0%,rgba(255,222,155,0) 72%);pointer-events:none}
.golden-grain-modal__close{position:absolute;top:12px;right:12px;width:40px;height:40px;border-radius:50%;border:1px solid rgba(160,64,21,0.24);background:rgba(255,255,255,0.84);color:#7f3606;font-size:1.2rem;font-weight:700;cursor:pointer;z-index:2}
.golden-grain-modal__head{position:relative;z-index:1;text-align:center;padding:4px 8px 8px}
.golden-grain-modal__title{margin:0 0 6px;font-family:'Noto Serif KR',serif;font-size:1.45rem;color:#812f00;letter-spacing:.01em}
.golden-grain-modal__subtitle{margin:0;font-size:.91rem;color:#8b4b24;line-height:1.45}
.golden-grain-piggy{width:84px;height:84px;margin:0 auto 10px;border-radius:50%;display:block;overflow:hidden;background:radial-gradient(circle at 30% 25%,#fff2cb 0%,#ffd972 56%,#f6b126 100%);border:2px solid rgba(211,133,17,0.62);box-shadow:inset 0 3px 10px rgba(255,255,255,0.56),0 8px 20px rgba(155,95,15,0.25)}
.golden-grain-piggy__img{width:100%;height:100%;object-fit:cover;display:block}
.golden-grain-piggy.is-shaking{animation:piggyShake .56s ease}
@keyframes piggyShake{0%{transform:rotate(0deg)}20%{transform:rotate(-8deg)}40%{transform:rotate(7deg)}60%{transform:rotate(-6deg)}80%{transform:rotate(4deg)}100%{transform:rotate(0deg)}}
.golden-grain-modal__scroll{overflow-y:auto;overflow-x:hidden;padding:8px 6px 8px 4px;margin-top:8px;max-height:min(50vh,430px);scrollbar-width:thin;scrollbar-color:rgba(194,116,30,.58) rgba(255,235,208,.52)}
.golden-grain-modal__scroll::-webkit-scrollbar{width:8px}
.golden-grain-modal__scroll::-webkit-scrollbar-track{background:rgba(255,235,208,.52);border-radius:999px}
.golden-grain-modal__scroll::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#ffbc72,#f58a42);border-radius:999px}
.golden-grain-packages{display:grid;gap:10px}
.golden-grain-package{position:relative;border:1px solid rgba(255,171,101,0.42);border-radius:18px;padding:13px 12px;background:linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,246,236,0.86));cursor:pointer;transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease}
.golden-grain-package:hover{transform:translateY(-1px);box-shadow:0 10px 20px rgba(169,56,95,0.14)}
.golden-grain-package.is-selected{border-color:rgba(245,124,0,0.95);box-shadow:0 12px 22px rgba(238,137,21,0.24);transform:translateY(-1px) scale(1.01);background:linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,238,214,0.94))}
.golden-grain-package__top{display:flex;justify-content:space-between;gap:8px;align-items:center}
.golden-grain-package__best{position:absolute;top:10px;right:10px;display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:999px;background:linear-gradient(135deg,#ff5f45,#ff8c32);color:#fff;font-size:.66rem;font-weight:900;letter-spacing:.02em;box-shadow:0 6px 14px rgba(214,91,33,0.3)}
.golden-grain-package__name{font-weight:800;color:#742c16}
.golden-grain-package__coin{font-weight:900;color:#a6450f}
.golden-grain-package__meta{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-top:5px}
.golden-grain-package__price{font-size:.86rem;color:#7d4b2b}
.golden-grain-package__total{font-size:.79rem;font-weight:800;color:#8e4c11}
.golden-grain-package__bonus{display:inline-flex;margin-top:7px;padding:3px 8px;border-radius:999px;background:rgba(251,177,74,0.25);color:#8d4a04;font-size:.73rem;font-weight:700}
.golden-grain-modal__cta{position:relative;z-index:1;margin-top:10px;padding:10px 4px 2px;background:linear-gradient(180deg,rgba(255,236,211,0) 0%,rgba(255,225,193,.88) 42%,rgba(255,217,182,.98) 100%)}
.golden-grain-modal__charge-btn{margin-top:0;width:100%;border:none;border-radius:14px;padding:13px 14px;background:linear-gradient(135deg,#ff7aaa,#ffb15e);color:#fff;font-size:.98rem;font-weight:900;letter-spacing:.01em;cursor:pointer;transition:transform .2s ease,box-shadow .2s ease}
.golden-grain-modal__charge-btn:hover{transform:translateY(-1px);box-shadow:0 12px 22px rgba(214,99,31,0.34)}
.golden-grain-modal__notice{margin-top:10px;text-align:center;color:#9b5a23;font-weight:700;font-size:.78rem}
.golden-grain-modal__footer-copy{margin-top:11px;text-align:center;color:#8f4a33;font-weight:700;font-size:.82rem}
.golden-unlock-area{margin-top:16px;padding:14px;border-radius:14px;border:1px solid rgba(255,182,121,0.34);background:linear-gradient(160deg,rgba(255,242,226,0.9),rgba(255,232,241,0.82))}
.golden-unlock-title{font-size:.95rem;font-weight:900;color:#6f2d0d;margin:0 0 8px}
.golden-unlock-list{display:grid;gap:8px}
.golden-unlock-btn{width:100%;border:none;border-radius:12px;padding:12px;background:linear-gradient(135deg,#ff7ea1,#ffc36f);color:#fff;font-weight:900;cursor:pointer;transition:transform .2s ease,filter .2s ease}
.golden-unlock-btn:hover{transform:translateY(-1px);filter:brightness(1.04)}
.animate-bounce{animation:goldenBounce .72s ease}
@keyframes goldenBounce{0%,100%{transform:translateY(0)}35%{transform:translateY(-6px)}60%{transform:translateY(2px)}}
@media(max-width:768px){.golden-grain-badge{position:static;width:max-content;margin:12px auto 0}.logo-area{position:relative}.golden-grain-modal{padding:8px}.golden-grain-modal__card{width:min(640px,98vw);max-height:calc(100vh - 14px);padding:14px 10px 10px;border-radius:24px}.golden-grain-modal__title{font-size:1.25rem}.golden-grain-modal__scroll{max-height:min(54vh,480px);padding-right:4px}.golden-grain-modal__cta{margin-top:6px;padding-top:8px}}`;

/* ============================================================
   JS Replacement 1: Vars + loadBalance + saveBalance
   ============================================================ */
const OLD_VARS = `(function () {
  var PAYMENT_API_READY = false;
  var GOLDEN_GRAIN_STORAGE_KEY = 'goldenPigCoinBalanceV1';
  var userBalance = 0;`;

const NEW_VARS = `(function () {
  var userBalance = 0;`;

const OLD_LB_SB = `  function hasAuthToken() {
    return !!getAuthToken();
  }

  function loadBalance() {
    try {
      var stored = Number(localStorage.getItem(GOLDEN_GRAIN_STORAGE_KEY));
      if (Number.isFinite(stored) && stored >= 0) userBalance = stored;
    } catch (_e) {}
  }

  function saveBalance() {
    try {
      localStorage.setItem(GOLDEN_GRAIN_STORAGE_KEY, String(userBalance));
    } catch (_e) {}
  }`;

const NEW_LB_SB = `  function hasAuthToken() {
    return !!getAuthToken();
  }

  function readAuthUser() {
    try {
      var raw = localStorage.getItem('fortune_auth_user');
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch (_e) {
      return null;
    }
  }

  function syncAuthUserPoints(points) {
    try {
      var user = readAuthUser() || {};
      user.points = Number(points || 0);
      localStorage.setItem('fortune_auth_user', JSON.stringify(user));
    } catch (_e) {}
  }

  function loadBalance() {
    var user = readAuthUser();
    var points = Number(user && user.points);
    userBalance = Number.isFinite(points) && points >= 0 ? points : 0;
  }

  function saveBalance() {
    syncAuthUserPoints(userBalance);
  }`;

/* ============================================================
   JS Replacement 2: ChargeModal
   ============================================================ */
const OLD_CHARGE_MODAL = `  function ChargeModal() {
    var root = document.getElementById('goldenGrainChargeModalRoot');
    if (!root) return;
    var paymentReady = (typeof PAYMENT_API_READY === 'boolean') ? PAYMENT_API_READY : true;
    var chargeDisabled = !paymentReady;
    var chargeButtonLabel = paymentReady ? '선택한 패키지 결제하고 충전하기' : '결제 API 준비중';
    var chargeButtonDisabled = chargeDisabled ? ' disabled' : '';
    var chargeNotice = chargeDisabled
      ? '<div class="golden-grain-modal__notice">현재 실제 결제 API 연동 전 단계입니다. 충전은 곧 오픈됩니다.</div>'
      : '';
    var packageItems = goldenPackages.map(function (pkg) {
      var baseCoins = Number(pkg.coins || 0);
      var bonusCoins = Number(pkg.bonus || 0);
      var totalCoins = baseCoins + bonusCoins;
      var bestRibbon = pkg.id === 'emperorReserve' ? '<span class="golden-grain-package__best">BEST 혜택</span>' : '';
      var bonusHTML = pkg.bonus > 0 ? '<span class="golden-grain-package__bonus">보너스 +' + pkg.bonus + '코인</span>' : '';
      return [
        '<button type="button" class="golden-grain-package' + (pkg.id === selectedPackageId ? ' is-selected' : '') + '" data-action="selectGoldenPackage" data-package-id="' + pkg.id + '">',
        bestRibbon,
        '  <span class="golden-grain-package__top">',
        '    <span class="golden-grain-package__name">' + pkg.name + '</span>',
        '    <span class="golden-grain-package__coin">+' + baseCoins.toLocaleString('ko-KR') + '코인</span>',
        '  </span>',
        '  <span class="golden-grain-package__meta">',
        '    <span class="golden-grain-package__price">' + formatWon(pkg.price) + '</span>',
        '    <span class="golden-grain-package__total">총 ' + totalCoins.toLocaleString('ko-KR') + '코인</span>',
        '  </span>',
        bonusHTML,
        '</button>'
      ].join('');
    }).join('');

    root.innerHTML = [
      '<div id="goldenGrainChargeModal" class="golden-grain-modal" role="dialog" aria-modal="true" aria-labelledby="goldenChargeTitle">',
      '  <div class="golden-grain-modal__card">',
      '    <button type="button" class="golden-grain-modal__close" data-action="closeGoldenGrainCharge" aria-label="충전 창 닫기">×</button>',
      '    <div id="goldenPiggyBank" class="golden-grain-piggy" aria-hidden="true"><img class="golden-grain-piggy__img" src="/icons/honeypig-96.webp" srcset="/icons/honeypig-96.webp 96w, /icons/honeypig-130.webp 130w, /icons/honeypig.webp 512w" sizes="84px" width="84" height="84" alt=""></div>',
      '    <h3 id="goldenChargeTitle" class="golden-grain-modal__title">황금 돼지 저금통 충전소</h3>',
      '    <p class="golden-grain-modal__subtitle">동전을 채울수록 보너스가 커져요. 높은 단계일수록 더 많이 드려요.</p>',
      '    <div class="golden-grain-packages">' + packageItems + '</div>',
      '    <button type="button" class="golden-grain-modal__charge-btn" data-action="confirmGoldenCharge"' + chargeButtonDisabled + '>' + chargeButtonLabel + '</button>',
      chargeNotice,
      '    <div class="golden-grain-modal__footer-copy">최상위 단계가 가장 큰 보너스를 제공합니다.</div>',
      '  </div>',
      '</div>'
    ].join('');
  }`;

const NEW_CHARGE_MODAL = `  function ChargeModal() {
    var root = document.getElementById('goldenGrainChargeModalRoot');
    if (!root) return;
    var chargeButtonLabel = '🛍️ 공식 포인트 충전소로 이동';
    var chargeNotice = '<div class="golden-grain-modal__notice">✅ 결제 완료 건만 정책에 맞춰 즉시 반영됩니다.</div>';
    var packageItems = goldenPackages.map(function (pkg) {
      var baseCoins = Number(pkg.coins || 0);
      var bonusCoins = Number(pkg.bonus || 0);
      var totalCoins = baseCoins + bonusCoins;
      var bestRibbon = pkg.id === 'emperorReserve' ? '<span class="golden-grain-package__best">🔥 BEST 혜택</span>' : '';
      var bonusHTML = pkg.bonus > 0 ? '<span class="golden-grain-package__bonus">🎁 보너스 +' + pkg.bonus + '코인</span>' : '';
      return [
        '<button type="button" class="golden-grain-package' + (pkg.id === selectedPackageId ? ' is-selected' : '') + '" data-action="selectGoldenPackage" data-package-id="' + pkg.id + '">',
        bestRibbon,
        '  <span class="golden-grain-package__top">',
        '    <span class="golden-grain-package__name">' + pkg.name + '</span>',
        '    <span class="golden-grain-package__coin">🪙 +' + baseCoins.toLocaleString('ko-KR') + '코인</span>',
        '  </span>',
        '  <span class="golden-grain-package__meta">',
        '    <span class="golden-grain-package__price">' + formatWon(pkg.price) + '</span>',
        '    <span class="golden-grain-package__total">총 ' + totalCoins.toLocaleString('ko-KR') + '코인 ✨</span>',
        '  </span>',
        bonusHTML,
        '</button>'
      ].join('');
    }).join('');

    root.innerHTML = [
      '<div id="goldenGrainChargeModal" class="golden-grain-modal" role="dialog" aria-modal="true" aria-labelledby="goldenChargeTitle">',
      '  <div class="golden-grain-modal__card">',
      '    <button type="button" class="golden-grain-modal__close" data-action="closeGoldenGrainCharge" aria-label="충전 창 닫기">×</button>',
      '    <div class="golden-grain-modal__head">',
      '      <div id="goldenPiggyBank" class="golden-grain-piggy" aria-hidden="true"><img class="golden-grain-piggy__img" src="/icons/honeypig-96.webp" srcset="/icons/honeypig-96.webp 96w, /icons/honeypig-130.webp 130w, /icons/honeypig.webp 512w" sizes="84px" width="84" height="84" alt=""></div>',
      '      <h3 id="goldenChargeTitle" class="golden-grain-modal__title">🐷✨ 황금 돼지 저금통 충전소</h3>',
      '      <p class="golden-grain-modal__subtitle">💫 동전을 채울수록 보너스가 커져요. 높은 단계일수록 더 많이 드려요.</p>',
      '    </div>',
      '    <div class="golden-grain-modal__scroll"><div class="golden-grain-packages">' + packageItems + '</div></div>',
      '    <div class="golden-grain-modal__cta">',
      '      <button type="button" class="golden-grain-modal__charge-btn" data-action="confirmGoldenCharge">' + chargeButtonLabel + '</button>',
      chargeNotice,
      '      <div class="golden-grain-modal__footer-copy">👑 최상위 단계가 가장 큰 보너스를 제공합니다.</div>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');
  }`;

/* ============================================================
   JS Replacement 3: applyCharge
   ============================================================ */
const OLD_APPLY_CHARGE = `  async function applyCharge() {
    if (!PAYMENT_API_READY) {
      window.alert('실제 결제 API 연동 전이라 지금은 황금 돼지 코인을 충전할 수 없어요.');
      return;
    }

    var selected = getSelectedPackage();
    var addCoins = (selected.coins || 0) + (selected.bonus || 0);

    if (hasAuthToken()) {
      try {
        var result = await fetchJsonWithAuth('/api/fortune/pig-coin/charge-simulate', {
          method: 'POST',
          body: JSON.stringify({ packageId: selected.id }),
        });

        if (!result.ok) {
          if (result.status === 401) {
            window.alert('로그인 세션이 만료되어 로컬 코인 모드로 전환합니다. 다시 로그인하면 서버 잔액으로 동기화됩니다.');
          } else {
            window.alert((result.payload && result.payload.message) || '서버 충전에 실패했습니다. 잠시 후 다시 시도해 주세요.');
            return;
          }
        } else {
          userBalance = Number(((result.payload || {}).user || {}).points || 0);
          saveBalance();
          updateBadge();
          closeChargeModal();
          window.alert(selected.name + ' 충전 완료! +' + addCoins + '코인이 보관됐어요.');
          // 여기서 '꿀꿀' 사주나 '짤랑' 소리 재생
          return;
        }
      } catch (error) {
        console.error('[golden-pig-coin] charge simulate failed', error);
      }
    }

    window.alert('실제 결제 API 연동 전이라 충전이 비활성화되어 있습니다.');
  }`;

const NEW_APPLY_CHARGE = `  async function applyCharge() {
    if (!hasAuthToken()) {
      window.alert('로그인이 필요합니다. 로그인 후 공식 포인트 충전소에서 결제를 진행해 주세요.');
      window.location.href = '/login?next=%2Fpoints';
      return;
    }

    closeChargeModal();
    window.location.href = '/points';
  }`;

/* ============================================================
   JS Replacement 4: End of IIFE — add globals
   ============================================================ */
const OLD_IIFE_END = `  loadBalance();
  GoldenGrainBadge();
  ChargeModal();
  updateBadge();
  refreshUnlockButtons();
  void syncBalanceFromServer();
})();`;

const NEW_IIFE_END = `  loadBalance();
  GoldenGrainBadge();
  ChargeModal();
  updateBadge();
  refreshUnlockButtons();
  void syncBalanceFromServer();

  window.__cdSetGoldenBalance = function (points) {
    var next = Number(points);
    if (!Number.isFinite(next) || next < 0) return;
    userBalance = next;
    saveBalance();
    updateBadge();
  };
  window.__cdRefreshGoldenBalance = function () {
    void syncBalanceFromServer();
  };

  // Auth 상태 재확인 (인라인 스크립트 보조)
  if (typeof window.__cdUpdateAuthState === 'function') window.__cdUpdateAuthState();
})();`;

/* ============================================================
   Main
   ============================================================ */
let totalPatched = 0;

for (const locale of LOCALES) {
  const filePath = path.join(ROOT, 'public', locale, 'index.html');
  if (!fs.existsSync(filePath)) {
    console.log(`[SKIP] ${locale} — file not found`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  let changes = 0;

  // 1. CSS block
  if (content.includes(OLD_CSS)) {
    content = content.replace(OLD_CSS, NEW_CSS);
    changes++;
    console.log(`[${locale}] ✅ CSS replaced`);
  } else {
    console.log(`[${locale}] ⚠️  CSS not matched — check file`);
  }

  // 2. Vars
  if (content.includes(OLD_VARS)) {
    content = content.replace(OLD_VARS, NEW_VARS);
    changes++;
    console.log(`[${locale}] ✅ Vars replaced`);
  } else {
    console.log(`[${locale}] ⚠️  Vars not matched`);
  }

  // 3. loadBalance / saveBalance
  if (content.includes(OLD_LB_SB)) {
    content = content.replace(OLD_LB_SB, NEW_LB_SB);
    changes++;
    console.log(`[${locale}] ✅ loadBalance/saveBalance replaced`);
  } else {
    console.log(`[${locale}] ⚠️  loadBalance/saveBalance not matched`);
  }

  // 4. ChargeModal
  if (content.includes(OLD_CHARGE_MODAL)) {
    content = content.replace(OLD_CHARGE_MODAL, NEW_CHARGE_MODAL);
    changes++;
    console.log(`[${locale}] ✅ ChargeModal replaced`);
  } else {
    console.log(`[${locale}] ⚠️  ChargeModal not matched`);
  }

  // 5. applyCharge
  if (content.includes(OLD_APPLY_CHARGE)) {
    content = content.replace(OLD_APPLY_CHARGE, NEW_APPLY_CHARGE);
    changes++;
    console.log(`[${locale}] ✅ applyCharge replaced`);
  } else {
    console.log(`[${locale}] ⚠️  applyCharge not matched`);
  }

  // 6. IIFE end
  if (content.includes(OLD_IIFE_END)) {
    content = content.replace(OLD_IIFE_END, NEW_IIFE_END);
    changes++;
    console.log(`[${locale}] ✅ IIFE end updated`);
  } else {
    console.log(`[${locale}] ⚠️  IIFE end not matched`);
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[${locale}] 💾 Written (${changes} changes)\n`);
    totalPatched++;
  } else {
    console.log(`[${locale}] ⚡ No changes (already up to date)\n`);
  }
}

console.log(`\nDone — ${totalPatched}/${LOCALES.length} files patched.`);

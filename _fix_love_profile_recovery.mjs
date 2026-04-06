import { readFileSync, writeFileSync } from 'fs';

const DP_RECOVER_CODE = `    // ★ 프로필 없으면 DOM 및 localStorage 운명 카드에서 복구 시도
    if (!hasData) {
      try {
        var _oLsDateEl = document.getElementById('birthDate');
        if (_oLsDateEl && _oLsDateEl.value) {
          var _oLsParts = _oLsDateEl.value.split('-');
          var _oLsY = Number(_oLsParts[0]), _oLsM = Number(_oLsParts[1]), _oLsD = Number(_oLsParts[2]);
          if (_oLsY && _oLsM && _oLsD) {
            var _oLsNameEl = document.getElementById('nameInput');
            var _oLsIsFemale = document.querySelector('#btnF.on') !== null;
            var _oLsHourEl = document.getElementById('birthHour');
            var _oLsMinEl = document.getElementById('birthMinute');
            var _oLsCountrySel = document.getElementById('birthCountry');
            var _oLsLocData = { label: '대한민국 (서울)', lng: 127.0, lat: 37.6, tz: 'Asia/Seoul', tzOffset: 9, baseTzOffset: 9 };
            if (_oLsCountrySel && _oLsCountrySel.selectedIndex >= 0) {
              var _oLsOpt = _oLsCountrySel.options[_oLsCountrySel.selectedIndex];
              if (_oLsOpt) { _oLsLocData = { label: (_oLsOpt.textContent || _oLsOpt.text || '').trim(), lng: parseFloat(_oLsOpt.getAttribute('data-long') || '127.0'), lat: parseFloat(_oLsOpt.getAttribute('data-lat') || '37.6'), tz: _oLsOpt.value || 'Asia/Seoul', tzOffset: parseFloat(_oLsOpt.getAttribute('data-tz') || '9'), baseTzOffset: parseFloat(_oLsOpt.getAttribute('data-base-tz') || '9') }; }
            }
            window.__cdActiveBirthProfile = { name: (_oLsNameEl && _oLsNameEl.value.trim()) || '사용자', gender: _oLsIsFemale ? 'F' : 'M', birth: { year: _oLsY, month: _oLsM, day: _oLsD, hour: _oLsHourEl ? Number(_oLsHourEl.value) : 12, minute: _oLsMinEl ? Number(_oLsMinEl.value) : 0 }, location: _oLsLocData };
            hasData = true;
          }
        }
      } catch (_oLsDomE) {}
    }
    if (!hasData) {
      try {
        var _oLsDpNs = 'FORTUNE_APP_USER_PROFILES';
        var _oLsDpList = JSON.parse(localStorage.getItem(_oLsDpNs + '.list') || '[]');
        var _oLsDpCurrId = localStorage.getItem(_oLsDpNs + '.current');
        var _oLsDpMatch = (_oLsDpCurrId && _oLsDpList.find(function(p){return p.id===_oLsDpCurrId;})) || (_oLsDpList.length && _oLsDpList[0]) || null;
        if (_oLsDpMatch && _oLsDpMatch.birth && _oLsDpMatch.birth.year) {
          window.__cdActiveBirthProfile = _oLsDpMatch;
          hasData = true;
        }
      } catch (_oLsDpE) {}
    }
    if (!hasData) {
      var _oLsFormEl = document.getElementById('birthDate') || document.getElementById('run-btn');
      if (_oLsFormEl) { try { _oLsFormEl.scrollIntoView({behavior:'smooth',block:'center'}); } catch(_){} }
      alert('💕 연애 비책을 생성하려면 생년월일 · 출생 시간을 입력하고 "사주 분석 시작"을 눌러주세요.');
      return;
    }`;

const GL_RECOVER_CODE = `  window.generateLoveSecret = function () {
    if (_generating) return;
    // 프로필 복구: __cdActiveBirthProfile 없으면 localStorage DP에서 시도
    if (!(window.__cdActiveBirthProfile && window.__cdActiveBirthProfile.birth && window.__cdActiveBirthProfile.birth.year)) {
      try {
        var _glsDpNs = 'FORTUNE_APP_USER_PROFILES';
        var _glsDpList = JSON.parse(localStorage.getItem(_glsDpNs + '.list') || '[]');
        var _glsDpCurrId = localStorage.getItem(_glsDpNs + '.current');
        var _glsDpMatch = (_glsDpCurrId && _glsDpList.find(function(p){return p.id===_glsDpCurrId;})) || (_glsDpList.length && _glsDpList[0]) || null;
        if (_glsDpMatch && _glsDpMatch.birth && _glsDpMatch.birth.year) { window.__cdActiveBirthProfile = _glsDpMatch; }
      } catch (_glsDpE) {}
    }
    var hasData = !!(window.__cdActiveBirthProfile && window.__cdActiveBirthProfile.birth && window.__cdActiveBirthProfile.birth.year);
    if (!hasData) { alert('사주 계산을 먼저 완료해 주세요.'); return; }`;

const files = [
  'public/js/love-secret-v2.js'
];

let errors = [];

for (const rel of files) {
  try {
    let c = readFileSync(rel, 'utf8');
    let modified = false;

    // Fix openLoveSecretModal - find the if (!hasData) { alert block and replace
    // Pattern: var hasData = !!(  ...  ); \n    if (!hasData) {\n      alert(...\n      return;\n    }
    const alertMarker = "alert('💕 연애 비책을 생성하려면 먼저 사주 계산을 완료해 주세요.";
    const alertIdx = c.indexOf(alertMarker);
    if (alertIdx !== -1) {
      // Find the start of var hasData before alert
      const hasDataIdx = c.lastIndexOf('var hasData = !!(', alertIdx);
      if (hasDataIdx !== -1) {
        // Find the end: the closing '    }' after return;
        const returnStr = 'return;\n    }';
        const retIdx = c.indexOf(returnStr, alertIdx);
        if (retIdx !== -1) {
          const replaceEnd = retIdx + returnStr.length;
          const oldBlock = c.slice(hasDataIdx, replaceEnd);
          // New block - keep var hasData line but add recovery after it
          const newBlock = `var hasData = !!(window.__cdActiveBirthProfile && window.__cdActiveBirthProfile.birth && window.__cdActiveBirthProfile.birth.year);
${DP_RECOVER_CODE}`;
          c = c.slice(0, hasDataIdx) + newBlock + c.slice(replaceEnd);
          modified = true;
          console.log(`[${rel}] openLoveSecretModal fixed`);
        } else {
          errors.push(`[${rel}] return; not found after alert`);
        }
      } else {
        errors.push(`[${rel}] hasData not found before alert`);
      }
    } else {
      errors.push(`[${rel}] alert marker not found`);
    }

    // Fix generateLoveSecret
    const genMarker = "window.generateLoveSecret = function () {";
    const genIdx = c.indexOf(genMarker);
    if (genIdx !== -1) {
      const hasDataGenIdx = c.indexOf('var hasData = !!(', genIdx);
      if (hasDataGenIdx !== -1 && hasDataGenIdx < genIdx + 500) {
        const retGen = '{ alert(\'사주 계산을 먼저 완료해 주세요.\'); return; }';
        const retGenIdx = c.indexOf(retGen, hasDataGenIdx);
        if (retGenIdx !== -1) {
          const replaceEnd2 = retGenIdx + retGen.length;
          c = c.slice(0, genIdx) + GL_RECOVER_CODE + c.slice(replaceEnd2);
          modified = true;
          console.log(`[${rel}] generateLoveSecret fixed`);
        } else {
          errors.push(`[${rel}] generateLoveSecret return not found`);
        }
      } else {
        errors.push(`[${rel}] generateLoveSecret hasData not found`);
      }
    } else {
      errors.push(`[${rel}] generateLoveSecret not found`);
    }

    if (modified) {
      writeFileSync(rel, c, 'utf8');
      console.log(`[${rel}] SAVED`);
    }
  } catch (e) {
    errors.push(`[${rel}] ERROR: ${e.message}`);
  }
}

if (errors.length) {
  console.error('ERRORS:', errors);
  process.exit(1);
} else {
  console.log('ALL DONE');
}

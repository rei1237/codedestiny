/**
 * Saju Totem Generator (Entry)
 * UI 상태 전환과 API orchestration만 담당합니다.
 */
(function () {
  'use strict';

  var DEPENDENCY_SCRIPTS = [
    '/js/services/saju-totem-service.js?v=20260326',
    '/js/ui/saju-totem-ui.js?v=20260326'
  ];

  var _depsPromise = null;

  function normalizeScriptSrc(src) {
    var raw = String(src || '').trim().replace(/^\.\//, '');
    if (!raw) return '';
    if (/^(?:[a-z]+:)?\/\//i.test(raw) || raw.indexOf('data:') === 0 || raw.indexOf('blob:') === 0) return raw;
    if (raw.charAt(0) === '/') return raw;
    return '/' + raw;
  }

  function loadScriptOnce(src) {
    if (typeof window.__cdLoadScriptOnce === 'function') {
      return window.__cdLoadScriptOnce(src);
    }

    return new Promise(function (resolve, reject) {
      var norm = normalizeScriptSrc(src);
      if (!norm) {
        reject(new Error('missing src'));
        return;
      }

      var all = document.querySelectorAll('script[src]');
      var fileName = norm.split('?')[0].split('/').pop();
      var existing = null;
      var i;

      for (i = 0; i < all.length; i += 1) {
        var cur = all[i].getAttribute('src') || '';
        var curBase = cur.split('?')[0];
        if (cur === norm || curBase === norm.split('?')[0] || (fileName && curBase.indexOf('/' + fileName) !== -1)) {
          existing = all[i];
          break;
        }
      }

      if (existing) {
        if (existing.dataset.loaded === '1' || existing.readyState === 'complete' || existing.readyState === 'loaded') {
          resolve();
          return;
        }
        existing.addEventListener('load', function () {
          resolve();
        }, { once: true });
        existing.addEventListener('error', function () {
          reject(new Error('load failed: ' + src));
        }, { once: true });
        return;
      }

      var s = document.createElement('script');
      s.src = norm;
      s.defer = true;
      s.async = true;
      s.dataset.loading = '1';
      s.onload = function () {
        s.dataset.loading = '0';
        s.dataset.loaded = '1';
        resolve();
      };
      s.onerror = function () {
        reject(new Error('load failed: ' + src));
      };
      document.head.appendChild(s);
    });
  }

  function ensureDependencies() {
    if (window.SajuTotemService && window.SajuTotemUI) return Promise.resolve();
    if (_depsPromise) return _depsPromise;

    _depsPromise = DEPENDENCY_SCRIPTS.reduce(function (chain, src) {
      return chain.then(function () {
        return loadScriptOnce(src);
      });
    }, Promise.resolve()).then(function () {
      if (!window.SajuTotemService || !window.SajuTotemUI) {
        throw new Error('saju-totem-deps-not-ready');
      }
    });

    return _depsPromise;
  }

  function hideModal() {
    var overlay = document.getElementById('sajuTotemOverlay');
    if (!overlay) return;
    overlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function getAdaptiveQualityFactor() {
    var factor = 1;
    var nav = navigator || {};
    var conn = nav.connection || nav.mozConnection || nav.webkitConnection || {};
    var saveData = !!conn.saveData;
    var effectiveType = String(conn.effectiveType || '').toLowerCase();
    var downlink = Number(conn.downlink || 0);
    var deviceMemory = Number(nav.deviceMemory || 0);
    var cores = Number(nav.hardwareConcurrency || 0);

    if (saveData) factor -= 0.25;
    if (effectiveType === '2g' || effectiveType === 'slow-2g') factor -= 0.25;
    else if (effectiveType === '3g') factor -= 0.12;
    if (downlink > 0 && downlink < 1.2) factor -= 0.12;

    if (deviceMemory > 0 && deviceMemory <= 2) factor -= 0.2;
    else if (deviceMemory > 0 && deviceMemory <= 4) factor -= 0.08;

    if (cores > 0 && cores <= 4) factor -= 0.1;

    return clamp(factor, 0.62, 1);
  }

  function buildRenderSpec() {
    var vw = window.innerWidth || 640;
    var cssSize = Math.round(clamp(vw * 0.92, 340, 720));
    var quality = getAdaptiveQualityFactor();
    var outputSize = Math.round(clamp(cssSize * (1.45 * quality), 512, 1024) / 32) * 32;
    return {
      canvasCssSize: cssSize,
      outputSize: outputSize,
      quality: quality
    };
  }

  function rasterizeGuardianToPng(guardian, outputSize) {
    return new Promise(function (resolve) {
      if (!guardian || typeof guardian !== 'object') {
        resolve(guardian);
        return;
      }

      if (guardian.image_data_uri) {
        resolve(guardian);
        return;
      }

      var svgMarkup = guardian.svg_markup ? String(guardian.svg_markup) : '';
      var svgDataUri = guardian.svg_data_uri ? String(guardian.svg_data_uri) : '';
      if (!svgMarkup && !svgDataUri) {
        resolve(guardian);
        return;
      }

      var size = Math.max(256, Math.min(1024, Number(outputSize) || 640));
      var canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      var ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(guardian);
        return;
      }

      var img = new Image();
      var objectUrl = '';
      img.onload = function () {
        try {
          ctx.clearRect(0, 0, size, size);
          var iw = img.naturalWidth || size;
          var ih = img.naturalHeight || size;
          var scale = Math.max(size / iw, size / ih);
          var dw = iw * scale;
          var dh = ih * scale;
          var dx = (size - dw) / 2;
          var dy = (size - dh) / 2;
          ctx.drawImage(img, dx, dy, dw, dh);
          guardian.image_data_uri = canvas.toDataURL('image/png');
          guardian.svg_data_uri = '';
        } catch (e) {}
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        resolve(guardian);
      };
      img.onerror = function () {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        resolve(guardian);
      };

      if (svgDataUri) {
        img.src = svgDataUri;
        return;
      }

      try {
        var blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
        objectUrl = URL.createObjectURL(blob);
        img.src = objectUrl;
      } catch (e) {
        resolve(guardian);
      }
    });
  }

  function renderStateNoSaju() {
    var body = document.getElementById('sajuTotemBody');
    if (!body) return;

    body.innerHTML = '' +
      '<div class="stg-no-saju">' +
      '  <div class="stg-no-saju__icon">🔮</div>' +
      '  <p class="stg-no-saju__title">생년월일 정보가 필요해요</p>' +
      '  <p class="stg-no-saju__desc">프로필 카드에 생년월일시를 저장하거나 입력창에 정보를 넣어주세요.<br>분석 버튼을 누르지 않아도 사주 동물 아트를 바로 생성할 수 있습니다.</p>' +
      '  <button class="stg-btn stg-btn--primary" id="sajuTotemGoInputBtn" type="button">생년월일 입력하러 가기 ✨</button>' +
      '</div>';

    var goInputBtn = document.getElementById('sajuTotemGoInputBtn');
    if (goInputBtn) {
      goInputBtn.addEventListener('click', function () {
        hideModal();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  function renderStateFailure(contextSource) {
    var body = document.getElementById('sajuTotemBody');
    if (!body) return;

    var sourceLabel = contextSource === 'profile' ? '프로필 기반 에너지 리포트' : '생년월일 에너지 리포트';
    body.innerHTML = '' +
      '<div class="stg-no-saju">' +
      '  <div class="stg-no-saju__icon">⏳</div>' +
      '  <p class="stg-no-saju__title">현재 API 이용자가 많아 이미지 생성 결과를 잠시 숨김 처리 중입니다.</p>' +
      '  <p class="stg-no-saju__desc">' + sourceLabel + '를 바탕으로 재시도하면 더 선명한 결과를 받을 수 있어요.</p>' +
      '  <button class="stg-btn stg-btn--primary" id="sajuTotemRetryBtn" type="button">다시 시도하기 ✨</button>' +
      '</div>';

    var retryBtn = document.getElementById('sajuTotemRetryBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', function () {
        renderStateB(contextSource || 'analysis');
      });
    }
  }

  function renderStateC(totemData, guardian, theme, contextSource, renderSpec) {
    var service = window.SajuTotemService;
    var ui = window.SajuTotemUI;
    if (!service || !ui) {
      renderStateFailure(contextSource);
      return;
    }

    var body = document.getElementById('sajuTotemBody');
    if (!body) return;

    var a = totemData.primary;
    var el = totemData.element;
    var elIcons = { wood: '🌿', fire: '🔥', earth: '🌏', metal: '✨', water: '💧' };
    var desc = service.buildDescription(totemData);
    var sourceLabel = contextSource === 'profile' ? '프로필 기반 에너지 리포트' : '생년월일 에너지 리포트';
    var imgUrl = guardian && guardian.image_data_uri ? guardian.image_data_uri : '';
    var hasImage = !!imgUrl;
    var canvasCssSize = renderSpec && renderSpec.canvasCssSize ? Number(renderSpec.canvasCssSize) : 560;

    var cleanAnimalName = service.normalizeAnimalLabel(a.name || '수호 동물') || '수호 동물';
    var guardianTitle = guardian && guardian.title ? guardian.title : (cleanAnimalName + ' 수호 캐릭터');
    var face = guardian && guardian.facial_expression ? guardian.facial_expression : '';
    var bg = guardian && guardian.background_motif ? guardian.background_motif : '';
    var summary = guardian && guardian.summary ? guardian.summary : '';
    var apiWarning = guardian && guardian.warning_message ? guardian.warning_message : '';
    var cardKeyword = a.keyword || '사주 에너지 기반 수호 캐릭터';
    var summaryText = summary || '사주 분석을 통해 왜 이 동물이 선택되었는지에 대한 설명을 생성했습니다.';
    var imagePanel = hasImage
      ? ('<canvas class="stg-card__canvas" id="sajuTotemCanvas" style="width:min(92vw,' + canvasCssSize + 'px);height:min(92vw,' + canvasCssSize + 'px);" aria-label="사주 동물 아트 결과 캔버스"></canvas>')
      : '<div class="stg-no-saju" style="min-height:240px;margin:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:20px;"><p class="stg-no-saju__title" style="margin:0;font-size:15px;line-height:1.5;">이미지 렌더링에 실패했어요.<br>잠시 후 다시 시도해주세요.</p></div>';
    var actionsHtml = hasImage
      ? ('<button class="stg-btn stg-btn--save" id="sajuTotemSaveBtn" type="button"><span class="stg-btn__icon">⬇</span> 이미지 저장하기</button>' +
        '<button class="stg-btn stg-btn--share" id="sajuTotemShareBtn" type="button"><span class="stg-btn__icon">💬</span> 내 모습 공유하기</button>' +
        '<button class="stg-btn stg-btn--regen" id="sajuTotemRegenBtn" type="button"><span class="stg-btn__icon">🔄</span> 다시 소환하기</button>')
      : '<button class="stg-btn stg-btn--regen" id="sajuTotemRegenBtn" type="button"><span class="stg-btn__icon">🔄</span> 다시 소환하기</button>';

    body.innerHTML = '' +
      '<div class="stg-result" id="sajuTotemResult" style="--stg-glow:' + theme.glow + ';--stg-bg:' + theme.bg + ';--stg-text:' + theme.text + '">' +
      '  <div class="stg-card">' +
      '    <div class="stg-card__glow"></div>' +
      '    <div class="stg-card__badge">' + (elIcons[el] || '✨') + ' SAJU PORTRAIT</div>' +
      '    <div class="stg-card__img-wrap">' +
      '      ' + imagePanel +
      '      <div class="stg-card__img-overlay"></div>' +
      '    </div>' +
      '  </div>' +
      '  <div class="stg-desc-card">' +
      (apiWarning ? '<div class="stg-api-warning-row"><div class="stg-api-warning">⚠ ' + apiWarning + '</div></div>' : '') +
      '    <div class="stg-desc-card__label">✦ ' + sourceLabel + '</div>' +
      '    <div class="stg-desc-card__title">' + guardianTitle + '</div>' +
      '    <div class="stg-desc-card__text" style="margin-bottom:8px;">' + cardKeyword + '</div>' +
      '    <div class="stg-desc-card__label">왜 이 동물인가?</div>' +
      '    <div class="stg-desc-card__text" style="margin-bottom:8px;">' + summaryText + '</div>' +
      '    <div class="stg-desc-card__label">표정</div>' +
      '    <div class="stg-desc-card__text" style="margin-bottom:8px;">' + (face || '사주 성향에 맞춘 부드러운 표정') + '</div>' +
      '    <div class="stg-desc-card__label">배경 모티프</div>' +
      '    <div class="stg-desc-card__text" style="margin-bottom:8px;">' + (bg || '오행 중심 파스텔 배경') + '</div>' +
      '    <div class="stg-desc-card__label">동물 해석</div>' +
      '    <div class="stg-desc-card__text">' + desc + '</div>' +
      '  </div>' +
      '  <div class="stg-actions">' +
      '    ' + actionsHtml +
      '  </div>' +
      '</div>';

    if (hasImage) {
      ui.drawGuardianOnCanvas(imgUrl, el, function () {
        renderStateFailure(contextSource);
      });
    }

    var saveBtn = document.getElementById('sajuTotemSaveBtn');
    var shareBtn = document.getElementById('sajuTotemShareBtn');
    var regenBtn = document.getElementById('sajuTotemRegenBtn');

    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        ui.downloadImage(imgUrl, 'my-guardian-' + (a.nameEn || 'totem').replace(/\s+/g, '-') + '.png');
      });
    }
    if (shareBtn) {
      shareBtn.addEventListener('click', function () {
        var safeShareImage = /^https?:\/\//.test(imgUrl) ? imgUrl : 'https://code-destiny.com/icons/honeypig.webp';
        ui.shareKakao(totemData, safeShareImage);
      });
    }
    if (regenBtn) {
      regenBtn.addEventListener('click', function () {
        renderStateB(contextSource || 'analysis');
      });
    }
  }

  function renderStateB(contextSource) {
    var service = window.SajuTotemService;
    if (!service) {
      renderStateFailure(contextSource);
      return;
    }

    var body = document.getElementById('sajuTotemBody');
    if (!body) return;

    var totemData = service.selectTotem();
    var el = totemData.element;
    var theme = service.ELEMENT_BG[el] || service.ELEMENT_BG.wood;
    var renderSpec = buildRenderSpec();

    body.innerHTML = '' +
      '<div class="stg-loading" id="sajuTotemLoading">' +
      '  <div class="stg-loading__orbs">' +
      '    <span class="stg-orb stg-orb--1"></span>' +
      '    <span class="stg-orb stg-orb--2"></span>' +
      '    <span class="stg-orb stg-orb--3"></span>' +
      '  </div>' +
      '  <div class="stg-loading__paintbrush">' +
      '    <div class="stg-pb-char">🎨</div>' +
      '    <div class="stg-pb-dust"><span>✨</span><span>⭐</span><span>💫</span><span>🌟</span><span>✦</span></div>' +
      '  </div>' +
      '  <p class="stg-loading__title">사주 기운을 읽어 동물 캐릭터를 스케치 중이에요</p>' +
      '  <p class="stg-loading__subtitle">파스텔 만화풍으로 당신의 동물 아트를 채색하고 있어요...</p>' +
      '  <div class="stg-loading__bar"><div class="stg-loading__bar-fill" id="sajuTotemLoadBar"></div></div>' +
      '</div>';

    var bar = document.getElementById('sajuTotemLoadBar');
    var progress = 0;
    var barTimer = setInterval(function () {
      progress = Math.min(progress + Math.random() * 12, 88);
      if (bar) bar.style.width = progress + '%';
    }, 600);

    var requestProfile = service.getProfileFromManager() || service.buildProfileFromInputs();
    if (!requestProfile || !requestProfile.birth) {
      clearInterval(barTimer);
      renderStateNoSaju();
      return;
    }

    var done = false;
    function finishWithSuccess(guardian) {
      if (done) return;
      done = true;
      clearInterval(barTimer);
      if (bar) bar.style.width = '100%';
      setTimeout(function () {
        renderStateC(totemData, guardian, theme, contextSource, renderSpec);
      }, 240);
    }

    function finishWithFailure() {
      if (done) return;
      done = true;
      clearInterval(barTimer);
      renderStateFailure(contextSource);
    }

    var sajuAnalysis = service.captureSajuAnalysisSnapshot();
    var avatarPromptSeed = service.buildAvatarPromptSeed ? service.buildAvatarPromptSeed(requestProfile) : '';
    fetch('/api/guardian-avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile: requestProfile,
        sajuAnalysis: sajuAnalysis,
        avatarPrompt: avatarPromptSeed,
        outputSize: renderSpec.outputSize,
        totemAnimal: {
          name: totemData.primary && totemData.primary.name,
          nameEn: totemData.primary && totemData.primary.nameEn,
          keyword: totemData.primary && totemData.primary.keyword,
          traits: totemData.primary && totemData.primary.traits,
          dayZhi: totemData.dayZhi,
          element: totemData.element
        },
        renderMode: 'saju-animal',
        styleIntensity: 'soft'
      })
    })
      .then(function (resp) {
        return resp
          .json()
          .catch(function () {
            return null;
          })
          .then(function (data) {
            if (!resp.ok || !data || !data.ok || !data.guardian) {
              throw new Error((data && data.message) || ('saju-animal-api-failed-' + resp.status));
            }
            return data.guardian;
          });
      })
      .then(function (guardian) {
        rasterizeGuardianToPng(guardian, renderSpec.outputSize)
          .then(function (rasterized) {
            finishWithSuccess(rasterized || guardian);
          })
          .catch(function () {
            finishWithSuccess(guardian);
          });
      })
      .catch(function () {
        finishWithFailure();
      });
  }

  function showModal() {
    var overlay = document.getElementById('sajuTotemOverlay');
    if (!overlay) return;

    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    ensureDependencies()
      .then(function () {
        var contextState = window.SajuTotemService.ensureSajuContext();
        if (contextState && contextState.ready) {
          renderStateB(contextState.source);
        } else {
          renderStateNoSaju();
        }
      })
      .catch(function () {
        renderStateFailure('analysis');
      });
  }

  function init() {
    var closeBtn = document.getElementById('sajuTotemCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', hideModal);
    }

    var overlay = document.getElementById('sajuTotemOverlay');
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) hideModal();
      });
    }
  }

  window.openSajuTotemModal = showModal;
  window.closeSajuTotemModal = hideModal;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
(function () {
  'use strict';

  if (typeof window === 'undefined') return;
  if (typeof window.__cdRunPremiumChapterPipeline === 'function') return;

  var FALLBACK_TEXT = '일시적인 응답 지연으로 해석을 불러오지 못했습니다. 부분 재생성 버튼을 이용해주세요.';

  function wait(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, Math.max(0, Number(ms || 0)));
    });
  }

  function toErrorMessage(error) {
    if (!error) return '';
    if (typeof error === 'string') return error;
    try {
      return String(error.message || error);
    } catch (_) {
      return 'unknown-error';
    }
  }

  window.__cdPremiumChapterFallbackText = FALLBACK_TEXT;

  window.__cdAttachPartialRegenerateControl = function attachPartialRegenerateControl(options) {
    var opts = options && typeof options === 'object' ? options : {};
    var key = String(opts.key || '').trim();
    var mountSelector = String(opts.mountSelector || '').trim();
    var getActiveChapter = typeof opts.getActiveChapter === 'function' ? opts.getActiveChapter : null;
    var onRegenerate = typeof opts.onRegenerate === 'function' ? opts.onRegenerate : null;
    if (!key || !mountSelector || !getActiveChapter || !onRegenerate) return null;

    var mountEl = document.querySelector(mountSelector);
    if (!mountEl) return null;

    var rootId = 'cd-partial-regenerate-' + key;
    var root = document.getElementById(rootId);
    if (!root) {
      root = document.createElement('div');
      root.id = rootId;
      root.className = 'cd-partial-regenerate';
      root.style.margin = '12px 0 4px';
      root.style.display = 'flex';
      root.style.alignItems = 'center';
      root.style.gap = '8px';

      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'auth-btn';
      button.textContent = String(opts.buttonLabel || '부분 재생성');
      button.style.padding = '8px 12px';
      button.style.fontSize = '12px';
      button.style.borderRadius = '8px';
      button.style.border = '1px solid rgba(255,255,255,.25)';
      button.style.background = 'rgba(255,255,255,.08)';
      button.style.color = '#fff';
      button.style.cursor = 'pointer';

      var status = document.createElement('span');
      status.className = 'cd-partial-regenerate__status';
      status.style.fontSize = '12px';
      status.style.opacity = '.85';
      status.style.color = '#d1d5db';
      status.textContent = '';

      root.appendChild(button);
      root.appendChild(status);
      mountEl.appendChild(root);

      var running = false;
      button.addEventListener('click', function () {
        if (running) return;
        var chapter = Number(getActiveChapter());
        if (!Number.isFinite(chapter) || chapter < 1) {
          status.textContent = '현재 챕터를 확인할 수 없습니다.';
          return;
        }
        running = true;
        button.disabled = true;
        status.textContent = 'Chapter ' + chapter + ' 재생성 중...';
        Promise.resolve(onRegenerate(chapter))
          .then(function () {
            status.textContent = 'Chapter ' + chapter + ' 재생성 완료';
          })
          .catch(function (error) {
            var msg = '';
            try { msg = String(error && error.message ? error.message : error || '실패'); } catch (_) { msg = '실패'; }
            status.textContent = '재생성 실패: ' + msg;
          })
          .finally(function () {
            running = false;
            button.disabled = false;
          });
      });
    }

    return root;
  };

  window.__cdRunPremiumChapterPipeline = async function runPremiumChapterPipeline(options) {
    var opts = options && typeof options === 'object' ? options : {};
    var total = Math.max(0, Number(opts.totalChapters || 0));
    var maxAttempts = Math.max(1, Number(opts.maxAttempts || 3));
    var interChapterDelayMs = Math.max(0, Number(opts.interChapterDelayMs == null ? 3000 : opts.interChapterDelayMs));
    var retryDelayMs = Math.max(0, Number(opts.retryDelayMs == null ? 3000 : opts.retryDelayMs));
    var fetchChapter = typeof opts.fetchChapter === 'function' ? opts.fetchChapter : null;
    var isSuccess = typeof opts.isSuccess === 'function' ? opts.isSuccess : function (data) { return !!(data && data.ok); };
    var shouldStop = typeof opts.shouldStop === 'function' ? opts.shouldStop : function () { return false; };
    var shouldFailFast = typeof opts.shouldFailFast === 'function' ? opts.shouldFailFast : function () { return false; };
    var onSuccess = typeof opts.onSuccess === 'function' ? opts.onSuccess : function () {};
    var onFallback = typeof opts.onFallback === 'function' ? opts.onFallback : function () {};
    var onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : function () {};

    if (!fetchChapter || total <= 0) {
      return { aborted: false, failCount: 0, completedCount: 0 };
    }

    var failCount = 0;
    var completedCount = 0;

    for (var idx = 0; idx < total; idx += 1) {
      if (shouldStop()) {
        return { aborted: true, failCount: failCount, completedCount: completedCount };
      }

      var lastData = null;
      var lastError = null;
      var success = false;

      for (var attempt = 1; attempt <= maxAttempts; attempt += 1) {
        if (shouldStop()) {
          return { aborted: true, failCount: failCount, completedCount: completedCount };
        }

        try {
          var data = await fetchChapter(idx, attempt);
          lastData = data;
          if (shouldFailFast(data, null, idx, attempt)) {
            throw Object.assign(new Error(String((data && data.message) || 'fatal-response')), {
              __cdFatal: true,
              __cdData: data,
            });
          }
          if (isSuccess(data, idx, attempt)) {
            await onSuccess(idx, data, attempt);
            success = true;
            break;
          }
        } catch (error) {
          lastError = error;
          if (shouldFailFast(lastData, error, idx, attempt) || (error && error.__cdFatal)) {
            throw error;
          }
        }

        if (attempt < maxAttempts) {
          // 429(rate limit) 신호가 보이면 고정 간격 대신 지수 백오프로 CF rate-limit 규칙(10초당 100회)을 피한다.
          var delayMs = retryDelayMs;
          try {
            var statusCode = Number((lastError && lastError.status) || (lastData && lastData.status) || 0);
            var messageText = String((lastError && lastError.message) || (lastData && lastData.message) || '');
            if (statusCode === 429 || /\b429\b|too many requests/i.test(messageText)) {
              delayMs = Math.min(30000, Math.max(retryDelayMs, 5000) * Math.pow(2, attempt - 1));
            }
          } catch (_) {}
          await wait(delayMs);
        }
      }

      if (!success) {
        failCount += 1;
        var reason = '';
        if (lastData && lastData.message) reason = String(lastData.message);
        if (!reason && lastError) reason = toErrorMessage(lastError);
        if (!reason) reason = 'chapter-generation-failed';

        var fallbackPayload = {
          ok: false,
          usedFallback: true,
          message: reason,
          text: FALLBACK_TEXT,
          chapterJson: null,
          chapterMeta: null,
        };

        await onFallback(idx, fallbackPayload, lastData, lastError);
      }

      completedCount += 1;
      await onProgress(idx, success ? 'success' : 'fallback');

      if (idx < total - 1) {
        await wait(interChapterDelayMs);
      }
    }

    return { aborted: false, failCount: failCount, completedCount: completedCount };
  };
})();

// Service layer for saju engine global entry points.
// This keeps runtime code decoupled from `window.*` implementations.

(function () {
  if (typeof window === 'undefined') return;

  window.sajuService = window.sajuService || {};

  window.sajuService.computeProfileForModal = function (profile) {
    if (typeof window.computeProfileForModal !== 'function') return undefined;
    return window.computeProfileForModal(profile);
  };

  window.sajuService.updateLunarPreview = function (dateId, radioName, previewId) {
    if (typeof window.updateLunarPreview !== 'function') return undefined;
    return window.updateLunarPreview(dateId, radioName, previewId);
  };
})();


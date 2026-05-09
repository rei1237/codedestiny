/**
 * API base URL init — CODE_DESTINY_API_BASE_URL / __CF_PAGES_API_BASE_URL.
 * Must run before any script that uses these globals.
 */
(function () {
  try {
    var explicit = window.CODE_DESTINY_API_BASE_URL || window.__CF_PAGES_API_BASE_URL || "";
    if (explicit) {
      var normalized = String(explicit).replace(/\/+$/, "");
      window.CODE_DESTINY_API_BASE_URL = normalized;
      window.__CF_PAGES_API_BASE_URL = normalized;
      window.__CD_API_BASE_URL = normalized;
      return;
    }

    var meta = document.querySelector('meta[name="code-destiny-api-base"]');
    if (meta && meta.content) {
      var fromMeta = String(meta.content).replace(/\/+$/, "");
      window.CODE_DESTINY_API_BASE_URL = fromMeta;
      window.__CF_PAGES_API_BASE_URL = fromMeta;
      window.__CD_API_BASE_URL = fromMeta;
      return;
    }

    // Default to current origin so frontend always uses same-origin /api.
    window.CODE_DESTINY_API_BASE_URL = location.origin;
    window.__CF_PAGES_API_BASE_URL = location.origin;
    window.__CD_API_BASE_URL = location.origin;
  } catch (e) {}
})();

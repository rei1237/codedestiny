/**
 * API base URL init — CODE_DESTINY_API_BASE_URL / __CF_PAGES_API_BASE_URL.
 * Must run before any script that uses these globals.
 */
(function () {
  try {
    function isWorkersDevBase(rawBase) {
      var value = String(rawBase || "").trim();
      if (!value) return false;
      try {
        var host = new URL(value).hostname.toLowerCase();
        return host === "workers.dev" || host.slice(-12) === ".workers.dev";
      } catch (e) {
        return /workers\.dev/i.test(value);
      }
    }

    function normalizeAllowedBase(rawBase) {
      var normalized = String(rawBase || "").trim().replace(/\/+$/, "");
      if (!normalized) return "";
      var currentIsWorkersDev = isWorkersDevBase(location.origin);
      if (isWorkersDevBase(normalized) && !currentIsWorkersDev) return "";
      return normalized;
    }

    var explicit = window.CODE_DESTINY_API_BASE_URL || window.__CF_PAGES_API_BASE_URL || "";
    var allowedExplicit = normalizeAllowedBase(explicit);
    if (allowedExplicit) {
      var normalized = allowedExplicit;
      window.CODE_DESTINY_API_BASE_URL = normalized;
      window.__CF_PAGES_API_BASE_URL = normalized;
      window.__CD_API_BASE_URL = normalized;
      return;
    }

    var meta = document.querySelector('meta[name="code-destiny-api-base"]');
    if (meta && meta.content) {
      var fromMeta = normalizeAllowedBase(meta.content);
      if (fromMeta) {
        window.CODE_DESTINY_API_BASE_URL = fromMeta;
        window.__CF_PAGES_API_BASE_URL = fromMeta;
        window.__CD_API_BASE_URL = fromMeta;
        return;
      }
    }

    // Default to current origin so frontend always uses same-origin /api.
    window.CODE_DESTINY_API_BASE_URL = location.origin;
    window.__CF_PAGES_API_BASE_URL = location.origin;
    window.__CD_API_BASE_URL = location.origin;
  } catch (e) {}
})();

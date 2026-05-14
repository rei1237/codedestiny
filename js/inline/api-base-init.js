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

    function applyRuntimeBase(base) {
      var normalized = normalizeAllowedBase(base);
      if (!normalized) return "";
      window.CODE_DESTINY_API_BASE_URL = normalized;
      window.__CF_PAGES_API_BASE_URL = normalized;
      window.__CD_API_BASE_URL = normalized;
      try { localStorage.setItem("fortune_api_base_url", normalized); } catch (e) {}
      return normalized;
    }

    function readStoredBase() {
      var raw = "";
      try { raw = String(localStorage.getItem("fortune_api_base_url") || "").trim(); } catch (e) {}
      if (!raw) return "";
      var normalized = normalizeAllowedBase(raw);
      if (!normalized) {
        try { localStorage.removeItem("fortune_api_base_url"); } catch (e) {}
        return "";
      }
      if (normalized !== raw) {
        try { localStorage.setItem("fortune_api_base_url", normalized); } catch (e) {}
      }
      return normalized;
    }

    var explicit = window.CODE_DESTINY_API_BASE_URL || window.__CF_PAGES_API_BASE_URL || "";
    var allowedExplicit = normalizeAllowedBase(explicit);
    if (allowedExplicit) {
      applyRuntimeBase(allowedExplicit);
      return;
    }

    var meta = document.querySelector('meta[name="code-destiny-api-base"]');
    if (meta && meta.content) {
      var fromMeta = normalizeAllowedBase(meta.content);
      if (fromMeta) {
        applyRuntimeBase(fromMeta);
        return;
      }
    }

    var storedBase = readStoredBase();
    if (storedBase) {
      if (applyRuntimeBase(storedBase)) {
        return;
      }
    }

    // Default to current origin so frontend always uses same-origin /api.
    applyRuntimeBase(location.origin);
  } catch (e) {}
})();

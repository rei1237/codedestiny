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

    function isLocalDevHost(hostname) {
      var host = String(hostname || "").trim().toLowerCase();
      if (!host) return false;
      return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
    }

    // PRIV-016: 저장·적용할 API base 는 같은 출처, code-destiny.com(스테이징 등 하위 도메인 포함),
    // 로컬 개발 호스트만 허용한다. 그 밖의 값은 인증 요청을 외부 호스트로 보내게 하므로 버린다.
    function isTrustedApiHost(normalized) {
      try {
        var parsed = new URL(normalized);
        if (parsed.origin === location.origin) return true;
        var host = parsed.hostname.toLowerCase();
        if (isLocalDevHost(host)) return true;
        if (parsed.protocol !== "https:") return false;
        return host === "code-destiny.com" || host.slice(-17) === ".code-destiny.com";
      } catch (e) {
        return false;
      }
    }

    function normalizeAllowedBase(rawBase) {
      var normalized = String(rawBase || "").trim().replace(/\/+$/, "");
      if (!normalized) return "";
      var currentIsWorkersDev = isWorkersDevBase(location.origin);
      if (isWorkersDevBase(normalized)) return currentIsWorkersDev ? normalized : "";
      if (!isTrustedApiHost(normalized)) return "";
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

    // 허용 목록 밖 저장값은 어느 분기로 가든 먼저 지운다(다른 스크립트도 이 키를 직접 읽는다).
    var storedBase = readStoredBase();

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

    if (isLocalDevHost(location.hostname)) {
      applyRuntimeBase(location.origin);
      return;
    }

    if (storedBase) {
      if (applyRuntimeBase(storedBase)) {
        return;
      }
    }

    // Default to current origin so frontend always uses same-origin /api.
    applyRuntimeBase(location.origin);
  } catch (e) {}
})();

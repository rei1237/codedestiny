(function () {
  var STATUS_URL = "/status.json";
  var HEARTBEAT_INTERVAL_MS = 60000;
  var REQUEST_TIMEOUT_MS = 3500;
  var killed = false;
  var checking = false;

  function withTimestamp(url) {
    return url + (url.indexOf("?") === -1 ? "?" : "&") + "t=" + Date.now();
  }

  function renderKillOverlay() {
    var id = "globalKillOverlay";
    if (document.getElementById(id)) return;
    var style = document.createElement("style");
    style.id = id + "Style";
    style.textContent =
      "#" + id + "{position:fixed;inset:0;z-index:2147483647;background:#000;display:block;}" +
      "#" + id + ",#" + id + " *{color:transparent !important;font-size:0 !important;}";
    document.head.appendChild(style);
    var overlay = document.createElement("div");
    overlay.id = id;
    overlay.textContent = "";
    document.documentElement.appendChild(overlay);
  }

  function hardBlockRuntime() {
    window.__APP_KILLED__ = true;
    window.__APP_ALIVE__ = false;
    var block = function () {
      throw new Error("Service is terminated.");
    };
    try { window.fetch = block; } catch (e) {}
    try { XMLHttpRequest.prototype.open = block; } catch (e) {}
    try { window.WebSocket = block; } catch (e) {}
    try { window.EventSource = block; } catch (e) {}
    try { window.setTimeout = function () { return 0; }; } catch (e) {}
    try { window.setInterval = function () { return 0; }; } catch (e) {}
    try { window.requestAnimationFrame = function () { return 0; }; } catch (e) {}
  }

  function clearClientArtifacts() {
    var tasks = [];
    try {
      if ("serviceWorker" in navigator) {
        tasks.push(
          navigator.serviceWorker.getRegistrations().then(function (regs) {
            return Promise.all(
              regs.map(function (reg) {
                return reg.unregister();
              })
            );
          })
        );
      }
    } catch (e) {}
    try {
      if ("caches" in window) {
        tasks.push(
          caches.keys().then(function (keys) {
            return Promise.all(
              keys.map(function (key) {
                return caches.delete(key);
              })
            );
          })
        );
      }
    } catch (e) {}
    try { localStorage.clear(); } catch (e) {}
    try { sessionStorage.clear(); } catch (e) {}
    return Promise.all(tasks).catch(function () {});
  }

  function activateKillSwitch() {
    if (killed) return;
    killed = true;
    hardBlockRuntime();
    renderKillOverlay();
    clearClientArtifacts().finally(function () {
      try { if (typeof window.stop === "function") window.stop(); } catch (e) {}
    });
  }

  function fetchAliveSignal() {
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (controller) controller.abort();
    }, REQUEST_TIMEOUT_MS);

    return fetch(withTimestamp(STATUS_URL), {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      },
      signal: controller ? controller.signal : undefined
    })
      .then(function (res) {
        clearTimeout(timer);
        if (!res.ok) throw new Error("http_" + res.status);
        return res.json();
      })
      .then(function (data) {
        if (data && data.alive === false) throw new Error("service_off");
        return true;
      });
  }

  function verifyAlive() {
    if (killed || checking) return Promise.resolve();
    checking = true;
    return fetchAliveSignal()
      .catch(function () {
        /* Only kill when server explicitly returns alive:false; ignore network errors */
        return fetch(withTimestamp(STATUS_URL), { method: "GET", cache: "no-store" })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (data) {
            if (data && data.alive === false) activateKillSwitch();
          })
          .catch(function () {});
      })
      .finally(function () {
        checking = false;
      });
  }

  function installRouteHooks() {
    if (!window.history) return;
    var originalPush = history.pushState;
    var originalReplace = history.replaceState;

    history.pushState = function () {
      var result = originalPush.apply(this, arguments);
      setTimeout(verifyAlive, 0);
      return result;
    };
    history.replaceState = function () {
      var result = originalReplace.apply(this, arguments);
      setTimeout(verifyAlive, 0);
      return result;
    };

    window.addEventListener("popstate", verifyAlive, true);
    window.addEventListener("hashchange", verifyAlive, true);
  }

  /* Async boot check: fail-open. Sync XHR is deprecated/blocked in Chrome main thread.
   * Only activate kill when server explicitly returns alive:false.
   * On network error/timeout, assume alive (show content) for better UX. */
  function asyncBootCheck() {
    fetchAliveSignal()
      .then(function () {
        window.__APP_ALIVE__ = true;
        installRouteHooks();
        setInterval(verifyAlive, HEARTBEAT_INTERVAL_MS);
      })
      .catch(function () {
        /* Explicit alive:false from server -> activate kill */
        fetch(withTimestamp(STATUS_URL), { method: "GET", cache: "no-store" })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (data) {
            if (data && data.alive === false) activateKillSwitch();
            else { window.__APP_ALIVE__ = true; installRouteHooks(); setInterval(verifyAlive, HEARTBEAT_INTERVAL_MS); }
          })
          .catch(function () {
            window.__APP_ALIVE__ = true;
            installRouteHooks();
            setInterval(verifyAlive, HEARTBEAT_INTERVAL_MS);
          });
      });
  }

  var qs = "";
  try { qs = (window.location && window.location.search) || ""; } catch (e) {}
  var devBypass = false;
  try {
    devBypass =
      qs.indexOf("devNoKill=1") !== -1 ||
      (window.localStorage && localStorage.getItem("__DEV_DISABLE_KILL_SWITCH__") === "1");
  } catch (e) {}

  if (devBypass) {
    window.__APP_ALIVE__ = true;
    window.__verifyServiceAlive = function () { return Promise.resolve(); };
    return;
  }

  window.__APP_ALIVE__ = true;
  window.__verifyServiceAlive = verifyAlive;
  asyncBootCheck();
})();

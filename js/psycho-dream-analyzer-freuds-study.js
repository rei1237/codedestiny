(function () {
  // Path: `public/js/psycho-dream-analyzer-freuds-study.js`
  // Role: 정신분석 해몽(psycho_analysis) UI/UX 전면 개편 프론트엔드 (백엔드 API 로직은 유지)

  var OVERLAY_ID = "psychoDreamModalOverlay";
  var TEXTAREA_ID = "psychoDreamInput";
  var INPUT_SCREEN_ID = "psychoDreamInputScreen";
  var LOADING_SCREEN_ID = "psychoDreamLoadingScreen";
  var RESULT_SCREEN_ID = "psychoDreamResultScreen";
  var LOADER_TEXT_ID = "psychoDreamLoaderText";
  var ERROR_ID = "psychoDreamError";
  var RESULT_MARKDOWN_ID = "psychoDreamResultMarkdown";
  var REPORT_META_ID = "psychoDreamReportMeta";
  var WIZARD_LINE_ID = "psychoDreamWizardLine";

  var LOADING_MESSAGES = [
    "무의식의 방을 탐색 중입니다...",
    "박사의 소견을 정리하고 있습니다...",
    "상징을 디코딩 중입니다...",
  ];

  var state = {
    uiLocked: false,
    currentRecordId: "",
    currentMarkdown: "",
    loadingTimer: null,
    loadingIdx: 0,
    lastInkPulseAt: 0,
    typingTimer: null,
    typingActive: false,
  };

  function syncPsychoViewportHeight() {
    var root = document.documentElement;
    if (!root) return;
    var h = 0;
    if (window.visualViewport && Number(window.visualViewport.height) > 0) h = window.visualViewport.height;
    else if (Number(window.innerHeight) > 0) h = window.innerHeight;
    if (h > 0) root.style.setProperty("--ps-safe-vh", h + "px");
  }

  /** pages.dev·별도 호스트에서도 프로덕션 API로 붙도록 (api-base-init.js / 타로 모듈과 동일 패턴) */
  function getPsychoApiBase() {
    try {
      if (typeof window !== "undefined" && window.CODE_DESTINY_API_BASE_URL) {
        return String(window.CODE_DESTINY_API_BASE_URL).replace(/\/+$/, "");
      }
    } catch (_) {}
    var host = "";
    try {
      host = String(location.hostname || "").toLowerCase();
    } catch (_) {}
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:3000";
    }
    if (host.endsWith(".pages.dev")) {
      return "https://code-destiny.com";
    }
    return "";
  }

  function getPsychoAnalysisUrl() {
    var base = getPsychoApiBase();
    var path = "/api/dream/psycho-analysis";
    return base ? base + path : path;
  }

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setBodyLock(locked) {
    if (locked) {
      document.body.dataset.cdBodyLockPrevOverflow = document.body.style.overflow || "";
      document.body.style.overflow = "hidden";
      return;
    }
    var prev = document.body.dataset.cdBodyLockPrevOverflow || "";
    document.body.style.overflow = prev;
    delete document.body.dataset.cdBodyLockPrevOverflow;
  }

  function getCookie(name) {
    var m = String(document.cookie || "").match(new RegExp("(^| )" + name + "=([^;]+)"));
    return m ? decodeURIComponent(m[2]) : "";
  }

  function getOrCreateAnonKey() {
    var key = "";
    try {
      key = localStorage.getItem("cd_anon_key") || "";
    } catch (_) {}
    if (key) return String(key);

    var created = "";
    try {
      created = (window.crypto && window.crypto.randomUUID && window.crypto.randomUUID()) || "";
    } catch (_) {}
    if (!created) created = String(Date.now()) + "-" + Math.random().toString(16).slice(2);
    key = "anon:" + created;
    try {
      localStorage.setItem("cd_anon_key", key);
    } catch (_) {}
    return key;
  }

  function getAuthToken() {
    try {
      var t = localStorage.getItem("fortune_auth_token") || "";
      if (t) return t;
    } catch (_) {}
    return getCookie("fortune_auth_token") || "";
  }

  function clearLoadingTimer() {
    if (!state.loadingTimer) return;
    clearInterval(state.loadingTimer);
    state.loadingTimer = null;
  }

  function startLoading() {
    var el = $(LOADER_TEXT_ID);
    if (el) el.textContent = LOADING_MESSAGES[0] || "";
    state.loadingIdx = 0;
    clearLoadingTimer();
    state.loadingTimer = setInterval(function () {
      state.loadingIdx = (state.loadingIdx + 1) % LOADING_MESSAGES.length;
      var lt = $(LOADER_TEXT_ID);
      if (lt) lt.textContent = LOADING_MESSAGES[state.loadingIdx];
    }, 1400);
  }

  function stopLoading() {
    clearLoadingTimer();
  }

  function stopTyping() {
    state.typingActive = false;
    if (state.typingTimer) {
      clearInterval(state.typingTimer);
      state.typingTimer = null;
    }
  }

  /** 닫기 버튼이 .ps-header/.ps-wizard(z-index:1) 아래로 깔려 모바일에서 먹통이 되는 문제 방지 */
  function ensurePsychoCloseZFix() {
    var FIX_ID = "ps-freuds-close-z-fix";
    if (document.getElementById(FIX_ID)) return;
    var st = document.createElement("style");
    st.id = FIX_ID;
    st.textContent =
      "#" + OVERLAY_ID + " .ps-close{z-index:50!important;position:absolute!important;" +
      "touch-action:manipulation;-webkit-tap-highlight-color:transparent;}";
    document.head.appendChild(st);
  }

  function injectFreudsStudyStyles() {
    ensurePsychoCloseZFix();
    var STYLE_ID = "ps-freuds-study-style-v3";
    if (document.getElementById(STYLE_ID)) return;

    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      "@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&family=Noto+Serif+KR:wght@500;600;700&family=Playfair+Display:wght@400;600;700&family=Lato:wght@300;400;700&display=swap');\n" +
      ":root{--ps-bg1:#1A252F;--ps-bg2:#2C3E50;--ps-gold:#D4AF37;--ps-burg:#A52A2A;--ps-cream:#FDF4D8;--ps-cream2:#F4E9C7;--ps-text:#FDFDFD;--ps-muted:rgba(253,253,253,.78);--ps-paper:#FDF4D8;--ps-paperEdge:rgba(212,175,37,.30);--ps-borderGold:rgba(212,175,37,.55);--ps-font-sans:'Noto Sans KR','Lato',-apple-system,BlinkMacSystemFont,sans-serif;--ps-font-display:'Noto Serif KR','Playfair Display',Georgia,serif;}\n" +
      "#".concat(OVERLAY_ID, "{position:fixed;inset:0;display:none;z-index:9999;overflow:auto;overflow-x:hidden;min-height:100vh;min-height:100dvh;max-height:none;-webkit-overflow-scrolling:touch;background:\n" +
      "radial-gradient(1000px 600px at 15% 10%, rgba(212,175,37,.10), transparent 55%),\n" +
      "radial-gradient(900px 540px at 85% 25%, rgba(165,42,42,.10), transparent 60%),\n" +
      "linear-gradient(180deg,var(--ps-bg1),var(--ps-bg2));}\n") +
      "#".concat(OVERLAY_ID, '::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;opacity:.92;background:radial-gradient(ellipse 130% 85% at 50% 115%,rgba(0,0,0,.55),transparent 58%);}\n') +
      "#".concat(OVERLAY_ID, ".ps-overlay--show{display:block;}\n") +
      "#".concat(OVERLAY_ID, ".ps-overlay--keyboard-open::before{opacity:1;}\n") +
      "#".concat(OVERLAY_ID, " .ps-dialog{max-width:980px;margin:44px auto calc(26px + env(safe-area-inset-bottom));position:relative;z-index:2;padding:24px 22px 26px;border-radius:18px;background:rgba(0,0,0,.12);\n" +
      "box-shadow:0 22px 60px rgba(0,0,0,.35);border:1px solid rgba(212,175,37,.28);}\n") +
      "#".concat(OVERLAY_ID, " .ps-close{position:absolute;top:16px;right:16px;z-index:50;width:42px;height:42px;border-radius:12px;border:1px solid rgba(212,175,37,.34);\n" +
      "background:rgba(15,20,27,.45);color:rgba(253,253,253,.95);font-size:18px;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;}\n") +
      "#".concat(OVERLAY_ID, " .ps-close:hover{border-color:rgba(212,175,37,.70);transform:translateY(-1px);}\n") +
      "#".concat(OVERLAY_ID, " .ps-bg-ornament{position:absolute;inset:0;border-radius:18px;pointer-events:none;opacity:.9;\n" +
      "background:\n" +
      "repeating-linear-gradient(90deg, rgba(255,255,255,.03) 0 1px, transparent 1px 9px),\n" +
      "repeating-linear-gradient(0deg, rgba(212,175,37,.02) 0 1px, transparent 1px 11px),\n" +
      "radial-gradient(700px 420px at 50% 0%, rgba(212,175,37,.11), transparent 62%);\n") +
      "}\n" +
      "#".concat(OVERLAY_ID, " .ps-bg-ornament svg{position:absolute;opacity:.22;pointer-events:none;filter:drop-shadow(0 14px 24px rgba(0,0,0,.35));}\n") +
      "#".concat(OVERLAY_ID, " .ps-decor-inkwell{top:98px;left:58px;width:72px;height:72px;transform:rotate(-6deg);}\n") +
      "#".concat(OVERLAY_ID, " .ps-decor-pipe{bottom:34px;left:32px;width:160px;height:auto;transform:rotate(-8deg);}\n") +
      "#".concat(OVERLAY_ID, " .ps-decor-books{top:66px;right:14px;width:240px;height:auto;transform:rotate(3deg);}\n") +
      "#".concat(OVERLAY_ID, " .ps-header{position:relative;z-index:1;display:flex;flex-direction:column;gap:8px;margin-top:6px;padding:8px 4px 12px;}\n") +
      "#".concat(OVERLAY_ID, " .ps-badge{display:inline-flex;align-items:center;gap:10px;letter-spacing:.12em;text-transform:uppercase;\n" +
      "font-size:.78rem;color:rgba(212,175,37,.95);font-family:var(--ps-font-sans);font-weight:700;}\n") +
      "#".concat(OVERLAY_ID, " .ps-header h2{font-family:var(--ps-font-display);font-weight:700;color:var(--ps-text);font-size:2.1rem;line-height:1.14;margin:0;}\n") +
      "#".concat(OVERLAY_ID, " .ps-sub{font-family:var(--ps-font-sans);color:var(--ps-muted);font-size:1rem;margin:0;}\n") +
      "#".concat(OVERLAY_ID, " .ps-wizard{position:relative;z-index:1;display:flex;align-items:flex-start;gap:18px;padding:16px 8px 8px;}\n") +
      "#".concat(OVERLAY_ID, " .ps-wizard-medallion{width:92px;height:92px;border-radius:50%;border:1px solid rgba(212,175,37,.45);\n" +
      "background:rgba(212,175,37,.06);display:flex;align-items:center;justify-content:center;}\n") +
      "#".concat(OVERLAY_ID, " .ps-wizard-text p{margin:0;}\n") +
      "#".concat(OVERLAY_ID, " #psychoDreamEntrancePrompt.ps-wizard-prompt{margin-top:6px;color:rgba(253,253,253,.82);font-size:.98rem;line-height:1.55;}\n") +
      "#".concat(OVERLAY_ID, " .ps-screen{position:relative;z-index:1;}\n") +
      "#".concat(OVERLAY_ID, " .ps-journal{margin:10px auto 0;max-width:860px;}\n") +
      "#".concat(OVERLAY_ID, " .ps-journal-title{display:flex;align-items:center;gap:12px;color:rgba(253,253,253,.93);font-family:var(--ps-font-display);font-weight:700;font-size:1.25rem;\n") +
      "padding:10px 6px 12px;}\n" +
      "#".concat(OVERLAY_ID, " .ps-journal-ink{color:rgba(212,175,37,.95);font-size:1.05rem;}\n") +
      "#".concat(OVERLAY_ID, " .ps-journal-paper{position:relative;background:linear-gradient(180deg,rgba(253,244,216,.98),rgba(244,233,199,.94));\n" +
      "border:1px solid rgba(212,175,37,.42);border-radius:16px;padding:18px 18px 14px;box-shadow:0 18px 38px rgba(0,0,0,.22);overflow:hidden;}\n") +
      "#".concat(OVERLAY_ID, " .ps-journal-paper:before{content:'';position:absolute;inset:-40px -60px auto -60px;height:120px;\n" +
      "background:radial-gradient(closest-side, rgba(212,175,37,.14), transparent 65%);pointer-events:none;}\n") +
      "#".concat(OVERLAY_ID, " .ps-ink-layer{position:absolute;inset:0;pointer-events:none;}\n") +
      "#".concat(OVERLAY_ID, " .ps-ink-pulse{position:absolute;width:26px;height:26px;border-radius:50%;\n" +
      "background:radial-gradient(circle at 30% 30%, rgba(25,25,30,.18), rgba(10,10,12,.35), rgba(0,0,0,0) 65%);\n" +
      "filter:blur(.3px);transform:translate(-50%,-50%) scale(.7);opacity:.95;animation:psInkPulse .85s ease-out forwards;}\n") +
      "@keyframes psInkPulse{0%{opacity:.95;transform:translate(-50%,-50%) scale(.55)}60%{opacity:.55;transform:translate(-50%,-50%) scale(1.15)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.55)}}\n" +
      "#".concat(OVERLAY_ID, " .ps-textarea{position:relative;width:100%;min-height:190px;max-height:min(52dvh,calc(var(--ps-safe-vh,100vh) * 0.48));resize:vertical;background:transparent;border:none;outline:none;\n" +
      "font-family:var(--ps-font-sans);font-size:1.06rem;line-height:1.85;letter-spacing:-0.01em;color:#141a22;padding:10px 4px 8px;caret-color:rgba(90,44,18,.85);\n" +
      "-webkit-font-smoothing:antialiased;\n" +
      "}\n") +
      "#".concat(OVERLAY_ID, " .ps-textarea::placeholder{color:rgba(28,33,40,.44);}\n") +
      "#".concat(OVERLAY_ID, " .ps-journal-paper.ps-journal--writing{box-shadow:0 22px 48px rgba(0,0,0,.26);}\n") +
      "#".concat(OVERLAY_ID, " .ps-journal-paper.ps-journal--writing:after{content:'';position:absolute;left:-10%;top:-25%;width:120%;height:70%;\n" +
      "background:radial-gradient(closest-side, rgba(212,175,37,.14), transparent 62%);\n" +
      "animation:psNibGlow .55s ease-out;pointer-events:none;}\n") +
      "@keyframes psNibGlow{0%{opacity:0;transform:scale(.98)}100%{opacity:1;transform:scale(1.01)}}\n" +
      "#".concat(OVERLAY_ID, " .ps-input-footer{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:center;margin-top:10px;padding:0 4px;}\n") +
      "#".concat(OVERLAY_ID, " .ps-error{width:100%;text-align:center;min-height:20px;color:rgba(165,42,42,.95);font-family:var(--ps-font-sans);font-weight:700;font-size:.92rem;}\n") +
      "#".concat(OVERLAY_ID, " .ps-btn{appearance:none;border-radius:14px;border:1px solid rgba(212,175,37,.42);background:rgba(255,255,255,.06);color:rgba(253,253,253,.95);\n" +
      "padding:12px 16px;font-family:var(--ps-font-sans);font-weight:700;cursor:pointer;}\n") +
      "#".concat(OVERLAY_ID, " .ps-btn:hover{border-color:rgba(212,175,37,.75);transform:translateY(-1px)}\n") +
      "#".concat(OVERLAY_ID, " .ps-btn-primary{background:linear-gradient(135deg, rgba(212,175,37,.22), rgba(165,42,42,.14));border-color:rgba(212,175,37,.60)}\n") +
      "#".concat(OVERLAY_ID, " .ps-btn-mini{padding:8px 12px;border-radius:12px;font-size:.9rem}\n") +
      "#".concat(OVERLAY_ID, " .ps-loading{padding:26px 0 6px;}\n") +
      "#".concat(OVERLAY_ID, " .ps-ink-scene{margin:6px auto 0;width:300px;height:300px;position:relative;}\n") +
      "#".concat(OVERLAY_ID, " .ps-paper-circle{position:absolute;inset:44px 44px 44px 44px;border-radius:50%;background:\n" +
      "radial-gradient(circle at 35% 25%, rgba(253,244,216,.95), rgba(253,244,216,.70));border:1px solid rgba(212,175,37,.35);}\n") +
      "#".concat(OVERLAY_ID, " .ps-ink-blob{position:absolute;left:50%;top:50%;width:68px;height:68px;border-radius:50%;\n" +
      "transform:translate(-50%,-50%);background:radial-gradient(circle at 30% 30%, rgba(0,0,0,.0), rgba(10,10,12,.35), rgba(10,10,12,.60));\n" +
      "filter:blur(1.2px);opacity:.0;animation:psInkSoak 2.8s ease-in-out infinite;}\n") +
      "@keyframes psInkSoak{0%{opacity:0;transform:translate(-50%,-50%) scale(.65)}20%{opacity:.95}55%{opacity:.45;transform:translate(-50%,-50%) scale(1.35)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.65)}}\n" +
      "#".concat(OVERLAY_ID, " .ps-profile-lens{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:122px;height:122px;border-radius:50%;\n" +
      "border:1px solid rgba(212,175,37,.55);background:rgba(212,175,37,.06);opacity:.0;animation:psLensFade 2.8s ease-in-out infinite;}\n") +
      "@keyframes psLensFade{0%{opacity:0;transform:translate(-50%,-50%) scale(.85)}18%{opacity:.0}35%{opacity:.9;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.06)}}\n" +
      "#".concat(OVERLAY_ID, " .ps-lens-ring{position:absolute;inset:10px;border-radius:50%;border:1px solid rgba(212,175,37,.38)}\n") +
      "#".concat(OVERLAY_ID, " .ps-lens-symbols{position:absolute;inset:16px;border-radius:50%;\n" +
      "background:\n" +
      "radial-gradient(circle at 30% 30%, rgba(212,175,37,.30), transparent 55%),\n" +
      "conic-gradient(from 30deg, rgba(212,175,37,.35), rgba(253,253,253,.0), rgba(212,175,37,.35));\n" +
      "filter:blur(.2px);opacity:.55;animation:psSymbols 1.55s ease-in-out infinite;}\n") +
      "@keyframes psSymbols{0%{transform:rotate(0deg) scale(.98)}50%{transform:rotate(20deg) scale(1.02)}100%{transform:rotate(0deg) scale(.98)}}\n" +
      "#".concat(OVERLAY_ID, " .ps-loading-text{margin:18px auto 0;text-align:center;font-family:var(--ps-font-display);color:rgba(253,253,253,.92);font-weight:700;font-size:1.08rem;}\n") +
      "#".concat(OVERLAY_ID, " .ps-result-actions{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin:22px 0 10px;padding-top:4px;}\n") +
      "#".concat(OVERLAY_ID, " .ps-report{margin:8px auto 0;max-width:860px;}\n") +
      "#".concat(OVERLAY_ID, " .ps-report-head{display:flex;flex-direction:column;gap:10px;margin-bottom:16px;padding:4px 8px 14px;border-bottom:1px solid rgba(212,175,37,.22);}\n") +
      "#".concat(OVERLAY_ID, " .ps-report-title{font-family:var(--ps-font-display);font-size:1.55rem;font-weight:700;color:rgba(253,253,253,.96);letter-spacing:-0.02em;line-height:1.25;}\n") +
      "#".concat(OVERLAY_ID, " .ps-report-meta{font-family:var(--ps-font-sans);color:rgba(253,253,253,.68);font-size:.86rem;line-height:1.55;padding:8px 12px;border-radius:12px;background:rgba(0,0,0,.22);border:1px solid rgba(212,175,37,.28);max-width:100%;word-break:keep-all;}\n") +
      "#".concat(OVERLAY_ID, " .ps-report-body{position:relative;background:linear-gradient(180deg,rgba(255,250,240,.98),rgba(244,233,199,.94));border:1px solid rgba(212,175,37,.42);border-radius:18px;padding:0;box-shadow:0 24px 52px rgba(0,0,0,.24),inset 0 1px 0 rgba(255,255,255,.45);max-height:min(68vh,640px);overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;counter-reset:ps-sec;scrollbar-width:thin;scrollbar-color:rgba(212,175,37,.55) rgba(212,175,37,.10);}\n") +
      "#".concat(OVERLAY_ID, " .ps-report-body::-webkit-scrollbar{width:9px;}\n") +
      "#".concat(OVERLAY_ID, " .ps-report-body::-webkit-scrollbar-track{background:rgba(212,175,37,.08);border-radius:0 18px 18px 0;}\n") +
      "#".concat(OVERLAY_ID, " .ps-report-body::-webkit-scrollbar-thumb{background:linear-gradient(180deg,rgba(212,175,37,.55),rgba(165,42,42,.35));border-radius:8px;border:2px solid rgba(253,244,216,.5);}\n") +
      "#".concat(OVERLAY_ID, " .ps-report-body:before{content:'';position:sticky;top:0;left:0;right:0;height:3px;z-index:1;display:block;background:linear-gradient(90deg,transparent,rgba(212,175,37,.55),rgba(165,42,42,.35),rgba(212,175,37,.55),transparent);pointer-events:none;border-radius:18px 18px 0 0;}\n") +
      "#".concat(OVERLAY_ID, " .ps-report-body .ps-report-section{padding:16px 18px 14px;margin:0;border-bottom:1px solid rgba(212,175,37,.22);background:linear-gradient(180deg,rgba(255,252,245,.15),transparent);}\n") +
      "#".concat(OVERLAY_ID, " .ps-report-body .ps-report-section:last-child{border-bottom:none;border-radius:0 0 16px 16px;padding-bottom:18px;}\n") +
      "#".concat(OVERLAY_ID, " .ps-report-body .ps-report-section:nth-child(even){background:linear-gradient(180deg,rgba(212,175,37,.06),rgba(253,250,236,.25));}\n") +
      "#".concat(OVERLAY_ID, " .ps-report-section{counter-increment:ps-sec;}\n") +
      "#".concat(OVERLAY_ID, " .ps-report-section-title{font-family:var(--ps-font-display);font-weight:700;color:rgba(88,62,18,.98);font-size:1.06rem;margin:0 0 12px;padding-bottom:10px;display:flex;align-items:flex-start;gap:12px;line-height:1.35;letter-spacing:-0.02em;border-bottom:1px solid rgba(212,175,37,.28);}\n") +
      "#".concat(OVERLAY_ID, " .ps-report-section-title:before{content:counter(ps-sec,decimal-leading-zero);flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;min-width:2.1rem;padding:5px 9px;border-radius:10px;font-size:.78rem;font-weight:700;font-family:var(--ps-font-sans);letter-spacing:.08em;color:rgba(212,175,37,.98);background:linear-gradient(145deg,rgba(212,175,37,.20),rgba(26,32,40,.12));border:1px solid rgba(212,175,37,.45);box-shadow:0 2px 8px rgba(0,0,0,.08);}\n") +
      "#".concat(OVERLAY_ID, " .ps-report-section-body{font-family:var(--ps-font-sans);color:rgba(18,24,32,.96);line-height:2.08;font-size:1.03rem;letter-spacing:-0.015em;-webkit-font-smoothing:antialiased;word-break:keep-all;overflow-wrap:break-word;}\n") +
      "#".concat(OVERLAY_ID, " .ps-report-section-body p{margin:0 0 1rem}\n") +
      "#".concat(OVERLAY_ID, " .ps-report-section-body p:last-child{margin-bottom:0}\n") +
      "#".concat(OVERLAY_ID, " .ps-report-list{margin:.35rem 0 1rem 0;padding:0 0 0 1.15rem;list-style-position:outside;}\n") +
      "#".concat(OVERLAY_ID, " .ps-report-list li{margin:.45rem 0;padding-left:.2rem;line-height:1.85;position:relative;}\n") +
      "#".concat(OVERLAY_ID, " .ps-report-list li::marker{color:rgba(165,90,42,.88);font-weight:700;}\n") +
      "#".concat(OVERLAY_ID, " .ps-result-actions .ps-btn{min-width:220px}\n") +
      "#".concat(OVERLAY_ID, " .ps-stamp{margin:16px auto 0;display:flex;justify-content:center;}\n") +
      "@media (max-width: 768px){#" + OVERLAY_ID + " .ps-dialog{margin:10px 10px calc(14px + env(safe-area-inset-bottom));padding:16px 14px 18px;border-radius:14px;position:relative;z-index:1;}#" + OVERLAY_ID + " .ps-header h2{font-size:1.4rem;}#" + OVERLAY_ID + " .ps-wizard{gap:10px;padding:10px 4px 6px;}#" + OVERLAY_ID + " .ps-wizard-medallion{width:64px;height:64px;}#" + OVERLAY_ID + " .ps-textarea{min-height:148px;max-height:min(46dvh,calc(var(--ps-safe-vh,100vh) * 0.42));font-size:1.04rem;line-height:1.82;}#" + OVERLAY_ID + " .ps-result-actions .ps-btn{min-width:100%;}#" + OVERLAY_ID + " .ps-report-title{font-size:1.35rem;}#" + OVERLAY_ID + " .ps-report-meta{font-size:.82rem;padding:8px 10px;}#" + OVERLAY_ID + " .ps-report-body{max-height:min(52vh,520px);border-radius:16px;}#" + OVERLAY_ID + " .ps-report-body .ps-report-section{padding:14px 14px 12px;}#" + OVERLAY_ID + " .ps-report-section-body{font-size:1rem;line-height:2.02;}#" + OVERLAY_ID + " .ps-report-section-title{font-size:1rem;gap:10px;}}\n";

    document.head.appendChild(style);
  }

  function setWizardHint(msg) {
    var el = $(WIZARD_LINE_ID);
    if (el) el.textContent = msg || "";
  }

  function setScreen(screen) {
    var inputScreen = $(INPUT_SCREEN_ID);
    var loadingScreen = $(LOADING_SCREEN_ID);
    var resultScreen = $(RESULT_SCREEN_ID);
    var wizard = document.querySelector("#" + OVERLAY_ID + " .ps-wizard");
    if (wizard) wizard.style.display = "";

    if (inputScreen) inputScreen.style.display = "none";
    if (loadingScreen) loadingScreen.style.display = "none";
    if (resultScreen) resultScreen.style.display = "none";
    if ($(ERROR_ID)) $(ERROR_ID).textContent = "";

    if (screen === "input") {
      if (inputScreen) inputScreen.style.display = "block";
      if (wizard) wizard.style.display = "flex";
    }
    if (screen === "loading") {
      if (loadingScreen) loadingScreen.style.display = "block";
      if (wizard) wizard.style.display = "none";
    }
    if (screen === "result") {
      if (resultScreen) resultScreen.style.display = "block";
      if (wizard) wizard.style.display = "none";
      ensureResultHomeButton();
    }
  }

  function setError(msg) {
    var el = $(ERROR_ID);
    if (el) el.textContent = msg || "";
  }

  function setOverlayVisible(visible) {
    var overlay = $(OVERLAY_ID);
    if (!overlay) return;
    if (visible) {
      overlay.style.display = "block";
      overlay.classList.add("ps-overlay--show");
      overlay.scrollTop = 0;
    } else {
      overlay.classList.remove("ps-overlay--show");
      window.setTimeout(function () {
        // If it was already re-opened, don't hide.
        if (!overlay.classList.contains("ps-overlay--show")) overlay.style.display = "none";
      }, 160);
    }
  }

  function resetUI() {
    state.uiLocked = false;
    state.currentRecordId = "";
    state.currentMarkdown = "";
    stopLoading();
    stopTyping();
    setError("");
    var input = $(TEXTAREA_ID);
    if (input) input.value = "";
    setScreen("input");
  }

  function triggerInkPulse() {
    var now = Date.now();
    if (now - state.lastInkPulseAt < 55) return; // prevent over-spamming
    state.lastInkPulseAt = now;

    var layer = $( "psychoDreamInkLayer" );
    if (!layer) return;

    var pulse = document.createElement("span");
    pulse.className = "ps-ink-pulse";
    var rect = layer.getBoundingClientRect();
    var x = rect.width * (0.08 + Math.random() * 0.84);
    var y = rect.height * (0.08 + Math.random() * 0.78);
    pulse.style.left = x + "px";
    pulse.style.top = y + "px";
    var s = 0.75 + Math.random() * 0.7;
    pulse.style.transform = "translate(-50%,-50%) scale(" + s.toFixed(2) + ")";
    layer.appendChild(pulse);
    window.setTimeout(function () {
      try {
        pulse.remove();
      } catch (_) {}
    }, 920);
  }

  function setPsychoKeyboardVeil(active) {
    var ov = $(OVERLAY_ID);
    if (!ov) return;
    if (active) ov.classList.add("ps-overlay--keyboard-open");
    else ov.classList.remove("ps-overlay--keyboard-open");
  }

  function attachJournalMicroInteractions() {
    var ta = $(TEXTAREA_ID);
    if (!ta) return;

    var journalPaper = ta.closest(".ps-journal-paper") || null;
    var mqMobile =
      typeof window.matchMedia === "function" ? window.matchMedia("(max-width: 768px)") : null;

    ta.addEventListener("focus", function () {
      if (journalPaper) journalPaper.classList.add("ps-journal--writing");
      syncPsychoViewportHeight();
      if (mqMobile && mqMobile.matches) setPsychoKeyboardVeil(true);
      window.setTimeout(function () {
        try { ta.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" }); } catch (_) {}
      }, 120);
    });
    ta.addEventListener("blur", function () {
      if (journalPaper) journalPaper.classList.remove("ps-journal--writing");
      setPsychoKeyboardVeil(false);
    });
    ta.addEventListener("input", function () {
      if (journalPaper) {
        journalPaper.classList.add("ps-journal--writing");
        window.setTimeout(function () {
          try {
            journalPaper.classList.remove("ps-journal--writing");
          } catch (_) {}
        }, 520);
      }
      triggerInkPulse();
    });
  }

  function renderPsychoDreamMarkdown(md) {
    var text = String(md || "").replace(/\r\n/g, "\n");
    if (!text.trim()) {
      return (
        '<div class="ps-report-section"><div class="ps-report-section-title">분석</div><div class="ps-report-section-body"><p>표시할 분석 내용이 없습니다.</p></div></div>'
      );
    }

    var lines = text.split("\n");
    var html = "";

    var currentTitle = null;
    var paragraph = [];
    var listItems = [];
    var sectionOpen = false;

    function flushParagraph() {
      if (!paragraph.length) return;
      var joined = paragraph.join(" ").trim();
      paragraph = [];
      if (!joined) return;
      html += '<p>' + escapeHtml(joined) + "</p>";
    }

    function flushList() {
      if (!listItems.length) return;
      var items = listItems.slice();
      listItems = [];
      html += '<ul class="ps-report-list">' + items.map(function (it) {
        return "<li>" + escapeHtml(it) + "</li>";
      }).join("") + "</ul>";
    }

    function closeSection() {
      flushParagraph();
      flushList();
      if (sectionOpen) {
        html += "</div></div>";
      }
      sectionOpen = false;
      currentTitle = null;
    }

    function openSection(title) {
      closeSection();
      currentTitle = title;
      sectionOpen = true;
      html +=
        '<div class="ps-report-section">' +
        '<div class="ps-report-section-title">' +
        escapeHtml(title) +
        "</div>" +
        '<div class="ps-report-section-body">';
    }

    var headingRe = /^\s*\[(.+?)\]\s*:\s*$/;
    var headingRe2 = /^\s*\[(.+?)\]\s*:\s*(.*)$/;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line == null) continue;
      var raw = String(line);
      var trimmed = raw.trim();

      if (!trimmed) {
        // blank line: close paragraph/list blocks but keep section
        flushParagraph();
        flushList();
        continue;
      }

      var m = raw.match(headingRe) || raw.match(headingRe2);
      if (m) {
        var title = m[1] || "";
        openSection(title);
        // any trailing content after ':' (rare) becomes paragraph
        if (m[2]) {
          paragraph.push(String(m[2]).trim());
        }
        continue;
      }

      // bullet list line
      var bullet = raw.match(/^\-\s+(.*)$/) || raw.match(/^\*\s+(.*)$/);
      if (bullet) {
        flushParagraph();
        listItems.push(bullet[1] || "");
        continue;
      }

      // normal paragraph line (keep line breaks as sentences)
      paragraph.push(trimmed);
    }

    closeSection();

    // If backend didn't include the bracket headings, render everything as a single section.
    if (!html.trim()) {
      html =
        '<div class="ps-report-section">' +
        '<div class="ps-report-section-title">분석 결과</div>' +
        '<div class="ps-report-section-body">' +
        escapeHtml(text).replace(/\n/g, "<br/>") +
        "</div></div>";
    }

    return html;
  }

  async function analyzeDream() {
    if (state.uiLocked) return;
    var dreamText = ($(TEXTAREA_ID) && $(TEXTAREA_ID).value ? $(TEXTAREA_ID).value : "").trim();
    if (!dreamText) {
      setError("꿈 내용을 입력해 주세요.");
      return;
    }
    if (dreamText.length < 8) {
      setError("조금 더 자세히 적어 주세요. (최소 8자)");
      return;
    }

    var overlay = $(OVERLAY_ID);
    if (!overlay) return;

    state.uiLocked = true;
    stopLoading();
    setError("");
    setScreen("loading");
    startLoading();

    var anonKey = getOrCreateAnonKey();
    var token = getAuthToken();

    try {
      var headers = {
        "Content-Type": "application/json",
        "x-cd-anon-key": anonKey,
      };
      if (token) headers["Authorization"] = "Bearer " + token;

      // External provider 응답이 지연될 때 “무한 로딩”처럼 보이지 않도록
      // 프론트에서도 Abort 기반 타임아웃을 둡니다.
      var controller = typeof AbortController === "function" ? new AbortController() : null;
      var timeoutMs = 45000;
      var timeoutId = null;
      if (controller) {
        timeoutId = setTimeout(function () {
          try {
            controller.abort();
          } catch (_) {}
        }, timeoutMs);
      }

      var res = null;
      try {
        res = await fetch(getPsychoAnalysisUrl(), {
          method: "POST",
          headers: headers,
          body: JSON.stringify({ dreamText: dreamText }),
          signal: controller ? controller.signal : undefined,
        });
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }

      var data = null;
      try {
        var ct = (res.headers && res.headers.get && res.headers.get("content-type")) || "";
        if (ct.indexOf("application/json") === -1) {
          throw new Error("non-json");
        }
        data = await res.json();
      } catch (_) {
        data = null;
      }

      if (!data || typeof data !== "object") {
        stopTyping();
        var hint =
          res.status === 404
            ? "분석 서비스 경로를 찾을 수 없습니다. 배포·도메인 설정을 확인해 주세요."
            : "서버 응답을 받지 못했습니다. 네트워크 후 다시 시도해 주세요.";
        setError(hint);
        setScreen("input");
        return;
      }

      if (!res.ok || !data.ok) {
        var msg = (data && data.message) || "분석에 실패했습니다.";
        stopTyping();
        setError(msg);
        setScreen("input");
        return;
      }

      state.currentRecordId = (data.record && data.record.id) || "";
      state.currentMarkdown = (data.record && data.record.markdown) || "";

      var metaEl = $(REPORT_META_ID);
      if (metaEl) {
        var src = (data.record && (data.record.source || data.source)) || "";
        var mdl = (data.record && data.record.model) || "";
        var cachedTag = data.cached ? " (cached)" : "";
        var dateStr = new Date().toLocaleString();
        var bits = [dateStr];
        if (src) bits.push("출처: " + src);
        if (mdl) bits.push("모델: " + mdl);
        if (data.formatWarning) bits.push("섹션 형식은 일부 자동 정리됨");
        metaEl.textContent = bits.join(" · ") + cachedTag;
      }

      var mdEl = $(RESULT_MARKDOWN_ID);
      if (mdEl) {
        // Typewriter effect: Freud가 조심스레 소견서를 써 내려가는 듯한 연출
        stopTyping();
        state.typingActive = true;
        mdEl.innerHTML = "";

        var fullMd = state.currentMarkdown || "";
        var total = fullMd.length;
        var reveal = 0;

        // Text length에 따라 속도를 조정합니다.
        var charsPerTick = total < 800 ? 3 : total < 1600 ? 2 : 1;
        var tickMs = total < 800 ? 18 : 14;

        state.typingTimer = setInterval(function () {
          if (!state.typingActive) return;
          reveal = Math.min(total, reveal + charsPerTick);
          var part = fullMd.slice(0, reveal);
          mdEl.innerHTML = renderPsychoDreamMarkdown(part);
          if (reveal >= total) {
            stopTyping();
            mdEl.innerHTML = renderPsychoDreamMarkdown(fullMd);
          }
        }, tickMs);
      }

      stopLoading();
      setScreen("result");

      // DB 없이도 동작해야 하므로 분석 결과는 화면에만 표시하고 즉시 공유 가능하도록 둡니다.
    } catch (e) {
      stopLoading();
      stopTyping();
      var msg = (e && e.message) || "네트워크 오류로 분석에 실패했습니다.";
      if (e && (e.name === "AbortError" || String(msg || "").toLowerCase().includes("abort"))) {
        msg = "분석 요청이 지연되어 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.";
      }
      setError(msg);
      setScreen("input");
    } finally {
      state.uiLocked = false;
    }
  }

  window.openPsychoDreamModal = function openPsychoDreamModal() {
    injectFreudsStudyStyles();

    resetUI();
    setOverlayVisible(true);
    setBodyLock(true);
    syncPsychoViewportHeight();
    setWizardHint("프로이트 박사의 소견을 받을 준비가 되셨나요?");
  };

  window.closePsychoDreamModal = function closePsychoDreamModal() {
    stopLoading();
    stopTyping();
    setBodyLock(false);
    setOverlayVisible(false);
  };

  /** 결과 화면에서 모달 닫고 메인 화면 상단으로 이동 */
  window.psychoDreamGoHome = function psychoDreamGoHome() {
    if (typeof window.closePsychoDreamModal === "function") window.closePsychoDreamModal();
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (_) {
      try {
        window.scrollTo(0, 0);
      } catch (e2) {}
    }
  };

  window.psychoDreamStartAnalysis = function psychoDreamStartAnalysis() {
    analyzeDream();
  };

  window.psychoDreamReset = function psychoDreamReset() {
    // Keep overlay open, only reset the internal UI to the input state.
    resetUI();
    setOverlayVisible(true);
    setBodyLock(true);
  };

  window.psychoDreamShareText = async function psychoDreamShareText() {
    var text = String(state.currentMarkdown || "").trim();
    if (!text) {
      setError("공유할 분석 결과가 아직 없습니다.");
      return;
    }

    var shareTitle = "정신분석 해몽 결과";
    // 1) Web Share API 우선
    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, text: text });
        return;
      }
    } catch (_) {
      // 사용자가 공유 시트를 닫은 경우 등은 무시하고 복사 폴백으로 진행
    }

    // 2) 클립보드 복사 폴백
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        setError("분석 텍스트를 클립보드에 복사했습니다.");
        return;
      }
    } catch (_) {}

    // 3) 최후 폴백: 선택창
    try {
      window.prompt("아래 텍스트를 복사하세요.", text.slice(0, 5000));
      setError("텍스트 복사 창을 열었습니다.");
    } catch (_) {
      setError("공유 기능을 사용할 수 없습니다.");
    }
  };

  // Initial UX
  syncPsychoViewportHeight();
  window.addEventListener("resize", syncPsychoViewportHeight, { passive: true });
  window.addEventListener("orientationchange", syncPsychoViewportHeight, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", syncPsychoViewportHeight, { passive: true });
    window.visualViewport.addEventListener("scroll", syncPsychoViewportHeight, { passive: true });
  }

  injectFreudsStudyStyles();
  ensureResultHomeButton();
  attachPsychoCloseGuards();
  attachJournalMicroInteractions();

  // Safety: data-action binding이 누락되는 환경도 대비해 직접 클릭을 보강합니다.
  var analyzeBtn = $( "psychoDreamAnalyzeBtn" );
  if (analyzeBtn) {
    analyzeBtn.addEventListener("click", function () {
      analyzeDream();
    });
  }

  /** 결과 영역에 홈 버튼이 없으면 추가 (HTML 수정 없이도 동작) */
  function ensureResultHomeButton() {
    var actions = document.querySelector("#" + RESULT_SCREEN_ID + " .ps-result-actions");
    if (!actions || actions.querySelector('[data-action="psychoDreamGoHome"]')) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ps-btn ps-btn-primary";
    btn.setAttribute("data-action", "psychoDreamGoHome");
    btn.setAttribute("aria-label", "홈 화면으로 바로가기");
    btn.textContent = "🏠 홈으로 바로가기";
    if (actions.firstChild) actions.insertBefore(btn, actions.firstChild);
    else actions.appendChild(btn);
  }

  /** 닫기 버튼: 캡처 단계에서 먼저 처리 (헤더/마법사 레이어가 터치 가로채는 경우 방지) */
  function attachPsychoCloseGuards() {
    var ov = $(OVERLAY_ID);
    if (!ov || ov.dataset.cdPsychoCloseGuard === "1") return;
    ov.dataset.cdPsychoCloseGuard = "1";
    function tryClose(ev) {
      var closeBtn = ev.target && ev.target.closest && ev.target.closest(".ps-close");
      if (!closeBtn || !ov.contains(closeBtn)) return;
      if (ev.cancelable) ev.preventDefault();
      ev.stopPropagation();
      if (typeof window.closePsychoDreamModal === "function") window.closePsychoDreamModal();
    }
    ov.addEventListener("click", tryClose, true);
    ov.addEventListener(
      "touchend",
      function (e) {
        var closeBtn = e.target && e.target.closest && e.target.closest(".ps-close");
        if (!closeBtn || !ov.contains(closeBtn)) return;
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        if (typeof window.closePsychoDreamModal === "function") window.closePsychoDreamModal();
      },
      { passive: false, capture: true }
    );
  }

  function bindDirectTapAction(selector, handler) {
    var nodes = document.querySelectorAll(selector);
    if (!nodes || !nodes.length) return;
    nodes.forEach(function (node) {
      if (!node || node.dataset.cdTapBound === "1") return;
      node.dataset.cdTapBound = "1";
      var firedAt = 0;
      function fire(ev) {
        var now = Date.now();
        if (now - firedAt < 260) return;
        firedAt = now;
        if (ev && ev.cancelable) ev.preventDefault();
        if (ev) ev.stopPropagation();
        handler(ev);
      }
      node.addEventListener("click", fire, { passive: false });
      node.addEventListener("touchend", fire, { passive: false });
      node.addEventListener("pointerup", function (ev) {
        if (ev.pointerType && ev.pointerType !== "touch") return;
        fire(ev);
      }, { passive: false });
    });
  }

  bindDirectTapAction('[data-action="openPsychoDreamModal"]', function () {
    if (typeof window.openPsychoDreamModal === "function") window.openPsychoDreamModal();
  });
  /* .ps-close 는 attachPsychoCloseGuards(캡처)에서 처리 — 이중 호출 방지 */
  bindDirectTapAction('#' + OVERLAY_ID + ' [data-action="closePsychoDreamModal"]:not(.ps-close)', function () {
    if (typeof window.closePsychoDreamModal === "function") window.closePsychoDreamModal();
  });
  bindDirectTapAction('#' + OVERLAY_ID + ' [data-action="psychoDreamGoHome"]', function () {
    if (typeof window.psychoDreamGoHome === "function") window.psychoDreamGoHome();
  });
  bindDirectTapAction('#' + OVERLAY_ID + ' #psychoDreamAnalyzeBtn, #' + OVERLAY_ID + ' [data-action="psychoDreamStartAnalysis"]', function () {
    if (typeof window.psychoDreamStartAnalysis === "function") window.psychoDreamStartAnalysis();
  });

  var overlay = $(OVERLAY_ID);
  if (overlay && !overlay.dataset.cdBackdropCloseBound) {
    overlay.dataset.cdBackdropCloseBound = "1";
    overlay.addEventListener("click", function (ev) {
      if (ev.target !== overlay) return;
      if (typeof window.closePsychoDreamModal === "function") window.closePsychoDreamModal();
    });
  }
  setScreen("input");
})();


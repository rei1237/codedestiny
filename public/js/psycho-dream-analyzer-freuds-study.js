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

  function injectFreudsStudyStyles() {
    var STYLE_ID = "ps-freuds-study-style";
    if (document.getElementById(STYLE_ID)) return;

    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Lato:wght@300;400;700&display=swap');\n" +
      ":root{--ps-bg1:#1A252F;--ps-bg2:#2C3E50;--ps-gold:#D4AF37;--ps-burg:#A52A2A;--ps-cream:#FDF4D8;--ps-cream2:#F4E9C7;--ps-text:#FDFDFD;--ps-muted:rgba(253,253,253,.78);--ps-paper:#FDF4D8;--ps-paperEdge:rgba(212,175,37,.30);--ps-borderGold:rgba(212,175,37,.55);}\n" +
      "#".concat(OVERLAY_ID, "{position:fixed;inset:0;display:none;z-index:9999;overflow:auto;overflow-x:hidden;min-height:var(--ps-safe-vh,100dvh);max-height:var(--ps-safe-vh,100dvh);-webkit-overflow-scrolling:touch;background:\n" +
      "radial-gradient(1000px 600px at 15% 10%, rgba(212,175,37,.10), transparent 55%),\n" +
      "radial-gradient(900px 540px at 85% 25%, rgba(165,42,42,.10), transparent 60%),\n" +
      "linear-gradient(180deg,var(--ps-bg1),var(--ps-bg2));}\n") +
      "#".concat(OVERLAY_ID, ".ps-overlay--show{display:block;}\n") +
      "#".concat(OVERLAY_ID, " .ps-dialog{max-width:980px;margin:44px auto calc(26px + env(safe-area-inset-bottom));position:relative;padding:24px 22px 26px;border-radius:18px;background:rgba(0,0,0,.12);\n" +
      "box-shadow:0 22px 60px rgba(0,0,0,.35);border:1px solid rgba(212,175,37,.28);}\n") +
      "#".concat(OVERLAY_ID, " .ps-close{position:absolute;top:16px;right:16px;width:42px;height:42px;border-radius:12px;border:1px solid rgba(212,175,37,.34);\n" +
      "background:rgba(15,20,27,.45);color:rgba(253,253,253,.95);font-size:18px;cursor:pointer;}\n") +
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
      "font-size:.78rem;color:rgba(212,175,37,.95);font-family:'Lato',sans-serif;font-weight:700;}\n") +
      "#".concat(OVERLAY_ID, " .ps-header h2{font-family:'Playfair Display',serif;font-weight:700;color:var(--ps-text);font-size:2.1rem;line-height:1.14;margin:0;}\n") +
      "#".concat(OVERLAY_ID, " .ps-sub{font-family:'Lato',sans-serif;color:var(--ps-muted);font-size:1rem;margin:0;}\n") +
      "#".concat(OVERLAY_ID, " .ps-wizard{position:relative;z-index:1;display:flex;align-items:flex-start;gap:18px;padding:16px 8px 8px;}\n") +
      "#".concat(OVERLAY_ID, " .ps-wizard-medallion{width:92px;height:92px;border-radius:50%;border:1px solid rgba(212,175,37,.45);\n" +
      "background:rgba(212,175,37,.06);display:flex;align-items:center;justify-content:center;}\n") +
      "#".concat(OVERLAY_ID, " .ps-wizard-text p{margin:0;}\n") +
      "#".concat(OVERLAY_ID, " #psychoDreamEntrancePrompt.ps-wizard-prompt{margin-top:6px;color:rgba(253,253,253,.82);font-size:.98rem;line-height:1.55;}\n") +
      "#".concat(OVERLAY_ID, " .ps-screen{position:relative;z-index:1;}\n") +
      "#".concat(OVERLAY_ID, " .ps-journal{margin:10px auto 0;max-width:860px;}\n") +
      "#".concat(OVERLAY_ID, " .ps-journal-title{display:flex;align-items:center;gap:12px;color:rgba(253,253,253,.93);font-family:'Playfair Display',serif;font-weight:700;font-size:1.25rem;\n") +
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
      "#".concat(OVERLAY_ID, " .ps-textarea{position:relative;width:100%;min-height:190px;max-height:45dvh;resize:vertical;background:transparent;border:none;outline:none;\n" +
      "font-family:'Lato',sans-serif;font-size:1.05rem;line-height:1.8;color:#1d232a;padding:8px 2px 6px;caret-color:rgba(90,44,18,.85);\n" +
      "}\n") +
      "#".concat(OVERLAY_ID, " .ps-textarea::placeholder{color:rgba(28,33,40,.44);}\n") +
      "#".concat(OVERLAY_ID, " .ps-journal-paper.ps-journal--writing{box-shadow:0 22px 48px rgba(0,0,0,.26);}\n") +
      "#".concat(OVERLAY_ID, " .ps-journal-paper.ps-journal--writing:after{content:'';position:absolute;left:-10%;top:-25%;width:120%;height:70%;\n" +
      "background:radial-gradient(closest-side, rgba(212,175,37,.14), transparent 62%);\n" +
      "animation:psNibGlow .55s ease-out;pointer-events:none;}\n") +
      "@keyframes psNibGlow{0%{opacity:0;transform:scale(.98)}100%{opacity:1;transform:scale(1.01)}}\n" +
      "#".concat(OVERLAY_ID, " .ps-input-footer{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:center;margin-top:10px;padding:0 4px;}\n") +
      "#".concat(OVERLAY_ID, " .ps-error{width:100%;text-align:center;min-height:20px;color:rgba(165,42,42,.95);font-family:'Lato',sans-serif;font-weight:700;font-size:.92rem;}\n") +
      "#".concat(OVERLAY_ID, " .ps-btn{appearance:none;border-radius:14px;border:1px solid rgba(212,175,37,.42);background:rgba(255,255,255,.06);color:rgba(253,253,253,.95);\n" +
      "padding:12px 16px;font-family:'Lato',sans-serif;font-weight:700;cursor:pointer;}\n") +
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
      "#".concat(OVERLAY_ID, " .ps-loading-text{margin:18px auto 0;text-align:center;font-family:'Playfair Display',serif;color:rgba(253,253,253,.92);font-weight:700;font-size:1.08rem;}\n") +
      "#".concat(OVERLAY_ID, " .ps-result-actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin:16px 0 8px;}\n") +
      "#".concat(OVERLAY_ID, " .ps-report{margin:8px auto 0;}\n") +
      "#".concat(OVERLAY_ID, " .ps-report-head{display:flex;flex-direction:column;gap:6px;margin-bottom:12px;padding:0 6px;}\n") +
      "#".concat(OVERLAY_ID, " .ps-report-title{font-family:'Playfair Display',serif;font-size:1.6rem;font-weight:700;color:rgba(253,253,253,.96)}\n") +
      "#".concat(OVERLAY_ID, " .ps-report-meta{font-family:'Lato',sans-serif;color:rgba(253,253,253,.74);font-size:.95rem}\n") +
      "#".concat(OVERLAY_ID, " .ps-report-body{background:linear-gradient(180deg,rgba(253,244,216,.95),rgba(244,233,199,.92));border:1px solid rgba(212,175,37,.35);border-radius:16px;padding:16px 16px 12px;box-shadow:0 22px 48px rgba(0,0,0,.22);}\n") +
      "#".concat(OVERLAY_ID, " .ps-report-section{margin:14px 0;padding:10px 12px;border:1px solid rgba(212,175,37,.50);border-radius:14px;background:rgba(253,250,236,.70)}\n") +
      "#".concat(OVERLAY_ID, " .ps-report-section-title{font-family:'Playfair Display',serif;font-weight:700;color:rgba(142,105,28,.95);font-size:1.02rem;margin-bottom:8px;display:flex;align-items:center;gap:10px}\n") +
      "#".concat(OVERLAY_ID, " .ps-report-section-title:before{content:'';display:inline-block;width:12px;height:12px;border-radius:50%;border:2px solid rgba(212,175,37,.85);box-shadow:0 0 0 4px rgba(212,175,37,.14)}\n") +
      "#".concat(OVERLAY_ID, " .ps-report-section-body{font-family:'Lato',sans-serif;color:rgba(28,33,40,.95);line-height:1.95}\n") +
      "#".concat(OVERLAY_ID, " .ps-report-section-body p{margin:.25rem 0 .85rem}\n") +
      "#".concat(OVERLAY_ID, " .ps-report-list{margin:.1rem 0 .8rem 1.05rem;padding:0}\n") +
      "#".concat(OVERLAY_ID, " .ps-report-list li{margin:.18rem 0}\n") +
      "#".concat(OVERLAY_ID, " .ps-result-actions .ps-btn{min-width:220px}\n") +
      "#".concat(OVERLAY_ID, " .ps-stamp{margin:16px auto 0;display:flex;justify-content:center;}\n") +
      "@media (max-width: 768px){#" + OVERLAY_ID + " .ps-dialog{margin:10px 10px calc(14px + env(safe-area-inset-bottom));padding:16px 14px 18px;border-radius:14px;}#" + OVERLAY_ID + " .ps-header h2{font-size:1.4rem;}#" + OVERLAY_ID + " .ps-wizard{gap:10px;padding:10px 4px 6px;}#" + OVERLAY_ID + " .ps-wizard-medallion{width:64px;height:64px;}#" + OVERLAY_ID + " .ps-textarea{min-height:140px;max-height:38dvh;font-size:1rem;line-height:1.6;}#" + OVERLAY_ID + " .ps-result-actions .ps-btn{min-width:100%;}}\n";

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

  function attachJournalMicroInteractions() {
    var ta = $(TEXTAREA_ID);
    if (!ta) return;

    var journalPaper = ta.closest(".ps-journal-paper") || null;
    ta.addEventListener("focus", function () {
      if (journalPaper) journalPaper.classList.add("ps-journal--writing");
      syncPsychoViewportHeight();
      window.setTimeout(function () {
        try { ta.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" }); } catch (_) {}
      }, 120);
    });
    ta.addEventListener("blur", function () {
      if (journalPaper) journalPaper.classList.remove("ps-journal--writing");
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

      var res = await fetch("/api/dream/psycho-analysis", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ dreamText: dreamText }),
      });
      var data = await res.json().catch(function () {
        return {};
      });

      if (!res.ok || !data || !data.ok) {
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
      setError((e && e.message) || "네트워크 오류로 분석에 실패했습니다.");
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
  attachJournalMicroInteractions();

  // Safety: data-action binding이 누락되는 환경도 대비해 직접 클릭을 보강합니다.
  var analyzeBtn = $( "psychoDreamAnalyzeBtn" );
  if (analyzeBtn) {
    analyzeBtn.addEventListener("click", function () {
      analyzeDream();
    });
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
  bindDirectTapAction('#' + OVERLAY_ID + ' .ps-close, #' + OVERLAY_ID + ' [data-action="closePsychoDreamModal"]', function () {
    if (typeof window.closePsychoDreamModal === "function") window.closePsychoDreamModal();
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


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

  var PSYCHO_DREAM_TEXT_TRANSLATIONS = {
    ko: {
      loadingMessages: ["무의식의 방을 탐색 중입니다...", "박사의 소견을 정리하고 있습니다...", "상징을 디코딩 중입니다..."],
      freudQuotes: [
        "꿈은 무의식으로 가는 왕도입니다.",
        "억압된 감정은 사라지지 않고 다른 형태로 되돌아옵니다.",
        "자아는 자신의 집에서도 주인이 아닙니다.",
        "사랑하고 일하는 능력은 성숙함의 표지입니다.",
        "우리는 고통을 기억보다 반복으로 더 분명히 드러냅니다.",
        "말해지지 못한 감정은 증상으로 말하려 합니다."
      ],
      resultTitle: "분석 결과",
      validationRequired: "꿈 내용을 입력해 주세요.",
      validationMin: "조금 더 자세히 적어 주세요. (최소 8자)",
      serviceNotFound: "분석 서비스 경로를 찾을 수 없습니다. 배포·도메인 설정을 확인해 주세요.",
      serverNoResponse: "서버 응답을 받지 못했습니다. 네트워크 후 다시 시도해 주세요.",
      analysisFailed: "분석에 실패했습니다.",
      cached: "캐시됨",
      reportMeta: "정신분석 데이터 분석",
      formatWarning: "섹션 형식은 일부 자동 정리됨",
      networkFailed: "네트워크 오류로 분석에 실패했습니다.",
      timeout: "분석 요청이 지연되어 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.",
      wizardHint: "프로이트 박사의 소견을 받을 준비가 되셨나요?",
      shareMissing: "공유할 분석 결과가 아직 없습니다.",
      shareTitle: "정신분석 해몽 결과",
      clipboardCopied: "분석 텍스트를 클립보드에 복사했습니다.",
      copyPrompt: "아래 텍스트를 복사하세요.",
      copyPromptOpened: "텍스트 복사 창을 열었습니다.",
      shareUnavailable: "공유 기능을 사용할 수 없습니다.",
    },
    en: {
      loadingMessages: ["Opening the room of the unconscious...", "Arranging the doctor's notes...", "Decoding the dream symbols..."],
      freudQuotes: [
        "Dreams open a royal road toward the unconscious.",
        "Repressed feelings return in another form.",
        "The self is not always master in its own house.",
        "The ability to love and work marks maturity.",
        "Pain often reveals itself through repetition.",
        "Unspoken emotion tries to speak through symptoms."
      ],
      resultTitle: "Analysis Result",
      validationRequired: "Please enter the dream you want to explore.",
      validationMin: "Please write a little more. (At least 8 characters)",
      serviceNotFound: "The analysis service path could not be found. Please check the deployment or domain settings.",
      serverNoResponse: "We could not read the server response. Please check the network and try again.",
      analysisFailed: "The analysis could not be completed.",
      cached: "cached",
      reportMeta: "Psychoanalytic dream data analysis",
      formatWarning: "Some section formatting was adjusted automatically",
      networkFailed: "The analysis failed because of a network error.",
      timeout: "The analysis request took too long. Please try again in a moment.",
      wizardHint: "Are you ready to receive the doctor's note?",
      shareMissing: "There is no analysis result to share yet.",
      shareTitle: "Psychoanalytic Dream Result",
      clipboardCopied: "The analysis text has been copied to the clipboard.",
      copyPrompt: "Copy the text below.",
      copyPromptOpened: "A copy window has been opened.",
      shareUnavailable: "Sharing is unavailable in this browser.",
    },
    ja: {
      loadingMessages: ["無意識の部屋をたどっています...", "博士の所見を整えています...", "夢の象徴を読み解いています..."],
      freudQuotes: [
        "夢は無意識へ向かう王道です。",
        "抑圧された感情は別の姿で戻ってきます。",
        "自我は自分の家でも完全な主人ではありません。",
        "愛し働く力は成熟のしるしです。",
        "痛みは記憶より反復の中で姿を見せます。",
        "語られなかった感情は症状として語ろうとします。"
      ],
      resultTitle: "分析結果",
      validationRequired: "夢の内容を入力してください。",
      validationMin: "もう少し詳しく書いてください。（8文字以上）",
      serviceNotFound: "分析サービスの経路が見つかりません。デプロイまたはドメイン設定をご確認ください。",
      serverNoResponse: "サーバー応答を受け取れませんでした。通信状況を確認してもう一度お試しください。",
      analysisFailed: "分析に失敗しました。",
      cached: "キャッシュ済み",
      reportMeta: "精神分析データ解析",
      formatWarning: "一部のセクション形式を自動で整えました",
      networkFailed: "ネットワークエラーにより分析に失敗しました。",
      timeout: "分析リクエストに時間がかかりすぎました。しばらくしてからもう一度お試しください。",
      wizardHint: "博士の所見を受け取る準備はできていますか？",
      shareMissing: "共有できる分析結果がまだありません。",
      shareTitle: "精神分析夢診断結果",
      clipboardCopied: "分析テキストをクリップボードにコピーしました。",
      copyPrompt: "下のテキストをコピーしてください。",
      copyPromptOpened: "コピー用のウィンドウを開きました。",
      shareUnavailable: "このブラウザでは共有機能を使用できません。",
    },
    "zh-CN": {
      loadingMessages: ["正在探访潜意识的房间...", "正在整理博士的意见...", "正在解读梦中的象征..."],
      freudQuotes: [
        "梦是通往潜意识的王道。",
        "被压抑的情绪会以另一种形态回来。",
        "自我并不总是自己屋中的主人。",
        "爱与工作的能力，是成熟的标记。",
        "痛苦常常通过重复显露出来。",
        "未被说出口的情绪，会试着以症状发声。"
      ],
      resultTitle: "分析结果",
      validationRequired: "请输入梦境内容。",
      validationMin: "请再写得详细一些。（至少 8 个字符）",
      serviceNotFound: "找不到分析服务路径。请检查部署或域名设置。",
      serverNoResponse: "未能读取服务器响应。请检查网络后重试。",
      analysisFailed: "分析未能完成。",
      cached: "已缓存",
      reportMeta: "精神分析数据解读",
      formatWarning: "部分章节格式已自动整理",
      networkFailed: "因网络错误，分析未能完成。",
      timeout: "分析请求等待时间过长。请稍后再试。",
      wizardHint: "准备好接收博士的意见了吗？",
      shareMissing: "目前还没有可分享的分析结果。",
      shareTitle: "精神分析解梦结果",
      clipboardCopied: "分析文本已复制到剪贴板。",
      copyPrompt: "请复制下方文本。",
      copyPromptOpened: "已打开文本复制窗口。",
      shareUnavailable: "当前浏览器无法使用分享功能。",
    },
    "zh-TW": {
      loadingMessages: ["正在探訪潛意識的房間...", "正在整理博士的意見...", "正在解讀夢中的象徵..."],
      freudQuotes: [
        "夢是通往潛意識的王道。",
        "被壓抑的情緒會以另一種形態回來。",
        "自我並不總是自己屋中的主人。",
        "愛與工作的能力，是成熟的標記。",
        "痛苦常常透過重複顯露出來。",
        "未被說出口的情緒，會試著以症狀發聲。"
      ],
      resultTitle: "分析結果",
      validationRequired: "請輸入夢境內容。",
      validationMin: "請再寫得詳細一些。（至少 8 個字元）",
      serviceNotFound: "找不到分析服務路徑。請檢查部署或網域設定。",
      serverNoResponse: "未能讀取伺服器回應。請確認網路後重試。",
      analysisFailed: "分析未能完成。",
      cached: "已快取",
      reportMeta: "精神分析資料解讀",
      formatWarning: "部分段落格式已自動整理",
      networkFailed: "因網路錯誤，分析未能完成。",
      timeout: "分析請求等待時間過長。請稍後再試。",
      wizardHint: "準備好接收博士的意見了嗎？",
      shareMissing: "目前還沒有可分享的分析結果。",
      shareTitle: "精神分析解夢結果",
      clipboardCopied: "分析文字已複製到剪貼簿。",
      copyPrompt: "請複製下方文字。",
      copyPromptOpened: "已開啟文字複製視窗。",
      shareUnavailable: "目前瀏覽器無法使用分享功能。",
    },
  };

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

  function normalizePsychoDreamLocale(value) {
    var lang = String(value || "").trim().replace("_", "-");
    var lower = lang.toLowerCase();
    if (lower === "zh" || lower === "zh-cn" || lower === "zh-hans") return "zh-CN";
    if (lower === "zh-tw" || lower === "zh-hant" || lower === "zh-hk") return "zh-TW";
    if (lower.indexOf("ja") === 0) return "ja";
    if (lower.indexOf("en") === 0) return "en";
    return "ko";
  }

  function getPsychoDreamLocale() {
    try {
      if (window.cdGetCurrentLanguage) return normalizePsychoDreamLocale(window.cdGetCurrentLanguage());
    } catch (_) {}
    try {
      var stored = localStorage.getItem("cd_locale") || localStorage.getItem("codeDestinyLocale") || localStorage.getItem("lang");
      if (stored) return normalizePsychoDreamLocale(stored);
    } catch (_) {}
    try {
      var cookieLang = getCookie("cd_locale") || getCookie("NEXT_LOCALE") || getCookie("lang");
      if (cookieLang) return normalizePsychoDreamLocale(cookieLang);
    } catch (_) {}
    return "ko";
  }

  function psychoDreamText(key) {
    var locale = getPsychoDreamLocale();
    var table = PSYCHO_DREAM_TEXT_TRANSLATIONS[locale] || PSYCHO_DREAM_TEXT_TRANSLATIONS.ko;
    return table[key] || PSYCHO_DREAM_TEXT_TRANSLATIONS.ko[key] || "";
  }

  function psychoDreamList(key) {
    var value = psychoDreamText(key);
    return Array.isArray(value) ? value : [];
  }

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

  // 회당 결제(월정석 차감 등) 직후 게이트가 저장해 둔 프리미엄 액세스 토큰.
  // 서버는 이 토큰으로 방금 결제를 인정한다(이용권/단건결제는 서버 상태로 이미 판별됨).
  function getPremiumAccessToken() {
    try {
      if (window.__cdPremiumAccessToken) return String(window.__cdPremiumAccessToken);
    } catch (_) {}
    try {
      var s = sessionStorage.getItem("cd_premium_access_token") || "";
      if (s) return s;
    } catch (_) {}
    try {
      return localStorage.getItem("cd_premium_access_token") || "";
    } catch (_) {}
    return "";
  }

  function clearLoadingTimer() {
    if (!state.loadingTimer) return;
    clearInterval(state.loadingTimer);
    state.loadingTimer = null;
  }

  function composeLoadingLine(idx) {
    var messages = psychoDreamList("loadingMessages");
    var quotes = psychoDreamList("freudQuotes");
    var msg = messages[idx % Math.max(messages.length, 1)] || "";
    var quote = quotes[idx % Math.max(quotes.length, 1)] || "";
    return quote ? msg + " " + quote : msg;
  }

  function startLoading() {
    var el = $(LOADER_TEXT_ID);
    if (el) el.textContent = composeLoadingLine(0);
    state.loadingIdx = 0;
    clearLoadingTimer();
    state.loadingTimer = setInterval(function () {
      state.loadingIdx = (state.loadingIdx + 1) % Math.max(psychoDreamList("loadingMessages").length, 1);
      var lt = $(LOADER_TEXT_ID);
      if (lt) lt.textContent = composeLoadingLine(state.loadingIdx);
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
      ":root{--ps-bg1:#1A252F;--ps-bg2:#2C3E50;--ps-gold:#D4AF37;--ps-burg:#A52A2A;--ps-cream:#FDF4D8;--ps-cream2:#F4E9C7;--ps-text:#FDFDFD;--ps-muted:rgba(253,253,253,.78);--ps-paper:#FDF4D8;--ps-paperEdge:rgba(212,175,37,.30);--ps-borderGold:rgba(212,175,37,.55);--ps-font-sans:var(--font-body,'Apple SD Gothic Neo','Malgun Gothic','Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif);--ps-font-display:var(--font-display,'Apple SD Gothic Neo','Malgun Gothic',Georgia,serif);}\n" +
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
      "#".concat(OVERLAY_ID, " #psychoDreamWizardLine{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;background:linear-gradient(135deg,rgba(253,244,216,.24),rgba(212,175,37,.14));border:1px solid rgba(255,230,171,.52);color:rgba(255,250,236,.99);font-size:1.06rem;line-height:1.46;font-weight:700;letter-spacing:-0.01em;text-shadow:0 1px 2px rgba(20,26,34,.22),0 0 16px rgba(255,232,180,.22);box-shadow:0 10px 24px rgba(8,12,18,.22),inset 0 1px 0 rgba(255,255,255,.24);}\n") +
      "#".concat(OVERLAY_ID, " #psychoDreamEntrancePrompt.ps-wizard-prompt{margin-top:8px;color:rgba(255,252,238,.98);font-size:1.01rem;line-height:1.62;font-weight:600;letter-spacing:-0.01em;padding:10px 14px;border-radius:12px;background:linear-gradient(135deg,rgba(212,175,37,.16),rgba(255,255,255,.06));border:1px solid rgba(212,175,37,.45);box-shadow:0 8px 20px rgba(0,0,0,.20),inset 0 1px 0 rgba(255,255,255,.24);text-shadow:0 1px 2px rgba(0,0,0,.42);}\n") +
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
    var markdownHeadingRe = /^\s{0,3}#{2,6}\s+(.+?)\s*$/;

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

      var mdHeading = raw.match(markdownHeadingRe);
      if (mdHeading) {
        openSection(mdHeading[1] || "");
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
        '<div class="ps-report-section-title">' + escapeHtml(psychoDreamText("resultTitle")) + "</div>" +
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
      setError(psychoDreamText("validationRequired"));
      return;
    }
    if (dreamText.length < 8) {
      setError(psychoDreamText("validationMin"));
      return;
    }

    var overlay = $(OVERLAY_ID);
    if (!overlay) return;

    // 결제/이용권 게이트는 승인 후 같은 액션(psychoDreamStartAnalysis)을 다시 호출한다.
    // 이때 게이트가 세팅해 둔 승인 신호(data-pvw-bypass 또는 cd_pa_* 세션 플래그)를 소비해
    // 게이트를 재실행하지 않고 실제 분석 요청으로 넘어간다. (신호가 없으면 최초 진입 → 게이트 실행)
    var analyzeBtn = $("psychoDreamAnalyzeBtn");
    var gateApproved = false;
    try {
      if (analyzeBtn && analyzeBtn.getAttribute("data-pvw-bypass") === "1") gateApproved = true;
      if (sessionStorage.getItem("cd_pa_psychoDreamStartAnalysis") === "1") {
        gateApproved = true;
        // 1회만 소비해 회당 결제 성격을 유지한다(다음 분석은 다시 게이트를 거친다).
        sessionStorage.removeItem("cd_pa_psychoDreamStartAnalysis");
      }
    } catch (_) {}
    if (!gateApproved && analyzeBtn && typeof window.__cdRunPerUseCoinGateFromTile === "function") {
      if (window.__cdRunPerUseCoinGateFromTile(analyzeBtn)) return;
    }

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
        var premiumAccessToken = getPremiumAccessToken();
        res = await fetch(getPsychoAnalysisUrl(), {
          method: "POST",
          headers: headers,
          body: JSON.stringify({ dreamText: dreamText, premiumAccessToken: premiumAccessToken || undefined }),
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
            ? psychoDreamText("serviceNotFound")
            : psychoDreamText("serverNoResponse");
        setError(hint);
        setScreen("input");
        return;
      }

      if (!res.ok || !data.ok) {
        var msg = getPsychoDreamLocale() === "ko" && data && data.message ? data.message : psychoDreamText("analysisFailed");
        stopTyping();
        setError(msg);
        setScreen("input");
        return;
      }

      state.currentRecordId = (data.record && data.record.id) || "";
      state.currentMarkdown = (data.record && data.record.markdown) || "";

      var metaEl = $(REPORT_META_ID);
      if (metaEl) {
        var cachedTag = data.cached ? " (" + psychoDreamText("cached") + ")" : "";
        var dateStr = new Date().toLocaleString();
        var bits = [dateStr, psychoDreamText("reportMeta")];
        if (data.formatWarning) bits.push(psychoDreamText("formatWarning"));
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
      var rawErrorMessage = (e && e.message) || "";
      var msg = psychoDreamText("networkFailed");
      if (e && (e.name === "AbortError" || String(rawErrorMessage || "").toLowerCase().includes("abort"))) {
        msg = psychoDreamText("timeout");
      }
      setError(msg);
      setScreen("input");
      // 모바일: 키보드 베일만 해제 (body lock은 모달이 열린 상태이므로 해제 금지)
      try { setPsychoKeyboardVeil(false); } catch (_) {}
    } finally {
      state.uiLocked = false;
    }
  }

  window.openPsychoDreamModal = function openPsychoDreamModal() {
    injectFreudsStudyStyles();

    // 이전 세션에서 남은 승인 신호가 있으면 게이트를 건너뛰고 무료로 분석되므로 진입 시 제거한다.
    try { sessionStorage.removeItem("cd_pa_psychoDreamStartAnalysis"); } catch (_) {}

    resetUI();
    setOverlayVisible(true);
    setBodyLock(true);
    syncPsychoViewportHeight();
    setWizardHint(psychoDreamText("wizardHint"));
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
      setError(psychoDreamText("shareMissing"));
      return;
    }

    var shareTitle = psychoDreamText("shareTitle");
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
        setError(psychoDreamText("clipboardCopied"));
        return;
      }
    } catch (_) {}

    // 3) 최후 폴백: 선택창
    try {
      window.prompt(psychoDreamText("copyPrompt"), text.slice(0, 5000));
      setError(psychoDreamText("copyPromptOpened"));
    } catch (_) {
      setError(psychoDreamText("shareUnavailable"));
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

  // NOTE: 배경 클릭 닫기(backdrop click close)는 의도적으로 제거됨.
  // 모바일에서 결과 스크롤 중 오버레이 영역이 클릭 이벤트로 잘못 인식되어
  // 모달이 튕겨나가는 치명적 버그를 방지합니다. 닫기는 X 버튼을 사용하세요.

  // 오버레이 내부 이벤트 위임: 동적으로 추가된 버튼(홈 버튼 등) 처리
  var overlay = $(OVERLAY_ID);
  if (overlay && !overlay.dataset.cdDelegationBound) {
    overlay.dataset.cdDelegationBound = "1";
    overlay.addEventListener("click", function (ev) {
      var target = ev.target && ev.target.closest ? ev.target.closest("[data-action]") : null;
      if (!target) return;
      var action = target.getAttribute("data-action");
      if (action === "psychoDreamGoHome" && typeof window.psychoDreamGoHome === "function") {
        ev.preventDefault(); ev.stopPropagation();
        window.psychoDreamGoHome();
      } else if (action === "closePsychoDreamModal" && typeof window.closePsychoDreamModal === "function") {
        ev.preventDefault(); ev.stopPropagation();
        window.closePsychoDreamModal();
      } else if (action === "psychoDreamStartAnalysis" && typeof window.psychoDreamStartAnalysis === "function") {
        ev.preventDefault(); ev.stopPropagation();
        window.psychoDreamStartAnalysis();
      } else if (action === "psychoDreamReset" && typeof window.psychoDreamReset === "function") {
        ev.preventDefault(); ev.stopPropagation();
        window.psychoDreamReset();
      } else if (action === "psychoDreamShareText" && typeof window.psychoDreamShareText === "function") {
        ev.preventDefault(); ev.stopPropagation();
        window.psychoDreamShareText();
      }
    }, { capture: false });
  }
  setScreen("input");
})();

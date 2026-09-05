/**
 * 우리는 무슨 사이? — 6-Card Relationship Spread Experience
 * API: POST /api/tarot/draw (spreadType: relationship_six_card)
 *      POST /api/tarot/love-reading (cards)
 */
(function () {
  "use strict";

  var POSITION_LABELS = {
    position_1: "내가 바라보는 상대",
    position_2: "상대가 관계 전체를 보는 시각",
    position_3: "상대가 나를 바라보는 마음",
    position_4: "상대의 연애 의지와 열망",
    position_5: "관계를 가로막는 핵심 요인",
    position_6: "가까운 흐름과 선택 기준",
  };
  var DISPLAY_ORDER = [0, 1, 2, 3, 4, 5];
  var GUIDE_ORDER = [0, 1, 2, 3, 4, 5];

  var refs = {};
  var state = { cards: [], revealedCount: 0, reading: null, hasAccess: false, paymentInFlight: false, readingPromise: null, readingResult: null };
  // 리셋/모달 닫힘 이후 도착하는 늦은 draw·프리페치 응답이 새 세션을 덮지 않도록 하는 세대 카운터.
  var flowSeq = 0;
  var LOVE_COIN_COST = 50;
  var LOVE_REASON = "우리는 무슨 사이? 타로 리딩";
  var LOVE_FEATURE_KEY = "tarot-love-relationship";
  var FLOWER_ADMIN_TOKEN_RE = /^[A-Za-z0-9_-]{20,}\.[0-9a-f]{64}$/;
  var TAROT_API_TIMEOUT_MS = 12000;
  // love-reading은 서버가 LLM 상담문을 동기 생성한다(서버 상한 ~42s). draw보다 넉넉히 대기하되 프리뷰 터널 60s 컷 아래로 둔다.
  var TAROT_READING_API_TIMEOUT_MS = 55000;
  var RELATIONSHIP_POSITIONS = ["position_1", "position_2", "position_3", "position_4", "position_5", "position_6"];
  var LOCAL_RELATIONSHIP_DECK = [
    { cardId: "M00", name: "The Fool", nameKr: "바보" },
    { cardId: "M01", name: "The Magician", nameKr: "마법사" },
    { cardId: "M02", name: "The High Priestess", nameKr: "여사제" },
    { cardId: "M03", name: "The Empress", nameKr: "여황제" },
    { cardId: "M04", name: "The Emperor", nameKr: "황제" },
    { cardId: "M05", name: "The Hierophant", nameKr: "교황" },
    { cardId: "M06", name: "The Lovers", nameKr: "연인" },
    { cardId: "M07", name: "The Chariot", nameKr: "전차" },
    { cardId: "M08", name: "Strength", nameKr: "힘" },
    { cardId: "M09", name: "The Hermit", nameKr: "은둔자" },
    { cardId: "M10", name: "Wheel of Fortune", nameKr: "운명의 수레바퀴" },
    { cardId: "M11", name: "Justice", nameKr: "정의" },
    { cardId: "M14", name: "Temperance", nameKr: "절제" },
    { cardId: "M17", name: "The Star", nameKr: "별" },
    { cardId: "M18", name: "The Moon", nameKr: "달" },
    { cardId: "M19", name: "The Sun", nameKr: "태양" },
  ];

  function getTarotLoveLocale() {
    try {
      if (window.cdGetCurrentLanguage) return String(window.cdGetCurrentLanguage() || "ko");
    } catch (_) {}
    try {
      return String(localStorage.getItem("cd_locale") || localStorage.getItem("codeDestinyLocale") || localStorage.getItem("lang") || "ko");
    } catch (_) {}
    return "ko";
  }

  var TAROT_LOVE_TEXT_TRANSLATIONS = {
    ko: {
      krw: "원",
      paymentRequired: "결제가 필요합니다.",
      openPayment: "결제 화면을 엽니다.",
      checkingPayment: "결제를 확인하는 중입니다...",
      checkoutFailed: "결제를 완료하지 못했습니다. 결제 수단을 확인한 뒤 다시 시도해 주세요.",
      gateUnavailable: "결제 게이트를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.",
      loginConfirm: "🔒 로그인이 필요합니다. 로그인 페이지로 이동할까요?",
      krwFailed: "원화 결제 확인에 실패했습니다.",
      serverAccessFailed: "서버 권한 검증에 실패했습니다. 결제 내역 확인 후 다시 시도해 주세요.",
      tarotCardAlt: "타로 카드",
      reversedSuffix: " (역)",
      allCardsRevealed: "모든 카드를 확인했습니다. 아래 버튼을 눌러 관계 리딩을 열어보세요.",
      flipGuidePrefix: "✦ 별빛이 가리키는 카드: ",
      flipGuideSuffix: "를 뒤집어 주세요",
      accessDenied: "결제가 확인되지 않아 결과를 표시할 수 없습니다.",
      currentTemperature: "🌙 관계의 현재 온도",
      crossedHeart: "🔍 마음이 엇갈리는 지점",
      nextChoice: "🧭 현실 흐름과 다음 선택",
      positionReading: "🃏 포지션별 관계 해석",
      uprightLabel: "정방향",
      reversedLabel: "역방향",
      coreSignal: "핵심 신호",
      relationshipInterpretation: "관계 해석",
      relationshipPsychology: "관계 심리",
      todayChoice: "오늘의 선택",
      cautionFlow: "조심할 흐름",
      focusStandard: "🧭 지금 지켜야 할 기준",
      instantMission: "⚡ 오늘 남길 한 문장",
      conversationTemperature: "💬 대화의 온도",
      relationshipBoundary: "🛡️ 내가 지킬 선",
      sevenDayRhythm: "🌙 7일의 리듬",
      positionFallback: "포지션",
      unknownCard: "이름이 확인되지 않은 카드",
      promptRole: "당신은 말의 온도와 침묵의 결을 섬세하게 읽는 연애 타로 리더입니다.",
      promptInstruction: "아래 6장의 관계 스프레드와 이미 드러난 흐름을 바탕으로, 두 사람 사이의 감정 온도와 앞으로의 선택을 자연스럽게 읽어 주세요.",
      promptCardFlow: "[카드 흐름]",
      promptRevealedEnergy: "[이미 드러난 관계의 기운]",
      promptCurrentTemperature: "현재 온도",
      promptCrossedPoint: "엇갈리는 지점",
      promptRealityFlow: "현실 흐름",
      promptOneSentence: "오늘 남길 한 문장",
      promptSevenDays: "7일의 리듬",
      promptRequest: "[리딩 부탁]",
      promptRequestLines: [
        "두 사람의 관계 이름을 단정하기보다 지금 흐르는 감정, 망설임, 가까워질 수 있는 속도를 먼저 읽어 주세요.",
        "상대의 마음을 확정적으로 말하지 말고, 카드가 비추는 가능성과 조심해야 할 흐름을 구분해 주세요.",
        "마지막에는 오늘 건네기 좋은 한 문장과 앞으로 7일 동안 지키면 좋은 선택을 따뜻하게 남겨 주세요.",
      ],
      fallbackCurrentTemperature: "카드가 두 사람 사이에 남은 온도를 비춥니다.",
      fallbackCrossedPoint: "말과 행동 사이에서 조심스럽게 확인해야 할 마음이 떠오릅니다.",
      fallbackRealityFlow: "가까운 선택은 서두른 결론보다 대화의 리듬을 먼저 가리킵니다.",
      fallbackOneSentence: "상대의 반응을 재촉하지 않고 내 마음을 차분히 건넵니다.",
      fallbackSevenDays: "이번 7일은 결론보다 관계의 온도를 안정시키는 시간이 됩니다.",
      aiPromptKicker: "AI Oracle Prompt",
      aiPromptTitle: "✦ AI에게 건넬 연애운 질문문",
      aiPromptLead: "방금 펼친 카드와 관계의 온도를 그대로 담았습니다. 필요한 AI에게 옮기면 오늘의 연애운을 더 깊게 이어 볼 수 있습니다.",
      aiPromptAria: "우리는 무슨 사이 AI 연애운 질문문",
      aiPromptCopy: "프롬프트 복사",
      aiPromptIncluded: "결제된 관계 리딩에 포함된 질문문입니다.",
      promptNotReady: "복사할 프롬프트가 아직 열리지 않았습니다.",
      promptCopied: "프롬프트가 복사되었습니다.",
      copyBlocked: "복사 권한이 막혀 직접 선택해 복사해 주세요.",
      loadingTitle: "연이가 두 사람 사이의 흐름을 읽고 있어요…",
      loadingSub: "카드 여섯 장의 결을 하나의 상담으로 엮는 중입니다. 잠시만 기다려 주세요.",
      loadingStages: [
        "카드 여섯 장을 펼치는 중…",
        "두 사람 사이의 온도를 읽는 중…",
        "엇갈린 마음의 결을 잇는 중…",
        "연이가 상담을 다듬는 중…",
      ],
      shareHeader: "💕 [우리는 무슨 사이?] 💕",
      shareCta: "👉 무료 타로 보러가기: https://code-destiny.com",
      shareTitle: "💕 우리는 무슨 사이?",
    },
    en: {
      krw: " KRW",
      paymentRequired: "Payment is required.",
      openPayment: "Opening the payment screen.",
      checkingPayment: "Checking your payment...",
      checkoutFailed: "Payment could not be completed. Please check your payment method and try again.",
      gateUnavailable: "The payment gate could not be loaded. Please refresh and try again.",
      loginConfirm: "🔒 Login is required. Go to the login page?",
      krwFailed: "KRW payment verification failed.",
      serverAccessFailed: "Server access verification failed. Please check your payment history and try again.",
      tarotCardAlt: "Tarot card",
      reversedSuffix: " (Reversed)",
      allCardsRevealed: "All cards are open. Tap the button below to reveal the relationship reading.",
      flipGuidePrefix: "✦ The starlight points to: ",
      flipGuideSuffix: ". Turn this card over.",
      accessDenied: "Payment has not been verified, so the result cannot be displayed.",
      currentTemperature: "🌙 Current Temperature of the Relationship",
      crossedHeart: "🔍 Where the Hearts Miss Each Other",
      nextChoice: "🧭 Reality Flow and Next Choice",
      positionReading: "🃏 Relationship Reading by Position",
      uprightLabel: "Upright",
      reversedLabel: "Reversed",
      coreSignal: "Core signal",
      relationshipInterpretation: "Relationship reading",
      relationshipPsychology: "Relationship psychology",
      todayChoice: "Today’s choice",
      cautionFlow: "Flow to watch",
      focusStandard: "🧭 What to Keep Steady Now",
      instantMission: "⚡ One sentence for today",
      conversationTemperature: "💬 Conversation temperature",
      relationshipBoundary: "🛡️ My boundary",
      sevenDayRhythm: "🌙 Seven-day rhythm",
      positionFallback: "Position",
      unknownCard: "Card name unavailable",
      promptRole: "You are a relationship tarot reader who reads the warmth of words and the texture of silence with care.",
      promptInstruction: "Based on the six-card relationship spread below and the flow already revealed, read the emotional temperature between the two people and the choices ahead in a natural voice.",
      promptCardFlow: "[Card Flow]",
      promptRevealedEnergy: "[Already Revealed Relationship Energy]",
      promptCurrentTemperature: "Current temperature",
      promptCrossedPoint: "Where it crosses",
      promptRealityFlow: "Reality flow",
      promptOneSentence: "One sentence for today",
      promptSevenDays: "Seven-day rhythm",
      promptRequest: "[Reading Request]",
      promptRequestLines: [
        "Do not rush to name the relationship; first read the feelings, hesitation, and possible pace of closeness moving now.",
        "Do not state the other person’s feelings as fixed facts. Separate the possibilities shown by the cards from the flows that need care.",
        "Close with one warm sentence to send today and one choice to keep over the next seven days.",
      ],
      fallbackCurrentTemperature: "The cards show the warmth still held between the two people.",
      fallbackCrossedPoint: "A feeling that needs careful checking rises between words and actions.",
      fallbackRealityFlow: "The nearer choice points to a rhythm of conversation before a rushed conclusion.",
      fallbackOneSentence: "I share my heart calmly without pressing for the other person’s reaction.",
      fallbackSevenDays: "The next seven days are better for steadying the relationship’s temperature than forcing an answer.",
      aiPromptKicker: "AI Oracle Prompt",
      aiPromptTitle: "✦ Relationship question to give AI",
      aiPromptLead: "This keeps the cards you just opened and the relationship temperature intact. Move it to the AI you need to continue today’s love reading more deeply.",
      aiPromptAria: "AI relationship tarot prompt",
      aiPromptCopy: "Copy Prompt",
      aiPromptIncluded: "This prompt is included in the paid relationship reading.",
      promptNotReady: "The prompt is not open yet.",
      promptCopied: "Prompt copied.",
      copyBlocked: "Copy permission is blocked. Please select and copy it manually.",
      loadingTitle: "Reading the flow between you two…",
      loadingSub: "Weaving the six cards into one consultation. This takes just a moment.",
      loadingStages: [
        "Laying out the six cards…",
        "Reading the warmth between you two…",
        "Weaving the crossed feelings together…",
        "Yeoni is refining the reading…",
      ],
      shareHeader: "💕 [What Are We?] 💕",
      shareCta: "👉 Try a free tarot reading: https://code-destiny.com",
      shareTitle: "💕 What Are We?",
    },
    ja: {
      krw: "ウォン",
      paymentRequired: "決済が必要です。",
      openPayment: "決済画面を開きます。",
      checkingPayment: "決済を確認しています...",
      checkoutFailed: "決済を完了できませんでした。お支払い方法を確認して、もう一度お試しください。",
      gateUnavailable: "決済ゲートを読み込めませんでした。更新してもう一度お試しください。",
      loginConfirm: "🔒 ログインが必要です。ログインページへ移動しますか？",
      krwFailed: "ウォン決済の確認に失敗しました。",
      serverAccessFailed: "サーバー権限の検証に失敗しました。決済履歴を確認してからもう一度お試しください。",
      tarotCardAlt: "タロットカード",
      reversedSuffix: "（逆位置）",
      allCardsRevealed: "すべてのカードを確認しました。下のボタンから関係リーディングを開いてください。",
      flipGuidePrefix: "✦ 星明かりが示すカード: ",
      flipGuideSuffix: "をめくってください",
      accessDenied: "決済が確認できないため、結果を表示できません。",
      currentTemperature: "🌙 関係の現在の温度",
      crossedHeart: "🔍 心がすれ違うところ",
      nextChoice: "🧭 現実の流れと次の選択",
      positionReading: "🃏 ポジション別の関係リーディング",
      uprightLabel: "正位置",
      reversedLabel: "逆位置",
      coreSignal: "核心サイン",
      relationshipInterpretation: "関係の解釈",
      relationshipPsychology: "関係心理",
      todayChoice: "今日の選択",
      cautionFlow: "注意したい流れ",
      focusStandard: "🧭 今守りたい基準",
      instantMission: "⚡ 今日残す一文",
      conversationTemperature: "💬 会話の温度",
      relationshipBoundary: "🛡️ 私が守る線",
      sevenDayRhythm: "🌙 7日間のリズム",
      positionFallback: "ポジション",
      unknownCard: "名前を確認できないカード",
      promptRole: "あなたは言葉の温度と沈黙の質感を繊細に読む恋愛タロットリーダーです。",
      promptInstruction: "下の6枚の関係スプレッドと、すでに現れた流れをもとに、二人の感情の温度とこれからの選択を自然な言葉で読んでください。",
      promptCardFlow: "[カードの流れ]",
      promptRevealedEnergy: "[すでに現れた関係の気配]",
      promptCurrentTemperature: "現在の温度",
      promptCrossedPoint: "すれ違う点",
      promptRealityFlow: "現実の流れ",
      promptOneSentence: "今日残す一文",
      promptSevenDays: "7日間のリズム",
      promptRequest: "[リーディングのお願い]",
      promptRequestLines: [
        "二人の関係名を急いで決めず、今流れている感情、迷い、近づける速度を先に読んでください。",
        "相手の気持ちを断定せず、カードが映す可能性と注意したい流れを分けて伝えてください。",
        "最後に、今日伝えるとよい一文と、これから7日間守るとよい選択を温かく残してください。",
      ],
      fallbackCurrentTemperature: "カードは二人の間に残る温度を映しています。",
      fallbackCrossedPoint: "言葉と行動の間で、そっと確かめたい気持ちが浮かびます。",
      fallbackRealityFlow: "近い選択は、急ぐ結論より会話のリズムを先に整えることを示しています。",
      fallbackOneSentence: "相手の反応を急がせず、自分の気持ちを落ち着いて届けます。",
      fallbackSevenDays: "この7日間は結論よりも、関係の温度を安定させる時間です。",
      aiPromptKicker: "AI Oracle Prompt",
      aiPromptTitle: "✦ AIへ渡す恋愛運の質問文",
      aiPromptLead: "いま開いたカードと関係の温度をそのまま込めました。必要なAIへ移すと、今日の恋愛運をさらに深く続けられます。",
      aiPromptAria: "AI恋愛タロット質問文",
      aiPromptCopy: "プロンプトをコピー",
      aiPromptIncluded: "決済済みの関係リーディングに含まれる質問文です。",
      promptNotReady: "コピーするプロンプトはまだ開いていません。",
      promptCopied: "プロンプトをコピーしました。",
      copyBlocked: "コピー権限がブロックされています。手動で選択してコピーしてください。",
      loadingTitle: "二人の間に流れる気配を読んでいます…",
      loadingSub: "6枚のカードをひとつのリーディングに紡いでいます。少々お待ちください。",
      loadingStages: [
        "6枚のカードを広げています…",
        "二人の間の温度を読んでいます…",
        "すれ違う想いの結を繋いでいます…",
        "ヨニがリーディングを整えています…",
      ],
      shareHeader: "💕 [私たちはどんな関係？] 💕",
      shareCta: "👉 無料タロットを見る: https://code-destiny.com",
      shareTitle: "💕 私たちはどんな関係？",
    }
  };

  function normalizeTarotLoveLocale() {
    var value = String(getTarotLoveLocale() || "").trim().replace("_", "-").toLowerCase();
    if (value.indexOf("ja") === 0) return "ja";
    if (value.indexOf("en") === 0) return "en";
    return "ko";
  }

  function getTarotLoveCopy() {
    return TAROT_LOVE_TEXT_TRANSLATIONS[normalizeTarotLoveLocale()] || TAROT_LOVE_TEXT_TRANSLATIONS.ko;
  }

  function formatTarotLoveKrw(cost) {
    var amount = Math.max(0, Number(cost || 0)) * 100;
    var locale = normalizeTarotLoveLocale();
    var formatLocale = locale === "en" ? "en-US" : locale === "ja" ? "ja-JP" : "ko-KR";
    return amount.toLocaleString(formatLocale) + getTarotLoveCopy().krw;
  }

  function isTarotLoveReversed(label) {
    var value = String(label || "").toLowerCase();
    return value.indexOf("역") >= 0 || value.indexOf("逆") >= 0 || value.indexOf("reverse") >= 0;
  }

  function localizeTarotLoveOrientation(label) {
    var copy = getTarotLoveCopy();
    var value = String(label || "").trim();
    if (!value) return copy.uprightLabel;
    if (isTarotLoveReversed(value)) return copy.reversedLabel;
    if (value.indexOf("정") >= 0 || value.indexOf("正") >= 0 || value.toLowerCase().indexOf("upright") >= 0) return copy.uprightLabel;
    return value;
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function normalizeApiBase(raw) {
    return String(raw || "").trim().replace(/\/+$/, "");
  }

  function getRuntimeEnvApiBase() {
    try {
      if (typeof process !== "undefined" && process && process.env) {
        var envBase = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.CLOUDFLARE_API_BASE_URL || process.env.API_BASE_URL;
        if (envBase) return normalizeApiBase(envBase);
      }
    } catch (e) {}

    if (typeof window !== "undefined") {
      try {
        if (window.__ENV__ && window.__ENV__.NEXT_PUBLIC_API_BASE_URL) {
          return normalizeApiBase(window.__ENV__.NEXT_PUBLIC_API_BASE_URL);
        }
        if (window.__CF_PAGES_API_BASE_URL) {
          return normalizeApiBase(window.__CF_PAGES_API_BASE_URL);
        }
        var meta = document.querySelector('meta[name="code-destiny-api-base"]');
        if (meta && meta.content) return normalizeApiBase(meta.content);
      } catch (e2) {}
    }

    return "";
  }

  function createTarotApiError(message, details) {
    var err = new Error(message);
    if (details && typeof details === "object") {
      Object.keys(details).forEach(function (key) {
        err[key] = details[key];
      });
    }
    return err;
  }

  function tarotApiConsole(method, args) {
    try {
      var c = typeof console !== "undefined" ? console : null;
      if (!c) return;
      var fn = typeof c[method] === "function" ? c[method] : (typeof c.log === "function" ? c.log : null);
      if (fn) fn.apply(c, args);
    } catch (e) {}
  }
  // 재시도 중 진단은 console.debug(기본 콘솔에서 숨김)로만 남겨 스팸을 없앤다.
  function logTarotApiDebug(stage, details) {
    tarotApiConsole("debug", ["[Tarot API] " + stage, details || {}]);
  }
  // 모든 재시도가 소진돼 사용자에게 실제 실패가 보이는 경우에만 한 줄 경고.
  function logTarotApiGiveUp(endpoint, error) {
    var status = error && typeof error.status === "number" ? error.status : "(network)";
    tarotApiConsole("warn", ["[Tarot API] " + endpoint + " 요청 실패(재시도 소진, status=" + status + ")"]);
  }
  function waitMs(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, Math.max(0, Number(ms) || 0)); });
  }

  function getTarotApiBase() {
    var runtimeBase = getRuntimeEnvApiBase();
    if (runtimeBase) return runtimeBase;
    if (typeof getFortuneApiBaseUrl === "function") {
      var base = getFortuneApiBaseUrl();
      if (base) return normalizeApiBase(base);
    }
    if (typeof window !== "undefined") {
      if (window.CODE_DESTINY_API_BASE_URL) return normalizeApiBase(window.CODE_DESTINY_API_BASE_URL);
      var host = String(location.hostname || "").toLowerCase();
      if (host === "localhost" || host === "127.0.0.1") return "http://localhost:3000";
      return normalizeApiBase(location.origin || "");
    }
    return "";
  }

  function isSafeTarotApiBase(raw) {
    var base = normalizeApiBase(raw);
    if (!base) return false;
    try {
      var parsed = new URL(base);
      var host = String(parsed.hostname || "").toLowerCase();
      if (host === "localhost" || host === "127.0.0.1") return true;
      if (typeof window === "undefined") return false;
      // 앱(Capacitor WebView)은 출처가 https://localhost 라 아래 동일출처 비교가 항상 실패한다.
      // 빌드 주입 전역(CODE_DESTINY_API_BASE_URL)과 일치하는 base 는 안전으로 본다.
      var injectedBase = normalizeApiBase(window.CODE_DESTINY_API_BASE_URL || "");
      if (injectedBase && normalizeApiBase(parsed.origin || "") === injectedBase) return true;
      var sameOrigin = normalizeApiBase(location.origin || "");
      return normalizeApiBase(parsed.origin || "") === sameOrigin;
    } catch (e) {
      return false;
    }
  }

  function buildTarotApiBaseCandidates() {
    var out = [];
    var seen = Object.create(null);
    function add(raw) {
      var normalized = String(raw || "").trim();
      if (!normalized) normalized = "";
      else normalized = normalized.replace(/\/+$/, "");
      if (seen[normalized]) return;
      seen[normalized] = true;
      out.push(normalized);
    }

    // Always try same-origin API first (Cloudflare Pages/OpenNext safe path).
    add("");
    if (typeof window !== "undefined") {
      var sameOrigin = String(location.origin || "").replace(/\/+$/, "");
      if (sameOrigin) add(sameOrigin);
    }

    var runtimeBase = getRuntimeEnvApiBase();
    if (isSafeTarotApiBase(runtimeBase)) add(runtimeBase);
    var computedBase = getTarotApiBase();
    if (isSafeTarotApiBase(computedBase)) add(computedBase);

    if (typeof window !== "undefined") {
      var host = String(location.hostname || "").toLowerCase();
      if (host === "localhost" || host === "127.0.0.1") {
        add("http://localhost:3000");
        add("http://localhost:4000");
      }
    } else {
      add("http://localhost:3000");
      add("http://localhost:4000");
    }

    return out;
  }

  function postJsonWithTimeout(url, body, timeoutMs) {
    var effectiveTimeout = Number(timeoutMs) > 0 ? Number(timeoutMs) : TAROT_API_TIMEOUT_MS;
    var supportsAbort = typeof AbortController === "function";
    if (!supportsAbort) {
      return Promise.race([
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body,
          cache: "no-store",
        }),
        new Promise(function (_, reject) {
          setTimeout(function () {
            reject(new Error("Tarot API timeout"));
          }, effectiveTimeout);
        }),
      ]);
    }

    var controller = new AbortController();
    var timeoutId = setTimeout(function () {
      controller.abort();
    }, effectiveTimeout);

    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body,
      cache: "no-store",
      signal: controller.signal,
    })
      .catch(function (error) {
        if (error && error.name === "AbortError") {
          throw new Error("Tarot API timeout");
        }
        throw error;
      })
      .finally(function () {
        clearTimeout(timeoutId);
      });
  }

  function callTarotApi(endpoint, payload, timeoutMs) {
    var bases = buildTarotApiBaseCandidates();
    var primaryBase = bases.length ? bases[0] : "";
    var fallbackBases = bases.slice(1);
    var body = JSON.stringify(payload || {});

    function requestWithBase(base) {
      var url = (base ? base + "/api/tarot/" : "/api/tarot/") + endpoint;
      return postJsonWithTimeout(url, body, timeoutMs)
        .then(function (res) {
          if (!res.ok) {
            return res.text().catch(function () { return ""; }).then(function (rawBody) {
              throw createTarotApiError("Tarot API HTTP error: " + res.status, {
                status: res.status,
                statusText: res.statusText,
                endpoint: endpoint,
                base: base || "",
                url: url,
                responseBody: String(rawBody || "").slice(0, 500),
              });
            });
          }
          return res.json().catch(function (parseError) {
            throw createTarotApiError("Tarot API JSON parse error", {
              endpoint: endpoint,
              base: base || "",
              url: url,
              parseError: parseError && parseError.message ? parseError.message : String(parseError || ""),
            });
          });
        })
        .then(function (data) {
          if (!data || data.ok === false) {
            throw createTarotApiError("Invalid API response", {
              endpoint: endpoint,
              base: base || "",
              url: url,
              responseData: data,
            });
          }
          return data;
        });
    }

    function hasHttpStatus(error) {
      return !!(error && typeof error.status === "number");
    }
    // 401/403/400/422 등 결정적 4xx(429 제외)는 다른 base로 가거나 재시도해도 고쳐지지 않는다.
    function isNonRetryable(error) {
      var status = hasHttpStatus(error) ? error.status : 0;
      return status >= 400 && status < 500 && status !== 429;
    }
    // 503/5xx·429 = 서버가 일시적 과부하/DB 블립을 응답한 경우. 같은 엔드포인트를 짧은 백오프로
    // 재시도하면 서버 아이솔레이트/풀이 자가복구해 대개 성공한다(간헐 503을 사용자에게 안 보이게 흡수).
    function isTimeRetryable(error) {
      var status = hasHttpStatus(error) ? error.status : 0;
      return status === 429 || (status >= 500 && status < 600);
    }

    var MAX_ATTEMPTS = 3;
    var BACKOFF_MS = [400, 1000];

    function attempt(n) {
      return requestWithBase(primaryBase).catch(function (error) {
        if (isNonRetryable(error)) throw error;

        if (isTimeRetryable(error) && n + 1 < MAX_ATTEMPTS) {
          var delay = BACKOFF_MS[Math.min(n, BACKOFF_MS.length - 1)] + Math.floor(Math.random() * 200);
          logTarotApiDebug("transient_retry", {
            endpoint: endpoint,
            status: error.status,
            attempt: n + 1,
            maxAttempts: MAX_ATTEMPTS,
            delayMs: delay,
          });
          return waitMs(delay).then(function () { return attempt(n + 1); });
        }

        // 네트워크/타임아웃(HTTP 응답 없음) 또는 시간축 재시도 소진 시: 상대경로가 막혔을 수 있으니
        // 대체 origin을 1회만 시도(과거 base 폴백 의도 유지). 그래도 실패하면 원 에러를 던진다.
        if (fallbackBases.length) {
          return requestWithBase(fallbackBases[0]).catch(function () { throw error; });
        }
        throw error;
      });
    }

    return attempt(0).catch(function (error) {
      if (isNonRetryable(error)) {
        // 예상 범위의 결정적 실패(예: 401 로그인 필요) — 호출측이 처리한다. 조용히 debug만.
        logTarotApiDebug("request_rejected", { endpoint: endpoint, status: error.status });
      } else {
        logTarotApiGiveUp(endpoint, error);
      }
      throw error;
    });
  }

  function getAuthToken() {
    try {
      return localStorage.getItem("fortune_auth_token") || localStorage.getItem("cdToken") || "";
    } catch (e) {
      return "";
    }
  }

  function isLoveAdminLikeUser() {
    if (typeof window === "undefined") return false;
    try {
      if (String(sessionStorage.getItem("flower_admin_password_ok") || "") !== "1") return false;
    } catch (e) {
      return false;
    }
    try {
      var sTok = String(sessionStorage.getItem("flower_admin_token") || "");
      if (FLOWER_ADMIN_TOKEN_RE.test(sTok)) return true;
    } catch (e2) {}
    try {
      var lTok = String(localStorage.getItem("flower_admin_token") || "");
      if (FLOWER_ADMIN_TOKEN_RE.test(lTok)) return true;
    } catch (e3) {}
    return false;
  }

  function showCoinShortage(cost, reason) {
    try {
      if (typeof window.__cdOpenChargeModal === "function") {
        var copy = getTarotLoveCopy();
        window.alert("🪙 " + reason + "\n\n" + formatTarotLoveKrw(cost) + " " + copy.paymentRequired + "\n" + copy.openPayment);
        window.__cdOpenChargeModal();
        return;
      }
    } catch (e) {}
    window.location.href = "/points";
  }

  function consumeCoinDirect(cost, reason, featureKey, resume) {
    var requestId = "tarot-love:" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
    if (typeof window._cdOpenPaidServiceGate === "function") {
      return Promise.resolve(window._cdOpenPaidServiceGate({
        title: reason,
        reason: reason,
        coinPrice: cost,
        cost: cost,
        amountKrw: Math.max(0, Number(cost || 0)) * 100,
        amountKRW: Math.max(0, Number(cost || 0)) * 100,
        featureKey: featureKey,
        requestId: requestId,
        resume: resume || undefined,
      })).then(function(result) {
        rememberLoveCharge(result && result.transactionId, result && (result.payload || result));
        return !!(result && (result.status === "granted" || result.ok === true || result.payload));
      }).catch(function(error) {
        window.alert(String(error && error.message || getTarotLoveCopy().checkoutFailed));
        return false;
      }).finally(function() {
        if (typeof window._cdSetCoinGateOverlay === "function") window._cdSetCoinGateOverlay(false);
      });
    }

    window.alert(getTarotLoveCopy().gateUnavailable);
    return Promise.resolve(false);
  }

  function consumeMonthlyCredit(cost, reason, featureKey, requestId) {
    return consumeCoinDirect(cost, reason, featureKey || requestId);
  }

  // 결제 게이트 승인 콜백/응답에서 실제 차감 거래 id(PointHistory ObjectId)를 추출한다.
  // 환불 시 sourceTransactionId로 넘기면 서버가 featureKey 추정 없이 _id로 정확히 매칭한다.
  function extractLoveChargeTransactionId(transactionId, payload) {
    var data = payload && typeof payload === "object" ? payload : {};
    var billing = data.data && typeof data.data === "object" ? data.data : data;
    var consume = billing && billing.consume && typeof billing.consume === "object" ? billing.consume : {};
    var candidates = [
      transactionId,
      billing.transactionId,
      billing.pointHistoryId,
      billing._id,
      consume.transactionId,
      consume.pointHistoryId,
      consume._id,
    ];
    for (var i = 0; i < candidates.length; i += 1) {
      var id = String(candidates[i] || "").trim();
      if (/^[a-f0-9]{24}$/i.test(id)) return id;
    }
    return "";
  }

  function rememberLoveCharge(transactionId, payload) {
    state.lastChargeTransactionId = extractLoveChargeTransactionId(transactionId, payload);
  }

  function rollbackCoinBestEffort(cost, reason, featureKey) {
    var token = getAuthToken();
    var rollbackHeaders = {
      "Content-Type": "application/json",
    };
    if (token) rollbackHeaders.Authorization = "Bearer " + token;
    var sourceTransactionId = String(state.lastChargeTransactionId || "").trim();
    var requestId = "tarot-love-refund:" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
    // 정본 환불 라우트(/api/billing/refund → /api/fortune/pig-coin/refund 위임). 과거의
    // 과거 포인트 적립 경로는 사용하지 않고 정본 환불 경로만 호출한다.
    return fetch("/api/billing/refund", {
      method: "POST",
      headers: rollbackHeaders,
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        cost: cost,
        featureKey: featureKey,
        sourceTransactionId: sourceTransactionId || undefined,
        requestId: requestId,
        reason: ("자동 복구: " + reason).slice(0, 120),
      }),
    }).then(function (res) {
      return !!res && res.ok;
    }).catch(function () {
      return false;
    });
  }

  // resume: 결제 전 화면 상태를 담은 재개 서술자(모바일 리다이렉트 복귀용). 없으면 종전과 같다.
  function requireLoveAccess(resume) {
    if (isLoveAdminLikeUser()) {
      state.hasAccess = true;
      state.paymentInFlight = false;
      return Promise.resolve(true);
    }
    if (state.hasAccess) return Promise.resolve(true);
    if (state.paymentInFlight) return Promise.resolve(false);
    state.paymentInFlight = true;

    return new Promise(function (resolve) {
      function done(ok) {
        state.paymentInFlight = false;
        state.hasAccess = !!ok;
        resolve(!!ok);
      }

      if (typeof window._cdCoinGatePerUse === "function") {
        window._cdCoinGatePerUse(
          LOVE_COIN_COST,
          LOVE_REASON,
          function (transactionId, payload) { rememberLoveCharge(transactionId, payload); done(true); },
          function () { done(false); },
          resume ? { resume: resume } : undefined
        );
        return;
      }

      consumeCoinDirect(LOVE_COIN_COST, LOVE_REASON, LOVE_FEATURE_KEY, resume)
        .then(function (ok) { done(ok); })
        .catch(function () { done(false); });
    });
  }

  function createLocalRelationshipCards() {
    var deck = LOCAL_RELATIONSHIP_DECK.slice();
    var out = [];
    for (var i = 0; i < RELATIONSHIP_POSITIONS.length; i++) {
      if (!deck.length) break;
      var pickIndex = Math.floor(Math.random() * deck.length);
      var picked = deck.splice(pickIndex, 1)[0];
      out.push({
        cardId: picked.cardId,
        name: picked.name,
        nameKr: picked.nameKr,
        position: RELATIONSHIP_POSITIONS[i],
        orientation: Math.random() < 0.5 ? "upright" : "reversed",
      });
    }
    return out;
  }

  function normalizeRelationshipCard(raw, idx) {
    var card = raw && typeof raw === "object" ? raw : {};
    var position = RELATIONSHIP_POSITIONS[idx] || card.position || "position_1";
    var orientation = card.orientation === "reversed" ? "reversed" : "upright";
    var cardId = String(card.cardId || card.id || card.code || "").trim().toUpperCase();
    var name = card.name || card.title || card.enName || "";
    var nameKr = card.nameKr || card.name_kr || card.krName || card.titleKr || card.title_kr || "";

    if (!cardId) {
      var found = LOCAL_RELATIONSHIP_DECK.find(function (item) {
        if (!item) return false;
        var itemName = String(item.name || "").toLowerCase();
        var itemNameKr = String(item.nameKr || "").toLowerCase();
        var srcName = String(name || "").toLowerCase();
        var srcNameKr = String(nameKr || "").toLowerCase();
        return (srcName && itemName === srcName) || (srcNameKr && itemNameKr === srcNameKr);
      });
      if (found) {
        cardId = String(found.cardId || "").trim().toUpperCase();
        if (!name) name = found.name;
        if (!nameKr) nameKr = found.nameKr;
      }
    }

    if (!cardId) cardId = "M00";
    if (!name) name = "이름이 확인되지 않은 카드";
    if (!nameKr) nameKr = name;

    return {
      cardId: cardId,
      position: position,
      orientation: orientation,
      name: name,
      nameKr: nameKr,
      imageUrl: card.imageUrl || "",
      imageCandidates: Array.isArray(card.imageCandidates) ? card.imageCandidates : [],
      proxyImageUrl: card.proxyImageUrl || "",
      localImageUrl: card.localImageUrl || "",
    };
  }

  function normalizeRelationshipCards(cards) {
    var arr = Array.isArray(cards) ? cards : [];
    return arr.slice(0, 6).map(function (card, idx) {
      return normalizeRelationshipCard(card, idx);
    });
  }

  function createLocalRelationshipReading(cards) {
    var safeCards = normalizeRelationshipCards(cards);
    var positionFocusMap = {
      position_1: "내가 상대를 바라보는 기준이 관계의 온도를 바꿉니다.",
      position_2: "상대의 표현 속도와 마음의 깊이는 따로 읽어야 합니다.",
      position_3: "카드가 비추는 감정 온도보다 반복되는 행동이 더 분명한 신호입니다.",
      position_4: "연애 의지는 뜨거움보다 꾸준함으로 드러납니다.",
      position_5: "막힘은 감정 부족보다 서로 다른 표현 방식에서 시작될 수 있습니다.",
      position_6: "관계의 다음 장은 지금의 대화와 거리 조절에 따라 달라집니다.",
    };
    var breakdown = safeCards.map(function (card, idx) {
      var label = POSITION_LABELS[card.position] || ("포지션 " + String(idx + 1));
      var cardName = (card.nameKr || card.name || "타로 카드") + (card.orientation === "reversed" ? " (역)" : "");
      var orientSummary = card.orientation === "reversed"
        ? "역방향은 서두른 판단보다 사실 확인과 거리 조절이 필요하다는 신호입니다."
        : "정방향은 작은 약속과 진심 어린 표현이 관계 온도를 안정시킨다는 신호입니다.";
      var summary = (positionFocusMap[card.position] || "현재 포지션의 신호를 차분한 행동으로 옮기는 것이 핵심입니다.") + " " + orientSummary;
      return { title: label, card: cardName, summary: summary };
    });

    return {
      overallVibe: "지금 두 사람 사이에는 끌림과 조심스러움이 함께 흐릅니다. 감정의 크기보다 마음을 전하는 방식이 관계의 온도를 바꾸는 때입니다. 이 흐름은 정해진 결말이 아니라, 대화의 태도와 서로의 선을 존중하는 방식에 따라 더 따뜻하게 달라질 수 있습니다.",
      deepReading: "핵심은 확신의 부족보다 표현의 타이밍입니다. 상대의 반응을 시험하기보다, 내 마음을 간결하고 구체적으로 전할 때 긴장이 풀리고 신뢰가 쌓입니다. 불안이 올라올수록 추측을 키우기보다 확인한 사실을 중심으로 대화를 이어가 보세요.",
      realityAndFuture: "가까운 흐름에서는 속도 조절이 필요합니다. 중요한 마음을 확인하더라도 결론을 서두르기보다 대화의 기준을 먼저 맞춰야 관계의 방향이 선명해집니다. 불필요한 추측을 줄이고 작은 약속을 지키는 반복이 생기면, 두 사람의 관계는 안정된 결로 이동할 수 있습니다.",
      positionBreakdown: breakdown,
      advice: [
        "상대의 말보다 말투와 반응 속도 같은 비언어 신호를 함께 보세요.",
        "오늘 안에 결론 내리기보다 1~2번의 대화 텀을 두고 확인하세요.",
        "질문은 추궁형보다 확인형으로 바꿔 보세요. 예: '왜 그래?' 대신 '내가 이렇게 이해했는데 맞아?'",
        "불안한 날일수록 연락 빈도를 늘리기보다, 짧고 진심 있는 한 번의 대화를 목표로 하세요.",
        "관계의 결과를 붙잡기 전에 내 컨디션(수면/식사/일상 루틴)을 먼저 안정시키세요. 마음이 안정될수록 선택이 정확해집니다.",
      ],
    };
  }

  var TAROT_LOCAL_BASES = ["/tarot-cards/", "tarot-cards/"];
  var TAROT_LOCAL_BASE = TAROT_LOCAL_BASES[0];
  var TAROT_CDN_BASE = "https://cdn.jsdelivr.net/gh/krates98/tarotcardapi@main/images/";
  var TAROT_DEFAULT_FALLBACK_IMAGE = TAROT_LOCAL_BASE + "thefool.jpeg";
  function getLocalTarotImageUrl(card) {
    if (!card) return "";
    var cardId = String(card.cardId || card.id || "").trim().toUpperCase();
    var map = {
      M00: "thefool.jpeg", M01: "themagician.jpeg", M02: "thehighpriestess.jpeg", M03: "theempress.jpeg",
      M04: "theemperor.jpeg", M05: "thehierophant.jpeg", M06: "TheLovers.jpg", M07: "thechariot.jpeg",
      M08: "thestrength.jpeg", M09: "thehermit.jpeg", M10: "wheeloffortune.jpeg", M11: "justice.jpeg",
      M12: "thehangedman.jpeg", M13: "death.jpeg", M14: "temperance.jpeg", M15: "thedevil.jpeg",
      M16: "thetower.jpeg", M17: "thestar.jpeg", M18: "themoon.jpeg", M19: "thesun.jpeg",
      M20: "judgement.jpeg", M21: "theworld.jpeg",
      W01: "aceofwands.jpeg", W02: "twoofwands.jpeg", W03: "threeofwands.jpeg", W04: "fourofwands.jpeg",
      W05: "fiveofwands.jpeg", W06: "sixofwands.jpeg", W07: "sevenofwands.jpeg", W08: "eightofwands.jpeg",
      W09: "nineofwands.jpeg", W10: "tenofwands.jpeg", W11: "pageofwands.jpeg", W12: "knightofwands.jpeg",
      W13: "queenofwands.jpeg", W14: "kingofwands.jpeg",
      C01: "aceofcups.jpeg", C02: "twoofcups.jpeg", C03: "threeofcups.jpeg", C04: "fourofcups.jpeg",
      C05: "fiveofcups.jpeg", C06: "sixofcups.jpeg", C07: "sevenofcups.jpeg", C08: "eightofcups.jpeg",
      C09: "nineofcups.jpeg", C10: "tenofcups.jpeg", C11: "pageofcups.jpeg", C12: "knightofcups.jpeg",
      C13: "queenofcups.jpeg", C14: "kingofcups.jpeg",
      S01: "aceofswords.jpeg", S02: "twoofswords.jpeg", S03: "threeofswords.jpeg", S04: "fourofswords.jpeg",
      S05: "fiveofswords.jpeg", S06: "sixofswords.jpeg", S07: "sevenofswords.jpeg", S08: "eightofswords.jpeg",
      S09: "nineofswords.jpeg", S10: "tenofswords.jpeg", S11: "pageofswords.jpeg", S12: "knightofswords.jpeg",
      S13: "queenofswords.jpeg", S14: "kingofswords.jpeg",
      P01: "aceofpentacles.jpeg", P02: "twoofpentacles.jpeg", P03: "threeofpentacles.jpeg", P04: "fourofpentacles.jpeg",
      P05: "fiveofpentacles.jpeg", P06: "sixofpentacles.jpeg", P07: "sevenofpentacles.jpeg", P08: "eightofpentacles.jpeg",
      P09: "nineofpentacles.jpeg", P10: "tenofpentacles.jpeg", P11: "pageofpentacles.jpeg", P12: "knightofpentacles.jpeg",
      P13: "queenofpentacles.jpeg", P14: "kingofpentacles.jpeg",
    };
    var fn = cardId ? map[cardId] : "";
    if (fn) return TAROT_LOCAL_BASE + fn;
    var hinted = String(card.localImageUrl || "").trim();
    return hinted || "";
  }

  function getLocalTarotImageCandidates(card) {
    var localUrl = getLocalTarotImageUrl(card);
    if (!localUrl) return [];
    var fileName = String(localUrl).split("/").pop();
    if (!fileName) return [localUrl];
    return TAROT_LOCAL_BASES.map(function (base) {
      return String(base || "") + fileName;
    });
  }
  function rankToWord(rank) {
    var map = {
      A: "ace",
      "1": "ace",
      "2": "two",
      "3": "three",
      "4": "four",
      "5": "five",
      "6": "six",
      "7": "seven",
      "8": "eight",
      "9": "nine",
      "10": "ten",
      P: "page",
      N: "knight",
      Q: "queen",
      K: "king",
      Ace: "ace",
      Two: "two",
      Three: "three",
      Four: "four",
      Five: "five",
      Six: "six",
      Seven: "seven",
      Eight: "eight",
      Nine: "nine",
      Ten: "ten",
      Page: "page",
      Knight: "knight",
      Queen: "queen",
      King: "king",
    };
    return map[String(rank || "").trim()] || "";
  }

  function getTarotImageUrl(card) {
    var local = getLocalTarotImageUrl(card);
    if (local) return local;
    var raw = String(card.name || "").trim();
    var key = raw.replace(/\s/g, "").toLowerCase();
    if (key) {
      if (key === "thelovers") return TAROT_CDN_BASE + "TheLovers.jpg";
      if (key === "strength") key = "thestrength";
      return TAROT_CDN_BASE + key + ".jpeg";
    }
    var suit = String(card.suit || "").trim().toLowerCase();
    var rankWord = rankToWord(card.rank);
    if (suit && rankWord) return TAROT_CDN_BASE + rankWord + "of" + suit + ".jpeg";
    return "";
  }

  function normalizeTarotShortName(cardName) {
    var raw = String(cardName || "").trim();
    if (!raw) return "";
    var words = raw
      .replace(/[^A-Za-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    if (!words.length) return "";
    return words
      .map(function (w) {
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      })
      .join("");
  }

  function getTarotImageCandidatesByName(cardName) {
    var short = normalizeTarotShortName(cardName);
    if (!short) return [];
    var compact = short.replace(/\s+/g, "");
    var variants = [compact.toLowerCase(), short, compact];
    if (compact.toLowerCase() === "thelovers") variants = ["TheLovers", "thelovers", short, compact];
    var extPriority = compact.toLowerCase() === "thelovers"
      ? [".jpg", ".jpeg", ".png", ".webp"]
      : [".jpeg", ".jpg", ".png", ".webp"];
    var cdnBase = "https://cdn.jsdelivr.net/gh/krates98/tarotcardapi@main/images/";
    var rawBase = "https://raw.githubusercontent.com/krates98/tarotcardapi/main/images/";
    var out = [];
    var seen = Object.create(null);
    [cdnBase, rawBase].forEach(function (base) {
      variants.forEach(function (name) {
        extPriority.forEach(function (ext) {
          var url = base + name + ext;
          if (!seen[url]) {
            seen[url] = true;
            out.push(url);
          }
        });
      });
    });
    return out;
  }

  function buildTarotImageCandidates(card) {
    var list = [];
    var seen = Object.create(null);
    function add(url) {
      var normalized = String(url || "").trim();
      if (!normalized || seen[normalized]) return;
      seen[normalized] = true;
      list.push(normalized);
    }
    function addVariants(url) {
      var raw = String(url || "").trim();
      if (!raw) return;
      add(raw);
      if (/^https?:\/\//i.test(raw)) return;
      if (raw.charAt(0) === "/") add(raw.slice(1));
      else add("/" + raw);
    }
    function absolutize(url) {
      var raw = String(url || "").trim();
      if (!raw) return "";
      if (/^https?:\/\//i.test(raw)) return raw;
      var base = getTarotApiBase();
      if (!base) return raw;
      return String(base).replace(/\/+$/, "") + (raw.charAt(0) === "/" ? raw : "/" + raw);
    }

    if (card) {
      getLocalTarotImageCandidates(card).forEach(function (url) { addVariants(url); });
      addVariants(card.localImageUrl);
      if (card.proxyImageUrl) {
        addVariants(absolutize(card.proxyImageUrl));
        addVariants(card.proxyImageUrl);
      }
      if (Array.isArray(card.imageCandidates)) {
        card.imageCandidates.forEach(function (url) { addVariants(url); });
      }
      addVariants(card.imageUrl);
    }

    addVariants(getTarotImageUrl(card));
    if (card && card.name) {
      getTarotImageCandidatesByName(card.name).forEach(function (url) { add(url); });
    }
    return list;
  }

  function applyTarotImageWithFallback(imgEl, frontEl, card) {
    if (!imgEl) return;
    var candidates = buildTarotImageCandidates(card).filter(Boolean);
    if (!candidates.length) return;
    var index = 0;
    imgEl.referrerPolicy = "no-referrer";
    imgEl.decoding = "async";
    function tryNext() {
      if (index >= candidates.length) {
        imgEl.onerror = null;
        if (imgEl.src !== TAROT_DEFAULT_FALLBACK_IMAGE) {
          imgEl.src = TAROT_DEFAULT_FALLBACK_IMAGE;
        }
        return;
      }
      var url = candidates[index++];
      if (frontEl) {
        frontEl.style.backgroundImage = "url('" + url + "')";
        frontEl.style.backgroundSize = "cover";
        frontEl.style.backgroundPosition = "center";
      }
      imgEl.onload = function () {
        if (frontEl) {
          frontEl.style.backgroundImage = "none";
        }
      };
      imgEl.onerror = tryNext;
      imgEl.src = url;
    }
    tryNext();
  }

  function ensureLoveFrontImage(cardEl, card) {
    if (!cardEl) return;
    var front = cardEl.querySelector(".tarot-love-card-front");
    var img = front ? front.querySelector(".tarot-face-img") : null;
    if (!img) return;
    if (!img.getAttribute("src") || !img.complete || !img.naturalWidth) {
      applyTarotImageWithFallback(img, front, card || null);
    }
  }

  function openTarotLoveModal() {
    var overlay = byId("tarotLoveOverlay");
    if (!overlay) return;
    overlay.style.display = "block";
    overlay.classList.add("is-open");
    if (window._perf && window._perf.lockBody) window._perf.lockBody();
    else document.body.style.overflow = "hidden";
    resetTarotLoveFlow();
    triggerSubtitleTypewriter();
  }

  function triggerSubtitleTypewriter() {
    var el = byId("tarotLoveSubtitle");
    if (!el) return;
    el.style.animation = "none";
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.style.animation = "subtitleFadeIn 1.2s ease 0.3s both"; }); });
  }

  function closeTarotLoveModal() {
    var overlay = byId("tarotLoveOverlay");
    if (!overlay) return;
    overlay.style.display = "none";
    overlay.classList.remove("is-open");
    flowSeq++;
    state.hasAccess = false;
    state.paymentInFlight = false;
    state.readingPromise = null;
    state.readingResult = null;
    if (window._perf && window._perf.unlockBody) window._perf.unlockBody();
    else document.body.style.overflow = "";
  }

  function resetTarotLoveFlow() {
    flowSeq++;
    state.cards = [];
    state.revealedCount = 0;
    state.reading = null;
    state.hasAccess = false;
    state.paymentInFlight = false;
    state.readingPromise = null;
    state.readingResult = null;

    var intro = byId("tarotLoveIntroStage");
    var draw = byId("tarotLoveDrawStage");
    var result = byId("tarotLoveResultStage");
    var strip = byId("tarotLoveResultCardsStrip");
    var promptPanel = byId("tarotLoveAiPromptPanel");
    if (intro) intro.classList.add("is-active");
    if (draw) draw.classList.remove("is-active");
    if (result) result.classList.remove("is-active");
    if (strip) strip.innerHTML = "";
    if (promptPanel) promptPanel.remove();
  }

  function startTarotLoveReading() {
    var intro = byId("tarotLoveIntroStage");
    var draw = byId("tarotLoveDrawStage");
    if (!intro || !draw) return;

    var seq = ++flowSeq;
    var panel = document.querySelector(".tarot-love-panel");
    if (panel) panel.classList.add("ritual-burst");

    // 클릭 즉시 로컬 덱으로 뽑아 화면을 전환한다 — 서버 draw 왕복(비로그인 401 재시도 포함)을 기다리지 않는다.
    state.cards = normalizeRelationshipCards(createLocalRelationshipCards());
    state.revealedCount = 0;
    state.readingPromise = null;
    state.readingResult = null;
    intro.classList.remove("is-active");
    draw.classList.add("is-active");
    renderTarotLoveCards();
    updateTarotLoveSpreadGuide();
    var btn = byId("tarotLoveFinalBtn");
    if (btn) btn.disabled = true;
    if (panel) {
      setTimeout(function () { panel.classList.remove("ritual-burst"); }, 800);
    }

    // 서버 78장 덱은 백그라운드로 받아, 아직 카드를 한 장도 뒤집기 전이면 교체한다(전부 뒷면이라 시각 변화 없음).
    callTarotApi("draw", { spreadType: "relationship_six_card" })
      .then(function (data) {
        if (seq !== flowSeq || state.revealedCount > 0) return;
        var normalizedCards = normalizeRelationshipCards(data.cards);
        if (normalizedCards.length !== 6) return;
        state.cards = normalizedCards;
        renderTarotLoveCards();
        updateTarotLoveSpreadGuide();
      })
      .catch(function (err) {
        // 로컬 카드로 이미 진행 중이므로 조용히 무시한다.
        console.error("Tarot Love draw error:", err);
      });
  }

  function renderTarotLoveCards() {
    var grid = byId("tarotLoveCardGrid");
    if (!grid) return;

    grid.innerHTML = "";
    (DISPLAY_ORDER || [0, 1, 2, 3, 4, 5]).forEach(function (idx) {
      var card = state.cards[idx];
      if (!card) return;
      var slot = document.createElement("div");
      slot.className = "tarot-love-slot";
      slot.setAttribute("data-slot-index", idx);

      var label = document.createElement("span");
      label.className = "tarot-love-slot-label";
      label.textContent = POSITION_LABELS[card.position] || card.position;

      var cardEl = document.createElement("div");
      cardEl.className = "tarot-love-card oracle-card-m";
      cardEl.setAttribute("data-action", "flipTarotLoveCard");
      cardEl.setAttribute("data-action-args", idx);
      cardEl.setAttribute("data-revealed", "0");

      var back = document.createElement("div");
      back.className = "tarot-love-card-back oracle-back-m";

      var front = document.createElement("div");
      front.className = "tarot-love-card-front oracle-front-m";
      if (card.orientation === "reversed") front.setAttribute("data-reversed", "1");

      var img = document.createElement("img");
      img.className = "tarot-face-img";
      img.alt = (card.nameKr || card.name || "").trim() || getTarotLoveCopy().tarotCardAlt;
      img.loading = "lazy";
      img.decoding = "async";
      try {
        img.fetchPriority = idx === state.revealedCount ? "high" : "low";
      } catch (e) {}
      img.referrerPolicy = "no-referrer";
      applyTarotImageWithFallback(img, front, card);
      front.appendChild(img);

      var nameSpan = document.createElement("span");
      nameSpan.className = "tarot-love-card-name";
      nameSpan.textContent = (card.nameKr || card.name || "").trim();
      if (card.orientation === "reversed") nameSpan.textContent += getTarotLoveCopy().reversedSuffix;
      front.appendChild(nameSpan);

      cardEl.appendChild(back);
      cardEl.appendChild(front);
      slot.appendChild(label);
      slot.appendChild(cardEl);
      grid.appendChild(slot);
    });
  }

  function updateTarotLoveSpreadGuide() {
    var guide = byId("tarotLoveSpreadGuide");
    if (!guide) return;
    var step = state.revealedCount;
    if (step >= 6) {
      guide.textContent = getTarotLoveCopy().allCardsRevealed;
      updateGuideNextEffect();
      return;
    }
    var order = GUIDE_ORDER || [0, 1, 2, 3, 4, 5];
    var cardIdx = order[step];
    var card = state.cards[cardIdx];
    var posLabel = card ? (POSITION_LABELS[card.position] || card.position) : "";
    guide.textContent = getTarotLoveCopy().flipGuidePrefix + posLabel + getTarotLoveCopy().flipGuideSuffix;
    updateGuideNextEffect();
  }

  function updateGuideNextEffect() {
    var grid = byId("tarotLoveCardGrid");
    if (!grid) return;
    var step = state.revealedCount;
    var order = GUIDE_ORDER || [0, 1, 2, 3, 4, 5];
    var nextCardIdx = step < 6 ? order[step] : -1;
    grid.querySelectorAll(".tarot-love-slot").forEach(function (slot) {
      var slotIdx = slot.getAttribute("data-slot-index");
      if (nextCardIdx >= 0 && String(slotIdx) === String(nextCardIdx)) {
        slot.classList.add("guide-next");
      } else {
        slot.classList.remove("guide-next");
      }
    });
  }

  function flipTarotLoveCard(idx) {
    idx = parseInt(idx, 10);
    if (isNaN(idx) || idx < 0 || idx >= 6) return;
    var order = GUIDE_ORDER || [0, 1, 2, 3, 4, 5];
    var expectedIdx = order[state.revealedCount];
    if (idx !== expectedIdx) return;
    var grid = byId("tarotLoveCardGrid");
    var cardEl = grid ? grid.querySelector('.tarot-love-slot[data-slot-index="' + idx + '"] .tarot-love-card') : null;
    if (!cardEl || cardEl.getAttribute("data-revealed") === "1") return;

    cardEl.setAttribute("data-revealed", "1");
    cardEl.classList.add("flipped");
    ensureLoveFrontImage(cardEl, state.cards[idx]);

    state.revealedCount++;
    // 첫 장을 뒤집는 순간 카드가 확정되므로(서버 덱 교체는 미플립 상태에서만),
    // 결제 진행과 겹치도록 리딩 생성을 미리 시작해 결제 후 대기를 줄인다.
    if (state.revealedCount === 1) prefetchTarotLoveReading();
    updateTarotLoveSpreadGuide();

    if (state.revealedCount >= 6) {
      var btn = byId("tarotLoveFinalBtn");
      if (btn) btn.disabled = false;
    }
  }

  /* ── 결제 후 자동 재개(모바일 리다이렉트 복귀) ──────────────────────────────────
     🔴 모바일 PortOne 은 상위 프레임을 리다이렉트하므로 requireLoveAccess 의 await 가 페이지와 함께
     죽고, 복귀 후에는 _runTarotLoveFinalReading 이 영영 실행되지 않는다 — "결제했는데 메인 화면"의
     정체다. 뽑은 6장은 state.cards 안에만 있어 새 문서에서 재현할 수 없으므로 결제 직전에 서술자로
     굳혀 둔다. 🔴 args 에는 원시값만 살아남으므로(checkout-entry 의 sanitizePaidResumeDescriptor)
     카드 배열은 JSON 문자열 한 칸에 담는다. 정본 예시: js/saju-engine-tarot-sukuyo-quantum.js 의
     syBuildCompatResumeDescriptor ~ syRunCompatResume. */
  var LOVE_RESUME_KIND = "tarot-love-final";
  var LOVE_RESUME_WAIT_MS = 8000;
  var LOVE_RESUME_POLL_MS = 200;

  function loveCheckoutEntry() {
    try { return window.__cdCheckoutEntry || null; } catch (e) { return null; }
  }

  function buildLoveResumeDescriptor() {
    if (typeof document === "undefined") return null;
    if (!state.cards || state.cards.length !== 6) return null;
    var packed = "";
    // 직렬화가 실패하면 서술자 없이 보낸다 — 복귀 처리가 '지금 열기' 카드로 떨어뜨린다.
    try { packed = JSON.stringify(normalizeRelationshipCards(state.cards)); } catch (e) { return null; }
    if (!packed) return null;
    return {
      kind: LOVE_RESUME_KIND,
      // 셸의 기존 딥링크(index-inline-runtime 의 __cdLazyActionLoaders). 새 라우팅을 만들지 않는다.
      action: "openTarotLoveModal",
      args: { cards: packed },
    };
  }

  // 오버레이는 runPaidResume 의 딥링크가 연다(이 스크립트는 지연 로드라 그때 함께 불려온다).
  function waitForLoveOverlay(limitMs) {
    return new Promise(function (resolve) {
      var deadline = Date.now() + limitMs;
      (function poll() {
        var overlay = byId("tarotLoveOverlay");
        if (overlay && overlay.classList.contains("is-open")) { resolve(true); return; }
        if (Date.now() >= deadline) { resolve(false); return; }
        setTimeout(poll, LOVE_RESUME_POLL_MS);
      })();
    });
  }

  /* 🔴 여기서 모달을 다시 열지 않는다 — 표면을 여는 책임은 checkout-entry 의 runPaidResume 하나다.
     여기서 또 열면 이중 이동이 되어 재개가 통째로 날아간다. */
  function runLoveResume(descriptor) {
    var args = (descriptor && descriptor.args && typeof descriptor.args === "object") ? descriptor.args : {};
    var restored = null;
    try { restored = JSON.parse(String(args.cards || "")); } catch (e) { restored = null; }
    if (!restored || !restored.length) return false;
    return waitForLoveOverlay(LOVE_RESUME_WAIT_MS).then(function (ready) {
      // 모달이 끝내 안 열리면 false — 복귀 처리(destiny-profile)가 '지금 열기' 카드를 그린다.
      if (!ready) return false;
      // openTarotLoveModal 이 resetTarotLoveFlow 로 intro 를 켜 둔 상태다. 결과 스테이지와 함께
      // 켜지지 않도록 여기서 내린다(정상 흐름에서는 startTarotLoveReading 이 하는 일).
      var intro = byId("tarotLoveIntroStage");
      if (intro) intro.classList.remove("is-active");
      state.cards = normalizeRelationshipCards(restored);
      state.revealedCount = state.cards.length;
      state.readingPromise = null;
      state.readingResult = null;
      // 🔴 결제는 이미 끝났다 — 게이트를 다시 타는 showTarotLoveFinalReading 이 아니라 코어를
      //    직접 부른다(재결제 방지).
      state.hasAccess = true;
      _runTarotLoveFinalReading();
      return true;
    });
  }

  (function registerLoveResumeHandler() {
    var entry = loveCheckoutEntry();
    if (!entry || typeof entry.registerPaidResumeHandler !== "function") return;
    try { entry.registerPaidResumeHandler(LOVE_RESUME_KIND, runLoveResume); } catch (e) {}
  })();

  function showTarotLoveFinalReading() {
    if (state.revealedCount < 6 || !state.cards.length) return;
    // 결제 전에 뽑은 카드를 서술자로 굳혀 둔다 — 복귀 페이지는 이 값 없이는 재현할 수 없다.
    requireLoveAccess(buildLoveResumeDescriptor()).then(function (ok) {
      if (!ok) return;
      _runTarotLoveFinalReading();
    });
  }

  function requestTarotLoveReading() {
    var normalizedCards = normalizeRelationshipCards(state.cards);
    state.cards = normalizedCards;
    var drawnForApi = normalizedCards.map(function (c) {
      return {
        cardId: c.cardId,
        position: c.position,
        orientation: c.orientation,
      };
    });

    return callTarotApi("love-reading", {
      cards: drawnForApi,
      locale: getTarotLoveLocale(),
    }, TAROT_READING_API_TIMEOUT_MS).then(function (data) {
      if (!data.reading) throw new Error("No reading data");
      return data;
    });
  }

  // 결제 전 프리페치 — 실패해도 alert·롤백 없이 조용히 버리고, 결제 승인 시점에 새 요청으로 재시도된다.
  function prefetchTarotLoveReading() {
    if (state.readingPromise || state.readingResult) return;
    // 비로그인 상태에서는 love-reading이 인증(requireAuth)에서 401로 확정 실패하므로 프리페치하지 않는다.
    // 결제 후 인증된 상태에서 _runTarotLoveFinalReading가 정식 요청한다(지연 단축 이점은 로그인 유저에게 유지).
    if (!getAuthToken()) return;
    var seq = flowSeq;
    var promise = requestTarotLoveReading().then(function (data) {
      if (seq === flowSeq) state.readingResult = data;
      return data;
    });
    promise.catch(function () {
      // 비로그인 401 등 결제 전 실패는 삼킨다(unhandled rejection 방지). 소비는 _run 쪽 catch가 담당.
      if (seq === flowSeq && state.readingPromise === promise) state.readingPromise = null;
    });
    state.readingPromise = promise;
  }

  var tarotLoveLoadingTimer = null;
  function stopTarotLoveLoadingCycle() {
    if (tarotLoveLoadingTimer) {
      clearInterval(tarotLoveLoadingTimer);
      tarotLoveLoadingTimer = null;
    }
  }

  function renderTarotLoveLoading() {
    var container = byId("tarotLoveReadingContent");
    if (!container) return;
    stopTarotLoveLoadingCycle();
    var copy = getTarotLoveCopy();
    var stages = (copy.loadingStages && copy.loadingStages.length) ? copy.loadingStages : [copy.loadingTitle];
    var cardCount = (state.cards && state.cards.length) ? state.cards.length : 6;
    var cardsHtml = "";
    for (var i = 0; i < cardCount; i++) {
      cardsHtml += '<span class="tarot-love-loading-card" style="--tl-i:' + i + '"></span>';
    }
    container.innerHTML =
      '<div class="tarot-love-loading" role="status" aria-live="polite">' +
      '<div class="tarot-love-loading-cards" aria-hidden="true">' + cardsHtml + '</div>' +
      '<span class="tarot-love-loading-orb" aria-hidden="true"></span>' +
      '<p class="tarot-love-loading-title" data-tl-stage>' + escapeHtml(stages[0]) + '</p>' +
      '<p class="tarot-love-loading-sub">' + escapeHtml(copy.loadingSub) + '</p>' +
      '<div class="tarot-love-loading-bar" aria-hidden="true"><span></span></div>' +
      '</div>';

    if (stages.length > 1) {
      var idx = 0;
      tarotLoveLoadingTimer = setInterval(function () {
        var titleEl = container.querySelector("[data-tl-stage]");
        // 결과/에러로 innerHTML이 교체되면 요소가 사라지므로 사이클을 정리한다.
        if (!titleEl || (typeof document !== "undefined" && document.body && !document.body.contains(titleEl))) {
          stopTarotLoveLoadingCycle();
          return;
        }
        idx = (idx + 1) % stages.length;
        titleEl.classList.add("is-fading");
        setTimeout(function () {
          if (typeof document !== "undefined" && document.body && !document.body.contains(titleEl)) return;
          titleEl.textContent = stages[idx];
          titleEl.classList.remove("is-fading");
        }, 260);
      }, 2600);
    }
  }

  function _runTarotLoveFinalReading() {
    if (!state.hasAccess) {
      window.alert("결제가 확인되지 않아 결과를 표시할 수 없습니다.");
      return;
    }

    var seq = flowSeq;
    var draw = byId("tarotLoveDrawStage");
    var result = byId("tarotLoveResultStage");
    // 결제 확인 즉시 결과 스테이지로 전환하고, 생성이 끝날 때까지 로딩 상태를 보여준다.
    if (draw) draw.classList.remove("is-active");
    if (result) result.classList.add("is-active");
    renderTarotLoveLoading();

    var pending;
    if (state.readingResult) {
      pending = Promise.resolve(state.readingResult);
    } else if (state.readingPromise) {
      // 프리페치가 진행 중이면 그대로 기다리고, 늦게 실패하면(비로그인 401 등) 로그인된 현재 상태로 한 번 새로 요청한다.
      pending = state.readingPromise.catch(function () {
        return requestTarotLoveReading();
      });
    } else {
      pending = requestTarotLoveReading();
    }

    pending
      .then(function (data) {
        if (seq !== flowSeq) return;
        stopTarotLoveLoadingCycle();
        state.reading = data.reading;
        renderTarotLoveResult();
      })
      .catch(function (err) {
        stopTarotLoveLoadingCycle();
        console.error("Tarot Love reading error:", err);
        if (seq === flowSeq) {
          var draw2 = byId("tarotLoveDrawStage");
          var result2 = byId("tarotLoveResultStage");
          var container = byId("tarotLoveReadingContent");
          if (result2) result2.classList.remove("is-active");
          if (draw2) draw2.classList.add("is-active");
          if (container) container.innerHTML = "";
        }

        rollbackCoinBestEffort(LOVE_COIN_COST, LOVE_REASON, LOVE_FEATURE_KEY).then(function (rolledBack) {
          state.hasAccess = false;
          if (rolledBack) {
            window.alert("해석 생성 오류가 발생해 결제 금액을 복구했습니다. 다시 시도해 주세요.");
          } else {
            window.alert("해석 생성 중 오류가 발생했습니다. 결과 페이지 진입이 차단되었습니다. 잠시 후 다시 시도해 주세요.");
          }
        });
      });
  }

  function removeRepeatedSentencesForUi(text) {
    var sentences = String(text || "")
      .split(/(?<=[.!?。！？]|입니다\.|세요\.|합니다\.)\s+/)
      .map(function (s) { return String(s || "").trim(); })
      .filter(Boolean);

    var seen = Object.create(null);
    var result = [];
    sentences.forEach(function (sentence) {
      var normalized = sentence
        .replace(/\s+/g, " ")
        .replace(/[“”"']/g, "")
        .trim();
      if (!normalized || seen[normalized]) return;
      seen[normalized] = true;
      result.push(sentence);
    });
    return result.join(" ");
  }

  var FORBIDDEN_RESULT_PATTERNS = [
    /카드\(정방향\)의\s*포지션\s*핵심\s*의미는/gi,
    /카드\(역방향\)의\s*포지션\s*핵심\s*의미는/gi,
    /입니다\.\s*이\s*포지션의\s*메시지는/gi,
    /포지션\s*핵심\s*의미/gi,
    /카드가\s*가리키는\s*장애물/gi,
    /한\s*번에\s*한\s*가지씩\s*해결하세요/gi,
  ];

  function cleanRelationshipResultText(input) {
    var out = String(input || "").trim();
    if (!out) return "";
    FORBIDDEN_RESULT_PATTERNS.forEach(function (pattern) {
      out = out.replace(pattern, "");
    });
    out = out
      .replace(/상대의\s*실제\s*감정\s*온도/g, "카드가 비춘 감정 온도")
      .replace(/상대의\s*실제\s*감정/g, "카드가 비춘 감정")
      .replace(/단기\s*결말/g, "가까운 흐름과 선택 기준")
      .replace(/결말을\s*결정/g, "흐름의 온도를 바꾸")
      .replace(/결과\s*곡선/g, "관계의 온도")
      .replace(/고정값/g, "확정된 답");
    out = removeRepeatedSentencesForUi(out);
    out = out.replace(/\s{2,}/g, " ").trim();
    return out;
  }

  function normalizePositionReadingItem(item, idx) {
    var src = item && typeof item === "object" ? item : {};
    var fallbackTitle = RELATIONSHIP_POSITIONS[idx] || ("position_" + String(idx + 1));
    var positionTitle = String(src.positionTitle || src.title || POSITION_LABELS[fallbackTitle] || ("포지션 " + String(idx + 1))).trim();
    var cardName = String(src.cardName || src.card || "").trim();
    var orientationLabel = String(src.orientationLabel || "").trim();

    if (!orientationLabel && /역방향|\(역\)/.test(cardName)) orientationLabel = "역방향";
    if (!orientationLabel) orientationLabel = "정방향";
    cardName = cardName.replace(/\s*[·|]\s*(정방향|역방향)$/, "").replace(/\((정|역)\)$/, "").trim();
    if (!cardName) cardName = "이름이 확인되지 않은 카드";

    return {
      positionTitle: positionTitle,
      cardName: cardName,
      orientationLabel: orientationLabel,
      headline: cleanRelationshipResultText(src.headline || src.summary || ""),
      summary: cleanRelationshipResultText(src.summary || src.headline || ""),
      detail: cleanRelationshipResultText(src.detail || src.summary || ""),
      relationshipInsight: cleanRelationshipResultText(src.relationshipInsight || ""),
      advice: cleanRelationshipResultText(src.advice || ""),
      caution: cleanRelationshipResultText(src.caution || ""),
    };
  }

  function normalizeFinalAdvice(rawFinalAdvice, adviceList) {
    var src = rawFinalAdvice && typeof rawFinalAdvice === "object" ? rawFinalAdvice : {};
    return {
      instantMission: cleanRelationshipResultText(src.instantMission || adviceList[0] || "상대의 반응을 추측하기보다 최근에 반복된 행동 3가지를 조용히 정리해 보세요."),
      conversationTip: cleanRelationshipResultText(src.conversationTip || adviceList[1] || "왜 그랬어?보다 나는 이렇게 느꼈고, 네 생각도 듣고 싶어라는 문장으로 대화의 문을 여세요."),
      relationshipBoundary: cleanRelationshipResultText(src.relationshipBoundary || adviceList[2] || "답장 속도만으로 관계를 단정하지 말고, 반복되는 약속 회피처럼 확인 가능한 행동을 기준으로 삼으세요."),
      nextSevenDays: cleanRelationshipResultText(src.nextSevenDays || adviceList[3] || "결론 압박보다 편안한 대화 1회를 만드는 것이 다음 7일의 관계 온도를 안정시킵니다."),
    };
  }

  function sanitizeRelationshipReading(rawReading) {
    var src = rawReading && typeof rawReading === "object" ? rawReading : {};
    var adviceList = Array.isArray(src.advice)
      ? src.advice.map(function (item) { return cleanRelationshipResultText(item); }).filter(Boolean)
      : [];
    var seenAdvice = Object.create(null);
    adviceList = adviceList.filter(function (line) {
      var key = String(line || "").toLowerCase();
      if (!key || seenAdvice[key]) return false;
      seenAdvice[key] = true;
      return true;
    });
    return {
      overallVibe: cleanRelationshipResultText(src.overallVibe || ""),
      deepReading: cleanRelationshipResultText(src.deepReading || ""),
      realityAndFuture: cleanRelationshipResultText(src.realityAndFuture || ""),
      positionBreakdown: Array.isArray(src.positionBreakdown)
        ? src.positionBreakdown.map(function (item, idx) { return normalizePositionReadingItem(item, idx); })
        : [],
      finalAdvice: normalizeFinalAdvice(src.finalAdvice, adviceList),
      advice: adviceList,
    };
  }

  function renderTarotLoveResult() {
    var container = byId("tarotLoveReadingContent");
    if (!container || !state.reading) return;
    if (!state.hasAccess) {
      container.innerHTML = '<div class="tarot-love-section"><p class="tarot-love-section-text">' + escapeHtml(getTarotLoveCopy().accessDenied) + '</p></div>';
      return;
    }

    var copy = getTarotLoveCopy();
    var r = sanitizeRelationshipReading(state.reading);
    var overallVibe = r.overallVibe != null ? String(r.overallVibe) : "";
    var deepReading = r.deepReading != null ? String(r.deepReading) : "";
    var realityAndFuture = r.realityAndFuture != null ? String(r.realityAndFuture) : "";
    var positionBreakdown = Array.isArray(r.positionBreakdown) ? r.positionBreakdown : [];
    var adviceList = Array.isArray(r.advice) ? r.advice : [];
    var finalAdvice = r.finalAdvice && typeof r.finalAdvice === "object" ? r.finalAdvice : {};
    var html = "";

    if (overallVibe) {
      html += '<section class="tarot-love-section tarot-love-section--vibe">';
      html += '<h4 class="tarot-love-section-title">' + escapeHtml(copy.currentTemperature) + '</h4>';
      html += '<div class="tarot-love-section-text">' + formatReadingText(overallVibe) + "</div>";
      html += "</section>";
    }

    if (deepReading) {
      html += '<section class="tarot-love-section tarot-love-section--insight">';
      html += '<h4 class="tarot-love-section-title">' + escapeHtml(copy.crossedHeart) + '</h4>';
      html += '<div class="tarot-love-section-text">' + formatReadingText(deepReading) + "</div>";
      html += "</section>";
    }

    if (realityAndFuture) {
      html += '<section class="tarot-love-section tarot-love-section--future">';
      html += '<h4 class="tarot-love-section-title">' + escapeHtml(copy.nextChoice) + '</h4>';
      html += '<div class="tarot-love-section-text">' + formatReadingText(realityAndFuture) + "</div>";
      html += "</section>";
    }

    if (positionBreakdown.length) {
      html += '<section class="tarot-love-section tarot-love-section--position">';
      html += '<h4 class="tarot-love-section-title">' + escapeHtml(copy.positionReading) + '</h4>';
      html += '<div class="tarot-love-position-grid">';
      positionBreakdown.forEach(function (item) {
        var title = item && item.positionTitle != null ? String(item.positionTitle) : "";
        var cardName = item && item.cardName != null ? String(item.cardName) : "";
        var rawOrientationLabel = item && item.orientationLabel != null ? String(item.orientationLabel) : copy.uprightLabel;
        var orientationLabel = localizeTarotLoveOrientation(rawOrientationLabel);
        var headline = item && item.headline != null ? String(item.headline) : "";
        var detail = item && item.detail != null ? String(item.detail) : "";
        var relationshipInsight = item && item.relationshipInsight != null ? String(item.relationshipInsight) : "";
        var advice = item && item.advice != null ? String(item.advice) : "";
        var caution = item && item.caution != null ? String(item.caution) : "";
        if (!title && !headline && !detail) return;
        html += '<article class="tarot-love-position-card">';
        html += '<div class="tarot-love-position-head">';
        html += '<p class="tarot-love-position-title">' + escapeHtml(title) + "</p>";
        html += '<span class="tarot-love-orientation-badge ' + (isTarotLoveReversed(rawOrientationLabel) ? "is-reversed" : "is-upright") + '">' + escapeHtml(orientationLabel) + '</span>';
        html += '</div>';
        if (cardName) html += '<p class="tarot-love-position-cardname">' + escapeHtml(cardName) + "</p>";
        if (headline) html += '<div class="tarot-love-position-keyline"><strong>' + escapeHtml(copy.coreSignal) + ':</strong> ' + escapeHtml(headline) + '</div>';
        if (detail) html += '<div class="tarot-love-position-text"><p class="tarot-love-mini-title">' + escapeHtml(copy.relationshipInterpretation) + '</p>' + formatReadingText(detail) + '</div>';
        if (relationshipInsight) html += '<div class="tarot-love-position-text"><p class="tarot-love-mini-title">' + escapeHtml(copy.relationshipPsychology) + '</p>' + formatReadingText(relationshipInsight) + '</div>';
        if (advice) html += '<div class="tarot-love-position-text"><p class="tarot-love-mini-title">' + escapeHtml(copy.todayChoice) + '</p>' + formatReadingText(advice) + '</div>';
        if (caution) html += '<div class="tarot-love-position-text"><p class="tarot-love-mini-title">' + escapeHtml(copy.cautionFlow) + '</p>' + formatReadingText(caution) + '</div>';
        html += "</article>";
      });
      html += "</div>";
      html += "</section>";
    }

    html += '<section class="tarot-love-section tarot-love-focus-section">';
    html += '<h4 class="tarot-love-section-title">' + escapeHtml(copy.focusStandard) + '</h4>';
    html += '<div class="tarot-love-final-advice-grid">';
    html += '<article class="tarot-love-final-advice-item"><h5>' + escapeHtml(copy.instantMission) + '</h5><p>' + escapeHtml(String(finalAdvice.instantMission || "")) + '</p></article>';
    html += '<article class="tarot-love-final-advice-item"><h5>' + escapeHtml(copy.conversationTemperature) + '</h5><p>' + escapeHtml(String(finalAdvice.conversationTip || "")) + '</p></article>';
    html += '<article class="tarot-love-final-advice-item"><h5>' + escapeHtml(copy.relationshipBoundary) + '</h5><p>' + escapeHtml(String(finalAdvice.relationshipBoundary || "")) + '</p></article>';
    html += '<article class="tarot-love-final-advice-item"><h5>' + escapeHtml(copy.sevenDayRhythm) + '</h5><p>' + escapeHtml(String(finalAdvice.nextSevenDays || "")) + '</p></article>';
    html += '</div>';
    html += '</section>';

    if (adviceList.length) {
      html += '<section class="tarot-love-section tarot-love-section--advice">';
      html += '<h4 class="tarot-love-section-title">✅ 관계 체크리스트</h4>';
      html += '<ul class="tarot-love-checklist">';
      adviceList.forEach(function (item) {
        var text = item != null ? String(item) : "";
        if (text) html += "<li>" + escapeHtml(text) + "</li>";
      });
      html += "</ul>";
      html += "</section>";
    }

    container.innerHTML = html;

    renderTarotLoveResultCardsStrip();
    renderTarotLoveAiPromptPanel(r);
  }

  function renderTarotLoveResultCardsStrip() {
    var strip = byId("tarotLoveResultCardsStrip");
    if (!strip) return;

    strip.innerHTML = "";
    if (!Array.isArray(state.cards) || !state.cards.length) return;

    (DISPLAY_ORDER || [0, 1, 2, 3, 4, 5]).forEach(function (idx) {
      var card = state.cards[idx];
      if (!card) return;

      var wrap = document.createElement("div");
      wrap.className = "tarot-love-result-card-wrap";

      var miniCard = document.createElement("div");
      miniCard.className = "tarot-love-result-mini-card";
      if (card.orientation === "reversed") miniCard.setAttribute("data-reversed", "1");

      var miniFront = document.createElement("div");
      miniFront.className = "tarot-love-result-mini-front";

      var img = document.createElement("img");
      img.className = "tarot-love-result-mini-img";
      img.alt = (card.nameKr || card.name || "").trim() || "타로 카드";
      img.loading = "lazy";
      img.decoding = "async";
      img.referrerPolicy = "no-referrer";

      applyTarotImageWithFallback(img, miniFront, card);
      miniFront.appendChild(img);
      miniCard.appendChild(miniFront);

      var label = document.createElement("span");
      label.className = "tarot-love-result-mini-label";
      label.textContent = POSITION_LABELS[card.position] || card.position || "";

      var name = document.createElement("span");
      name.className = "tarot-love-result-mini-name";
      name.textContent = (card.nameKr || card.name || "").trim();

      wrap.appendChild(miniCard);
      wrap.appendChild(label);
      wrap.appendChild(name);
      strip.appendChild(wrap);
    });
  }

  function compactTarotLovePromptText(value, fallback) {
    var text = cleanRelationshipResultText(value || "");
    if (!text) return String(fallback || "").trim();
    return text.replace(/\s+/g, " ").trim();
  }

  function buildTarotLoveAiPromptText(reading, cards) {
    var copy = getTarotLoveCopy();
    var r = reading && typeof reading === "object" ? reading : {};
    var finalAdvice = r.finalAdvice && typeof r.finalAdvice === "object" ? r.finalAdvice : {};
    var cardLines = (DISPLAY_ORDER || [0, 1, 2, 3, 4, 5]).map(function (idx) {
      var card = cards && cards[idx] ? cards[idx] : null;
      if (!card) return "";
      var label = POSITION_LABELS[card.position] || (copy.positionFallback + " " + String(idx + 1));
      var name = String(card.nameKr || card.name || copy.unknownCard).trim();
      var orientation = card.orientation === "reversed" ? copy.reversedLabel : copy.uprightLabel;
      return String(idx + 1) + ". " + label + ": " + name + " · " + orientation;
    }).filter(Boolean);

    return [
      copy.promptRole,
      copy.promptInstruction,
      "",
      copy.promptCardFlow,
      cardLines.join("\n"),
      "",
      copy.promptRevealedEnergy,
      copy.promptCurrentTemperature + ": " + compactTarotLovePromptText(r.overallVibe, copy.fallbackCurrentTemperature),
      copy.promptCrossedPoint + ": " + compactTarotLovePromptText(r.deepReading, copy.fallbackCrossedPoint),
      copy.promptRealityFlow + ": " + compactTarotLovePromptText(r.realityAndFuture, copy.fallbackRealityFlow),
      copy.promptOneSentence + ": " + compactTarotLovePromptText(finalAdvice.instantMission, copy.fallbackOneSentence),
      copy.promptSevenDays + ": " + compactTarotLovePromptText(finalAdvice.nextSevenDays, copy.fallbackSevenDays),
      "",
      copy.promptRequest,
      copy.promptRequestLines.join("\n"),
    ].join("\n");
  }

  function renderTarotLoveAiPromptPanel(reading) {
    var strip = byId("tarotLoveResultCardsStrip");
    if (!strip || !state.hasAccess) return;
    var oldPanel = byId("tarotLoveAiPromptPanel");
    if (oldPanel) oldPanel.remove();

    var promptText = buildTarotLoveAiPromptText(reading, state.cards);
    if (!promptText.trim()) return;
    var copy = getTarotLoveCopy();

    var panel = document.createElement("section");
    panel.id = "tarotLoveAiPromptPanel";
    panel.className = "tarot-love-ai-prompt-panel";
    panel.setAttribute("data-marker", "tarot-love-ai-prompt-bottom-v20260621");
    panel.innerHTML =
      '<div class="tarot-love-ai-prompt-head">' +
      '<span class="tarot-love-ai-prompt-kicker">' + escapeHtml(copy.aiPromptKicker) + '</span>' +
      '<h4 class="tarot-love-ai-prompt-title">' + escapeHtml(copy.aiPromptTitle) + '</h4>' +
      '<p class="tarot-love-ai-prompt-lead">' + escapeHtml(copy.aiPromptLead) + '</p>' +
      '</div>' +
      '<textarea id="tarotLoveAiPromptOutput" class="tarot-love-ai-prompt-output" readonly aria-label="' + escapeHtml(copy.aiPromptAria) + '">' + escapeHtml(promptText) + '</textarea>' +
      '<div class="tarot-love-ai-prompt-actions">' +
      '<button type="button" class="tarot-love-ai-prompt-copy" data-action="copyTarotLoveAiPrompt" data-action-pass-self="1">' + escapeHtml(copy.aiPromptCopy) + '</button>' +
      '<span id="tarotLoveAiPromptStatus" class="tarot-love-ai-prompt-status">' + escapeHtml(copy.aiPromptIncluded) + '</span>' +
      '</div>';
    strip.insertAdjacentElement("afterend", panel);
  }

  function escapeHtml(s) {
    if (s == null || s === "") return "";
    var div = document.createElement("div");
    div.textContent = String(s);
    return div.innerHTML;
  }

  function formatReadingText(input) {
    var raw = String(input || "").replace(/\s+/g, " ").trim();
    if (!raw) return "";

    var blocks = raw
      .split(/\n{2,}/)
      .map(function (line) { return String(line || "").trim(); })
      .filter(Boolean);

    if (!blocks.length) blocks = [raw];

    var out = [];
    var paragraphIndex = 0;
    blocks.forEach(function (block) {
      var sentences = block
        .split(/(?<=[.!?])\s+/)
        .map(function (s) { return String(s || "").trim(); })
        .filter(Boolean);

      if (!sentences.length) sentences = [block];

      for (var i = 0; i < sentences.length; i += 2) {
        var paragraph = sentences.slice(i, i + 2).join(" ");
        if (paragraph) {
          var className = paragraphIndex === 0 ? "tarot-love-paragraph tarot-love-paragraph--lead" : "tarot-love-paragraph";
          out.push('<p class="' + className + '">' + escapeHtml(paragraph) + "</p>");
          paragraphIndex += 1;
        }
      }
    });

    return out.join("");
  }

  function copyTarotLoveAiPrompt() {
    var output = byId("tarotLoveAiPromptOutput");
    var status = byId("tarotLoveAiPromptStatus");
    var text = output ? String(output.value || "").trim() : "";
    function setStatus(message, tone) {
      if (!status) return;
      status.textContent = message;
      status.setAttribute("data-tone", tone || "info");
    }
    if (!text) {
      setStatus(getTarotLoveCopy().promptNotReady, "warn");
      return;
    }
    function fallbackCopy() {
      if (!output) return false;
      output.focus();
      output.select();
      try {
        return document.execCommand("copy");
      } catch (e) {
        return false;
      }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(function () { setStatus(getTarotLoveCopy().promptCopied, "success"); })
        .catch(function () {
          var copied = fallbackCopy();
          setStatus(copied ? getTarotLoveCopy().promptCopied : getTarotLoveCopy().copyBlocked, copied ? "success" : "warn");
        });
      return;
    }
    var copied = fallbackCopy();
    setStatus(copied ? getTarotLoveCopy().promptCopied : getTarotLoveCopy().copyBlocked, copied ? "success" : "warn");
  }

  function shareTarotLoveResult() {
    var r = state.reading;
    if (!r) return;

    var copy = getTarotLoveCopy();
    var text = copy.shareHeader + "\n\n";
    if (r.overallVibe) text += "🌙 " + r.overallVibe + "\n\n";
    if (r.deepReading) text += "🔍 " + r.deepReading.substring(0, 200) + "...\n\n";
    text += copy.shareCta;

    if (navigator.share) {
      navigator.share({
        title: copy.shareTitle,
        text: text,
        url: "https://code-destiny.com",
      }).catch(function () {});
      return;
    }

    var encoded = encodeURIComponent(text);
    var a = document.createElement("a");
    a.href = "kakaotalk://send?text=" + encoded;
    a.click();
    setTimeout(function () {
      if (typeof copyToClipboard === "function") {
        copyToClipboard(text, "카카오톡 앱이 없거나 PC에서는 클립보드에 복사했어요! 💬");
      }
    }, 800);
  }

  document.addEventListener("DOMContentLoaded", function () {
    refs.overlay = byId("tarotLoveOverlay");
    refs.introStage = byId("tarotLoveIntroStage");
    refs.drawStage = byId("tarotLoveDrawStage");
    refs.resultStage = byId("tarotLoveResultStage");
  });

  window.openTarotLoveModal = openTarotLoveModal;
  window.closeTarotLoveModal = closeTarotLoveModal;
  window.startTarotLoveReading = startTarotLoveReading;
  window.resetTarotLoveFlow = resetTarotLoveFlow;
  window.flipTarotLoveCard = flipTarotLoveCard;
  window.showTarotLoveFinalReading = showTarotLoveFinalReading;
  window.shareTarotLoveResult = shareTarotLoveResult;
  window.copyTarotLoveAiPrompt = copyTarotLoveAiPrompt;
})();

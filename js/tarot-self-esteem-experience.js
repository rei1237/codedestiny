/**
 * 자기 기준 회복 타로 — 5-Card Self-Trust Spread
 * 무료 기능: 드로우와 리딩 모두 클라이언트 로컬에서 생성 (서버 API·인증·결제 게이트 미사용)
 */
(function () {
  "use strict";

  var POSITION_LABELS = {
    past_debuff: "내 기준이 흐려지기 시작한 자리",
    inner_monster: "거절 앞에서 마음이 작아지는 이유",
    current_damage: "타인의 시선이 지금 마음을 소모시키는 지점",
    mind_shield: "실망을 두려워하지 않고 나를 지키는 말",
    levelup_mastery: "오늘 다시 붙잡을 나의 기준",
  };

  var POSITION_ORDER = ["past_debuff", "inner_monster", "current_damage", "mind_shield", "levelup_mastery"];

  var GUIDE_LABELS = [
    "첫 번째 카드를 열고, 마음이 처음 흔들린 자리를 바라봐 주세요.",
    "두 번째 카드를 열고, 거절 앞에서 작아졌던 마음을 비춰 주세요.",
    "세 번째 카드를 열고, 지금 가장 소모되는 지점을 확인해 주세요.",
    "네 번째 카드를 열고, 나를 지켜 줄 말을 받아 주세요.",
    "다섯 번째 카드를 열고, 오늘 다시 붙잡을 기준을 만나 주세요.",
  ];

  /* Client-side deck (78 cards) — 이 기능의 유일한 드로우 소스 */
  var FALLBACK_DECK = (function () {
    var majors = [
      ["M00", "The Fool", "바보"], ["M01", "The Magician", "마법사"], ["M02", "The High Priestess", "여사제"],
      ["M03", "The Empress", "여황제"], ["M04", "The Emperor", "황제"], ["M05", "The Hierophant", "교황"],
      ["M06", "The Lovers", "연인"], ["M07", "The Chariot", "전차"], ["M08", "Strength", "힘"],
      ["M09", "The Hermit", "은둔자"], ["M10", "Wheel of Fortune", "운명의 수레바퀴"], ["M11", "Justice", "정의"],
      ["M12", "The Hanged Man", "매달린 사람"], ["M13", "Death", "죽음"], ["M14", "Temperance", "절제"],
      ["M15", "The Devil", "악마"], ["M16", "The Tower", "탑"], ["M17", "The Star", "별"],
      ["M18", "The Moon", "달"], ["M19", "The Sun", "태양"], ["M20", "Judgement", "심판"], ["M21", "The World", "세계"],
    ];
    var suits = ["Wands", "Cups", "Swords", "Pentacles"];
    var suitPrefix = { Wands: "W", Cups: "C", Swords: "S", Pentacles: "P" };
    var ranks = ["Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Page", "Knight", "Queen", "King"];
    var rankKr = ["에이스", "2", "3", "4", "5", "6", "7", "8", "9", "10", "페이지", "기사", "퀸", "킹"];
    var suitKr = { Wands: "완드", Cups: "컵", Swords: "소드", Pentacles: "펜타클" };
    var out = majors.map(function (m) { return { id: m[0], name: m[1], nameKr: m[2] }; });
    suits.forEach(function (suit) {
      ranks.forEach(function (rank, i) {
        var id = suitPrefix[suit] + String(i + 1).padStart(2, "0");
        out.push({ id: id, name: rank + " of " + suit, nameKr: suitKr[suit] + " " + rankKr[i] });
      });
    });
    return out;
  })();

  var state = { cards: [], revealedCount: 0, reading: null };
  var TAROT_SELF_ESTEEM_COPY_BY_LOCALE = {
    ko: {
      positions: {
        past_debuff: "내 기준이 흐려지기 시작한 자리",
        inner_monster: "거절 앞에서 마음이 작아지는 이유",
        current_damage: "타인의 시선이 지금 내 마음을 소모시키는 지점",
        mind_shield: "실망을 두려워하지 않고 나를 지키는 말",
        levelup_mastery: "오늘 다시 붙잡을 나의 기준",
      },
      guides: [
        "첫 번째 카드를 열고, 마음이 처음 흔들린 자리를 바라봐 주세요.",
        "두 번째 카드를 열고, 거절 앞에서 작아졌던 마음을 비춰 주세요.",
        "세 번째 카드를 열고, 지금 가장 소모되는 지점을 확인해 주세요.",
        "네 번째 카드를 열고, 나를 지켜 줄 말을 받아 주세요.",
        "다섯 번째 카드를 열고, 오늘 다시 붙잡을 기준을 만나 주세요.",
      ],
      guideComplete: "다섯 장이 모두 열렸습니다. 이제 오늘 지킬 기준이 조용히 떠오릅니다.",
      guideDefault: "마음이 이끄는 카드를 천천히 열어 주세요.",
      positionFallback: "자리 {number}",
      cardFallback: "카드 {number}",
      selectedCard: "선택된 카드",
      upright: "정방향",
      reversed: "역방향",
      keywordsLabel: "키워드",
      messageLabel: "메시지",
      todayRecoveryLabel: "오늘 붙잡을 기준",
      promptIntro: "자기 기준 회복 타로에서 받은 아래 흐름을 바탕으로, 지금 내가 다시 내 편에 서는 길을 깊게 봐주세요.",
      promptTone: "차분하고 신뢰감 있는 타로 리더처럼 말해주세요. 타인의 반응을 예언처럼 단정하기보다, 내 기준을 흔드는 마음과 회복 가능한 선택을 중심으로 읽어주세요.",
      promptOpening: "처음 비친 장면",
      promptFlow: "다섯 장의 흐름",
      promptCorePattern: "핵심 패턴",
      promptRootCause: "흔들리는 이유",
      promptRecoveryKey: "회복의 열쇠",
      promptCards: "펼쳐진 카드",
      promptGuide: "자기 기준 회복 가이드",
      promptQuest: "7일 회복 연습",
      promptTodayAction: "오늘의 실천",
      promptClosing: "이 흐름에서 내가 남의 시선을 맞추느라 잃어버린 기준, 다시 돌봐야 할 감정과 책임, 오늘 당장 지킬 수 있는 작은 경계를 차분히 봐주세요. 마지막에는 내 기준을 세우는 짧은 선언 3문장과 오늘 밤 실천할 회복 의식을 건네주세요.",
      promptOpeningFallback: "마음이 자기 기준을 되찾아야 하는 장면부터 짚어주세요.",
      promptFlowFallback: "카드들이 이어서 보여주는 자기 기준 회복 흐름을 연결해 주세요.",
      aiPromptKicker: "더 깊이 묻고 싶은 문장",
      aiPromptTitle: "내 편에 서는 길을 한 번 더 비추기",
      aiPromptLead: "아래 문장을 그대로 건네면 오늘 펼쳐진 카드와 기준 회복 흐름을 바탕으로 더 깊은 해석을 이어갈 수 있습니다.",
      copyPrompt: "문장 복사",
      copySuccess: "복사했습니다.",
      copyManual: "직접 선택해 복사해 주세요.",
      openingMessage: "처음 비친 마음",
      recoveryGuide: "자기 기준 회복 가이드",
      todayRecoveryPractice: "오늘의 회복 실천",
      summaryTitle: "오늘 붙잡을 기준",
      fiveCardFlow: "다섯 장의 흐름",
      corePatternField: "가장 또렷한 흐름",
      rootCauseField: "마음이 흔들리기 시작한 곳",
      mainDamageField: "가장 크게 소모되는 지점",
      recoveryKeyField: "회복의 열쇠",
      automaticThoughtField: "조심할 마음의 결론",
      todayActionField: "오늘의 회복 행동",
      questionLabel: "질문",
      cardLabel: "카드",
      directionLabel: "방향",
      fieldQuickAnswer: "카드가 바로 비추는 말",
      fieldPatternReason: "이 마음이 반복된 이유",
      fieldRealLife: "현실에서 드러나는 모습",
      fieldSignal: "카드가 비추는 반복 신호",
      fieldImpact: "마음에 남은 흔적",
      fieldRecovery: "회복 방향",
      fieldPractice: "오늘의 연습",
      fieldCaution: "조심할 마음의 결론",
      fieldInnerSentence: "내면 문장",
      fieldHealingSentence: "회복 문장",
      flowField: "다섯 장의 흐름",
      rootPatternField: "마음이 흔들리기 시작한 곳",
      woundStoryField: "반복되는 마음 이야기",
      recoveryPathField: "회복 순서",
      boundaryPracticeField: "자기 기준 연습",
      sevenDayQuestTitle: "7일 회복 연습",
      practiceSentenceField: "오늘의 연습 문장",
      questFallbackTitle: "회복 실천",
      difficultyLabel: "실천 강도",
      purposeLabel: "목적",
      actionLabel: "행동",
      completionLabel: "마무리 확인",
      difficultyEasy: "가볍게",
      difficultyNormal: "차분히",
      difficultyHard: "깊게",
      shareTitle: "자기 기준 회복 타로",
      shareOpeningLabel: "마음의 첫 장면",
      shareMasteryLabel: "오늘의 회복 문장",
      shareLinkLabel: "자기 기준 회복 타로 보기",
      shareCopySuccess: "카카오톡 앱이 없거나 PC에서는 클립보드에 복사했어요.",
      fallbackOpening: "다섯 장의 카드가 타인의 시선에 오래 머물다 흐려진 마음의 선을 비춥니다. 오래된 눈치의 습관을 지나, 다시 내 편에 서는 길이 조용히 열립니다.",
      fallbackGuidance: "다섯 장이 모두 열렸습니다. 자기 기준은 큰 결심보다 오늘 지킬 작은 선택에서 되살아납니다. 한 가지 선을 부드럽게 지키며 마음의 중심을 다시 데려오세요.",
      fallbackActionOne: "오늘 하루 무리한 부탁 하나에는 바로 답하지 말고, 마음이 정리될 시간을 먼저 허락해 주세요.",
      fallbackActionTwo: "내가 진짜 원하는 것을 한 문장으로 적고, 그 문장을 오늘의 기준으로 삼아 보세요.",
      fallbackActionThree: "상대의 기분을 추측하기 전에 지금 내 감정을 먼저 이름 붙여 주세요.",
      fallbackActionFour: "거울 앞에서 나는 충분히 존중받을 가치가 있다고 천천히 세 번 말해 주세요.",
      fallbackActionFive: "가장 마음에 남는 카드 한 장의 메시지를 메모하고, 잠들기 전 다시 읽어 주세요.",
    },
    en: {
      positions: {
        past_debuff: "Why I learned to lower my own worth",
        inner_monster: "Why saying no feels difficult",
        current_damage: "Where people-pleasing is draining me now",
        mind_shield: "How to protect myself before others' expectations",
        levelup_mastery: "How to put my heart first again",
      },
      guides: [
        "Turn over the first card.",
        "Turn over the second card.",
        "Turn over the third card.",
        "Turn over the fourth card.",
        "Turn over the fifth card.",
      ],
      guideComplete: "All cards are open. Their light has clarified your inner standard.",
      guideDefault: "Turn over a card.",
      positionFallback: "Position {number}",
      cardFallback: "Card {number}",
      selectedCard: "Selected card",
      upright: "Upright",
      reversed: "Reversed",
      keywordsLabel: "Keywords",
      messageLabel: "Message",
      todayRecoveryLabel: "Today's standard recovery",
      promptIntro: "Based on the self-standard recovery tarot flow below, please read more deeply into how I can stand on my own side again.",
      promptTone: "Speak like a calm, trustworthy tarot reader. Do not declare other people's reactions as fate; focus on the feelings that shake my standard and the choices that can restore it.",
      promptOpening: "First scene revealed",
      promptFlow: "Five-card flow",
      promptCorePattern: "Core pattern",
      promptRootCause: "Why it shakes me",
      promptRecoveryKey: "Key to recovery",
      promptCards: "Cards drawn",
      promptGuide: "Self-standard recovery guide",
      promptQuest: "7-day recovery practice",
      promptTodayAction: "Today's practice",
      promptClosing: "In this flow, calmly show the standard I lost while matching other people's expectations, the emotions and responsibilities I need to return to myself, and the small boundary I can protect today. Close with three short declarations that rebuild my standard and a recovery ritual for tonight.",
      promptOpeningFallback: "Please begin with the scene where my heart needs to reclaim its own standard.",
      promptFlowFallback: "Please connect the recovery flow shown by the cards.",
      aiPromptKicker: "A self-standard question for AI",
      aiPromptTitle: "Deepen the words that help me stand by myself again",
      aiPromptLead: "Send the text below to continue a deeper reading based on today's cards and recovery flow.",
      copyPrompt: "Copy prompt",
      copySuccess: "Copied.",
      copyManual: "Select and copy it manually.",
      openingMessage: "Opening message",
      recoveryGuide: "Self-standard recovery guide",
      todayRecoveryPractice: "Today's recovery practice",
      summaryTitle: "Today's self-standard summary",
      fiveCardFlow: "Five-card flow",
      corePatternField: "Core flow",
      rootCauseField: "Where the heart began to shake",
      mainDamageField: "Where energy is most drained",
      recoveryKeyField: "Key to recovery",
      automaticThoughtField: "Careful conclusion of the mind",
      todayActionField: "Today's recovery action",
      questionLabel: "Question",
      cardLabel: "Card",
      directionLabel: "Direction",
      fieldQuickAnswer: "Answer at a glance",
      fieldPatternReason: "Why this pattern formed",
      fieldRealLife: "How it appears in daily life",
      fieldSignal: "Repeated signal this card reveals",
      fieldImpact: "Impact left in my heart",
      fieldRecovery: "Recovery direction",
      fieldPractice: "Today's practice",
      fieldCaution: "Careful conclusion of the mind",
      fieldInnerSentence: "Inner sentence",
      fieldHealingSentence: "Recovery sentence",
      flowField: "Five-card flow",
      rootPatternField: "Where the heart began to shake",
      woundStoryField: "Recurring heart story",
      recoveryPathField: "Recovery sequence",
      boundaryPracticeField: "Self-standard practice",
      sevenDayQuestTitle: "7-day recovery practice",
      practiceSentenceField: "Today's practice sentence",
      questFallbackTitle: "Recovery practice",
      difficultyLabel: "Practice intensity",
      purposeLabel: "Purpose",
      actionLabel: "Action",
      completionLabel: "Completion check",
      difficultyEasy: "Gentle",
      difficultyNormal: "Steady",
      difficultyHard: "Deep",
      shareTitle: "Self-standard recovery tarot",
      shareOpeningLabel: "First scene of the heart",
      shareMasteryLabel: "Today's recovery sentence",
      shareLinkLabel: "View self-standard recovery tarot",
      shareCopySuccess: "KakaoTalk is unavailable or you are on PC, so I copied it to the clipboard.",
      fallbackOpening: "The five cards guide the flow of recovering your own standard. They reveal the old habit of reading the room, where your heart is tired now, and the way back to standing on your own side.",
      fallbackGuidance: "All five cards are open. Your standard returns through small choices kept with care rather than one grand decision. Protect one small boundary today and let your center come back slowly.",
      fallbackActionOne: "When a request feels heavy today, pause before answering and ask for time to think.",
      fallbackActionTwo: "Write one sentence about what you truly want, then choose from that standard.",
      fallbackActionThree: "Before guessing someone's mood, name your own feeling first.",
      fallbackActionFour: "Look in the mirror and say three times: I am worthy of respect.",
      fallbackActionFive: "Write down the card message that stays with you most, then read it again before sleep.",
    },
  };

  function formatTarotSelfEsteemCopy(text, vars) {
    return String(text || "").replace(/\{\s*([a-zA-Z0-9_.-]+)\s*\}/g, function (_, key) {
      return vars && Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : "";
    });
  }

  function tarotSelfEsteemCurrentLang() {
    try {
      if (window.cdGetCurrentLanguage) return String(window.cdGetCurrentLanguage() || "ko");
    } catch (e) {}
    return "ko";
  }

  function tarotSelfEsteemFallback(path, vars) {
    var lang = tarotSelfEsteemCurrentLang();
    var source = lang === "ko" ? TAROT_SELF_ESTEEM_COPY_BY_LOCALE.ko : TAROT_SELF_ESTEEM_COPY_BY_LOCALE.en;
    var value = String(path || "").split(".").reduce(function (acc, key) {
      return acc && acc[key] != null ? acc[key] : undefined;
    }, source);
    if (Array.isArray(value)) return value;
    if (typeof value !== "string") value = String(path || "");
    return formatTarotSelfEsteemCopy(value, vars || {});
  }

  function tarotSelfEsteemText(path, vars) {
    var fallback = tarotSelfEsteemFallback(path, vars || {});
    if (window.cdTranslate && typeof fallback === "string") {
      return window.cdTranslate("home.tarotSelfEsteem." + path, vars || {}, fallback);
    }
    return fallback;
  }

  function tarotSelfEsteemPositionLabel(key, idx) {
    if (key) return tarotSelfEsteemText("positions." + key);
    return tarotSelfEsteemText("positionFallback", { number: (idx || 0) + 1 });
  }

  function tarotSelfEsteemGuideLabel(idx) {
    var fallback = tarotSelfEsteemFallback("guides");
    var value = Array.isArray(fallback) ? fallback[idx] : "";
    if (window.cdTranslate && value) {
      return window.cdTranslate("home.tarotSelfEsteem.guides." + idx, {}, value);
    }
    return value || tarotSelfEsteemText("guideDefault");
  }

  function tarotSelfEsteemOrientationLabel(orientation) {
    return tarotSelfEsteemText(orientation === "reversed" ? "reversed" : "upright");
  }

  function tarotSelfEsteemCardFallback(idx) {
    return tarotSelfEsteemText("cardFallback", { number: (idx || 0) + 1 });
  }

  function buildLocalizedFallbackReading() {
    return {
      opening: tarotSelfEsteemText("fallbackOpening"),
      pastDebuff: tarotSelfEsteemText("fallbackActionOne"),
      innerMonster: tarotSelfEsteemText("fallbackActionTwo"),
      currentDamage: tarotSelfEsteemText("fallbackActionThree"),
      mindShield: tarotSelfEsteemText("fallbackActionFour"),
      levelupMastery: tarotSelfEsteemText("fallbackActionFive"),
      levelupGuidance: tarotSelfEsteemText("fallbackGuidance"),
      positionInsights: [],
      actionPlan: [
        tarotSelfEsteemText("fallbackActionOne"),
        tarotSelfEsteemText("fallbackActionTwo"),
        tarotSelfEsteemText("fallbackActionThree"),
        tarotSelfEsteemText("fallbackActionFour"),
        tarotSelfEsteemText("fallbackActionFive"),
      ],
    };
  }

  function buildLocalizedPositionFields(pos, card, item, idx) {
    var source = cleanReadingText(
      (item && (item.easyAnswer || item.whyThisHappens || item.recoveryReframe || item.selfEsteemImpact || item.message || item.interpretation)) || ""
    );
    var base = buildProfessionalPositionMessage(pos, card, source);
    var cardLabel = getPositionCardLabel(card, item, idx);
    var orientation = (card && card.orientation === "reversed") || /\(역\)|역방향|Reversed/i.test(cardLabel) ? "reversed" : "upright";
    return {
      positionIndex: idx + 1,
      positionKey: pos,
      positionTitle: tarotSelfEsteemPositionLabel(pos, idx),
      question: cleanReadingText(item && item.question),
      cardName: cardLabel,
      cardNameEn: cleanReadingText(item && item.cardNameEn),
      cardCode: cleanReadingText(item && item.cardCode),
      orientation: orientation,
      orientationLabel: cleanReadingText(item && item.orientationLabel) || tarotSelfEsteemOrientationLabel(orientation),
      keywords: Array.isArray(item && item.keywords) ? item.keywords.slice(0, 5) : [],
      easyAnswer: cleanReadingText(item && item.easyAnswer) || base,
      whyThisHappens: cleanReadingText(item && item.whyThisHappens) || base,
      realLifeExample: cleanReadingText(item && item.realLifeExample) || base,
      woundPattern: cleanReadingText(item && item.woundPattern) || base,
      selfEsteemImpact: cleanReadingText(item && item.selfEsteemImpact) || base,
      recoveryReframe: cleanReadingText(item && item.recoveryReframe) || base,
      actionPractice: cleanReadingText(item && item.actionPractice) || tarotSelfEsteemText("fallbackActionOne"),
      caution: cleanReadingText(item && item.caution) || tarotSelfEsteemText("automaticThoughtField"),
      innerSentence: cleanReadingText(item && item.innerSentence) || tarotSelfEsteemText("fallbackActionTwo"),
      healingSentence: cleanReadingText(item && item.healingSentence) || tarotSelfEsteemText("fallbackGuidance"),
    };
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

  function getTarotApiBase() {
    var runtimeBase = getRuntimeEnvApiBase();
    if (runtimeBase) return runtimeBase;
    if (typeof getFortuneApiBaseUrl === "function") {
      var base = getFortuneApiBaseUrl();
      if (base) return normalizeApiBase(base);
    }
    if (typeof window !== "undefined") {
      if (window.CODE_DESTINY_API_BASE_URL) return normalizeApiBase(window.CODE_DESTINY_API_BASE_URL);
      try {
        var custom = localStorage.getItem("fortune_api_base_url");
        if (custom) return normalizeApiBase(custom);
      } catch (e) {}
      var host = String(location.hostname || "").toLowerCase();
      if (host === "localhost" || host === "127.0.0.1") return "http://localhost:3000";
      if (host === "api.code-destiny.com") return location.origin || "";
      if (host.endsWith(".pages.dev")) return "https://code-destiny.com";
    }
    return "https://code-destiny.com";
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

  function getTarotImageCandidates(cardName) {
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

  var TAROT_LOCAL_BASES = ["/tarot-cards/", "tarot-cards/"];
  var TAROT_LOCAL_BASE = TAROT_LOCAL_BASES[0];
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

  function applyTarotImageWithFallback(imgEl, frontEl, card) {
    if (!imgEl) return;
    var candidates = [];
    function pushCandidateVariants(list, url) {
      var raw = String(url || "").trim();
      if (!raw) return;
      list.push(raw);
      if (/^https?:\/\//i.test(raw)) return;
      if (raw.charAt(0) === "/") list.push(raw.slice(1));
      else list.push("/" + raw);
    }
    function absolutizeUrl(url) {
      var raw = String(url || "").trim();
      if (!raw) return "";
      if (/^https?:\/\//i.test(raw)) return raw;
      var base = getTarotApiBase();
      if (!base) return raw;
      return String(base).replace(/\/+$/, "") + (raw.charAt(0) === "/" ? raw : ("/" + raw));
    }
    getLocalTarotImageCandidates(card).forEach(function (u) { pushCandidateVariants(candidates, u); });
    if (card && card.proxyImageUrl) {
      pushCandidateVariants(candidates, absolutizeUrl(card.proxyImageUrl));
      pushCandidateVariants(candidates, card.proxyImageUrl);
    }
    if (Array.isArray(card && card.imageCandidates) && card.imageCandidates.length) {
      card.imageCandidates.forEach(function (u) { pushCandidateVariants(candidates, u); });
    } else if (card && card.imageUrl) {
      pushCandidateVariants(candidates, card.imageUrl);
    }
    var cdnCandidates = getTarotImageCandidates(card && card.name);
    cdnCandidates.forEach(function (u) {
      pushCandidateVariants(candidates, u);
    });
    candidates = candidates.filter(Boolean).filter(function (u, i, arr) { return arr.indexOf(u) === i; });
    if (!candidates.length) return;
    var idx = 0;
    imgEl.referrerPolicy = "no-referrer";
    imgEl.decoding = "async";
    function tryNext() {
      if (idx >= candidates.length) {
        if (imgEl.src !== TAROT_DEFAULT_FALLBACK_IMAGE) {
          imgEl.onerror = null;
          imgEl.src = TAROT_DEFAULT_FALLBACK_IMAGE;
        }
        return;
      }
      var url = candidates[idx++];
      /* img만 사용 — backgroundImage와 중복 설정 시 카드가 겹쳐 보이는 현상 방지 */
      if (frontEl) {
        frontEl.style.backgroundImage = "";
        frontEl.style.backgroundSize = "";
        frontEl.style.backgroundPosition = "";
      }
      imgEl.onerror = tryNext;
      imgEl.src = url;
    }
    tryNext();
  }

  function ensureSelfEsteemFrontImage(cardEl, card) {
    if (!cardEl) return;
    var front = cardEl.querySelector(".tarot-self-esteem-card-front");
    var img = front ? front.querySelector(".tarot-self-esteem-face-img") : null;
    if (!img) return;
    if (!img.getAttribute("src") || !img.complete || !img.naturalWidth) {
      applyTarotImageWithFallback(img, front, card || null);
    }
  }

  function prefetchCardImages(cards) {
    if (!Array.isArray(cards)) return;
    cards.forEach(function (card) {
      var list = [];
      // 로컬 후보는 첫 번째(/tarot-cards/)만 미리 받는다. 나머지 세 베이스는 onerror 체인용
      // 폴백일 뿐 항상 404 라서, 여기서 전부 프로브하면 카드마다 3회씩 콘솔 404 를 찍는다.
      var localCandidates = getLocalTarotImageCandidates(card);
      if (localCandidates.length) list.push(localCandidates[0]);
      if (card && card.proxyImageUrl) {
        var base = getTarotApiBase();
        if (base) list.push(String(base).replace(/\/+$/, "") + card.proxyImageUrl);
        list.push(card.proxyImageUrl);
      }
      if (card && Array.isArray(card.imageCandidates)) {
        list = list.concat(card.imageCandidates);
      } else if (card && card.imageUrl) {
        list.push(card.imageUrl);
      } else if (card) {
        list = list.concat(getTarotImageCandidates(card.name));
      }
      var seen = Object.create(null);
      list.forEach(function (u) {
        var url = String(u || "").trim();
        if (!url || seen[url]) return;
        seen[url] = true;
        var probe = new Image();
        probe.decoding = "async";
        probe.referrerPolicy = "no-referrer";
        probe.src = url;
      });
    });
  }

  function ensureTarotSelfEsteemStyle() {
    var stylePath = "/styles/tarot-self-esteem-quest.css";
    var link = document.querySelector('link[href*="' + stylePath + '"], link[data-cd-noncritical-style-src*="' + stylePath + '"]');
    if (link) {
      var href = link.getAttribute("href") || link.getAttribute("data-cd-noncritical-style-src");
      if (href) link.setAttribute("href", href);
      link.setAttribute("rel", "stylesheet");
      link.setAttribute("media", "all");
      return;
    }

    var version = "";
    Array.prototype.some.call(document.scripts || [], function (script) {
      var src = script && script.getAttribute ? String(script.getAttribute("src") || "") : "";
      if (src.indexOf("/js/tarot-self-esteem-experience.js") < 0) return false;
      var queryIndex = src.indexOf("?");
      if (queryIndex >= 0) version = src.slice(queryIndex);
      return true;
    });

    link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = stylePath + version;
    link.media = "all";
    document.head.appendChild(link);
  }

  function openTarotSelfEsteemModal() {
    var overlay = byId("tarotSelfEsteemOverlay");
    if (!overlay) return;
    ensureTarotSelfEsteemStyle();
    overlay.style.display = "block";
    overlay.classList.add("is-open");
    if (window._perf && window._perf.lockBody) window._perf.lockBody();
    else document.body.style.overflow = "hidden";
    resetTarotSelfEsteemFlow();
  }

  function closeTarotSelfEsteemModal() {
    var overlay = byId("tarotSelfEsteemOverlay");
    if (!overlay) return;
    overlay.style.display = "none";
    overlay.classList.remove("is-open");
    if (window._perf && window._perf.unlockBody) window._perf.unlockBody();
    else document.body.style.overflow = "";
  }

  function resetTarotSelfEsteemFlow() {
    state.cards = [];
    state.revealedCount = 0;
    state.reading = null;

    var intro = byId("tarotSelfEsteemIntroStage");
    var draw = byId("tarotSelfEsteemDrawStage");
    var result = byId("tarotSelfEsteemResultStage");
    var levelUpBanner = byId("tarotSelfEsteemLevelUpBanner");
    if (intro) intro.classList.add("is-active");
    if (draw) draw.classList.remove("is-active");
    if (result) result.classList.remove("is-active");
    if (levelUpBanner) levelUpBanner.classList.remove("is-visible");
    updateExpBar(0);
  }

  function updateExpBar(percent) {
    var pct = Math.min(100, Math.max(0, percent));
    var bar = byId("tarotSelfEsteemExpBar");
    if (bar) bar.style.width = pct + "%";
    var label = byId("tarotSelfEsteemExpPercent");
    if (label) label.textContent = Math.round(pct) + "%";
  }

  function triggerLevelUpConfetti() {
    var container = byId("tarotSelfEsteemConfetti");
    if (!container) return;
    var colors = ["#FFD700", "#FF8C00", "#4FC3F7", "#FF6B9D", "#B388FF"];
    for (var i = 0; i < 60; i++) {
      var p = document.createElement("span");
      p.className = "self-esteem-confetti-piece";
      p.style.left = Math.random() * 100 + "%";
      p.style.animationDelay = Math.random() * 0.5 + "s";
      p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      p.style.transform = "rotate(" + (Math.random() * 360) + "deg)";
      container.appendChild(p);
      setTimeout(function (el) {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }, 3500, p);
    }
  }

  function drawFallbackCards() {
    var deck = FALLBACK_DECK.slice();
    for (var i = deck.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = deck[i];
      deck[i] = deck[j];
      deck[j] = t;
    }
    return POSITION_ORDER.map(function (pos, idx) {
      var c = deck[idx];
      var rev = Math.random() < 0.35;
      return {
        cardId: c.id,
        id: c.id,
        name: c.name,
        nameKr: c.nameKr,
        position: pos,
        orientation: rev ? "reversed" : "upright",
      };
    });
  }

  function applyCardsAndShowDrawStage(cards) {
    var intro = byId("tarotSelfEsteemIntroStage");
    var draw = byId("tarotSelfEsteemDrawStage");
    var panel = document.querySelector(".tarot-self-esteem-panel");
    if (!intro || !draw) return;
    state.cards = cards;
    state.revealedCount = 0;
    prefetchCardImages(state.cards);
    intro.classList.remove("is-active");
    draw.classList.add("is-active");
    renderTarotSelfEsteemCards();
    updateTarotSelfEsteemGuide();
    updateExpBar(0);
    var btn = byId("tarotSelfEsteemFinalBtn");
    if (btn) btn.disabled = true;
    if (panel) setTimeout(function () { panel.classList.remove("ritual-burst"); }, 800);
  }

  function startTarotSelfEsteemReading() {
    var intro = byId("tarotSelfEsteemIntroStage");
    var draw = byId("tarotSelfEsteemDrawStage");
    if (!intro || !draw) return;

    var panel = document.querySelector(".tarot-self-esteem-panel");
    if (panel) panel.classList.add("ritual-burst");

    /* 무료 기능: 서버 드로우와 확률 분포가 동일하므로 네트워크 왕복 없이 로컬 덱에서 즉시 뽑는다 */
    applyCardsAndShowDrawStage(drawFallbackCards());
  }

  function renderTarotSelfEsteemCards() {
    var grid = byId("tarotSelfEsteemCardGrid");
    if (!grid) return;
    grid.innerHTML = "";

    state.cards.forEach(function (card, idx) {
      var slot = document.createElement("div");
      slot.className = "tarot-self-esteem-slot";
      slot.setAttribute("data-slot-index", idx);

      var label = document.createElement("span");
      label.className = "tarot-self-esteem-slot-label";
      label.textContent = tarotSelfEsteemPositionLabel(card.position, idx);

      var cardEl = document.createElement("div");
      cardEl.className = "tarot-self-esteem-card";
      cardEl.setAttribute("data-action", "flipTarotSelfEsteemCard");
      cardEl.setAttribute("data-action-args", idx);
      cardEl.setAttribute("data-revealed", "0");
      cardEl.setAttribute("data-slot-num", String(idx + 1));

      var back = document.createElement("div");
      back.className = "tarot-self-esteem-card-back";
      back.setAttribute("data-back-num", String(idx + 1));

      var front = document.createElement("div");
      front.className = "tarot-self-esteem-card-front";
      if (card.orientation === "reversed") front.setAttribute("data-reversed", "1");

      var img = document.createElement("img");
      img.className = "tarot-self-esteem-face-img";
      img.alt = card.nameKr || card.name;
      img.loading = "lazy";
      img.decoding = "async";
      try {
        img.fetchPriority = idx === state.revealedCount ? "high" : "low";
      } catch (e) {}
      applyTarotImageWithFallback(img, front, card);
      front.appendChild(img);

      var nameSpan = document.createElement("span");
      nameSpan.className = "tarot-self-esteem-card-name";
      nameSpan.textContent = card.nameKr || card.name;
      if (card.orientation === "reversed") nameSpan.textContent += " (" + tarotSelfEsteemOrientationLabel("reversed") + ")";
      front.appendChild(nameSpan);

      cardEl.appendChild(back);
      cardEl.appendChild(front);
      slot.appendChild(cardEl);
      slot.appendChild(label);
      grid.appendChild(slot);
    });
  }

  function updateTarotSelfEsteemGuide() {
    var guide = byId("tarotSelfEsteemSpreadGuide");
    if (!guide) return;
    var idx = state.revealedCount;
    if (idx >= 5) {
      guide.textContent = tarotSelfEsteemText("guideComplete");
    } else {
      guide.textContent = tarotSelfEsteemGuideLabel(idx);
    }

    var grid = byId("tarotSelfEsteemCardGrid");
    if (!grid) return;
    grid.querySelectorAll(".tarot-self-esteem-slot").forEach(function (slot) {
      var slotIdx = parseInt(slot.getAttribute("data-slot-index"), 10);
      if (slotIdx === idx) slot.classList.add("guide-next");
      else slot.classList.remove("guide-next");
    });
  }

  function emitRipple(cardEl) {
    if (!cardEl) return;
    var wave = document.createElement("span");
    wave.className = "self-esteem-ripple-wave";
    cardEl.appendChild(wave);
    setTimeout(function () {
      if (wave && wave.parentNode) wave.parentNode.removeChild(wave);
    }, 900);
  }

  function flipTarotSelfEsteemCard(idx) {
    idx = parseInt(idx, 10);
    if (isNaN(idx) || idx < 0 || idx >= 5) return;
    if (idx !== state.revealedCount) return;

    var grid = byId("tarotSelfEsteemCardGrid");
    var cardEl = grid ? grid.querySelector('.tarot-self-esteem-slot[data-slot-index="' + idx + '"] .tarot-self-esteem-card') : null;
    if (!cardEl || cardEl.getAttribute("data-revealed") === "1") return;

    emitRipple(cardEl);
    cardEl.setAttribute("data-revealed", "1");
    cardEl.classList.add("flipped");
    cardEl.style.pointerEvents = "none";

    var slot = cardEl.closest(".tarot-self-esteem-slot");
    if (slot) slot.classList.add("has-flipped");

    ensureSelfEsteemFrontImage(cardEl, state.cards[idx]);

    state.revealedCount += 1;
    updateExpBar((state.revealedCount / 5) * 100);
    updateTarotSelfEsteemGuide();

    if (state.revealedCount >= 5) {
      var btn = byId("tarotSelfEsteemFinalBtn");
      if (btn) btn.disabled = false;
      // LEVEL UP 배너는 결과 화면에서 글을 다 읽고 스크롤 끝까지 내렸을 때 표시됨 (여기서는 표시하지 않음)
    }
  }

  function getClientInterpretation(card, orientation, category) {
    var nameKr = card.nameKr || card.name || "해당 카드";
    var placeholders = {
      upright: {
        general: nameKr + " 정방향은 흐름이 자연스럽게 열리는 시점임을 보여줍니다.",
        love: nameKr + " 정방향은 감정 표현과 신뢰 회복이 관계 개선의 열쇠임을 시사합니다.",
        money: nameKr + " 정방향은 현실적인 계획과 실행이 재정 흐름을 안정화한다고 말합니다.",
        career: nameKr + " 정방향은 역할 집중과 꾸준한 실행이 성과로 이어짐을 나타냅니다.",
      },
      reversed: {
        general: nameKr + " 역방향은 지연과 오해를 줄이기 위한 점검이 필요함을 보여줍니다.",
        love: nameKr + " 역방향은 서운함 누적을 막기 위해 소통의 방식 조정이 필요함을 시사합니다.",
        money: nameKr + " 역방향은 충동적 판단보다 리스크 관리가 우선임을 나타냅니다.",
        career: nameKr + " 역방향은 프로세스 재정비와 우선순위 조정이 먼저임을 말합니다.",
      },
    };
    var ori = orientation === "reversed" ? "reversed" : "upright";
    return (placeholders[ori] && placeholders[ori][category]) || placeholders[ori].general || placeholders.upright.general;
  }

  function buildProfessionalPositionMessage(pos, card, baseText) {
    var cardName = (card && (card.nameKr || card.name)) || "해당 카드";
    var orientation = card && card.orientation === "reversed" ? "reversed" : "upright";
    var base = String(baseText || "").trim();
    if (!base) base = getClientInterpretation({ nameKr: cardName }, orientation, "general");
    var orientationTone = orientation === "reversed"
      ? "지금은 속도를 늦추고 경계를 재정비하는 편이 좋습니다."
      : "지금 흐름을 일상 루틴에 연결하면 회복 속도가 빨라집니다.";
    // 질문에 직접 답하는 상담 톤: 이유/방법이 문맥상 매칭되도록
    var answerByPos = {
      past_debuff: "당신이 남의 눈치를 살피게 된 이유는 " + base + " 과거의 그 반응은 당신의 결함이 아니라 당시의 생존 전략이었어요. 이제는 그 전략을 존중하되, 현재의 나에게 맞는 방식으로 바꿀 수 있는 시점입니다. " + orientationTone,
      inner_monster: "거절을 어려워하게 된 이유는 " + base + " 거절 불안은 대개 관계가 끊어질까 봐의 공포와 연결돼요. 이 감정을 부정하지 않고 이름 붙이는 순간, 통제 가능한 정보로 바뀝니다. " + orientationTone,
      current_damage: "눈치 보는 습관이 지금 당신에게 주는 피해는 " + base + " 먼저 회복할 권리를 인정하는 것이 중요해요. 에너지가 돌아와야 경계 설정도 오래 유지됩니다. " + orientationTone,
      mind_shield: "타인의 실망을 견뎌내는 방법은 " + base + " 타인의 감정과 내 책임을 분리하는 연습이 필요해요. 설명은 하되, 나를 소진시키는 과잉 설득은 멈추는 것이 좋습니다. " + orientationTone,
      levelup_mastery: "내 마음을 1순위로 챙기는 방법은 " + base + " 자존감은 한 번에 완성되는 게 아니라, 작은 선택을 반복하는 습관으로 안정됩니다. " + orientationTone,
    };
    return (answerByPos[pos] || (cardName + (orientation === "reversed" ? " (역)" : "") + " 카드가 전하는 메시지: " + base + " " + orientationTone));
  }

  function buildFallbackReading() {
    /* positionReadings까지 채워야 결과 화면에 카드별 해석이 렌더된다 (빈 positionInsights만 돌려주면 결과가 비어 보임) */
    return completeSelfEsteemReadingPayload(buildLocalizedFallbackReading(), state.cards);
  }

  function cleanReadingText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function findCardForPosition(cards, pos, idx) {
    var list = Array.isArray(cards) ? cards : [];
    for (var i = 0; i < list.length; i += 1) {
      if (list[i] && list[i].position === pos) return list[i];
    }
    return list[idx] || {};
  }

  function getPositionCardLabel(card, item, idx) {
    var raw = cleanReadingText((card && (card.nameKr || card.name)) || (item && (item.cardName || item.cardLabel || item.cardNameEn)) || "");
    if (!raw) raw = idx != null ? tarotSelfEsteemCardFallback(idx) : tarotSelfEsteemText("selectedCard");
    var reversed = (card && card.orientation === "reversed") || /\(역\)|역방향/.test(cleanReadingText(item && (item.orientationLabel || item.cardName || item.cardLabel)));
    return raw + (reversed ? " (" + tarotSelfEsteemOrientationLabel("reversed") + ")" : "");
  }

  function buildPositionFields(pos, card, item, idx) {
    /* 한국어는 아래 포지션별 심층 템플릿을 사용, 그 외 로케일은 공용 로컬라이즈 경로 사용 */
    if (tarotSelfEsteemCurrentLang() !== "ko") return buildLocalizedPositionFields(pos, card, item, idx);
    var source = cleanReadingText(
      (item && (item.easyAnswer || item.whyThisHappens || item.recoveryReframe || item.selfEsteemImpact || item.message || item.interpretation)) || ""
    );
    var base = buildProfessionalPositionMessage(pos, card, source);
    var cardLabel = getPositionCardLabel(card, item);
    var orientation = (card && card.orientation === "reversed") || /\(역\)|역방향/.test(cardLabel) ? "reversed" : "upright";
    var label = POSITION_LABELS[pos] || cleanReadingText(item && item.positionTitle) || ("포지션 " + (idx + 1));
    var templates = {
      past_debuff: {
        easyAnswer: base,
        whyThisHappens: "예전에는 상대의 표정과 분위기를 먼저 읽는 것이 관계를 지키는 방법처럼 느껴졌을 수 있습니다. " + cardLabel + "는 그 습관이 약점이 아니라 오래된 보호 전략이었음을 보여줍니다.",
        realLifeExample: "말을 꺼내기 전에 상대가 불편해할지 먼저 계산하고, 내 의견보다 분위기를 부드럽게 만드는 쪽을 선택하기 쉽습니다.",
        woundPattern: "거절당하거나 차가운 반응을 받을까 봐 내 감정을 뒤로 미루는 패턴입니다.",
        selfEsteemImpact: "이 패턴이 길어지면 내 기준보다 타인의 반응이 우선순위가 되어 자기 확신이 약해집니다.",
        recoveryReframe: "눈치는 섬세함의 증거입니다. 다만 이제는 타인을 읽는 힘을 나를 지키는 힘으로 돌려야 합니다.",
        actionPractice: "오늘은 누군가의 표정을 해석하기 전에 내 감정과 원하는 것을 한 문장으로 먼저 적어보세요.",
        caution: "상대가 불편해 보인다는 추측만으로 내 선택을 접지 마세요.",
        innerSentence: "나는 분위기를 읽을 수 있지만, 내 감정도 똑같이 중요하다.",
        healingSentence: "타인의 표정은 정보일 뿐, 내 가치를 정하는 판결이 아니다.",
      },
      inner_monster: {
        easyAnswer: base,
        whyThisHappens: "거절이 관계의 단절처럼 느껴졌던 경험이 마음 안에 남아 있을 수 있습니다. " + cardLabel + "는 거절 불안 뒤에 인정받고 싶은 마음이 숨어 있음을 비춥니다.",
        realLifeExample: "부탁을 받으면 피곤해도 바로 답하거나, 어렵다는 말을 길게 설명하다가 결국 떠안게 됩니다.",
        woundPattern: "싫다고 말하면 사랑받지 못할 것이라는 조건부 인정의 패턴입니다.",
        selfEsteemImpact: "내 한계를 지키지 못할수록 자존감은 '얼마나 맞춰주었는가'에 묶이게 됩니다.",
        recoveryReframe: "거절은 관계를 끊는 말이 아니라 내가 감당 가능한 범위를 알려주는 말입니다.",
        actionPractice: "작은 부탁 하나에 '지금은 어렵지만 가능한 시간을 다시 알려줄게'라고 짧게 답해보세요.",
        caution: "미안함을 줄이기 위해 과도한 보상이나 긴 해명을 붙이지 마세요.",
        innerSentence: "내가 거절해도 관계를 존중할 수 있다.",
        healingSentence: "나는 모두를 만족시키지 않아도 충분히 소중한 사람이다.",
      },
      current_damage: {
        easyAnswer: base,
        whyThisHappens: "눈치 보는 습관은 몸과 마음을 계속 대기 상태로 만듭니다. " + cardLabel + "는 과잉 해석이 피로와 자기검열로 이어지는 지점을 보여줍니다.",
        realLifeExample: "메시지를 보내기 전 여러 번 고치거나, 상대의 답장 속도와 말투를 오래 곱씹게 됩니다.",
        woundPattern: "확인되지 않은 신호를 내 책임으로 끌어와 스스로를 압박하는 패턴입니다.",
        selfEsteemImpact: "겉으로는 조심스러워 보여도 안에서는 분노, 피로, 무력감이 쌓일 수 있습니다.",
        recoveryReframe: "모든 분위기를 해결해야 한다는 책임을 내려놓을수록 내 중심이 돌아옵니다.",
        actionPractice: "오늘 한 번은 사실과 추측을 분리해서 적고, 확인된 사실에만 반응해보세요.",
        caution: "상대의 침묵을 곧바로 거절이나 비난으로 해석하지 마세요.",
        innerSentence: "나는 반응을 예측하는 사람이 아니라 내 감정을 확인하는 사람이다.",
        healingSentence: "불확실함 속에서도 나는 나를 지킬 수 있다.",
      },
      mind_shield: {
        easyAnswer: base,
        whyThisHappens: "타인의 실망을 견디는 힘은 감정과 책임을 분리할 때 생깁니다. " + cardLabel + "는 부드럽지만 단단한 경계가 필요하다고 말합니다.",
        realLifeExample: "상대가 서운해해도 바로 달래기보다, 내가 할 수 있는 범위와 할 수 없는 범위를 나눠 말하는 장면입니다.",
        woundPattern: "상대의 불편함을 내 잘못으로 떠안는 패턴입니다.",
        selfEsteemImpact: "경계를 지키면 처음에는 불편해도, 시간이 지나며 내 선택을 믿는 힘이 쌓입니다.",
        recoveryReframe: "실망은 상대의 감정이고, 선택은 나의 책임입니다. 두 영역을 분리하면 관계가 더 건강해집니다.",
        actionPractice: "'이해하지만 이번에는 어렵다'처럼 짧고 분명한 문장을 준비해두세요.",
        caution: "경계를 설명하느라 나를 변호하는 대화로 빠지지 마세요.",
        innerSentence: "상대의 감정은 존중하지만 내가 모두 책임질 필요는 없다.",
        healingSentence: "내 경계는 차가움이 아니라 나를 지키는 품위다.",
      },
      levelup_mastery: {
        easyAnswer: base,
        whyThisHappens: "자존감은 거창한 선언보다 반복 가능한 작은 선택에서 회복됩니다. " + cardLabel + "는 내 마음을 먼저 확인하는 루틴이 핵심임을 보여줍니다.",
        realLifeExample: "하루를 시작할 때 오늘 지킬 기준 하나를 정하고, 밤에는 지킨 순간을 짧게 기록합니다.",
        woundPattern: "내 마음을 나중으로 미루는 습관이 자존감 회복을 늦춥니다.",
        selfEsteemImpact: "작은 기준을 지킬수록 '나는 나를 버리지 않는다'는 감각이 선명해집니다.",
        recoveryReframe: "나를 1순위로 둔다는 것은 이기적인 선택이 아니라 관계에 더 건강하게 머무는 방식입니다.",
        actionPractice: "오늘의 기준 하나를 정하고, 그 기준을 지킨 순간을 자기 전에 기록하세요.",
        caution: "완벽하게 바뀌어야 한다는 압박으로 시작하지 마세요.",
        innerSentence: "나는 작은 선택으로도 나를 회복시킬 수 있다.",
        healingSentence: "나는 나를 뒤로 미루지 않는 연습을 오늘부터 시작한다.",
      },
    };
    var t = templates[pos] || templates.levelup_mastery;
    return {
      positionIndex: Number(item && item.positionIndex ? item.positionIndex : idx + 1),
      positionKey: pos,
      positionTitle: label,
      icon: cleanReadingText(item && item.icon) || "✦",
      question: cleanReadingText(item && item.question) || label,
      cardName: cleanReadingText(item && item.cardName) || cardLabel,
      cardNameEn: cleanReadingText(item && item.cardNameEn) || cleanReadingText(card && card.name) || cardLabel,
      cardCode: cleanReadingText(item && item.cardCode) || cleanReadingText(card && (card.cardId || card.id)),
      orientation: cleanReadingText(item && item.orientation) || orientation,
      orientationLabel: cleanReadingText(item && item.orientationLabel) || (orientation === "reversed" ? "역방향" : "정방향"),
      keywords: Array.isArray(item && item.keywords) && item.keywords.length ? item.keywords.slice(0, 5) : label.split(/\s+/).slice(0, 5),
      easyAnswer: cleanReadingText(item && item.easyAnswer) || t.easyAnswer,
      whyThisHappens: cleanReadingText(item && item.whyThisHappens) || t.whyThisHappens,
      realLifeExample: cleanReadingText(item && item.realLifeExample) || t.realLifeExample,
      woundPattern: cleanReadingText(item && item.woundPattern) || t.woundPattern,
      selfEsteemImpact: cleanReadingText(item && item.selfEsteemImpact) || t.selfEsteemImpact,
      recoveryReframe: cleanReadingText(item && item.recoveryReframe) || t.recoveryReframe,
      actionPractice: cleanReadingText(item && item.actionPractice) || t.actionPractice,
      caution: cleanReadingText(item && item.caution) || t.caution,
      innerSentence: cleanReadingText(item && item.innerSentence) || t.innerSentence,
      healingSentence: cleanReadingText(item && item.healingSentence) || t.healingSentence,
      todayAction: cleanReadingText(item && item.todayAction) || t.actionPractice,
    };
  }

  function completeSelfEsteemReadingPayload(reading, cards) {
    var src = reading || {};
    var byPos = Object.create(null);
    (Array.isArray(src.positionReadings) ? src.positionReadings : []).forEach(function (item, idx) {
      var pos = cleanReadingText(item && (item.positionKey || item.position)) || POSITION_ORDER[idx];
      if (pos) byPos[pos] = item;
    });
    var positionReadings = POSITION_ORDER.map(function (pos, idx) {
      return buildPositionFields(pos, findCardForPosition(cards, pos, idx), byPos[pos], idx);
    });
    var byKey = Object.create(null);
    positionReadings.forEach(function (item) { byKey[item.positionKey] = item; });
    var opening = cleanReadingText(src.opening || src.story) || tarotSelfEsteemText("fallbackOpening");
    var topSummary = src.topSummary && typeof src.topSummary === "object" ? src.topSummary : {};
    var levelupGuide = src.levelupGuide && typeof src.levelupGuide === "object" ? src.levelupGuide : {};
    return Object.assign({}, src, {
      opening: opening,
      pastDebuff: cleanReadingText(src.pastDebuff) || byKey.past_debuff.easyAnswer,
      innerMonster: cleanReadingText(src.innerMonster) || byKey.inner_monster.easyAnswer,
      currentDamage: cleanReadingText(src.currentDamage) || byKey.current_damage.easyAnswer,
      mindShield: cleanReadingText(src.mindShield) || byKey.mind_shield.easyAnswer,
      levelupMastery: cleanReadingText(src.levelupMastery) || byKey.levelup_mastery.easyAnswer,
      levelupGuidance: cleanReadingText(src.levelupGuidance || src.advice) || tarotSelfEsteemText("fallbackGuidance"),
      topSummary: {
        flowLine: cleanReadingText(topSummary.flowLine || topSummary.flow) || tarotSelfEsteemText("fiveCardFlow"),
        corePattern: cleanReadingText(topSummary.corePattern) || byKey.past_debuff.easyAnswer,
        rootCause: cleanReadingText(topSummary.rootCause) || byKey.inner_monster.whyThisHappens,
        mainDamage: cleanReadingText(topSummary.mainDamage) || byKey.current_damage.selfEsteemImpact,
        recoveryKey: cleanReadingText(topSummary.recoveryKey) || tarotSelfEsteemText("recoveryKeyField"),
        automaticThought: cleanReadingText(topSummary.automaticThought) || byKey.inner_monster.caution,
        todayAction: cleanReadingText(topSummary.todayAction) || byKey.levelup_mastery.actionPractice,
      },
      levelupGuide: {
        flow: cleanReadingText(levelupGuide.flow) || tarotSelfEsteemText("fallbackGuidance"),
        rootPattern: cleanReadingText(levelupGuide.rootPattern) || byKey.past_debuff.woundPattern,
        woundStory: cleanReadingText(levelupGuide.woundStory) || byKey.current_damage.woundPattern,
        recoveryPath: cleanReadingText(levelupGuide.recoveryPath) || byKey.mind_shield.recoveryReframe,
        boundaryPractice: cleanReadingText(levelupGuide.boundaryPractice) || byKey.mind_shield.actionPractice,
        sevenDayQuest: Array.isArray(levelupGuide.sevenDayQuest) && levelupGuide.sevenDayQuest.length ? levelupGuide.sevenDayQuest : [
          tarotSelfEsteemText("fallbackActionOne"),
          tarotSelfEsteemText("fallbackActionTwo"),
          tarotSelfEsteemText("fallbackActionThree"),
          tarotSelfEsteemText("fallbackActionFour"),
          tarotSelfEsteemText("fallbackActionFive"),
        ],
        practiceSentence: cleanReadingText(levelupGuide.practiceSentence) || tarotSelfEsteemText("fallbackActionOne"),
      },
      levelupQuests: Array.isArray(src.levelupQuests) ? src.levelupQuests : [],
      actionPlan: Array.isArray(src.actionPlan) && src.actionPlan.length ? src.actionPlan : [
        byKey.levelup_mastery.actionPractice,
        tarotSelfEsteemText("fallbackActionTwo"),
        tarotSelfEsteemText("fallbackActionThree"),
      ],
      positionReadings: positionReadings,
    });
  }

  function showTarotSelfEsteemFinalReading() {
    if (state.revealedCount < 5 || !state.cards.length) return;
    /* 무료 기능: 인증이 강제되는 /api/tarot/reading 대신 로컬 결정적 리딩으로 즉시 결과 표시 */
    state.reading = buildFallbackReading();
    var draw = byId("tarotSelfEsteemDrawStage");
    var result = byId("tarotSelfEsteemResultStage");
    if (draw) draw.classList.remove("is-active");
    if (result) result.classList.add("is-active");
    renderTarotSelfEsteemResult();
  }

  function escapeHtml(s) {
    if (!s) return "";
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function compactSelfEsteemPromptText(value, fallback) {
    var text = "";
    if (Array.isArray(value)) {
      text = value.map(function (line) { return String(line || "").trim(); }).filter(Boolean).join(" / ");
    } else {
      text = String(value || "").trim();
    }
    text = text.replace(/\s+/g, " ").trim();
    return text ? text.slice(0, 560) : (fallback || "");
  }

  function buildTarotSelfEsteemAiPromptText(reading, positionItems) {
    var r = reading || {};
    var items = Array.isArray(positionItems) ? positionItems : [];
    if (!r || (!items.length && !r.opening && !r.topSummary && !r.levelupGuide)) return "";

    var cardLines = items.slice(0, 5).map(function (item, idx) {
      var card = null;
      (state.cards || []).forEach(function (c) {
        if (c && c.position === item.positionKey) card = c;
      });
      var position = compactSelfEsteemPromptText(item.positionTitle || tarotSelfEsteemPositionLabel(item.positionKey, idx), tarotSelfEsteemText("positionFallback", { number: idx + 1 }));
      var cardName = compactSelfEsteemPromptText(item.cardName || item.cardNameEn || (card && (card.nameKr || card.name)), tarotSelfEsteemCardFallback(idx));
      var orientation = compactSelfEsteemPromptText(item.orientationLabel || tarotSelfEsteemOrientationLabel(card && card.orientation));
      var keywords = Array.isArray(item.keywords) ? item.keywords.map(function (kw) { return String(kw || "").trim(); }).filter(Boolean).slice(0, 4).join(", ") : "";
      var message = compactSelfEsteemPromptText(item.easyAnswer || item.recoveryReframe || item.healingSentence);
      var practice = compactSelfEsteemPromptText(item.actionPractice || item.todayAction || item.caution);
      return [
        (idx + 1) + ". " + position + ": " + cardName + (orientation ? " " + orientation : ""),
        keywords ? tarotSelfEsteemText("keywordsLabel") + ": " + keywords : "",
        message ? tarotSelfEsteemText("messageLabel") + ": " + message : "",
        practice ? tarotSelfEsteemText("todayRecoveryLabel") + ": " + practice : "",
      ].filter(Boolean).join(" | ");
    });

    var top = r.topSummary && typeof r.topSummary === "object" ? r.topSummary : {};
    var guide = r.levelupGuide && typeof r.levelupGuide === "object" ? r.levelupGuide : {};
    var questLines = Array.isArray(guide.sevenDayQuest) ? guide.sevenDayQuest.map(function (line, idx) {
      return (idx + 1) + ". " + compactSelfEsteemPromptText(line);
    }).filter(Boolean).slice(0, 7) : [];
    var actionLines = Array.isArray(r.actionPlan) ? r.actionPlan.map(function (line, idx) {
      return (idx + 1) + ". " + compactSelfEsteemPromptText(line);
    }).filter(Boolean).slice(0, 5) : [];

    return [
      tarotSelfEsteemText("promptIntro"),
      "",
      tarotSelfEsteemText("promptTone"),
      "",
      "[" + tarotSelfEsteemText("promptOpening") + "] " + compactSelfEsteemPromptText(r.opening, tarotSelfEsteemText("promptOpeningFallback")),
      "[" + tarotSelfEsteemText("promptFlow") + "] " + compactSelfEsteemPromptText(top.flowLine || top.flow || guide.flow, tarotSelfEsteemText("promptFlowFallback")),
      "[" + tarotSelfEsteemText("promptCorePattern") + "] " + compactSelfEsteemPromptText(top.corePattern || guide.rootPattern || r.pastDebuff),
      "[" + tarotSelfEsteemText("promptRootCause") + "] " + compactSelfEsteemPromptText(top.rootCause || r.innerMonster),
      "[" + tarotSelfEsteemText("promptRecoveryKey") + "] " + compactSelfEsteemPromptText(top.recoveryKey || guide.recoveryPath || r.mindShield),
      "",
      "[" + tarotSelfEsteemText("promptCards") + "]",
      cardLines.join("\n"),
      "",
      "[" + tarotSelfEsteemText("promptGuide") + "]",
      compactSelfEsteemPromptText(guide.boundaryPractice || r.levelupGuidance),
      compactSelfEsteemPromptText(guide.practiceSentence || top.todayAction || r.levelupMastery),
      questLines.length ? "[" + tarotSelfEsteemText("promptQuest") + "]\n" + questLines.join("\n") : "",
      actionLines.length ? "[" + tarotSelfEsteemText("promptTodayAction") + "]\n" + actionLines.join("\n") : "",
      "",
      tarotSelfEsteemText("promptClosing"),
    ].filter(function (line) { return String(line || "").trim(); }).join("\n");
  }

  function copyTarotSelfEsteemAiPrompt(self) {
    var panel = self && self.closest ? self.closest(".tarot-self-esteem-ai-prompt-panel") : null;
    var textarea = panel ? panel.querySelector("#tarotSelfEsteemAiPromptOutput") : byId("tarotSelfEsteemAiPromptOutput");
    var status = panel ? panel.querySelector(".tarot-self-esteem-ai-prompt-status") : byId("tarotSelfEsteemAiPromptStatus");
    var text = textarea ? String(textarea.value || "") : "";
    if (!text) return;

    function done(message, ok) {
      if (!status) return;
      status.textContent = message;
      status.setAttribute("data-state", ok ? "success" : "warn");
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        done(tarotSelfEsteemText("copySuccess"), true);
      }).catch(function () {
        try {
          textarea.focus();
          textarea.select();
          document.execCommand("copy");
          done(tarotSelfEsteemText("copySuccess"), true);
        } catch (e) {
          done(tarotSelfEsteemText("copyManual"), false);
        }
      });
      return;
    }

    try {
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      done(tarotSelfEsteemText("copySuccess"), true);
    } catch (e2) {
      done(tarotSelfEsteemText("copyManual"), false);
    }
  }

  function renderTarotSelfEsteemAiPromptPanel(container, reading, positionItems) {
    if (!container || !reading) return;
    var promptText = buildTarotSelfEsteemAiPromptText(reading, positionItems);
    if (!promptText) return;

    var section = document.createElement("section");
    section.className = "tarot-self-esteem-section tarot-self-esteem-ai-prompt-panel";
    section.setAttribute("data-marker", "tarot-self-esteem-ai-prompt-bottom-v20260621");
    section.innerHTML =
      '<p class="tarot-self-esteem-ai-prompt-kicker">' + escapeHtml(tarotSelfEsteemText("aiPromptKicker")) + '</p>' +
      '<h3 class="tarot-self-esteem-ai-prompt-title">' + escapeHtml(tarotSelfEsteemText("aiPromptTitle")) + '</h3>' +
      '<p class="tarot-self-esteem-ai-prompt-lead">' + escapeHtml(tarotSelfEsteemText("aiPromptLead")) + '</p>' +
      '<textarea id="tarotSelfEsteemAiPromptOutput" class="tarot-self-esteem-ai-prompt-output" readonly></textarea>' +
      '<div class="tarot-self-esteem-ai-prompt-actions">' +
      '<button type="button" class="tarot-self-esteem-ai-prompt-copy" data-action="copyTarotSelfEsteemAiPrompt" data-action-pass-self="1">' + escapeHtml(tarotSelfEsteemText("copyPrompt")) + '</button>' +
      '<span id="tarotSelfEsteemAiPromptStatus" class="tarot-self-esteem-ai-prompt-status" aria-live="polite"></span>' +
      '</div>';

    var textarea = section.querySelector("#tarotSelfEsteemAiPromptOutput");
    if (textarea) textarea.value = promptText;
    container.appendChild(section);
  }

  function typeWriter(el, text, options, callback) {
    if (!el || text == null) {
          if (typeof callback === "function") callback();
          return;
        }
    var speed = (options && options.speed) != null ? options.speed : 22;
    var idx = 0;
    var str = String(text);
    el.textContent = "";
    function tick() {
      if (idx >= str.length) {
        if (typeof callback === "function") callback();
        return;
      }
      idx += 1;
      el.textContent = str.slice(0, idx);
      setTimeout(tick, speed);
    }
    tick();
  }

  function runTypingSequence(container, sections, index, onComplete) {
    if (!container || !Array.isArray(sections) || index >= sections.length) {
      if (typeof onComplete === "function") onComplete();
      return;
    }
    var item = sections[index];
    var section = document.createElement("section");
    section.className = item.highlight ? "tarot-self-esteem-section tarot-self-esteem-section--highlight" : "tarot-self-esteem-section";
    var title = document.createElement("h4");
    title.className = "tarot-self-esteem-section-title";
    title.textContent = item.title;
    section.appendChild(title);
    if (item.listItems) {
      var ul = document.createElement("ul");
      ul.className = "tarot-self-esteem-advice-list";
      section.appendChild(ul);
      container.appendChild(section);
      var listIdx = 0;
      function addNextLi() {
        if (listIdx >= item.listItems.length) {
          var scrollEl = container;
          if (scrollEl && scrollEl.scrollHeight > scrollEl.clientHeight) {
            scrollEl.scrollTop = scrollEl.scrollHeight - scrollEl.clientHeight;
          }
          runTypingSequence(container, sections, index + 1, onComplete);
          return;
        }
        var li = document.createElement("li");
        li.textContent = "";
        ul.appendChild(li);
        typeWriter(li, item.listItems[listIdx], { speed: 18 }, function () {
          listIdx += 1;
          addNextLi();
        });
      }
      addNextLi();
    } else {
      var p = document.createElement("p");
      p.className = "tarot-self-esteem-section-text";
      section.appendChild(p);
      container.appendChild(section);
      var scrollEl = container;
      if (scrollEl && scrollEl.scrollHeight > scrollEl.clientHeight) {
        scrollEl.scrollTop = scrollEl.scrollHeight - scrollEl.clientHeight;
      }
      typeWriter(p, item.text, { speed: 20 }, function () {
        runTypingSequence(container, sections, index + 1, onComplete);
      });
    }
  }

  function attachLevelUpOnScroll(container) {
    var banner = byId("tarotSelfEsteemLevelUpBanner");
    var levelUpShown = false;
    var ticking = false;
    function checkScroll() {
      if (levelUpShown || !container) return;
      var st = container.scrollTop;
      var ch = container.clientHeight;
      var sh = container.scrollHeight;
      if (sh <= ch || st + ch >= sh - 40) {
        levelUpShown = true;
        if (banner) {
          banner.classList.add("is-visible");
          banner.setAttribute("aria-hidden", "false");
        }
        triggerLevelUpConfetti();
      }
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        checkScroll();
      });
    }
    container.addEventListener("scroll", onScroll, { passive: true });
    checkScroll();
  }

  function buildResultSections(r) {
    var sections = [];
    if (r.opening) {
      sections.push({ title: tarotSelfEsteemText("openingMessage"), text: r.opening });
    }
    if (r.pastDebuff) sections.push({ title: "1. " + tarotSelfEsteemPositionLabel("past_debuff"), text: r.pastDebuff });
    if (r.innerMonster) sections.push({ title: "2. " + tarotSelfEsteemPositionLabel("inner_monster"), text: r.innerMonster });
    if (r.currentDamage) sections.push({ title: "3. " + tarotSelfEsteemPositionLabel("current_damage"), text: r.currentDamage });
    if (r.mindShield) sections.push({ title: "4. " + tarotSelfEsteemPositionLabel("mind_shield"), text: r.mindShield });
    if (r.levelupMastery) sections.push({ title: "5. " + tarotSelfEsteemPositionLabel("levelup_mastery"), text: r.levelupMastery });
    if (r.levelupGuidance) {
      sections.push({ title: tarotSelfEsteemText("recoveryGuide"), text: r.levelupGuidance, highlight: true });
    }
    if (Array.isArray(r.actionPlan) && r.actionPlan.length) {
      sections.push({ title: tarotSelfEsteemText("todayRecoveryPractice"), listItems: r.actionPlan });
    }
    return sections;
  }

  function renderTarotSelfEsteemResult() {
    var container = byId("tarotSelfEsteemReadingContent");
    if (!container || !state.reading) return;
    var r = state.reading;

    if (!r.opening && !r.topSummary && !r.levelupGuide && (!Array.isArray(r.positionReadings) || !r.positionReadings.length) && (!Array.isArray(r.positionInsights) || !r.positionInsights.length)) {
      state.reading = buildFallbackReading();
      r = state.reading;
    }

    container.innerHTML = "";

    var positionItems = Array.isArray(r.positionReadings) && r.positionReadings.length ? r.positionReadings : [];
    if (!positionItems.length && Array.isArray(r.positionInsights) && r.positionInsights.length) {
      positionItems = r.positionInsights.map(function (item, idx) {
        return {
          positionIndex: idx + 1,
          positionKey: String(item.position || POSITION_ORDER[idx] || `position_${idx + 1}`),
          positionTitle: String(item.title || item.subtitle || tarotSelfEsteemPositionLabel(item.position, idx)),
          question: String(item.question || ""),
          cardName: String(item.cardLabel || ""),
          cardNameEn: String(item.cardLabel || ""),
          cardCode: "",
          orientation: /\(역\)|역방향/.test(String(item.cardLabel || "")) ? "reversed" : "upright",
          orientationLabel: /\(역\)|역방향/.test(String(item.cardLabel || "")) ? tarotSelfEsteemOrientationLabel("reversed") : tarotSelfEsteemOrientationLabel("upright"),
          keywords: Array.isArray(item.keywords) ? item.keywords.slice(0, 5) : [],
          easyAnswer: String(item.message || ""),
          whyThisHappens: String(item.message || ""),
          realLifeExample: String(item.message || ""),
          woundPattern: String(item.message || ""),
          selfEsteemImpact: String(item.message || ""),
          recoveryReframe: String(item.message || ""),
          actionPractice: String(item.message || ""),
          caution: String(item.message || ""),
          innerSentence: String(item.message || ""),
          healingSentence: String(item.message || ""),
        };
      });
    }

    function addField(section, title, value, className) {
      if (!String(value || "").trim()) return false;
      var wrap = document.createElement("div");
      wrap.className = "tse-self-esteem-field" + (className ? " " + className : "");
      var h = document.createElement("p");
      h.className = "tse-self-esteem-field-title";
      h.textContent = title;
      var p = document.createElement("p");
      p.className = "tse-self-esteem-field-text";
      p.textContent = String(value);
      wrap.appendChild(h);
      wrap.appendChild(p);
      section.appendChild(wrap);
      return true;
    }

    // Opening banner
    if (r.opening) {
      var openDiv = document.createElement("div");
      openDiv.className = "tse-opening";
      var openIcon = document.createElement("span");
      openIcon.className = "tse-opening-icon";
      openIcon.textContent = "✨";
      var openP = document.createElement("p");
      openP.className = "tse-opening-text";
      openP.textContent = r.opening;
      openDiv.appendChild(openIcon);
      openDiv.appendChild(openP);
      container.appendChild(openDiv);
    }

    if (r.topSummary && typeof r.topSummary === "object") {
      var ts = r.topSummary;
      var summaryFlow = cleanReadingText(ts.flowLine || ts.flow);
      var summaryItems = [
        [tarotSelfEsteemText("corePatternField"), ts.corePattern],
        [tarotSelfEsteemText("rootCauseField"), ts.rootCause],
        [tarotSelfEsteemText("mainDamageField"), ts.mainDamage],
        [tarotSelfEsteemText("recoveryKeyField"), ts.recoveryKey],
        [tarotSelfEsteemText("automaticThoughtField"), ts.automaticThought],
        [tarotSelfEsteemText("todayActionField"), ts.todayAction],
      ].filter(function (row) { return cleanReadingText(row[1]); });
      if (summaryFlow || summaryItems.length) {
        var summaryCard = document.createElement("div");
        summaryCard.className = "tse-levelup-card tse-levelup-card--summary";
        summaryCard.innerHTML =
          '<p class="tse-levelup-title">' + escapeHtml(tarotSelfEsteemText("summaryTitle")) + '</p>' +
          (summaryFlow ? '<p class="tse-levelup-body"><strong>' + escapeHtml(tarotSelfEsteemText("fiveCardFlow")) + ':</strong> ' + escapeHtml(summaryFlow) + '</p>' : '') +
          (summaryItems.length ? '<ul class="tse-levelup-list">' + summaryItems.map(function (row) {
            return '<li class="tse-levelup-item"><strong>' + escapeHtml(row[0]) + ':</strong> ' + escapeHtml(cleanReadingText(row[1])) + '</li>';
          }).join("") + '</ul>' : '');
        container.appendChild(summaryCard);
      }
    }


    positionItems.forEach(function (item, idx) {
      if (!item) return;
      var card = null;
      (state.cards || []).forEach(function (c) { if (c.position === item.positionKey) card = c; });
      var cardName = card ? ((card.nameKr || card.name) + (card.orientation === "reversed" ? " (" + tarotSelfEsteemOrientationLabel("reversed") + ")" : "")) : String(item.cardName || "");
      var insightCard = document.createElement("div");
      insightCard.className = "tse-insight-card";
      insightCard.setAttribute("data-pos", item.positionKey || `pos_${idx + 1}`);
      insightCard.style.animationDelay = (idx * 0.08) + "s";

      var header = document.createElement("div");
      header.className = "tse-card-header";

      var badge = document.createElement("span");
      badge.className = "tse-card-badge";
      badge.textContent = String(item.positionIndex || (idx + 1));

      var icon = document.createElement("span");
      icon.className = "tse-card-icon";
      icon.textContent = String(item.icon || "✦");

      var meta = document.createElement("div");
      meta.className = "tse-card-meta";

      var posLabel = document.createElement("span");
      posLabel.className = "tse-card-position";
      posLabel.textContent = String(item.positionTitle || tarotSelfEsteemPositionLabel(item.positionKey, idx));
      meta.appendChild(posLabel);

      if (cardName) {
        var nameEl = document.createElement("span");
        nameEl.className = "tse-card-name";
        nameEl.textContent = cardName;
        meta.appendChild(nameEl);
      }

      header.appendChild(badge);
      header.appendChild(icon);
      header.appendChild(meta);
      insightCard.appendChild(header);

      var intro = document.createElement("p");
      intro.className = "tse-card-body";
      intro.innerHTML =
        (String(item.question || "").trim() ? "<strong>" + escapeHtml(tarotSelfEsteemText("questionLabel")) + ":</strong> " + escapeHtml(String(item.question)) + "<br>" : "") +
        (cardName ? "<strong>" + escapeHtml(tarotSelfEsteemText("cardLabel")) + ":</strong> " + escapeHtml(cardName) + "<br>" : "") +
        (String(item.orientationLabel || "").trim() ? "<strong>" + escapeHtml(tarotSelfEsteemText("directionLabel")) + ":</strong> " + escapeHtml(String(item.orientationLabel)) : "");
      if (intro.innerHTML) insightCard.appendChild(intro);

      [
        { title: tarotSelfEsteemText("fieldQuickAnswer"), value: item.easyAnswer },
        { title: tarotSelfEsteemText("fieldPatternReason"), value: item.whyThisHappens },
        { title: tarotSelfEsteemText("fieldRealLife"), value: item.realLifeExample },
        { title: tarotSelfEsteemText("fieldSignal"), value: item.woundPattern },
        { title: tarotSelfEsteemText("fieldImpact"), value: item.selfEsteemImpact },
        { title: tarotSelfEsteemText("fieldRecovery"), value: item.recoveryReframe },
        { title: tarotSelfEsteemText("fieldPractice"), value: item.actionPractice },
        { title: tarotSelfEsteemText("fieldCaution"), value: item.caution },
        { title: tarotSelfEsteemText("fieldInnerSentence"), value: item.innerSentence },
        { title: tarotSelfEsteemText("fieldHealingSentence"), value: item.healingSentence },
      ].forEach(function (field) {
        addField(insightCard, field.title, field.value);
      });

      var keywordValues = Array.isArray(item.keywords) ? item.keywords.slice(0, 5) : [];
      if (keywordValues.length) {
        var keywordWrap = document.createElement("div");
        keywordWrap.className = "tse-card-keywords";
        keywordValues.forEach(function (kw) {
          var chip = document.createElement("span");
          chip.className = "tse-keyword";
          chip.textContent = "#" + kw;
          keywordWrap.appendChild(chip);
        });
        insightCard.appendChild(keywordWrap);
      }

      if (String(item.todayAction || item.actionPractice || "").trim()) {
        var action = document.createElement("p");
        action.className = "tse-card-action";
        action.textContent = tarotSelfEsteemText("todayRecoveryPractice") + ": " + String(item.todayAction || item.actionPractice);
        insightCard.appendChild(action);
      }

      container.appendChild(insightCard);
    });

    if (r.levelupGuide && typeof r.levelupGuide === "object") {
      var lvCard = document.createElement("div");
      lvCard.className = "tse-levelup-card";
      lvCard.innerHTML = '<p class="tse-levelup-title">' + escapeHtml(tarotSelfEsteemText("recoveryGuide")) + '</p>';
      var guideFieldCount = 0;
      if (addField(lvCard, tarotSelfEsteemText("flowField"), r.levelupGuide.flow)) guideFieldCount += 1;
      if (addField(lvCard, tarotSelfEsteemText("rootPatternField"), r.levelupGuide.rootPattern)) guideFieldCount += 1;
      if (addField(lvCard, tarotSelfEsteemText("woundStoryField"), r.levelupGuide.woundStory)) guideFieldCount += 1;
      if (addField(lvCard, tarotSelfEsteemText("recoveryPathField"), r.levelupGuide.recoveryPath)) guideFieldCount += 1;
      if (addField(lvCard, tarotSelfEsteemText("boundaryPracticeField"), r.levelupGuide.boundaryPractice)) guideFieldCount += 1;
      if (Array.isArray(r.levelupGuide.sevenDayQuest) && r.levelupGuide.sevenDayQuest.length) {
        var questTitle = document.createElement("p");
        questTitle.className = "tse-self-esteem-field-title";
        questTitle.textContent = tarotSelfEsteemText("sevenDayQuestTitle");
        lvCard.appendChild(questTitle);
        var questList = document.createElement("ul");
        questList.className = "tse-levelup-list";
        r.levelupGuide.sevenDayQuest.forEach(function (line) {
          var li = document.createElement("li");
          li.className = "tse-levelup-item";
          li.textContent = line;
          questList.appendChild(li);
        });
        lvCard.appendChild(questList);
        guideFieldCount += 1;
      }
      if (addField(lvCard, tarotSelfEsteemText("practiceSentenceField"), r.levelupGuide.practiceSentence)) guideFieldCount += 1;
      if (guideFieldCount) container.appendChild(lvCard);
    }

    if (Array.isArray(r.levelupQuests) && r.levelupQuests.length) {
      var questCard = document.createElement("div");
      questCard.className = "tse-action-card";
      var questTitle = document.createElement("p");
      questTitle.className = "tse-action-title";
      questTitle.textContent = tarotSelfEsteemText("todayRecoveryPractice");
      var questUl = document.createElement("ul");
      questUl.className = "tse-quest-list";
      var difficultyLabel = {
        easy: tarotSelfEsteemText("difficultyEasy"),
        normal: tarotSelfEsteemText("difficultyNormal"),
        hard: tarotSelfEsteemText("difficultyHard"),
      };
      r.levelupQuests.slice(0, 3).forEach(function (quest, i) {
        var li = document.createElement("li");
        li.className = "tse-quest-item";
        li.innerHTML =
          '<span class="tse-quest-num">' + String(i + 1) + '</span>' +
          '<span><strong>' + escapeHtml(String(quest.title || tarotSelfEsteemText("questFallbackTitle"))) + '</strong>' +
          '<br><small>' + escapeHtml(tarotSelfEsteemText("difficultyLabel")) + ': ' + escapeHtml(difficultyLabel[String(quest.difficulty || "normal")] || tarotSelfEsteemText("difficultyNormal")) + '</small>' +
          '<br><small>' + escapeHtml(tarotSelfEsteemText("purposeLabel")) + ': ' + escapeHtml(String(quest.purpose || "")) + '</small>' +
          '<br><small>' + escapeHtml(tarotSelfEsteemText("actionLabel")) + ': ' + escapeHtml(String(quest.action || "")) + '</small>' +
          '<br><small>' + escapeHtml(tarotSelfEsteemText("completionLabel")) + ': ' + escapeHtml(String(quest.completionCheck || "")) + '</small></span>';
        questUl.appendChild(li);
      });
      questCard.appendChild(questTitle);
      questCard.appendChild(questUl);
      container.appendChild(questCard);
    }

    if (Array.isArray(r.actionPlan) && r.actionPlan.length) {
      var actionCard = document.createElement("div");
      actionCard.className = "tse-action-card";
      var actionTitle = document.createElement("p");
      actionTitle.className = "tse-action-title";
      actionTitle.textContent = tarotSelfEsteemText("todayRecoveryPractice");
      var ul = document.createElement("ul");
      ul.className = "tse-quest-list";
      r.actionPlan.forEach(function (itemText, i) {
        var li = document.createElement("li");
        li.className = "tse-quest-item";
        var num = document.createElement("span");
        num.className = "tse-quest-num";
        num.textContent = String(i + 1);
        var text = document.createElement("span");
        text.textContent = itemText;
        li.appendChild(num);
        li.appendChild(text);
        ul.appendChild(li);
      });
      actionCard.appendChild(actionTitle);
      actionCard.appendChild(ul);
      container.appendChild(actionCard);
    }

    renderTarotSelfEsteemAiPromptPanel(container, r, positionItems);
    attachLevelUpOnScroll(container);
  }

  function shareTarotSelfEsteemResult() {
    var r = state.reading;
    if (!r) return;
    var text = "✨ [" + tarotSelfEsteemText("shareTitle") + "] ✨\n\n";
    if (r.opening) text += tarotSelfEsteemText("shareOpeningLabel") + ": " + r.opening + "\n\n";
    if (r.levelupMastery) text += tarotSelfEsteemText("shareMasteryLabel") + ": " + r.levelupMastery + "\n\n";
    text += tarotSelfEsteemText("shareLinkLabel") + ": https://code-destiny.com";

    if (navigator.share) {
      navigator.share({
        title: tarotSelfEsteemText("shareTitle"),
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
        copyToClipboard(text, tarotSelfEsteemText("shareCopySuccess"));
      }
    }, 800);
  }

  window.openTarotSelfEsteemModal = openTarotSelfEsteemModal;
  window.closeTarotSelfEsteemModal = closeTarotSelfEsteemModal;
  window.resetTarotSelfEsteemFlow = resetTarotSelfEsteemFlow;
  window.startTarotSelfEsteemReading = startTarotSelfEsteemReading;
  window.flipTarotSelfEsteemCard = flipTarotSelfEsteemCard;
  window.showTarotSelfEsteemFinalReading = showTarotSelfEsteemFinalReading;
  window.shareTarotSelfEsteemResult = shareTarotSelfEsteemResult;
  window.copyTarotSelfEsteemAiPrompt = copyTarotSelfEsteemAiPrompt;
})();

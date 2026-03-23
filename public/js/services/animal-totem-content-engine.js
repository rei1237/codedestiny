(function(global) {
  "use strict";

  var MODE_SLOTS = {
    one: ["today_guide"],
    three: ["past_wound", "present_energy", "integration_path"],
    five: ["mind", "heart", "shadow", "gift", "next_action"]
  };

  var FALLBACK_EMOJIS = ["🐱", "🐶", "🐰", "🦊", "🐻", "🐦", "🦋", "🦉", "🐬", "🐢", "🐿️", "🦌", "🐺", "🦅"];
  var FALLBACK_NAMES = ["고양이", "강아지", "토끼", "여우", "곰", "파랑새", "나비", "올빼미", "돌고래", "거북이", "다람쥐", "사슴", "늑대", "독수리"];
  var PASTEL_PALETTE = [
    { primary: "#fecdd3", glow: "#fbcfe8", particle: "#ffe4e6" },
    { primary: "#bfdbfe", glow: "#bae6fd", particle: "#e0f2fe" },
    { primary: "#ddd6fe", glow: "#e9d5ff", particle: "#f3e8ff" },
    { primary: "#bbf7d0", glow: "#a7f3d0", particle: "#dcfce7" },
    { primary: "#fde68a", glow: "#fef3c7", particle: "#fef9c3" }
  ];

  function normalizeMode(mode) {
    if (mode === "five") return "five";
    if (mode === "one") return "one";
    return "three";
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function elementToBackground(element) {
    var map = {
      wood: "새싹 숲, 넝쿨, 이슬, 바람",
      fire: "노을, 반짝이는 빛 입자, 따뜻한 햇살",
      earth: "파스텔 언덕, 꽃밭, 흙빛 오브제",
      metal: "별가루, 수정, 은은한 금속성 하이라이트",
      water: "물결, 구름, 달빛 반사"
    };
    return map[element] || "몽환적인 파스텔 자연 배경";
  }

  function elementToExpression(element) {
    var map = {
      wood: "호기심 많은 미소",
      fire: "활기찬 밝은 미소",
      earth: "편안하고 포근한 미소",
      metal: "또렷하고 자신감 있는 표정",
      water: "차분하고 신비로운 미소"
    };
    return map[element] || "부드러운 미소";
  }

  function resolveSajuVisualContext(userContext) {
    var visual = (userContext && userContext.saju_visual) ? userContext.saju_visual : {};
    var dominant = visual.dominant_element || "earth";
    return {
      dominant_element: dominant,
      expression_seed: visual.expression_seed || elementToExpression(dominant),
      background_seed: visual.background_seed || elementToBackground(dominant),
      five_elements: visual.five_elements || null,
      summary: visual.summary || "사주 성향 기반 시각 가이드"
    };
  }

  function buildFallback(mode, reason, userContext) {
    var spreadMode = normalizeMode(mode);
    var slots = MODE_SLOTS[spreadMode];
    var visual = resolveSajuVisualContext(userContext);
    var cards = slots.map(function(slot, idx) {
      var color = PASTEL_PALETTE[idx % PASTEL_PALETTE.length];
      var expression = visual.expression_seed;
      var background = visual.background_seed;
      var animal = {
        id: "fallback-" + slot,
        name_ko: FALLBACK_NAMES[idx % FALLBACK_NAMES.length],
        emoji: FALLBACK_EMOJIS[idx % FALLBACK_EMOJIS.length],
        category: "파스텔 가이드",
        color_theme: color,
        facial_expression: expression,
        background_motif: background,
        illustration_prompt: "귀여운 동물 캐릭터, 파스텔톤, 둥근 형태, 부드러운 명암, 동화풍 일러스트, 표정: " + expression + ", 배경: " + background
      };
      return {
        slot: slot,
        animal: animal,
        layered_reading: {
          essence: "지금은 마음을 가볍게 정돈하는 시간이 필요해요.",
          direct_message: "작은 동물 친구처럼 오늘의 감정을 부드럽게 돌봐주세요.",
          daily_actions: [
            "깊은 호흡 3회를 하며 마음을 진정시켜 보세요.",
            "오늘의 감정을 한 줄로 기록해 보세요.",
            "나를 미소 짓게 하는 작은 행동을 하나 해보세요."
          ],
          ritual: "5분간 따뜻한 차와 함께 조용히 앉아 오늘의 마음을 관찰하세요.",
          journaling: ["오늘 가장 크게 느낀 감정은 무엇인가요?", "내가 지금 원하는 위로는 무엇인가요?"],
          shadow_warning: "비교가 깊어지면 에너지가 빠질 수 있어요.",
          affirmation: "나는 부드럽게 나를 돌보며 오늘을 잘 건넌다."
        }
      };
    });

    return {
      mode: spreadMode,
      spread: {
        mode: spreadMode,
        cards: cards.map(function(item) { return { slot: item.slot, card: clone(item.animal) }; }),
        created_at: new Date().toISOString()
      },
      consultation: {
        mode: spreadMode,
        opening_message: "오늘의 기본 동물 리딩을 표시합니다." + (reason ? " (" + reason + ")" : ""),
        cards: cards,
        closing_guidance: "파스텔톤 귀여운 동물 콘셉트로 표시되었습니다."
      }
    };
  }

  async function generateConsultation(mode, userContext) {
    var spreadMode = normalizeMode(mode);
    return buildFallback(spreadMode, "local mode", userContext);
  }

  global.AnimalTotemContentEngine = {
    version: "3.0.0-local",
    isComingSoon: false,
    model: "local-fallback",
    generateConsultation: generateConsultation,
    buildFallback: buildFallback
  };
})(window);
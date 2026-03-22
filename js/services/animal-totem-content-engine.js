(function(global) {
  "use strict";

  var GEMINI_MODEL = "gemini-1.5-flash";

  function resolveGeminiApiKey() {
    try {
      if (global.__ENV__ && global.__ENV__.GEMINI_API_KEY) return String(global.__ENV__.GEMINI_API_KEY);
      if (global.CODE_DESTINY_GEMINI_API_KEY) return String(global.CODE_DESTINY_GEMINI_API_KEY);
      var meta = document.querySelector('meta[name="code-destiny-gemini-key"]');
      if (meta && meta.content) return String(meta.content);
      return "";
    } catch (_) {
      return "";
    }
  }

  function buildGeminiUrl(apiKey) {
    return "https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent?key=" + encodeURIComponent(apiKey || "");
  }

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
        opening_message: "Gemini 응답 지연으로 기본 리딩을 표시합니다." + (reason ? " (" + reason + ")" : ""),
        cards: cards,
        closing_guidance: "파스텔톤 귀여운 동물 콘셉트로 표시되었습니다."
      }
    };
  }

  function extractTextFromGeminiResponse(payload) {
    if (!payload || !payload.candidates || !payload.candidates.length) return "";
    var parts = (((payload.candidates[0] || {}).content || {}).parts) || [];
    return parts.map(function(part) { return part && part.text ? part.text : ""; }).join("\n").trim();
  }

  function parseJsonSafely(text) {
    if (!text) return null;
    try { return JSON.parse(text); } catch (_) {}
    var match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try { return JSON.parse(match[0]); } catch (_) { return null; }
  }

  function sanitizeCard(card, slot, idx) {
    var base = card || {};
    var color = base.color_theme || PASTEL_PALETTE[idx % PASTEL_PALETTE.length];
    var layered = base.layered_reading || {};
    var visual = resolveSajuVisualContext({ saju_visual: {
      dominant_element: base.dominant_element,
      expression_seed: (base.animal && base.animal.facial_expression) || base.facial_expression,
      background_seed: (base.animal && base.animal.background_motif) || base.background_motif
    }});
    return {
      slot: slot,
      animal: {
        id: "gemini-" + slot + "-" + idx,
        name_ko: (base.animal && base.animal.name_ko) || base.name_ko || FALLBACK_NAMES[idx % FALLBACK_NAMES.length],
        emoji: (base.animal && base.animal.emoji) || base.emoji || FALLBACK_EMOJIS[idx % FALLBACK_EMOJIS.length],
        category: (base.animal && base.animal.category) || base.category || "AI 리딩",
        color_theme: {
          primary: color.primary || PASTEL_PALETTE[idx % PASTEL_PALETTE.length].primary,
          glow: color.glow || PASTEL_PALETTE[idx % PASTEL_PALETTE.length].glow,
          particle: color.particle || PASTEL_PALETTE[idx % PASTEL_PALETTE.length].particle
        },
        facial_expression: (base.animal && base.animal.facial_expression) || base.facial_expression || visual.expression_seed,
        background_motif: (base.animal && base.animal.background_motif) || base.background_motif || visual.background_seed,
        illustration_prompt: (base.animal && base.animal.illustration_prompt) ||
          base.illustration_prompt ||
          ("귀여운 동물 캐릭터, 파스텔톤, 둥근 형태, 부드러운 명암, 동화풍 일러스트, 표정: " + visual.expression_seed + ", 배경: " + visual.background_seed)
      },
      layered_reading: {
        essence: layered.essence || base.essence || "오늘의 감정에 맞는 따뜻한 메시지를 받아보세요.",
        direct_message: layered.direct_message || base.direct_message || "지금 필요한 건 부드러운 자기 돌봄과 작은 실천입니다.",
        daily_actions: Array.isArray(layered.daily_actions) ? layered.daily_actions.slice(0, 5) : [
          "오늘의 에너지를 한 단어로 정해보세요.",
          "마음에 드는 동물 이모지를 메모해두세요.",
          "작은 실천 하나를 지금 시작해보세요."
        ],
        ritual: layered.ritual || "5분간 호흡하며 오늘의 방향을 정리해보세요.",
        journaling: Array.isArray(layered.journaling) ? layered.journaling.slice(0, 3) : [],
        shadow_warning: layered.shadow_warning || "감정 과부하가 오면 잠시 멈추고 호흡하세요.",
        affirmation: layered.affirmation || "나는 오늘도 나를 다정하게 돌본다."
      }
    };
  }

  function normalizeGeminiResult(raw, mode) {
    var spreadMode = normalizeMode(mode);
    var slots = MODE_SLOTS[spreadMode];
    var cardsRaw = Array.isArray(raw && raw.cards) ? raw.cards : [];
    var cards = slots.map(function(slot, idx) {
      var found = cardsRaw[idx] || cardsRaw.find(function(c) { return c && c.slot === slot; }) || null;
      return sanitizeCard(found, slot, idx);
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
        opening_message: (raw && raw.opening_message) || "오늘의 동물 가이드가 도착했어요.",
        cards: cards,
        closing_guidance: (raw && raw.closing_guidance) || "파스텔톤 귀여운 동물 가이드와 함께 오늘을 시작해보세요."
      }
    };
  }

  function buildPrompt(mode, userContext) {
    var spreadMode = normalizeMode(mode);
    var slots = MODE_SLOTS[spreadMode];
    var focus = userContext && userContext.focus ? String(userContext.focus) : "";
    var visual = resolveSajuVisualContext(userContext);
    var visualJson = JSON.stringify(visual);
    return [
      "당신은 사주 감성의 동물 토템 리더입니다.",
      "반드시 JSON만 출력하세요. 코드블록 금지.",
      "모드: " + spreadMode,
      "슬롯: " + slots.join(", "),
      focus ? ("사용자 초점: " + focus) : "",
      "사주 시각 컨텍스트(JSON): " + visualJson,
      "각 카드에는 animal.name_ko, animal.emoji, animal.category, animal.color_theme(primary/glow/particle), animal.facial_expression, animal.background_motif, animal.illustration_prompt를 포함하세요.",
      "표정은 사주 성향(성격 결)으로 다르게, 배경은 오행 분포(목/화/토/금/수) 강약으로 다르게 구성하세요.",
      "illustration_prompt에는 다음 스타일을 반드시 포함하세요: '귀여운 동물, 파스텔톤, 둥근 형태, 부드러운 명암, 동화풍'.",
      "illustration_prompt에 표정(facial_expression)과 배경(background_motif)을 반드시 자연어로 포함하세요.",
      "layered_reading에는 essence, direct_message, daily_actions(3~5개), ritual, journaling(0~3개), shadow_warning, affirmation를 넣으세요.",
      "출력 스키마:",
      "{",
      '  "opening_message": "string",',
      '  "cards": [',
      "    {",
      '      "slot": "string",',
      '      "animal": { "name_ko":"string", "emoji":"string", "category":"string", "color_theme":{"primary":"#hex","glow":"#hex","particle":"#hex"}, "facial_expression":"string", "background_motif":"string", "illustration_prompt":"string" },',
      '      "layered_reading": { "essence":"string", "direct_message":"string", "daily_actions":["string"], "ritual":"string", "journaling":["string"], "shadow_warning":"string", "affirmation":"string" }',
      "    }",
      "  ],",
      '  "closing_guidance": "string"',
      "}"
    ].filter(Boolean).join("\n");
  }

  async function generateConsultation(mode, userContext) {
    var spreadMode = normalizeMode(mode);
    var apiKey = resolveGeminiApiKey();
    if (!apiKey) {
      return buildFallback(spreadMode, "missing GEMINI_API_KEY", userContext);
    }
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = controller ? setTimeout(function() { controller.abort(); }, 18000) : null;

    try {
      var response = await fetch(buildGeminiUrl(apiKey), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller ? controller.signal : undefined,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: buildPrompt(spreadMode, userContext || {}) }] }],
          generationConfig: {
            temperature: 0.9,
            topP: 0.95,
            maxOutputTokens: 1800,
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        return buildFallback(spreadMode, "HTTP " + response.status, userContext);
      }

      var payload = await response.json();
      var text = extractTextFromGeminiResponse(payload);
      var json = parseJsonSafely(text);
      if (!json) return buildFallback(spreadMode, "JSON parse failed", userContext);
      return normalizeGeminiResult(json, spreadMode);
    } catch (err) {
      return buildFallback(spreadMode, (err && err.message) || "network error", userContext);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  global.AnimalTotemContentEngine = {
    version: "3.0.0-gemini",
    isComingSoon: false,
    model: GEMINI_MODEL,
    generateConsultation: generateConsultation,
    buildFallback: buildFallback
  };
})(window);
const PDF_LLM_PROVIDERS = new Set(["mock", "workers-ai", "gemini"]);

function clean(value, max = 100000) {
  const text = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  return Number.isFinite(max) ? text.slice(0, max) : text;
}

function block(value, max = 100000) {
  const text = String(value == null ? "" : value).replace(/\r/g, "").trim();
  return Number.isFinite(max) ? text.slice(0, max) : text;
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function readEnv(env = {}, key = "", fallback = "") {
  const direct = env && Object.prototype.hasOwnProperty.call(env, key) ? env[key] : undefined;
  if (direct !== undefined && direct !== null && String(direct) !== "") return String(direct);
  const processEnv = typeof process !== "undefined" ? process.env : undefined;
  const processValue = processEnv?.[key];
  if (processValue !== undefined && processValue !== null && String(processValue) !== "") return String(processValue);
  return fallback;
}

function readBool(env, key, fallback = false) {
  const value = readEnv(env, key, fallback ? "true" : "false").toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}

function readNumber(env, key, fallback = 0) {
  const value = Number(readEnv(env, key, String(fallback)));
  return Number.isFinite(value) ? value : fallback;
}

function resolveProvider(env = {}) {
  const raw = readEnv(env, "PDF_LLM_PROVIDER", "mock").toLowerCase();
  return PDF_LLM_PROVIDERS.has(raw) ? raw : "mock";
}

function isMockFailureRequested(input = {}, env = {}) {
  const failList = readEnv(env, "PDF_MOCK_FAIL_CHAPTER_ID", "")
    .split(",")
    .map((item) => clean(item))
    .filter(Boolean);
  return failList.includes(clean(input.chapterId));
}

function logGateway(message, input = {}, extra = {}, env = {}) {
  if (!readBool(env, "PDF_DEBUG_MODE", false)) return;
  const context = safeObject(input.context);
  const callIndex = Number(extra.callIndex ?? context.callIndex ?? 0) || 0;
  const tokensUsed = Number(extra.tokensUsed ?? 0) || 0;
  const payload = {
    jobId: clean(input.jobId, 160),
    serviceKey: clean(input.serviceKey || context.serviceKey || input.serviceType, 80),
    serviceType: clean(input.serviceType, 80),
    chapterId: clean(input.chapterId, 120),
    provider: clean(extra.provider, 40),
    reason: clean(extra.reason, 160),
    providerReason: clean(extra.providerReason || extra.reason, 160),
  };
  if (typeof extra.allowed === "boolean") payload.allowed = extra.allowed;
  if (callIndex > 0) payload.callIndex = callIndex;
  if (typeof extra.aiRunCalled === "boolean") payload.aiRunCalled = extra.aiRunCalled;
  if (clean(extra.modelName, 120)) payload.modelName = clean(extra.modelName, 120);
  if (tokensUsed > 0) payload.tokensUsed = tokensUsed;
  try {
    console.info(message, payload);
  } catch (_) {}
}

function estimateTokens(text = "") {
  const compact = String(text || "").trim();
  if (!compact) return 0;
  return Math.max(1, Math.ceil(compact.length / 3.2));
}

function workersAiModelName(env = {}) {
  return clean(readEnv(env, "PDF_WORKERS_AI_MODEL", readEnv(env, "WORKERS_AI_MODEL", "@cf/meta/llama-3.1-8b-instruct")), 120);
}

function buildWorkersAiPrompt(input = {}) {
  const context = safeObject(input.context);
  const format = clean(context.format || inferFormat(input));
  if (format === "saju-new-year-json" && block(input.prompt)) {
    return [
      `챕터 제목: ${clean(input.chapterTitle || input.chapterId)}`,
      `챕터 순서: ${Number(input.chapterOrder || 1)} / ${Number(input.totalChapters || 1)}`,
      `Job ID: ${clean(input.jobId, 160)}`,
      `Chapter ID: ${clean(input.chapterId, 120)}`,
      "",
      "아래 지시문에 따라 JSON만 반환하세요.",
      "",
      block(input.prompt),
    ].join("\n");
  }
  const sourceInput = safeObject(input.input);
  return [
    `챕터 제목: ${clean(input.chapterTitle || input.chapterId)}`,
    `챕터 순서: ${Number(input.chapterOrder || 1)} / ${Number(input.totalChapters || 1)}`,
    `Job ID: ${clean(input.jobId, 160)}`,
    `Chapter ID: ${clean(input.chapterId, 120)}`,
    "",
    "아래 사용자 입력을 바탕으로 신년운세 PDF의 해당 챕터 본문을 한국어 Markdown으로 작성하세요.",
    "전체 PDF 파이프라인 테스트 목적이므로 과장된 단정, 공포 표현, 기술 구현 설명은 피하고 상담가가 직접 말하듯 자연스럽게 작성하세요.",
    "본문에는 실제 LLM 생성 챕터임을 드러내는 기술 문구를 넣지 마세요.",
    "",
    `이름: ${clean(sourceInput.name) || "미입력"}`,
    `성별: ${clean(sourceInput.gender) || "미입력"}`,
    `생년월일: ${clean(sourceInput.birthDate) || "미입력"}`,
    `출생시간: ${clean(sourceInput.birthTime) || "미입력"}`,
    `기준 연도: ${clean(sourceInput.targetYear) || "미입력"}`,
    "",
    "구성:",
    `# ${Number(input.chapterOrder || 1)}. ${clean(input.chapterTitle || input.chapterId)}`,
    "## 올해의 흐름",
    "## 사주적 관찰",
    "## 현실 조언",
  ].join("\n");
}

function extractWorkersAiText(result) {
  if (typeof result === "string") return block(result);
  const root = safeObject(result);
  const direct = block(root.response || root.text || root.output_text || root.content || root.result);
  if (direct) return direct;
  if (Array.isArray(root.choices) && root.choices.length) {
    const choice = safeObject(root.choices[0]);
    return block(choice.message?.content || choice.text || choice.content);
  }
  if (Array.isArray(root.messages) && root.messages.length) {
    return block(root.messages.map((item) => safeObject(item).content || "").join("\n"));
  }
  return "";
}

async function generateWorkersAiPdfChapter(input = {}, env = {}) {
  if (!env?.AI || typeof env.AI.run !== "function") {
    const error = new Error("missing_ai_binding");
    error.code = "missing_ai_binding";
    error.status = 503;
    throw error;
  }
  const modelName = workersAiModelName(env);
  const context = safeObject(input.context);
  const format = clean(context.format || inferFormat(input));
  const prompt = buildWorkersAiPrompt(input);
  const maxTokens = Math.max(256, Math.min(4096, readNumber(env, "PDF_WORKERS_AI_MAX_TOKENS", 1400)));
  const systemContent = format === "saju-new-year-json"
    ? block(input.systemPrompt) || "당신은 신년운세 PDF 원고를 쓰는 전문 명리 상담가입니다. 반드시 유효한 JSON만 반환합니다."
    : "당신은 신년운세 PDF 원고를 쓰는 전문 명리 상담가입니다. 자연스러운 한국어 Markdown 본문만 작성합니다.";
  let raw;
  try {
    raw = await env.AI.run(modelName, {
      messages: [
        {
          role: "system",
          content: systemContent,
        },
        { role: "user", content: prompt },
      ],
      max_tokens: maxTokens,
    });
  } catch (cause) {
    const error = new Error("workers_ai_run_failed");
    error.code = "workers_ai_run_failed";
    error.status = Number(cause?.status || cause?.statusCode || 502) || 502;
    error.provider = "workers-ai";
    error.causeMessage = clean(cause?.message || cause, 300);
    throw error;
  }
  const content = extractWorkersAiText(raw);
  if (!content) {
    const error = new Error("workers_ai_empty_response");
    error.code = "workers_ai_empty_response";
    error.status = 502;
    throw error;
  }
  const tokensUsed = estimateTokens(`${prompt}\n${content}`);
  const costPer1k = Math.max(0, readNumber(env, "PDF_WORKERS_AI_COST_PER_1K_TOKENS", 0));
  return {
    content,
    provider: "workers-ai",
    modelName,
    tokensUsed,
    cost: Number(((tokensUsed / 1000) * costPer1k).toFixed(6)),
    isMock: false,
    providerReason: "real_llm_success",
  };
}

function inferFormat(input = {}) {
  const serviceType = clean(input.serviceType).toLowerCase();
  if (serviceType.includes("love")) return "love-secret-html";
  if (serviceType.includes("life")) return "life-book-html";
  if (serviceType.includes("astro")) return "astrology-html";
  if (serviceType.includes("vedic")) return "vedic-html";
  if (serviceType.includes("new-year-json")) return "saju-new-year-json";
  if (serviceType.includes("new-year")) return "saju-new-year-json";
  if (serviceType.includes("suk")) return "sukuyo-html";
  if (serviceType.includes("ziwei")) return "ziwei-html";
  if (serviceType.includes("karma")) return "karma-integrated-html";
  if (serviceType.includes("soul")) return "soul-origin-json";
  return "markdown";
}

function domainProfile(format = "") {
  if (format === "astrology-html") {
    return {
      className: "astrology-chapter",
      terms: ["출생 차트", "하우스", "어센던트", "MC", "트랜짓", "태양", "달", "금성", "화성"],
      decision: "차트의 상징은 지금의 선택을 더 섬세하게 바라보도록 돕고, 현실의 판단은 사용자가 가진 상황과 책임 안에서 차분히 정리되어야 합니다.",
    };
  }
  if (format === "vedic-html") {
    return {
      className: "vedic-chapter",
      terms: ["베다", "조티쉬", "라그나", "라시", "그라하", "바바", "하우스", "나크샤트라", "다샤", "라후", "케투"],
      decision: "조티쉬의 흐름은 선택의 리듬을 비추지만, 현실의 결정은 관찰한 자료와 현재 조건을 함께 놓고 신중하게 다루어야 합니다.",
    };
  }
  if (format === "love-secret-html") {
    return {
      className: "love-secret-chapter",
      terms: ["사주", "일간", "오행", "십성", "관계", "감정", "거리감", "대화", "리스크", "조언"],
      decision: "상담적 해석과 주의점, 실전 조언을 함께 놓으면 감정의 결을 무리하게 단정하지 않고 관계의 속도를 조절할 수 있습니다.",
    };
  }
  if (format === "saju-new-year-json") {
    return {
      className: "new-year-chapter",
      terms: ["사주", "원국", "일간", "월령", "오행", "십성", "대운", "세운", "용신", "지장간", "합충"],
      decision: "한 해의 흐름은 원국과 세운의 접점에서 드러나며, 현실의 자료와 전문가적 판단을 함께 두고 선택해야 합니다.",
    };
  }
  if (format === "karma-integrated-html") {
    return {
      className: "karma-integrated-chapter",
      terms: ["사주", "베다", "서양 점성", "숙요", "자미두수", "원국", "라그나", "출생 차트", "본명성", "명궁"],
      decision: "여러 체계가 같은 방향을 가리킬 때에는 반복되는 삶의 주제를 인정하고, 서로 다른 방향은 현실에서 조율할 과제로 남깁니다.",
    };
  }
  return {
    className: "life-book-chapter",
    terms: ["사주", "팔자", "원국", "일간", "월령", "오행", "십성", "대운", "세운", "용신", "지장간", "합충", "재성", "관성", "인성", "식상"],
    decision: "현실 자료와 전문가 판단을 함께 놓을 때, 이 흐름은 막연한 예감이 아니라 삶의 선택을 정리하는 기준으로 자리 잡습니다.",
  };
}

function termsText(terms = []) {
  return asArray(terms).map((term) => clean(term)).filter(Boolean).join(", ");
}

function chapterTerms(input = {}, context = {}) {
  const chapter = safeObject(context.chapter || context.chapterSpec);
  return [
    ...asArray(chapter.groundingTerms),
    ...asArray(chapter.requiredPerspectives),
    ...asArray(chapter.requiredSystems),
    ...asArray(chapter.sections),
    clean(chapter.category),
    clean(chapter.purpose),
  ].map((item) => clean(item)).filter(Boolean);
}

function astrologyChartTerms(context = {}) {
  const input = safeObject(context.input);
  const chart = safeObject(input.astrologyChart);
  const terms = [];
  for (const key of ["sun", "moon", "ascendant", "midheaven"]) {
    const point = safeObject(chart[key]);
    terms.push(point.name, point.sign, point.house ? `${point.house}하우스` : "");
  }
  for (const planet of asArray(chart.planets).slice(0, 8)) {
    terms.push(planet?.name, planet?.sign, planet?.house ? `${planet.house}하우스` : "");
  }
  for (const aspect of asArray(chart.aspects).slice(0, 4)) {
    terms.push(aspect?.planetA, aspect?.planetB, aspect?.type);
  }
  return terms.map((item) => clean(item)).filter((item, index, list) => item && item.length >= 2 && list.indexOf(item) === index).slice(0, 12);
}

function bodyParagraphs({ input, context, format }) {
  const profile = domainProfile(format);
  const order = Number(input.chapterOrder || 1);
  const total = Number(input.totalChapters || 1);
  const title = clean(input.chapterTitle || `챕터 ${order}`);
  const domainTerms = [...profile.terms, ...chapterTerms(input, context), ...astrologyChartTerms(context)]
    .map((item) => clean(item))
    .filter((item, index, list) => item && list.indexOf(item) === index)
    .slice(0, 24);
  const joinedTerms = termsText(domainTerms);
  return [
    `${title}에서는 ${joinedTerms}의 흐름을 중심에 두고 현재 단계의 의미를 차분히 펼칩니다. ${order}번째 장은 전체 ${total}개의 흐름 안에서 앞선 장의 결론을 이어받아 다음 장으로 넘어갈 수 있도록 충분한 문맥을 남깁니다.`,
    `이 흐름은 계산된 핵심 값이 한 사람의 현실 안에서 어떻게 살아나는지 차분히 풀어 갑니다. ${joinedTerms}이 서로 어떻게 기대고 밀어내는지 살피며, 마음의 속도와 생활의 순서가 어느 지점에서 안정되고 어느 지점에서 흔들리는지 긴 호흡으로 비춥니다.`,
    `${profile.decision} 특히 이 장은 단정적인 결론보다 사용자가 실제로 선택할 수 있는 방향을 남기는 데 초점을 둡니다. 상담의 말투는 부드럽게 흐르되, 챕터 제목과 순서가 흔들리지 않도록 같은 구조를 유지합니다.`,
    `각 장은 서로 독립된 상담의 결을 가지면서도 앞뒤의 흐름과 자연스럽게 이어져야 합니다. 앞 장에서 드러난 주제가 이 장에서 더 구체적인 선택으로 내려오고, 다음 장에서는 그 선택이 삶의 다른 영역으로 번져 가는 모양을 살핍니다.`,
    `문장의 길이는 한 장의 의미가 충분히 펼쳐질 만큼 넉넉하게 유지합니다. 제목, 요약, 본문, 조언 목록이 한 호흡 안에서 함께 움직이므로 독자는 급한 결론보다 스스로 조절할 수 있는 기준을 차분히 붙잡을 수 있습니다.`,
    `마지막으로 이 장은 과한 예언보다 현실적인 분별을 남깁니다. 민감한 사연을 단정적으로 드러내지 않고, 지금 확인할 수 있는 자료와 마음의 반응을 함께 보며 선택의 무게를 부드럽게 나누도록 돕습니다.`,
  ];
}

function buildClassSectionHtml(input = {}, context = {}, format = "life-book-html") {
  const profile = domainProfile(format);
  const className = clean(context.htmlClass || profile.className);
  const chapterId = clean(input.chapterId || `chapter_${input.chapterOrder || 1}`);
  const title = clean(input.chapterTitle || `챕터 ${input.chapterOrder || 1}`);
  const paragraphs = bodyParagraphs({ input, context, format });
  const advice = [
    "완성된 장은 저장된 상태와 진행률을 먼저 확인한 뒤 다음 장으로 이어갑니다.",
    "새로고침 뒤에는 같은 장을 다시 만들지 않고 저장된 결과를 복구합니다.",
    "다운로드 주소가 준비될 때까지 생성 버튼과 상태 조회 흐름을 분리해 유지합니다.",
  ];
  return `<section class="${escapeHtml(className)}" data-chapter-id="${escapeHtml(chapterId)}">
  <h2>${escapeHtml(title)}</h2>
  <div class="chapter-summary"><p>${escapeHtml(paragraphs[0])}</p></div>
  <div class="chapter-body">
    ${paragraphs.slice(1).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("\n    ")}
  </div>
  <div class="chapter-advice"><ul>${advice.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
</section>`;
}

function buildLoveSecretHtml(input = {}, context = {}) {
  const chapter = safeObject(context.chapter);
  const order = Number(input.chapterOrder || chapter.order || 1);
  const total = Number(input.totalChapters || context.totalChapters || 1);
  const chapterId = clean(input.chapterId || chapter.id || `love-secret-${order}`);
  const title = clean(input.chapterTitle || chapter.title || `연애 비책 ${order}장`);
  const mode = clean(context.mode || context.input?.mode || input.input?.mode).toLowerCase() === "compatibility" ? "compatibility" : "solo";
  const isCompat = mode === "compatibility";
  const subject = isCompat ? "두 사람" : "고객님";
  const relationshipFrame = isCompat
    ? "두 사람의 차이, 서로에게 끌리는 이유, 관계 리스크와 회복의 순서를 함께 살피는 자리입니다"
    : "고객님의 사주 원국, 일간의 사랑 방식, 반복되는 연애 선택과 마음의 속도를 함께 살피는 자리입니다";
  const perspective = isCompat
    ? "두 사람의 차이와 관계 리스크를 무리하게 단정하지 않고 실전 조언으로 정리합니다"
    : "상담형 해석과 주의점을 함께 놓고 실전 조언으로 차분히 정리합니다";
  const body = [
    `${title}에서는 ${relationshipFrame}. ${order}번째 장은 전체 ${total}개의 흐름 안에서 앞 장의 감정선을 이어받아, 지금 사랑이 어디에서 열리고 어디에서 조심스러워지는지 비춥니다. 사주와 명식의 신호는 결말을 못박기보다 ${subject}이 관계 안에서 반복하는 선택의 모양을 보여 주며, 그 선택을 더 부드럽게 다루는 기준을 남깁니다.`,
    `${title}의 관점에서 ${subject}의 일간과 오행 흐름을 보면 사랑을 시작하는 속도, 애정을 확인하는 방식, 서운함이 올라오는 순간의 반응이 함께 드러납니다. ${isCompat ? "서로의 표현 방식이 다를 때에는 어느 한쪽이 틀렸다기보다 마음을 받는 언어가 다르다고 보아야 합니다." : "혼자 있는 시간과 관계를 원하는 마음이 번갈아 커질 때에는 서두른 결론보다 자기 기준을 먼저 세우는 편이 좋습니다."} 이 장은 그런 차이를 현실의 말투와 행동으로 옮기는 비책을 담습니다.`,
    `${title}에서 주의할 점은 감정이 강해지는 순간일수록 상대의 반응을 한 가지 뜻으로만 읽기 쉽다는 데 있습니다. 명식 안의 배우자성, 관성, 재성, 식상, 인성의 흐름은 사랑의 방향을 비추지만, 실제 관계는 말의 속도와 약속의 무게에서 안정됩니다. ${isCompat ? "두 사람은 서로에게 끌리는 자리와 부담을 느끼는 자리를 함께 가지고 있으므로, 갈등이 생길 때 원인을 한 사람에게만 돌리지 않는 태도가 필요합니다." : "고객님은 끌림이 생긴 뒤에도 마음의 안전을 확인하려는 흐름이 있으므로, 호감과 불안을 나누어 보는 태도가 필요합니다."}`,
    `${title}은 ${perspective}. 지금 필요한 실천은 크고 극적인 행동이 아니라 반복 가능한 작은 조율입니다. 연락을 기다리는 시간, 마음을 표현하는 말, 약속을 정하는 기준을 조금만 선명하게 해도 관계의 흐름은 안정됩니다. 특히 이 장의 핵심은 사랑을 증명하려 애쓰는 마음을 내려놓고, 내가 편안하게 사랑할 수 있는 리듬을 다시 찾는 데 있습니다.`,
    `${title} 안에서는 ${isCompat ? "상대의 사주 흐름이 고객님의 흐름과 맞물리며 서로 다른 욕구를 드러냅니다. 한 사람은 빠른 확인을 원하고 다른 한 사람은 시간을 두고 마음을 정리하려 할 수 있습니다." : "상대 정보가 없더라도 고객님의 원국만으로 사랑의 방향은 충분히 읽을 수 있습니다. 누구를 만나야 하는지보다 어떤 관계에서 마음이 안정되는지가 먼저 드러납니다."} 그래서 이 장은 끌림의 크기보다 관계가 오래 머무를 수 있는 조건을 중심으로 풀이합니다.`,
    `${order}번째 장에서 보아야 할 또 하나의 흐름은 시기입니다. 사랑의 운은 한순간에 결론으로 떨어지지 않고, 마음이 열리는 달과 조심해야 할 날의 리듬 속에서 천천히 드러납니다. ${isCompat ? "두 사람의 타이밍이 어긋날 때에는 결정을 미루는 지혜가 필요하고, 같은 방향으로 움직일 때에는 작은 약속을 분명히 남기는 편이 좋습니다." : "고객님에게 인연이 들어오는 때에는 마음이 먼저 반응하더라도 생활의 안정감이 함께 따라오는지 살펴야 합니다."}`,
    `${title}의 상담은 불안을 키우기 위한 말이 아니라 선택의 질서를 세우기 위한 말입니다. 사주가 강하게 비추는 신호가 있어도 현실의 대화, 상대의 태도, 고객님의 컨디션을 함께 보아야 정확합니다. ${isCompat ? "서로가 원하는 확인 방식이 다를수록 서운함을 쌓아 두지 말고, 기대하는 표현을 짧고 분명하게 말하는 연습이 필요합니다." : "혼자 판단이 많아질수록 마음속 결론을 늦추고, 실제로 확인한 행동과 내가 상상한 장면을 구분하는 연습이 필요합니다."}`,
    `${title}을 읽는 ${subject}에게 지금 필요한 비책은 마음을 숨기거나 밀어붙이는 방식이 아니라, 사랑이 편안하게 흐를 자리를 마련하는 것입니다. 작은 호감은 따뜻하게 인정하고, 부담스러운 신호는 조용히 거리를 두며, 이미 반복된 상처는 같은 방식으로 다시 확인하지 않는 편이 좋습니다. 이렇게 흐름을 나누어 보면 관계는 운에 끌려가기보다 내가 다룰 수 있는 선택으로 가까워집니다.`,
    `${title}에서 사랑의 장면은 좋은 운도 준비된 마음을 만나야 오래 머문다는 점을 다시 비춥니다. 오늘의 조언은 거창한 결심보다 말의 온도를 낮추고, 기대를 한 문장으로 정리하며, 마음이 흔들리는 순간에도 나를 잃지 않는 것입니다. ${isCompat ? "두 사람의 궁합은 고정된 점수가 아니라 함께 조율해 가는 리듬으로 읽을 때 가장 선명합니다." : "솔로의 연애운은 상대가 없어서 비어 있는 흐름이 아니라, 좋은 인연을 맞이할 기준이 익어 가는 시간으로 읽어야 합니다."}`,
    `마지막으로 ${title}의 비책은 ${subject}이 오늘 바로 붙잡을 수 있는 선택으로 내려옵니다. 감정이 앞설 때에는 하루의 여백을 두고, 말이 길어질 때에는 핵심 한 문장만 남기며, 불안이 커질 때에는 확인하고 싶은 것과 실제로 필요한 것을 나누어 보세요. 사랑은 단정된 결말보다 매일의 태도 속에서 열리고, 좋은 인연은 그 태도가 편안하게 반복될 때 더 오래 머무릅니다.`,
  ];
  const advice = isCompat
    ? [
        "두 사람의 차이를 잘잘못으로 나누기보다 표현 속도와 기대의 차이로 먼저 읽어 보세요.",
        "관계 리스크가 느껴질 때에는 감정의 결론보다 대화 순서와 약속의 범위를 작게 정하는 편이 좋습니다.",
        "실전 조언은 오늘 한 번의 연락, 한 문장의 확인, 하나의 경계 조율처럼 작게 실행할수록 힘을 얻습니다.",
      ]
    : [
        "상담형 해석의 핵심은 고객님이 사랑 안에서 편안해지는 조건을 먼저 알아차리는 것입니다.",
        "주의점이 떠오를 때에는 상대를 단정하기보다 내 마음이 급해지는 장면을 천천히 확인해 보세요.",
        "실전 조언은 연락법, 만남의 속도, 감정 표현 중 하나만 골라 꾸준히 다듬을 때 가장 안정적으로 열립니다.",
      ];
  return `<section class="love-secret-chapter" data-chapter-id="${escapeHtml(chapterId)}">
  <h2>${escapeHtml(title)}</h2>
  <div class="chapter-summary"><p>${escapeHtml(`${title}의 핵심은 ${perspective}.`)}</p></div>
  <div class="chapter-body">
    ${body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("\n    ")}
  </div>
  <div class="chapter-advice"><h3>연애 비책</h3><ul>${advice.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
</section>`;
}

function buildSukuyoHtml(input = {}, context = {}) {
  const chapterSpec = safeObject(context.chapterSpec || context.chapter);
  const sections = asArray(chapterSpec.sections).length ? asArray(chapterSpec.sections) : ["관계의 결", "거리와 호흡", "현실의 조율", "마음의 주의점", "앞으로의 방향"];
  const chapterId = clean(input.chapterId || chapterSpec.id || `chapter_${input.chapterOrder || 1}`);
  const title = clean(input.chapterTitle || chapterSpec.title || `챕터 ${input.chapterOrder || 1}`);
  const baseTerms = ["숙요", "본명성", "업태", "영친", "안괴", "관계", "거리", "호흡", "마음", "조율"];
  return `<article data-chapter-id="${escapeHtml(chapterId)}">
  <h1>${escapeHtml(title)}</h1>
  ${sections.map((sectionTitle, index) => {
    const paragraphs = [
      `${sectionTitle}에서는 ${termsText(baseTerms)}의 결이 어떻게 관계 안에서 드러나는지 살핍니다. 두 사람의 리듬은 가까워지는 힘과 물러서는 힘을 함께 품고 있어, 지금 필요한 말의 속도와 감정의 온도를 차분히 비춥니다.`,
      `이 장의 ${index + 1}번째 흐름은 숙요점의 거리감과 본명성의 색을 바탕으로 관계의 장면을 정리합니다. 서로를 밀어붙이기보다 마음이 열리는 순간과 조심해야 할 순간을 나누어 바라보면, 불필요한 오해를 줄일 수 있습니다.`,
      `현실에서는 대화의 시간, 연락의 간격, 약속의 무게가 관계의 신뢰를 만듭니다. 이 부분은 PDF 조판과 장별 저장을 확인할 수 있도록 충분한 길이로 구성되어 있으며, 한글 문단이 자연스럽게 이어지는지도 함께 확인됩니다.`,
    ];
    return `<section><h2>${escapeHtml(sectionTitle)}</h2>${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</section>`;
  }).join("\n  ")}
</article>`;
}

function buildZiweiHtml(input = {}, context = {}) {
  const chapterSpec = safeObject(context.chapterSpec || context.chapter);
  const sections = asArray(chapterSpec.sections).length ? asArray(chapterSpec.sections) : ["흐름의 핵심", "현실 장면", "선택의 방향"];
  const chapterId = clean(input.chapterId || chapterSpec.id || `ch${String(input.chapterOrder || 1).padStart(2, "0")}`);
  const title = clean(input.chapterTitle || chapterSpec.title || `챕터 ${input.chapterOrder || 1}`);
  const terms = "명궁 신궁 12궁 주성 보좌성 살성 사화 대한 유년 재백궁 관록궁 부부궁 자녀궁 천이궁 전택궁 노복궁 형제궁 복덕궁 부모궁 질액궁 화록 화권 화과 화기 자미 천기 태양 무곡 천동 염정 천부 태음 탐랑 거문 천상 천량 칠살 파군 초년 중년 말년 전환점 상반기 하반기 10년 주기";
  const practical = "업무 직업 직장 성과 돈 재정 수입 소비 관계 배우자 가족 건강 휴식 선택 계획 실행";
  return `<article data-chapter-id="${escapeHtml(chapterId)}">
  <h1>${escapeHtml(title)}</h1>
  ${sections.map((sectionTitle, index) => {
    const paragraphs = [
      `${terms}의 배치가 이 장의 첫 흐름을 이룹니다. ${practical}의 장면에서 어떤 궁이 먼저 힘을 받는지 살피면, 사용자가 지금 붙잡아야 할 기준과 잠시 거리를 두어야 할 압박이 구분됩니다.`,
      `명궁과 신궁은 전체 방향을 잡고, 재백궁과 관록궁은 일과 돈의 감각을 세밀하게 나눕니다. 부부궁과 복덕궁은 관계와 마음의 여백을 비추며, 화록 화권 화과 화기는 선택이 밖으로 드러나는 방식을 알려 줍니다.`,
      `이 흐름은 단정적인 결론보다 현실에서 조절할 수 있는 행동에 초점을 둡니다. 업무의 우선순위, 재정의 속도, 관계의 말투, 건강의 휴식 리듬을 함께 놓으면 ${sectionTitle}의 의미가 생활 안에서 선명해집니다.`,
    ];
    return `<section><h2>${escapeHtml(sectionTitle)}</h2>${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</section>`;
  }).join("\n  ")}
</article>`;
}

function systemLabels(systems = []) {
  const labels = {
    saju: "사주 명리 원국 일간 오행 세운",
    astrology: "서양 점성 출생 차트 어센던트 하우스 행성",
    vedic: "베다 조티쉬 라그나 라시 그라하 다샤",
    sukuyo: "숙요 본명성 안괴 영친 성위 관계",
    ziwei: "자미두수 명궁 신궁 십이궁 주성",
    timing: "시기 흐름 주기 전환 선택",
  };
  return asArray(systems).map((system) => labels[clean(system).toLowerCase()] || clean(system)).filter(Boolean);
}

function buildKarmaIntegratedHtml(input = {}, context = {}) {
  const chapter = safeObject(context.chapter);
  const chapterData = safeObject(context.chapterData);
  const chapterId = clean(input.chapterId || chapter.id || `karma-${input.chapterOrder || 1}`);
  const title = clean(input.chapterTitle || chapter.title || `운명의 업 ${input.chapterOrder || 1}`);
  const systems = asArray(chapter.requiredSystems || chapterData.systems).map((item) => clean(item).toLowerCase()).filter(Boolean);
  const labelText = systemLabels(systems.length ? systems : ["saju", "astrology", "vedic"]).join(", ");
  const paragraphs = [
    `${title}에서는 ${labelText}의 흐름이 한 사람의 반복된 선택 안에서 어떻게 겹쳐지는지 차분히 살핍니다. 사주 명리의 원국과 일간, 서양 점성의 출생 차트와 하우스, 베다 조티쉬의 라그나와 다샤가 서로 다른 언어로 같은 방향을 비출 때 삶의 오래된 반응은 더 선명하게 드러납니다.`,
    `이 장은 과거를 단정하기보다 지금 되풀이되는 감정과 행동의 결을 읽습니다. 관계에서 물러나는 방식, 일 앞에서 책임을 지는 방식, 몸과 마음이 긴장을 받아들이는 방식은 모두 운명의 업이 현실 속에서 움직이는 자리입니다. ${labelText}을 함께 놓고 보면 반복은 벌이 아니라 더 섬세한 선택을 요구하는 신호로 다가옵니다.`,
    `사주 명리는 기질과 책임의 중심을 보여 주고, 서양 점성은 삶의 장면과 욕구의 방향을 비춥니다. 베다 조티쉬는 더 깊은 주기와 성숙의 시간을 가리키며, 숙요와 자미두수의 단서가 함께 있을 때에는 관계와 삶의 무대가 어디에서 강하게 반응하는지 읽을 수 있습니다. 이 흐름은 한 체계만으로 서두르지 않고 여러 상징의 공통된 결을 천천히 모읍니다.`,
    `현실에서 필요한 태도는 작은 반복을 알아차리는 것입니다. 같은 말투가 관계를 멀어지게 하는지, 같은 불안이 중요한 기회를 미루게 하는지, 같은 책임감이 몸의 피로를 키우는지 살피면 변화는 갑작스러운 결심이 아니라 매일의 조절로 시작됩니다. 이 장은 그 조절의 기준을 부드럽게 남깁니다.`,
    `앞으로의 선택에서는 강하게 끌리는 일과 오래 피하고 싶은 일을 함께 보아야 합니다. 끌림은 성장의 문이 될 수 있고, 회피는 아직 돌보지 못한 마음의 흔적일 수 있습니다. ${labelText}의 신호가 같은 방향을 가리킬수록 중요한 것은 속도를 높이는 일이 아니라 충분히 의식한 뒤 움직이는 일입니다.`,
    `마지막으로 ${title}은 자신을 탓하기보다 반복을 이해하는 장입니다. 이미 지나간 선택은 삶의 흔적으로 남지만, 지금의 선택은 다음 흐름의 모양을 바꿉니다. 그러므로 이 장의 조언은 단정된 운명을 말하기보다 스스로에게 더 정직하고 부드러운 방향을 고르는 데 머무릅니다.`,
  ];
  const advice = [
    "반복되는 감정이 올라오는 장면을 짧게 기록합니다.",
    "중요한 결정은 하루의 여백을 둔 뒤 다시 확인합니다.",
    "관계, 일, 몸의 리듬을 따로 적어 같은 흐름이 반복되는 지점을 찾습니다.",
  ];
  return `<section class="karma-integrated-chapter" data-chapter-id="${escapeHtml(chapterId)}">
  <h2>${escapeHtml(title)}</h2>
  <div class="chapter-meta"><p>${escapeHtml(labelText)}</p></div>
  <div class="chapter-summary"><p>${escapeHtml(paragraphs[0])}</p></div>
  <div class="chapter-body">${paragraphs.slice(1).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</div>
  <div class="chapter-advice"><ul>${advice.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
</section>`;
}

function buildSajuNewYearJson(input = {}, context = {}) {
  const chapter = safeObject(context.chapter);
  const targetYear = Number(context.targetYear || input.context?.targetYear || new Date().getFullYear());
  const categories = asArray(chapter.categories).length ? asArray(chapter.categories) : ["총운", "일과 성취", "재물", "관계", "건강"];
  const domain = ["총운", "연운", "원국", "오행", "기운", "일간", "세운", "대운", "월운", "십성", "재물", "직장", "관계", "건강"];
  const sections = categories.map((title, index) => {
    const bodyParts = [
      `${targetYear}년의 ${title}은 ${termsText(domain)}의 흐름 속에서 차분히 드러납니다. 이 장은 사용자의 원국과 세운이 만나는 지점을 중심으로 한 해의 방향을 읽으며, 일간이 어떤 기운을 받아들이고 어떤 기운을 조절해야 하는지 상담하듯 풀어냅니다. 월령과 오행의 균형을 함께 보면 겉으로 드러나는 사건보다 마음과 생활의 리듬이 먼저 보입니다.`,
      `${title}의 두 번째 흐름은 현실 선택과 연결됩니다. 직장, 재물, 관계, 건강의 장면에서 같은 기운이 서로 다르게 나타날 수 있으므로, 한 가지 결론으로 몰아가기보다 시기와 상황을 나누어 보아야 합니다. 대운이 열어 둔 큰 길 위에서 세운은 올해의 구체적인 움직임을 만들고, 월운은 실행의 속도를 조절합니다.`,
      `이 대목은 한 해의 결을 충분히 길게 펼쳐 읽을 수 있도록 차분히 이어집니다. 앞에서 짚은 흐름이 다음 장면으로 자연스럽게 이어지고, 긴 한글 문단 안에서도 말의 호흡이 흐트러지지 않도록 구성합니다. 실제 상담 문장처럼 부드럽게 흐르되 과도한 단정은 피하고, 사용자가 스스로 선택의 기준을 세울 수 있게 돕습니다.`,
      `${title}에서 실천할 방향은 작게 시작하는 것입니다. 중요한 결정은 자료를 모아 판단하고, 감정이 앞서는 날에는 하루의 리듬을 낮추며, 기회가 열리는 시기에는 이미 준비한 일을 밖으로 꺼내는 편이 좋습니다. 전문가의 판단처럼 차분하게 흐름을 구분하면 올해의 선택은 더 안정된 모양을 갖추게 됩니다.`,
      `${title}은 한 해를 한 번에 단정하지 않고 여러 층으로 나누어 살피는 자리입니다. 원국의 기본 성향은 익숙한 선택 방식을 만들고, 세운은 그 선택 방식이 어디에서 힘을 얻고 어디에서 흔들리는지 드러냅니다. 오행의 균형이 지나치게 한쪽으로 기울 때에는 속도를 늦추고, 부족한 기운이 필요한 장면에서는 사람과 환경의 도움을 받아 균형을 회복하는 것이 좋습니다. 이 흐름을 따라가면 올해의 일은 막연한 기대보다 구체적인 생활 질서 속에서 더 분명하게 열립니다.`,
      `월운을 함께 보면 ${title}의 변화는 더 세밀하게 드러납니다. 초반에는 방향을 잡는 힘이 중요하고, 중반에는 이미 시작한 일을 정리하며 이어 가는 힘이 필요합니다. 후반에는 무리하게 넓히기보다 남은 과제를 가볍게 정돈하는 태도가 한 해의 결실을 안정시킵니다. 같은 사건도 마음이 급할 때에는 부담으로 느껴지고, 준비가 되어 있을 때에는 기회로 바뀔 수 있으므로 시기별 감각을 나누어 보는 것이 좋습니다.`,
      `${title}의 판단 기준은 실제 생활에서 확인할 수 있어야 합니다. 말의 속도, 약속의 간격, 지출의 흐름, 몸의 피로, 관계에서 반복되는 감정은 모두 세운이 생활 속으로 내려온 모습입니다. 이 신호들을 기록하면 올해의 운은 멀리 있는 예언이 아니라 매일 조절할 수 있는 리듬으로 바뀝니다. 특히 원국에서 강한 기운은 좋은 점과 부담을 함께 만들기 때문에, 강한 부분은 다듬고 약한 부분은 보태는 방식으로 읽어야 합니다.`,
      `이 장에서 가장 중요한 것은 ${title}을 삶의 한 장면으로 좁혀 보는 태도입니다. 직장에서는 평가와 책임이, 재물에서는 지출과 계약이, 관계에서는 거리와 말투가, 건강에서는 회복과 습관이 각각 다른 모양으로 나타납니다. 세운이 밀어 올리는 일이라도 준비가 부족하면 흔들릴 수 있고, 부담스러워 보이는 일이라도 순서를 잘 잡으면 안정된 발판이 됩니다. 그러므로 올해는 큰 결론보다 작은 순서가 운을 다루는 핵심이 됩니다.`,
      `${title}을 따라 움직일 때에는 처음부터 모든 문을 열려고 하지 않는 편이 좋습니다. 먼저 지켜야 할 것을 정하고, 다음으로 넓혀도 되는 것을 구분하며, 마지막으로 내려놓아도 되는 부담을 확인해야 합니다. 이 순서가 잡히면 원국과 세운의 긴장이 생활 속에서 부드럽게 풀립니다. 다만 흐름이 좋게 느껴지는 시기에도 확인 없이 밀어붙이는 태도는 피해야 하며, 흐름이 무겁게 느껴지는 시기에도 스스로를 몰아세우기보다 회복의 시간을 먼저 남겨 두어야 합니다.`,
      `마지막으로 ${title}은 올해의 전체 균형을 다시 묻습니다. 어떤 달에는 앞으로 나아가는 힘이 강하고, 어떤 달에는 정리와 보완이 더 중요하게 떠오릅니다. 좋은 운은 움직일 때 살아나고, 조심해야 할 운은 미리 알아차릴 때 부드러워집니다. 이 장의 문장은 그 흐름을 충분히 길게 남겨 계절마다 마음이 어디로 기울고 생활이 어떤 순서로 정리되어야 하는지 비춥니다. 독자는 상담을 받듯 자연스럽게 읽으며, 자신의 현실에 맞는 작은 기준을 조용히 고를 수 있습니다.`,
    ];
    return {
      title: clean(title).replace(/\{YEAR\}/g, String(targetYear)),
      body: [
        ...bodyParts,
        ...bodyParts.map((paragraph) => `${paragraph} 이 흐름은 ${title}의 기준을 다시 확인하며, 세운과 월운이 실제 생활에서 어떤 속도로 움직이는지 한 번 더 정리하게 합니다.`),
      ].join("\n\n"),
      sajuEvidence: ["원국", "일간", "오행", "세운"],
      keyPoints: [`${title}은 ${targetYear}년의 기운을 현실 선택으로 옮기는 자리입니다.`],
      actionGuide: ["중요한 선택은 자료를 확인한 뒤 작은 실행으로 시작합니다."],
      checklist: ["완료한 일과 미룬 일을 나누어 적습니다."],
      caution: ["감정이 급해지는 날에는 결론을 하루 늦춥니다."],
    };
  });
  return JSON.stringify({
    schemaVersion: clean(context.schemaVersion || "saju-new-year-llm-json.v1"),
    targetYear,
    chapterNo: Number(chapter.no || input.chapterOrder || 1),
    title: clean(input.chapterTitle || chapter.title || `챕터 ${input.chapterOrder || 1}`).replace(/\{YEAR\}/g, String(targetYear)),
    focus: clean(chapter.purpose || `${targetYear}년의 흐름을 사주 원국과 세운으로 살핍니다.`),
    sections,
    monthlyFortunes: Number(chapter.no || input.chapterOrder || 1) === 9
      ? Array.from({ length: 12 }, (_, index) => ({
        month: index + 1,
        title: `${index + 1}월의 세운과 월운 흐름 상담 기준`,
        flow: `${index + 1}월은 세운과 월운이 만나는 지점에서 생활의 속도를 조절하게 합니다.`,
        advice: "중요한 약속은 일정과 자료를 확인한 뒤 진행하는 편이 좋습니다.",
        caution: "감정이 앞설 때에는 말의 속도를 낮추고 하루의 여백을 둡니다.",
        action: "한 가지 실행 목표를 작게 정해 끝까지 마무리합니다.",
        luckyRoutine: "아침에 오늘의 우선순위 세 가지를 적고 저녁에 확인합니다.",
      }))
      : [],
    finalAdvice: {
      title: `${targetYear}년 마지막 조언`,
      body: `${targetYear}년의 흐름은 원국과 세운이 만나는 자리에서 열립니다. 큰 결론보다 매달의 선택을 정리하고, 필요한 때에는 쉬며, 준비된 때에는 조용히 앞으로 나아가면 한 해의 기운을 안정적으로 사용할 수 있습니다. 올해는 빠른 확신보다 반복해서 확인한 감각이 더 큰 힘이 됩니다. 일과 관계, 재물과 건강의 흐름을 따로 떼어 보되, 마지막에는 생활의 리듬 안에서 다시 하나로 묶어야 합니다. 밀어붙일 시기와 멈추어 다듬을 시기를 구분하면 불필요한 소모가 줄고, 이미 가진 장점은 더 안정적으로 드러납니다. 한 해의 운은 멀리서 정해지는 것이 아니라 매일의 선택 속에서 형태를 얻으니, 조용하지만 꾸준한 정리가 가장 든든한 길이 됩니다. 다가오는 달마다 해야 할 일과 기다려야 할 일을 나누어 적고, 마음이 급해질 때에는 처음 세운 기준으로 돌아오십시오. 준비가 된 일은 더 분명하게 열리고, 아직 때가 무르익지 않은 일은 조금 더 다듬을 시간을 줍니다. 그렇게 걸음을 맞추면 ${targetYear}년의 흐름은 흔들림 속에서도 당신에게 필요한 방향을 차분히 비추게 됩니다.`,
    },
  });
}

function buildSoulOriginJson(input = {}, context = {}) {
  const chapterPlan = asArray(context.chapterPlan).length ? asArray(context.chapterPlan) : Array.from({ length: Number(input.totalChapters || 12) || 12 }, (_, index) => ({
    chapterNumber: index + 1,
    title: `${index + 1}장 운명의 흐름`,
    requiredSystems: ["saju", "astrology"],
    requiredSections: ["반복의 주제", "상징의 근거", "현실의 장면", "선택의 방향"],
  }));
  const systems = ["saju", "astrology", "vedic", "sukuyo", "ziwei", "timing"];
  const chapters = chapterPlan.map((plan, index) => {
    const required = asArray(plan.requiredSystems).length ? asArray(plan.requiredSystems) : systems.slice(index % systems.length, index % systems.length + 2);
    const selected = required.length >= 2 ? required : [...required, systems[(index + 1) % systems.length]];
    const sectionNames = asArray(plan.requiredSections).length
      ? asArray(plan.requiredSections).slice(0, 4)
      : selected.concat(["timing", "saju"]).slice(0, 4);
    const labelText = systemLabels(selected).join(", ");
    return {
      chapterNumber: Number(plan.chapterNumber || index + 1),
      title: clean(plan.title || `${index + 1}장 운명의 흐름`),
      subtitle: "반복되는 삶의 주제를 차분히 비추는 장",
      summary: `이 장은 ${labelText}이 함께 가리키는 반복 주제를 조용히 정리합니다. 급한 결론보다 삶에서 계속 되돌아오는 선택의 모양을 살피며, 지금 조정할 수 있는 현실의 방향을 함께 남깁니다. 같은 반응이 관계와 일, 몸의 리듬에서 어떻게 되풀이되는지 바라보면 오래된 흐름도 더 부드럽게 다룰 수 있습니다.`,
      sections: sectionNames.map((system, sectionIndex) => ({
        title: clean(system),
        body: `${system}에서는 ${labelText}의 단서가 한 사람의 현실 안에서 어떻게 이어지는지 살핍니다. 반복되는 감정은 단순한 약점이 아니라 아직 충분히 이해되지 않은 삶의 언어일 수 있습니다. 이 흐름을 따라가면 관계에서 되풀이되는 거리감, 일 앞에서 굳어지는 책임감, 몸과 마음이 보내는 피로의 신호가 서로 연결되어 보입니다. 중요한 것은 빠르게 결론을 내리는 일이 아니라 같은 장면 앞에서 이번에는 조금 다른 선택을 남기는 것입니다.`,
      })),
      evidencePoints: selected.slice(0, 3).map((system, pointIndex) => ({
        system,
        signal: `${system} 흐름에서 드러나는 ${pointIndex + 1}번째 핵심 신호`,
        reading: `${system}에서 반복되는 신호가 현재의 선택과 연결되어 있습니다. 이 신호는 단정이 아니라 방향을 비추는 근거로 다루어야 하며, 다른 체계의 단서와 함께 볼 때 더 안정적인 상담의 기준이 됩니다.`,
      })),
      practicalAdvice: ["반복되는 감정을 기록합니다.", "결정은 하루의 여백을 두고 정리합니다.", "관계와 일의 우선순위를 분리합니다."],
      cautionPoints: ["급한 단정은 피합니다.", "과거의 패턴을 현재의 사람에게 그대로 씌우지 않습니다."],
    };
  });
  return JSON.stringify({
    reportTitle: "운명의 업 흐름",
    openingSummary: "이 글은 여러 상징 체계가 함께 가리키는 반복 주제를 따라 삶의 결을 읽습니다. 오래된 선택의 습관, 관계에서 되살아나는 감정, 일과 몸의 리듬이 서로 어떻게 맞물리는지 차분히 살피며 지금 바꿀 수 있는 작은 방향을 남깁니다. 한 체계의 단정에 기대기보다 여러 흐름의 공통된 결을 모아, 사용자가 현실에서 조절할 수 있는 태도와 선택의 기준을 부드럽게 비춥니다.",
    chapters,
    finalMessage: "삶에서 반복되는 주제는 벌이나 정답이 아니라 더 섬세하게 살아가라는 신호로 다가옵니다. 지금 필요한 것은 모든 것을 한 번에 바꾸는 일이 아니라, 같은 선택 앞에서 한 호흡을 더 두고 자신에게 맞는 길을 고르는 일입니다. 오래된 흐름을 알아차릴수록 마음은 덜 휘둘리고, 현실의 선택은 조금 더 선명한 방향을 얻습니다.",
    disclaimer: "이 내용은 전통 상징 체계를 바탕으로 한 자기이해와 성찰 목적의 상담형 콘텐츠입니다. 중요한 현실 결정은 실제 자료와 전문가의 조언을 함께 확인해 신중하게 판단해 주세요.",
  });
}

function buildMarkdown(input = {}) {
  return `# ${Number(input.chapterOrder || 1)}. ${clean(input.chapterTitle || "개발용 챕터")}

이 챕터는 개발 환경에서 PDF 생성 파이프라인을 검증하기 위해 준비된 콘텐츠입니다.

서비스 타입: ${clean(input.serviceType)}
Job ID: ${clean(input.jobId)}
Chapter ID: ${clean(input.chapterId)}
챕터 순서: ${Number(input.chapterOrder || 1)} / ${Number(input.totalChapters || 1)}
Provider: mock
실제 LLM 호출 여부: 아니오
사용 토큰: 0
예상 비용: 0원

긴 한글 문단을 통해 저장, 진행률, 렌더링, 다운로드 주소, 새로고침 복구 흐름을 확인합니다.`;
}

function buildMockContent(input = {}, env = {}) {
  const context = safeObject(input.context);
  const format = clean(context.format || inferFormat(input));
  if (format === "saju-new-year-json") return buildSajuNewYearJson(input, context);
  if (format === "soul-origin-json") return buildSoulOriginJson(input, context);
  if (format === "sukuyo-html") return buildSukuyoHtml(input, context);
  if (format === "ziwei-html") return buildZiweiHtml(input, context);
  if (format === "karma-integrated-html") return buildKarmaIntegratedHtml(input, context);
  if (format === "love-secret-html") return buildLoveSecretHtml(input, context);
  if (format === "markdown") return buildMarkdown(input);
  return buildClassSectionHtml(input, context, format);
}

export function resolvePdfLlmGatewaySettings(env = {}) {
  const nodeEnv = readEnv(env, "NODE_ENV", "development").toLowerCase();
  const provider = resolveProvider(env);
  return {
    nodeEnv,
    provider,
    dryRun: readBool(env, "LLM_DRY_RUN", nodeEnv !== "production"),
    debugMode: readBool(env, "PDF_DEBUG_MODE", nodeEnv !== "production"),
    geminiEnabled: readBool(env, "GEMINI_CALL_ENABLED", false),
    workersAiEnabled: readBool(env, "WORKERS_AI_ENABLED", false),
    maxCallsPerJob: readNumber(env, "PDF_LLM_MAX_CALLS_PER_JOB", 0),
    maxRetries: readNumber(env, "PDF_LLM_MAX_RETRIES", 0),
  };
}

export function generateMockPdfChapter(input = {}, env = {}) {
  if (isMockFailureRequested(input, env)) {
    const error = new Error(`PDF_MOCK_CHAPTER_FAILED:${clean(input.chapterId)}`);
    error.code = "PDF_MOCK_CHAPTER_FAILED";
    error.status = 503;
    error.chapterId = clean(input.chapterId);
    error.provider = "mock";
    error.isMock = true;
    throw error;
  }
  return {
    content: buildMockContent(input, env),
    provider: "mock",
    tokensUsed: 0,
    cost: 0,
    isMock: true,
  };
}

export async function generatePdfChapterContent(input = {}, env = {}) {
  const settings = resolvePdfLlmGatewaySettings(env);
  const context = safeObject(input.context);
  const effectiveProvider = clean(context.provider || settings.provider || "mock").toLowerCase();
  if (settings.dryRun) {
    logGateway("[PDF LLM Gateway] blocked actual LLM call because LLM_DRY_RUN=true", input, {
      provider: effectiveProvider,
      reason: "dry_run",
      providerReason: "dry_run",
      allowed: false,
      aiRunCalled: false,
    }, env);
    logGateway("[PDF LLM Gateway] mock provider used. No actual LLM call.", input, { provider: "mock", providerReason: "dry_run", allowed: false, aiRunCalled: false }, env);
    return generateMockPdfChapter(input, env);
  }
  if (effectiveProvider === "mock") {
    logGateway("[PDF LLM Gateway] mock provider used. No actual LLM call.", input, { provider: "mock", providerReason: "mock_provider", allowed: false, aiRunCalled: false }, env);
    return generateMockPdfChapter(input, env);
  }
  if (effectiveProvider === "gemini" && !settings.geminiEnabled) {
    logGateway("[PDF LLM Gateway] mock provider used. No actual LLM call.", input, {
      provider: "mock",
      reason: "gemini_disabled",
      providerReason: "gemini_disabled",
      allowed: false,
      aiRunCalled: false,
    }, env);
    return generateMockPdfChapter(input, env);
  }
  if (effectiveProvider === "workers-ai" && context.allowActual !== true) {
    logGateway("[PDF LLM Gateway] mock provider used. No actual LLM call.", input, {
      provider: "mock",
      reason: "actual_not_allowed_for_chapter",
      providerReason: "actual_not_allowed_for_chapter",
      allowed: false,
      aiRunCalled: false,
    }, env);
    return generateMockPdfChapter(input, env);
  }
  if (effectiveProvider === "workers-ai" && !settings.workersAiEnabled) {
    logGateway("[PDF LLM Gateway] mock provider used. No actual LLM call.", input, {
      provider: "mock",
      reason: "workers_ai_disabled",
      providerReason: "workers_ai_disabled",
      allowed: false,
      aiRunCalled: false,
    }, env);
    return generateMockPdfChapter(input, env);
  }
  if (settings.maxCallsPerJob <= 0) {
    logGateway("[PDF LLM Gateway] mock provider used. No actual LLM call.", input, {
      provider: "mock",
      reason: "max_calls_zero",
      providerReason: "max_calls_zero",
      allowed: false,
      aiRunCalled: false,
    }, env);
    return generateMockPdfChapter(input, env);
  }
  if (effectiveProvider === "workers-ai") {
    logGateway("[PDF LLM Gateway] Workers AI provider used for allowed chapter.", input, {
      provider: "workers-ai",
      reason: "real_llm_allowed",
      providerReason: "real_llm_allowed",
      allowed: true,
      aiRunCalled: false,
    }, env);
    const result = await generateWorkersAiPdfChapter(input, env);
    logGateway("[PDF LLM Gateway] Workers AI chapter completed.", input, {
      provider: "workers-ai",
      reason: result.providerReason || "real_llm_success",
      providerReason: result.providerReason || "real_llm_success",
      allowed: true,
      aiRunCalled: true,
      modelName: result.modelName,
      tokensUsed: result.tokensUsed,
    }, env);
    return result;
  }
  throw new Error("Actual LLM calls are disabled during PDF development.");
}

export async function generatePdfChapterTextResult(input = {}, env = {}) {
  const started = Date.now();
  try {
    const result = await generatePdfChapterContent(input, env);
    return {
      ok: true,
      text: result.content,
      rawText: result.content,
      provider: result.provider,
      model: result.modelName || result.model || result.provider,
      modelName: result.modelName || result.model || result.provider,
      tokensUsed: result.tokensUsed,
      cost: result.cost,
      isMock: result.isMock,
      providerReason: result.providerReason || (result.isMock === true ? "mock_provider" : "real_llm_success"),
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    const errorCode = clean(error?.code || "PDF_LLM_GATEWAY_BLOCKED");
    return {
      ok: false,
      provider: "mock",
      model: "mock",
      modelName: "mock",
      tokensUsed: 0,
      cost: 0,
      isMock: true,
      providerReason: errorCode,
      errorCode,
      errorMessage: clean(error?.message || error, 500),
      errorSummary: clean(error?.causeMessage || error?.message || error, 300),
      status: Number(error?.status || 503),
      latencyMs: Date.now() - started,
    };
  }
}

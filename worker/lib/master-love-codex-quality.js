/** Shared editorial contract for both books; calculations and pricing remain unchanged. */
export function buildCodexEditorialContract(chapter, compatibility) {
  const min = chapter.minChars || 2400;
  const bands = { low: "낮음", mid: "중간", high: "높음" };
  const axes = [...(compatibility?.cross?.convergence || []), ...(compatibility?.cross?.divergence || [])];
  return [
    "[완성 원고 기준 — 요약과 본문을 서로 다르게 활용]",
    `body는 최소 ${min}자이며 안전한 목표는 ${min + 500}~${min + 900}자다. 다른 JSON 필드와 지표는 본문 분량에 포함하지 않는다.`,
    "body에 4~6개의 소제목(##)을 두고, 각 절에서 근거 → 쉬운 뜻 → 서로 다른 생활 장면 → 선택 가능한 대응 순서로 설명한다. 문단은 2~4문장씩 나눈다. 같은 조언을 바꿔 말해서 분량을 채우지 마라.",
    "narration은 2~3문장, insight는 180~360자의 요약이다. keySentence는 한 문장이다. 요약의 긴 문단을 body에 복사하지 않는다. 본문은 사례와 이유를 추가한다.",
    "evidence는 이 장의 핵심 3~6개만 고른다. 실제 제공된 간지·궁·성요를 쓰고, 궁합에서는 본인/상대/교차 근거 중 누구의 것인지 label에 표시한다. 각 explanation은 해당 배치의 쉬운 뜻 한 문장이다.",
    "◎·▲·△·X 같은 내부 등급 표시는 독자용 문장에 복사하지 말고 쉬운 말로 풀어라. 제공되지 않은 별·사화·합충을 만들지 마라. 원국 내부의 합과 두 사람 사이의 합을 혼동하지 마라.",
    "actions는 2~3개다. 각 항목에 언제 실행할지, 실제로 할 행동, 말할 문장 또는 확인할 기준을 포함한다. '서로 존중하세요/노력하세요/소통하세요'만으로 끝내지 마라.",
    "caution은 나쁜 사건 예언이 아니라 문제가 커지는 조건과 멈출 신호다. 진단명·상대의 속마음·결혼/이별 시점·성공 확률을 확정하지 않는다. 출생시각 미상 명반은 정오 가정임을 해당 해석에서 명시한다.",
    "JSON의 요약·본문·지표·시각화는 같은 결론이어야 한다. 장별 범위를 지키고 앞 장의 핵심을 다시 늘어놓지 않는다. 점수는 해석 보조 지표이며 확률이나 실측 심리검사 결과가 아니다.",
    ...(axes.length ? [
      "[궁합 계산의 방향 — 아래 판정을 수사적 표현으로 뒤집지 마라]",
      ...axes.map(axis => `${axis.theme}: 사주 ${bands[axis.sajuBand] || axis.sajuBand}, 명반 ${bands[axis.ziweiBand] || axis.ziweiBand}.`),
      "양쪽 모두 낮은 끌림을 '강렬한 끌림/운명적 만남'으로 서술하지 않는다. 마찰이 크다는 것을 매력의 증거로 바꾸지 않는다. 상반된 축은 다름을 설명하고 한쪽으로 덮지 않는다.",
    ] : []),
  ].join("\n");
}

export function buildCodexChapterMemory(chapters = []) {
  return chapters.slice(-8).map(chapter => {
    const summary = chapter.content?.keySentence || String(chapter.body || "").split("\n")
      .map(line => line.trim()).find(line => line && !/^(?:#{1,6}\s|●)/.test(line));
    return summary ? `${String(chapter.title || "").trim()}: ${String(summary).trim().slice(0, 160)}` : "";
  }).filter(Boolean);
}

/** Explicitly labelled fixture; its caller must enforce the three staging-only flags. */
export function buildCodexStagingChapter(chapter, metricDefs) {
  const paragraph = `스테이징 검증용 ${chapter.title} 본문입니다. 실제 상담 해석이 아닙니다. 이 원고는 구매 권한 확인 이후 챕터 생성, 저장, 재열람과 모바일 표시가 연결되는지 확인합니다.\n\n`;
  return {
    body: (`## 스테이징 검증 원고\n\n` + paragraph.repeat(Math.ceil(((chapter.minChars || 2400) + 200) / paragraph.length))),
    narration: "스테이징 검증 원고입니다. 실제 상담 결과가 아닙니다.",
    evidence: [{ label: "스테이징 입력", system: "검증", explanation: "서비스 실행과 저장 연결을 검증합니다." }],
    insight: "실제 LLM 비용 없이 생성·저장·복구 흐름을 확인합니다.",
    keySentence: "스테이징 fixture는 실제 상담 품질 평가에 사용하지 않습니다.",
    caution: "이 내용으로 운세나 관계를 판단하지 않습니다.",
    actions: ["생성 후 새로고침하여 저장된 회차를 확인하세요.", "다시 로그인하여 같은 결과가 열리는지 확인하세요."],
    bridge: "다음 장에서도 동일한 저장 계약을 확인합니다.",
    ...(chapter.jsonMode ? { typeName: "스테이징 검증 유형", typeSummary: "실제 성향 분석이 아닌 검증 데이터입니다.",
      metrics: metricDefs.map(({ key, label }) => ({ key, label, score: 50, basis: "스테이징 검증용 고정 지표입니다." })) } : {}),
  };
}

/** Validate newly generated chapters only; never invalidate an older purchased book. */
export function assertCodexChapterQuality(parsed, chapter, metricDefs = []) {
  const source = chapter.structured === false ? { body: parsed } : parsed;
  const body = typeof source?.body === "string" ? source.body.trim() : "";
  if (body.length < (chapter.minChars || 2400)) throw new Error("LLM_OUTPUT_TOO_SHORT");
  if (chapter.structured === false) return;
  const hasText = value => typeof value === "string" && value.trim().length > 0;
  if (!["narration", "insight", "keySentence", "caution", "bridge"].every(key => hasText(source[key]))
      || !Array.isArray(source.evidence) || !source.evidence.some(item => hasText(item?.label) && hasText(item?.system) && hasText(item?.explanation))
      || !Array.isArray(source.actions) || source.actions.filter(hasText).length < 2) {
    throw new Error("LLM_OUTPUT_INCOMPLETE");
  }
  if (chapter.jsonMode) {
    const metrics = Array.isArray(source.metrics) ? source.metrics : [];
    if (!hasText(source.typeName) || !hasText(source.typeSummary)
        || metrics.length !== metricDefs.length
        || !metricDefs.every(({ key }) => {
          const matches = metrics.filter(item => item?.key === key);
          return matches.length === 1 && Number.isInteger(matches[0].score)
            && matches[0].score >= 0 && matches[0].score <= 100 && hasText(matches[0].basis);
        })) throw new Error("LLM_DNA_INCOMPLETE");
  }
}

/** Invalid responses must not trap a purchased retry behind the same cached output. */
export function qualityCheckedCodexCache(store, validate) {
  const valid = value => { try { validate(value); return true; } catch { return false; } };
  return {
    async get(key) { const value = await store.get(key); return value && valid(value) ? value : null; },
    async set(key, value, ttl) { if (valid(value)) await store.set(key, value, ttl); },
  };
}

/** Two bounded provider attempts cover malformed JSON and incomplete content too. */
export async function generateCodexChapterResponse(call, prompt, { chapter, metricDefs, deadlineAt = Infinity, minBudgetMs = 1000, options = {} }) {
  let failure;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const remaining = deadlineAt - Date.now();
    if (remaining < minBudgetMs) throw failure || new Error("GENERATION_BUDGET_EXCEEDED");
    const instruction = attempt ? `\n[재작성] 이전 응답은 ${failure?.message || "INVALID_OUTPUT"} 기준을 통과하지 못했다. JSON 문자열을 올바르게 닫고, body의 최소 분량과 필수 필드를 지켜 완성된 새 응답을 작성하라.` : "";
    const ai = await call(prompt + instruction, {
      ...options, attempts: 1, baseTokens: attempt ? 11000 : 8000, capTokens: 14000,
      timeoutMs: Math.min(Number(options.timeoutMs) || remaining, remaining),
    });
    try {
      if (ai?.truncated) throw new Error("LLM_OUTPUT_TRUNCATED");
      if (!ai?.text) throw new Error("LLM_OUTPUT_EMPTY");
      let parsed;
      try { parsed = JSON.parse(String(ai.text).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")); }
      catch { throw new Error("LLM_JSON_INVALID"); }
      assertCodexChapterQuality(parsed, chapter, metricDefs);
      return { ai, parsed };
    } catch (error) { failure = error; }
  }
  throw failure;
}

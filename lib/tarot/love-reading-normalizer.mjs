const REL_POSITION_LABELS = [
  "내가 바라보는 상대",
  "상대가 관계 전체를 보는 시각",
  "상대가 나를 바라보는 마음",
  "상대의 연애 의지와 열망",
  "관계를 가로막는 핵심 요인",
  "앞으로 펼쳐질 단기적 결말",
];

const POSITION_LENS = [
  {
    key: "self_view_of_other",
    title: "내가 바라보는 상대",
    detailFocus: "내가 상대에게 덧씌운 기대와 두려움, 투사 구조",
    adviceFocus: "확인 강요보다 해석 근거 정리",
  },
  {
    key: "other_view_of_relationship",
    title: "상대가 관계 전체를 보는 시각",
    detailFocus: "상대가 관계의 이름과 속도를 정의하는 방식",
    adviceFocus: "관계 이름보다 속도 합의",
  },
  {
    key: "other_feeling_toward_me",
    title: "상대가 나를 바라보는 마음",
    detailFocus: "상대가 나에게 느끼는 끌림·경계·혼란의 실제 온도",
    adviceFocus: "감정 추궁보다 오해 축소 대화",
  },
  {
    key: "other_romantic_will",
    title: "상대의 연애 의지와 열망",
    detailFocus: "상대의 마음이 실행 의지로 이동하는지 여부",
    adviceFocus: "감정 설득보다 실행 조건 정리",
  },
  {
    key: "core_block",
    title: "관계를 가로막는 핵심 요인",
    detailFocus: "오해/속도/타이밍/현실 변수의 병목",
    adviceFocus: "병목 신호 제거",
  },
  {
    key: "short_term_outcome",
    title: "앞으로 펼쳐질 단기적 결말",
    detailFocus: "2~6주 안에 굳어질 결말 패턴",
    adviceFocus: "단기 결말을 바꾸는 기준선 설정",
  },
];

const FORBIDDEN_MIXED_PHRASES = [/자존감/g, /작은\s*실천/g, /오늘\s*가능한\s*실행\s*단위/g, /힐링/g, /꿈\s*타로/g];

function asText(value) {
  return String(value || "").trim();
}

function cleanText(text) {
  let out = asText(text).replace(/\s{2,}/g, " ");
  FORBIDDEN_MIXED_PHRASES.forEach((pattern) => {
    out = out.replace(pattern, "");
  });
  return out.replace(/\s{2,}/g, " ").trim();
}

function parseCardMeta(card, idx) {
  const code = asText(card?.cardId || card?.cardCode || card?.id).toUpperCase();
  const suitCode = code.slice(0, 1);
  const rankNumber = Number(code.slice(1));
  const isMajor = suitCode === "M";
  const suit = isMajor
    ? "major"
    : ({ C: "cups", W: "wands", S: "swords", P: "pentacles" }[suitCode] || "minor");
  const rank = isMajor
    ? "Major"
    : ({
      1: "Ace",
      2: "Two",
      3: "Three",
      4: "Four",
      5: "Five",
      6: "Six",
      7: "Seven",
      8: "Eight",
      9: "Nine",
      10: "Ten",
      11: "Page",
      12: "Knight",
      13: "Queen",
      14: "King",
    }[rankNumber] || "Unknown");
  const orientation = asText(card?.orientation).toLowerCase() === "reversed" ? "reversed" : "upright";
  const orientationLabel = orientation === "reversed" ? "역방향" : "정방향";
  const isCourt = !isMajor && rankNumber >= 11 && rankNumber <= 14;
  const lens = POSITION_LENS[idx] || POSITION_LENS[POSITION_LENS.length - 1];

  const nameKo = asText(card?.nameKo || card?.nameKr || card?.cardName || card?.name);
  const nameEn = asText(card?.nameEn);

  return {
    positionOrder: idx + 1,
    positionKey: lens.key,
    positionTitle: lens.title,
    cardName: nameKo || "이름이 확인되지 않은 카드",
    cardNameEn: nameEn,
    cardId: code,
    suit,
    rank,
    isMajor,
    isCourt,
    orientation,
    orientationLabel,
    lens,
    keywords: Array.isArray(card?.keywords)
      ? card.keywords.map((k) => asText(k)).filter(Boolean).slice(0, 6)
      : [],
  };
}

function tokenize(text) {
  return cleanText(text)
    .toLowerCase()
    .replace(/[“”"'`.,!?;:()\[\]{}]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

function similarity(a, b) {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  ta.forEach((token) => {
    if (tb.has(token)) inter += 1;
  });
  return inter / new Set([...ta, ...tb]).size;
}

function suitCue(suit) {
  if (suit === "cups") return "감정과 정서 교류";
  if (suit === "wands") return "끌림, 속도, 추진력";
  if (suit === "swords") return "판단, 말, 오해 관리";
  if (suit === "pentacles") return "현실, 책임, 안정성";
  return "관계 구조의 전환";
}

function orientationCue(orientation) {
  return orientation === "reversed"
    ? "지연, 왜곡, 회피, 내면화"
    : "직접적 표현, 가시적 실행, 빠른 반응";
}

function buildDiversifiedFallback(field, row, idx, cards) {
  const safeCards = Array.isArray(cards) ? cards : [];
  const lens = row?.lens || POSITION_LENS[idx] || POSITION_LENS[POSITION_LENS.length - 1];
  const prev = idx > 0 ? parseCardMeta(safeCards[idx - 1], idx - 1) : null;
  const next = idx < safeCards.length - 1 ? parseCardMeta(safeCards[idx + 1], idx + 1) : null;
  const suitLine = suitCue(row.suit);
  const orientLine = orientationCue(row.orientation);

  if (field === "headline") {
    return `${row.cardName} ${row.orientationLabel}이 ${row.positionOrder}번 '${row.positionTitle}'에 들어오면, ${lens.detailFocus}를 ${suitLine} 축으로 읽어야 정확합니다.`;
  }
  if (field === "summary") {
    return `${row.positionTitle}에서 ${row.cardName} ${row.orientationLabel}은 ${suitLine} 이슈를 중심으로 관계의 현재 상태를 비춥니다. 특히 ${orientLine} 신호가 함께 작동해 같은 장면도 서로 다른 의도로 해석될 수 있습니다.`;
  }
  if (field === "detail") {
    return `${row.cardName} ${row.orientationLabel}은 ${row.positionTitle} 자리에서 '${lens.detailFocus}'를 분명하게 드러냅니다. 이 카드를 일반론으로 읽으면 관계 핵심을 놓치기 쉬우며, 실제로는 두 사람의 말투·연락 리듬·기준 합의가 어떻게 어긋나는지를 확인해야 합니다. ${row.suit} 계열 카드 특성상 ${suitLine}가 강하게 작동하므로 감정만 보거나 행동만 보면 해석 정확도가 떨어집니다. 또한 ${orientLine} 흐름이 겹치면 상대 의도를 단정하기보다 앞뒤 카드와 연결해 읽는 과정이 필수입니다. ${prev ? `직전 카드 ${prev.cardName} ${prev.orientationLabel}에서 시작된 패턴이 이 자리에서 증폭됩니다.` : "이 자리는 전체 해석의 출발점으로 작동합니다."} ${next ? `다음 카드 ${next.cardName} ${next.orientationLabel}로 넘어가며 결론 형태가 구체화됩니다.` : "마지막 카드로서 전체 배열 결론을 고정합니다."}`;
  }
  if (field === "relationshipInsight") {
    return `${row.positionTitle}의 관계 심리는 ${row.cardName} ${row.orientationLabel}이 말하는 ${suitLine} 패턴에 있습니다. 끌림과 경계가 동시에 존재할 수 있으므로 상대 반응의 속도보다 일관성 있는 행동 증거를 우선으로 판단해야 오해를 줄일 수 있습니다.`;
  }
  if (field === "advice") {
    return `${row.cardName} ${row.orientationLabel} 기준 실전 조언은 ${lens.adviceFocus}입니다. 오늘은 상대 의도 추측을 줄이고, ${row.positionTitle}에 맞는 확인 질문 1개와 경계 문장 1개만 짧게 전달하세요. ${prev ? `직전 카드 ${prev.cardName}에서 올라온 감정 과열 신호는 낮추고, ` : ""}${next ? `다음 카드 ${next.cardName}로 이어질 결말을 바꾸려면 ` : ""}연락 속도와 대화 길이를 동시에 조절하는 것이 핵심입니다.`;
  }
  if (field === "caution") {
    return `${row.cardName} ${row.orientationLabel}의 그림자는 ${orientLine}에 따른 해석 과열입니다. 상대가 답을 늦게 준다고 곧바로 관계 결론을 내리거나, 반대로 작은 호감 신호를 확정 신호로 과대평가하면 ${row.positionTitle}의 의미가 왜곡됩니다.`;
  }
  if (field === "orderConnection") {
    if (idx === 0 && next) return `1번 카드는 2번 ${next.cardName} ${next.orientationLabel}의 관계 프레임으로 넘어가며 첫 인상의 해석 강도를 조절합니다.`;
    if (idx === 1 && prev && next) return `2번 카드는 1번 ${prev.cardName}의 기대와 3번 ${next.cardName}의 실제 감정을 연결하는 프레임 축입니다.`;
    if (idx === 2 && next) return `3번 카드는 4번 ${next.cardName} ${next.orientationLabel}과 비교해 감정 온도와 실행 의지를 분리해 줍니다.`;
    if (idx === 3 && next) return `4번 카드는 5번 ${next.cardName}에서 병목으로 막히는 지점을 보여주며 실행 가능성을 시험합니다.`;
    if (idx === 4 && next) return `5번 카드는 6번 ${next.cardName} ${next.orientationLabel}의 단기 결말을 만드는 원인 고리입니다.`;
    return "6번 카드는 전체 배열 결론이며 1번의 인식 렌즈가 단기 현실로 굳어지는 결과입니다.";
  }
  return "";
}

function ensureMinLength(text, minLength, appendix) {
  const base = cleanText(text);
  if (base.length >= minLength) return base;
  const extra = cleanText(appendix);
  const merged = cleanText(`${base} ${extra}`);
  return merged.length >= minLength ? merged : `${merged} ${extra}`.trim();
}

function enforcePositionTextDiversity(rows, cards) {
  const fields = ["headline", "summary", "detail", "relationshipInsight", "advice", "caution", "orderConnection"];

  fields.forEach((field) => {
    rows.forEach((row, idx) => {
      let value = cleanText(row[field]);
      if (!value) value = cleanText(buildDiversifiedFallback(field, row, idx, cards));

      for (let i = 0; i < idx; i += 1) {
        const prev = cleanText(rows[i]?.[field]);
        if (!prev) continue;
        if (value === prev || similarity(value, prev) >= 0.65) {
          value = cleanText(buildDiversifiedFallback(field, row, idx, cards));
          break;
        }
      }

      if (field === "detail") {
        value = ensureMinLength(
          value,
          180,
          `${row.cardName} ${row.orientationLabel}의 카드 신호를 ${row.positionTitle} 포지션에 맞춰 재해석하고, 앞뒤 카드 연결을 반영해야 관계 현실과 단기 결말의 오차를 줄일 수 있습니다.`,
        );
      }
      if (field === "advice") {
        value = ensureMinLength(
          value,
          70,
          `${row.positionTitle}에서 오늘 가능한 조치는 속도 조절과 질문 최소화이며, 상대 반응 일관성을 기준으로 다음 행동을 정하세요.`,
        );
      }

      row[field] = value;
    });
  });

  rows.forEach((row) => {
    delete row.lens;
  });

  return rows;
}

function buildPositionReading(cards, basePosition = []) {
  const safeCards = Array.isArray(cards) ? cards : [];
  const baseRows = Array.isArray(basePosition) ? basePosition : [];

  const rows = safeCards.map((card, idx) => {
    const source = baseRows[idx] || {};
    const meta = parseCardMeta(card, idx);

    const headline = cleanText(source.headline || buildDiversifiedFallback("headline", meta, idx, safeCards));
    const summary = cleanText(source.summary || buildDiversifiedFallback("summary", meta, idx, safeCards));
    const detail = cleanText(source.detail || buildDiversifiedFallback("detail", meta, idx, safeCards));
    const relationshipInsight = cleanText(source.relationshipInsight || buildDiversifiedFallback("relationshipInsight", meta, idx, safeCards));
    const advice = cleanText(source.advice || buildDiversifiedFallback("advice", meta, idx, safeCards));
    const caution = cleanText(source.caution || buildDiversifiedFallback("caution", meta, idx, safeCards));
    const orderConnection = cleanText(source.orderConnection || buildDiversifiedFallback("orderConnection", meta, idx, safeCards));

    return {
      lens: meta.lens,
      positionTitle: source.positionTitle || meta.positionTitle,
      positionKey: source.positionKey || meta.positionKey,
      positionOrder: Number(source.positionOrder || meta.positionOrder || idx + 1),
      cardName: source.cardName || meta.cardName,
      cardNameEn: source.cardNameEn || meta.cardNameEn,
      cardId: source.cardId || meta.cardId,
      suit: source.suit || meta.suit,
      rank: source.rank || meta.rank,
      isMajor: typeof source.isMajor === "boolean" ? source.isMajor : meta.isMajor,
      isCourt: typeof source.isCourt === "boolean" ? source.isCourt : meta.isCourt,
      orientation: source.orientation || meta.orientation,
      orientationLabel: source.orientationLabel || meta.orientationLabel,
      keywords: Array.isArray(source.keywords) && source.keywords.length
        ? source.keywords.map((k) => asText(k)).filter(Boolean).slice(0, 6)
        : meta.keywords,
      headline,
      summary,
      detail,
      relationshipInsight,
      advice,
      caution,
      rawCardMeaning: cleanText(source.rawCardMeaning || source.summary || ""),
      orderConnection,
      title: source.title || source.positionTitle || meta.positionTitle,
      card: source.card || `${source.cardName || meta.cardName} · ${source.orientationLabel || meta.orientationLabel}`,
    };
  });

  return enforcePositionTextDiversity(rows, safeCards);
}

function sentenceSplit(text) {
  return asText(text)
    .split(/(?<=[.!?。！？]|다\.|니다\.|요\.)\s+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function hasForbiddenMix(text) {
  const source = asText(text);
  return FORBIDDEN_MIXED_PHRASES.some((pattern) => pattern.test(source));
}

function buildDefaultSections(rows, matrix) {
  const first = rows[0];
  const last = rows[rows.length - 1];
  return {
    counselorTone: "관계 감정과 행동 의지를 분리해 읽고, 카드 순서가 말하는 흐름으로 현실적 조언을 제시합니다.",
    overallVibe: `${first.cardName} ${first.orientationLabel}에서 ${last.cardName} ${last.orientationLabel}로 이어지는 이번 배열은 첫인상과 단기 결말의 대비가 뚜렷합니다. 카드 6장은 감정의 크기보다 해석 방식과 관계 속도 합의가 핵심임을 보여 줍니다. 시작 구간에서 강한 해석이 형성됐고, 마지막 구간에서는 선택 유보 또는 기준 불일치 위험이 올라오는 흐름입니다. 따라서 지금 필요한 것은 확답 압박이 아니라 오해를 줄이는 대화 구조와 속도 조절입니다. ${matrix.dominantSuit} 신호가 전체 공기를 이끌어 관계의 핵심 갈등 축을 분명히 드러냅니다.`,
    deepReading: `${rows[1].cardName} ${rows[1].orientationLabel}은 상대가 관계 자체를 어떤 프레임으로 보는지 보여 주고, ${rows[2].cardName} ${rows[2].orientationLabel}은 상대가 나에게 실제로 느끼는 감정 온도를 드러냅니다. 이 둘이 같아 보여도 결은 다르며, 감정 온도와 관계 정의는 분리해서 읽어야 합니다. 이어서 ${rows[3].cardName} ${rows[3].orientationLabel}은 상대의 연애 의지가 실제 행동으로 이어질 동력이 있는지 확인하게 만듭니다. 즉 3번은 마음의 질감, 4번은 실행 의지의 크기를 보여 주는 자리입니다. 이 구분을 무시하면 상대가 모순적이라고 느끼기 쉽지만, 실제로는 속도와 기준이 다른 것입니다. 대화는 감정 재판이 아니라 기준 정리 중심으로 짧게 구성해야 정확도가 올라갑니다.`,
    realityAndFuture: `${rows[4].cardName} ${rows[4].orientationLabel}이 가리키는 병목은 현재 관계를 늦추는 실제 원인입니다. 이 병목을 조정하지 않으면 ${rows[5].cardName} ${rows[5].orientationLabel}의 단기 결말로 자연스럽게 이어질 가능성이 큽니다. 바꿀 수 있는 것은 내 연락 리듬, 질문 방식, 결론 요구 강도이며, 바꾸기 어려운 것은 상대의 감정 정리 속도와 최종 결정 타이밍입니다. 따라서 2~6주 동안은 오해를 줄이는 단문 대화와 속도 낮추기를 동시에 적용해야 합니다. 핵심은 관계의 정답 찾기가 아니라 병목 관리의 일관성을 유지하는 것입니다.`,
  };
}

function validateRelationshipTarotQuality(reading) {
  const issues = [];
  const safe = reading && typeof reading === "object" ? reading : {};
  const sections = [safe.overallVibe, safe.deepReading, safe.realityAndFuture].map((v) => cleanText(v));

  const sentenceOwner = new Map();
  sections.forEach((section, idx) => {
    sentenceSplit(section).forEach((line) => {
      const normalized = line.toLowerCase().replace(/\s+/g, " ").trim();
      if (!normalized) return;
      const prev = sentenceOwner.get(normalized);
      if (prev !== undefined && prev !== idx) {
        issues.push("repeated_section_sentence");
      }
      sentenceOwner.set(normalized, idx);
    });
  });

  const rows = Array.isArray(safe.positionBreakdown) ? safe.positionBreakdown : [];
  if (rows.length !== 6) issues.push("position_count_invalid");

  rows.forEach((row, idx) => {
    const detail = cleanText(row?.detail);
    const advice = cleanText(row?.advice);
    const caution = cleanText(row?.caution);
    const cardName = asText(row?.cardName);
    const orientationLabel = asText(row?.orientationLabel);

    if (detail.length < 180) issues.push(`position_${idx + 1}_detail_too_short`);
    if (advice.length < 70) issues.push(`position_${idx + 1}_advice_too_short`);
    if (!detail.includes(cardName) || !detail.includes(orientationLabel)) issues.push(`position_${idx + 1}_card_or_orientation_missing`);
    if (hasForbiddenMix(`${detail} ${advice} ${caution}`)) issues.push(`position_${idx + 1}_mixed_phrase`);
  });

  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      ["detail", "advice", "caution"].forEach((field) => {
        const a = cleanText(rows[i]?.[field]);
        const b = cleanText(rows[j]?.[field]);
        if (!a || !b) return;
        if (a === b || similarity(a, b) >= 0.7) {
          issues.push(`position_${i + 1}_${j + 1}_${field}_too_similar`);
        }
      });
    }
  }

  const p3 = rows[2];
  const p4 = rows[3];
  if (p3 && p4) {
    const t3 = cleanText(`${p3.detail} ${p3.relationshipInsight}`);
    const t4 = cleanText(`${p4.detail} ${p4.relationshipInsight}`);
    if (similarity(t3, t4) >= 0.68 || (!t3.includes("감정") && !t4.includes("의지"))) {
      issues.push("position3_position4_not_distinct");
    }
  }

  const blockToOutcome = cleanText(safe?.relationshipMatrix?.blockToOutcome || "");
  if (!blockToOutcome) issues.push("missing_block_to_outcome");

  const finalAdviceText = cleanText(
    `${safe?.finalAdvice?.instantMission || ""} ${safe?.finalAdvice?.conversationTip || ""} ${safe?.finalAdvice?.relationshipBoundary || ""}`,
  );
  if (finalAdviceText.length < 80) issues.push("final_advice_too_generic");
  if (hasForbiddenMix(finalAdviceText)) issues.push("final_advice_mixed_phrase");

  if (!cleanText(safe?.relationshipMatrix?.wholeStory || "")) {
    issues.push("relationship_matrix_whole_story_missing");
  }

  return {
    ok: issues.length === 0,
    issues: Array.from(new Set(issues)),
  };
}

export function normalizeLoveReadingPayload(reading, cards) {
  const src = reading && typeof reading === "object" ? reading : {};
  const safeCards = Array.isArray(cards) ? cards : [];

  let positionBreakdown = buildPositionReading(safeCards, Array.isArray(src.positionBreakdown) ? src.positionBreakdown : []);

  const first = positionBreakdown[0] || {};
  const last = positionBreakdown[positionBreakdown.length - 1] || {};
  const relationshipMatrix = src.relationshipMatrix && typeof src.relationshipMatrix === "object"
    ? src.relationshipMatrix
    : {
      projectionGap: `${positionBreakdown[0]?.cardName || "1번 카드"}와 ${positionBreakdown[2]?.cardName || "3번 카드"}의 간극을 비교해, 내가 본 상대와 상대의 실제 감정 온도 차이를 확인해야 합니다.`,
      relationshipFrame: `${positionBreakdown[1]?.cardName || "2번 카드"}와 ${positionBreakdown[3]?.cardName || "4번 카드"}를 함께 읽어 생각과 행동 의지가 일치하는지 점검해야 합니다.`,
      blockToOutcome: `${positionBreakdown[4]?.cardName || "5번 카드"}의 병목이 ${positionBreakdown[5]?.cardName || "6번 카드"} 단기 결말을 만드는 연결 고리입니다.`,
      wholeStory: `${first.cardName || "첫 카드"} ${first.orientationLabel || ""}에서 ${last.cardName || "마지막 카드"} ${last.orientationLabel || ""}로 흐르는 6장 서사는 감정 온도와 관계 정의 속도의 간극을 보여 줍니다.`,
      dominantSuit: asText(src?.relationshipMatrix?.dominantSuit || "주도 슈트 신호를 기준으로 관계 핵심 축을 해석합니다."),
      majorArcanaSignal: asText(src?.relationshipMatrix?.majorArcanaSignal || "메이저 카드 비중은 관계 전환 압력의 크기를 알려줍니다."),
      reversedSignal: asText(src?.relationshipMatrix?.reversedSignal || "역방향 비율은 지연과 왜곡 가능성을 보여 줍니다."),
      courtCardSignal: asText(src?.relationshipMatrix?.courtCardSignal || "궁정카드 비중은 인물 간 태도 차이를 드러냅니다."),
      sequenceFlow: asText(src?.relationshipMatrix?.sequenceFlow || positionBreakdown.map((r) => `${r.cardName}(${r.orientationLabel})`).join(" → ")),
    };

  const defaults = buildDefaultSections(positionBreakdown, relationshipMatrix);

  let normalized = {
    title: asText(src.title || "우리 사이 타로"),
    summary: cleanText(src.summary || "6장 배열을 기준으로 관계의 해석 렌즈, 상대 감정 온도, 연애 의지, 병목, 단기 결말을 순서대로 읽은 결과입니다."),
    counselorTone: cleanText(src.counselorTone || defaults.counselorTone),
    overallVibe: cleanText(src.overallVibe || defaults.overallVibe),
    deepReading: cleanText(src.deepReading || defaults.deepReading),
    realityAndFuture: cleanText(src.realityAndFuture || defaults.realityAndFuture),
    relationshipMatrix,
    positionBreakdown,
    finalAdvice: {
      instantMission: cleanText(src?.finalAdvice?.instantMission || `${positionBreakdown[4]?.cardName || "5번 카드"}과 ${positionBreakdown[5]?.cardName || "6번 카드"} 조합 기준으로, 오늘은 속도를 낮추고 결론 요구를 멈춘 뒤 오해를 줄이는 질문 1개만 남기세요.`),
      conversationTip: cleanText(src?.finalAdvice?.conversationTip || `${positionBreakdown[2]?.cardName || "3번 카드"}의 감정 온도와 ${positionBreakdown[3]?.cardName || "4번 카드"}의 실행 의지를 분리해서 묻는 짧은 대화를 선택하세요.`),
      relationshipBoundary: cleanText(src?.finalAdvice?.relationshipBoundary || `${positionBreakdown[5]?.cardName || "6번 카드"} 흐름상 애매함이 길어질 때 내가 지킬 기준선(연락 주기/약속 이행/대화 톤) 3가지를 먼저 정하세요.`),
      nextSevenDays: cleanText(src?.finalAdvice?.nextSevenDays || `${positionBreakdown[0]?.cardName || "첫 카드"}에서 ${positionBreakdown[5]?.cardName || "마지막 카드"}로 이어지는 흐름을 고려해, 7일 동안은 확인 강요 대신 속도 조절과 사실 대화에 집중하세요.`),
      checklist: Array.isArray(src?.finalAdvice?.checklist) && src.finalAdvice.checklist.length
        ? src.finalAdvice.checklist.map((line) => cleanText(line)).filter(Boolean)
        : [
          `${positionBreakdown[4]?.cardName || "5번 카드"} 병목 신호를 유발하는 급한 확인 메시지 중단`,
          `${positionBreakdown[2]?.cardName || "3번 카드"} 기준 감정 단정 문장 대신 사실 문장 사용`,
          `${positionBreakdown[3]?.cardName || "4번 카드"} 기준 말보다 행동 제안 여부 확인`,
          `${positionBreakdown[1]?.cardName || "2번 카드"} 기준 관계 이름보다 속도 합의 우선`,
          `${positionBreakdown[5]?.cardName || "6번 카드"} 기준 애매함 지속 시 경계선 실행`,
        ],
    },
    advice: Array.isArray(src.advice)
      ? src.advice.map((line) => cleanText(line)).filter(Boolean)
      : [],
    cardSections: src.cardSections,
    combinations: src.combinations,
    combinationReading: cleanText(src.combinationReading),
    finalAdviceText: cleanText(src.finalAdviceText || src?.finalAdvice?.instantMission || ""),
  };

  normalized.advice = [
    normalized.finalAdvice.instantMission,
    normalized.finalAdvice.conversationTip,
    normalized.finalAdvice.relationshipBoundary,
    normalized.finalAdvice.nextSevenDays,
  ].filter(Boolean);

  let quality = validateRelationshipTarotQuality(normalized);
  if (!quality.ok) {
    for (let attempt = 1; attempt <= 2 && !quality.ok; attempt += 1) {
      positionBreakdown = buildPositionReading(safeCards, []);
      const refreshedDefaults = buildDefaultSections(positionBreakdown, relationshipMatrix);
      normalized = {
        ...normalized,
        positionBreakdown,
        overallVibe: refreshedDefaults.overallVibe,
        deepReading: refreshedDefaults.deepReading,
        realityAndFuture: refreshedDefaults.realityAndFuture,
      };
      quality = validateRelationshipTarotQuality(normalized);
    }
    if (!quality.ok) {
      console.warn("[RelationshipTarot][QualityFail]", quality.issues);
    }
  }

  if (process.env.NODE_ENV !== "production") {
    const sequenceFlow = asText(normalized?.relationshipMatrix?.sequenceFlow || normalized.positionBreakdown.map((row) => `${row.cardName}(${row.orientationLabel})`).join(" → "));
    console.log("[RelationshipTarot] spreadId", "relationship_six_card");
    console.log("[RelationshipTarot] drawnCards", normalized.positionBreakdown.map((row) => `${row.positionOrder}:${row.cardName}(${row.orientationLabel})`));
    console.log("[RelationshipTarot] sequenceFlow", sequenceFlow);
    console.log("[RelationshipTarot] relationshipMatrix", normalized.relationshipMatrix);
    console.log("[RelationshipTarot] quality", quality);
  }

  normalized.quality = quality;
  return normalized;
}

export function buildLoveConsultingHighlights(reading) {
  const src = reading && typeof reading === "object" ? reading : {};
  return [
    src.overallVibe,
    src.deepReading,
    src.realityAndFuture,
    src?.relationshipMatrix?.wholeStory,
  ]
    .map((line) => cleanText(line))
    .filter(Boolean)
    .slice(0, 4);
}

export { validateRelationshipTarotQuality };

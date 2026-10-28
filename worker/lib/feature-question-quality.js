// Only the four Ggulggul question adapters use this editorial pass.
// Stored purchased originals and Yeongnyangi reports are never rewritten.
export function cleanQuestionBody(body, state = {}) {
  const prior = Object.values(state.parts || {}).join('\n');
  let usedDebt = /빚은\s*남겨\s*두면/u.test(prior);
  return String(body || '')
    .replace(/[([]\s*(?:fact-\d+[\s,;·]*)+[)\]]/giu, '')
    .replace(/\bfact-\d+\b/giu, '')
    .split(/\n\s*\n/u).map(paragraph => paragraph
      .split(/(?<=[.!?。？！])\s+/u).filter(sentence => {
        // Punctuation alone cannot finish a Korean clause cut at a particle.
        if (/(?:당신이|자신에게|상대방에게|때|다면|하며|하고|위해|통해|예를 들어)[.!?]?\s*$/u.test(sentence.trim())) return false;
        if (/빚은\s*남겨\s*두면/u.test(sentence)) {
          if (usedDebt) return false;
          usedDebt = true;
        }
        return true;
      }).join(' ').replace(/\s+([,.])/gu, '$1').trim())
    .filter(Boolean).join('\n\n');
}

export function questionEditorialContext(state, task) {
  const previous = (state.tasks || []).filter(row => row.id !== task.id && state.parts?.[row.id])
    .map(row => `${row.title}: ${state.parts[row.id]}`).join('\n\n');
  return `\n[이번 장의 편집 계약]\n${task.prompt || task.title}
전체 상담 지시보다 이번 장의 범위를 우선합니다. 각 장마다 전체 질문에 처음부터 답하거나 전체 목차를 다시 쓰지 않습니다. 행동 계획은 part-9에서, 최종 요약은 part-10에서만 씁니다.
근거는 claims 메타데이터로만 인용합니다. 본문에 fact-번호, JSON 키, 내부 경로를 노출하지 말고 실제 궁·별·행성·숙 이름과 쉬운 뜻으로 설명합니다.
각 문단은 확인된 근거, 그 근거에서 가능한 해석, 적용되지 않는 조건을 구별합니다. 해석이 맞지 않으면 사용자의 마음이 닫혔다고 탓하지 말고 근거의 한계를 인정합니다. 같은 근거라도 이번 장에 새롭게 필요한 연결이 없으면 반복하지 않습니다.
금전·투자 수익과 성공을 예고하거나 운세만으로 투자·확장을 권하지 않습니다. 현실의 예산·위험·행동 조건으로 설명합니다. 계산된 시기나 상대 자료가 없으면 없다고 명시합니다.
서한비의 빚 비유는 전체 리포트에서 한 번 이하입니다. 인물의 구호나 자기소개 대신 근거와 논리를 통해 전문성을 드러냅니다. 각 장 마지막은 조사나 연결어가 아닌 완결된 문장으로 끝냅니다.
${previous ? `[이미 전달한 본문 — 문장과 사례와 비유를 재사용하지 말 것]\n${previous}` : ''}`;
}

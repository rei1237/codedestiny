const ARCHETYPES = [
  {
    name: "삼광형",
    card: "광",
    summary: "리더십과 직감이 강한 흐름입니다. 결단은 빠르게, 감정 표현은 부드럽게 가져가세요.",
  },
  {
    name: "고도리형",
    card: "열끗",
    summary: "관계와 소통이 운을 엽니다. 혼자보다 팀 플레이에서 성과가 큽니다.",
  },
  {
    name: "청단형",
    card: "띠",
    summary: "꾸준함이 핵심입니다. 작은 습관 교정이 큰 기회를 만듭니다.",
  },
  {
    name: "똥광형",
    card: "광",
    summary: "변수 대응력이 강한 타입입니다. 급한 선택보다 한 번 더 검토가 유리합니다.",
  },
  {
    name: "비광형",
    card: "광",
    summary: "원칙과 유연함의 균형이 중요합니다. 주변 조언을 받아들이면 확장이 빨라집니다.",
  },
];

function pickArchetype() {
  const idx = Math.floor(Math.random() * ARCHETYPES.length);
  return ARCHETYPES[idx];
}

export function initHwatuLifeService(container) {
  const picked = pickArchetype();
  container.innerHTML = `
    <section class="static-service-panel" aria-label="화투 인생 패 테스트 실행 영역">
      <h3 class="static-service-panel__title">화투 인생 패 테스트</h3>
      <p class="static-service-panel__desc">질문 없이 빠른 타입 리딩을 제공합니다. 다시 뽑아 흐름을 비교해 보세요.</p>
      <button type="button" class="static-service-panel__btn" data-role="draw-hwatu">인생 패 다시 뽑기</button>
      <div class="static-service-result" data-role="hwatu-result">
        <strong>${picked.name} (${picked.card})</strong>
        <p>${picked.summary}</p>
      </div>
    </section>
  `;

  const button = container.querySelector('[data-role="draw-hwatu"]');
  const result = container.querySelector('[data-role="hwatu-result"]');
  if (button && result) {
    button.addEventListener("click", () => {
      const next = pickArchetype();
      result.innerHTML = `<strong>${next.name} (${next.card})</strong><p>${next.summary}</p>`;
    });
  }
}

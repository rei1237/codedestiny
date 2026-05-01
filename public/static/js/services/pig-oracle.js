const PIG_ORACLE_SHAPES = [
  { name: "별꽃", meaning: "기회가 빠르게 열리는 주간, 먼저 제안할수록 유리합니다." },
  { name: "조개", meaning: "감정을 보호해야 하는 시기, 관계는 천천히 확인하세요." },
  { name: "고리", meaning: "반복되는 패턴을 바꾸면 운이 즉시 상승합니다." },
  { name: "돛", meaning: "이동/전환 운이 강합니다. 짧은 여행도 길한 신호입니다." },
  { name: "씨앗", meaning: "지금 시작한 일이 지연되더라도 결국 수확으로 연결됩니다." },
  { name: "파도", meaning: "감정 기복이 크니 결정은 하루 늦추는 편이 좋습니다." },
  { name: "열쇠", meaning: "막혔던 문제의 해답이 사람을 통해 들어옵니다." },
  { name: "램프", meaning: "작은 힌트가 큰 전환을 만듭니다. 기록해 두세요." }
];

function pickShape() {
  const idx = Math.floor(Math.random() * PIG_ORACLE_SHAPES.length);
  return PIG_ORACLE_SHAPES[idx];
}

export function initPigOracleService(container) {
  const shape = pickShape();
  container.innerHTML = `
    <section class="static-service-panel" aria-label="돼지 주석점 실행 영역">
      <h3 class="static-service-panel__title">핀란드 돼지 주석점</h3>
      <p class="static-service-panel__desc">주석 형태를 해석해 오늘의 메시지를 받습니다.</p>
      <button type="button" class="static-service-panel__btn" data-role="draw-pig">형태 다시 확인하기</button>
      <div class="static-service-result" data-role="pig-result">
        <strong>${shape.name}</strong>
        <p>${shape.meaning}</p>
      </div>
    </section>
  `;

  const button = container.querySelector('[data-role="draw-pig"]');
  const result = container.querySelector('[data-role="pig-result"]');
  if (button && result) {
    button.addEventListener("click", () => {
      const next = pickShape();
      result.innerHTML = `<strong>${next.name}</strong><p>${next.meaning}</p>`;
    });
  }
}

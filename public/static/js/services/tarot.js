const TAROT_CARDS = [
  { name: "The Fool", meaning: "새로운 시작, 가벼운 도전, 직관을 믿는 흐름" },
  { name: "The Magician", meaning: "의지와 집중력, 원하는 결과를 현실로 끌어오는 힘" },
  { name: "The High Priestess", meaning: "겉보다 깊은 신호, 잠시 멈추고 내면의 답 확인" },
  { name: "The Empress", meaning: "풍요, 돌봄, 관계의 따뜻한 확장" },
  { name: "The Emperor", meaning: "구조와 책임, 기준을 세우면 안정이 생김" },
  { name: "The Hierophant", meaning: "전통, 조언, 검증된 방법의 가치" },
  { name: "The Lovers", meaning: "관계 선택, 가치 정렬, 진심 확인" },
  { name: "The Chariot", meaning: "주도권 회복, 방향 고정, 전진" },
  { name: "Strength", meaning: "부드러운 통제, 감정 다루기, 지속력" },
  { name: "The Hermit", meaning: "고요한 점검, 혼자만의 통찰 시간" },
  { name: "Wheel of Fortune", meaning: "전환점 도래, 타이밍을 잡는 시기" },
  { name: "Justice", meaning: "균형, 정리, 공정한 결과" },
  { name: "The Hanged Man", meaning: "관점 전환, 잠시 멈춤이 답이 되는 때" },
  { name: "Death", meaning: "종료와 재시작, 낡은 패턴 정리" },
  { name: "Temperance", meaning: "조율, 회복, 과하지 않은 리듬" },
  { name: "The Devil", meaning: "집착 점검, 무의식적 반복 끊기" },
  { name: "The Tower", meaning: "급격한 재구성, 진실 직면" },
  { name: "The Star", meaning: "희망, 치유, 멀리 보는 낙관" },
  { name: "The Moon", meaning: "불확실성, 직감, 섣부른 단정 금지" },
  { name: "The Sun", meaning: "명료함, 활력, 성과 가시화" },
  { name: "Judgement", meaning: "재평가, 결단, 다음 단계 진입" },
  { name: "The World", meaning: "완성, 마무리, 확장" }
];

function pickRandomCard() {
  const idx = Math.floor(Math.random() * TAROT_CARDS.length);
  return TAROT_CARDS[idx];
}

export function initTarotService(container) {
  const card = pickRandomCard();
  container.innerHTML = `
    <section class="static-service-panel" aria-label="타로 실행 영역">
      <h3 class="static-service-panel__title">타로 리딩</h3>
      <p class="static-service-panel__desc">카드를 뽑아 현재 흐름을 확인하세요.</p>
      <button type="button" class="static-service-panel__btn" data-role="draw-tarot">카드 다시 뽑기</button>
      <div class="static-service-result" data-role="tarot-result">
        <strong>${card.name}</strong>
        <p>${card.meaning}</p>
      </div>
    </section>
  `;

  const button = container.querySelector('[data-role="draw-tarot"]');
  const result = container.querySelector('[data-role="tarot-result"]');
  if (button && result) {
    button.addEventListener("click", () => {
      const next = pickRandomCard();
      result.innerHTML = `<strong>${next.name}</strong><p>${next.meaning}</p>`;
    });
  }
}

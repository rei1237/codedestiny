const RUNES = [
  { symbol: "ᚠ", name: "Fehu", meaning: "재물 흐름, 시작 자원 확보" },
  { symbol: "ᚢ", name: "Uruz", meaning: "체력, 실행력, 밀어붙이는 힘" },
  { symbol: "ᚦ", name: "Thurisaz", meaning: "경계, 충동 제어, 판단 유예" },
  { symbol: "ᚨ", name: "Ansuz", meaning: "메시지, 대화, 신호 해석" },
  { symbol: "ᚱ", name: "Raidho", meaning: "이동, 여정, 방향 정렬" },
  { symbol: "ᚲ", name: "Kenaz", meaning: "통찰, 학습, 문제 해법 발견" },
  { symbol: "ᚷ", name: "Gebo", meaning: "교환, 협력, 관계 균형" },
  { symbol: "ᚹ", name: "Wunjo", meaning: "완화, 기쁨, 결과 안정" },
  { symbol: "ᚺ", name: "Hagalaz", meaning: "예상 밖 변수, 구조 재정비" },
  { symbol: "ᚾ", name: "Nauthiz", meaning: "제약 인식, 우선순위 재설정" },
  { symbol: "ᛁ", name: "Isa", meaning: "정지, 관찰, 속도 조절" },
  { symbol: "ᛃ", name: "Jera", meaning: "수확, 순환, 누적 성과" }
];

function pickRune() {
  const idx = Math.floor(Math.random() * RUNES.length);
  return RUNES[idx];
}

export function initStonehengeRuneService(container) {
  const rune = pickRune();
  container.innerHTML = `
    <section class="static-service-panel" aria-label="스톤헨지 룬 실행 영역">
      <h3 class="static-service-panel__title">스톤헨지 룬 오라클</h3>
      <p class="static-service-panel__desc">룬 하나를 뽑아 오늘의 방향을 읽습니다.</p>
      <button type="button" class="static-service-panel__btn" data-role="draw-rune">룬 다시 뽑기</button>
      <div class="static-service-result" data-role="rune-result">
        <strong>${rune.symbol} ${rune.name}</strong>
        <p>${rune.meaning}</p>
      </div>
    </section>
  `;

  const button = container.querySelector('[data-role="draw-rune"]');
  const result = container.querySelector('[data-role="rune-result"]');
  if (button && result) {
    button.addEventListener("click", () => {
      const next = pickRune();
      result.innerHTML = `<strong>${next.symbol} ${next.name}</strong><p>${next.meaning}</p>`;
    });
  }
}

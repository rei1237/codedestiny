export function initPigOracleService(container) {
  container.innerHTML = `
    <section class="static-service-panel" aria-label="돼지 주석점 실행 영역">
      <h3 class="static-service-panel__title">핀란드 돼지 주석점</h3>
      <p class="static-service-panel__desc">업데이트된 5단계 의식 버전으로 이동해 전체 리딩을 실행합니다.</p>
      <button type="button" class="static-service-panel__btn" data-role="open-full-pig-oracle">최신 주석점 열기</button>
      <div class="static-service-result">
        <strong>권장 경로</strong>
        <p><code>/oracle/sikojen-povailu</code>에서 최신 인터랙티브 버전을 실행할 수 있습니다.</p>
      </div>
    </section>
  `;

  const button = container.querySelector('[data-role="open-full-pig-oracle"]');
  if (button) {
    button.addEventListener("click", () => {
      window.location.href = "/oracle/sikojen-povailu";
    });
  }
}

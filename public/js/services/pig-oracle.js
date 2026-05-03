export function initPigOracleService(container) {
  const destination = "/oracle/sikojen-povailu";
  container.innerHTML = `
    <section class="static-service-panel" aria-label="돼지 주석점 실행 영역">
      <h3 class="static-service-panel__title">핀란드 꽃돼지 주석점</h3>
      <p class="static-service-panel__desc">최신 주석점 엔진으로 바로 이동합니다.</p>
      <button type="button" class="static-service-panel__btn" data-role="open-full-pig-oracle">최신 주석점 열기</button>
      <div class="static-service-result">
        <strong>최신 경로</strong>
        <p><code>${destination}</code> (최신 <code>shapes.ts</code> 데이터 반영)</p>
      </div>
    </section>
  `;

  const button = container.querySelector('[data-role="open-full-pig-oracle"]');
  if (button) button.addEventListener("click", () => { window.location.href = destination; });

  setTimeout(() => {
    if (window.location.pathname === "/index.html") {
      window.location.href = destination;
    }
  }, 250);
}

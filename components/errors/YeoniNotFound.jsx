import styles from "./yeoni-not-found.module.css";

export default function YeoniNotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <a className={styles.brand} href="/">꿀꿀 운세</a>
        <section className={styles.scene} aria-labelledby="not-found-title">
          <div className={styles.art}>
            <img src="/images/errors/yeoni-lost-v1.webp" width="1200" height="800"
              alt="꽃길 갈림길에서 지도를 들고 돌아갈 길을 찾는 꽃돼지 연이" fetchPriority="high" />
          </div>
          <div className={styles.copy}>
            <h1 id="not-found-title">연이가 잠시<br />길을 잃었어요.</h1>
            <p>찾으시는 페이지가 옮겨졌거나<br className={styles.desktopBreak} /> 아직 열리지 않은 길일 수 있어요.</p>
            <p>괜찮아요. 익숙한 꽃길로 돌아가<br className={styles.desktopBreak} /> 다시 시작해 볼까요?</p>
            <nav className={styles.actions} aria-label="다시 시작하기">
              <a className={styles.primary} href="/">홈으로 돌아가기</a>
              <a className={styles.secondary} href="/?action=cdOneStepFreeSajuEntry">사주 분석 시작하기</a>
            </nav>
            <small className={styles.code}>페이지를 찾을 수 없습니다 · 404</small>
          </div>
        </section>
        <nav className={styles.related} aria-label="다른 길 둘러보기">
          <a href="/saju/career-style/">나의 일 스타일</a>
          <a href="/insights/">운세 인사이트</a>
          <a href="/saju/guide/">사주 읽기 안내</a>
          <a href="/faq/">자주 묻는 질문</a>
        </nav>
      </div>
    </main>
  );
}

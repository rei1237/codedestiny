import Link from "next/link";
import NakshatraFormClient from "./NakshatraFormClient";
import { NAKSHATRA_COMPAT_PRICE_LABEL } from "./_lib/pricing";
import { buildBreadcrumbJsonLd, buildServiceJsonLd, buildWebPageJsonLd } from "../../lib/structured-data";
import styles from "./library.module.css";

export default function NakshatraLanding({ page }) {
  const data = [buildWebPageJsonLd({ title: page.title, description: page.description, path: "/nakshatra/" }),
    buildServiceJsonLd({ name: "나크샤트라 결정판", description: page.description, path: "/nakshatra/", serviceType: "운세 해석 서비스" }),
    buildBreadcrumbJsonLd([{ name: "꿀꿀 사주", path: "/" }, { name: "나크샤트라 결정판", path: "/nakshatra/" }])];
  return <main className={styles.page}>
    <div className={styles.wrap}>
      <nav className={styles.nav} aria-label="나크샤트라 탐색"><Link href="/ggulggul/">꿀꿀 사주로</Link><a href="#method">두 전통을 읽는 방법</a></nav>
      <header className={styles.hero}>
        <div>
          <h1>나크샤트라 결정판<span>두 개의 시선으로<br />깊어지는 나의 이야기</span></h1>
          <p className={styles.lead}>타고난 성향부터 일과 사랑, 함께 살아가는 방식까지.<br />일본 숙요의 본명숙과 인도 베다의 달을 나란히 놓고, 지금의 나를 차분히 읽어 보세요.</p>
          <div className={styles.actions}><a href="#nakshatra-form" className={styles.button}>나의 별 읽기 · 무료</a><Link href="/nakshatra/compat/" className={styles.secondary}>두 사람의 궁합</Link></div>
          <p className={styles.price}>개인 주제별 요약 무료 · 개인 심화는 기존 유료 상담<br />선택형 궁합 {NAKSHATRA_COMPAT_PRICE_LABEL} · 이용권·월정석 적용은 결제창에서 확인</p>
        </div>
        <figure className={styles.art}>
          <img src="/images/nakshatra/moonlight-library-1672.webp" srcSet="/images/nakshatra/moonlight-library-480.webp 480w, /images/nakshatra/moonlight-library-960.webp 960w, /images/nakshatra/moonlight-library-1672.webp 1672w" sizes="(max-width: 760px) calc(100vw - 40px), 600px" width="1672" height="941" fetchPriority="high" alt="달빛 연못을 바라보는 인도 석조 아치와 금박 천문 병풍, 별의 책이 펼쳐진 서고" />
          <figcaption>하나의 정답을 강요하지 않는, 두 전통의 조용한 대화</figcaption>
        </figure>
      </header>
      <nav className={styles.toc} aria-label="살펴볼 주제"><a href="#reading">타고난 성향</a><a href="#reading">차크라와 돌봄</a><a href="#reading">직업 적성</a><a href="#reading">연애와 결혼</a><Link href="/nakshatra/compat/">궁합</Link></nav>
      <section className={styles.section} id="nakshatra-form"><h2>당신의 이야기는 여기에서 시작됩니다</h2><p className={styles.lead}>저장한 프로필을 선택하거나 출생 정보를 입력해 주세요. 태어난 시간을 모르면 ‘시간 모름’을 선택할 수 있어요.</p><NakshatraFormClient /></section>
      <section className={styles.section} id="reading"><h2>별의 언어를, 생활의 언어로</h2><div className={styles.spread}>
        <div><h3>나를 이해하는 개인 리딩</h3><p>성향의 강점과 반복되는 패턴, 편안하게 능력을 쓰는 환경, 사랑을 표현하는 방식과 결혼 생활의 선택을 읽습니다. 차크라는 건강 진단이 아닌 몸·마음 돌봄의 질문으로 만납니다.</p><Link href="/nakshatra/ai/" className={styles.secondary}>개인 심화 상담 살펴보기</Link></div>
        <div><h3>함께 살아가는 두 사람의 리딩</h3><p>일본 숙요의 관계 역할과 인도 아쉬타쿠타 8항목을 구분해 비교합니다. 점수 하나로 인연을 단정하지 않고, 가까워지는 방식과 서로 조율할 지점을 전합니다.</p><Link href="/nakshatra/compat/" className={styles.secondary}>궁합 살펴보기 · {NAKSHATRA_COMPAT_PRICE_LABEL}</Link></div>
      </div></section>
      <section className={styles.section} id="method"><h2>계산은 분명하게, 해석은 유연하게</h2><div className={styles.spread}>
        <div><h3>일본 숙요 · 날짜가 놓이는 자리</h3><p>일본 시간 기준의 구력 생일과 월초 숙 표로 본명숙을 찾습니다. 윤달은 본월의 기점을 사용합니다. 현대 천문 계산 규약을 명시하며, 다른 숙요 계산 방식과 결과가 다를 수 있습니다.</p></div>
        <div><h3>인도 베다 · 달이 머무는 자리</h3><p>Swiss Ephemeris의 Lahiri 항성황경으로 달의 나크샤트라를 계산합니다. 시간이 확인되면 파다·하우스·나밤샤를 더하고, 시간이 없으면 당일 가능한 달 구간과 해석의 한계를 표시합니다.</p></div>
      </div><p className={styles.notice}>두 체계는 서로 다른 기준입니다. 이름이 다르다고 오류나 특별한 운명을 뜻하지 않습니다. 전통적 상징 해석은 미래·관계·건강을 보장하지 않습니다.</p></section>
      <footer className={styles.footer}><p>계산과 해석의 참고 자료: <a href="https://www.astro.com/swisseph/swephprg.htm">Swiss Ephemeris</a> · <a href="https://yakumoin.net/about/unsei_and_lunar_calendar">일본 숙요 월초 숙·윤달 규칙</a> · <a href="https://www.nao.ac.jp/faq/a0304.html">일본 국립천문대의 구력 설명</a></p><Link href="/nakshatra/vvip/">기존 VVIP 통합서</Link> · <Link href="/records/">나의 운세 다시 보기</Link></footer>
    </div>
    {data.map((item,i)=><script key={i} type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(item).replace(/</g,"\\u003c")}} />)}
  </main>;
}

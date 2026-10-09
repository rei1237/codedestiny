import ConsultationHub from './ConsultationHub';
import styles from './consultations.module.css';
export const metadata = { title: '상담 고르기 | 꿀꿀 사주', description: '고민에 맞는 운명 찻집, 팩폭 전략실, 초융합 운세와 마스터 인연의 서를 비교해 보세요.', robots: {index:false, follow:false} };
export default function Page() {
  return <ConsultationHub>
    <section id="report-guide" className={styles.guide} aria-labelledby="report-guide-title">
      <h2 id="report-guide-title">상담을 고르기 전에</h2>
      <p>지금 해결하고 싶은 질문과 결과에서 확인할 내용을 먼저 살펴보세요. 선택한 상담의 시작 화면에서 필요한 정보와 이용 조건을 확인할 수 있어요.</p>
      <details>
        <summary>어떤 결과를 받을 수 있나요?</summary>
        <p>상담에 따라 기질과 반복되는 패턴, 관계의 흐름, 시기별 변화와 행동 조언을 읽을 수 있어요. 결과 형식과 제공 범위는 각 상담의 안내를 기준으로 확인해 주세요. PDF 저장은 해당 기능에서 지원하는 경우에 이용할 수 있어요.</p>
      </details>
      <details>
        <summary>이용권·월정석·단건 결제는 어디서 확인하나요?</summary>
        <p>상담을 선택하면 적용 가능한 이용권과 월정석, 단건 결제 조건을 기존 결제 화면에서 확인할 수 있어요. 서비스별 적용 범위가 다르므로 선택한 상품의 안내를 확인해 주세요.</p>
        <a href="/points/">내 이용권 확인하기</a>
      </details>
      <details>
        <summary>이미 받은 상담은 어디서 다시 보나요?</summary>
        <p>저장된 유료 상담 결과는 새로 생성하지 않고 원본을 다시 열어요. 꿀꿀 사주와 영냥이의 상담 기록은 각각의 보관함에서 확인할 수 있어요.</p>
        <nav aria-label="상담 기록"><a href="/records/">꿀꿀 사주 기록</a><a href="/yeongnyangi/library/">영냥이 상담 기록</a></nav>
      </details>
      <p>결과가 보이지 않거나 입력·결제 내역 확인이 필요하다면 <a href="/contact/">고객센터</a>로 문의해 주세요. 취소·환불 조건은 <a href="/refund-policy/">환불 정책</a>에서 확인할 수 있어요.</p>
    </section>
  </ConsultationHub>;
}

import Business from "./Business";
const title = "기업·개발자용 운세 API · 요금 및 연동 | 꿀꿀운세";
const description =
  "사주 명식부터 타로 카드까지, 필요한 운세만 골라 내 앱과 웹사이트에 연결하세요.";
export const metadata = {
  title,
  description,
  alternates: { canonical: "/business/api/" },
  openGraph: {
    title,
    description,
    url: "/business/api/",
    images: ["/og/presidential-public-records.png"],
  },
};
export default function Page() {
  return (
    <>
      <header className="biz-hero">
        <h1>
          대통령 운세를 적중한 명리학자가 설계한 사주 로직, 이제 우리 서비스에서
        </h1>
        <p>{description}</p>
        <div className="biz-actions">
          <a className="biz-primary" href="#pricing">
            상품별 요금 보기
          </a>
          <a href="#examples">API 응답 예시 보기</a>
        </div>
        <aside>
          <a href="/insights/presidential-saju-public-records/">
            대통령 운세 분석 원문 보기
          </a>
          <p>
            원문에 표시된 공개일과 2025년 사건을 비교했습니다. 연도 언급이
            겹쳐도 실제 사건 방식은 일부 달랐습니다.
          </p>
        </aside>
      </header>
      <Business mode="landing" />
    </>
  );
}

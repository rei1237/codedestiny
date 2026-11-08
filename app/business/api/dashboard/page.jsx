import Business from "../Business";
export const metadata = {
  title: "내 API 관리 | 꿀꿀운세",
  description: "구매한 운세 API의 이용 기간과 호출량을 확인하고, 서버 키를 발급하거나 교체할 수 있습니다. 결제 확인과 상품 연장도 이곳에서 진행하세요.",
  robots: { index: false, follow: false },
};
export default function Dashboard() {
  return (
    <>
      <h1>내 API 관리</h1>
      <Business mode="dashboard" />
    </>
  );
}

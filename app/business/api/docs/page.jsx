import Business from "../Business";
const title = "운세 API v1 개발 문서 | 꿀꿀운세";
const description =
  "기업용 운세 API v1의 상품별 필수 입력값과 실제 엔진의 응답 JSON을 확인하세요. 서버 키로 실행하는 cURL 예시, 분당 호출 제한과 오류 처리 방법을 안내합니다.";
export const metadata = {
  title,
  description,
  alternates: { canonical: "/business/api/docs/" },
  openGraph: {
    title,
    description,
    url: "/business/api/docs/",
    images: ["/og/code-destiny-og-vvip.png"],
  },
};
export default function Docs() {
  return (
    <>
      <h1>운세 API 개발 문서</h1>
      <Business mode="docs" />
    </>
  );
}

import Business from "../Business";
const title = "운세 API v1 개발 문서 | 꿀꿀운세";
const description =
  "상품별 입력값, 응답 JSON, 호출 제한과 서버에서 실행하는 첫 cURL 요청을 확인하세요.";
export const metadata = {
  title,
  description,
  alternates: { canonical: "/business/api/docs/" },
  openGraph: {
    title,
    description,
    url: "/business/api/docs/",
    images: ["/og/presidential-public-records.png"],
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

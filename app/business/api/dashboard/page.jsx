import Business from "../Business";
export const metadata = {
  title: "내 API 관리 | 꿀꿀운세",
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

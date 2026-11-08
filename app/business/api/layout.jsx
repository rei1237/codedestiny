import "./business.css";
export default function BusinessLayout({ children }) {
  return (
    <main className="business-api">
      <div className="biz-wrap">
        <nav aria-label="기업 API">
          <a href="/">꿀꿀운세</a>
          <a href="/business/api/">상품·요금</a>
          <a href="/business/api/docs/">개발 문서</a>
          <a href="/business/api/dashboard/">내 API 관리</a>
        </nav>
        {children}
      </div>
    </main>
  );
}

type Props={onCatalog:()=>void;onLibrary:()=>void;onSettings:()=>void;onExample:()=>void};
const Arrow=()=> <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>;
export default function MoonlightNavigation({onCatalog,onLibrary,onSettings,onExample}:Props){
  return <nav className="moonlight-navigation" aria-label="상담과 기록 바로가기">
    <div className="moonlight-divider" aria-hidden="true"><span/></div>
    <button className="moonlight-action moonlight-action-primary" onClick={onCatalog}>
      <span className="moonlight-seal" aria-hidden="true"/>
      <span className="moonlight-action-copy"><strong>전체 상담 살펴보기</strong><small>내 질문에 맞는 이야기를 찾아요</small></span><Arrow/>
    </button>
    <div className="moonlight-navigation-pair">
      <button className="moonlight-action" onClick={onLibrary}><span className="moonlight-action-copy"><strong>기록 보관함</strong><small>나의 이야기 다시 읽기</small></span><Arrow/></button>
      <button className="moonlight-action" onClick={onSettings}><span className="moonlight-action-copy"><strong>내 정보</strong><small>설정과 이용 안내</small></span><Arrow/></button>
    </div>
    <button className="moonlight-example" onClick={onExample}>결과 예시 먼저 살펴보기 <Arrow/></button>
  </nav>;
}

(function (window, document) {
  "use strict";

  // 🔴 운명의 문 진입점은 마크업에 그대로 렌더된다. 예전에는 홈 인라인 위젯이 준비됐다는
  //    cd:guardian-ready 를 받아야 hidden 이 풀렸는데, 그 위젯의 플래그가 꺼져 있으면 두 유료
  //    상담으로 가는 길이 화면에서 통째로 사라졌다. 위젯과 그것을 감싸던 다이얼로그는 제거됐고,
  //    두 카드는 실제 <a> 링크라 이 파일이 손댈 것이 없다.
  //
  //    남은 일은 하나뿐이다: 옛 앵커로 들어온 링크를 정본 화면으로 넘기는 것.
  //    /fusion-fortune 결과 화면이 아직 이 앵커를 쓴다.
  function boot() {
    function openFromHash() {
      if (window.location.hash === "#guardian-fortune") window.location.replace("/fortune-chat");
    }
    window.addEventListener("hashchange", openFromHash);
    openFromHash();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window, document);

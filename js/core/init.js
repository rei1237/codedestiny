import { bindGlobalActions } from './uiBindings.js?v=20260627-astrology-ai';

// 🔴 applyProgressiveContainment 는 셸의 크리티컬 CSS 로 옮겼다(2026-08-14).
//    같은 선택자·같은 'auto 360px' 값이 index.html 의 cd-main-shell-critical 블록에 있다.
//    여기서 하면 module 그래프 → DOMContentLoaded → rAF 뒤라 **부팅 구간 내내 containment 가
//    걸려 있지 않았고**, 그 구간의 스타일 재계산이 전부 문서 전체를 대상으로 돌았다.
//    (실측: Style & Layout 이 모바일 메인스레드의 59%, Script Evaluation 은 10%)
//    CSS 는 첫 스타일 해석부터 적용되므로 여기서 다시 인라인으로 덧칠하지 않는다 —
//    두 군데서 같은 일을 하면 비용만 배가된다(CLAUDE.md 원칙 6).

export function initAppShell() {
  // Preserve existing scroll behavior on mobile Safari by disabling auto restoration.
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  bindGlobalActions(document);
}

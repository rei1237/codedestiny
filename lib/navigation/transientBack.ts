/**
 * React 트리 밖에서 DOM 에 직접 붙이는 임시 표면(결제 선택창 등)을 뒤로가기에 잇는 다리.
 * NavigationProvider 가 호스트를 설치하고, 표면은 열 때 openTransientBackSurface 로 등록한다.
 * 호스트가 없으면(Provider 밖) 아무 일도 하지 않는다 — 표면은 지금처럼 버튼으로만 닫힌다.
 */
export type TransientBackSurface = {
  /** 뒤로가기 한 번. 단계만 돌아가 표면이 아직 열려 있으면 true. */
  onBack: () => boolean;
  /** true 면 이번 뒤로가기를 소비만 하고 아무 것도 하지 않는다(선택 뒤 처리 중 등). */
  isLocked?: () => boolean;
  /** 라우트가 바뀌었는데 아직 열려 있으면 닫는다. */
  dismiss: () => void;
};

/** 표면이 어떤 경로로든 닫히면 반드시 부른다. */
export type ReleaseTransientBackSurface = () => void;

type TransientBackHost = (surface: TransientBackSurface) => ReleaseTransientBackSurface;

let host: TransientBackHost | null = null;

export function installTransientBackHost(next: TransientBackHost) {
  host = next;
  return () => {
    if (host === next) host = null;
  };
}

export function openTransientBackSurface(surface: TransientBackSurface): ReleaseTransientBackSurface {
  return host ? host(surface) : () => {};
}

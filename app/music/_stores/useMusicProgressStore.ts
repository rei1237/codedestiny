import { create } from "zustand";

// 재생 진행률(currentTime/duration)은 250ms 마다 바뀐다. 이 값을 React state 로 두면
// 페이지 트리 전체가 초당 4번 리렌더된다. 진행률 바·미니 진행 바만 이 store 를 구독한다.
type MusicProgressState = {
  currentTime: number;
  duration: number;
  setProgress: (currentTime: number, duration: number) => void;
};

export const useMusicProgressStore = create<MusicProgressState>((set) => ({
  currentTime: 0,
  duration: 0,
  setProgress: (currentTime, duration) => {
    set((state) => (
      state.currentTime === currentTime && state.duration === duration
        ? state
        : { currentTime, duration }
    ));
  },
}));

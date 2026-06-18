import { create } from "zustand";

type MusicPlaybackState = {
  currentTrackId: string;
  isPlaying: boolean;
  setPlaybackState: (currentTrackId: string, isPlaying: boolean) => void;
};

export const useMusicPlaybackStore = create<MusicPlaybackState>((set) => ({
  currentTrackId: "",
  isPlaying: false,
  setPlaybackState: (currentTrackId, isPlaying) => {
    set((state) => (
      state.currentTrackId === currentTrackId && state.isPlaying === isPlaying
        ? state
        : { currentTrackId, isPlaying }
    ));
  },
}));

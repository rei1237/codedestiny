/** The most recently started soundtrack owns playback in this document. */
let current: HTMLAudioElement | undefined;

export function registerSoundtrack(audio: HTMLAudioElement, onReplaced: () => void) {
  function claim() {
    if (current && current !== audio && !current.paused) {
      current.pause();
      current.dispatchEvent(new Event("cd-soundtrack-replaced"));
    }
    current = audio;
  }
  audio.addEventListener("playing", claim);
  audio.addEventListener("cd-soundtrack-replaced", onReplaced);
  return () => {
    audio.removeEventListener("playing", claim);
    audio.removeEventListener("cd-soundtrack-replaced", onReplaced);
    if (current === audio) current = undefined;
  };
}

export function hasPlayingSoundtrack() {
  return Boolean(current && !current.paused);
}

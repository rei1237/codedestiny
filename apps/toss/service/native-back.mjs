// A mounted service can consume the native event before the shell navigates.
export function dispatchServiceBack(target = window) {
  if (!target.dispatchEvent(new target.Event('code-destiny:toss-overlay-back', { cancelable: true }))) return true;
  return !target.dispatchEvent(new target.Event('code-destiny:toss-back', { cancelable: true }));
}

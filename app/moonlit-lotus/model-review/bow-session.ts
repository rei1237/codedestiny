import { BOW_CLIP } from './sprite-clips';
export const BOW_FRAMES = BOW_CLIP.map(item => item.frame);
export const FRAME_MS = BOW_CLIP.map(item => item.ms);
export const CYCLE_MS = FRAME_MS.reduce((sum, value) => sum + value, 0);
export type Session = {
  sessionId: string; status: 'ready' | 'running' | 'paused' | 'complete' | 'stopped';
  target: number; completed: number; cycleIndex: number; elapsed: number; speed: number; pendingSpeed: number;
};
export function newSession(id: string, target = 108): Session {
  return { sessionId: id, status: 'ready', target: [9, 27, 108].includes(target) ? target : 108, completed: 0, cycleIndex: 0, elapsed: 0, speed: 1, pendingSpeed: 1 };
}
export function finishCycle(state: Session, id: string, index: number): Session {
  if (state.status !== 'running' || id !== state.sessionId || index !== state.cycleIndex || state.elapsed < CYCLE_MS) return state;
  const completed = state.completed + 1;
  return { ...state, completed, cycleIndex: index + 1, elapsed: 0, speed: state.pendingSpeed, status: completed === state.target ? 'complete' : 'running' };
}
export function advance(state: Session, deltaMs: number): Session {
  if (state.status !== 'running' || !Number.isFinite(deltaMs) || deltaMs <= 0 || deltaMs > 250) return state;
  const next = { ...state, elapsed: Math.min(CYCLE_MS, state.elapsed + deltaMs * state.speed) };
  return finishCycle(next, state.sessionId, state.cycleIndex);
}
export function poseAt(elapsed: number) {
  let end = 0;
  const index = FRAME_MS.findIndex(duration => { end += duration; return elapsed < end; });
  const step = index < 0 ? BOW_FRAMES.length - 1 : index;
  const {sheet,frame,phase}=BOW_CLIP[step];
  return { sheet,frame,step,phase };
}
export function restoreSession(raw: string | null): Session | null {
  try {
    const saved = JSON.parse(raw || 'null');
    if (!saved || saved.version !== 1 || typeof saved.sessionId !== 'string' || !saved.sessionId || ![9, 27, 108].includes(saved.target) || !Number.isInteger(saved.completed) || saved.completed < 0 || saved.completed > saved.target || !['ready', 'running', 'paused', 'complete', 'stopped'].includes(saved.status)) return null;
    return { ...newSession(saved.sessionId, saved.target), completed: saved.completed, cycleIndex: saved.completed, status: saved.completed === saved.target ? 'complete' : saved.status === 'stopped' ? 'stopped' : saved.status === 'ready' ? 'ready' : 'paused' };
  } catch { return null; }
}
export function serializeSession(state: Session): string {
  return JSON.stringify({ version: 1, sessionId: state.sessionId, target: state.target, completed: state.completed, status: state.status });
}

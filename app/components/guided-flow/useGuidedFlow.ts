'use client';

// 공통 스텝 플로우 훅: 순수 컨트롤러(lib/guided-flow/step-controller.mjs)에 브라우저 경계를 붙인다.
// - ?step= ↔ history.state 동기화(명세 §2-3): 단계 진입은 push, 일시 단계는 replace/none.
// - 새로고침 복원: URL 의 단계 + sessionStorage 스냅숏. 결과면 로딩 없이 결과.
// - 측정: guided_step_view·guided_step_complete·guided_flow_complete·guided_flow_abandon.
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  LANDING,
  createStepController,
  historyStateFor,
  parseSnapshot,
  readHistoryState,
  serializeSnapshot,
  snapshotKey,
  stepFromSearch,
  urlWithStep,
} from '@/lib/guided-flow/step-controller.mjs';
import { usePrefersReducedMotion } from '@/app/hooks/usePrefersReducedMotion';
import {
  type GuidedFlowContext,
  trackGuidedFlowAbandon,
  trackGuidedFlowComplete,
  trackGuidedStepComplete,
  trackGuidedStepView,
} from './guided-flow-analytics';

export type GuidedStepKind = 'choice' | 'input' | 'wait' | 'result';

export type GuidedStep = {
  id: string;
  kind: GuidedStepKind;
  history?: 'push' | 'replace' | 'none';
  transient?: boolean;
  restoreTo?: string;
  autoAdvance?: boolean;
  awaitWork?: boolean;
  required?: boolean;
};

export type GuidedFlowOptions = GuidedFlowContext & { steps: GuidedStep[] };

type Controller = ReturnType<typeof createStepController>;

function readStorage(key: string): string | null {
  try { return window.sessionStorage.getItem(key); } catch { return null; }
}
function writeStorage(key: string, value: string) {
  try { window.sessionStorage.setItem(key, value); } catch { /* 저장 불가 환경: 복원만 포기 */ }
}

export function useGuidedFlow({ steps, featureId, surface, flowId }: GuidedFlowOptions) {
  const [controller] = useState<Controller>(() => createStepController({ steps }));
  const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState);
  const reducedMotion = usePrefersReducedMotion();
  const position = useRef(0);
  const restored = useRef(false);
  const abandonSent = useRef(false);
  const context = useRef<GuidedFlowContext>({ featureId, surface, flowId });
  context.current = { featureId, surface, flowId };

  useEffect(() => { controller.setReducedMotion(reducedMotion); }, [controller, reducedMotion]);

  // 측정 + 정방향 단계 진입의 history 기록.
  useEffect(() => controller.on((event: { type: string; step: GuidedStep; index: number; restored?: boolean; advance?: string; source?: string }) => {
    const ctx = context.current;
    if (event.type === 'stepComplete') trackGuidedStepComplete(ctx, event.step, event.index, event.advance || 'cta');
    if (event.type === 'flowComplete') trackGuidedFlowComplete(ctx, event.step, event.index, Boolean(event.restored));
    if (event.type !== 'stepView') return;
    trackGuidedStepView(ctx, event.step, event.index, Boolean(event.restored));
    const forward = controller.getState().direction === 'forward';
    if (!forward || (event.source !== 'user' && event.source !== 'auto')) return;
    const mode = event.step.history || 'push';
    if (mode === 'none') return;
    const url = urlWithStep(window.location.href, event.step.id);
    if (mode === 'push') {
      position.current += 1;
      window.history.pushState(historyStateFor(ctx.flowId, event.step.id, position.current), '', url);
    } else {
      window.history.replaceState(historyStateFor(ctx.flowId, event.step.id, position.current), '', url);
    }
  }), [controller]);

  // 첫 진입·새로고침 복원 (StrictMode 이중 실행에도 한 번만).
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const urlStep = stepFromSearch(window.location.search);
    const saved = parseSnapshot(readStorage(snapshotKey(flowId)), steps);
    const own = readHistoryState(window.history.state, flowId);
    position.current = own ? own.position : 0;
    const index = controller.restore({ stepId: urlStep, answers: saved ? saved.answers : {} });
    const stepId = index >= 0 ? steps[index].id : null;
    window.history.replaceState(historyStateFor(flowId, stepId, position.current), '', urlWithStep(window.location.href, stepId));
  }, [controller, flowId, steps]);

  // 브라우저 뒤로/앞으로.
  useEffect(() => {
    const onPop = (event: PopStateEvent) => {
      const own = readHistoryState(event.state, flowId);
      position.current = own ? own.position : 0;
      const wanted = own ? own.step : stepFromSearch(window.location.search);
      controller.goTo(wanted, { source: 'history' });
      const now = controller.getState().index;
      const actual = now >= 0 ? steps[now].id : null;
      if (actual !== wanted) {
        window.history.replaceState(historyStateFor(flowId, actual, position.current), '', urlWithStep(window.location.href, actual));
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [controller, flowId, steps]);

  // 새로고침 복원용 스냅숏.
  useEffect(() => controller.subscribe((next: typeof state) => {
    writeStorage(snapshotKey(flowId), serializeSnapshot(next, steps));
  }), [controller, flowId, steps]);

  // 결과 전 이탈: pagehide 1회.
  useEffect(() => {
    const onHide = () => {
      const now = controller.getState();
      if (abandonSent.current || now.completed || now.index < 0) return;
      abandonSent.current = true;
      trackGuidedFlowAbandon(context.current, steps[now.index], now.index);
    };
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [controller, steps]);

  useEffect(() => () => { controller.cancelAutoAdvance(); }, [controller]);

  /** 앱 안의 '이전': 우리가 쌓은 history 가 있으면 브라우저 뒤로와 같게, 없으면 제자리 교체. */
  const goBack = useCallback(() => {
    if (position.current > 0) { window.history.back(); return; }
    if (!controller.back()) return;
    const now = controller.getState().index;
    const stepId = now >= 0 ? steps[now].id : null;
    window.history.replaceState(historyStateFor(flowId, stepId, 0), '', urlWithStep(window.location.href, stepId));
  }, [controller, flowId, steps]);

  const start = useCallback(() => controller.next('cta'), [controller]);

  return {
    controller,
    state,
    step: state.index >= 0 ? steps[state.index] : null,
    isLanding: state.index === LANDING,
    start,
    goBack,
  };
}

export type GuidedFlow = ReturnType<typeof useGuidedFlow>;

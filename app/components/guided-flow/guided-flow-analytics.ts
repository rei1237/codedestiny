// 공통 스텝 플로우 측정 이벤트 (명세 docs/context/guided-step-flow-spec.md §7).
// 이벤트 이름은 verify-analytics-events 가 리터럴로 찾으므로 래퍼 인자로 넘기지 않고 여기서 직접 쓴다.
// 랜딩 노출은 기존 free_feature_start 가 맡으므로 guided_step_view 를 보내지 않는다.
import { trackEvent } from '@/lib/analytics';

export type GuidedFlowContext = {
  /** 기존 free_feature_start·free_result_view 와 같은 feature_id. */
  featureId: string;
  surface: string;
  flowId: string;
};

type StepRef = { id: string };

function base(context: GuidedFlowContext, step: StepRef, index: number) {
  return {
    feature_id: context.featureId,
    surface: context.surface,
    flow_id: context.flowId,
    step_id: step.id,
    step_index: index + 1,
  };
}

export function trackGuidedStepView(context: GuidedFlowContext, step: StepRef, index: number, restored: boolean) {
  trackEvent('guided_step_view', { ...base(context, step, index), ...(restored ? { restored: true } : {}) });
}

export function trackGuidedStepComplete(context: GuidedFlowContext, step: StepRef, index: number, advance: string) {
  trackEvent('guided_step_complete', { ...base(context, step, index), advance });
}

export function trackGuidedFlowComplete(context: GuidedFlowContext, step: StepRef, index: number, restored: boolean) {
  trackEvent('guided_flow_complete', { ...base(context, step, index), ...(restored ? { restored: true } : {}) });
}

export function trackGuidedFlowAbandon(context: GuidedFlowContext, step: StepRef, index: number) {
  trackEvent('guided_flow_abandon', base(context, step, index));
}

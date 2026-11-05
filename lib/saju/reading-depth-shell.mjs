// 정적 사주 페이지(reading-depth.generated.js) 진입점. 고객에게 보이는 판정만 승인 판정으로 바꾼다.
// G_POWER 자체는 덮지 않는다: 대운·궁합 점수의 입력은 그대로 두고 표시용 사본만 만든다.
// 플래그는 빌드 때 고정된다. 되돌리기는 engine-rollout.js 표의 줄을 지우고 sync:public 후 재배포한다.
import { ENGINE_ROLLOUT_FLAGS } from '../../worker/lib/engine-rollout.js';
import { approvedDisplaySaju } from '../../worker/lib/saju-authority-consumer.js';

// 공개 하위 집합만 내보낸다. 전체 문장(reading-depth.mjs)은 서버 전용이라 이 번들에 넣지 않는다.
export * from './reading-depth-public.mjs';

if (typeof window !== 'undefined') {
  let memo = null;
  window.cdApprovedSajuFacts = () => {
    const power = window.G_POWER, p = window.G_PILLARS;
    if (ENGINE_ROLLOUT_FLAGS.SAJU_GYEOKGUK_AUTHORITY_V2 !== 'true' || !power || !p) return { power, gyeokguk: null };
    const birth = window.G_KASI_CONTEXT || {};
    const unknown = birth.unknownHour === true || birth.timeDefault === true || window.__cdSajuTimeUnknown === true;
    const key = ['y', 'm', 'd', 'h'].map(k => (p[k]?.g || '') + (p[k]?.j || '')).join('|') + (unknown ? '?' : '');
    if (memo?.source !== power || memo.key !== key) memo = { source: power, key, facts: approvedDisplaySaju(power, p, unknown) };
    return memo.facts;
  };
}

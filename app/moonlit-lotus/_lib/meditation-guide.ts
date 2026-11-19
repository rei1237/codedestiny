export type GuideStatus='ready'|'running'|'paused'|'complete'|'stopped';
export type GuideState={status:GuideStatus;elapsed:number};
export const GUIDE_DURATION_MS=150000;
export type GuidePace='standard'|'slow';
export const guideDuration=(pace:GuidePace)=>pace==='slow'?210000:GUIDE_DURATION_MS;
export const GUIDE_CUE_STARTS=[0,20000,40000,65000,90000,115000,135000] as const;
export const GUIDE_CUE_VISIBLE_MS=12000;
export const initialGuide=():GuideState=>({status:'ready',elapsed:0});
export function advanceGuide(state:GuideState,delta:number,pace:GuidePace='standard'):GuideState{
 if(state.status!=='running'||!Number.isFinite(delta)||delta<=0)return state;
 // Sleeping tabs and stalled frames must never silently skip the quiet practice.
 if(delta>2000)return {...state,status:'paused'};
 const duration=guideDuration(pace),elapsed=Math.min(duration,state.elapsed+delta);
 return {elapsed,status:elapsed===duration?'complete':'running'};
}
export function guideCueAt(elapsed:number,pace:GuidePace='standard'){
 const bounded=Math.max(0,Math.round(elapsed)),scale=guideDuration(pace)/GUIDE_DURATION_MS;
 const starts=GUIDE_CUE_STARTS.map(start=>Math.round(start*scale));
 let index=0;
 for(let i=1;i<starts.length;i++)if(starts[i]<=bounded)index=i;
 return {index,quiet:bounded-starts[index]>=Math.round(GUIDE_CUE_VISIBLE_MS*scale)};
}
const YEONI=[
 '여기선 서두르지 않아도 돼요. 눈을 편하게 뜨거나 시선을 낮추고, 발이 바닥에 닿는 곳을 느껴볼까요?',
 '숨을 바꾸려고 애쓰지 않아도 괜찮아요. 코끝이나 배에서 지금의 숨이 느껴지는 곳 하나를 골라요.',
 '손이 무릎이나 의자에 닿는 감촉 하나를 느껴봐요. 편안해지려고 애쓰지 않고, 느껴지는 만큼만 살펴요.',
 '생각이 들었다면 알아차린 걸로 충분해요. 잘못한 게 아니에요. 편한 감각 하나로 천천히 돌아와요.',
 '호흡에 머물기 불편하면 손이 닿는 감촉이나 주변의 소리 하나를 골라도 좋아요.',
 '편안해져야 한다는 숙제는 없어요. 지금 느껴지는 만큼만 알아차리고 잠시 머물러요.',
 '손끝이나 발끝을 살짝 움직여요. 준비되면 화면 밖 풍경을 바라보며 나의 하루로 돌아가요.',
] as const;
const CAT=[
 '서두르지 않아도 된다냥. 눈을 편하게 뜨거나 시선을 낮추고, 발이 바닥에 닿는 곳부터 느껴보자.',
 '숨을 잘 쉬려고 애쓸 필요 없다냥. 코끝이나 배에서 지금 숨이 드나드는 곳 하나만 느껴보자.',
 '손이 무릎이나 의자에 닿는 감촉 하나를 느껴보자. 편안해지려 애쓰지 않아도 돼. 느껴지는 만큼이면 충분하다냥.',
 '생각이 찾아왔구나. 알아차린 걸로 충분하다냥. 잘못한 게 아니니 편한 감각으로 천천히 돌아오자.',
 '호흡이 불편하면 손에 닿는 감촉이나 주변 소리 하나를 골라도 돼. 편한 쪽으로 머물자.',
 '꼭 편안해져야 하는 건 아니야. 지금 느껴지는 만큼만 알아차리고 잠시 쉬어가자.',
 '손끝이나 발끝을 살짝 움직여 보자. 준비되면 화면 밖 풍경을 보고 네 하루로 돌아가면 된다냥.',
] as const;
export function meditationCue(character:string,index:number){return (character==='cat'?CAT:YEONI)[Math.max(0,Math.min(YEONI.length-1,index))];}

// 탭 한 번 = 큰절 한 주기. 기존 bow-session 의 순수 advance/poseAt 만 빌리고 sessions 저장소는 쓰지 않는다.
import {advance,type Session} from '../model-review/bow-session';
import {BOW_TARGET} from './ritual-machine';
/** newSession 은 목표를 9/27/108 로 고정하므로 삼배용 메모리 세션은 직접 만든다. */
export function createRitualBow(id:string,speed=1):Session{
 return {sessionId:'ritual-'+id,status:'ready',target:BOW_TARGET,completed:0,cycleIndex:0,elapsed:0,speed,pendingSpeed:speed};
}
/** 대기 중(ready·paused)일 때만 한 주기를 시작한다. 절하는 도중의 탭은 무시한다. */
export function tapRitualBow(state:Session):Session{
 if((state.status!=='ready'&&state.status!=='paused')||state.completed>=state.target)return state;
 return {...state,status:'running'};
}
/** 한 주기가 끝나 completed 가 늘면 곧바로 멈춰 다음 탭을 기다린다. */
export function stepRitualBow(state:Session,deltaMs:number):Session{
 const next=advance(state,deltaMs);
 if(next.completed>state.completed&&next.status==='running')return {...next,status:'paused'};
 return next;
}
export function ritualBowSpeed(state:Session,speed:number):Session{
 return {...state,speed:state.status==='running'?state.speed:speed,pendingSpeed:speed};
}

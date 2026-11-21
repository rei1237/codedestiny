// 참배 장면의 canvas 한 장: 반딧불과 탭 물결. rAF 루프는 하나뿐이고, 숨김 탭·화면 밖·움직임 줄이기에서는 돌지 않는다.
// 레이아웃은 읽지 않는다(크기는 ResizeObserver 가 넘겨 주고, 루프 안에서는 canvas 에 그리기만 한다).
export type FxTier='high'|'low';
export const FIREFLY_MAX=40;
export const FIREFLY_LOW=12;
export const RIPPLE_MS=900;
export type Firefly={x:number;y:number;vx:number;vy:number;phase:number;size:number};
export type Ripple={x:number;y:number;born:number};
type Nav={deviceMemory?:number;hardwareConcurrency?:number};
export function detectTier(nav:Nav):FxTier{
 const memory=Number(nav.deviceMemory)||8,cores=Number(nav.hardwareConcurrency)||8;
 return memory<=4||cores<=4?'low':'high';
}
export function fireflyCount(tier:FxTier){return tier==='low'?FIREFLY_LOW:FIREFLY_MAX;}
/** 처음 2초 동안 프레임 간격을 모은다. 한 프레임 이상 빠진 간격(>34ms)이 1/4 을 넘거나 평균이 45fps 아래면 low. */
export const PROBE_MS=2000;
export const DROP_GAP_MS=34;
export function judgeFrames(gaps:number[]):FxTier{
 if(gaps.length<8)return 'high';
 const dropped=gaps.filter(gap=>gap>DROP_GAP_MS).length,mean=gaps.reduce((sum,gap)=>sum+gap,0)/gaps.length;
 return dropped/gaps.length>.25||mean>1000/45?'low':'high';
}
/** 좌표는 0..1 정규화. 아래쪽 2/3 에 주로 모인다. */
export function seedFireflies(count:number,random:()=>number):Firefly[]{
 return Array.from({length:Math.min(FIREFLY_MAX,Math.max(0,count))},()=>({
  x:random(),y:.3+random()*.7,vx:(random()-.5)*.00002,vy:-(.000006+random()*.000014),phase:random()*Math.PI*2,size:.6+random()*.8,
 }));
}
/** 제자리에서 바꾼다(프레임마다 배열을 새로 만들지 않는다). 위로 빠지면 아래에서 다시 나온다. */
export function stepFireflies(list:Firefly[],dt:number,random:()=>number){
 const d=Math.min(64,Math.max(0,dt));
 for(const f of list){
  f.phase+=d*.002;
  f.x+=f.vx*d+Math.sin(f.phase)*.00004*d;f.y+=f.vy*d;
  if(f.x<-.05)f.x=1.05;else if(f.x>1.05)f.x=-.05;
  if(f.y<.05){f.y=1.02;f.x=random();}
 }
 return list;
}
export function liveRipples(list:Ripple[],now:number){return list.filter(r=>now-r.born<RIPPLE_MS);}
export function fxShouldRun(s:{hidden:boolean;visible:boolean;reduced:boolean;sized:boolean}){return !s.hidden&&s.visible&&!s.reduced&&s.sized;}
export type SceneFx={tier():FxTier;setHidden(v:boolean):void;setVisible(v:boolean):void;setReduced(v:boolean):void;resize(width:number,height:number,ratio:number):void;ripple(x:number,y:number):void;running():boolean;frames():number;dispose():void};
export function createSceneFx(canvas:HTMLCanvasElement,{tier:startTier,color,onTier,random=Math.random,raf=requestAnimationFrame,caf=cancelAnimationFrame,clock=()=>performance.now()}:{tier:FxTier;color:string;onTier?:(tier:FxTier)=>void;random?:()=>number;raf?:(cb:FrameRequestCallback)=>number;caf?:(id:number)=>void;clock?:()=>number}):SceneFx{
 const context=canvas.getContext('2d');
 let tier=startTier;
 const flies=seedFireflies(fireflyCount(tier),random);
 let ripples:Ripple[]=[],width=0,height=0,ratio=1,frame=0,last=0,count=0,disposed=false;
 // 저사양 판정: 이미 low 면 재지 않는다. 숨김·정지로 끊긴 간격은 last=0 으로 버려 오판하지 않는다.
 let probed=tier==='low'?PROBE_MS:0;const gaps:number[]=[];
 const fit=()=>{ratio=Math.min(tier==='low'?1:2,Math.max(1,ratio));canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);};
 const degrade=()=>{tier='low';flies.length=Math.min(flies.length,FIREFLY_LOW);if(width&&height)fit();onTier?.(tier);};
 const state={hidden:false,visible:true,reduced:false,sized:false};
 const mark=(on:boolean)=>{const value=on?'true':'false';if(canvas.dataset.running!==value)canvas.dataset.running=value;};
 const draw=(now:number)=>{
  if(!context)return;
  context.setTransform(ratio,0,0,ratio,0,0);
  context.clearRect(0,0,width,height);
  context.fillStyle=color;context.strokeStyle=color;
  for(const f of flies){
   const glow=.35+.35*Math.sin(f.phase*1.7),x=f.x*width,y=f.y*height,r=f.size*2.2;
   context.globalAlpha=glow*.28;context.beginPath();context.arc(x,y,r*3,0,Math.PI*2);context.fill();
   context.globalAlpha=glow;context.beginPath();context.arc(x,y,r,0,Math.PI*2);context.fill();
  }
  ripples=liveRipples(ripples,now);
  context.lineWidth=1.5;
  for(const ripple of ripples){
   const p=(now-ripple.born)/RIPPLE_MS;
   context.globalAlpha=(1-p)*.6;context.beginPath();context.arc(ripple.x,ripple.y,8+p*46,0,Math.PI*2);context.stroke();
  }
  context.globalAlpha=1;
 };
 const loop=(now:number)=>{
  frame=0;
  if(disposed||!fxShouldRun(state)){mark(false);return;}
  if(last&&probed<PROBE_MS){const gap=now-last;gaps.push(gap);probed+=gap;if(probed>=PROBE_MS&&judgeFrames(gaps)==='low')degrade();}
  stepFireflies(flies,last?now-last:16,random);last=now;count++;
  draw(now);
  frame=raf(loop);
 };
 const sync=()=>{
  const run=!disposed&&fxShouldRun(state);
  if(run&&!frame){last=0;frame=raf(loop);mark(true);}
  else if(!run&&frame){caf(frame);frame=0;mark(false);if(context){context.setTransform(1,0,0,1,0,0);context.clearRect(0,0,canvas.width,canvas.height);}}
  else mark(run);
 };
 return {
  setHidden(v){state.hidden=v;sync();},
  setVisible(v){state.visible=v;sync();},
  setReduced(v){state.reduced=v;sync();},
  resize(w,h,r){
   width=Math.max(0,w);height=Math.max(0,h);ratio=Math.max(1,r||1);fit();
   state.sized=width>0&&height>0;sync();
  },
  ripple(x,y){if(!state.reduced)ripples.push({x,y,born:clock()});},
  tier:()=>tier,
  running:()=>frame!==0,
  frames:()=>count,
  dispose(){disposed=true;if(frame)caf(frame);frame=0;mark(false);},
 };
}

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
export type SceneFx={setHidden(v:boolean):void;setVisible(v:boolean):void;setReduced(v:boolean):void;resize(width:number,height:number,ratio:number):void;ripple(x:number,y:number):void;running():boolean;frames():number;dispose():void};
export function createSceneFx(canvas:HTMLCanvasElement,{tier,color,random=Math.random,raf=requestAnimationFrame,caf=cancelAnimationFrame,clock=()=>performance.now()}:{tier:FxTier;color:string;random?:()=>number;raf?:(cb:FrameRequestCallback)=>number;caf?:(id:number)=>void;clock?:()=>number}):SceneFx{
 const context=canvas.getContext('2d');
 const flies=seedFireflies(fireflyCount(tier),random);
 let ripples:Ripple[]=[],width=0,height=0,ratio=1,frame=0,last=0,count=0,disposed=false;
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
   width=Math.max(0,w);height=Math.max(0,h);ratio=Math.min(tier==='low'?1:2,Math.max(1,r||1));
   canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
   state.sized=width>0&&height>0;sync();
  },
  ripple(x,y){if(!state.reduced)ripples.push({x,y,born:clock()});},
  running:()=>frame!==0,
  frames:()=>count,
  dispose(){disposed=true;if(frame)caf(frame);frame=0;mark(false);},
 };
}

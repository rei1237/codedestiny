// Coordinates and sizes use canvas width, so rotation is independent of aspect ratio.
export type PhotoPoint = {x:number;y:number};
export type PhotoTransform = PhotoPoint & {size:number;rotation:number};
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
export function constrainTransform(t:PhotoTransform,aspect:number):PhotoTransform {
 return {...t,x:clamp(t.x,0,1),y:clamp(t.y,0,aspect),size:clamp(t.size,.04,.8),rotation:((t.rotation+180)%360+360)%360-180};
}
export function transformGesture(initial:PhotoTransform,start:PhotoPoint[],now:PhotoPoint[],aspect:number):PhotoTransform {
 if(!start.length||start.length!==now.length)return initial;
 if(start.length===1)return constrainTransform({...initial,x:initial.x+now[0].x-start[0].x,y:initial.y+now[0].y-start[0].y},aspect);
 const middle=(p:PhotoPoint[])=>({x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2});
 const a=middle(start),b=middle(now),distance=(p:PhotoPoint[])=>Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y);
 const scale=distance(start)>.005?distance(now)/distance(start):1;
 const angle=(p:PhotoPoint[])=>Math.atan2(p[1].y-p[0].y,p[1].x-p[0].x);
 const turn=angle(now)-angle(start),s=clamp(initial.size*scale,.04,.8)/initial.size;
 const dx=initial.x-a.x,dy=initial.y-a.y;
 return constrainTransform({...initial,x:b.x+s*(dx*Math.cos(turn)-dy*Math.sin(turn)),y:b.y+s*(dx*Math.sin(turn)+dy*Math.cos(turn)),size:initial.size*s,rotation:initial.rotation+turn*180/Math.PI},aspect);
}
export function hitTransform(p:PhotoPoint,t:PhotoTransform,width=t.size,height=t.size,padding=0):boolean {
 const angle=-t.rotation*Math.PI/180,dx=p.x-t.x,dy=p.y-t.y;
 return Math.abs(dx*Math.cos(angle)-dy*Math.sin(angle))<=width/2+padding&&Math.abs(dx*Math.sin(angle)+dy*Math.cos(angle))<=height/2+padding;
}

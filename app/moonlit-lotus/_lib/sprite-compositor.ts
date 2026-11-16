/** One decoded drawing per paint. Presentation never owns session time or completion. */
export function createSpriteCompositor(canvas: HTMLCanvasElement, size = 384) {
 const context = canvas.getContext('2d');
 if (!context) throw new Error('Sprite canvas unavailable');
 canvas.width = canvas.height = size;
 type Drawing = {image:HTMLImageElement;frame:number;columns:number;rows:number};
 let displayed:Drawing|null=null, latest:Drawing|null=null, disposed=false;
 const paint=()=>{
  if(disposed||!latest)return;
  const {image,frame,columns,rows}=latest;
  if(displayed?.image===image&&displayed.frame===frame&&displayed.columns===columns&&displayed.rows===rows)return;
  const width=image.naturalWidth/columns,height=image.naturalHeight/rows;
  // clear + draw run in one task. The browser never presents the cleared surface.
  // Blending distinct silhouettes causes ghost edges even with complementary alpha.
  context.clearRect(0,0,size,size);
  context.drawImage(image,frame%columns*width,Math.floor(frame/columns)*height,width,height,0,0,size,size);
  displayed=latest;
 };
 return {
  show(image:HTMLImageElement,frame:number,_immediate=false,columns=4,rows=4){
   if(disposed||!image.naturalWidth||!image.naturalHeight||!Number.isInteger(frame)||frame<0||frame>=columns*rows)return;
   latest={image,frame,columns,rows};paint();
  },
  dispose(){disposed=true;latest=displayed=null;}
 };
}

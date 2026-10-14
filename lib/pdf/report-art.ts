/** Local, text-free editorial artwork. It is never presented as a calculated chart. */
export type ReportArt={dataUrl:string;ratio:number};
export async function loadReportArt(path:string,tile?:number):Promise<ReportArt>{
 const response=await fetch(path,{signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error('PDF 이미지를 준비하지 못했어요. 잠시 후 다시 저장해 주세요.');
 const bitmap=await createImageBitmap(await response.blob());
 try{
  const sw=tile===undefined?bitmap.width:bitmap.width/3,sh=tile===undefined?bitmap.height:bitmap.height/3;
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=440;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('PDF 이미지 조판을 시작하지 못했어요.');
  ctx.fillStyle='#faf8f4';ctx.fillRect(0,0,canvas.width,canvas.height);
  const scale=Math.min(1100/sw,420/sh),w=sw*scale,h=sh*scale;
  ctx.drawImage(bitmap,tile===undefined?0:(tile%3)*sw,tile===undefined?0:Math.floor(tile/3)*sh,sw,sh,(1200-w)/2,(440-h)/2,w,h);
  return {dataUrl:canvas.toDataURL('image/jpeg',0.9),ratio:440/1200};
 }finally{bitmap.close();}
}
export const FUSION_ART_TILES:Record<string,number>={'사주':0,'자미두수':1,'베다점':2,'숙요점':3,'점성술':4,'타로':5,'여섯 체계 통합 리딩':6,'시기와 행동':7,'결론':8};
export async function loadFusionArt(){
 const entries=await Promise.all(Object.entries(FUSION_ART_TILES).map(async([key,tile])=>[key,await loadReportArt('/images/fusion-fortune/premium-chapters-v1.webp',tile)] as const));
 return Object.fromEntries(entries);
}
export async function loadYeongnyangiArt(){
 return Promise.all(['original/hero-800','reading-art/insight','reading-art/balance','reading-art/timeline','reading-art/rest','reading-art/guide'].map(name=>loadReportArt(`/assets/yeongnyangi/${name}.webp`)));
}

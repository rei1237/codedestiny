/** Local, text-free editorial artwork. It is never presented as a calculated chart. */
export type ReportArt={dataUrl:string;ratio:number};
/** width/quality default to the historical 1200px · JPEG 0.92; a report may ask for a lighter print encode. */
export type ReportArtEncode={width?:number;quality?:number};
export async function loadReportArt(path:string,tile?:number,preserveRatio=false,{width=1200,quality=0.92}:ReportArtEncode={}):Promise<ReportArt>{
 const response=await fetch(path,{signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error('PDF 이미지를 준비하지 못했어요. 잠시 후 다시 저장해 주세요.');
 const bitmap=await createImageBitmap(await response.blob());
 try{
  const k=width/1200;
  const sw=tile===undefined?bitmap.width:bitmap.width/3,sh=tile===undefined?bitmap.height:bitmap.height/3;
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=preserveRatio?Math.round(width*sh/sw):Math.round(440*k);
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('PDF 이미지 조판을 시작하지 못했어요.');
  ctx.fillStyle='#faf8f4';ctx.fillRect(0,0,canvas.width,canvas.height);
  const scale=preserveRatio?width/sw:Math.min(1100*k/sw,420*k/sh),w=sw*scale,h=sh*scale;
  ctx.drawImage(bitmap,tile===undefined?0:(tile%3)*sw,tile===undefined?0:Math.floor(tile/3)*sh,sw,sh,(width-w)/2,(canvas.height-h)/2,w,h);
  const dataUrl=canvas.toDataURL('image/jpeg',quality);
  canvas.width=canvas.height=0; // Release the backing store now; iOS Safari caps total canvas memory per page.
  return {dataUrl,ratio:preserveRatio?Math.round(width*sh/sw)/width:Math.round(440*k)/width};
 }finally{bitmap.close();}
}
export const FUSION_ART_TILES:Record<string,number>={'사주':0,'자미두수':1,'베다점':2,'숙요점':3,'점성술':4,'타로':5,'여섯 체계 통합 리딩':6,'시기와 행동':7,'결론':8};
export async function loadFusionArt(){
 const entries=await Promise.all(Object.entries(FUSION_ART_TILES).map(async([key,tile])=>[key,await loadReportArt('/images/fusion-fortune/premium-chapters-v1.webp',tile)] as const));
 return Object.fromEntries(entries);
}
/** ~150 dpi across the 170mm text column (1000px) at JPEG 0.82: visually equal on screen and paper, about half the bytes. */
export const YEONGNYANGI_ART_ENCODE:ReportArtEncode={width:1000,quality:0.82};
export async function loadYeongnyangiArt(){
 return Promise.all(['cover','insight','choices','closing'].map(name=>loadReportArt(`/assets/yeongnyangi/report-art/${name}-print.webp`,undefined,true,YEONGNYANGI_ART_ENCODE)));
}

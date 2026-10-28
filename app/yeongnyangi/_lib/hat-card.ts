import {hatHouses,hatImage,type HatResult} from '@/lib/yeongnyangi/hat-houses';
/** Explicit allowlist: never receives a profile, account, raw chart or birth input. */
export async function saveHatCard(result:HatResult,element:HTMLElement){
 const house=hatHouses.find(h=>h.id===result.houseId)!;
 const picture=new Image();picture.src=hatImage(house.id);await picture.decode();await document.fonts.ready;
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1400;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('이미지 저장을 준비하지 못했어요. 다시 시도해 주세요.');
 const css=getComputedStyle(element),color=(name:string)=>css.getPropertyValue(name).trim();
 ctx.fillStyle=color('--yn-deep');ctx.fillRect(0,0,1080,1400);
 const scale=Math.max(1080/picture.width,650/picture.height);
 ctx.drawImage(picture,(1080-picture.width*scale)/2,(650-picture.height*scale)/2,picture.width*scale,picture.height*scale);
 ctx.fillStyle=color('--yn-gold');ctx.textAlign='center';ctx.font='600 28px sans-serif';ctx.fillText('영냥이의 모자',540,715);
 ctx.font='700 70px serif';ctx.fillText(house.name,540,811);ctx.font='28px sans-serif';ctx.fillText(house.motto,540,873);
 ctx.fillStyle=color('--yn-ivory');ctx.textAlign='left';ctx.font='30px sans-serif';
 let y=949,line='';for(const word of house.admission.split(' ')){const next=line?`${line} ${word}`:word;if(ctx.measureText(next).width>896&&line){ctx.fillText(line,92,y);y+=47;line=word;}else line=next;}if(line)ctx.fillText(line,92,y);
 ctx.fillStyle=color('--yn-muted');ctx.textAlign='center';ctx.font='25px sans-serif';
 ctx.fillText(result.mode==='reference'?`참고 배정 · ${result.usedCount}개 체계 반영`:'여섯 체계를 함께 읽은 배정',540,1270);ctx.fillText('운세의 상징으로 읽는 창작 성향 이야기',540,1318);
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('이미지를 만들지 못했어요. 다시 시도해 주세요.')),'image/png'));
 const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`영냥이의-모자-${house.name}.png`;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}

import React from 'react';
import {File,Share} from '@apps-in-toss/web-framework';
import SortingHat from '@/app/yeongnyangi/_components/SortingHat';
import {hatHouses} from '@/lib/yeongnyangi/hat-houses';
const media={
 async save(blob,fileName){
  if(!File.saveBase64.isSupported())throw new Error('이 토스 버전은 이미지 저장을 지원하지 않아요. 토스를 업데이트해 주세요.');
  const url=await new Promise((resolve,reject)=>{
   const reader=new FileReader();reader.onerror=()=>reject(new Error('이미지를 읽지 못했어요. 다시 시도해 주세요.'));
   reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob);
  });
  if(!url.startsWith('data:image/png;base64,'))throw new Error('저장할 이미지를 확인하지 못했어요.');
  await File.saveBase64({data:url.slice('data:image/png;base64,'.length),mimeType:'image/png',fileName});
 },
 async share(houseId){
  const house=hatHouses.find(item=>item.id===houseId);
  if(!house)throw new Error('기숙사를 확인하지 못했어요.');
  await Share.sendMessage({message:`영냥이의 모자 · ${house.name}\n${house.motto}`});
 },
};
export default function TossSortingHat(){return <SortingHat media={media}/>;}

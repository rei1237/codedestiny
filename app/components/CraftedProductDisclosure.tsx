'use client';
import {useRef,useState} from 'react';
import {craftedProductIds,craftedVariantProductIds} from '@/content/product-details/catalog';
import CraftedProductDetail from './CraftedProductDetail';
import type {ComponentProps} from 'react';
import styles from './crafted-product-disclosure.module.css';

type Detail=ComponentProps<typeof CraftedProductDetail>['detail'];
function AuthoredDisclosure({id,summaryLabel}:{id:string;summaryLabel:string}){
 const [detail,setDetail]=useState<Detail|null>(null);
 const [error,setError]=useState(false);
 const loading=useRef(false);
 return <details className={styles.disclosure} data-crafted-product-disclosure onToggle={async event=>{
  if(!event.currentTarget.open||detail||loading.current)return;
  loading.current=true;setError(false);
  try{
   const response=await fetch('/feature-details/crafted/'+id+'/manifest.json');
   if(!response.ok)throw new Error('DETAIL_UNAVAILABLE');
   setDetail(await response.json());
  }catch{setError(true);}finally{loading.current=false;}
 }}>
  <summary>{summaryLabel}</summary>
  {detail?<CraftedProductDetail detail={detail}/>:<p role="status">{error?'상세 안내를 불러오지 못했어요. 접었다 다시 펼쳐 주세요.':'상세 안내를 준비하고 있어요.'}</p>}
 </details>;
}
export default function CraftedProductDisclosure({featureKey,variant,summaryLabel="이 상담을 글과 그림으로 자세히 보기"}:{featureKey:string;variant?:string;summaryLabel?:string}){
 const id=(variant&&craftedVariantProductIds[featureKey]?.[variant])||craftedProductIds[featureKey];
 return id?<AuthoredDisclosure key={id} id={id} summaryLabel={summaryLabel}/>:null;
}

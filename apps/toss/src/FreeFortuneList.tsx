import {FREE_PROMO_CATALOG,FREE_PROMO_COPY_KO as copy,FREE_PROMO_GROUPS} from '../../../lib/marketing/free-promo.mjs';
import {freeFortuneHref} from './free-fortune-routes.mjs';
import './free-fortune.css';

const posters=import.meta.glob(['../../../public/images/free-list/*-320.webp','../../../public/images/service-introductions/{saju,bias-destiny,animal-destiny,manse,daily-fortune,tarot,ziwei,sukuyo,vedic,astrology,human-design,fortune-prompt-hub}-320.webp'],{query:'?url',import:'default',eager:true}) as Record<string,string>;
export default function FreeFortuneList(){
 return <section className="free-fortune"><h1>무료 운세 전체 목록</h1><p>궁금한 주제를 골라 풀이를 시작하세요.</p>
 {FREE_PROMO_GROUPS.map(group=><details className="world-disclosure" key={group.id}><summary>{copy[group.labelKey as keyof typeof copy]}</summary>
 <ul>{group.items.map(item=>{const target=freeFortuneHref(item),meta=FREE_PROMO_CATALOG[item.id],content=<><img src={posters['../../../public'+meta.image]} alt="" width={80} height={54}/><span><strong>{item.ko}</strong><small>{meta.description}</small>{!target&&<small>토스 연동 준비 중</small>}</span></>;
 return <li key={item.id}>{target?<a data-free-item={item.id} href={target}>{content}</a>:<div data-free-item={item.id} aria-disabled="true">{content}</div>}</li>;})}</ul></details>)}
 <p>{copy.note}</p><a href="/?world=ggulggul">꿀꿀운세로 돌아가기</a></section>;
}

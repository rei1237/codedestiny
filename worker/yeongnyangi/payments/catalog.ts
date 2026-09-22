import { getBillingFeaturePricing } from '../../lib/billing-feature-registry.js';
import {READING_V5_VERSION,readingChapterCount} from '../fortune/reading-policy';
import {DomainId,FishId,PackageId,FortuneError} from '../fortune/shared/contracts';
export const MANIFEST_VERSION=READING_V5_VERSION;
export const packages={
 mackerel:{name:'고등어'},salmon:{name:'연어'},flounder:{name:'광어'},tuna:{name:'참치'},
 assorted:{name:'생선 모둠 세트'},omakase:{name:'생선 오마카세'},
} as const;
export const systemNames:Record<DomainId,string>={saju:'사주',ziwei:'자미두수',sukuyo:'숙요',vedic:'베다점',astrology:'서양 점성술',tarot:'타로'};
export interface Product {id:string;domain:DomainId;fishId:PackageId;packageId:PackageId;fishName:string;priceKRW:number;currency:'KRW';image:string;reactionAsset:string;resultType:string;enabled:boolean;cdFeatureKey:string;readingKind:'single'|'pair'|'all';systems:DomainId[];manifestVersion:string;chapterCount:number;name:string;}
function priceFor(id:string):number { const resolved=getBillingFeaturePricing({featureKey:'yeongnyangi-'+id.replace(/_/g,'-')}); if(!resolved.ok || !resolved.pricing || !(resolved.pricing.amountKRW>0)) throw new FortuneError('PRODUCT_PRICE_UNAVAILABLE',503); return resolved.pricing.amountKRW; }
function product(id:string,systems:DomainId[],fishId:PackageId):Product{return {id,domain:systems[0],fishId,packageId:fishId,fishName:packages[fishId].name,priceKRW:priceFor(id),currency:'KRW',image:`/assets/yeongnyangi/fish/${fishId}.webp`,reactionAsset:`/assets/yeongnyangi/fish/reaction-${fishId}.webp`,resultType:'consultation-v3',enabled:true,cdFeatureKey:`yeongnyangi-${id.replace(/_/g,'-')}`,readingKind:systems.length===1?'single':systems.length===2?'pair':'all',systems,manifestVersion:MANIFEST_VERSION,chapterCount:readingChapterCount(systems[0],fishId),name:systems.map(d=>systemNames[d]).join(' + ')};}
export const products:Product[]=(Object.keys(systemNames) as DomainId[]).flatMap(d=>(['mackerel','salmon','flounder','tuna'] as FishId[]).map(f=>product(`${d}_${f}`,[d],f))).concat([
 product('fusion_saju_ziwei',['saju','ziwei'],'assorted'),product('fusion_sukuyo_vedic',['sukuyo','vedic'],'assorted'),product('fusion_astrology_tarot',['astrology','tarot'],'assorted'),product('fusion_all',['saju','ziwei','sukuyo','vedic','astrology','tarot'],'omakase'),
]);
export function getProduct(id:unknown):Product{const p=products.find(p=>p.id===id);if(!p)throw new FortuneError('PRODUCT_NOT_FOUND',404);return {...p,systems:[...p.systems]};}

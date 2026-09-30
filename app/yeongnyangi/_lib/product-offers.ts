import {isDirectOnlyPaidFeatureKey,isDirectOrFamilyPaidFeatureKey} from '@/worker/lib/paid-feature-registry.js';
import {products} from '@/worker/yeongnyangi/payments/catalog';
import {consultationKinds,consultationManifest} from '@/worker/yeongnyangi/fortune/consultation-kinds';
import {depthDescriptions} from '@/worker/yeongnyangi/fortune/reading-policy';
import type {ProductOffers} from '../_components/ProductGuide';
export const productOffers=Object.fromEntries(['saju','ziwei','sukuyo','vedic','astrology','tarot'].map(domain=>[domain,products.filter(p=>p.domain===domain&&p.readingKind==='single').map(p=>({id:p.id,itemId:p.cdFeatureKey,fish:p.fishId,fishName:p.fishName,price:p.priceKRW,paymentLabel:isDirectOrFamilyPaidFeatureKey(p.cdFeatureKey)?'Family 이용권 또는 단건 결제':isDirectOnlyPaidFeatureKey(p.cdFeatureKey)?'단건 결제':'이용권 적용 여부와 결제 수단은 다음 화면에서 확인해 주세요',chapters:consultationManifest(p,consultationKinds[p.domain][0]).map(ch=>ch.title),depth:depthDescriptions[p.fishId]}))])) as ProductOffers;
export const productArtwork=(domain:string)=>domain==='saju'?'/assets/yeongnyangi/conversion/saju-pattern.webp':`/assets/yeongnyangi/original/${domain}.webp`;

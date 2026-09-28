import {products} from '@/worker/yeongnyangi/payments/catalog';
import {readingManifest} from '@/worker/yeongnyangi/fortune/reading-manifest';
import {depthDescriptions} from '@/worker/yeongnyangi/fortune/reading-policy';
import type {ProductOffers} from '../_components/ProductGuide';
export const productOffers=Object.fromEntries(['saju','ziwei','sukuyo','vedic','astrology','tarot'].map(domain=>[domain,products.filter(p=>p.domain===domain&&p.readingKind==='single').map(p=>({id:p.id,itemId:p.cdFeatureKey,fish:p.fishId,fishName:p.fishName,price:p.priceKRW,chapters:readingManifest(p).map(ch=>ch.title),depth:depthDescriptions[p.fishId]}))])) as ProductOffers;
export const productArtwork=(domain:string)=>domain==='saju'?'/assets/yeongnyangi/conversion/saju-pattern.webp':`/assets/yeongnyangi/original/${domain}.webp`;

import {products} from '../yeongnyangi/payments/catalog.ts';
import {prepareFortune,presentFortune,drawTarotSpread} from '../yeongnyangi/service.ts';
import {ProfileCard} from '../lib/models.js';
import {normalizeIncomingProfile,validateRequiredBirth,toClientProfile} from '../routes/profile.js';
import {APPROVED_TOSS_PRODUCTS,approvedProduct} from './catalog.js';
import {TossError} from './policy.js';
import {libraryPage} from './library.js';
import {requestMatchesPurchase} from './services.js';
import {resolveStoredProduct} from '../yeongnyangi/payments/catalog.ts';
import {isReviewSale} from './review-products.js';

// The original screens keep their response contract. Authentication and payment
// remain owned by /api/toss; this is never dispatched from a web-cookie route.
export function canonicalProducts(approved=APPROVED_TOSS_PRODUCTS) {
  return products.map(product=>{
    const candidates=approved.filter(item=>item.productId===product.id&&(!item.serviceId||item.serviceId==='yeongnyangi'));
    try {
      if(!isReviewSale(product.id)||candidates.length!==1)throw new Error('unavailable sale');
      const sale=approvedProduct(candidates[0].sku,approved);
      return {...product,priceKRW:sale.approvedPriceKRW,available:true};
    } catch { return {...product,available:false}; }
  });
}
export function canonicalSale(productId,approved=APPROVED_TOSS_PRODUCTS) {
  const candidates=approved.filter(row=>row.productId===productId&&(!row.serviceId||row.serviceId==='yeongnyangi'));
  if(candidates.length!==1)throw new TossError('TOSS_PRODUCT_NOT_APPROVED',503);
  const sale=approvedProduct(candidates[0].sku,approved),product=products.find(row=>row.id===productId);
  if(!product||sale.productId!==product.id||sale.serviceId!=='yeongnyangi')throw new TossError('TOSS_PRODUCT_NOT_APPROVED',503);
  return sale;
}
export async function canonicalProfiles(auth,input) {
  if(input!==undefined){
    const raw=input.profile;
    const validation=validateRequiredBirth(raw);
    if(!raw||!validation.ok)throw new TossError('BIRTH_INVALID');
    const profile={...normalizeIncomingProfile(raw,0),birth:validation.birth};
    // Every selector includes the server owner. A body cannot choose an account.
    const saved=await ProfileCard.findOneAndUpdate({userId:auth.ownerId,profileId:profile.profileId},
      {$setOnInsert:{...profile,userId:auth.ownerId}},{upsert:true,new:true,runValidators:true}).lean();
    return {ok:true,profile:toClientProfile(saved)};
  }
  const rows=await ProfileCard.find({userId:auth.ownerId}).sort({createdAt:1}).lean();
  return {ok:true,profiles:rows.map(toClientProfile),currentId:rows[0]?.profileId||''};
}
export async function prepareCanonicalFortune(env,auth,input) {
  // The web reuses a fish tier internally for symbolic readings. A Toss SKU authorizes only its registered consultation.
  if(input.mode||!isReviewSale(input.productId))throw new TossError('TOSS_PRODUCT_NOT_APPROVED',503);
  const sale=canonicalSale(input.productId);
  // Keep the complete original input: scope, voice, locale, selected profiles and
  // tarot spread. Server preparation validates all of it and snapshots the chart.
  const row=await prepareFortune(env,auth.userId,input,{checkoutAmountKRW:sale.approvedPriceKRW});
  if(row.productId!==sale.productId||row.amountKRW!==sale.approvedPriceKRW)throw new TossError('TOSS_PRODUCT_NOT_APPROVED',503);
  return {fortune:presentFortune(row)};
}
export async function drawCanonicalFortune(env,auth,id,input) {
  return {fortune:presentFortune(await drawTarotSpread(env,auth.userId,id,input))};
}

export async function canonicalLibraryPage(rows,read,verify) {
  const snapshots=new Map();
  const page=await libraryPage(rows,async id=>{
    const saved=await read(id),purchase=rows.find(row=>row.requestId===id);
    if(saved&&requestMatchesPurchase(saved,purchase))snapshots.set(id,saved.snapshot);
    return saved;
  },undefined,undefined,verify);
  if(page.purchases.some(row=>row.state==='READ_FAILED'))throw new TossError('RECORDS_UNAVAILABLE',503);
  return {fortunes:page.purchases.filter(row=>row.requestId&&!['REFUNDED','ACCESS_REVIEW'].includes(row.state)).map(row=>({
    id:row.requestId,product:snapshots.get(row.requestId)?.product||resolveStoredProduct(row.productId),
    state:row.state,paid:row.status!=='REFUNDED'&&row.state!=='READ_FAILED',createdAt:row.createdAt,
    locale:snapshots.get(row.requestId)?.locale||'ko',
    completedChapters:row.completedSections,totalChapters:row.totalSections,
    recovering:!['COMPLETED','REFUNDED'].includes(row.state),
    canRetry:!['COMPLETED','REFUNDED','READ_FAILED'].includes(row.state),
  })),nextCursor:page.nextCursor};
}

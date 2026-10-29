import {products} from '../yeongnyangi/payments/catalog.ts';
import {prepareFortune,presentFortune,drawTarotSpread} from '../yeongnyangi/service.ts';
import {ProfileCard} from '../lib/models.js';
import {normalizeIncomingProfile,validateRequiredBirth,toClientProfile} from '../routes/profile.js';
import {APPROVED_TOSS_PRODUCTS,approvedProduct} from './catalog.js';
import {TossError} from './policy.js';
import {libraryPage} from './library.js';
import {requestMatchesService} from './services.js';
import {resolveStoredProduct} from '../yeongnyangi/payments/catalog.ts';

// The original screens keep their response contract. Authentication and payment
// remain owned by /api/toss; this is never dispatched from a web-cookie route.
export function canonicalProducts(approved=APPROVED_TOSS_PRODUCTS) {
  return products.filter(product=>!product.id.startsWith('chat_')).map(product=>({
    ...product,available:approved.some(item=>{
      try { return approvedProduct(item.sku,approved).productId===product.id
        && (!item.serviceId||item.serviceId==='yeongnyangi') && item.approvedPriceKRW===product.priceKRW; }
      catch { return false; }
    }),
  }));
}
export function canonicalSale(productId,approved=APPROVED_TOSS_PRODUCTS) {
  const item=approved.find(row=>row.productId===productId&&(!row.serviceId||row.serviceId==='yeongnyangi'));
  const sale=approvedProduct(item?.sku,approved),product=products.find(row=>row.id===productId);
  if(!product||sale.approvedPriceKRW!==product.priceKRW)throw new TossError('TOSS_PRODUCT_NOT_APPROVED',503);
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
  const sale=canonicalSale(input.productId);
  // Keep the complete original input: scope, voice, locale, selected profiles and
  // tarot spread. Server preparation validates all of it and snapshots the chart.
  const row=await prepareFortune(env,auth.userId,input);
  if(row.productId!==sale.productId||row.amountKRW!==sale.approvedPriceKRW)throw new TossError('TOSS_PRODUCT_NOT_APPROVED',503);
  return {fortune:presentFortune(row)};
}
export async function drawCanonicalFortune(env,auth,id,input) {
  return {fortune:presentFortune(await drawTarotSpread(env,auth.userId,id,input))};
}

export async function canonicalLibraryPage(rows,read) {
  const snapshots=new Map();
  const page=await libraryPage(rows,async id=>{
    const saved=await read(id),purchase=rows.find(row=>row.requestId===id);
    if(saved&&requestMatchesService(saved,purchase))snapshots.set(id,saved.snapshot);
    return saved;
  });
  return {fortunes:page.purchases.filter(row=>row.requestId).map(row=>({
    id:row.requestId,product:snapshots.get(row.requestId)?.product||resolveStoredProduct(row.productId),
    state:row.state,paid:row.status!=='REFUNDED',createdAt:row.createdAt,
    locale:snapshots.get(row.requestId)?.locale||'ko',
    completedChapters:row.completedSections,totalChapters:row.totalSections,
    recovering:!['COMPLETED','REFUNDED'].includes(row.state),
    canRetry:!['COMPLETED','REFUNDED','READ_FAILED'].includes(row.state),
  })),nextCursor:page.nextCursor};
}

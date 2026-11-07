import {getBillingFeaturePricing} from '../lib/billing-feature-registry.js';
import {kstDateString,normalizePetProfile,normalizeRequestDate} from '../lib/pet/pet-input.js';
import {calculateTossPet} from './pet-saju.js';
import {hash} from './crypto.js';
import {TossError} from './policy.js';

const REQUEST_ID=/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
const PRODUCTS=Object.freeze({report:'pet-saju-ai-consultation',compat:'pet-compatibility-ai'});

// Only the server chooses the calculation date. A saved request reuses its
// frozen date so a midnight retry cannot silently create a different reading.
export async function tossPetPaidContract(body,{today=kstDateString(),stored=false}={}){
  if(!body||typeof body!=='object'||Array.isArray(body)||typeof body.requestId!=='string'||!REQUEST_ID.test(body.requestId)||typeof body.kind!=='string'||!Object.hasOwn(PRODUCTS,body.kind))throw new TossError('PET_INPUT_INVALID',400);
  const keys=body.kind==='report'?['requestId','kind','pet']:['requestId','kind','petA','petB'];
  if(stored)keys.push('date');
  if(Object.keys(body).some(key=>!keys.includes(key))||(stored&&typeof body.date!=='string'))throw new TossError('PET_INPUT_INVALID',400);
  let date;
  try{date=normalizeRequestDate(stored?body.date:today);}catch{throw new TossError('PET_INPUT_INVALID',400);}
  if(date!==(stored?body.date:today))throw new TossError('PET_INPUT_INVALID',400);
  const normalize=pet=>{
    calculateTossPet({pet},{today:date});
    try{return normalizePetProfile(pet);}catch{throw new TossError('PET_INPUT_INVALID',400);}
  };
  const input={requestId:body.requestId.toLowerCase(),kind:body.kind,date,
    ...(body.kind==='report'?{pet:normalize(body.pet)}:{petA:normalize(body.petA),petB:normalize(body.petB)})};
  const featureKey=PRODUCTS[input.kind],priced=getBillingFeaturePricing({featureKey});
  if(!priced.ok||priced.pricing.billingType!=='per_use'||!Number.isSafeInteger(priced.pricing.amountKRW)||priced.pricing.amountKRW<=0)throw new TossError('PRICE_NOT_FOUND',503);
  const inputHash=await hash(JSON.stringify(input));
  return {input,contract:{requestId:input.requestId,resultId:'pet_'+await hash(JSON.stringify([input.kind,input.requestId])),featureKey,inputHash,pricing:priced.pricing}};
}

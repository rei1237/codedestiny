import {buildPublicTarotReading} from '../../../lib/tarot/toss-public-readings.mjs';
import {tossTarotLibraryFlow} from '../../../lib/tarot/toss-library-flows.mjs';
import {isFreeFortuneFeatureKey} from '../../../lib/payment/free-fortune-policy.mjs';

// This private-only alias keeps the original free dispatch, without importing
// the production paid generator's database or model dependencies into the AIT.
// Paid private flows have their own explicit synthetic fixture and owner ledger.
export async function generateTarotLibraryResult(flowId,input){
 const flow=tossTarotLibraryFlow(flowId);
 if(!flow?.featureKeys.some(isFreeFortuneFeatureKey))throw Error('TAROT_VERIFIED_ORDER_REQUIRED');
 return buildPublicTarotReading(flowId,input);
}

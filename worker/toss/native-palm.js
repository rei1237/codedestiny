import {createHash, randomUUID} from 'node:crypto';
import {getBillingFeaturePricing} from '../lib/billing-feature-registry.js';
import {findNativePalmSnapshot} from '../lib/palm-result-delivery.js';
import {handlePalmRoutes, readPalmJson} from '../routes/palm.js';
import {TossNativeConsultation} from './models.js';
import {nativeOwnerFilter, prepareNativeConsultation, verifiedIntent} from './native-tea.js';
import {TossError} from './policy.js';

const featureKey = 'palm-reading-general';
const service = 'palm';
const ownerFilter = (auth, id) => ({...nativeOwnerFilter(auth, service), featureKey, _id: id});
const missing = () => new TossError('RESULT_NOT_FOUND', 404);
export async function prepareNativePalm(request, env, auth) {
  const {input, orderId} = await readPalmJson(request);
  const reading = input?.reading;
  if (!['left', 'right', 'both'].includes(reading?.dominantHand) ||
      !['general', 'overall', 'love', 'wealth', 'career', 'personality', 'relationship'].includes(reading?.analysisPurpose) ||
      !/^palm-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(input?.requestId || '') ||
      ![reading?.leftPalmImage, reading?.rightPalmImage].some(image => typeof image === 'string' && /^data:image\/(?:png|jpe?g|webp|gif|bmp|avif|heic|heif);base64,/.test(image)))
    throw new TossError('INVALID_PALM_IMAGE', 400);
  const inputHash = createHash('sha256').update(JSON.stringify(reading)).digest('hex');
  const contract = {requestId: input.requestId, resultId: input.requestId, inputHash, featureKey, pricing: getBillingFeaturePricing({featureKey}).pricing};
  const context = {dominantHand: reading.dominantHand, analysisPurpose: reading.analysisPurpose};
  const intent = await prepareNativeConsultation(env, auth, context, orderId, contract, service, {deferAssignment: true});
  const filter = ownerFilter(auth, intent.id);
  const snapshot = () => findNativePalmSnapshot(env, auth.userId, intent.id);
  if (!await snapshot()) {
    const token = randomUUID();
    // A WebView may retry while the original vision request is still running. Only the lease owner submits photos.
    const lease = await TossNativeConsultation.findOneAndUpdate({...filter,
      $or: [{'input.lease': {$exists: false}}, {'input.lease.until': {$lt: Date.now()}}]},
      {$set: {'input.lease': {token, until: Date.now() + 300_000}}}, {new: true}).lean();
    if (!lease) throw new TossError('PALM_ANALYSIS_IN_PROGRESS', 409);
    try {
      if (!await snapshot()) {
        const result = await handlePalmRoutes(request, env, {auth: {userId: auth.userId}, intentId: intent.id,
          body: {...reading, requestId: 'toss-palm:' + intent.id}});
        if (!result.ok) return result;
        if (!(await result.json()).analysisSaved) throw new TossError('PALM_ANALYSIS_INCOMPLETE', 422);
      }
    } finally {
      await TossNativeConsultation.updateOne({...filter, 'input.lease.token': token}, {$unset: {'input.lease': ''}});
    }
  }
  const result = await snapshot();
  if (!result?.validation?.hasPalm) throw new TossError('PALM_NOT_DETECTED', 422);
  await TossNativeConsultation.updateOne(filter, {$set: {'input.analysisSaved': true}});
  return Response.json(orderId && !intent.paid ? await prepareNativeConsultation(env, auth, context, orderId, contract, service) : intent);
}

export async function readNativePalm(env, auth, id) {
  const intent = await TossNativeConsultation.findOne(ownerFilter(auth, id)).lean();
  await verifiedIntent(env, auth, intent);
  const result = await findNativePalmSnapshot(env, auth.userId, id);
  if (!result) throw missing();
  return {...result, saved: true};
}
export async function palmLibraryItem(env, auth, purchase) {
  if (purchase.nativeService !== service || purchase.featureKey !== featureKey || purchase.identityId !== auth._id ||
      String(purchase.ownerId) !== String(auth.ownerId) || purchase.environment !== auth.environment) throw missing();
  if (purchase.status === 'REFUNDED') throw new TossError('ORDER_REFUNDED', 409);
  if (!purchase.requestId) return {state: 'UNASSIGNED', href: '/palm-reading/?orderId=' + encodeURIComponent(purchase._id)};
  const intent = await TossNativeConsultation.findOne({...ownerFilter(auth, purchase.requestId), orderId: purchase._id}).lean();
  await verifiedIntent(env, auth, intent);
  const saved = await findNativePalmSnapshot(env, auth.userId, intent._id);
  if (!saved) throw missing();
  return {state: 'COMPLETED', resultId: intent._id, question: '내 손금 리포트', href: '/palm-reading/?intentId=' + intent._id};
}

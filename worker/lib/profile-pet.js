import { ProfileCard, User } from './models.js';
import { mongoose, withMongoRetry } from './db.js';
import { scopeConnection } from './db-scope-connection.js';
import { createHttpError } from './http.js';
import { HONEY_SCOPE, honeyCollections, kstDay, withHoneyTransaction } from './honey-wallet.js';
import { profileCharacterPreview } from './profile-character-preview.js';
import { PET_EGGS, PET_CARE_HONEY, PET_AFFECTION_GAIN, petBirthInput, rollPetTraits, petIdentity } from '../../js/core/profile-pet.mjs';

const fail = (status, code, message) => createHttpError(status, message, { code });
const states = () => (scopeConnection() || mongoose.connection).db.collection('profile_pets');
const receipts = () => (scopeConnection() || mongoose.connection).db.collection('profile_pet_actions');
const ledgerId = (uid, day) => `profile-pet-care:${uid}:${day}`;
const randomUnit = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
// User-requested developer mascot. Identity is resolved from the authenticated
// account record, never a browser email, role flag, or request field.
const DEVELOPER_PET_EMAIL = 'seongbae555@gmail.com';
async function exclusivePet(uid, session) {
  let query = User.findById(uid).select('email');
  if (session) query = query.session(session);
  const user = await query.lean();
  return String(user?.email || '').trim().toLowerCase() === DEVELOPER_PET_EMAIL ? 'yeongnyangi' : null;
}

function validateProfileId(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 80) throw fail(400, 'PROFILE_REQUIRED', '프로필을 선택해 주세요.');
  return value.trim();
}
async function ownedProfile(uid, profileId, session) {
  let query = ProfileCard.findOne({ userId: uid, profileId });
  if (session) query = query.session(session);
  const profile = await query.lean();
  if (!profile) throw fail(404, 'PROFILE_NOT_OWNED', '저장된 내 프로필을 선택해 주세요.');
  return profile;
}
function previewFor(profile, now) {
  const [year, month, day] = kstDay(now).split('-').map(Number);
  return profileCharacterPreview(petBirthInput(profile), { year, month, day });
}
function publicPet(state, character, day, exclusiveSpecies) {
  if (!state) return null;
  return {
    ...petIdentity(state.traits, character, exclusiveSpecies), eggType: state.eggType, traits: state.traits,
    affection: state.affection, hatchedAt: state.createdAt,
    fed: state.careDay === day && state.fed === true,
    played: state.careDay === day && state.played === true,
  };
}
async function snapshot(uid, profileId, profile, now, session) {
  const day = kstDay(now), { wallets, ledgers } = honeyCollections();
  const [state, wallet, reward, exclusiveSpecies] = await Promise.all([
    states().findOne({ _id: `${uid}:${profileId}` }, { session }),
    wallets.findOne({ userId: uid, serviceScope: HONEY_SCOPE }, { session }),
    ledgers.findOne({ _id: ledgerId(uid, day) }, { session }),
    exclusivePet(uid, session),
  ]);
  const preview = previewFor(profile, now);
  return { ...preview, day, exclusiveSpecies, pet: publicPet(state, preview.character, day, exclusiveSpecies), balance: Math.max(0, Number(wallet?.balance) || 0),
    careRewardClaimed: Boolean(reward), careHoney: PET_CARE_HONEY, affectionGain: PET_AFFECTION_GAIN };
}
export async function getProfilePet(env, userId, rawProfileId, now = new Date()) {
  const uid = String(userId), profileId = validateProfileId(rawProfileId);
  return withMongoRetry(env, async () => snapshot(uid, profileId, await ownedProfile(uid, profileId), now));
}
export async function hatchProfilePet(env, userId, body, now = new Date()) {
  const uid = String(userId), profileId = validateProfileId(body?.profileId);
  if (!PET_EGGS.some(egg => egg.id === body?.eggType)) throw fail(400, 'INVALID_EGG', '만나고 싶은 알을 골라 주세요.');
  // Mint once outside the retried transaction; an internal retry cannot reroll rarity.
  const traits = rollPetTraits(randomUnit);
  try {
    return await withHoneyTransaction(env, async session => {
      const profile = await ownedProfile(uid, profileId, session);
      previewFor(profile, now);
      await states().updateOne({ _id: `${uid}:${profileId}` }, { $setOnInsert: {
        userId: uid, profileId, eggType: body.eggType, traits, affection: 0,
        careDay: '', fed: false, played: false, createdAt: now, updatedAt: now,
      } }, { upsert: true, session });
      return snapshot(uid, profileId, profile, now, session);
    });
  } catch (error) {
    // Another tab may have inserted the same immutable companion first.
    if (Number(error.code) !== 11000) throw error;
    const result = await getProfilePet(env, uid, profileId, now);
    if (!result.pet) throw error;
    return result;
  }
}
export async function careForProfilePet(env, userId, body, now = new Date()) {
  const uid = String(userId), profileId = validateProfileId(body?.profileId), action = body?.action;
  if (!['feed', 'play'].includes(action)) throw fail(400, 'INVALID_PET_ACTION', '먹이주기 또는 놀아주기를 선택해 주세요.');
  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(String(body?.requestId || ''))) throw fail(400, 'INVALID_REQUEST_ID', '화면을 다시 열고 시도해 주세요.');
  const day = kstDay(now);
  const run = () => withHoneyTransaction(env, async session => {
    const profile = await ownedProfile(uid, profileId, session);
    const receiptKey = `pet-action:${uid}:${body.requestId}`;
    const receipt = await receipts().findOne({ _id: receiptKey }, { session });
    if (receipt) {
      if (receipt.profileId !== profileId || receipt.action !== action) throw fail(409, 'PET_REQUEST_MISMATCH', '요청이 일치하지 않아요. 다시 확인해 주세요.');
      return { ...await snapshot(uid, profileId, profile, now, session), firstCare: false, rewarded: 0, replayed: true };
    }
    const state = await states().findOne({ _id: `${uid}:${profileId}` }, { session });
    if (!state) throw fail(409, 'PET_NOT_HATCHED', '알을 먼저 부화시켜 주세요.');
    const today = state.careDay === day;
    const flag = action === 'feed' ? 'fed' : 'played';
    const firstCare = !(today && state[flag]);
    if (!firstCare) return { ...await snapshot(uid, profileId, profile, now, session), firstCare: false, rewarded: 0 };
    const next = { careDay: day, fed: today && state.fed === true, played: today && state.played === true,
      affection: Math.min(100, state.affection + (firstCare ? PET_AFFECTION_GAIN : 0)), updatedAt: now };
    next[flag] = true;
    await states().updateOne({ _id: state._id }, { $set: next }, { session });
    await receipts().insertOne({ _id: receiptKey, userId: uid, profileId, action, day, createdAt: now }, { session });
    const { wallets, ledgers } = honeyCollections();
    let rewarded = 0;
    if (next.fed && next.played && !await ledgers.findOne({ _id: ledgerId(uid, day) }, { session })) {
      await ledgers.insertOne({ _id: ledgerId(uid, day), userId: uid, profileId, serviceScope: HONEY_SCOPE,
        type: 'reward', reason: 'PROFILE_PET_CARE', amount: PET_CARE_HONEY, day,
        idempotencyKey: ledgerId(uid, day), requestId: body.requestId, createdAt: now }, { session });
      await wallets.updateOne({ userId: uid, serviceScope: HONEY_SCOPE }, {
        $inc: { balance: PET_CARE_HONEY, totalEarned: PET_CARE_HONEY },
        $set: { updatedAt: now }, $setOnInsert: { userId: uid, serviceScope: HONEY_SCOPE, createdAt: now },
      }, { upsert: true, session });
      rewarded = PET_CARE_HONEY;
    }
    return { ...await snapshot(uid, profileId, profile, now, session), firstCare, rewarded };
  });
  try { return await run(); }
  catch (error) {
    // Distinct pets can race for the account/day ledger. The losing transaction
    // rolls back completely, then reapplies its care after the reward exists.
    if (Number(error.code) !== 11000) throw error;
    return run();
  }
}

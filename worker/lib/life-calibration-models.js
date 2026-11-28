import { mongoose } from './db.js';
import { scopedModel } from './db-scope-connection.js';

// 인생 보정 저장소(설계: docs/context/life-calibration.md). forward-add 전용, 마이그레이션 없음.
// userId 는 문자열로 둔다(profile_pets 와 같은 관례). 탈퇴는 컬렉션 이름으로 지운다 — worker/routes/auth.js handleWithdraw.
// 🔴 메모(note)는 평문으로 저장하지 않는다. noteCipher 는 pii-crypto encryptBoundSecret 봉투이며 로그에 남기지 않는다.

const lifeEventSchema = new mongoose.Schema({
  schemaVersion: { type: Number, default: 1 },
  userId: { type: String, required: true },
  profileId: { type: String, required: true, maxlength: 80 },
  year: { type: Number, required: true },
  month: { type: Number, default: null },
  domain: { type: String, default: null },
  outcome: { type: String, required: true },
  intensity: { type: Number, default: 2 },
  certainty: { type: String, default: 'sure' },
  source: { type: String, default: 'volunteered' },
  channel: { type: String, default: 'profile_form' },
  noteCipher: { type: String, default: undefined },
}, { timestamps: true, collection: 'life_events' });
lifeEventSchema.index({ userId: 1, profileId: 1 });
lifeEventSchema.index({ profileId: 1, year: 1 });

// 파생 캐시. _id = `${userId}:${profileId}`. 언제든 지우고 다시 계산할 수 있다(P3 에서 채운다).
const lifeCalibrationSchema = new mongoose.Schema({
  _id: String,
  userId: { type: String, required: true },
  profileId: { type: String, required: true },
  inputHash: String,
  engineVersions: { type: mongoose.Schema.Types.Mixed, default: undefined },
  result: { type: mongoose.Schema.Types.Mixed, default: undefined },
  computedAt: Date,
}, { timestamps: true, collection: 'life_calibrations' });
lifeCalibrationSchema.index({ userId: 1 });

// 선택 동의 이력. EmailMarketingPreference.history 패턴. _id = userId.
const consentFields = { granted: Boolean, at: Date, source: String, version: String, age14Attested: Boolean };
const lifeCalibrationConsentSchema = new mongoose.Schema({
  _id: String,
  consent: consentFields,
  history: [{ _id: false, ...consentFields }],
}, { timestamps: true, collection: 'life_calibration_consents' });

export const LIFE_CALIBRATION_COLLECTIONS = Object.freeze(['life_events', 'life_calibrations', 'life_calibration_consents']);
export const LifeEvent = scopedModel(mongoose.models.LifeEvent || mongoose.model('LifeEvent', lifeEventSchema));
export const LifeCalibration = scopedModel(mongoose.models.LifeCalibration || mongoose.model('LifeCalibration', lifeCalibrationSchema));
export const LifeCalibrationConsent = scopedModel(mongoose.models.LifeCalibrationConsent || mongoose.model('LifeCalibrationConsent', lifeCalibrationConsentSchema));

/** 프로필 카드 하나의 인생 보정 데이터를 지운다(프로필 삭제·동의 철회). */
export async function deleteLifeCalibrationForProfile(userId, profileId) {
  const uid = String(userId);
  await LifeEvent.deleteMany({ userId: uid, profileId });
  await LifeCalibration.deleteOne({ _id: `${uid}:${profileId}` });
}

/** 계정의 인생 보정 입력·파생 캐시를 모두 지운다(동의 철회). 동의 이력은 남긴다. */
export async function deleteLifeCalibrationForUser(userId) {
  const uid = String(userId);
  await LifeEvent.deleteMany({ userId: uid });
  await LifeCalibration.deleteMany({ userId: uid });
}

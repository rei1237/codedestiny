import { mongoose } from './db.js';
import { scopedModel } from './db-scope-connection.js';

// User 문서에 넣지 않는다: 탈퇴 비식별화가 User 를 통째로 다시 쓰고, 동의 이력이 쌓이면 User 가 비대해진다.
const consentFields = { granted: Boolean, at: Date, source: String, version: String, text: String };
const preferenceSchema = new mongoose.Schema({
  _id: String,
  consent: consentFields,
  history: [{ _id: false, ...consentFields }],
  dismissed: { type: Boolean, default: false },
  // 발송 큐 정렬 키이자 CAS 선점 키. 최초 upsert 때 epoch 로 둬서 아직 안 받은 사람이 먼저 온다.
  lastSentAt: Date,
  lastCampaignId: String,
  lastWeekKey: String,
  lastError: String,
  lastErrorAt: Date,
  // §50⑦ 동의·철회 처리 결과 고지 대기. 고지를 보내면 지운다.
  noticePendingAt: Date,
  // §50⑧ 2년마다 수신동의 재확인. 동의 때 설정하고 철회 때 지운다.
  reconfirmDueAt: Date,
}, { timestamps: true });
preferenceSchema.index({ 'consent.granted': 1, lastSentAt: 1 });
preferenceSchema.index({ noticePendingAt: 1 }, { partialFilterExpression: { noticePendingAt: { $type: 'date' } } });
preferenceSchema.index({ 'consent.granted': 1, reconfirmDueAt: 1 });

// _id 'control' = 킬스위치 {enabled, weeklyCap}. 문서가 없으면 꺼진 상태다(env 바인딩 여유가 없어 DB 에 둔다).
// _id 'run:<weekKey>' = 주차별 발송 집계.
const stateSchema = new mongoose.Schema({
  _id: String,
  enabled: Boolean,
  weeklyCap: Number,
  updatedBy: String,
  weekKey: String,
  campaignId: String,
  sent: { type: Number, default: 0 },
  failed: { type: Number, default: 0 },
  skipped: { type: Number, default: 0 },
  configAbortedAt: Date,
  alertedAt: Date,
  lastRunAt: Date,
}, { timestamps: true });

export const EmailMarketingPreference = scopedModel(mongoose.models.EmailMarketingPreference || mongoose.model('EmailMarketingPreference', preferenceSchema));
export const EmailMarketingState = scopedModel(mongoose.models.EmailMarketingState || mongoose.model('EmailMarketingState', stateSchema));

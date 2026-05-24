/**
 * 앱 전역 설정 모델 — 단일 문서(singleton) 방식
 * 콜렉션: app_settings / _id: "global"
 */
import mongoose from "mongoose";
import { dbConnect } from "../dbConnect.js";

let _model = null;

const DEFAULT_SETTINGS = {
  maintenanceMode: false,
  maintenanceMessage: "시스템 점검 중입니다. 잠시 후 다시 시도해 주세요.",
  newUserCoins: 100,
  fortuneCosts: { saju: 10, tarot: 5, horoscope: 3, dream: 5, daily: 0, geomancy: 5 },
  coinPackages: [
    { id: "pkg_500",  name: "기본팩 500코인",      coins: 500,  priceKRW: 5000,  isActive: true },
    { id: "pkg_1200", name: "표준팩 1,200코인",   coins: 1200, priceKRW: 10000, isActive: true },
    { id: "pkg_3000", name: "프리미엄팩 3,000코인", coins: 3000, priceKRW: 22000, isActive: true },
  ],
  popupEnabled: false,
  popupTitle: "",
  popupContent: "",
  cacheTtlSeconds: 300,
  abuseRules: {
    bulkQuery:        { enabled: true,  windowMinutes: 10, threshold: 50 },
    multiAccount:     { enabled: true  },
    abnormalPayment:  { enabled: false, threshold: 3 },
  },
  ipBlockList: [], // [{ ip, reason, blockedAt }]
};

export async function getAppSettingsModel() {
  await dbConnect();
  if (_model) return _model;
  if (mongoose.models?.AppSettings) { _model = mongoose.models.AppSettings; return _model; }

  const { Schema } = mongoose;

  const schema = new Schema(
    {
      singletonKey:       { type: String, default: "global", unique: true, index: true },
      maintenanceMode:    { type: Boolean, default: false },
      maintenanceMessage: { type: String, default: "시스템 점검 중입니다." },
      newUserCoins:       { type: Number, default: 100 },
      fortuneCosts: {
        saju:     { type: Number, default: 10 },
        tarot:    { type: Number, default: 5  },
        horoscope:{ type: Number, default: 3  },
        dream:    { type: Number, default: 5  },
        daily:    { type: Number, default: 0  },
        geomancy: { type: Number, default: 5  },
      },
      coinPackages: [{
        id:        { type: String },
        name:      { type: String },
        coins:     { type: Number },
        priceKRW:  { type: Number },
        isActive:  { type: Boolean, default: true },
      }],
      popupEnabled: { type: Boolean, default: false },
      popupTitle:   { type: String,  default: "" },
      popupContent: { type: String,  default: "" },
      cacheTtlSeconds: { type: Number, default: 300 },
      abuseRules: {
        bulkQuery: {
          enabled:       { type: Boolean, default: true  },
          windowMinutes: { type: Number,  default: 10    },
          threshold:     { type: Number,  default: 50    },
        },
        multiAccountDetect:  { type: Boolean, default: true  },
        abnormalPaymentBlock: { type: Boolean, default: false },
      },
      ipBlockList: [{ ip: String, reason: String, blockedAt: Date }],
    },
    { timestamps: true },
  );

  _model = mongoose.model("AppSettings", schema, "app_settings");
  return _model;
}

export async function getSettings() {
  const model = await getAppSettingsModel();
  let doc = await model.findOne({ singletonKey: "global" }).lean();
  if (!doc) {
    doc = await model.create({ singletonKey: "global", ...DEFAULT_SETTINGS });
    doc = doc.toObject();
  }
  // 기본값 병합 후 BSON ObjectId 등 MongoDB 전용 타입을 plain JSON으로 정규화
  const merged = { ...DEFAULT_SETTINGS, ...doc };
  return JSON.parse(JSON.stringify(merged));
}

export async function updateSettings(patch) {
  const model = await getAppSettingsModel();
  // $set으로 부분 업데이트, upsert
  const doc = await model.findOneAndUpdate(
    { singletonKey: "global" },
    { $set: patch },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  ).lean();
  return doc;
}

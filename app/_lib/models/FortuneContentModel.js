/**
 * 운세 콘텐츠 모델 — 사주/타로/별자리/꿈해몽/오늘의운세 텍스트 관리
 * 콜렉션: fortune_contents
 */
import mongoose from "mongoose";
import { dbConnect } from "../dbConnect.js";

let _model = null;

export async function getFortuneContentModel() {
  await dbConnect();
  if (_model) return _model;
  if (mongoose.models?.FortuneContent) { _model = mongoose.models.FortuneContent; return _model; }

  const { Schema } = mongoose;

  const schema = new Schema(
    {
      category: {
        type: String,
        required: true,
        enum: ["saju", "tarot", "horoscope", "dream", "daily", "geomancy", "love", "career"],
        index: true,
      },
      subcategory: { type: String, default: "", trim: true, index: true },
      title:    { type: String, required: true, trim: true, maxlength: 200 },
      content:  { type: String, required: true, maxlength: 20000 },
      tags:     [{ type: String, trim: true }],
      sortOrder:{ type: Number, default: 0, index: true },
      isActive: { type: Boolean, default: true, index: true },
      metadata: { type: Schema.Types.Mixed },
    },
    { timestamps: true },
  );

  schema.index({ category: 1, sortOrder: 1 });

  _model = mongoose.model("FortuneContent", schema, "fortune_contents");
  return _model;
}

const FORTUNE_CONTENT_MODEL_TEXT_TRANSLATIONS = {
  ko: {
    saju: "사주",
    tarot: "타로",
    horoscope: "별자리",
    dream: "꿈해몽",
    daily: "오늘의운세",
    geomancy: "풍수지리",
    love: "연애운",
    career: "직업운",
  },
};

function fortuneContentModelText(key) {
  return FORTUNE_CONTENT_MODEL_TEXT_TRANSLATIONS.ko[key];
}

export const CONTENT_CATEGORIES = [
  { value: "saju",      label: fortuneContentModelText("saju") },
  { value: "tarot",     label: fortuneContentModelText("tarot") },
  { value: "horoscope", label: fortuneContentModelText("horoscope") },
  { value: "dream",     label: fortuneContentModelText("dream") },
  { value: "daily",     label: fortuneContentModelText("daily") },
  { value: "geomancy",  label: fortuneContentModelText("geomancy") },
  { value: "love",      label: fortuneContentModelText("love") },
  { value: "career",    label: fortuneContentModelText("career") },
];

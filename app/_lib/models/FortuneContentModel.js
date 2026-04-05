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

export const CONTENT_CATEGORIES = [
  { value: "saju",      label: "사주" },
  { value: "tarot",     label: "타로" },
  { value: "horoscope", label: "별자리" },
  { value: "dream",     label: "꿈해몽" },
  { value: "daily",     label: "오늘의운세" },
  { value: "geomancy",  label: "풍수지리" },
  { value: "love",      label: "연애운" },
  { value: "career",    label: "직업운" },
];

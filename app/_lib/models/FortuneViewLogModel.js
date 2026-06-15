/**
 * FortuneViewLog — 운세 조회 이력 모델
 * 
 * 용도:
 *   - 운세 조회 횟수 통계 (카테고리별 / 일별)
 *   - 어뷰징 감지 (단기간 대량 조회)
 *   - 대시보드 실시간 차트 데이터 소스
 * 
 * 기록 방법: 각 운세 API 라우트에서 logFortuneView() 호출
 */

import mongoose from "mongoose";
import { dbConnect } from "../dbConnect.js";

let _FortuneViewLogModel = null;

export async function getFortuneViewLogModel() {
  await dbConnect();
  if (_FortuneViewLogModel) return _FortuneViewLogModel;
  if (mongoose.models?.FortuneViewLog) {
    _FortuneViewLogModel = mongoose.models.FortuneViewLog;
    return _FortuneViewLogModel;
  }

  const { Schema } = mongoose;

  const schema = new Schema(
    {
      userId:   { type: Schema.Types.ObjectId, ref: "User", index: true, default: null },
      category: {
        type: String,
        enum: ["saju", "tarot", "horoscope", "dream", "daily", "geomancy", "love", "career", "other"],
        required: true,
        index: true,
      },
      // 세부 기능 (예: "basic", "love-sim", "career-star")
      featureKey: { type: String, default: "", index: true },
      // 요청 IP (어뷰징 감지용) — 단방향 해시로 저장해 개인정보 보호
      ipHash: { type: String, default: "" },
    // 결제 적용 여부
      coinDeducted: { type: Boolean, default: false },
      coinAmount:   { type: Number, default: 0 },
      // 응답 시간(ms) — 평균 응답 속도 통계
      responseMs: { type: Number, default: 0 },
      // 상태
      status: { type: String, enum: ["ok", "error", "blocked"], default: "ok" },
    },
    {
      timestamps: true,
      // 90일 후 자동 삭제 (TTL 인덱스)
      // index는 아래에 명시
    },
  );

  // 날짜 기반 집계용 복합 인덱스
  schema.index({ createdAt: 1 });
  schema.index({ category: 1, createdAt: 1 });
  schema.index({ userId: 1, createdAt: 1 });

  // 90일 TTL — 운영 DB 용량 자동 관리
  schema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

  _FortuneViewLogModel = mongoose.model("FortuneViewLog", schema, "fortune_view_logs");
  return _FortuneViewLogModel;
}

/**
 * 운세 조회 기록 헬퍼
 * @param {{ userId?: string, category: string, featureKey?: string, ipHash?: string, coinDeducted?: boolean, coinAmount?: number, responseMs?: number, status?: string }} opts
 */
export async function logFortuneView(opts) {
  try {
    const Model = await getFortuneViewLogModel();
    await Model.create({
      userId:       opts.userId   || null,
      category:     opts.category || "other",
      featureKey:   opts.featureKey  || "",
      ipHash:       opts.ipHash      || "",
      coinDeducted: opts.coinDeducted ?? false,
      coinAmount:   opts.coinAmount   ?? 0,
      responseMs:   opts.responseMs   ?? 0,
      status:       opts.status       || "ok",
    });
  } catch (e) {
    // 기록 실패는 무시 — 서비스 흐름에 영향 주지 않음
    console.warn("[logFortuneView] failed:", e?.message);
  }
}

/**
 * DeletedAccountLog — 탈퇴 감사 로그 모델
 *
 * 목적:
 *   - 탈퇴 처리가 정상 완료되었음을 비식별 방식으로 기록합니다.
 *   - 개인정보(이름/이메일/연락처 등)는 절대 저장하지 않습니다.
 *   - 동일 이메일로 재가입 시 이전 데이터와 연결되지 않도록
 *     이메일 단방향 해시(SHA-256)만 보관합니다.
 *   - 전자상거래법 분쟁 대비용 익명 거래 집계 필드만 포함합니다.
 *
 * TTL: withdrawnAt 기준 5년 후 자동 삭제 (TTL 인덱스)
 */

import mongoose from "mongoose";
import { dbConnect } from "../dbConnect.js";

let _DeletedAccountLogModel = null;

export async function getDeletedAccountLogModel() {
  await dbConnect();

  if (_DeletedAccountLogModel) return _DeletedAccountLogModel;
  if (mongoose.models?.DeletedAccountLog) {
    _DeletedAccountLogModel = mongoose.models.DeletedAccountLog;
    return _DeletedAccountLogModel;
  }

  const { Schema } = mongoose;

  const schema = new Schema(
    {
      // 재가입 연결 차단용 — SHA-256(email) 단방향 해시, 원본 이메일 복원 불가
      emailHash: {
        type: String,
        required: true,
        index: true,
        select: false, // 일반 조회에서 노출 차단
      },

      // 탈퇴 일시 (TTL 기준점)
      withdrawnAt: {
        type: Date,
        required: true,
        default: Date.now,
      },

      // 탈퇴 사유 코드 (자발적 탈퇴 or 관리자 강제 탈퇴)
      reason: {
        type: String,
        enum: ["self", "admin_forced", "dormant_auto"],
        default: "self",
      },

      // 전자상거래법 분쟁 대비 — 결제 총액만 보관 (식별 불가 집계값)
      totalPaymentAmount: {
        type: Number,
        default: 0,
      },

      // 처리 단계별 성공 여부 (장애 추적용, PII 없음)
      steps: {
        tokenInvalidated:    { type: Boolean, default: false },
        userDocAnonymized:   { type: Boolean, default: false },
        paymentsAnonymized:  { type: Boolean, default: false },
        pointHistoryDeleted: { type: Boolean, default: false },
        viewLogsAnonymized:  { type: Boolean, default: false },
        fareMailSent:        { type: Boolean, default: false },
        partialFailure:      { type: Boolean, default: false }, // 일부 단계 실패 시 true
        failureDetails:      { type: [String], default: [] },   // 실패한 단계 목록 (PII 없음)
      },
    },
    {
      timestamps: false,     // withdrawnAt으로 직접 관리
      collection: "deleted_account_logs",
    },
  );

  // TTL 인덱스: 탈퇴 후 5년(157,680,000초) 경과 시 자동 삭제
  // → 전자상거래법 거래 기록 5년 보존 의무 대응
  schema.index({ withdrawnAt: 1 }, { expireAfterSeconds: 157_680_000 });

  // 재가입 차단 조회용
  schema.index({ emailHash: 1, withdrawnAt: -1 });

  _DeletedAccountLogModel = mongoose.model(
    "DeletedAccountLog",
    schema,
    "deleted_account_logs",
  );
  return _DeletedAccountLogModel;
}

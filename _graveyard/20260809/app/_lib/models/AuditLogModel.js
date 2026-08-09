/**
 * Audit Log (감사 로그) 모델
 * 관리자가 수행한 모든 작업(수정/삭제/차단/보너스 지급 등)을 기록합니다.
 */

import mongoose from "mongoose";
import { dbConnect } from "../dbConnect.js";

let _AuditLogModel = null;

export async function getAuditLogModel() {
  await dbConnect();

  if (_AuditLogModel) return _AuditLogModel;
  if (mongoose.models?.AuditLog) {
    _AuditLogModel = mongoose.models.AuditLog;
    return _AuditLogModel;
  }

  const { Schema } = mongoose;

  const auditLogSchema = new Schema(
    {
      // 작업 수행 관리자
      adminId:    { type: String, required: true },
      adminEmail: { type: String, required: true },

      // 작업 종류: user_ban, user_unban, user_suspend, user_delete,
      //            coin_grant, content_create, content_update, content_delete,
      //            settings_update, user_role_change
      action:     { type: String, required: true, index: true },

      // 대상 리소스
      targetType: { type: String, required: true }, // "user" | "content" | "settings" | "coin"
      targetId:   { type: String, default: "" },    // 대상 도큐먼트 _id

      // 변경 전/후 내용 (JSON snapshot — 무거운 필드는 제외)
      before:     { type: mongoose.Schema.Types.Mixed, default: null },
      after:      { type: mongoose.Schema.Types.Mixed, default: null },

      // 부가 정보
      note:       { type: String, default: "" },
      ip:         { type: String, default: "" },
    },
    {
      timestamps: true, // createdAt (작업 일시) 자동 생성
      collection: "admin_audit_logs",
    },
  );

  auditLogSchema.index({ createdAt: -1 });
  auditLogSchema.index({ adminId: 1, createdAt: -1 });
  auditLogSchema.index({ targetType: 1, targetId: 1 });

  _AuditLogModel = mongoose.model("AuditLog", auditLogSchema, "admin_audit_logs");
  return _AuditLogModel;
}

/**
 * 감사 로그 기록 헬퍼
 * 각 API 라우트에서 await writeAuditLog({...}) 으로 호출
 */
export async function writeAuditLog({
  adminId,
  adminEmail,
  action,
  targetType,
  targetId = "",
  before = null,
  after = null,
  note = "",
  ip = "",
}) {
  try {
    const AuditLog = await getAuditLogModel();
    await AuditLog.create({
      adminId: String(adminId),
      adminEmail: String(adminEmail),
      action,
      targetType,
      targetId: String(targetId),
      before,
      after,
      note,
      ip,
    });
  } catch (err) {
    // 감사 로그 실패는 메인 작업을 중단시키지 않음 (silent)
    console.error("[AuditLog] write failed:", err?.message || err);
  }
}

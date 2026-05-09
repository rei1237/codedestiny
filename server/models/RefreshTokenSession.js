const mongoose = require("mongoose");

const refreshTokenSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  userAgent: {
    type: String,
    default: "",
  },
  ip: {
    type: String,
    default: "",
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
  revokedAt: {
    type: Date,
    default: null,
    index: true,
  },
  replacedByTokenHash: {
    type: String,
    default: "",
  },
}, {
  timestamps: true,
});

refreshTokenSessionSchema.index({ tokenHash: 1 }, { unique: true });
refreshTokenSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: -1 });

module.exports = mongoose.models.RefreshTokenSession
  || mongoose.model("RefreshTokenSession", refreshTokenSessionSchema);

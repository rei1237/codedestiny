const mongoose = require("mongoose");

const birthSchema = new mongoose.Schema({
  year: { type: Number, min: 1000, max: 9999 },
  month: { type: Number, min: 1, max: 12 },
  day: { type: Number, min: 1, max: 31 },
  hour: { type: Number, min: 0, max: 23, default: 0 },
  minute: { type: Number, min: 0, max: 59, default: 0 },
  calType: {
    type: String,
    enum: ["solar", "lunar", "lunar_leap"],
    default: "solar",
  },
}, { _id: false });

const locationSchema = new mongoose.Schema({
  label: { type: String, default: "", trim: true, maxlength: 120 },
  tz: { type: String, default: "Asia/Seoul", trim: true, maxlength: 80 },
  lng: { type: Number, default: 127.0 },
  lat: { type: Number, default: 37.5 },
}, { _id: false });

const profileCardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  profileId: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80,
  },
  gender: {
    type: String,
    enum: ["M", "F", "OTHER"],
    default: "OTHER",
  },
  birth: {
    type: birthSchema,
    default: () => ({}),
  },
  location: {
    type: locationSchema,
    default: () => ({}),
  },
}, {
  timestamps: true,
});

profileCardSchema.index({ userId: 1, profileId: 1 }, { unique: true });
profileCardSchema.index({ userId: 1, createdAt: 1 });

module.exports = mongoose.models.ProfileCard || mongoose.model("ProfileCard", profileCardSchema);

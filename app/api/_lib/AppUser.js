/**
 * Self-contained User model for Next.js App Router / CF Workers.
 * Does NOT import from server/ to avoid OpenNext bundling issues.
 */
import mongoose from "mongoose";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const birthDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const birthTimeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const userSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true, minlength: 2, maxlength: 40 },
  email:         { type: String, required: true, unique: true, lowercase: true, trim: true, match: emailRegex },
  passwordHash:  { type: String, required: false, default: "", select: false },
  birthDate:     { type: String, required: true, default: "1900-01-01", match: birthDateRegex },
  birthTime:     { type: String, required: true, default: "00:00", match: birthTimeRegex },
  gender:        { type: String, required: true, enum: ["M", "F", "OTHER"], default: "OTHER" },
  joinedAt:      { type: Date, default: Date.now },
  role:          { type: String, enum: ["user", "admin"], default: "user" },
  points:        { type: Number, default: 0, min: 0 },
  localAuth: {
    enabled:     { type: Boolean, default: true },
    activatedAt: { type: Date, default: Date.now },
  },
  socialAccounts: {
    google: { id: { type: String, default: "" }, connectedAt: { type: Date, default: null } },
    naver:  { id: { type: String, default: "" }, connectedAt: { type: Date, default: null } },
    kakao:  { id: { type: String, default: "" }, connectedAt: { type: Date, default: null } },
  },
}, { timestamps: true });

userSchema.index({ email: 1 }, { unique: true });

// Prevent model re-registration in hot-reload environments
const AppUser = mongoose.models.AppUser || mongoose.model("AppUser", userSchema, "users");

export default AppUser;

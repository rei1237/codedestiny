const express = require("express");

const User = require("../models/User");
const ProfileCard = require("../models/ProfileCard");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

const PROFILE_LIMIT_BY_TIER = Object.freeze({
  standard: 3,
  premium: 7,
  vvip: 15,
});

const MAX_PROFILE_ID_LEN = 80;
const MAX_NAME_LEN = 80;

function sanitizeString(value, maxLen) {
  return String(value || "").trim().slice(0, maxLen);
}

function sanitizeProfileId(value) {
  return sanitizeString(value, MAX_PROFILE_ID_LEN).replace(/\s+/g, "_");
}

function sanitizeName(value) {
  return sanitizeString(value, MAX_NAME_LEN) || "이름 없음";
}

function sanitizeGender(value) {
  const normalized = String(value || "OTHER").trim().toUpperCase();
  if (normalized === "M" || normalized === "F") return normalized;
  return "OTHER";
}

function sanitizeInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.trunc(n);
  if (i < min) return min;
  if (i > max) return max;
  return i;
}

function sanitizeFloat(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function sanitizeCalType(value) {
  const calType = String(value || "solar").trim().toLowerCase();
  if (calType === "lunar" || calType === "lunar_leap") return calType;
  return "solar";
}

function buildProfileId(rawProfileId, fallbackIndex) {
  const profileId = sanitizeProfileId(rawProfileId);
  if (profileId) return profileId;
  return `dp_${Date.now()}_${fallbackIndex}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeIncomingProfile(raw, index) {
  const source = raw && typeof raw === "object" ? raw : {};
  const birth = source.birth && typeof source.birth === "object" ? source.birth : {};
  const location = source.location && typeof source.location === "object" ? source.location : {};

  return {
    profileId: buildProfileId(source.profileId || source.id, index),
    name: sanitizeName(source.name),
    gender: sanitizeGender(source.gender),
    birth: {
      year: sanitizeInt(birth.year, 1000, 9999, 1900),
      month: sanitizeInt(birth.month, 1, 12, 1),
      day: sanitizeInt(birth.day, 1, 31, 1),
      hour: sanitizeInt(birth.hour, 0, 23, 0),
      minute: sanitizeInt(birth.minute, 0, 59, 0),
      calType: sanitizeCalType(birth.calType),
    },
    location: {
      label: sanitizeString(location.label, 120),
      tz: sanitizeString(location.tz, 80) || "Asia/Seoul",
      lng: sanitizeFloat(location.lng, -180, 180, 127.0),
      lat: sanitizeFloat(location.lat, -90, 90, 37.5),
    },
  };
}

function resolveSubscriptionPolicy(user) {
  const tierRaw = String(user?.profileSubscription?.tier || "").trim().toLowerCase();
  const expiresAtRaw = user?.profileSubscription?.expiresAt;
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;
  const hasPlan = Object.prototype.hasOwnProperty.call(PROFILE_LIMIT_BY_TIER, tierRaw);
  const isActive = Boolean(
    hasPlan
      && expiresAt
      && Number.isFinite(expiresAt.getTime())
      && expiresAt.getTime() > Date.now(),
  );

  return {
    tier: isActive ? tierRaw : "free",
    isActive,
    profileLimit: isActive ? PROFILE_LIMIT_BY_TIER[tierRaw] : 1,
    expiresAt: isActive && expiresAt ? expiresAt.toISOString() : null,
  };
}

function toClientProfile(doc) {
  return {
    id: String(doc.profileId || ""),
    profileId: String(doc.profileId || ""),
    name: String(doc.name || "이름 없음"),
    gender: sanitizeGender(doc.gender),
    birth: {
      year: Number(doc?.birth?.year || 1900),
      month: Number(doc?.birth?.month || 1),
      day: Number(doc?.birth?.day || 1),
      hour: Number(doc?.birth?.hour || 0),
      minute: Number(doc?.birth?.minute || 0),
      calType: sanitizeCalType(doc?.birth?.calType),
    },
    location: {
      label: String(doc?.location?.label || ""),
      tz: String(doc?.location?.tz || "Asia/Seoul"),
      lng: Number(doc?.location?.lng || 127.0),
      lat: Number(doc?.location?.lat || 37.5),
    },
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
  };
}

function resolveCurrentId(rawCurrentId, profiles) {
  const currentId = sanitizeProfileId(rawCurrentId);
  if (!currentId) return "";
  for (let i = 0; i < profiles.length; i += 1) {
    if (String(profiles[i]?.id || "") === currentId) return currentId;
  }
  return "";
}

async function listUserProfiles(userId) {
  const docs = await ProfileCard.find({ userId }).sort({ createdAt: 1 }).lean();
  return docs.map(toClientProfile);
}

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.userId)
      .select("profileSubscription destinyProfilesCurrentId")
      .lean();

    if (!user) {
      return res.status(404).json({ ok: false, message: "사용자를 찾을 수 없습니다." });
    }

    const subscription = resolveSubscriptionPolicy(user);
    const profiles = await listUserProfiles(req.auth.userId);
    const currentId = resolveCurrentId(user.destinyProfilesCurrentId, profiles) || profiles[0]?.id || "";

    if (currentId && currentId !== String(user.destinyProfilesCurrentId || "")) {
      await User.updateOne({ _id: req.auth.userId }, { $set: { destinyProfilesCurrentId: currentId } });
    }

    return res.status(200).json({
      ok: true,
      profiles,
      currentId,
      subscription,
      canCreateMore: profiles.length < subscription.profileLimit,
    });
  } catch (error) {
    return next(error);
  }
});

// [DEPRECATED] 프로필 카드 생성은 5,000원 단건결제 또는 월정석 결제가 필요하며,
// 결제 증거(PortOne/월정석) 검증 계층은 Cloudflare Worker(worker/routes/profile.js)에만 존재한다.
// 이 레거시 Express 경로는 결제 계층이 없어 무료·무제한 생성 우회구멍이 되므로 위임 응답으로 차단한다.
// 정책: docs/payment-policy-content-access.md (프로필 카드 추가/삭제)
router.post("/", async (_req, res) => {
  return res.status(410).json({
    ok: false,
    code: "USE_WORKER_PROFILE_ENDPOINT",
    message: "프로필 카드 추가는 5,000원 단건결제 또는 월정석으로만 진행할 수 있습니다. 앱 내 프로필 관리 화면(결제 지원 경로)에서 다시 시도해주세요.",
  });
});

router.patch("/current", async (req, res, next) => {
  try {
    const requestedCurrentId = sanitizeProfileId(req.body?.currentId);
    if (!requestedCurrentId) {
      return res.status(400).json({ ok: false, message: "currentId가 필요합니다." });
    }

    const exists = await ProfileCard.findOne({
      userId: req.auth.userId,
      profileId: requestedCurrentId,
    }).lean();

    if (!exists) {
      return res.status(404).json({ ok: false, message: "선택한 프로필 카드를 찾을 수 없습니다." });
    }

    await User.updateOne(
      { _id: req.auth.userId },
      { $set: { destinyProfilesCurrentId: requestedCurrentId } },
    );

    return res.status(200).json({ ok: true, currentId: requestedCurrentId });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:profileId", async (req, res, next) => {
  try {
    const profileId = sanitizeProfileId(req.params.profileId);
    if (!profileId) {
      return res.status(400).json({ ok: false, message: "유효한 profileId가 필요합니다." });
    }

    const normalized = normalizeIncomingProfile({
      ...req.body,
      profileId,
    }, 0);

    const updated = await ProfileCard.findOneAndUpdate(
      { userId: req.auth.userId, profileId },
      {
        $set: {
          name: normalized.name,
          gender: normalized.gender,
          birth: normalized.birth,
          location: normalized.location,
        },
      },
      { new: true },
    ).lean();

    if (!updated) {
      return res.status(404).json({ ok: false, message: "프로필 카드를 찾을 수 없습니다." });
    }

    return res.status(200).json({ ok: true, profile: toClientProfile(updated) });
  } catch (error) {
    return next(error);
  }
});

// [DEPRECATED] 프로필 카드 삭제는 건당 5,000원(또는 월정석) 결제가 필요하며(family 이용권만 무료),
// 결제 증거 검증 계층은 Cloudflare Worker(worker/routes/profile.js)에만 존재한다.
// 이 레거시 Express 경로는 결제 없이 삭제하여 5,000원 정책을 우회하므로 위임 응답으로 차단한다.
// 정책: docs/payment-policy-content-access.md (프로필 카드 추가/삭제). 보유 개수 제한 없이 1개여도 삭제 가능하나 결제는 필수.
router.delete("/:profileId", async (_req, res) => {
  return res.status(410).json({
    ok: false,
    code: "USE_WORKER_PROFILE_ENDPOINT",
    message: "프로필 카드 삭제는 5,000원 단건결제 또는 월정석으로만 진행할 수 있습니다. 앱 내 프로필 관리 화면(결제 지원 경로)에서 다시 시도해주세요.",
  });
});

module.exports = router;

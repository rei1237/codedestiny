const express = require("express");

const User = require("../models/User");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

const MAX_DESTINY_PROFILES = 30;
const MAX_PROFILE_ID_LEN = 80;

function sanitizeProfileId(value) {
  return String(value || "").trim().slice(0, MAX_PROFILE_ID_LEN);
}

function sanitizeDestinyProfiles(rawProfiles) {
  if (!Array.isArray(rawProfiles)) return [];

  const sanitized = [];
  const seenIds = new Set();

  for (let i = 0; i < rawProfiles.length; i += 1) {
    if (sanitized.length >= MAX_DESTINY_PROFILES) break;
    const profile = rawProfiles[i];
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) continue;

    let cloned;
    try {
      cloned = JSON.parse(JSON.stringify(profile));
    } catch (e) {
      continue;
    }

    const id = sanitizeProfileId(cloned && cloned.id);
    if (!id || seenIds.has(id)) continue;

    cloned.id = id;
    seenIds.add(id);
    sanitized.push(cloned);
  }

  return sanitized;
}

function resolveCurrentId(rawCurrentId, profiles) {
  const currentId = sanitizeProfileId(rawCurrentId);
  if (!currentId) return "";

  for (let i = 0; i < profiles.length; i += 1) {
    if (String((profiles[i] && profiles[i].id) || "") === currentId) return currentId;
  }

  return "";
}

router.use(requireAuth);

router.get("/destiny-profiles", async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.userId)
      .select("destinyProfiles destinyProfilesCurrentId")
      .lean();

    if (!user) {
      return res.status(404).json({ ok: false, message: "사용자를 찾을 수 없습니다." });
    }

    const profiles = sanitizeDestinyProfiles(user.destinyProfiles || []);
    const currentId = resolveCurrentId(user.destinyProfilesCurrentId, profiles);

    return res.status(200).json({ ok: true, profiles, currentId });
  } catch (error) {
    return next(error);
  }
});

router.post("/destiny-profiles", async (req, res, next) => {
  try {
    const action = String((req.body && req.body.action) || "").trim().toLowerCase();
    if (action && action !== "sync") {
      return res.status(400).json({ ok: false, message: "지원하지 않는 action입니다." });
    }

    const profiles = sanitizeDestinyProfiles((req.body && req.body.profiles) || []);
    const currentId = resolveCurrentId(req.body && req.body.currentId, profiles);

    const updated = await User.findByIdAndUpdate(
      req.auth.userId,
      {
        $set: {
          destinyProfiles: profiles,
          destinyProfilesCurrentId: currentId,
        },
      },
      {
        new: true,
        projection: {
          destinyProfiles: 1,
          destinyProfilesCurrentId: 1,
        },
      },
    ).lean();

    if (!updated) {
      return res.status(404).json({ ok: false, message: "사용자를 찾을 수 없습니다." });
    }

    const nextProfiles = sanitizeDestinyProfiles(updated.destinyProfiles || []);
    const nextCurrentId = resolveCurrentId(updated.destinyProfilesCurrentId, nextProfiles);

    return res.status(200).json({ ok: true, profiles: nextProfiles, currentId: nextCurrentId });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;

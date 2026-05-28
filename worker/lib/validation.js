const DEFAULT_POINT_CHARGE_PACKAGES = {
  3300: 30,
  9900: 115,
  29000: 360,
  59000: 880,
  119000: 2000,
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const birthDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const birthTimeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function validateRegisterPayload(payload = {}) {
  const errors = [];

  const name = String(payload.name || "").trim();
  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");
  const birthDate = String(payload.birthDate || "").trim();
  const birthTime = String(payload.birthTime || "").trim();
  const gender = String(payload.gender || "").trim().toUpperCase();

  if (!name || name.length < 2) errors.push("Name must be at least 2 characters.");
  if (name.length > 40) errors.push("Name must be 40 characters or fewer.");
  if (!emailRegex.test(email)) errors.push("Email format is invalid.");
  if (password.length < 8) errors.push("Password must be at least 8 characters.");
  if (!birthDateRegex.test(birthDate)) errors.push("birthDate must use YYYY-MM-DD format.");
  if (!birthTimeRegex.test(birthTime)) errors.push("birthTime must use HH:mm format.");
  if (!["M", "F", "OTHER"].includes(gender)) errors.push("gender must be M, F, or OTHER.");

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: {
      name,
      email,
      password,
      birthDate,
      birthTime,
      gender,
    },
  };
}

export function validateLoginPayload(payload = {}) {
  const errors = [];

  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");

  if (!emailRegex.test(email)) errors.push("Email format is invalid.");
  if (!password || password.length < 8) errors.push("Please check your password.");

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: {
      email,
      password,
    },
  };
}

function parsePointChargePackages(raw) {
  if (!raw) return null;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error("POINT_CHARGE_PACKAGES must be a JSON object.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("POINT_CHARGE_PACKAGES must be a JSON object.");
  }

  const table = new Map();
  for (const [amountRaw, pointsRaw] of Object.entries(parsed)) {
    const amount = Number(amountRaw);
    const points = Number(pointsRaw);

    if (!Number.isInteger(amount) || amount <= 0) {
      throw new Error("POINT_CHARGE_PACKAGES amounts must be positive integers.");
    }

    if (!Number.isInteger(points) || points <= 0) {
      throw new Error("POINT_CHARGE_PACKAGES points must be positive integers.");
    }

    table.set(amount, points);
  }

  return table;
}

export function resolveChargePointsByAmount(env, paymentAmount, requestedPoints) {
  const amount = Number(paymentAmount);

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Payment amount must be a positive integer.");
  }

  const packageTable = parsePointChargePackages(env?.POINT_CHARGE_PACKAGES)
    || new Map(Object.entries(DEFAULT_POINT_CHARGE_PACKAGES).map(([key, value]) => [Number(key), Number(value)]));

  const resolvedPoints = packageTable.get(amount);
  if (!resolvedPoints) {
    throw new Error("Unsupported payment amount.");
  }

  if (
    requestedPoints !== undefined
    && requestedPoints !== null
    && Number(requestedPoints) !== resolvedPoints
  ) {
    throw new Error("Requested charge points do not match the server policy.");
  }

  return resolvedPoints;
}

export function validatePointChargePayload(payload = {}) {
  const errors = [];

  const impUid = String(payload.impUid || payload.paymentId || "").trim();
  const merchantUid = String(payload.merchantUid || payload.merchant_uid || "").trim();
  const paymentAmount = Number(payload.paymentAmount ?? payload.amount);
  const chargePoints = payload.chargePoints === undefined || payload.chargePoints === null
    ? undefined
    : Number(payload.chargePoints);
  const paymentMethod = String(payload.paymentMethod || "").trim();

  if (!impUid || impUid.length < 6) errors.push("impUid is required.");
  if (merchantUid && merchantUid.length > 120) errors.push("merchantUid is too long.");
  if (!Number.isInteger(paymentAmount) || paymentAmount <= 0) errors.push("paymentAmount must be a positive integer.");
  if (chargePoints !== undefined && (!Number.isInteger(chargePoints) || chargePoints <= 0)) {
    errors.push("chargePoints must be a positive integer.");
  }
  if (paymentMethod && paymentMethod.length > 32) errors.push("paymentMethod is too long.");

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: {
      impUid,
      merchantUid: merchantUid || undefined,
      paymentAmount,
      chargePoints,
      paymentMethod: paymentMethod || undefined,
    },
  };
}

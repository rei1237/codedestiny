const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const birthDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const birthTimeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const DEFAULT_POINT_CHARGE_PACKAGES = {
  5000: 5000,
  10000: 10000,
  30000: 32000,
};

function parsePointChargePackages(raw) {
  if (!raw) return null;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error("POINT_CHARGE_PACKAGES 환경변수는 JSON 객체여야 합니다.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("POINT_CHARGE_PACKAGES 환경변수는 JSON 객체여야 합니다.");
  }

  const table = new Map();
  for (const [amountRaw, pointsRaw] of Object.entries(parsed)) {
    const amount = Number(amountRaw);
    const points = Number(pointsRaw);

    if (!Number.isInteger(amount) || amount <= 0) {
      throw new Error("POINT_CHARGE_PACKAGES의 금액 키는 양의 정수여야 합니다.");
    }

    if (!Number.isInteger(points) || points <= 0) {
      throw new Error("POINT_CHARGE_PACKAGES의 포인트 값은 양의 정수여야 합니다.");
    }

    table.set(amount, points);
  }

  return table;
}

function resolveChargePointsByAmount(paymentAmount, requestedPoints) {
  const amount = Number(paymentAmount);

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("결제 금액은 1원 이상의 정수여야 합니다.");
  }

  const packageTable = parsePointChargePackages(process.env.POINT_CHARGE_PACKAGES)
    || new Map(Object.entries(DEFAULT_POINT_CHARGE_PACKAGES).map(([k, v]) => [Number(k), Number(v)]));
  const resolvedPoints = packageTable
    ? packageTable.get(amount)
    : amount;

  if (!resolvedPoints) {
    throw new Error("허용되지 않은 결제 금액입니다.");
  }

  if (
    requestedPoints !== undefined
    && requestedPoints !== null
    && Number(requestedPoints) !== resolvedPoints
  ) {
    throw new Error("클라이언트 포인트 값이 서버 충전 정책과 일치하지 않습니다.");
  }

  return resolvedPoints;
}

function validateRegisterPayload(payload = {}) {
  const errors = [];

  const name = String(payload.name || "").trim();
  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");
  const birthDate = String(payload.birthDate || "").trim();
  const birthTime = String(payload.birthTime || "").trim();
  const gender = String(payload.gender || "").trim().toUpperCase();

  if (!name || name.length < 2) {
    errors.push("이름은 최소 2자 이상이어야 합니다.");
  }

  if (!emailRegex.test(email)) {
    errors.push("유효한 이메일 형식이 아닙니다.");
  }

  if (password.length < 8) {
    errors.push("비밀번호는 최소 8자 이상이어야 합니다.");
  }

  if (!birthDateRegex.test(birthDate)) {
    errors.push("생년월일 형식은 YYYY-MM-DD 이어야 합니다.");
  }

  if (!birthTimeRegex.test(birthTime)) {
    errors.push("태어난 시간 형식은 HH:mm 이어야 합니다.");
  }

  if (!["M", "F", "OTHER"].includes(gender)) {
    errors.push("성별은 M, F, OTHER 중 하나여야 합니다.");
  }

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

function validateLoginPayload(payload = {}) {
  const errors = [];

  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");

  if (!emailRegex.test(email)) {
    errors.push("유효한 이메일 형식이 아닙니다.");
  }

  if (!password || password.length < 8) {
    errors.push("비밀번호를 다시 확인해 주세요.");
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: {
      email,
      password,
    },
  };
}

function validatePointChargePayload(payload = {}) {
  const errors = [];

  const impUid = String(payload.impUid || payload.paymentId || "").trim();
  const merchantUid = String(payload.merchantUid || payload.merchant_uid || "").trim();
  const paymentAmount = Number(payload.paymentAmount ?? payload.amount);
  const chargePoints = payload.chargePoints === undefined || payload.chargePoints === null
    ? undefined
    : Number(payload.chargePoints);
  const paymentMethod = String(payload.paymentMethod || "").trim();

  if (!impUid || impUid.length < 6) {
    errors.push("결제 고유 ID(impUid)가 필요합니다.");
  }

  if (merchantUid && merchantUid.length > 120) {
    errors.push("상점 주문번호(merchantUid) 길이가 너무 깁니다.");
  }

  if (!Number.isInteger(paymentAmount) || paymentAmount <= 0) {
    errors.push("결제 금액(paymentAmount)은 양의 정수여야 합니다.");
  }

  if (chargePoints !== undefined && (!Number.isInteger(chargePoints) || chargePoints <= 0)) {
    errors.push("충전 포인트(chargePoints)는 양의 정수여야 합니다.");
  }

  if (paymentMethod && paymentMethod.length > 32) {
    errors.push("결제 수단(paymentMethod) 길이가 너무 깁니다.");
  }

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

module.exports = {
  validateRegisterPayload,
  validateLoginPayload,
  validatePointChargePayload,
  resolveChargePointsByAmount,
};

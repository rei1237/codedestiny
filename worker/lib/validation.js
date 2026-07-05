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


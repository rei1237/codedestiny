const configuredSupportEmail = (
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ||
  process.env.SUPPORT_EMAIL ||
  process.env.CONTACT_EMAIL ||
  ""
).trim();

export const SUPPORT_EMAIL = configuredSupportEmail || "고객센터";
export const SUPPORT_MAILTO = configuredSupportEmail ? `mailto:${configuredSupportEmail}` : "#";

export const OPERATOR_NAME = (
  process.env.NEXT_PUBLIC_OPERATOR_NAME ||
  process.env.OPERATOR_NAME ||
  "Code Destiny"
).trim();

export const SUPPORT_CONTACT_NAME = (
  process.env.NEXT_PUBLIC_SUPPORT_CONTACT_NAME ||
  process.env.SUPPORT_CONTACT_NAME ||
  ""
).trim();

export const SUPPORT_PHONE = (
  process.env.NEXT_PUBLIC_SUPPORT_PHONE ||
  process.env.SUPPORT_PHONE ||
  ""
).trim();

export const SUPPORT_CONTACT_LABEL = [
  SUPPORT_CONTACT_NAME,
  SUPPORT_PHONE,
  configuredSupportEmail,
].filter(Boolean).join(" · ") || "고객센터";

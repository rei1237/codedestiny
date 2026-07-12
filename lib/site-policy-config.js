export const SUPPORT_EMAIL = (
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ||
  process.env.SUPPORT_EMAIL ||
  process.env.CONTACT_EMAIL ||
  "admin@code-destiny.com"
).trim();

export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;

export const OPERATOR_NAME = (
  process.env.NEXT_PUBLIC_OPERATOR_NAME ||
  process.env.OPERATOR_NAME ||
  "Code Destiny"
).trim();

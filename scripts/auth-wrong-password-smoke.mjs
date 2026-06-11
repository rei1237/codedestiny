const BASE = process.env.AUTH_SMOKE_BASE || "https://code-destiny.com";
const email = `qa.auth.${Date.now()}@example.com`;
const pass = "QaTest!23456";
const bad = "WrongPass!23456";
const headers = { "Content-Type": "application/json" };

try {
  const reg = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "QA User",
      email,
      password: pass,
      phoneNumber: "01012345678",
      birthDate: "1992-06-15",
      birthTime: "12:30",
      gender: "OTHER",
    }),
  });

  const wrong = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password: bad }),
  });

  const login = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password: pass }),
  });

  console.log(`TEST_EMAIL=${email}`);
  console.log(`REGISTER_STATUS=${reg.status}`);
  console.log(`WRONG_PASSWORD_LOGIN_STATUS=${wrong.status}`);
  console.log(`LOGIN_STATUS=${login.status}`);

  if (wrong.status !== 401 || login.status !== 200) {
    process.exit(2);
  }
} catch (error) {
  console.error(error);
  process.exit(1);
}

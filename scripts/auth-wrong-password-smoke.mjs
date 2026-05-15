const BASE = process.env.AUTH_SMOKE_BASE || "https://code-destiny.com";
const email = `qa.auth.${Date.now()}@example.com`;
const pass = "QaTest!23456";
const bad = "WrongPass!23456";
const headers = { "Content-Type": "application/json" };

function isRetryableStatus(status) {
  const code = Number(status || 0);
  return code === 408 || code === 425 || code === 429 || (code >= 500 && code <= 504);
}

async function requestWithRetry(path, init, maxAttempts = 3) {
  let last = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(`${BASE}${path}`, init);
    last = response;
    if (!isRetryableStatus(response.status) || attempt >= maxAttempts) {
      return response;
    }
  }
  return last;
}

try {
  const reg = await requestWithRetry(`/api/auth/register`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "QA User",
      email,
      password: pass,
      birthDate: "1992-06-15",
      birthTime: "12:30",
      gender: "OTHER",
    }),
  });

  const wrong = await requestWithRetry(`/api/auth/login`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password: bad }),
  });

  const login = await requestWithRetry(`/api/auth/login`, {
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

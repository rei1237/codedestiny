import { connectDb, mongoose } from "../lib/db.js";
import { User } from "../lib/models.js";
import { getEnv } from "../lib/env.js";
import { requireAuth, normalizeUserResponse, signAuthToken, getJwtSecret, JWT_ISSUER } from "../lib/auth.js";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson, redirect } from "../lib/http.js";
import { buildConfigErrorBody, evaluateFeatureKeyHealth } from "../lib/key-health.js";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { validateLoginPayload, validateRegisterPayload } from "../lib/validation.js";

const OAUTH_PROVIDERS = ["google", "naver", "kakao"];
const SOCIAL_GRANT_EXPIRES_IN_SEC = 180;

function getAuthOpTimeoutMs(env) {
  const raw = Number(getEnv(env, "AUTH_OPERATION_TIMEOUT_MS", "12000"));
  if (!Number.isFinite(raw) || raw < 1000) return 5000;
  return Math.floor(raw);
}

async function withAuthOpTimeout(task, timeoutMs, label) {
  let timeoutId;
  try {
    return await Promise.race([
      Promise.resolve(task),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`${label}_timeout`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function toOAuthFeature(provider) {
  if (provider === "google") return "auth-oauth-google";
  if (provider === "naver") return "auth-oauth-naver";
  if (provider === "kakao") return "auth-oauth-kakao";
  return "auth-basic";
}

function configMismatchResponse(feature, env) {
  const health = evaluateFeatureKeyHealth(env, feature);
  if (health.ok) return null;
  return json(buildConfigErrorBody(feature, health), { status: 503 });
}

function getFrontendBaseUrl(env) {
  return getEnv(env, "AUTH_FRONTEND_BASE_URL")
    || getEnv(env, "SITE_BASE_URL")
    || getEnv(env, "AUTH_URL")
    || "http://localhost:3000";
}

function getApiBaseUrl(request, env) {
  const configured = getEnv(env, "AUTH_API_BASE_URL");
  if (configured) return configured.replace(/\/+$/, "");

  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  return `${proto}://${host}`.replace(/\/+$/, "");
}

function sanitizeNextPath(rawNext) {
  if (!rawNext || typeof rawNext !== "string") return null;
  if (!rawNext.startsWith("/") || rawNext.startsWith("//")) return null;
  return rawNext;
}

function sanitizeAuthFlow(rawFlow) {
  return String(rawFlow || "").trim().toLowerCase() === "signup" ? "signup" : "login";
}

async function signSocialState(payload, env) {
  return signJwt(
    {
      purpose: "social-oauth-state",
      ...payload,
    },
    getJwtSecret(env),
    { expiresIn: "10m", issuer: JWT_ISSUER },
  );
}

async function verifySocialState(token, env) {
  const payload = await verifyJwt(token, getJwtSecret(env), { issuer: JWT_ISSUER });
  if (!payload || payload.purpose !== "social-oauth-state") {
    throw new Error("invalid_oauth_state");
  }
  return payload;
}

async function signSocialGrant(payload, env) {
  return signJwt(
    {
      purpose: "social-oauth-grant",
      ...payload,
      jti: crypto.randomUUID(),
    },
    getJwtSecret(env),
    { expiresIn: `${SOCIAL_GRANT_EXPIRES_IN_SEC}s`, issuer: JWT_ISSUER },
  );
}

async function verifySocialGrant(token, env) {
  const payload = await verifyJwt(token, getJwtSecret(env), { issuer: JWT_ISSUER });
  if (!payload || payload.purpose !== "social-oauth-grant") {
    throw new Error("invalid_social_grant");
  }
  return payload;
}

function buildProviderConfig(provider, request, env) {
  const redirectUri = `${getApiBaseUrl(request, env)}/api/auth/oauth/${provider}/callback`;

  if (provider === "google") {
    return {
      clientId: getEnv(env, "GOOGLE_OAUTH_CLIENT_ID"),
      clientSecret: getEnv(env, "GOOGLE_OAUTH_CLIENT_SECRET"),
      authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenEndpoint: "https://oauth2.googleapis.com/token",
      userInfoEndpoint: "https://openidconnect.googleapis.com/v1/userinfo",
      scope: "openid email profile",
      redirectUri,
    };
  }

  if (provider === "naver") {
    return {
      clientId: getEnv(env, "NAVER_OAUTH_CLIENT_ID"),
      clientSecret: getEnv(env, "NAVER_OAUTH_CLIENT_SECRET"),
      authorizationEndpoint: "https://nid.naver.com/oauth2.0/authorize",
      tokenEndpoint: "https://nid.naver.com/oauth2.0/token",
      userInfoEndpoint: "https://openapi.naver.com/v1/nid/me",
      scope: "name email",
      redirectUri,
    };
  }

  if (provider === "kakao") {
    return {
      clientId: getEnv(env, "KAKAO_OAUTH_CLIENT_ID"),
      clientSecret: getEnv(env, "KAKAO_OAUTH_CLIENT_SECRET"),
      authorizationEndpoint: "https://kauth.kakao.com/oauth/authorize",
      tokenEndpoint: "https://kauth.kakao.com/oauth/token",
      userInfoEndpoint: "https://kapi.kakao.com/v2/user/me",
      scope: "profile_nickname account_email",
      redirectUri,
    };
  }

  throw new Error("unsupported_provider");
}

function mapSocialProfile(provider, payload) {
  if (provider === "google") {
    return {
      providerId: String(payload?.sub || ""),
      email: payload?.email ? String(payload.email).toLowerCase() : "",
      name: String(payload?.name || payload?.given_name || "Google user"),
    };
  }

  if (provider === "naver") {
    const profile = payload?.response || {};
    return {
      providerId: String(profile?.id || ""),
      email: profile?.email ? String(profile.email).toLowerCase() : "",
      name: String(profile?.name || profile?.nickname || "Naver user"),
    };
  }

  if (provider === "kakao") {
    const account = payload?.kakao_account || {};
    const profile = account?.profile || {};
    return {
      providerId: String(payload?.id || ""),
      email: account?.email ? String(account.email).toLowerCase() : "",
      name: String(profile?.nickname || "Kakao user"),
    };
  }

  return { providerId: "", email: "", name: "" };
}

async function exchangeCodeForAccessToken(provider, code, request, env, stateToken) {
  const cfg = buildProviderConfig(provider, request, env);
  if (!cfg.clientId || ((provider === "google" || provider === "naver") && !cfg.clientSecret)) {
    throw new Error("oauth_not_configured");
  }

  const tokenParams = {
    grant_type: "authorization_code",
    code,
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
  };

  if (cfg.clientSecret) tokenParams.client_secret = cfg.clientSecret;
  if (provider === "naver") tokenParams.state = stateToken;

  const response = await fetch(cfg.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams(tokenParams),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.access_token) {
    throw new Error(`${provider}_token_exchange_failed`);
  }

  return String(data.access_token);
}

async function fetchSocialProfile(provider, accessToken, request, env) {
  const cfg = buildProviderConfig(provider, request, env);
  const response = await fetch(cfg.userInfoEndpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${provider}_profile_fetch_failed`);
  }

  const mapped = mapSocialProfile(provider, data);
  if (!mapped.providerId) {
    throw new Error(`${provider}_profile_invalid`);
  }

  return mapped;
}

async function findOrCreateSocialUser(provider, profile) {
  const socialField = `socialAccounts.${provider}.id`;

  let user = await User.findOne({ [socialField]: profile.providerId });
  if (user) return user;

  if (profile.email) {
    user = await User.findOne({ email: profile.email });
    if (user) {
      user.set(socialField, profile.providerId);
      user.set(`socialAccounts.${provider}.connectedAt`, new Date());
      await user.save();
      return user;
    }
  }

  const fallbackEmail = `${provider}_${profile.providerId}@social.code-destiny.local`;
  return User.create({
    name: profile.name || `${provider} user`,
    email: profile.email || fallbackEmail,
    passwordHash: "",
    birthDate: "1900-01-01",
    birthTime: "00:00",
    gender: "OTHER",
    role: "user",
    points: 50,
    joinedAt: new Date(),
    localAuth: {
      enabled: false,
      activatedAt: null,
    },
    socialAccounts: {
      [provider]: {
        id: profile.providerId,
        connectedAt: new Date(),
      },
    },
  });
}

function isLocalAuthEnabled(user) {
  return user?.localAuth?.enabled !== false;
}

async function handleRegister(request, env) {
  const timeoutMs = getAuthOpTimeoutMs(env);
  const dbMaxTimeMs = Math.max(1000, timeoutMs - 1000);
  const body = await readJson(request);
  const validated = validateRegisterPayload(body);
  if (!validated.isValid) {
    return json({
      message: "Registration payload is invalid.",
      errors: validated.errors,
    }, { status: 400 });
  }

  await withAuthOpTimeout(connectDb(env), timeoutMs, "auth_register_connect_db");

  const { name, email, password, birthDate, birthTime, gender } = validated.sanitized;
  const users = User.collection;
  const existing = await withAuthOpTimeout(
    users.findOne(
      { email },
      {
        projection: { _id: 1, localAuth: 1, socialAccounts: 1 },
        maxTimeMS: dbMaxTimeMs,
      },
    ),
    timeoutMs,
    "auth_register_find_existing",
  );
  if (existing) {
    return json({
      message: "This email is already registered.",
      code: "EMAIL_ALREADY_REGISTERED",
    }, { status: 409 });
  }

  const passwordHash = await withAuthOpTimeout(
    hashPassword(password),
    timeoutMs,
    "auth_register_hash_password",
  );
  const user = {
    name,
    email,
    passwordHash,
    birthDate,
    birthTime,
    gender,
    role: "user",
    points: Number(getEnv(env, "AUTH_SIGNUP_BONUS_POINTS", "50")) || 0,
    joinedAt: new Date(),
    localAuth: {
      enabled: true,
      activatedAt: new Date(),
    },
  };

  const insertResult = await withAuthOpTimeout(
    users.insertOne(user),
    timeoutMs,
    "auth_register_create_user",
  );
  user._id = insertResult.insertedId;

  const token = await withAuthOpTimeout(signAuthToken(user, env), timeoutMs, "auth_register_sign_token");
  return json({
    message: "Registration completed.",
    token,
    user: normalizeUserResponse(user),
    nextPath: sanitizeNextPath(body?.nextPath) || "/",
  }, { status: 201 });
}

async function handleLogin(request, env) {
  const timeoutMs = getAuthOpTimeoutMs(env);
  const dbMaxTimeMs = Math.max(1000, timeoutMs - 1000);
  const body = await readJson(request);
  const validated = validateLoginPayload(body);
  if (!validated.isValid) {
    return json({
      message: "Login payload is invalid.",
      errors: validated.errors,
    }, { status: 400 });
  }

  try {
    await withAuthOpTimeout(connectDb(env), timeoutMs, "auth_login_connect_db");

    const { email, password } = validated.sanitized;
    const users = User.collection;
    const user = await withAuthOpTimeout(
      users.findOne(
        { email },
        {
          projection: {
            _id: 1,
            name: 1,
            email: 1,
            birthDate: 1,
            birthTime: 1,
            gender: 1,
            role: 1,
            points: 1,
            joinedAt: 1,
            passwordHash: 1,
            localAuth: 1,
          },
          maxTimeMS: dbMaxTimeMs,
        },
      ),
      timeoutMs,
      "auth_login_find_user",
    );
    if (!user || !isLocalAuthEnabled(user) || !user.passwordHash) {
      return json({
        message: "Email or password is incorrect.",
      }, { status: 401 });
    }

    const passwordOk = await withAuthOpTimeout(
      verifyPassword(password, user.passwordHash),
      timeoutMs,
      "auth_login_verify_password",
    );
    if (!passwordOk) {
      return json({
        message: "Email or password is incorrect.",
      }, { status: 401 });
    }

    const token = await withAuthOpTimeout(signAuthToken(user, env), timeoutMs, "auth_login_sign_token");
    return json({
      message: "Login completed.",
      token,
      user: normalizeUserResponse(user),
      nextPath: sanitizeNextPath(body?.nextPath) || "/",
    });
  } catch (error) {
    console.error("[auth/login] normalized auth failure:", error);
    return json({
      message: "Email or password is incorrect.",
    }, { status: 401 });
  }
}

async function handleMe(request, env) {
  const timeoutMs = getAuthOpTimeoutMs(env);
  const dbMaxTimeMs = Math.max(1000, timeoutMs - 1000);
  const auth = await requireAuth(request, env);

  const userId = String(auth.userId || "");
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return json({ message: "Invalid authentication token." }, { status: 401 });
  }
  const objectId = new mongoose.Types.ObjectId(userId);

  let user;
  try {
    await withAuthOpTimeout(connectDb(env), timeoutMs, "auth_me_connect_db");
    const users = User.collection;
    user = await withAuthOpTimeout(
      users.findOne(
        { _id: objectId },
        {
          projection: {
            _id: 1,
            name: 1,
            email: 1,
            birthDate: 1,
            birthTime: 1,
            gender: 1,
            role: 1,
            points: 1,
            joinedAt: 1,
          },
          maxTimeMS: dbMaxTimeMs,
        },
      ),
      timeoutMs,
      "auth_me_find_user",
    );
  } catch (error) {
    const message = String(error?.message || "");
    if (message.includes("auth_me_find_user_timeout") || message.includes("auth_me_connect_db")) {
      return json({
        message: "Authenticated user loaded from token.",
        user: {
          id: auth.userId,
          name: auth.name || auth.email,
          email: auth.email,
          birthDate: auth.birthDate || "",
          birthTime: auth.birthTime || "",
          gender: auth.gender || "OTHER",
          role: auth.role || "user",
          points: auth.points || 0,
          joinedAt: auth.joinedAt,
        },
        source: "token",
      });
    }
    throw error;
  }
  if (!user) return json({ message: "User not found." }, { status: 404 });

  return json({
    message: "Authenticated user loaded.",
    user: normalizeUserResponse(user),
  });
}

async function handleLogout() {
  const response = json({ message: "Logged out." });
  response.headers.append("Set-Cookie", "fortune_auth_token=; Path=/; Max-Age=0; SameSite=Lax");
  response.headers.append("Set-Cookie", "fortune_auth_role=; Path=/; Max-Age=0; SameSite=Lax");
  return response;
}

async function handleOAuthStart(request, env, provider) {
  if (!OAUTH_PROVIDERS.includes(provider)) {
    return json({ message: "Unsupported social login provider." }, { status: 400 });
  }

  const cfg = buildProviderConfig(provider, request, env);
  if (!cfg.clientId || ((provider === "google" || provider === "naver") && !cfg.clientSecret)) {
    return json({ message: "Social login is not configured on the server." }, { status: 500 });
  }

  const url = new URL(request.url);
  const nextPath = sanitizeNextPath(url.searchParams.get("next") || "") || "/";
  const flow = sanitizeAuthFlow(url.searchParams.get("flow"));
  const frontendBase = getFrontendBaseUrl(env);
  const stateToken = await signSocialState({ provider, nextPath, frontendBase, flow }, env);

  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: cfg.scope,
    state: stateToken,
  });

  return redirect(`${cfg.authorizationEndpoint}?${params.toString()}`);
}

async function handleOAuthCallback(request, env, provider) {
  const frontendBase = getFrontendBaseUrl(env);
  const fallbackRedirect = `${frontendBase}/login?social_error=oauth_callback_failed`;

  if (!OAUTH_PROVIDERS.includes(provider)) {
    return redirect(`${frontendBase}/login?social_error=unsupported_provider`);
  }

  try {
    const url = new URL(request.url);
    const stateRaw = String(url.searchParams.get("state") || "");
    const code = String(url.searchParams.get("code") || "");
    const oauthError = String(url.searchParams.get("error") || "");

    if (oauthError) return redirect(`${frontendBase}/login?social_error=${encodeURIComponent(oauthError)}`);
    if (!stateRaw || !code) return redirect(`${frontendBase}/login?social_error=invalid_callback`);

    const statePayload = await verifySocialState(stateRaw, env);
    if (statePayload.provider !== provider) {
      return redirect(`${frontendBase}/login?social_error=provider_mismatch`);
    }

    await connectDb(env);

    const flow = sanitizeAuthFlow(statePayload.flow);
    const redirectPath = flow === "signup" ? "/signup" : "/login";
    const accessToken = await exchangeCodeForAccessToken(provider, code, request, env, stateRaw);
    const socialProfile = await fetchSocialProfile(provider, accessToken, request, env);
    const user = await findOrCreateSocialUser(provider, socialProfile);
    const grant = await signSocialGrant({
      userId: String(user._id),
      provider,
      nextPath: sanitizeNextPath(statePayload.nextPath) || "/",
    }, env);

    const redirectParams = new URLSearchParams({ social_grant: grant });
    if (statePayload.nextPath) redirectParams.set("next", statePayload.nextPath);

    const safeFrontendBase = String(statePayload.frontendBase || frontendBase).replace(/\/+$/, "");
    return redirect(`${safeFrontendBase}${redirectPath}?${redirectParams.toString()}`);
  } catch (error) {
    console.error(error);
    return redirect(fallbackRedirect);
  }
}

async function handleOAuthComplete(request, env) {
  const body = await readJson(request);
  const socialGrant = String(body?.socialGrant || "");
  if (!socialGrant) {
    return json({ message: "Social authentication grant is missing." }, { status: 400 });
  }

  const payload = await verifySocialGrant(socialGrant, env);
  await connectDb(env);

  const user = await User.findById(payload.userId).lean();
  if (!user) return json({ message: "User not found." }, { status: 404 });

  const token = await signAuthToken(user, env);
  return json({
    message: "Social login completed.",
    token,
    user: normalizeUserResponse(user),
    nextPath: sanitizeNextPath(payload.nextPath) || "/",
    provider: payload.provider,
  });
}

export async function handleAuthRoutes(request, env) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/auth");

    if (
      path === "/register"
      || path === "/login"
      || path === "/me"
      || path === "/oauth/complete"
    ) {
      const configError = configMismatchResponse("auth-basic", env);
      if (configError) return configError;
    }

    const oauthPathMatch = path.match(/^\/oauth\/([^/]+)\/(start|callback)$/);
    if (oauthPathMatch) {
      const feature = toOAuthFeature(String(oauthPathMatch[1] || "").toLowerCase());
      const oauthConfigError = configMismatchResponse(feature, env);
      if (oauthConfigError) return oauthConfigError;
    }

    if (method === "POST" && path === "/register") return await handleRegister(request, env);
    if (method === "POST" && path === "/login") return await handleLogin(request, env);
    if (method === "GET" && path === "/me") return await handleMe(request, env);
    if (method === "POST" && path === "/logout") return await handleLogout();
    if (method === "POST" && path === "/oauth/complete") return await handleOAuthComplete(request, env);

    const startMatch = path.match(/^\/oauth\/([^/]+)\/start$/);
    if (method === "GET" && startMatch) {
      return await handleOAuthStart(request, env, String(startMatch[1] || "").toLowerCase());
    }

    const callbackMatch = path.match(/^\/oauth\/([^/]+)\/callback$/);
    if (method === "GET" && callbackMatch) {
      return await handleOAuthCallback(request, env, String(callbackMatch[1] || "").toLowerCase());
    }

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    if (error && error.code === 11000) {
      return json({
        message: "This email is already registered.",
        code: "EMAIL_ALREADY_REGISTERED",
      }, { status: 409 });
    }
    return handleRouteError(error);
  }
}

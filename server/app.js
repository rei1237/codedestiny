const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const paymentRoutes = require("./routes/payment.routes");
const fortuneRoutes = require("./routes/fortune.routes");
const kasiRoutes = require("./routes/kasi.routes");
const tarotRoutes = require("./routes/tarot.routes");

const app = express();

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const defaultAllowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:4000",
  "https://code-destiny.com",
  "https://www.code-destiny.com",
  "https://code-destiny.pages.dev",
];

const configuredOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((v) => v.trim()).filter(Boolean)
  : [];

const allowedOrigins = new Set([...defaultAllowedOrigins, ...configuredOrigins]);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;

  try {
    const { hostname, protocol } = new URL(origin);
    const isHttp = protocol === "http:" || protocol === "https:";
    if (!isHttp) return false;
    // Allow subdomains like api.code-destiny.com or preview domains under code-destiny.com.
    if (hostname === "code-destiny.com" || hostname.endsWith(".code-destiny.com")) return true;
    // Allow Cloudflare Pages preview (code-destiny.pages.dev)
    if (hostname.endsWith(".pages.dev")) return true;
    return false;
  } catch (_) {
    return false;
  }
}

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use("/api", globalLimiter);
app.use("/api/auth", authLimiter);

app.get("/api/health", (req, res) => {
  res.status(200).json({ ok: true, message: "API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/fortune", fortuneRoutes);
app.use("/api/kasi", kasiRoutes);
app.use("/api/tarot", tarotRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "요청한 API 경로를 찾을 수 없습니다." });
});

app.use((err, req, res, next) => {
  console.error("[API ERROR]", err);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(err.status || 500).json({
    message: err.message || "서버 내부 오류가 발생했습니다.",
  });
});

module.exports = app;

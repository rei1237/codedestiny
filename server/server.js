const path = require("path");
const dotenv = require("dotenv");

// Load root env first, then server/.env to allow server-specific override.
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
dotenv.config({ path: path.resolve(__dirname, ".env"), override: true });

const app = require("./app");
const connectDB = require("./config/db");

const port = Number(process.env.API_PORT || process.env.PORT || 4000);

async function startServer() {
  try {
    await connectDB();

    app.listen(port, () => {
      const url = `http://localhost:${port}`;
      console.log("");
      console.log("  \u279C  API 서버 주소: " + url);
      console.log("  \u279C  헬스체크: " + url + "/api/health");
      console.log("");
    });
  } catch (error) {
    console.error("[API] failed to start:", error.message);
    process.exit(1);
  }
}

process.on("unhandledRejection", (reason) => {
  console.error("[API] unhandledRejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[API] uncaughtException:", error);
  process.exit(1);
});

startServer();

const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const source = fs.readFileSync(path.resolve(__dirname, "../../worker/index.js"), "utf8");
const defaults = source.slice(source.indexOf("const DEFAULT_ALLOWED_ORIGINS ="), source.indexOf("const NO_CACHE_CONTROL ="));
const functions = source.slice(source.indexOf("function normalizeOrigin("), source.indexOf("function isLocalWorkerRequest("));
const context = vm.createContext({ URL, getEnv: (env, key) => env[key] || "" });
vm.runInContext(defaults + functions, context);

test("iOS CORS는 정확한 로컬 앱 출처만 허용한다", () => {
  for (const origin of ["capacitor://localhost", "https://localhost"]) {
    context.candidate = origin;
    assert.equal(vm.runInContext('isAllowedOrigin(candidate, { NODE_ENV: "production" })', context), true);
  }
  for (const origin of ["null", "capacitor://localhost:3000", "capacitor://localhost.evil.example", "capacitor://other", "https://localhost:9191"]) {
    context.candidate = origin;
    assert.equal(vm.runInContext('isAllowedOrigin(candidate, { NODE_ENV: "production" })', context), false);
  }
});

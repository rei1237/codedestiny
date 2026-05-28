const PDF_FAST_DB_ENV_OVERRIDES = Object.freeze({
  // Keep premium PDF access checks below edge timeout windows under transient DB latency.
  MONGO_WORKER_CONNECT_GUARD_MS: "9000",
  MONGO_SERVER_SELECTION_TIMEOUT_MS: "6500",
  MONGO_CONNECT_TIMEOUT_MS: "6500",
  MONGO_SOCKET_TIMEOUT_MS: "12000",
  MONGO_WORKER_CONNECT_RETRIES: "0",
  MONGO_IP_FAMILY: "4",
});

export function withPdfFastDbEnv(env = {}) {
  return {
    ...env,
    ...PDF_FAST_DB_ENV_OVERRIDES,
  };
}

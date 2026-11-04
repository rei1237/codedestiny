// Preload before Next: no environment-file secrets or Swiss/real DB modules.
require('../../../scripts/lib/mock-network-guard.cjs');
const Module = require('node:module');
const originalLoad = Module._load;
const forbidden = /swiss(?!-franc)|sweph|swisseph|jyotish|[\\/]worker[\\/]lib[\\/](?:db|models)\./i;
Module._load = function (request, parent, ...rest) {
  if (forbidden.test(request)) throw new Error('AUDIT_FORBIDDEN_MODULE');
  const loaded = originalLoad.call(this, request, parent, ...rest);
  if (request === '@next/env' || /[\\/]@next[\\/]env[\\/]/.test(request)) {
    return { ...loaded, __esModule: true, loadEnvConfig: () => ({ combinedEnv: process.env, parsedEnv: {}, loadedEnvFiles: [] }) };
  }
  if (/config/.test(request) && /[\\/]next[\\/]dist[\\/]/.test(parent?.filename || '')
      && /[\\/]next[\\/]dist[\\/]server[\\/]config\.js$/.test(Module._resolveFilename(request, parent))) {
    return { ...loaded, __esModule: true, default: async (...args) => {
      const config = await loaded.default(...args);
      return globalThis.__auditConfigureNext ? globalThis.__auditConfigureNext(config) : config;
    } };
  }
  return loaded;
};

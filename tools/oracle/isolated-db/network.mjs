import net from 'node:net';
import tls from 'node:tls';
import dns from 'node:dns';
import dgram from 'node:dgram';
import http from 'node:http';
import https from 'node:https';
import { syncBuiltinESMExports } from 'node:module';

// Process-local accidental-I/O guard, not an OS sandbox. No HTTP/PG even in DB mode.
export function guardNetwork() {
  let allowed = null;
  const deny = () => { throw Object.assign(new Error('AUDIT_NETWORK_DISABLED'), { code: 'AUDIT_NETWORK_DISABLED' }); };
  const original = net.Socket.prototype.connect;
  net.Socket.prototype.connect = function (...args) {
    const value = Array.isArray(args[0]) ? args[0][0] : args[0];
    const host = typeof value === 'object' ? value?.host : args[1];
    const port = typeof value === 'object' ? value?.port : value;
    if (!allowed || host !== allowed.host || Number(port) !== allowed.port || value?.path) deny();
    return original.apply(this, args);
  };
  // URI options cannot enable TLS/proxies/SRV. This runner is local disposable Mongo only.
  tls.connect = dgram.createSocket = deny;
  for (const target of [dns, dns.promises]) for (const key of Object.keys(target)) {
    if (typeof target[key] === 'function' && /^(resolve|lookup|reverse)/.test(key)) target[key] = deny;
  }
  for (const target of [http, https]) target.get = target.request = deny;
  globalThis.fetch = deny;
  globalThis.WebSocket = class { constructor() { deny(); } };
  syncBuiltinESMExports();
  return { allowMongo(target) { allowed = { host: target.host, port: target.port }; } };
}

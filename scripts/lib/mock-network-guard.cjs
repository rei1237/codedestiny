// Preloaded in mock development and inherited by Next/API Node subprocesses.
// This is a Node transport guard, not an operating-system firewall.
const net = require('node:net');
const tls = require('node:tls');
const dns = require('node:dns');
const dgram = require('node:dgram');
const { syncBuiltinESMExports } = require('node:module');
function assertLoopback(host) {
  if (!['127.0.0.1', '::1', '[::1]', 'localhost', '::ffff:127.0.0.1'].includes(String(host).toLowerCase())) {
    const error = new Error('MOCK_NETWORK_BLOCKED: external network is disabled');
    error.code = 'MOCK_NETWORK_BLOCKED';
    throw error;
  }
}
function checkConnect(args) {
  const options = Array.isArray(args[0]) ? args[0][0] : args[0];
  if (typeof options === 'object' && options !== null) {
    if (!options.path) assertLoopback(options.host || options.hostname || 'localhost');
  } else if (typeof options === 'number') {
    assertLoopback(typeof args[1] === 'string' ? args[1] : 'localhost');
  }
}
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  checkConnect(args);
  return connect.apply(this, args);
};
const tlsConnect = tls.connect;
tls.connect = function (...args) {
  checkConnect(args);
  return tlsConnect.apply(this, args);
};
const originalFetch = globalThis.fetch;
globalThis.fetch = async function (input, init) {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  assertLoopback(url.hostname);
  return originalFetch(input, init);
};
// Mongo SRV lookups and UDP are network traffic too, before a TCP connection.
for (const target of [dns, dns.promises]) {
  for (const key of Object.keys(target)) {
    if ((key.startsWith('resolve') || key === 'lookup' || key === 'reverse') && typeof target[key] === 'function') {
      const original = target[key];
      target[key] = function (host, ...args) { assertLoopback(host); return original.call(this, host, ...args); };
    }
  }
}
dgram.createSocket = () => { throw new Error('MOCK_NETWORK_BLOCKED: UDP is disabled'); };
syncBuiltinESMExports();

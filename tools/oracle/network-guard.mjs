import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import dgram from 'node:dgram';
import { syncBuiltinESMExports } from 'node:module';

export function blockNetwork() {
  const deny = () => { throw new Error('NETWORK_DISABLED_IN_ORACLE_HARNESS'); };
  globalThis.fetch = deny;
  globalThis.WebSocket = class { constructor() { deny(); } };
  for (const module of [http, https]) { module.request = deny; module.get = deny; }
  net.connect = net.createConnection = tls.connect = dgram.createSocket = deny;
  net.Socket.prototype.connect = deny;
  syncBuiltinESMExports();
}

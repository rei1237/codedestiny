import next from 'next';
import { createServer, request } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

if (process.env.CD_MOCK_DEV !== '1' || !process.send) throw new Error('Only the mock parent runner may start this server');
const root = process.cwd(), folder = '.tmp/engine-audit-next';
fs.mkdirSync(folder, { recursive: true });
fs.writeFileSync(`${folder}/tsconfig.json`, JSON.stringify({ extends: '../../tsconfig.json',
  include: ['../../next-env.d.ts', '../../app/**/*.ts', '../../app/**/*.tsx', './.next/types/**/*.ts'], exclude: ['../../node_modules'] }));
const configuredConfigs = new WeakSet();
globalThis.__auditConfigureNext = config => {
if (configuredConfigs.has(config)) return config;
configuredConfigs.add(config);
const webpack = config.webpack;
config.distDir = `${folder}/.next`;
config.typescript = { ...config.typescript, tsconfigPath: `${folder}/tsconfig.json` };
config.webpack = (value, context) => {
  const configured = webpack(value, context);
  // The shared PC cannot inflate repeated full-app disk caches within its
  // memory budget. This fixture-only setting changes caching, not app modules.
  configured.cache = false;
  configured.plugins.push({ apply(compiler) {
    compiler.hooks.normalModuleFactory.tap('AuditSwissBlock', factory => {
      factory.hooks.beforeResolve.tap('AuditSwissBlock', data => {
        if (data && /swiss(?!-franc)|sweph|swisseph|jyotish|worker[\\/]lib[\\/](?:db|models)\./i.test(data.request)) {
          throw new Error('AUDIT_FORBIDDEN_MODULE');
        }
      });
    });
    compiler.hooks.done.tap('AuditSourceInventory', stats => {
      const files = [...stats.compilation.fileDependencies].filter(file => file.startsWith(root + path.sep))
        .map(file => path.relative(root, file).replaceAll('\\', '/'));
      process.send({ type: 'inventory', compiler: compiler.name || 'default', files });
    });
  } });
  return configured;
};
return config;
};
const app = next({ dev: true, dir: root });
await app.prepare();
const handler = app.getRequestHandler();
const server = createServer((req, res) => {
  if (req.url.startsWith('/__audit/')) {
    const proxy = request({ hostname: '127.0.0.1', port: Number(process.env.LOCAL_DEV_AUTH_API_PORT), path: req.url,
      method: req.method, headers: req.headers }, reply => { res.writeHead(reply.statusCode, reply.headers); reply.pipe(res); });
    proxy.on('error', () => { res.writeHead(502).end('Mock fixture unavailable'); });
    req.pipe(proxy);
  } else void handler(req, res);
});
server.on('upgrade', app.getUpgradeHandler());
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
process.send({ type: 'ready', origin: `http://127.0.0.1:${server.address().port}` });
process.on('message', async message => {
  if (message !== 'stop') return;
  server.closeAllConnections(); server.close(); await app.close(); process.exit(0);
});

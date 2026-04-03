import { readFileSync, writeFileSync } from 'fs';

const BASE = 'c:\\Users\\Neo\\Desktop\\Code Destiny Main\\';

const files = [
  'index.html',
  'public/index.html',
  'public/static/index.html',
  'public/zh-cn/index.html',
  'public/hi-in/index.html',
  'public/de-de/index.html',
  'public/nl-nl/index.html',
  'public/fr-fr/index.html',
  'public/ms-my/index.html',
  'public/ja-jp/index.html',
  'public/es-es/index.html',
  'public/en-us/index.html',
];

// ASCII-only pattern that uniquely identifies the end of isAdminUser's try block
const OLD = "if (pair[0] === 'fortune_auth_role' && decodeURIComponent(pair[1] || '') === 'admin') return true;\n      }\n    } catch (_e) {}\n    return false;\n  }";
const NEW = "if (pair[0] === 'fortune_auth_role' && decodeURIComponent(pair[1] || '') === 'admin') return true;\n      }\n    }\n    // 3) flower_admin_token: admin panel login -> all features available without coins\n    try { if (sessionStorage.getItem('flower_admin_token')) return true; } catch (_ss) {}\n  } catch (_e) {}\n  return false;\n  }";

for (const f of files) {
  const p = BASE + f.replace(/\//g, '\\');
  try {
    let c = readFileSync(p, 'utf8');
    if (c.includes(OLD)) {
      c = c.split(OLD).join(NEW);
      writeFileSync(p, c, 'utf8');
      console.log('OK: ' + f);
    } else {
      console.log('MISS: ' + f);
    }
  } catch(e) {
    console.log('ERR: ' + f + ' ' + e.message);
  }
}

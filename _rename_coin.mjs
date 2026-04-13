import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, extname, relative } from 'path';

const FROM = '\uAF43\uAF43\uB3FC\uC9C0'; // 꽃꽃돼지
const TO   = '\uAF43\uB3FC\uC9C0';       // 꽃돼지
const SKIP_DIRS = new Set(['node_modules','.next','.open-next','build','out','.git','_scripts-archive','memory']);
const ALLOWED_EXT = new Set(['.html','.js','.jsx','.ts','.tsx','.css','.md','.json','.txt']);

function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(full);
    } else if (e.isFile() && ALLOWED_EXT.has(extname(e.name).toLowerCase())) {
      try {
        const src = readFileSync(full, 'utf8');
        if (!src.includes(FROM)) continue;
        writeFileSync(full, src.split(FROM).join(TO), 'utf8');
        console.log('REPLACED:', relative(process.cwd(), full));
      } catch (err) {
        console.error('ERR:', full, err.message);
      }
    }
  }
}

walk('.');
console.log('Done.');

import { promises as fs } from 'node:fs';
import path from 'node:path';

// Remove JSON whitespace, never reserialize values: large integers, -0, escaped
// strings and duplicate keys must retain their exact tokens in the app copy.
export function compactJson(source) {
  JSON.parse(source);
  return source.replace(/"(?:\\[\s\S]|[^"\\])*"|[\t\n\r ]+/g, token => token[0] === '"' ? token : '');
}

export async function compactMobileJson(directory) {
  const result = { total: 0, rewritten: 0, beforeBytes: 0, afterBytes: 0 };
  async function visit(folder) {
    for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (entry.isFile() && entry.name.endsWith('.json')) {
        const source = await fs.readFile(file, 'utf8');
        let compact;
        try { compact = compactJson(source); }
        catch { throw new Error(`Invalid mobile JSON: ${path.relative(directory, file)}`); }
        const before = Buffer.byteLength(source);
        const after = Buffer.byteLength(compact);
        result.total += 1;
        result.beforeBytes += before;
        result.afterBytes += after;
        if (after < before) {
          await fs.writeFile(file, compact, 'utf8');
          result.rewritten += 1;
        }
      }
    }
  }
  await visit(directory);
  return result;
}

import { readFileSync, writeFileSync } from 'fs';
const B = String.raw`c:\Users\Neo\Desktop\Code Destiny Main`;

for (const f of [B + String.raw`\js\saju-engine.js`, B + String.raw`\public\js\saju-engine.js`]) {
  let c = readFileSync(f, 'utf8');
  const lines = c.split('\n');
  let fixed = false;
  for (let i = 0; i < lines.length; i++) {
    // Fix any remaining bad sbxToggle onclick patterns
    if (lines[i].includes("sbxToggle(''+id+'',this)") || lines[i].includes("sbxToggle(''")) {
      lines[i] = lines[i]
        .replace(/onclick="sbxToggle\(''[^"]*'',this\)"/, 'onclick="sbxToggle(this.dataset.bxid,this)"')
        .replace(/onclick='sbxToggle\([^)]*\)'/, "onclick=\"sbxToggle(this.dataset.bxid,this)\"");
      // Also ensure data-bxid attribute exists
      if (!lines[i].includes('data-bxid=')) {
        lines[i] = lines[i].replace(
          /<button type="button"/,
          '<button type="button" data-bxid="'+'"'  // will be a placeholder
        );
      }
      console.log('[FIX pubjs] Line', i+1, ':', lines[i].trim().slice(0, 100));
      fixed = true;
    }
    // Also fix the button definition if data-bxid is missing but bxid ref exists via onclick
    if (lines[i].includes("'<button type=\"button\" onclick=\"sbxToggle(this.dataset.bxid,this)\"") && !lines[i].includes('data-bxid')) {
      lines[i] = lines[i].replace(
        "'<button type=\"button\" onclick=\"sbxToggle(this.dataset.bxid,this)\"",
        "'<button type=\"button\" data-bxid=\"'+id+'\" onclick=\"sbxToggle(this.dataset.bxid,this)\""
      );
      console.log('[FIX data-bxid missing] Line', i+1, ':', lines[i].trim().slice(0, 100));
      fixed = true;
    }
  }
  if (fixed) {
    writeFileSync(f, lines.join('\n'), 'utf8');
    console.log('Saved:', f);
  } else {
    console.log('Nothing to fix in:', f);
    const idx = lines.findIndex(l => l.includes('data-bxid'));
    if (idx >= 0) console.log('  btn line:', lines[idx].trim().slice(0, 120));
  }
}
console.log('Done.');

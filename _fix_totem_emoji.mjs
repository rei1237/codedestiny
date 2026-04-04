import { readFileSync, writeFileSync } from 'fs';

const FILES = [
  'c:/Users/Neo/Desktop/Code Destiny Main/js/services/animal-totem-content-engine.js',
  'c:/Users/Neo/Desktop/Code Destiny Main/public/js/services/animal-totem-content-engine.js',
];

// Map: line number (1-based) -> correct emoji
// These correspond to the broken emoji fields found in the file
const FIXES = [
  { id: 'cat',      lineHint: 8,   correct: '🐱' },
  { id: 'bluebird', lineHint: 46,  correct: '🐦' },
  { id: 'puppy',    lineHint: 59,  correct: '🐶' },
  { id: 'rabbit',   lineHint: 72,  correct: '🐰' },
  { id: 'tiger',    lineHint: 124, correct: '🐯' },
  { id: 'dolphin',  lineHint: 189, correct: '🐬' },
];

for (const filePath of FILES) {
  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch (e) {
    console.error(`Cannot read ${filePath}: ${e.message}`);
    continue;
  }

  const lines = content.split('\n');
  let changed = 0;

  for (const fix of FIXES) {
    // Search in a range of ±3 lines around the hint
    const start = Math.max(0, fix.lineHint - 4);
    const end   = Math.min(lines.length, fix.lineHint + 2);

    for (let i = start; i < end; i++) {
      const line = lines[i];
      // Match any line that has the animal id and an emoji field with broken chars
      // Broken chars appear as replacement chars (U+FFFD) or literal ? chars (0x3F)
      if (!line.includes(`"${fix.id}"`)) continue;
      // This is the id line - the emoji is on the same line (inline format) or the next line
      // Check if emoji is on this very line
      if (/emoji:\s*"/.test(line)) {
        const fixed = line.replace(/emoji:\s*"[^"]*"/, `emoji: "${fix.correct}"`);
        if (fixed !== line) {
          lines[i] = fixed;
          console.log(`Fixed ${fix.id} emoji on line ${i + 1} in ${filePath}`);
          changed++;
        }
        break;
      }
    }

    // Also handle multi-line format (id on one line, emoji on next few lines)
    for (let i = start; i < end; i++) {
      const line = lines[i];
      if (!line.includes(`id: "${fix.id}"`)) continue;
      // Look for emoji field on this line or within next 3 lines
      for (let j = i; j < Math.min(lines.length, i + 4); j++) {
        if (/emoji:\s*"/.test(lines[j])) {
          // Check if it contains broken character (non-printable range or FFFD)
          const hasCorrupt = /emoji:\s*"[\x00-\x08\x0E-\x1F\x7F-\x9F\uFFFD?]*"/.test(lines[j]);
          if (hasCorrupt) {
            const fixed = lines[j].replace(/emoji:\s*"[^"]*"/, `emoji: "${fix.correct}"`);
            if (fixed !== lines[j]) {
              lines[j] = fixed;
              console.log(`  Fixed ${fix.id} emoji (multiline) at line ${j + 1}`);
              changed++;
            }
          }
          break;
        }
      }
      break;
    }
  }

  if (changed > 0) {
    writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log(`✅ Saved ${filePath} (${changed} fixes)`);
  } else {
    console.log(`⚠️  No changes made to ${filePath} — trying byte-level fix...`);

    // Byte-level fallback: the broken chars may be 0x3F (?) or multi-byte sequences
    // Try replacing the specific pattern using regex with the known id context
    let c2 = content;
    for (const fix of FIXES) {
      // Match: id: "cat", ... emoji: "<broken>" 
      // or inline: id: "cat", name_ko: "...", emoji: "<broken>",
      const pattern = new RegExp(
        `(id:\\s*"${fix.id}"[^\\n]*\\n(?:[^\\n]*\\n){0,3}[^\\n]*emoji:\\s*")[^"]*(")`
      );
      const replaced = c2.replace(pattern, `$1${fix.correct}$2`);
      if (replaced !== c2) {
        console.log(`  Regex fixed ${fix.id}`);
        c2 = replaced;
        changed++;
      }
    }
    if (changed > 0) {
      writeFileSync(filePath, c2, 'utf8');
      console.log(`✅ Saved ${filePath} (fallback regex, ${changed} fixes)`);
    } else {
      console.log(`❌ Could not fix ${filePath} automatically`);
    }
  }
}

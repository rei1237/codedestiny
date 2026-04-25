import fs from 'node:fs';
const content = fs.readFileSync('_legacy_index_9106880.html', 'utf16le');
const start = content.indexOf('id="oracleCollection"');
const end = content.indexOf('<!-- /feat-collection--oracle -->');
if (start !== -1 && end !== -1) {
  console.log(content.substring(start - 50, end + 35));
} else {
  console.log('Oracle Collection not found');
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

test('home does not load the result-sample stylesheet after cards are integrated into the signature section', () => {
  for(const file of ['index.html','public/ggulggul/index.html','public/en/index.html']) {
    const html=readFileSync(file,'utf8');
    assert.ok(!html.includes('/styles/result-samples.css'),file);
    assert.ok(JSDOM.fragment(html).querySelector('#cdSignatureConsult .cd-picker-links a[href="/consultation-samples/"]'),file);
  }
});

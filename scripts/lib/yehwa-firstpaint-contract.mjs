import assert from 'node:assert/strict';
import postcss from 'postcss';

// The approved November banner uses one blocking stylesheet, not an inline clone.
// Keep its desktop reservation and fluid mobile composition enforceable in isolation.
export function assertYehwaFirstPaint(raw, css) {
  const html = raw.replace(/<!--[\s\S]*?-->/g, '');
  const heroAt = html.search(/<div\b[^>]*\sclass="yh-hero yh-entry-scene"/);
  const links = [...html.matchAll(/<link\b[^>]*>/g)].filter(([tag]) =>
    /\shref="\/styles\/yehwa-home\.css(?:\?[^" ]*)?"/.test(tag));
  assert.equal(links.length, 1, 'One Yehwa stylesheet must reserve the first paint');
  const [link] = links;
  assert.ok(heroAt >= 0 && link.index < heroAt, 'Yehwa styles must precede hero markup');
  assert.match(link[0], /\srel="stylesheet"/, 'Yehwa styles must block first paint');
  assert.doesNotMatch(link[0], /\s(?:media|disabled|onload)\b/i, 'Yehwa styles cannot load conditionally or asynchronously');

  const tree = postcss.parse(css);
  const rule = (selector, media, expected) => {
    const matches = [];
    tree.walkRules(selector, node => {
      const scope = node.parent.type === 'root' ? null :
        node.parent.type === 'atrule' && node.parent.name === 'media' ? node.parent.params : 'unsupported';
      if (scope === media) matches.push(node);
    });
    assert.equal(matches.length, 1, `${selector} must have one reservation in ${media ?? 'base styles'}`);
    const values = Object.fromEntries(matches[0].nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]));
    for (const [property, value] of Object.entries(expected)) {
      assert.equal(values[property], value, `${selector} ${property} must preserve approved first-paint geometry`);
    }
  };
  rule('.yh-hero', null, { display: 'grid', 'grid-template-columns': 'minmax(0,1.2fr) minmax(0,1fr)', 'min-height': '280px' });
  rule('.yh-entry-scene', '(max-width:699px)', { 'grid-template-columns': 'minmax(0,1fr)', 'min-height': '0', padding: '26px 24px 14px' });
  rule('.yh-art', null, { width: '100%', 'max-width': '270px' });
  rule('.yh-art img', null, { width: '100%', height: 'auto', 'aspect-ratio': '1', 'object-fit': 'contain' });
  rule('.yh-entry-scene .yh-art', '(max-width:699px)', { width: '144px', 'max-width': '100%' });
  rule('.yh-entry-scene .yh-art', '(max-width:360px)', { width: '140px' });
  tree.walkRules(node => {
    if (!/\.yh-(?:hero|entry-scene|greeting|free-start)(?![\w-])/.test(node.selector) || /(?: svg|\.yh-art)$/.test(node.selector)) return;
    node.walkDecls(decl => {
      assert.ok(!['height', 'max-height'].includes(decl.prop), `${node.selector} must grow with enlarged copy`);
      assert.ok(!(decl.prop === 'white-space' && decl.value === 'nowrap'), `${node.selector} must wrap copy`);
      assert.ok(!(decl.prop === 'overflow' && /hidden|clip/.test(decl.value)), `${node.selector} must not clip copy`);
    });
  });
}

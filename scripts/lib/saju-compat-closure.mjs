import ts from 'typescript';

// The legacy web engine contains DOM, checkout and chart code. Include only the transitive
// top-level declarations of the original deterministic compatibility functions.
export const ROOTS = ['analyzeCompat', 'analyzePastLifeCompat', 'calcNatalElement', 'analyzeJohu', 'calcPower', 'detectJong'];
export function extractSajuCompatClosure(source, roots = ROOTS){
  const ast = ts.createSourceFile('saju-engine.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const decl = new Map();
  for (const node of ast.statements) {
    if (ts.isFunctionDeclaration(node) && node.name) decl.set(node.name.text, { node, text: node.getText(ast) });
    if (ts.isVariableStatement(node)) {
      for (const d of node.declarationList.declarations) {
        if (ts.isIdentifier(d.name)) decl.set(d.name.text, { node: d, text: `var ${d.getText(ast)};` });
      }
    }
  }
  const idsOf = (node) => {
    const out = new Set();
    (function walk(n) { if (ts.isIdentifier(n)) out.add(n.text); ts.forEachChild(n, walk); })(node);
    return out;
  };
  const order = [];
  const seen = new Set();
  const add = (name) => {
    if (seen.has(name) || !decl.has(name)) return;
    seen.add(name);
    order.push(name);
    for (const id of idsOf(decl.get(name).node)) add(id);
  };
  for (const root of roots) {
    if (!decl.has(root)) throw new Error(`Production declaration missing: ${root}`);
    add(root);
  }
  const code = order.slice().reverse().map((name) => decl.get(name).text).join('\n');
  return {code,order,decl};
}

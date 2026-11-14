import {readFileSync} from 'node:fs';
import {parse} from '@babel/parser';
import traversePackage from '@babel/traverse';
import postcss from 'postcss';
import selectors from 'postcss-selector-parser';
const traverse=traversePackage.default||traversePackage;
const source=new URL('../../../public/vedic-astrology.html',import.meta.url);
export const vedicExports=['buildChart','analyze','generateInsights','buildVedicSections','buildVedicDeepDetails','buildMarriageWindows','computeDrishti','dignityDetail','renderSouthChart','renderNorthChart','renderPersonality','renderWealth','renderCareer','renderRomance','renderChakra','renderYoga','renderRemedies','renderVimshottari','renderVedicSectionCards','decorateBhavaTerms','renderBhavaMeaningPanel'];
// Retain the original lexical dependencies; exclude page startup, profile,
// authentication, checkout and LLM event handlers rather than executing the shell.
export function vedicReadingModule({factory=false}={}){
 const html=readFileSync(source,'utf8');
 const code=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(match=>!/(?:\bsrc\s*=|application\/ld\+json)/i.test(match[1])).map(match=>match[2]).join('\n');
 const ast=parse(code,{sourceType:'script'});let program;
 traverse(ast,{Program(path){program=path;}});
 const chosen=new Map();
 function include(name){
  if(chosen.has(name))return;
  const binding=program.scope.getBinding(name);if(!binding)throw Error('Missing Vedic web declaration: '+name);
  const path=binding.path;
  if(!path.isFunctionDeclaration()&&!path.isVariableDeclarator())throw Error('Unsupported Vedic declaration: '+name);
  chosen.set(name,path);
  path.traverse({ReferencedIdentifier(reference){const target=reference.scope.getBinding(reference.node.name);if(target?.scope===program.scope)include(reference.node.name);}});
 }
 for(const name of vedicExports)include(name);
 const declarations=[...new Set(chosen.values())].sort((a,b)=>a.node.start-b.node.start).map(path=>path.isVariableDeclarator()?path.parent.kind+' '+code.slice(path.node.start,path.node.end)+';':code.slice(path.node.start,path.node.end));
 const body=declarations.join('\n');
 if(factory)return 'export function createVedicReader(bridge){const window={swisseph:bridge};\n'+body+'\nreturn {'+vedicExports.join(',')+',planetName:key=>PKR[key]||key,setReading:(chart,report,insights,sections,deep)=>{G.chart=chart;G.report=report;G.insights=insights;G.sections=sections;G.deep=deep;},usedFallback:()=>window.__vedicSwissFallbackUsed===true};}';
 return body+'\nexport {'+vedicExports.join(',')+'};';
}
export function vedicReadingStyles(){
 const html=readFileSync(source,'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''),css=[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match=>match[1]).join('\n');
 const sheet=postcss.parse(css);
 const animations=new Map();sheet.walkAtRules(rule=>{if(/keyframes$/i.test(rule.name)){animations.set(rule.params,'toss-vedic-'+rule.params);rule.params=animations.get(rule.params);}});
 sheet.walkDecls(declaration=>{if(/animation(?:-name)?$/.test(declaration.prop))for(const [name,replacement] of animations)declaration.value=declaration.value.replace(new RegExp('\\b'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','g'),replacement);});
 sheet.walkAtRules(rule=>{if(['import','font-face'].includes(rule.name))rule.remove();});
 sheet.walkRules(rule=>{
  if(rule.parent?.type==='atrule'&&/keyframes$/i.test(rule.parent.name))return;
  rule.selector=selectors(root=>root.each(selector=>{
   let anchored=false;selector.walk(node=>{if(node.type==='tag'&&['html','body'].includes(node.value)||node.type==='pseudo'&&node.value===':root'){node.replaceWith(selectors.className({value:'toss-vedic-reading'}));anchored=true;}});
   if(!anchored){selector.prepend(selectors.combinator({value:' '}));selector.prepend(selectors.className({value:'toss-vedic-reading'}));}
  })).processSync(rule.selector);
 });
 return sheet.toString();
}
export default function vedicReading(){const engine='virtual:toss-vedic-reading',css='virtual:toss-vedic-reading.css';return {name:'toss-original-vedic-reading',resolveId(id){if(id===engine||id===css)return '\0'+id;},load(id){if(id==='\0'+engine)return vedicReadingModule({factory:true});if(id==='\0'+css)return vedicReadingStyles();}};}

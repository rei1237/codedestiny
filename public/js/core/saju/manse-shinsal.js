/* 만세력 무료 원국에 표시하는 신살 라벨 계산.
 * 해석문이나 길흉 판정은 만들지 않고, 원국의 간지에서 성립하는 이름과 자리만 돌려준다.
 * 12신살은 연지 기준, 별신살은 일간·일지·월지와 원국 상호관계를 기준으로 한다. */
(function exposeManseShinsal(global) {
  'use strict';

  var STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  var BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  var TWELVE_NAMES = ['겁살','재살','천살','지살','년살','월살','망신살','장성살','반안살','역마살','육해살','화개살'];
  var TWELVE_BRANCHES = {
    water: ['巳','午','未','申','酉','戌','亥','子','丑','寅','卯','辰'],
    fire: ['亥','子','丑','寅','卯','辰','巳','午','未','申','酉','戌'],
    wood: ['申','酉','戌','亥','子','丑','寅','卯','辰','巳','午','未'],
    metal: ['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑']
  };
  var POSITION_LABELS = { h:'시주', d:'일주', m:'월주', y:'년주' };
  var POSITION_ORDER = ['h','d','m','y'];

  function unique(values) {
    return values.filter(function(value, index) { return value && values.indexOf(value) === index; });
  }

  function twelveGroup(branch) {
    if (['申','子','辰'].indexOf(branch) >= 0) return 'water';
    if (['寅','午','戌'].indexOf(branch) >= 0) return 'fire';
    if (['亥','卯','未'].indexOf(branch) >= 0) return 'wood';
    if (['巳','酉','丑'].indexOf(branch) >= 0) return 'metal';
    return '';
  }

  function twelveName(yearBranch, targetBranch) {
    var row = TWELVE_BRANCHES[twelveGroup(yearBranch)] || [];
    var index = row.indexOf(targetBranch);
    return index >= 0 ? TWELVE_NAMES[index] : '';
  }

  function peachBranch(referenceBranch) {
    if (['申','子','辰'].indexOf(referenceBranch) >= 0) return '酉';
    if (['寅','午','戌'].indexOf(referenceBranch) >= 0) return '卯';
    if (['巳','酉','丑'].indexOf(referenceBranch) >= 0) return '午';
    if (['亥','卯','未'].indexOf(referenceBranch) >= 0) return '子';
    return '';
  }

  function gongmangBranches(dayStem, dayBranch) {
    var stemIndex = STEMS.indexOf(dayStem);
    var branchIndex = BRANCHES.indexOf(dayBranch);
    if (stemIndex < 0 || branchIndex < 0) return [];
    var dayIndex = -1;
    for (var i = 0; i < 60; i += 1) {
      if (i % 10 === stemIndex && i % 12 === branchIndex) { dayIndex = i; break; }
    }
    if (dayIndex < 0) return [];
    var start = BRANCHES[(Math.floor(dayIndex / 10) * 10) % 12];
    return ({
      '子':['戌','亥'], '戌':['申','酉'], '申':['午','未'],
      '午':['辰','巳'], '辰':['寅','卯'], '寅':['子','丑']
    })[start] || [];
  }

  function build(pillars) {
    var p = pillars || {};
    var rows = POSITION_ORDER.map(function(key) {
      var pillar = p[key] || {};
      return { key:key, label:POSITION_LABELS[key], stem:pillar.g || '', branch:pillar.j || '' };
    }).filter(function(row) { return row.stem || row.branch; });
    var day = p.d || {};
    var month = p.m || {};
    var year = p.y || {};
    var extras = [];

    function addByTargets(name, stems, branches, ganji) {
      var positions = rows.filter(function(row) {
        return (stems || []).indexOf(row.stem) >= 0
          || (branches || []).indexOf(row.branch) >= 0
          || (ganji || []).indexOf(row.stem + row.branch) >= 0;
      }).map(function(row) { return row.label; });
      if (positions.length) extras.push({ name:name, positions:unique(positions) });
    }

    addByTargets('도화살', [], unique([peachBranch(day.j), peachBranch(year.j)]), []);
    addByTargets('홍염살', [], ({甲:['午'],乙:['午'],丙:['寅'],丁:['未'],戊:['辰'],己:['辰'],庚:['戌'],辛:['酉'],壬:['子'],癸:['申']})[day.g] || [], []);
    addByTargets('천을귀인', [], ({甲:['丑','未'],乙:['子','申'],丙:['亥','酉'],丁:['亥','酉'],戊:['丑','未'],己:['子','申'],庚:['丑','未'],辛:['寅','午'],壬:['卯','巳'],癸:['卯','巳']})[day.g] || [], []);
    addByTargets('문창귀인', [], ({甲:['巳'],乙:['午'],丙:['申'],丁:['酉'],戊:['申'],己:['酉'],庚:['亥'],辛:['子'],壬:['寅'],癸:['卯']})[day.g] || [], []);
    addByTargets('태극귀인', [], ({甲:['子','午'],乙:['子','午'],丙:['卯','酉'],丁:['卯','酉'],戊:['辰','戌','丑','未'],己:['辰','戌','丑','未'],庚:['寅','亥'],辛:['寅','亥'],壬:['巳','申'],癸:['巳','申']})[day.g] || [], []);
    addByTargets('월덕귀인', [(['申','子','辰'].indexOf(month.j)>=0?'壬':['亥','卯','未'].indexOf(month.j)>=0?'甲':['寅','午','戌'].indexOf(month.j)>=0?'丙':['巳','酉','丑'].indexOf(month.j)>=0?'庚':'')], [], []);
    var cheondeok = ({寅:{s:'丁'},卯:{b:'申'},辰:{s:'壬'},巳:{s:'辛'},午:{b:'亥'},未:{s:'甲'},申:{s:'癸'},酉:{b:'寅'},戌:{s:'丙'},亥:{s:'乙'},子:{b:'巳'},丑:{s:'庚'}})[month.j] || {};
    addByTargets('천덕귀인', cheondeok.s ? [cheondeok.s] : [], cheondeok.b ? [cheondeok.b] : [], []);
    addByTargets('괴강살', [], [], ['庚辰','庚戌','壬辰','戊戌']);
    addByTargets('백호살', [], [], ['甲辰','乙未','丙戌','丁丑','戊辰','壬戌','癸丑']);
    addByTargets('양인살', [], ({甲:['卯'],丙:['午'],戊:['午'],庚:['酉'],壬:['子']})[day.g] || [], []);
    addByTargets('공망', [], gongmangBranches(day.g, day.j), []);

    function addPairStar(name, pairs) {
      var positions = [];
      for (var i = 0; i < rows.length; i += 1) {
        for (var j = i + 1; j < rows.length; j += 1) {
          if (pairs.indexOf(rows[i].branch + rows[j].branch) >= 0 || pairs.indexOf(rows[j].branch + rows[i].branch) >= 0) {
            positions.push(rows[i].label, rows[j].label);
          }
        }
      }
      if (positions.length) extras.push({ name:name, positions:unique(positions) });
    }
    addPairStar('귀문관살', ['子酉','丑午','寅未','卯申','辰亥','巳戌']);
    addPairStar('원진살', ['子未','丑午','寅酉','卯申','辰亥','巳戌']);

    return {
      twelve: rows.map(function(row) { return { key:row.key, label:row.label, name:twelveName(year.j, row.branch) }; }),
      extras: extras,
      basis: '12신살은 연지 기준 · 별신살은 일간·일지·월지와 원국 관계 기준'
    };
  }

  global.CdManseShinsal = { build:build, twelveName:twelveName, gongmangBranches:gongmangBranches };
})(typeof window !== 'undefined' ? window : globalThis);

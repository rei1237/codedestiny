// Generated from js/saju-engine.js by scripts/sync-saju-luck-rules.mjs.
var GAN={
  '甲':{e:'wood',y:'+',n:'갑목'},'乙':{e:'wood',y:'-',n:'을목'},
  '丙':{e:'fire',y:'+',n:'병화'},'丁':{e:'fire',y:'-',n:'정화'},
  '戊':{e:'earth',y:'+',n:'무토'},'己':{e:'earth',y:'-',n:'기토'},
  '庚':{e:'metal',y:'+',n:'경금'},'辛':{e:'metal',y:'-',n:'신금'},
  '壬':{e:'water',y:'+',n:'임수'},'癸':{e:'water',y:'-',n:'계수'}
};

var JI={
  '子':{e:'water',y:'-',a:'쥐'},'丑':{e:'earth',y:'-',a:'소'},
  '寅':{e:'wood',y:'+',a:'호랑이'},'卯':{e:'wood',y:'-',a:'토끼'},
  '辰':{e:'earth',y:'+',a:'용'},'巳':{e:'fire',y:'+',a:'뱀'},
  '午':{e:'fire',y:'-',a:'말'},'未':{e:'earth',y:'-',a:'양'},
  '申':{e:'metal',y:'+',a:'원숭이'},'酉':{e:'metal',y:'-',a:'닭'},
  '戌':{e:'earth',y:'+',a:'개'},'亥':{e:'water',y:'+',a:'돼지'}
};

var CD_JANGGAN={
  '子':['壬','癸'], '丑':['癸','辛','己'], '寅':['戊','丙','甲'], '卯':['甲','乙'], '辰':['乙','癸','戊'], '巳':['戊','庚','丙'],
  '午':['丙','己','丁'], '未':['丁','乙','己'], '申':['戊','壬','庚'], '酉':['庚','辛'], '戌':['辛','丁','戊'], '亥':['戊','甲','壬']
};

function sajuHapAssessment(element, kind, source, partner, stems, branches, monthBranch) {
  var stemClash={'甲':'庚','庚':'甲','乙':'辛','辛':'乙','丙':'壬','壬':'丙','丁':'癸','癸':'丁'};
  var branchClash={'子':'午','午':'子','丑':'未','未':'丑','寅':'申','申':'寅','卯':'酉','酉':'卯','辰':'戌','戌':'辰','巳':'亥','亥':'巳'};
  var chars=kind==='stem'?stems:branches, clashes=kind==='stem'?stemClash:branchClash;
  var seasonal=!!element && (JI[monthBranch]||{}).e===element;
  var exposed=stems.some(function(g){return (GAN[g]||{}).e===element;});
  var rooted=branches.some(function(j){return (CD_JANGGAN[j]||[]).some(function(g){return (GAN[g]||{}).e===element;});});
  var competing=chars.filter(function(c){return c===source;}).length>1 || chars.filter(function(c){return c===partner;}).length>1;
  var clashed=!!((clashes[source]&&chars.indexOf(clashes[source])>=0)||(clashes[partner]&&chars.indexOf(clashes[partner])>=0));
  return {transformed:seasonal&&exposed&&rooted&&!competing&&!clashed,
    conditions:[seasonal?'월령의 지지':'월령의 지지 부족',exposed?'화신의 투간':'화신의 투간 미확인',rooted?'화신의 통근':'화신의 통근 미확인',competing?'쟁합 가능성':'쟁합 없음',clashed?'충이 함께 작용':'직접 충 없음'],
    ruleVersion:'saju-luck-v2'};
}

function sajuSamhapState(members, incoming, original) {
  if(members.indexOf(incoming)<0)return 'none';
  var present=members.filter(function(c){return c===incoming||original.indexOf(c)>=0;});
  if(present.length===3)return 'full';
  // 왕지를 포함한 서로 다른 두 지지만 반합으로 읽는다. 생지+고지는 합국으로 확정하지 않는다.
  if(present.length===2 && present.indexOf(members[1])>=0)return 'half';
  return 'none';
}
export { sajuHapAssessment, sajuSamhapState };

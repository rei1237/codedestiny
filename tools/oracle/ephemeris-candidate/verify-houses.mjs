import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as A from './node_modules/astronomy-engine/esm/astronomy.js';
const rad = Math.PI / 180;
const wrap = x => ((x % 360)+360)%360;
const difference = (a,b) => Math.abs(wrap(a-b+180)-180);
const data = JSON.parse(fs.readFileSync(new URL('./extended-observations.json',import.meta.url)));
const metrics = {axes:0, cusps:0, withheldPolarCharts:0, maxAscDeg:0, maxMcDeg:0, maxSemiarcResidualDeg:0};

// Given the hour angle as a fraction of the semi-diurnal arc, solve in RA.
// All ecliptic points rise and set below the polar circles.
function placidus(lst, latitude, eps) {
  if (Math.abs(latitude) >= 90-Math.abs(eps)) return null;
  const cusps = Array(12);
  for (const [house,fraction] of [[8,2/3],[9,1/3],[10,0],[11,-1/3],[12,-2/3],[1,-1]]) {
    let lo = lst-180, hi = lst+180;
    for (let i=0;i<50;i++) {
      const ra = (hi+lo)/2;
      const dec = Math.atan(Math.sin(ra*rad)*Math.tan(eps*rad));
      const semi = Math.acos(-Math.tan(latitude*rad)*Math.tan(dec))/rad;
      if (ra+fraction*semi < lst) lo=ra;
      else hi=ra;
    }
    const ra = (hi+lo)/2*rad;
    const lon = wrap(Math.atan2(Math.sin(ra),Math.cos(eps*rad)*Math.cos(ra))/rad);
    cusps[house-1]=lon;
    cusps[(house+5)%12]=wrap(lon+180);
  }
  return cusps;
}

for (const day of data.sidereal) for (const [stamp,gast] of day.rows) {
  const date=new Date(stamp), time=A.MakeTime(date);
  const [h,m,s]=gast.split(':').map(Number);
  const usnoGast=15*(h+m/60+s/3600);
  const days=(date.getTime()-Date.UTC(2000,0,1,12))/864e5;
  // USNO approximation of mean obliquity; the review tolerances include true-minus-mean obliquity.
  const referenceEps=(23.4393-0.0000004*days)*rad;
  const rotation=A.Rotation_ECT_EQD(time);
  const eps=A.RotateVector(rotation,new A.Vector(0,1,0,time));
  const actualEps=Math.atan2(eps.z,eps.y)/rad;
  for (const [lat,lon] of [[0,0],[37.57,126.98],[-33.87,151.21],[60,-150],[65,25],[-65,-45],[69.65,18.96],[-75,0],[80,15]]) {
    const lst=wrap(usnoGast+lon)*rad, phi=lat*rad;
    const candidateLast=A.SiderealTime(time)*15+lon;
    // USNO altitude equation at zero altitude. Select the EASTERN intersection.
    let asc=wrap(Math.atan2(-Math.cos(lst),Math.sin(lst)*Math.cos(referenceEps)+Math.tan(phi)*Math.sin(referenceEps))/rad);
    const ra=Math.atan2(Math.sin(asc*rad)*Math.cos(referenceEps),Math.cos(asc*rad));
    if(Math.sin(lst-ra)>0) asc=wrap(asc+180);
    const mc=wrap(Math.atan2(Math.sin(lst),Math.cos(lst)*Math.cos(referenceEps))/rad);

    const hor=A.CombineRotation(rotation,A.Rotation_EQD_HOR(time,new A.Observer(lat,lon,0)));
    const x=A.RotateVector(hor,new A.Vector(1,0,0,time)), y=A.RotateVector(hor,new A.Vector(0,1,0,time));
    let candidateAsc=wrap(Math.atan2(-x.z,y.z)/rad);
    if(x.y*Math.cos(candidateAsc*rad)+y.y*Math.sin(candidateAsc*rad)>0) candidateAsc=wrap(candidateAsc+180);
    const candidateMc=wrap(Math.atan2(Math.sin(candidateLast*rad),Math.cos(candidateLast*rad)*Math.cos(actualEps*rad))/rad);
    metrics.maxAscDeg=Math.max(metrics.maxAscDeg,difference(candidateAsc,asc));
    metrics.maxMcDeg=Math.max(metrics.maxMcDeg,difference(candidateMc,mc));
    metrics.axes++;
    const cusps=placidus(candidateLast,lat,actualEps);
    if(Math.abs(lat)>=67) { assert.equal(cusps,null); metrics.withheldPolarCharts++; continue; }
    assert.ok(difference(cusps[0],candidateAsc)<1e-6 && difference(cusps[9],candidateMc)<1e-6);
    for (const [house,fraction] of [[1,-1],[8,2/3],[9,1/3],[10,0],[11,-1/3],[12,-2/3]]) {
      const lambda=cusps[house-1]*rad;
      const decl=Math.asin(Math.sin(lambda)*Math.sin(referenceEps));
      const refRA=Math.atan2(Math.sin(lambda)*Math.cos(referenceEps),Math.cos(lambda))/rad;
      const semi=Math.acos(-Math.tan(phi)*Math.tan(decl))/rad;
      metrics.maxSemiarcResidualDeg=Math.max(metrics.maxSemiarcResidualDeg,difference(lst/rad-refRA,fraction*semi));
      assert.ok(difference(cusps[(house+5)%12],cusps[house-1]+180)<1e-9);
    }
    metrics.cusps+=12;
  }
}
assert.equal(metrics.axes,216);
assert.equal(metrics.withheldPolarCharts,72);
assert.ok(metrics.maxAscDeg<0.1 && metrics.maxMcDeg<0.01 && metrics.maxSemiarcResidualDeg<0.05,JSON.stringify(metrics));
console.log(JSON.stringify(metrics));

// Research profile, isolated from production. IMD defines the origin by
// 23°15' at 0h on 1956-03-21. Here we test the explicit true-of-date frame,
// without fitting any coefficient to the published event times.
import * as A from './node_modules/astronomy-engine/esm/astronomy.js';
const epoch=A.MakeTime(new Date('1956-03-21T00:00:00Z'));
const angle=23.25*Math.PI/180;
const origin=A.RotateVector(A.Rotation_ECT_EQJ(epoch),new A.Vector(Math.cos(angle),Math.sin(angle),0,epoch));
export function imdOriginLongitude(jd) {
  const t=A.MakeTime(new Date(Math.round((jd-2440587.5)*864e5)));
  const p=A.RotateVector(A.Rotation_EQJ_ECT(t),origin);
  return (Math.atan2(p.y,p.x)*180/Math.PI+360)%360;
}

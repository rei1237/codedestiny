// Apparent geocentric ecliptic of date, with the IMD 1956 origin held fixed in EQJ.
export const SUKUYO_IMD_VERSION = 'sukuyo-imd1956-ae2.1.19-v1';
export function createImdSiderealProfile(A) {
  const epoch = A.MakeTime(new Date('1956-03-21T00:00:00Z'));
  const angle = 23.25 * Math.PI / 180;
  const origin = A.RotateVector(A.Rotation_ECT_EQJ(epoch), new A.Vector(Math.cos(angle), Math.sin(angle), 0, epoch));
  function offsetForDate(date) {
    const p = A.RotateVector(A.Rotation_EQJ_ECT(date), origin);
    return (Math.atan2(p.y,p.x)*180/Math.PI+360)%360;
  }
  function moonForDate(date) {
    return (A.Ecliptic(A.GeoVector('Moon',date,true)).elon-offsetForDate(date)+360)%360;
  }
  return {offsetForDate, moonForDate};
}

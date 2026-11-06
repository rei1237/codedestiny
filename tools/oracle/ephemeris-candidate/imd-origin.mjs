import * as A from './node_modules/astronomy-engine/esm/astronomy.js';
import { createImdSiderealProfile } from '../../../worker/lib/imd-sidereal-profile.js';
const profile = createImdSiderealProfile(A);
export function imdOriginLongitude(jd) {
  return profile.offsetForDate(new Date(Math.round((jd-2440587.5)*864e5)));
}

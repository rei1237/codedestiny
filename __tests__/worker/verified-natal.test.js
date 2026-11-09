/** @jest-environment node */
import {westernPositions, vedicPositions} from "../../worker/lib/verified-natal.js";
import {calculate} from "../../worker/business-api/calculate.js";
import observations from "../../tools/oracle/ephemeris-candidate/horizons-earth-ecliptic.json" with {type:"json"};
import reference from "../../tools/oracle/ephemeris-candidate/candidate-results.json" with {type:"json"};
import {verifiedSukuyoForCivilTime} from "../../worker/lib/sukuyo-verified-provider.js";

test("JPL 별자리 진입 120표본의 황경과 경계 불일치 시각", () => {
  for (const body of ["Sun","Moon"]) {
    const differences = [];
    for (const [jd,longitude] of observations.bodies[body].cusp) {
      const date = new Date(Math.round((jd-2440587.5)*86400000));
      const position = westernPositions(date,37.5665,126.978).planets[body];
      const delta = Math.abs(((position.longitude-longitude+540)%360)-180);
      expect(delta*60).toBeLessThan(0.061);
      if (Math.floor(longitude/30)!==position.sign) differences.push(date.toISOString());
    }
    expect(differences).toEqual(reference.bodies[body].cusp.signDifferences.map(hit=>hit.date));
  }
});
test("베다 달 라시와 108 파다, 숙요 시각 미상과 기간 밖 입력", async () => {
  const moment = {year:2025,month:1,day:12,hour:8,minute:30,timezoneOffsetHours:9};
  const date = new Date("2025-01-11T23:30:00Z");
  const natal = vedicPositions(date,37.5665,126.978);
  const moon = natal.planets.Moon;
  expect(moon.rashi).not.toBe(natal.planets.Sun.rashi);
  expect(moon.pada).toBe(Math.floor((moon.longitude % (360/27)) / (360/108)) + 1);
  const mansion = verifiedSukuyoForCivilTime(moment);
  expect(mansion.moonSiderealLongitude).toBeCloseTo(moon.longitude,8);
  expect(await calculate("sukuyo",{birthDate:"2025-01-12",birthTime:"08:30",timezoneOffsetHours:9})).toMatchObject({index:mansion.index,mansion:mansion.mansion});
  for(const birth of [{birthDate:"1980-01-12",birthTime:"08:30"},{birthDate:"2025-01-12"}]) {
    await expect(calculate("sukuyo",{...birth,timezoneOffsetHours:9})).rejects.toThrow();
  }
});

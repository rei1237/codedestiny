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
  for(const birth of [{birthDate:"1899-01-12",birthTime:"08:30"},{birthDate:"2025-01-12"}]) {
    await expect(calculate("sukuyo",{...birth,timezoneOffsetHours:9})).rejects.toThrow();
  }
});

test("숙요 일반 명반의 현지 연대와 두 숙의 경계", async () => {
  const read = (birthDate,birthTime,tz=9) => calculate("sukuyo",{birthDate,birthTime,timezoneOffsetHours:tz});
  for(const date of ["1900-01-01","1980-04-18","2050-12-31"]) {
    const chart = await read(date,"08:30");
    expect(chart.mansion).toBeTruthy();
  }
  await expect(read("2051-01-01","00:00")).rejects.toMatchObject({code:"DATE_OUT_OF_RANGE"});
  await expect(read("1980-01-01",undefined)).rejects.toMatchObject({code:"BIRTH_TIME_REQUIRED"});
  const day = "2026-05-18";
  const first = await read(day,"08:30"), last = await read(day,"15:30");
  expect(last.index).toBe((first.index+1)%27);
  const nextDay = await read("2026-05-19","01:30",14);
  expect(nextDay).toEqual(await read(day,"20:30",9));
  await expect(read(day,"15:02")).rejects.toMatchObject({code:"MANSION_BOUNDARY"});
  expect((await read(day,"14:58")).index).toBe(first.index);
  expect((await read(day,"15:07")).index).toBe(last.index);
});

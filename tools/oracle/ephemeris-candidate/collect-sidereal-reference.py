"""Offline independent IMD-frame reference. Run with pyerfa==2.0.1.5."""
import json
import math
from pathlib import Path

import erfa
import numpy as np

here = Path(__file__).resolve().parent
source = json.loads((here / "horizons-earth-ecliptic.json").read_text())
epoch = sum(erfa.cal2jd(1956, 3, 21))
angle = math.radians(23.25)

def orientation(jd):
    # IAU 2006 bias-precession in ecliptic coordinates, true equinox correction.
    matrix = erfa.ecm06(2451545.0, jd - 2451545.0)
    dpsi, _ = erfa.nut06a(2451545.0, jd - 2451545.0)
    return matrix, dpsi

matrix, nut = orientation(epoch)
origin = matrix.T @ np.array([math.cos(angle-nut), math.sin(angle-nut), 0])
rows = []
for jd, *_ in source["bodies"]["Moon"]["regular"]:
    matrix, nut = orientation(jd)
    x, y, _ = matrix @ origin
    offset = math.degrees(math.atan2(y, x) + nut) % 360
    # Separate UT1 and TT arguments (64 s approximation for these geometry samples).
    tt = jd + 64/86400
    lst = erfa.gst06a(jd, 0, tt, 0) + math.radians(126.978)
    eps = erfa.obl06(tt, 0) + erfa.nut06a(tt, 0)[1]
    asc = math.degrees(math.atan2(-math.cos(lst), math.sin(lst)*math.cos(eps)
                  + math.tan(math.radians(37.5665))*math.sin(eps))) + 180
    rows.append([jd, round(offset, 8), round((asc-offset)%360, 8)])
(here / "sidereal-reference.json").write_text(json.dumps(rows, separators=(",", ":"))+"\n")

"""Create a small, simplified, local City of Vancouver open-data extract.

Run with Python 3 + Shapely: python scripts/prepare-geography.py
Contains information licensed under the Open Government Licence – Vancouver.
No API keys required. Does not fetch imagery or personal information.
"""

import json
import math
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

from shapely.geometry import Polygon, box, shape
from shapely import transform as shapely_transform

ROOT = Path(__file__).resolve().parents[1]
API = "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/"
ORIGIN = (-123.109, 49.275)
BOUNDS = (-123.144, 49.264, -123.088, 49.297)
CLIP = box(*BOUNDS)
FILTER = "intersects(geom, geom'" + CLIP.wkt + "')"
X_SCALE = math.cos(math.radians(ORIGIN[1])) * 111320
Z_SCALE = 111320


def records(dataset, where=None):
    result = []
    offset = 0
    while True:
        query = {"limit": 100, "offset": offset}
        if where:
            query["where"] = where
        with urlopen(API + dataset + "/records?" + urlencode(query), timeout=60) as response:
            data = json.load(response)
        result.extend(data["results"])
        offset += 100
        if offset >= data["total_count"]:
            break
    print(dataset, len(result), "source records")
    return result


def project(x, y, z=None):
    return ((x - ORIGIN[0]) * X_SCALE, (ORIGIN[1] - y) * Z_SCALE)


def transform(fn, geom):
    return shapely_transform(geom, fn, interleaved=False)


def points(coords):
    return [[round(x, 1), round(y, 1)] for x, y, *_ in coords]


def polygons(geometry):
    if geometry.is_empty:
        return []
    if geometry.geom_type == "Polygon":
        return [geometry]
    if geometry.geom_type in ("MultiPolygon", "GeometryCollection"):
        return [p for g in geometry.geoms for p in polygons(g)]
    return []


def rings(poly):
    return [points(poly.exterior.coords)] + [points(h.coords) for h in poly.interiors]


def lines(geometry):
    if geometry.is_empty:
        return []
    if geometry.geom_type == "LineString":
        return [points(geometry.coords)]
    if geometry.geom_type in ("MultiLineString", "GeometryCollection"):
        return [p for g in geometry.geoms for p in lines(g)]
    return []


shore = records("shoreline-2002")
lands = []
shorelines = []
for r in shore:
    line = shape(r["geom"]["geometry"])
    if line.geom_type != "LineString":
        continue
    # Main coastline endpoints lie at the city's east boundary. Closing the
    # perimeter there leaves the detailed False Creek shoreline unchanged.
    poly = Polygon(line.coords)
    if not poly.is_valid:
        poly = poly.buffer(0)
    for p in polygons(transform(project, poly.intersection(CLIP)).simplify(2.0)):
        lands.append(rings(p))
    shorelines.extend(lines(transform(project, line.intersection(CLIP)).simplify(1.5)))

buildings = []
for r in records("building-footprints-2015", FILTER):
    g = transform(project, shape(r["geom"]["geometry"]).intersection(CLIP)).simplify(1.1)
    for p in polygons(g):
        if p.area < 45:
            continue
        buildings.append({"id": r["object_id"], "rings": rings(p), "area": round(p.area),
                          "center": points([p.centroid.coords[0]])[0]})

streets = []
for r in records("public-streets", FILTER):
    g = transform(project, shape(r["geom"]["geometry"]).intersection(CLIP)).simplify(1.5)
    for line in lines(g):
        streets.append({"name": r["hblock"], "use": r["streetuse"], "points": line})

parks = []
for r in records("parks-polygon-representation", FILTER):
    g = transform(project, shape(r["geom"]["geometry"]).intersection(CLIP)).simplify(1.5)
    for p in polygons(g):
        parks.append({"name": r["park_name"], "rings": rings(p)})

data = {"attribution": "Contains information licensed under the Open Government Licence – Vancouver.",
        "source": "City of Vancouver", "retrieved": "2026-10-10", "origin": ORIGIN,
        "bounds": BOUNDS, "land": lands, "shoreline": shorelines,
        "buildings": buildings, "streets": streets, "parks": parks}
target = ROOT / "public/data/geography.json"
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(data, separators=(",", ":")) + "\n")
print(target, target.stat().st_size, "bytes")

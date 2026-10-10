"""Crop authoritative raster sources into small, attributed web derivatives.

Run with the project venv: python scripts/prepare-context.py
Raw downloads stay in ignored source-assets/raw; no browser-time API requests.
"""
from pathlib import Path
from datetime import datetime, timezone
from urllib.request import urlopen, Request
from urllib.parse import urlencode
from concurrent.futures import ThreadPoolExecutor
import hashlib
import io
import json
import math
import shutil

import numpy as np
import rasterio
from rasterio.merge import merge
from rasterio.features import geometry_mask, shapes
from rasterio.windows import from_bounds, transform as window_transform
from rasterio.enums import Resampling
from rasterio.transform import from_bounds as affine_from_bounds
from pyproj import CRS, Transformer
from shapely.geometry import Polygon, shape, mapping
from shapely import transform as shapely_transform
from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "source-assets/raw"
RAW.mkdir(parents=True, exist_ok=True)
GEOGRAPHY = json.loads((ROOT / "public/data/geography.json").read_text())
BBOX = GEOGRAPHY["bounds"]
ORIGIN = GEOGRAPHY["origin"]
LON0, LAT0 = ORIGIN
M = 111320
COS = math.cos(math.radians(LAT0))
INDEX = "https://services6.arcgis.com/ubm4tcTYICKBpist/arcgis/rest/services/LiDAR_BC_S3_Public/FeatureServer"
TILES = "https://tiles.arcgis.com/tiles/qrcTTRTwUoS8N47o/arcgis/rest/services/Orthophotos_2022/MapServer"
to_utm = Transformer.from_crs(4326, 26910, always_xy=True)
to_wgs = Transformer.from_crs(26910, 4326, always_xy=True)


def local_to_utm(x, z):
    return to_utm.transform(LON0 + x / (COS * M), LAT0 - z / M)


def utm_to_local(x, y, _z=None):
    lon, lat = to_wgs.transform(x, y)
    return (lon - LON0) * COS * M, (LAT0 - lat) * M


def transform(fn, geom):
    return shapely_transform(geom, fn, interleaved=False)


def download(url, target, max_bytes=30_000_000):
    if target.exists():
        return target
    with urlopen(Request(url, headers={"User-Agent": "ConcordLandingIndependentStudy/1.0"}), timeout=45) as reply:
        size = int(reply.headers.get("Content-Length", "0"))
        if size > max_bytes:
            raise RuntimeError(f"Download exceeds per-file budget: {size} bytes")
        total = 0
        partial = target.with_suffix(target.suffix + ".partial")
        with partial.open("wb") as out:
            while chunk := reply.read(1024 * 1024):
                total += len(chunk)
                if total > max_bytes:
                    raise RuntimeError("Streaming download exceeded size budget")
                out.write(chunk)
        partial.replace(target)
    if target.suffix == ".tif":
        print(f"Downloaded {target.name}: {total / 1e6:.2f} MB", flush=True)
    return target


def fetch_rasters(layer):
    params = dict(f="json", where="year=2025", geometry=",".join(map(str, BBOX)),
                  geometryType="esriGeometryEnvelope", inSR=4326,
                  returnGeometry="false", outFields="filename,year,s3Url", resultRecordCount=20)
    data = json.load(urlopen(f"{INDEX}/{layer}/query?{urlencode(params)}", timeout=30))
    if data.get("error") or data.get("exceededTransferLimit"):
        raise RuntimeError(f"Incomplete tile query: {data}")
    attrs = [f["attributes"] for f in data["features"]]
    if not attrs or len(attrs) > 20:
        raise RuntimeError("Unexpected tile count; review crop before downloading")
    return [(download(a["s3Url"], RAW / a["filename"]), a) for a in attrs]


def crop_mosaic(paths, bounds):
    sources = [rasterio.open(p) for p, _ in paths]
    try:
        raster, affine = merge(sources, bounds=bounds, nodata=-9999)
        return raster[0], affine
    finally:
        for source in sources:
            source.close()


def elevations():
    global to_utm, to_wgs
    dem_files = fetch_rasters(5)
    dsm_files = fetch_rasters(1)
    with rasterio.open(dem_files[0][0]) as source:
        raster_crs = CRS.from_wkt(source.crs.to_wkt())
    horizontal = raster_crs.to_2d()
    to_utm = Transformer.from_crs(4326, horizontal, always_xy=True)
    to_wgs = Transformer.from_crs(horizontal, 4326, always_xy=True)
    corners = [to_utm.transform(x, y) for x in [BBOX[0], BBOX[2]] for y in [BBOX[1], BBOX[3]]]
    bounds = (min(p[0] for p in corners), min(p[1] for p in corners),
              max(p[0] for p in corners), max(p[1] for p in corners))
    dem, affine = crop_mosaic(dem_files, bounds)
    dsm, dsm_affine = crop_mosaic(dsm_files, bounds)
    if dem.shape != dsm.shape or affine != dsm_affine:
        raise RuntimeError("DEM and DSM grids are not aligned")
    parts = []
    heights = []
    measured = 0
    for building in GEOGRAPHY["buildings"]:
        polygon = Polygon(building["rings"][0], building["rings"][1:])
        utm = transform(local_to_utm, polygon).buffer(0)
        window = from_bounds(*utm.bounds, transform=affine).round_offsets().round_lengths()
        x0, y0 = max(0, int(window.col_off)), max(0, int(window.row_off))
        x1, y1 = min(dem.shape[1], int(window.col_off + window.width) + 1), min(dem.shape[0], int(window.row_off + window.height) + 1)
        if x1 <= x0 or y1 <= y0:
            heights.append([building["id"], 9, 0, False])
            parts.append(dict(id=building["id"], rings=building["rings"], h=9, g=0))
            continue
        patch_dem, patch_dsm = dem[y0:y1, x0:x1], dsm[y0:y1, x0:x1]
        patch_affine = affine * rasterio.Affine.translation(x0, y0)
        mask = geometry_mask([mapping(utm)], out_shape=patch_dem.shape, transform=patch_affine, invert=True)
        valid = mask & (patch_dem > -100) & (patch_dsm > -100)
        ndsm = np.maximum(0, patch_dsm - patch_dem)
        roof_samples = ndsm[valid]
        if roof_samples.size < 4:
            heights.append([building["id"], 9, 0, False])
            parts.append(dict(id=building["id"], rings=building["rings"], h=9, g=0))
            continue
        measured += 1
        height = float(np.clip(np.percentile(roof_samples, 80), 2, 240))
        ground = float(np.median(patch_dem[valid]))
        heights.append([building["id"], round(height, 1), round(ground, 1), True])
        # Preserve podium/tower differences with a coarser, quantized height field.
        # Ignore tiny outliers; intersect every derived roof area with mapped outlines.
        if height > 24 and building["area"] > 400:
            step = 8
            small_h, small_w = max(1, math.ceil(ndsm.shape[0] / step)), max(1, math.ceil(ndsm.shape[1] / step))
            small = np.zeros((small_h, small_w), dtype=np.int16)
            for row in range(small_h):
                for col in range(small_w):
                    v = valid[row*step:(row+1)*step, col*step:(col+1)*step]
                    samples = ndsm[row*step:(row+1)*step, col*step:(col+1)*step][v]
                    if samples.size:
                        small[row, col] = int(np.clip(np.percentile(samples, 70) / 8, 1, 30))
            small_affine = patch_affine * rasterio.Affine.scale(step, step)
            roof_parts = []
            for geom, band in shapes(small, mask=small > 0, transform=small_affine):
                if band <= 1:
                    continue  # Already represented by the continuous 8m podium.
                clipped = shape(geom).intersection(utm).simplify(1.0, preserve_topology=True)
                polys = list(clipped.geoms) if clipped.geom_type == "MultiPolygon" else [clipped]
                for p in polys:
                    if p.geom_type != "Polygon" or p.area < 30:
                        continue
                    local = transform(utm_to_local, p)
                    rings = [list(local.exterior.coords)] + [list(h.coords) for h in local.interiors]
                    roof_parts.append(dict(id=building["id"], rings=[[[round(x,1), round(z,1)] for x,z in ring] for ring in rings], h=float(band)*8, b=8, g=round(ground,1)))
            if roof_parts:
                # Grounded podium ensures the cropped bands do not create gaps.
                parts.append(dict(id=building["id"], rings=building["rings"], h=8, g=round(ground,1)))
                parts.extend(roof_parts)
                continue
        parts.append(dict(id=building["id"], rings=building["rings"], h=round(height,1), g=round(ground,1)))
    manifest = dict(source="GeoBC LidarBC 2025 DSM/DEM + City of Vancouver 2015 footprints", year=2025,
                    retrieved=datetime.now(timezone.utc).date().isoformat(), bounds=BBOX, raster_crs=raster_crs.to_string(), horizontal_crs=horizontal.to_string(), estimated=measured, fallback=len(heights)-measured,
                    method="DSM minus DEM; 80th percentile within footprint; large roofs split into 8m height bands on an 8m grid. Generalized, not survey geometry.",
                    tiles=[a for _, a in dem_files + dsm_files],
                    hashes={p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p,_ in dem_files+dsm_files},
                    heights=heights, parts=parts)
    output = ROOT / "public/data"
    output.mkdir(parents=True, exist_ok=True)
    (output / "context.json").write_text(json.dumps(manifest, separators=(",", ":")))
    (ROOT / "src/data/context-summary.json").write_text(json.dumps(dict(total=len(heights), estimated=measured, fallback=len(heights)-measured, year=2025), indent=2)+"\n")
    print(f"Height estimates: {measured}/{len(heights)}, fallback {manifest['fallback']}, roof parts {len(parts)}", flush=True)


def orthophoto():
    zoom = 16
    world = 2 * math.pi * 6378137
    pixels = 256 * 2**zoom
    def pixel(lon, lat):
        r = math.radians(lat)
        return (lon + 180) / 360 * pixels, (1 - math.asinh(math.tan(r)) / math.pi) / 2 * pixels
    west, south, east, north = BBOX
    x0, y0 = pixel(west, north)
    x1, y1 = pixel(east, south)
    cols, rows = range(int(x0)//256, int(x1)//256+1), range(int(y0)//256, int(y1)//256+1)
    if len(cols) * len(rows) > 180:
        raise RuntimeError("Orthophoto exceeds tightly cropped tile budget")
    canvas = Image.new("RGB", (len(cols)*256, len(rows)*256))
    def tile(job):
        row, col = job
        target = RAW / f"ortho-{zoom}-{row}-{col}.jpg"
        download(f"{TILES}/tile/{zoom}/{row}/{col}", target, 1_000_000)
        return row, col, Image.open(target).convert("RGB")
    with ThreadPoolExecutor(max_workers=4) as pool:
        for row, col, image in pool.map(tile, [(r,c) for r in rows for c in cols]):
            canvas.paste(image, ((col-cols.start)*256, (row-rows.start)*256))
    canvas = canvas.crop((round(x0-cols.start*256), round(y0-rows.start*256), round(x1-cols.start*256), round(y1-rows.start*256)))
    # Preserve the source image's colours; material lighting supplies the art direction.
    canvas.thumbnail((3072, 3072), Image.Resampling.LANCZOS)
    output = ROOT / "public/data"
    output.mkdir(parents=True, exist_ok=True)
    canvas.save(output / "false-creek-2022.webp", quality=82, method=6)
    mobile = canvas.copy()
    mobile.thumbnail((1536, 1536), Image.Resampling.LANCZOS)
    mobile.save(output / "false-creek-2022-small.webp", quality=79, method=6)
    (output / "orthophoto.json").write_text(json.dumps(dict(source="City of Vancouver Orthophotos 2022", url=TILES,
       bounds=BBOX, width=canvas.width, height=canvas.height, year=2022, retrieved=datetime.now(timezone.utc).date().isoformat(), zoom=zoom), indent=2))
    print(f"Orthophoto: {canvas.width}x{canvas.height}, {(output / 'false-creek-2022.webp').stat().st_size/1000:.0f} KB", flush=True)


if __name__ == "__main__":
    if shutil.disk_usage(ROOT).free < 1_000_000_000:
        raise RuntimeError("Less than 1GB free; review disk space before downloading")
    elevations()
    orthophoto()

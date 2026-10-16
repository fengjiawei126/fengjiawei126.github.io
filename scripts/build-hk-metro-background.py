"""Project official existing MTR geometry onto the homepage's road-map frame."""
import argparse
from datetime import date
import hashlib
import json
from pathlib import Path
from runpy import run_path

import requests

ROOT = Path(__file__).resolve().parents[1]
road_helpers = run_path(str(ROOT / "scripts/build-hk-road-background.py"))
mercator, simplify = road_helpers["mercator"], road_helpers["simplify"]
DATASET = "landsd_rcd_1637221775627_85634"
QUERY = f"https://portal.csdi.gov.hk/server/rest/services/common/{DATASET}/FeatureServer/4/query"
WHERE = "CLASS = 'RAI' AND TYPE = 'MTR' AND PHYSICALSTATUS = 3"
CACHE = ROOT / "output/playwright/hk-metro-source.json"
OUTPUT = ROOT / "data/hong_kong_metro.json"


def fetch_features(bbox):
    params = dict(f="json", where=WHERE, geometry=",".join(map(str, bbox)),
                  geometryType="esriGeometryEnvelope", inSR=4326, spatialRel="esriSpatialRelIntersects")

    def query(**extra):
        response = requests.get(QUERY, params=params | extra, timeout=45)
        response.raise_for_status()
        result = response.json()
        if "error" in result:
            raise RuntimeError(result["error"])
        return result

    identities = sorted(query(returnIdsOnly="true")["objectIds"])
    assert identities, "No existing MTR geometry found"
    result = query(objectIds=",".join(map(str, identities)), outFields="OBJECTID,CLASS,TYPE,PHYSICALSTATUS,LASTUPDATEDATE",
                   returnGeometry="true", outSR=3857, geometryPrecision=2, orderByFields="OBJECTID", resultRecordCount=3000)
    assert result["spatialReference"].get("latestWkid", result["spatialReference"]["wkid"]) == 3857
    features = result["features"]
    assert not result.get("exceededTransferLimit"), "Incomplete railway query"
    assert {f["attributes"]["OBJECTID"] for f in features} == set(identities)
    assert len(features) == len(identities), "Duplicate railway features"
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_text(json.dumps(features, separators=(",", ":")), encoding="utf-8")
    return features


def main(cached):
    roads = json.loads((ROOT / "data/hong_kong_roads.json").read_text(encoding="utf-8"))
    bbox, clip = roads["extent"]["wgs84"], roads["clip"]
    features = json.loads(CACHE.read_text(encoding="utf-8")) if cached else fetch_features(bbox)
    xmin, ymin = mercator(*bbox[:2])
    xmax, ymax = mercator(*bbox[2:])
    width, height, padding = (road_helpers[key] for key in ("WIDTH", "HEIGHT", "PADDING"))
    scale = min((width - 2 * padding) / (xmax - xmin), (height - 2 * padding) / (ymax - ymin))
    xpad, ypad = (width - (xmax - xmin) * scale) / 2, (height - (ymax - ymin) * scale) / 2
    paths = []
    for feature in features:
        attrs = feature["attributes"]
        assert (attrs["CLASS"], attrs["TYPE"], attrs["PHYSICALSTATUS"]) == ("RAI", "MTR", 3)
        for index, raw in enumerate(feature["geometry"]["paths"]):
            points = simplify([tuple(p[:2]) for p in raw])
            if len(points) < 2:
                continue
            svg = [(round(xpad + (p[0] - xmin) * scale, 2), round(ypad + (ymax - p[1]) * scale, 2)) for p in points]
            paths.append(dict(id=f"hk-metro-track-{len(paths)}", source_id=attrs["OBJECTID"], source_part=index,
                              d="M" + " ".join(f"{x:g},{y:g}" for x, y in svg)))
    assert paths, "Empty railway layer"
    result = dict(
        source=dict(provider="Lands Department, HKSAR Government", portal="Common Spatial Data Infrastructure (CSDI) Portal",
                    product="1:50 000 Topographic Map of Hong Kong", metadata=f"https://portal.csdi.gov.hk/csdi-webpage/metadata/{DATASET}/html",
                    endpoint=QUERY, terms="https://portal.csdi.gov.hk/csdi-webpage/doc/TNC", retrieved=date(2026, 10, 16).isoformat(),
                    selection=WHERE, source_cache_sha256=hashlib.sha256(CACHE.read_bytes()).hexdigest()),
        extent=roads["extent"], clip=clip, paths=paths,
        note="Generalized existing MTR alignment. Decorative train motion, not live positions or a timetable.",
        stats=dict(source_features=len(features), polylines=len(paths)),
    )
    OUTPUT.write_text(json.dumps(result, separators=(",", ":")), encoding="utf-8")
    print(json.dumps(result["stats"]))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--cached", action="store_true")
    main(parser.parse_args().cached)

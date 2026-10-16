"""Build a decorative, north-up Hong Kong SVG layer from official road geometry."""
import argparse
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import date
import hashlib
import json
import math
from pathlib import Path

import networkx as nx
import requests

ROOT = Path(__file__).resolve().parents[1]
QUERY = "https://portal.csdi.gov.hk/server/rest/services/common/landsd_rcd_1637310758814_80061/FeatureServer/0/query"
BBOX = [114.105, 22.245, 114.255, 22.365]
WIDTH, HEIGHT, PADDING = 1000, 700, 20
CACHE = ROOT / "output/playwright/hk-road-source.json"
OUTPUT = ROOT / "data/hong_kong_roads.json"
STREETS = ["NATHAN ROAD", "QUEEN'S ROAD CENTRAL", "CONNAUGHT ROAD CENTRAL", "GLOUCESTER ROAD", "HENNESSY ROAD", "KING'S ROAD", "ARGYLE STREET", "PRINCE EDWARD ROAD WEST", "TSING SHA HIGHWAY", "CROSS HARBOUR TUNNEL", "WESTERN HARBOUR CROSSING", "EASTERN HARBOUR CROSSING"]
CROSSINGS = {
    "TSING SHA HIGHWAY": ("bridge", "Stonecutters Bridge"),
    "CROSS HARBOUR TUNNEL": ("tunnel", "Cross-Harbour Tunnel"),
    "WESTERN HARBOUR CROSSING": ("tunnel", "Western Harbour Crossing"),
    "EASTERN HARBOUR CROSSING": ("tunnel", "Eastern Harbour Crossing"),
}


def query(**extra):
    params = dict(where="1=1", geometry=",".join(map(str, BBOX)), geometryType="esriGeometryEnvelope", inSR=4326, spatialRel="esriSpatialRelIntersects", f="json")
    params.update(extra)
    response = requests.get(QUERY, params=params, timeout=45)
    response.raise_for_status()
    result = response.json()
    if "error" in result:
        raise RuntimeError(result["error"])
    return result


def load_features(cached):
    if cached:
        return json.loads(CACHE.read_text(encoding="utf-8"))
    expected_ids = set(query(returnIdsOnly="true")["objectIds"])
    count = len(expected_ids)

    def page(offset):
        result = query(outFields="OBJECTID,STREETTYPE,ENGLISHSTREETNAME", returnGeometry="true", outSR=3857, geometryPrecision=2, orderByFields="OBJECTID", resultOffset=offset, resultRecordCount=3000)
        assert result["spatialReference"].get("latestWkid", result["spatialReference"]["wkid"]) == 3857
        return result["features"]

    with ThreadPoolExecutor(max_workers=3) as pool:
        features = [feature for batch in pool.map(page, range(0, count, 3000)) for feature in batch]
    received_ids = {f["attributes"]["OBJECTID"] for f in features}
    missing_ids = expected_ids - received_ids
    if missing_ids:
        # Some spatial-query pages omit features; resolve their exact IDs independently.
        recovered = query(geometry=None, objectIds=",".join(map(str, sorted(missing_ids))), outFields="OBJECTID,STREETTYPE,ENGLISHSTREETNAME", returnGeometry="true", outSR=3857, geometryPrecision=2)["features"]
        print(f"Recovered {len(recovered)} missing source features by ID", flush=True)
        features.extend(recovered)
        received_ids = {f["attributes"]["OBJECTID"] for f in features}
    assert len(features) == count and received_ids == expected_ids, f"Incomplete or duplicate source pages: {len(expected_ids - received_ids)} missing"
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_text(json.dumps(features, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return features


def mercator(lon, lat):
    return 6378137 * math.radians(lon), 6378137 * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))


def simplify(points, tolerance=4):
    # Preserve source endpoints while reducing decorative SVG size.
    keep = {0, len(points) - 1}
    pending = [(0, len(points) - 1)]
    while pending:
        first, last = pending.pop()
        a, b = points[first], points[last]
        dx, dy = b[0] - a[0], b[1] - a[1]
        squared_length = dx * dx + dy * dy
        farthest, distance = first, 0
        for index in range(first + 1, last):
            p = points[index]
            fraction = max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / squared_length)) if squared_length else 0
            gap = math.dist(p, (a[0] + fraction * dx, a[1] + fraction * dy))
            if gap > distance:
                farthest, distance = index, gap
        if distance > tolerance:
            keep.add(farthest)
            pending.extend([(first, farthest), (farthest, last)])
    return [points[index] for index in sorted(keep)]


def main(cached):
    features = load_features(cached)
    xmin, ymin = mercator(*BBOX[:2])
    xmax, ymax = mercator(*BBOX[2:])
    scale = min((WIDTH - 2 * PADDING) / (xmax - xmin), (HEIGHT - 2 * PADDING) / (ymax - ymin))
    xpad = (WIDTH - (xmax - xmin) * scale) / 2
    ypad = (HEIGHT - (ymax - ymin) * scale) / 2

    def inside(point):
        return xmin <= point[0] <= xmax and ymin <= point[1] <= ymax

    def svg_point(point):
        return [round(xpad + (point[0] - xmin) * scale, 2), round(ypad + (ymax - point[1]) * scale, 2)]

    def path_d(points):
        return "M" + " ".join(f"{x:g},{y:g}" for x, y in map(svg_point, points))

    def node(point):
        return tuple(round(v, 1) for v in point)

    # Keep grade-separated geometries intact: never create junctions at line crossings.
    graph = nx.Graph()
    street_graphs = defaultdict(nx.Graph)
    layers = {"major": [], "local": []}
    geometry_by_id = {}
    for feature in features:
        attrs = feature["attributes"]
        for index, raw in enumerate((feature.get("geometry") or {}).get("paths", [])):
            points = simplify([tuple(p[:2]) for p in raw])
            if len(points) < 2:
                continue
            identity = (attrs["OBJECTID"], index)
            geometry_by_id[identity] = points
            kind = "major" if attrs["STREETTYPE"] in ("Highway", "Main Road") else "local"
            layers[kind].append(path_d(points))
            a, b = node(points[0]), node(points[-1])
            if a == b:
                continue
            length = sum(math.dist(p, q) for p, q in zip(points, points[1:]))
            graph.add_edge(a, b)
            name = (attrs.get("ENGLISHSTREETNAME") or "").upper()
            if name in STREETS and all(inside(p) for p in points):
                subgraph = street_graphs[name]
                if not subgraph.has_edge(a, b) or length < subgraph[a][b]["weight"]:
                    subgraph.add_edge(a, b, weight=length, points=points, source=identity)

    junctions = []
    selected_points = []
    for point, degree in sorted(graph.degree, key=lambda item: (-item[1], item[0])):
        if degree < 3 or not inside(point):
            continue
        pixel = svg_point(point)
        if all(math.dist(pixel, existing) >= 20 for existing in selected_points):
            selected_points.append(pixel)
            junctions.append(dict(x=pixel[0], y=pixel[1], degree=degree))
        if len(junctions) >= 120:
            break

    routes = []
    for name in STREETS:
        named_graph = street_graphs[name]
        if not named_graph:
            continue
        component = max(nx.connected_components(named_graph), key=lambda c: sum(d["weight"] for _, _, d in named_graph.subgraph(c).edges(data=True)))
        subgraph = named_graph.subgraph(component)
        start = min(component)
        distances = nx.single_source_dijkstra_path_length(subgraph, start, weight="weight")
        start = max(distances, key=distances.get)
        distances = nx.single_source_dijkstra_path_length(subgraph, start, weight="weight")
        end = max(distances, key=distances.get)
        if distances[end] < 250:
            continue
        walk = nx.shortest_path(subgraph, start, end, weight="weight")
        points, source_ids = [], []
        for a, b in zip(walk, walk[1:]):
            edge = subgraph[a][b]
            segment = edge["points"]
            if node(segment[0]) != a:
                segment = list(reversed(segment))
            if points:
                assert math.dist(points[-1], segment[0]) < 0.2, "Disconnected animation route"
            points.extend(segment if not points else segment[1:])
            source_ids.append(list(edge["source"]))
        route = dict(id=f"hk-road-route-{len(routes)}", name=name, d=path_d(points), duration=max(24, round(distances[end] * scale / 8)), source_segments=source_ids)
        if name in CROSSINGS:
            route["crossing_type"], route["crossing_name"] = CROSSINGS[name]
        routes.append(route)
    assert len(routes) >= 5 and len(junctions) >= 50, "Insufficient verified geometry"

    result = dict(
        source=dict(provider="Lands Department, HKSAR Government", portal="Common Spatial Data Infrastructure (CSDI) Portal", metadata="https://portal.csdi.gov.hk/csdi-webpage/metadata/landsd_rcd_1637310758814_80061/html", endpoint=QUERY, terms="https://portal.csdi.gov.hk/csdi-webpage/doc/TNC", retrieved=date(2026, 10, 16).isoformat(), source_cache_sha256=hashlib.sha256(CACHE.read_bytes()).hexdigest()),
        extent=dict(wgs84=BBOX, description="Northern Hong Kong Island, Victoria Harbour, and Kowloon", projection="EPSG:3857", north_up=True, geometry_generalization_m=4),
        viewbox=f"0 0 {WIDTH} {HEIGHT}",
        clip=dict(x=round(xpad, 2), y=round(ypad, 2), width=round((xmax - xmin) * scale, 2), height=round((ymax - ymin) * scale, 2)),
        roads=[dict(kind=kind, d=" ".join(paths)) for kind, paths in layers.items()],
        nodes=junctions, routes=routes,
        flow_note="Decorative motion along official road geometry; not measured traffic or a navigation service.",
        stats=dict(source_features=len(features), polylines=len(geometry_by_id), street_types=dict(Counter(f["attributes"]["STREETTYPE"] for f in features))),
    )
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(json.dumps(dict(source_features=len(features), polylines=len(geometry_by_id), junctions=len(junctions), routes=[r["name"] for r in routes], svg_data_bytes=OUTPUT.stat().st_size, bbox=BBOX), ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--cached", action="store_true")
    main(parser.parse_args().cached)

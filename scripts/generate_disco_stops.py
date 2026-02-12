#!/usr/bin/env python3
"""
Gera dados de stops do Disco conforme a organização depot/loop/rota definida
e escreve assets/disco.json e assets/disco-data.js.

Estrutura:
  Depot LCY: Loop DY1 (DY1A, DY1B, DY1C, DY1X, DY1P), Loop DY2 (DY2A–DY2D, DY2X, DY2P)
  Depot LSE: Loop LL3 (LL3A–LL3D, LL3X), Loop LL4 (LL4A, LL4B, LL4X)
  Depot MSE: Loop MD7 (MD7A–MD7E, MD7X)

Uso: python scripts/generate_disco_stops.py
"""

import json
import os
import random

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
ASSETS_DIR = os.path.join(REPO_ROOT, "assets")

# Organização: depot -> list of (loop_id, list of route names)
DISCO_STRUCTURE = [
    ("LCY", [
        ("DY1", ["DY1A", "DY1B", "DY1C", "DY1X", "DY1P"]),
        ("DY2", ["DY2A", "DY2B", "DY2C", "DY2D", "DY2X", "DY2P"]),
    ]),
    ("LSE", [
        ("LL3", ["LL3A", "LL3B", "LL3C", "LL3D", "LL3X"]),
        ("LL4", ["LL4A", "LL4B", "LL4X"]),
    ]),
    ("MSE", [
        ("MD7", ["MD7A", "MD7B", "MD7C", "MD7D", "MD7E", "MD7X"]),
    ]),
]

# Geração de endereços plausíveis por área (prefixo postcode)
STREETS = [
    "High Street", "Church Road", "Station Road", "Victoria Street", "Park Lane",
    "Mill Lane", "Green Lane", "Manor Road", "Kingsway", "Bridge Street",
    "New Road", "George Street", "Queen Street", "Market Street", "School Lane",
]
ADDRESS_FORMATS = [
    "{n} {street}", "{n}a {street}", "{n}b {street}", "Flat {n} {street}",
    "Unit {n} {street}", "{n}-{n2} {street}",
]


def random_postcode(prefix="E"):
    """Gera um subpostcode tipo UK (ex.: E1 2AB)."""
    area = random.randint(1, 20) if prefix == "E" else random.randint(1, 9)
    sector = random.randint(0, 9)
    part = "".join(random.choices("ABCDEFGHJKLMNPQRSTUWXYZ", k=2))
    return "{} {} {}{}".format(prefix, area, sector, part)


def random_address(route_code, stop_index):
    """Gera endereço e destinatário plausíveis."""
    street = random.choice(STREETS)
    n = random.randint(1, 199)
    n2 = random.randint(1, 99) if random.random() > 0.6 else n
    fmt = random.choice(ADDRESS_FORMATS)
    if "{n2}" in fmt:
        addr = fmt.format(n=n, n2=n2, street=street)
    else:
        addr = fmt.format(n=n, street=street)
    recipients = ["J. Smith", "M. Jones", "A. Brown", "Delivery Dept", "Reception", "Care of Manager"]
    return addr, random.choice(recipients)


def generate_stops_per_route(min_stops=8, max_stops=24):
    """Número de stops por rota (variável para realismo)."""
    return random.randint(min_stops, max_stops)


def build_raw_deliveries(seed=42):
    """Constrói lista de raw_deliveries com depot, loop, route e stops gerados."""
    random.seed(seed)
    raw = []
    for depot, loops in DISCO_STRUCTURE:
        for loop_id, routes in loops:
            for route in routes:
                n_stops = generate_stops_per_route()
                prefix = "E" if depot in ("LCY", "LSE") else "RM"  # área exemplo
                for i in range(n_stops):
                    subpostcode = random_postcode(prefix)
                    address, recipient = random_address(route, i)
                    pre12 = random.random() < 0.15
                    asr = random.random() < 0.08
                    dsr = random.random() < 0.12
                    raw.append({
                        "depot": depot,
                        "route": route,
                        "loop": loop_id,
                        "subpostcode": subpostcode,
                        "address": address,
                        "recipient": recipient,
                        "pre12": pre12,
                        "asr": asr,
                        "dsr": dsr,
                    })
    return raw


def build_by_route(raw_deliveries):
    """Constrói byRoute a partir de raw_deliveries (route -> loop, depot, subpostcodes)."""
    by_route = {}
    for r in raw_deliveries:
        route = (r.get("route") or "").strip()
        if not route:
            continue
        if route not in by_route:
            by_route[route] = {"sortWave": "AM", "loop": r.get("loop") or "", "depot": r.get("depot") or "", "subpostcodes": []}
        sub = (r.get("subpostcode") or "").strip()
        if sub and sub not in by_route[route]["subpostcodes"]:
            by_route[route]["subpostcodes"].append(sub)
    for r in by_route:
        by_route[r]["subpostcodes"].sort()
    return by_route


def _route_order_from_structure():
    """Ordem das rotas conforme DISCO_STRUCTURE (depot → loop → route)."""
    order = []
    for _depot, loops in DISCO_STRUCTURE:
        for _loop_id, routes in loops:
            order.extend(routes)
    return order


def build_loops_from_raw(raw_deliveries):
    """Agrupa por loop; totalDeliveries e routes com contagem. Ordem das rotas segue DISCO_STRUCTURE."""
    route_order = _route_order_from_structure()
    loops = {}
    for r in raw_deliveries or []:
        loop_id = (r.get("loop") or "").strip() or "—"
        route = (r.get("route") or "").strip()
        if not loop_id:
            loop_id = "—"
        if loop_id not in loops:
            loops[loop_id] = {"totalDeliveries": 0, "routes": {}}
        loops[loop_id]["totalDeliveries"] += 1
        if route:
            loops[loop_id]["routes"][route] = loops[loop_id]["routes"].get(route, 0) + 1
    def sort_routes(items):
        return sorted(items, key=lambda x: (route_order.index(x[0]) if x[0] in route_order else 999, x[0]))
    return {
        lid: {
            "totalDeliveries": data["totalDeliveries"],
            "routes": [{"route": r, "deliveries": c} for r, c in sort_routes(data["routes"].items())],
        }
        for lid, data in loops.items()
    }


def disco_to_dashboard_json(disco_data):
    """Formato dashboard: deliveries, depot, loop, routes, source, loops."""
    raw = disco_data.get("raw_deliveries") or []
    by_route = disco_data.get("byRoute") or {}
    loops = build_loops_from_raw(raw)
    route_order = _route_order_from_structure()
    if raw:
        deliveries = [
            {
                "depot": r.get("depot", ""),
                "route": r.get("route", ""),
                "loop": r.get("loop", ""),
                "subpostcode": r.get("subpostcode", ""),
                "address": r.get("address", ""),
                "recipient": r.get("recipient", ""),
                "pre12": bool(r.get("pre12")),
                "asr": bool(r.get("asr")),
                "dsr": bool(r.get("dsr")),
            }
            for r in raw
        ]
        routes_in_data = {r.get("route", "") for r in raw if r.get("route")}
        routes = [r for r in route_order if r in routes_in_data]
        for rt in sorted(routes_in_data):
            if rt not in route_order:
                routes.append(rt)
    else:
        deliveries = []
        routes = sorted(by_route.keys())
    return {
        "source": "generate_disco_stops.py",
        "depot": "",
        "loop": "",
        "routes": routes,
        "deliveries": deliveries,
        "loops": loops,
    }


def build_by_route_from_deliveries(deliveries):
    """byRoute para o payload JS: route -> { subpostcodes: [] }."""
    by_route = {}
    for row in deliveries:
        route = (row.get("route") or "").strip()
        sub = row.get("subpostcode")
        if not route:
            continue
        if route not in by_route:
            by_route[route] = {}
        if sub:
            by_route[route][str(sub).strip()] = True
    return {r: {"subpostcodes": sorted(by_route[r].keys())} for r in by_route}


def write_disco_assets(dashboard_disco):
    """Escreve assets/disco.json e assets/disco-data.js."""
    deliveries = dashboard_disco.get("deliveries") or []
    by_route = build_by_route_from_deliveries(deliveries)
    payload = {**dashboard_disco, "byRoute": by_route, "loops": dashboard_disco.get("loops") or {}}
    os.makedirs(ASSETS_DIR, exist_ok=True)
    disco_json_path = os.path.join(ASSETS_DIR, "disco.json")
    with open(disco_json_path, "w", encoding="utf-8") as f:
        json.dump(dashboard_disco, f, indent=2, ensure_ascii=False)
    print("Escrito:", disco_json_path, "(%d deliveries)" % len(deliveries))
    disco_js_path = os.path.join(ASSETS_DIR, "disco-data.js")
    with open(disco_js_path, "w", encoding="utf-8") as f:
        f.write("/* Gerado por scripts/generate_disco_stops.py */\nwindow.DISCO_DATA = ")
        json.dump(payload, f, ensure_ascii=False)
        f.write(";\n")
    print("Escrito:", disco_js_path)
    return True


def main():
    raw = build_raw_deliveries()
    by_route = build_by_route(raw)
    all_routes = sorted(set(r["route"] for r in raw))
    disco_data = {
        "am": all_routes,
        "pm": [],
        "byRoute": by_route,
        "raw_deliveries": raw,
    }
    dashboard_disco = disco_to_dashboard_json(disco_data)
    write_disco_assets(dashboard_disco)
    print("Depots: LCY, LSE, MSE | Loops: DY1, DY2, LL3, LL4, MD7 | Total stops:", len(raw))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Importa dados dos ficheiros Excel para dhl-embedded-data.js:
  - BA Daily Figures 3.xlsx  → OPMS (counts, byRoute)
  - TW 300126.xlsx           → Time Window (% TW Adh DL) por rota
  - DISCO_RouteData_*.xlsx   → Disco (AM / PM runs)

Uso:
  python scripts/import_excel_to_data.py
  (caminhos hardcoded para Downloads ou passados como argumentos)
"""

import json
import os
import re
import sys
from collections import defaultdict

try:
    import openpyxl
except ImportError:
    print("Requer openpyxl: pip install openpyxl", file=sys.stderr)
    sys.exit(1)

# Códigos Act Ckpt que contam no OPMS (igual ao dashboard)
OPMS_CODES = frozenset({"BA", "CA", "CM", "FP", "HN", "NR", "OK", "PU", "RD"})
COL_PUD_SVC = "PUD Svc Area"
COL_PUD_RTE = "PUD Rte"
COL_COURIER = "Courier id"
COL_ACT_CKPT = "Act Ckpt Code"
OPMS_SHEET_NAME = "OPMS - RDT ROADMAP Stop File"


def find_header_row(ws):
    for i, row in enumerate(ws.iter_rows(max_row=20, values_only=True), start=1):
        row_str = [str(c).strip() if c is not None else "" for c in row]
        if COL_ACT_CKPT in row_str:
            return i, row_str
        if any("Act Ckpt Code" in (s or "") for s in row):
            return i, row_str
    return None, []


def find_col(header_row, name, fallback_sub=None):
    for i, h in enumerate(header_row):
        if h == name:
            return i
        if fallback_sub and (h or "").strip() and fallback_sub in (h or "").upper():
            return i
    return None


def parse_opms(ws):
    """Retorna (counts, by_route) onde by_route é dict key "depot|route" -> { depot, route, counts }."""
    header_row_idx, header_row = find_header_row(ws)
    if not header_row:
        return {}, {}

    idx_depot = find_col(header_row, COL_PUD_SVC, "PUD SVC")
    idx_route = find_col(header_row, COL_PUD_RTE, "PUD RTE")
    idx_ckpt = find_col(header_row, COL_ACT_CKPT, "ACT CKPT")
    if idx_ckpt is None:
        return {}, {}

    counts_global = defaultdict(int)
    by_route_raw = defaultdict(lambda: defaultdict(int))

    for row in ws.iter_rows(min_row=header_row_idx + 1, values_only=True):
        row = list(row)
        ckpt = (row[idx_ckpt] if idx_ckpt < len(row) else None)
        ckpt = str(ckpt).strip().upper() if ckpt else ""
        if ckpt not in OPMS_CODES:
            continue
        depot = str(row[idx_depot] or "").strip() if idx_depot < len(row) else ""
        route = str(row[idx_route] or "").strip() if idx_route < len(row) else ""
        counts_global[ckpt] += 1
        by_route_raw[(depot, route)][ckpt] += 1

    by_route = {}
    for (depot, route), cnt in by_route_raw.items():
        key = depot + "|" + route
        by_route[key] = {"depot": depot, "route": route, "counts": dict(cnt)}
    return dict(counts_global), by_route


def parse_tw(ws):
    """Sheet Export: coluna Route e '% TW Adh DL'. Retorna { routeName: value } (0-1)."""
    rows = list(ws.iter_rows(max_row=500, values_only=True))
    if not rows:
        return {}
    header = [str(c).strip() if c is not None else "" for c in rows[0]]
    col_route = -1
    col_tw = -1
    for i, h in enumerate(header):
        if re.search(r"route", h, re.I) and col_route < 0:
            col_route = i
        if re.search(r"%\s*TW\s*Adh\s*DL|TW Adh DL", h, re.I):
            col_tw = i
    if col_route < 0 or col_tw < 0:
        return {}
    tw_by_route = {}
    for row in rows[1:]:
        row = list(row)
        route = str(row[col_route] or "").strip() if col_route < len(row) else ""
        val = row[col_tw] if col_tw < len(row) else None
        if not route:
            continue
        num = None
        if isinstance(val, (int, float)) and not (isinstance(val, bool)):
            num = float(val)
        elif val is not None and str(val).strip():
            try:
                num = float(str(val).replace(",", ".").replace(" ", ""))
            except ValueError:
                pass
        if num is not None:
            tw_by_route[route] = num
    return tw_by_route


def _normalise_subpostcode(val):
    """Converte valor (postcode ou subpostcode) para subpostcode: trim e remove últimos 2 chars se longo."""
    s = str(val or "").strip().replace(" ", "")
    if len(s) <= 2:
        return s if s else None
    return s[:-2] if len(s) > 2 else s


def parse_disco(ws):
    """Sheet com Route e SortWave (AM/PM). Opcional: Loop, Cycle, Depot, Subpostcode/Postcode.
    Retorna { am: [routes], pm: [routes], byRoute: { route: { sortWave, loop?, depot?, subpostcodes: [] } } }."""
    rows = list(ws.iter_rows(max_row=2000, values_only=True))
    if not rows:
        return {"am": [], "pm": [], "byRoute": {}}
    header_row_idx = 0
    for i in range(min(5, len(rows))):
        row = [str(c).strip() if c is not None else "" for c in rows[i]]
        if "Route" in row and ("Cycle" in row or "SortWave" in (row or []) or any("Sort" in (h or "") for h in row)):
            header_row_idx = i
            break
    header = [str(c).strip() if c is not None else "" for c in rows[header_row_idx]]
    col_route = header.index("Route") if "Route" in header else -1
    col_sort = -1
    col_loop = -1
    col_depot = -1
    col_subpostcode = -1
    for i, h in enumerate(header):
        h = (h or "").strip()
        if "SortWave" in h or "Sort Wave" in h:
            col_sort = i
        if h == "Loop" or h == "Cycle":
            col_loop = i
        if h == "Depot" or "PUD SVC" in h or "PUD Svc" in h:
            col_depot = i
        if "Subpostcode" in h or "Sub Postcode" in h or "Sub postcode" in h:
            col_subpostcode = i
        if col_subpostcode < 0 and (h == "Postcode" or "Post code" in h):
            col_subpostcode = i
    if col_route < 0:
        return {"am": [], "pm": [], "byRoute": {}}
    am_set = set()
    pm_set = set()
    by_route = {}
    for row in rows[header_row_idx + 1:]:
        row = list(row)
        route = str(row[col_route] or "").strip() if col_route < len(row) else ""
        if not route or route.upper() == "ROUTE":
            continue
        wave = str(row[col_sort] or "").strip().upper() if col_sort >= 0 and col_sort < len(row) else ""
        is_am = "AM" in wave or wave == "AM"
        is_pm = "PM" in wave or wave == "PM"
        if is_am:
            am_set.add(route)
        if is_pm:
            pm_set.add(route)
        loop = str(row[col_loop] or "").strip() if col_loop >= 0 and col_loop < len(row) else None
        loop = loop or None
        depot = str(row[col_depot] or "").strip() if col_depot >= 0 and col_depot < len(row) else None
        depot = depot or None
        sub_raw = str(row[col_subpostcode] or "").strip() if col_subpostcode >= 0 and col_subpostcode < len(row) else None
        sub = _normalise_subpostcode(sub_raw) if sub_raw else None
        if route not in by_route:
            by_route[route] = {"sortWave": "AM" if is_am else "PM", "loop": None, "depot": None, "subpostcodes": []}
        if loop:
            by_route[route]["loop"] = loop
        if depot:
            by_route[route]["depot"] = depot
        if sub and sub not in by_route[route]["subpostcodes"]:
            by_route[route]["subpostcodes"].append(sub)
    for r in by_route:
        by_route[r]["subpostcodes"].sort()
    return {"am": sorted(am_set), "pm": sorted(pm_set), "byRoute": by_route}


def main():
    base = os.path.expanduser("~/Downloads")
    path_ba = os.path.join(base, "BA Daily Figures 3.xlsx")
    path_tw = os.path.join(base, "TW 300126.xlsx")
    path_disco = os.path.join(base, "DISCO_RouteData_20260202_064654.xlsx")
    if len(sys.argv) >= 4:
        path_ba, path_tw, path_disco = sys.argv[1], sys.argv[2], sys.argv[3]

    # Data da operação (do ficheiro OPMS costuma ser Act Dt; usar 2026-01-30 como exemplo)
    opms_date = "2026-01-30"

    disco_data = {"am": [], "pm": []}
    opms_counts = {}
    opms_by_route = {}
    tw_by_route = {}

    if os.path.isfile(path_disco):
        wb = openpyxl.load_workbook(path_disco, read_only=True, data_only=True)
        for name in wb.sheetnames:
            disco_data = parse_disco(wb[name])
            if disco_data["am"] or disco_data["pm"]:
                break
        wb.close()
    else:
        print("Ficheiro DISCO não encontrado:", path_disco, file=sys.stderr)

    if os.path.isfile(path_tw):
        wb = openpyxl.load_workbook(path_tw, read_only=True, data_only=True)
        for name in wb.sheetnames:
            tw_by_route = parse_tw(wb[name])
            if tw_by_route:
                break
        wb.close()
    else:
        print("Ficheiro TW não encontrado:", path_tw, file=sys.stderr)

    if os.path.isfile(path_ba):
        wb = openpyxl.load_workbook(path_ba, read_only=True, data_only=True)
        for name in wb.sheetnames:
            if OPMS_SHEET_NAME.lower() in name.lower():
                opms_counts, opms_by_route = parse_opms(wb[name])
                break
        if not opms_counts and not opms_by_route:
            for name in wb.sheetnames:
                opms_counts, opms_by_route = parse_opms(wb[name])
                if opms_counts or opms_by_route:
                    break
        wb.close()
    else:
        print("Ficheiro BA não encontrado:", path_ba, file=sys.stderr)

    # Gerar ficheiro JS
    out_dir = os.path.join(os.path.dirname(__file__), "..")
    out_path = os.path.join(out_dir, "dhl-embedded-data.js")

    opms_for_date = {
        "counts": opms_counts,
        "byRoute": opms_by_route,
        "twByRoute": tw_by_route,
        "incomeByRouteFromExcel": {}
    }

    js_content = """/**
 * Dados importados dos ficheiros Excel (DISCO, OPMS, Time Window).
 * Gerado por scripts/import_excel_to_data.py
 * - DISCO_RouteData: rotas AM/PM
 * - BA Daily Figures 3: OPMS (counts, byRoute)
 * - TW 300126: Time Window (% TW Adh DL) por rota
 */
(function () {
  'use strict';
  window.DISCO_DATA = """
    js_content += json.dumps(disco_data, indent=2, ensure_ascii=False)
    js_content += """;

  window.OPMS_EMBEDDED_DATA = """
    js_content += json.dumps({opms_date: opms_for_date}, indent=2, ensure_ascii=False)
    js_content += """;
})();
"""
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(js_content)
    print("Escrito:", out_path)
    print("  DISCO: am=%d, pm=%d rotas" % (len(disco_data["am"]), len(disco_data["pm"])))
    print("  OPMS: %s counts, %d byRoute" % (opms_date, len(opms_by_route)))
    print("  TW: %d rotas" % len(tw_by_route))
    return 0


if __name__ == "__main__":
    sys.exit(main() or 0)

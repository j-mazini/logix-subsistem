#!/usr/bin/env python3
"""
Gera dados de Last Day Operations para um mês completo.
- DEL (OK), PU e HN com valores justos e variados.
- Dias com overloop (acima do target), bons (próximo do target) e poucos (abaixo).
- Saída: JavaScript para merge em window.OPMS_EMBEDDED_DATA (dhl-lastday-pdf-data.js).
"""
import json
from datetime import date, timedelta
from collections import OrderedDict

# Rotas por depot (igual CONTRACT_DEPOTS_STRUCTURE). targetDel=80, targetPu=10
ROUTES = [
    ("MSE", "MD7A"), ("MSE", "MD7B"), ("MSE", "MD7C"), ("MSE", "MD7D"), ("MSE", "MD7E"), ("MSE", "MD7X"),
    ("LCY", "DY1A"), ("LCY", "DY1B"), ("LCY", "DY1C"), ("LCY", "DY1X"),
    ("LCY", "DY2A"), ("LCY", "DY2B"), ("LCY", "DY2C"), ("LCY", "DY2D"), ("LCY", "DY2X"),
    ("LSE", "LL3A"), ("LSE", "LL3B"), ("LSE", "LL3C"), ("LSE", "LL3D"), ("LSE", "LL3X"),
    ("LSE", "LL4A"), ("LSE", "LL4B"), ("LSE", "LL4X"),
]
TARGET_DEL = 80
TARGET_PU = 10

# Perfis por dia: overloop (acima), good (bom), low (poucos)
# OK range, PU range, HN range (mín, máx)
PROFILES = {
    "overloop": {"ok": (85, 98), "pu": (10, 16), "hn": (2, 8)},
    "good":     {"ok": (72, 84), "pu": (7, 12), "hn": (1, 5)},
    "low":      {"ok": (48, 68), "pu": (3, 8),  "hn": (0, 3)},
}

def month_dates(year, month):
    """Lista de datas do mês (YYYY-MM-DD)."""
    d = date(year, month, 1)
    out = []
    while d.month == month:
        out.append(d.strftime("%Y-%m-%d"))
        d += timedelta(days=1)
    return out

def pick_profile(day_index, route_index, seed=0):
    """Escolhe perfil do dia com alguma variação por rota (determinístico)."""
    # Padrão: dias 0,1,5,6,10,11... overloop; 2,3,7,8... good; 4,9,14... low
    r = (day_index + route_index + seed) % 15
    if r in (0, 1, 5, 6, 10, 11):
        return "overloop"
    if r in (4, 9, 14):
        return "low"
    return "good"

def _deterministic_int(s, a, b):
    """Inteiro em [a,b] determinístico a partir de s (string ou int)."""
    h = 0
    for c in str(s):
        h = (31 * h + ord(c)) % (2**32)
    return a + (h % (b - a + 1)) if b >= a else a

def random_in(rng, seed):
    """Inteiro no intervalo [a,b] com seed para reprodutibilidade."""
    return _deterministic_int(seed, rng[0], rng[1])

def generate_counts_for_route(day_index, route_index, depot, route, date_str):
    """Gera counts OK, PU, HN (+ pequenos CA, FP, BA para AFD) para uma rota num dia."""
    profile = pick_profile(day_index, route_index)
    p = PROFILES[profile]
    seed = hash(date_str + depot + route) % (2**31)
    ok = random_in(p["ok"], seed)
    pu = random_in(p["pu"], seed + 1)
    hn = random_in(p["hn"], seed + 2)
    # Pequenas falhas (AFD) em alguns dias
    ca = random_in((0, 2), seed + 3)
    fp = random_in((0, 4), seed + 4)
    ba = random_in((0, 2), seed + 5)
    return {
        "OK": ok,
        "PU": pu,
        "HN": hn,
        "CA": ca,
        "FP": fp,
        "BA": ba,
    }

def generate_tw_for_route(route_name, day_index, route_index):
    """Time Window 0-100 (percent). Varia ligeiramente por dia."""
    base = 82 + (_deterministic_int(route_name, 0, 17))  # 82-99
    delta = (day_index + route_index) % 7 - 3  # -3 a +3
    return min(100, max(75, base + delta))

def generate_day(date_str, day_index):
    """Gera byRoute e twByRoute para uma data."""
    by_route = OrderedDict()
    tw_by_route = {}
    for ri, (depot, route) in enumerate(ROUTES):
        key = f"{depot}|{route}"
        counts = generate_counts_for_route(day_index, ri, depot, route, date_str)
        by_route[key] = {
            "depot": depot,
            "route": route,
            "counts": counts,
        }
        tw_by_route[route] = generate_tw_for_route(route, day_index, ri)
    return {
        "byRoute": by_route,
        "twByRoute": tw_by_route,
        "incomeByRouteFromExcel": {},
    }

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Generate one month of Last Day data")
    parser.add_argument("--year", type=int, default=2026)
    parser.add_argument("--month", type=int, default=2)
    parser.add_argument("--out", default=None, help="Output JS file path")
    args = parser.parse_args()

    dates = month_dates(args.year, args.month)
    data = OrderedDict()
    for i, d in enumerate(dates):
        data[d] = generate_day(d, i)

    out_path = args.out
    if not out_path:
        import os
        out_path = os.path.join(os.path.dirname(__file__), "..", "dhl-lastday-pdf-data.js")

    js_content = """/**
 * Last Day Operations – dados gerados para um mês (DEL, PU, HN completos).
 * Gerado por scripts/generate_lastday_month.py
 * Dias com overloop, bons e poucos valores.
 * Incluir após dhl-embedded-data.js.
 */
(function(){ if (typeof window !== "undefined" && window.OPMS_EMBEDDED_DATA) {
  var d = """
    js_content += json.dumps(data, indent=2, ensure_ascii=False)
    js_content += """;
  for (var k in d) window.OPMS_EMBEDDED_DATA[k] = d[k];
} })();
"""
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(js_content)
    print("Written:", out_path)
    print("  Dates:", len(dates), "(", dates[0], "..", dates[-1], ")")
    print("  Routes:", len(ROUTES))
    return 0

if __name__ == "__main__":
    exit(main() or 0)

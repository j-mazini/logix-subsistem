#!/usr/bin/env python3
"""
Gera assets/disco-data.js a partir de assets/disco.json para o dashboard SP.
Os dados do Disco aparecem mesmo ao abrir a página por file:// (fetch falha).

Uso:
  python scripts/disco_json_to_js.py
  python scripts/disco_json_to_js.py --input assets/disco.json --output assets/disco-data.js
"""
import argparse
import json
import os
import sys


def build_by_route_from_deliveries(deliveries):
    """Constrói dict route -> { subpostcodes: [] } a partir da lista de deliveries."""
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


def main():
    parser = argparse.ArgumentParser(description="Gera disco-data.js a partir de disco.json")
    parser.add_argument(
        "--input", "-i",
        default=None,
        help="Caminho para disco.json (default: assets/disco.json no repo)",
    )
    parser.add_argument(
        "--output", "-o",
        default=None,
        help="Caminho para disco-data.js (default: assets/disco-data.js no repo)",
    )
    args = parser.parse_args()

    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    json_path = args.input or os.path.join(base, "assets", "disco.json")
    out_path = args.output or os.path.join(base, "assets", "disco-data.js")

    if not os.path.isfile(json_path):
        print("Erro: ficheiro não encontrado:", json_path, file=sys.stderr)
        return 1

    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print("Erro ao ler JSON:", e, file=sys.stderr)
        return 1
    except OSError as e:
        print("Erro ao abrir ficheiro:", e, file=sys.stderr)
        return 1

    deliveries = data.get("deliveries")
    if not isinstance(deliveries, list):
        deliveries = []
    by_route = build_by_route_from_deliveries(deliveries)
    payload = {
        "source": data.get("source", "disco.json"),
        "depot": data.get("depot", ""),
        "loop": data.get("loop", ""),
        "routes": data.get("routes") if isinstance(data.get("routes"), list) else [],
        "deliveries": deliveries,
        "byRoute": by_route,
    }

    out_dir = os.path.dirname(out_path)
    try:
        os.makedirs(out_dir, exist_ok=True)
        js_content = (
            "/* Gerado por scripts/disco_json_to_js.py a partir de assets/disco.json */\n"
            "window.DISCO_DATA = " + json.dumps(payload, ensure_ascii=False) + ";\n"
        )
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(js_content)
    except OSError as e:
        print("Erro ao escrever ficheiro:", e, file=sys.stderr)
        return 1

    print("Escrito:", out_path, "(%d deliveries)" % len(deliveries))
    return 0


if __name__ == "__main__":
    sys.exit(main())

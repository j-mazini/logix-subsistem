#!/usr/bin/env python3
"""
Lê um ou mais ficheiros Excel DISCO (Route Data), junta os dados e gera
assets/disco.json e assets/disco-data.js. Suporta .xlsx e .xls (para .xls
é necessário: pip install pandas xlrd).

Uso:
  python scripts/disco_excel_to_assets.py
  python scripts/disco_excel_to_assets.py ficheiro1.xlsx
  python scripts/disco_excel_to_assets.py ficheiro1.xls ficheiro2.xlsx ficheiro3.xls

Por defeito usa: ~/Downloads/DISCO_RouteData_20260202_064654.xlsx
"""

import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, SCRIPT_DIR)

from import_excel_to_data import (
    load_excel_rows,
    parse_disco,
    parse_disco_from_rows,
    merge_disco_data,
    disco_to_dashboard_json,
    write_disco_assets,
)

try:
    import openpyxl
except ImportError:
    openpyxl = None


def _load_one(path):
    """Carrega um ficheiro e devolve disco_data (dict)."""
    path = os.path.normpath(os.path.expanduser(path))
    ext = os.path.splitext(path)[1].lower()
    if ext == ".xls":
        rows = load_excel_rows(path)
        return parse_disco_from_rows(rows)
    if openpyxl:
        wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        for name in wb.sheetnames:
            disco_data = parse_disco(wb[name])
            if disco_data.get("am") or disco_data.get("pm") or disco_data.get("raw_deliveries"):
                wb.close()
                return disco_data
        wb.close()
    # fallback: tentar como linhas (ex.: xlsx sem openpyxl não deve acontecer)
    rows = load_excel_rows(path)
    return parse_disco_from_rows(rows)


def main():
    default_path = os.path.join(
        os.path.expanduser("~/Downloads"),
        "DISCO_RouteData_20260202_064654.xlsx",
    )
    paths = []
    for i in range(1, len(sys.argv)):
        p = (sys.argv[i] or "").strip()
        if p:
            paths.append(os.path.normpath(os.path.expanduser(p)))
    if not paths:
        paths = [default_path]

    data_list = []
    for path in paths:
        if not os.path.isfile(path):
            print("Ficheiro não encontrado:", path, file=sys.stderr)
            continue
        try:
            data_list.append(_load_one(path))
            print("OK:", path)
        except Exception as e:
            print("Erro ao ler %s: %s" % (path, e), file=sys.stderr)

    if not data_list:
        print("Nenhum ficheiro foi carregado.", file=sys.stderr)
        return 1

    disco_data = merge_disco_data(data_list)
    dashboard_disco = disco_to_dashboard_json(disco_data)
    if write_disco_assets(dashboard_disco):
        loops = dashboard_disco.get("loops") or {}
        print("Total entregas:", len(dashboard_disco.get("deliveries") or []))
        print("Loops:", list(loops.keys()))
        for loop_id, data in loops.items():
            print("  Loop %s: %d entregas, %d rotas" % (
                loop_id, data.get("totalDeliveries", 0), len(data.get("routes") or [])))
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())

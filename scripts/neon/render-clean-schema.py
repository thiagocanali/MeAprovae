#!/usr/bin/env python3
"""Render the canonical Supabase SQL migrations for the clean Neon Auth bridge.

This modifies SQL *text* only; it never connects to a database. The original
Supabase migrations remain unchanged and continue to support the old system.
The generated file is temporary and must never include data or credentials.
"""
from __future__ import annotations

import argparse
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "supabase" / "migrations"
AUTH_USERS = re.compile(r"(?<![A-Za-z_0-9])auth\.users\b", re.IGNORECASE)


def render() -> str:
    files = sorted(SOURCE.glob("*.sql"), key=lambda p: p.name)
    if not files:
        raise RuntimeError("Nenhuma migration SQL encontrada.")
    statements = [
        "-- Gerado de migrations versionadas; não execute em produção sem revisão.\n",
        "-- Neon Managed Auth e Data API devem ser provisionados previamente.\n",
    ]
    for file in files:
        sql = file.read_text(encoding="utf-8")
        # Existing foreign keys and signup trigger now use a bridge that
        # REFERENCES neon_auth.user(id) rather than Supabase's managed auth table.
        adapted = AUTH_USERS.sub("public.auth_users", sql)
        statements.append(f"\n-- FILE: {file.name}\n{adapted.rstrip()}\n")
    return "".join(statements)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    destination = args.output.resolve()
    if SOURCE in destination.parents:
        raise SystemExit("Recusado: o gerador nunca deve modificar migrations de origem.")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(render(), encoding="utf-8")
    print(f"Schema Neon renderizado: {len(list(SOURCE.glob('*.sql')))} migrations")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Static validation for the M2y Chrome extension.

Checks that local resources referenced by manifest.json, HTML, CSS and
JavaScript imports exist in the repository tree. This does not execute
Chrome APIs; it is a structural preflight only.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IGNORE = {"http://", "https://", "chrome://", "data:", "#", "//"}


def is_local(value: str) -> bool:
    value = value.strip()
    return value and not any(value.startswith(prefix) for prefix in IGNORE)


def check_ref(raw: str, source: Path, missing: list[str]) -> None:
    value = raw.split("?", 1)[0].split("#", 1)[0].strip()
    if not is_local(value):
        return
    target = (source.parent / value).resolve()
    try:
        target.relative_to(ROOT.resolve())
    except ValueError:
        missing.append(f"{source.relative_to(ROOT)} -> {value} (outside repository)")
        return
    if not target.exists():
        missing.append(f"{source.relative_to(ROOT)} -> {value}")


def main() -> int:
    missing: list[str] = []

    manifest_path = ROOT / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    for key in ("icons", "action", "background", "content_scripts"):
        # Collect string paths recursively from the selected manifest sections.
        def walk(value):
            if isinstance(value, dict):
                for k, v in value.items():
                    if isinstance(v, str) and (k in {"service_worker", "default_popup"} or k.isdigit()):
                        check_ref(v, manifest_path, missing)
                    else:
                        walk(v)
            elif isinstance(value, list):
                for item in value:
                    walk(item)
        walk(manifest.get(key))

    patterns = [
        re.compile(r"""\b(?:src|href)\s*=\s*["']([^"']+)["']""", re.I),
        re.compile(r"""\bimport\s+(?:[^;]*?\s+from\s+)?["']([^"']+)["']"""),
        re.compile(r"""\bimport\(\s*["']([^"']+)["']\s*\)"""),
        re.compile(r"""\b(?:files|resources)\s*:\s*\[([^\]]*)\]""", re.I),
    ]

    for source in ROOT.rglob("*"):
        if not source.is_file() or ".git" in source.parts or source.suffix.lower() not in {".html", ".js", ".css"}:
            continue
        text = source.read_text(encoding="utf-8", errors="ignore")
        for pattern in patterns[:3]:
            for match in pattern.finditer(text):
                check_ref(match.group(1), source, missing)

    if missing:
        print("M2y structural validation: FAILED")
        for item in sorted(set(missing)):
            print(" -", item)
        return 1

    print("M2y structural validation: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

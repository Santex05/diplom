#!/usr/bin/env python3
"""Убрать маркеры git merge: оставить блок после ======= (версия AniHex)."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MARKER = re.compile(
    r"<<<<<<< HEAD\r?\n"
    r"(?:.*?\r?\n)?"
    r"=======\r?\n"
    r"(.*?)"
    r">>>>>>> [^\r\n]+\r?\n?",
    re.DOTALL,
)


def resolve(text: str) -> tuple[str, int]:
    n = 0

    def repl(m: re.Match) -> str:
        nonlocal n
        n += 1
        return m.group(1)

    return MARKER.sub(repl, text), n


def main():
    total_files = 0
    total_blocks = 0
    for path in ROOT.rglob("*"):
        if path.is_dir():
            continue
        if ".git" in path.parts or "node_modules" in path.parts:
            continue
        if path.suffix in {".png", ".jpg", ".webp", ".ico", ".woff2"}:
            continue
        try:
            raw = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        if "<<<<<<< HEAD" not in raw:
            continue
        fixed, blocks = resolve(raw)
        if blocks:
            path.write_text(fixed, encoding="utf-8", newline="\n")
            total_files += 1
            total_blocks += blocks
            print(f"{blocks:3d}  {path.relative_to(ROOT)}")

    print(f"\nГотово: {total_files} файлов, {total_blocks} конфликтов")


if __name__ == "__main__":
    main()

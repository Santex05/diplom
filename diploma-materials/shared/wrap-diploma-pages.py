#!/usr/bin/env python3
"""Wrap diploma HTML body into .doc-page blocks for print and Word transfer."""

import re
import sys
from pathlib import Path

# Split before these markers (new logical page)
SPLIT_RE = re.compile(
    r'(?=<(?:p|h1|h2|div|section)\s[^>]*class="(?:struct-heading|chapter-title)[^"]*")',
    re.IGNORECASE,
)

TITLE_RE = re.compile(
    r'<section\s+class="title-page">.*?</section>|<div\s+class="title-page">.*?</div>',
    re.DOTALL | re.IGNORECASE,
)

TOC_START_RE = re.compile(
    r'(<(?:p|h1|h2)\s[^>]*class="[^"]*struct-heading[^"]*"[^>]*>)',
    re.IGNORECASE,
)


def wrap_body(body: str) -> str:
    body = body.strip()
    if 'class="doc-page' in body or "class='doc-page" in body:
        return body

    body = re.sub(r'<article[^>]*>|</article>', '', body, flags=re.IGNORECASE).strip()

    title_m = TITLE_RE.search(body)
    if not title_m:
        raise ValueError('title-page not found')

    title_html = title_m.group(0)
    rest = body[title_m.end() :].strip()

    toc_m = TOC_START_RE.search(rest)
    if not toc_m:
        raise ValueError('TOC heading not found')

    toc_start = toc_m.start()
    toc_block = rest[toc_start:]
    intro_and_rest = re.sub(r'<!--.*?-->', '', rest[:toc_start], flags=re.DOTALL).strip()
    if intro_and_rest:
        raise ValueError('unexpected content between title and TOC')

    parts = [p for p in SPLIT_RE.split(toc_block) if p.strip()]
    if not parts:
        raise ValueError('no content sections found')

    pages = [
        f'<div class="doc-page no-page-num">{title_html}</div>',
        f'<div class="doc-page no-page-num">{parts[0].strip()}</div>',
    ]

    for i, part in enumerate(parts[1:], start=1):
        cls = 'doc-page page-num'
        if i == 1:
            cls += ' page-num-start'
        pages.append(f'<div class="{cls}">{part.strip()}</div>')

    return '\n\n'.join(pages)


def process_file(path: Path) -> None:
    text = path.read_text(encoding='utf-8')
    body_m = re.search(r'<body[^>]*>(.*?)</body>', text, re.DOTALL | re.IGNORECASE)
    if not body_m:
        raise ValueError(f'no body in {path}')

    wrapped = wrap_body(body_m.group(1))
    if wrapped == body_m.group(1).strip():
        print(f'Skip (already wrapped): {path}')
        return
    new_text = text[: body_m.start(1)] + '\n\n' + wrapped + '\n\n' + text[body_m.end(1) :]
    path.write_text(new_text, encoding='utf-8')
    print(f'OK: {path} ({wrapped.count("doc-page")} pages)')


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    files = [
        root / '01-server' / 'diploma.html',
        root / '02-web' / 'diploma.html',
        root / '03-docker' / 'diploma.html',
    ]
    for f in files:
        process_file(f)


if __name__ == '__main__':
    main()

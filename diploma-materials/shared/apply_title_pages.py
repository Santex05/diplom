#!/usr/bin/env python3
"""Подставить общий шаблон титульного листа во все diploma.html."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE_PATH = Path(__file__).resolve().parent / 'title-page-mu.html'

TOPICS = {
    '01-server': '«Разработка серверной логики веб-платформы для просмотра японских мультипликационных сериалов»',
    '02-web': '«Разработка клиентской части веб-платформы для просмотра японских мультипликационных сериалов»',
    '03-docker': '«Контейнеризация и автоматизация развёртывания веб-платформы для просмотра японских мультипликационных сериалов (на примере AniHex)»',
}

TITLE_PAGE_RE = re.compile(
    r'<div class="doc-page no-page-num">\s*<section class="title-page.*?</section>\s*</div>',
    re.S,
)


def main() -> None:
    tpl = TEMPLATE_PATH.read_text(encoding='utf-8')
    tpl = re.sub(r'<!--.*?-->\s*', '', tpl, flags=re.S).strip()

    for folder, topic in TOPICS.items():
        path = ROOT / folder / 'diploma.html'
        html = path.read_text(encoding='utf-8')
        section = tpl.replace('TOPIC', topic)
        block = f'<div class="doc-page no-page-num">\n{section}\n</div>'
        new_html, n = TITLE_PAGE_RE.subn(block, html, count=1)
        if n != 1:
            raise SystemExit(f'Титул не найден: {path}')
        path.write_text(new_html, encoding='utf-8')
        print(f'OK: {path.name}')


if __name__ == '__main__':
    main()

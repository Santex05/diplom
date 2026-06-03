#!/usr/bin/env python3
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

DOCKER_TOC = '''<div class="doc-page no-page-num"><p class="struct-heading no-indent">СОДЕРЖАНИЕ</p>
  <ul class="toc no-indent">
    <li><span>ВВЕДЕНИЕ</span><span class="toc-dots"></span><span>3</span></li>
    <li><span>ГЛАВА 1. ОПИСАНИЕ ПРЕДМЕТНОЙ ОБЛАСТИ</span><span class="toc-dots"></span><span>8</span></li>
    <li><span>&nbsp;&nbsp;1.1. Идентификация предметной области</span><span class="toc-dots"></span><span>8</span></li>
    <li><span>&nbsp;&nbsp;1.2. Анализ существующих аналогов</span><span class="toc-dots"></span><span>12</span></li>
    <li><span>&nbsp;&nbsp;1.3. Требования к разрабатываемой информационной системе</span><span class="toc-dots"></span><span>16</span></li>
    <li><span>&nbsp;&nbsp;1.4. Определение ролей пользователей программного продукта</span><span class="toc-dots"></span><span>20</span></li>
    <li><span>&nbsp;&nbsp;1.5. Обоснование выбора технологического стека</span><span class="toc-dots"></span><span>24</span></li>
    <li><span>ГЛАВА 2. ПРОЕКТИРОВАНИЕ И РАЗРАБОТКА ПРОГРАММНОГО ПРОДУКТА</span><span class="toc-dots"></span><span>28</span></li>
    <li><span>&nbsp;&nbsp;2.1. Автоматизация развёртывания и обновления локального окружения</span><span class="toc-dots"></span><span>28</span></li>
    <li><span>&nbsp;&nbsp;2.2. Деплой, эксплуатация и публикация</span><span class="toc-dots"></span><span>38</span></li>
    <li><span>ЗАКЛЮЧЕНИЕ</span><span class="toc-dots"></span><span>44</span></li>
    <li><span>СПИСОК ИСПОЛЬЗОВАННЫХ ИСТОЧНИКОВ</span><span class="toc-dots"></span><span>46</span></li>
    <li><span>ПРИЛОЖЕНИЕ 1</span><span class="toc-dots"></span><span>48</span></li>
  </ul></div>'''


def cleanup(html: str) -> str:
    # дубли заголовков главы 2
    html = re.sub(
        r'<div class="doc-page page-num"><div class="chapter-title">ГЛАВА 2[^<]*</div>\s*',
        '',
        html,
    )
    html = re.sub(
        r'<div class="doc-page page-num"><p class="chapter-title">ГЛАВА 2[^<]*</p>\s*'
        r'(?=<p class="section-title">2\.1\.[^1])',
        '',
        html,
        count=1,
    )
    html = re.sub(r'<div class="section-title">\s*</div>\s*', '', html)
    html = re.sub(
        r'<p class="section-title">\s*2\.5\. Документация DEPLOY[^<]*</p>\s*',
        '',
        html,
    )
    html = re.sub(
        r'<p class="section-title">\s*</p>\s*',
        '',
        html,
    )
    return html


def main():
    web = ROOT / '02-web' / 'diploma.html'
    docker = ROOT / '03-docker' / 'diploma.html'

    w = cleanup(web.read_text(encoding='utf-8'))
    web.write_text(w, encoding='utf-8')

    d = docker.read_text(encoding='utf-8')
    d = re.sub(
        r'<div class="doc-page no-page-num"><p class="struct-heading no-indent">СОДЕРЖАНИЕ</p>.*?</ul>\s*(?:<!--[^>]*-->)?\s*</div>',
        DOCKER_TOC,
        d,
        count=1,
        flags=re.S,
    )
    d = cleanup(d)
    docker.write_text(d, encoding='utf-8')
    print('cleanup OK')


if __name__ == '__main__':
    main()

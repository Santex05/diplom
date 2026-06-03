#!/usr/bin/env python3
"""Обновление титульных листов (Приложение 6) и разбиение главы 1 по страницам."""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = (Path(__file__).parent / 'title-page-mu.html').read_text(encoding='utf-8')
TEMPLATE_BODY = re.sub(r'<!--.*?-->\s*', '', TEMPLATE, flags=re.S).strip()

TOPICS = {
    '01-server': '«Разработка серверной логики веб-платформы для просмотра японских мультипликационных сериалов»',
    '02-web': '«Разработка клиентской части веб-платформы для просмотра японских мультипликационных сериалов»',
    '03-docker': '«Контейнеризация и автоматизация развёртывания веб-платформы для просмотра японских мультипликационных сериалов (на примере AniHex)»',
}

PAGE_BREAK = '\n</div>\n\n<div class="doc-page page-num">\n\n'


def title_block(topic: str) -> str:
    body = TEMPLATE_BODY.replace('TOPIC', topic)
    return f'<div class="doc-page no-page-num">\n{body}\n</div>'


def replace_title_page(html: str, folder: str) -> str:
    topic = TOPICS[folder]
    new_title = title_block(topic)
    return re.sub(
        r'<div class="doc-page no-page-num">\s*(?:<div|<section)[^>]*class="title-page"[^>]*>.*?</(?:div|section)>\s*</div>',
        new_title,
        html,
        count=1,
        flags=re.S,
    )


def split_chapter1(html: str, section_markers: list[str]) -> str:
    """Вставить разрыв страницы перед каждым маркером (кроме первого)."""
    for marker in section_markers[1:]:
        pat = re.escape(marker)
        html = re.sub(
            rf'(\n)(<(?:p|div) class="section-title">{pat})',
            rf'\1{PAGE_BREAK}\2',
            html,
            count=1,
        )
    return html


def patch_01_server(html: str) -> str:
    html = replace_title_page(html, '01-server')
    html = html.replace(
        '1.1. Веб-платформы для потокового просмотра сериального контента',
        '1.1. Серверная подсистема платформ потокового видеоконтента',
    )
    html = split_chapter1(
        html,
        [
            '1.1.',
            '1.2. Архитектура REST API',
            '1.3. Реляционные СУБД',
            '1.4. Административные системы',
        ],
    )
    return html


def patch_02_web(html: str) -> str:
    html = replace_title_page(html, '02-web')
    # Убрать одинаковые «набивные» абзацы в конце гл. 1
    filler = re.compile(
        r'\n<p>Модель зрелости веб-приложений.*?</p>\n<p>Browser compatibility:.*?</p>',
        re.S,
    )
    html = filler.sub('', html)

    section_15 = '''
<div class="section-title">1.5 Доступность интерфейса, производительность клиента и границы ответственности SPA</div>
<p>Доступность (a11y) стримингового клиента включает управление с клавиатуры, контраст подписей к постеру, aria-label у кнопок плеера и корректный порядок фокуса в модальных окнах выбора серии. В AniHex горячие клавиши плеера не перехватывают ввод в полях поиска; для production рекомендуется аудит WCAG 2.1 уровня AA на страницах каталога и просмотра.</p>
<p>Производительность SPA достигается code splitting маршрутов, React.memo на карточках каталога, useMemo для отфильтрованных списков и throttling сохранения прогресса — без глобального Redux. Клиент не дублирует бизнес-правила сервера: валидация форм носит вспомогательный характер, источник истины — REST API. Таким образом, теоретическая глава сфокусирована на представлении и UX, а не на администрировании каталога или контейнерном деплое.</p>
'''
    html = html.replace(
        'но определяет общую модель угроз веб-платформы.</p>\n\n\n',
        'но определяет общую модель угроз веб-платформы.</p>\n\n' + section_15 + '\n',
        1,
    )

    toc = '''<div class="doc-page no-page-num"><p class="struct-heading no-indent">СОДЕРЖАНИЕ</p>
<ul class="toc no-indent">
  <li><span>ВВЕДЕНИЕ</span><span class="toc-dots"></span><span>3</span></li>
  <li><span>ГЛАВА 1. ТЕОРЕТИЧЕСКИЕ ОСНОВЫ РАЗРАБОТКИ ВЕБ-КЛИЕНТА СТРИМИНГОВОЙ ПЛАТФОРМЫ</span><span class="toc-dots"></span><span>8</span></li>
  <li><span>&nbsp;&nbsp;1.1. Одностраничные приложения и архитектура современного веб-клиента</span><span class="toc-dots"></span><span>8</span></li>
  <li><span>&nbsp;&nbsp;1.2. Библиотека React и инструменты frontend-разработки</span><span class="toc-dots"></span><span>12</span></li>
  <li><span>&nbsp;&nbsp;1.3. Пользовательский опыт стриминговых платформ</span><span class="toc-dots"></span><span>16</span></li>
  <li><span>&nbsp;&nbsp;1.4. Видеоплееры в браузере и стандарты HTML5</span><span class="toc-dots"></span><span>20</span></li>
  <li><span>&nbsp;&nbsp;1.5. Доступность интерфейса, производительность клиента и границы ответственности SPA</span><span class="toc-dots"></span><span>24</span></li>
  <li><span>ГЛАВА 2. ПРАКТИЧЕСКАЯ РЕАЛИЗАЦИЯ КЛИЕНТСКОЙ ЧАСТИ ANIHEX</span><span class="toc-dots"></span><span>28</span></li>
  <li><span>&nbsp;&nbsp;2.1. Технологический стек и структура проекта</span><span class="toc-dots"></span><span>28</span></li>
  <li><span>&nbsp;&nbsp;2.2. Маршрутизация, ленивая загрузка и контексты состояния</span><span class="toc-dots"></span><span>34</span></li>
  <li><span>&nbsp;&nbsp;2.3. Каталог аниме и механизмы фильтрации</span><span class="toc-dots"></span><span>40</span></li>
  <li><span>&nbsp;&nbsp;2.4. Видеоплеер и страница просмотра</span><span class="toc-dots"></span><span>46</span></li>
  <li><span>&nbsp;&nbsp;2.5. Интерфейс авторизации и персональные разделы</span><span class="toc-dots"></span><span>52</span></li>
  <li><span>&nbsp;&nbsp;2.6. UX загрузки данных и взаимодействие с REST API</span><span class="toc-dots"></span><span>58</span></li>
  <li><span>&nbsp;&nbsp;2.7. Результаты разработки и проверка работоспособности</span><span class="toc-dots"></span><span>64</span></li>
  <li><span>&nbsp;&nbsp;2.8. Вспомогательные компоненты, качество кода и перспективы развития</span><span class="toc-dots"></span><span>70</span></li>
  <li><span>ЗАКЛЮЧЕНИЕ</span><span class="toc-dots"></span><span>76</span></li>
  <li><span>СПИСОК ИСПОЛЬЗОВАННЫХ ИСТОЧНИКОВ</span><span class="toc-dots"></span><span>78</span></li>
  <li><span>ПРИЛОЖЕНИЯ</span><span class="toc-dots"></span><span>82</span></li>
</ul></div>'''
    html = re.sub(
        r'<div class="doc-page no-page-num"><h1 class="struct-heading">Содержание</h1>.*?</ul></div>',
        toc,
        html,
        count=1,
        flags=re.S,
    )

    html = split_chapter1(
        html,
        [
            '1.1 Одностраничные',
            '1.2 Библиотека React',
            '1.3 Пользовательский опыт',
            '1.4 Видеоплееры',
            '1.5 Доступность',
        ],
    )
    return html


def patch_03_docker(html: str) -> str:
    html = replace_title_page(html, '03-docker')

    old_14 = '''  <p class="section-title">1.4. Основы CI/CD, обратный прокси nginx и развёртывание на виртуальном сервере (VPS)</p>

  <p><strong>CI/CD</strong> (Continuous Integration / Continuous Delivery) — практика автоматической сборки, тестирования и доставки изменений в среду выполнения. Непрерывная интеграция предполагает: при push в репозиторий пайплайн (GitHub Actions, GitLab CI, Jenkins) выполняет lint, тесты, docker build, опционально push образа в Container Registry. Непрерывная доставка — развёртывание на staging/production по триггеру или вручную с тем же артефактом образа, что прошёл CI. Для учебного AniHex полный пайплайн может быть минимальным (сборка образов на VPS скриптом git pull && docker compose up -d --build), но концептуально CI/CD связывает git, Docker и сервер: исходный код остаётся единственным источником правды, а образ — воспроизводимым артефактом.</p>

  <p>Типовые этапы пайплайна для контейнерного веб-приложения: checkout → docker buildx build → (unit-тесты в контейнере) → push registry → ssh на VPS → compose pull/up. Секреты (DATABASE_URL production, ADMIN_PASSWORD) хранятся в переменных CI/CD, не в репозитории. Для ВКР достаточно описать эту схему теоретически и реализовать локально полный цикл build/up, что соответствует стадии Continuous Delivery без обязательного облачного registry.</p>

  <p><strong>Обратный прокси (reverse proxy)</strong>'''

    new_14 = '''  <p class="section-title">1.4. Обратный прокси nginx и сетевая модель публикации сервисов</p>

  <p><strong>Обратный прокси (reverse proxy)</strong>'''

    html = html.replace(old_14, new_14, 1)

    insert_15 = '''  <p class="section-title">1.5. CI/CD, развёртывание на VPS и эксплуатационная зрелость деплоя</p>

  <p><strong>CI/CD</strong> (Continuous Integration / Continuous Delivery) — практика автоматической сборки, тестирования и доставки изменений в среду выполнения. Непрерывная интеграция предполагает: при push в репозиторий пайплайн (GitHub Actions, GitLab CI, Jenkins) выполняет lint, тесты, docker build, опционально push образа в Container Registry. Непрерывная доставка — развёртывание на staging/production по триггеру или вручную с тем же артефактом образа, что прошёл CI. Для учебного AniHex полный пайплайн может быть минимальным (сборка образов на VPS скриптом git pull && docker compose up -d --build), но концептуально CI/CD связывает git, Docker и сервер: исходный код остаётся единственным источником правды, а образ — воспроизводимым артефактом.</p>

  <p>Типовые этапы пайплайна для контейнерного веб-приложения: checkout → docker buildx build → (unit-тесты в контейнере) → push registry → ssh на VPS → compose pull/up. Секреты (DATABASE_URL production, ADMIN_PASSWORD) хранятся в переменных CI/CD, не в репозитории. Для ВКР достаточно описать эту схему теоретически и реализовать локально полный цикл build/up, что соответствует стадии Continuous Delivery без обязательного облачного registry.</p>

  <p>'''

    html = html.replace(
        '  <p>Заголовки X-Real-IP и X-Forwarded-For передают API адрес клиента за прокси',
        insert_15 + 'Заголовки X-Real-IP и X-Forwarded-For передают API адрес клиента за прокси',
        1,
    )

    html = re.sub(
        r'  <p>Дополнительно рассмотрим соответствие принципам The Twelve-Factor App.*?</p>\n\n  <p>Контейнеризация не отменяет',
        '  <p>Контейнеризация не отменяет',
        html,
        count=1,
        flags=re.S,
    )

    toc = '''<div class="doc-page no-page-num"><p class="struct-heading no-indent">СОДЕРЖАНИЕ</p>
  <ul class="toc no-indent">
    <li><span>ВВЕДЕНИЕ</span><span class="toc-dots"></span><span>3</span></li>
    <li><span>ГЛАВА 1. ТЕОРЕТИЧЕСКИЕ ОСНОВЫ КОНТЕЙНЕРИЗАЦИИ И АВТОМАТИЗАЦИИ РАЗВЁРТЫВАНИЯ ВЕБ-СЕРВИСОВ</span><span class="toc-dots"></span><span>8</span></li>
    <li><span>&nbsp;&nbsp;1.1. Виртуализация, контейнеризация и их роль в эксплуатации веб-платформ</span><span class="toc-dots"></span><span>8</span></li>
    <li><span>&nbsp;&nbsp;1.2. Платформа Docker: образы, слои, Dockerfile и жизненный цикл контейнера</span><span class="toc-dots"></span><span>14</span></li>
    <li><span>&nbsp;&nbsp;1.3. Оркестрация мультисервисных приложений средствами Docker Compose</span><span class="toc-dots"></span><span>20</span></li>
    <li><span>&nbsp;&nbsp;1.4. Обратный прокси nginx и сетевая модель публикации сервисов</span><span class="toc-dots"></span><span>26</span></li>
    <li><span>&nbsp;&nbsp;1.5. CI/CD, развёртывание на VPS и эксплуатационная зрелость деплоя</span><span class="toc-dots"></span><span>32</span></li>
    <li><span>ГЛАВА 2. ПРАКТИЧЕСКАЯ РЕАЛИЗАЦИЯ КОНТЕЙНЕРНОГО РАЗВЁТЫВАНИЯ ПЛАТФОРМЫ ANIHEX</span><span class="toc-dots"></span><span>38</span></li>
    <li><span>&nbsp;&nbsp;2.1. Цели контейнеризации AniHex и общая схема стека db — api — web</span><span class="toc-dots"></span><span>38</span></li>
    <li><span>&nbsp;&nbsp;2.2. Описание docker-compose.yml и взаимодействия сервисов</span><span class="toc-dots"></span><span>44</span></li>
    <li><span>&nbsp;&nbsp;2.3. Dockerfile серверного API и frontend-образа, конфигурация nginx</span><span class="toc-dots"></span><span>50</span></li>
    <li><span>&nbsp;&nbsp;2.4. Тома docker-data, переменные окружения и перекодирование видео в контейнере</span><span class="toc-dots"></span><span>56</span></li>
    <li><span>&nbsp;&nbsp;2.5. Документация DEPLOY.md, поток развёртывания, переносимость и выводы по практике</span><span class="toc-dots"></span><span>62</span></li>
    <li><span>ЗАКЛЮЧЕНИЕ</span><span class="toc-dots"></span><span>68</span></li>
    <li><span>СПИСОК ИСПОЛЬЗОВАННЫХ ИСТОЧНИКОВ</span><span class="toc-dots"></span><span>70</span></li>
    <li><span>ПРИЛОЖЕНИЯ</span><span class="toc-dots"></span><span>74</span></li>
  </ul></div>'''
    html = re.sub(
        r'<div class="doc-page no-page-num"><h2 class="struct-heading">Содержание</h2>.*?</ol>\s*</div>',
        toc,
        html,
        count=1,
        flags=re.S,
    )

    html = split_chapter1(
        html,
        [
            '1.1. Виртуализация',
            '1.2. Платформа Docker',
            '1.3. Оркестрация',
            '1.4. Обратный прокси nginx',
            '1.5. CI/CD',
        ],
    )
    return html


def main() -> None:
    patches = {
        '01-server': patch_01_server,
        '02-web': patch_02_web,
        '03-docker': patch_03_docker,
    }
    for folder, fn in patches.items():
        path = ROOT / folder / 'diploma.html'
        html = path.read_text(encoding='utf-8')
        new_html = fn(html)
        path.write_text(new_html, encoding='utf-8')
        print(f'Patched {path}')


if __name__ == '__main__':
    main()

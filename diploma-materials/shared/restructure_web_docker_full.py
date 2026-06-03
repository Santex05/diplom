#!/usr/bin/env python3
"""Полная перестройка 02-web и 03-docker по методичке. 01-server не трогаем."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

WEB_CH1 = '''<div class="doc-page page-num"><p class="chapter-title">ГЛАВА 1. ОПИСАНИЕ ПРЕДМЕТНОЙ ОБЛАСТИ</p>

<p class="section-title">1.1. Идентификация предметной области</p>
<p>Предметная область — веб-платформа для потокового просмотра японских мультипликационных сериалов (аниме) в браузере. Программный продукт AniHex с точки зрения клиентской части решает задачи: представление каталога тайтлов и серий; поиск и фильтрация; воспроизведение видео в HTML5-плеере; регистрация, вход, профиль; избранное, коллекция «продолжить просмотр», оценки; очередь просмотра; адаптивный интерфейс на ПК, планшете и смартфоне.</p>
<p>Задачи важны, поскольку зритель ожидает плавную навигацию без перезагрузки страницы, сохранение прогресса между сеансами и удобный просмотр серий с пропуском заставок (OP/ED). Без клиентского приложения серверное API не превращается в полноценный сервис для конечного пользователя.</p>
<p>Автор работы отвечает за frontend (React, Vite, Tailwind). Серверная логика и контейнерное развёртывание — работа одногруппников; взаимодействие — через REST и прокси /api, /media.</p>
</div>

<div class="doc-page page-num">
<p class="section-title">1.2. Анализ существующих аналогов</p>
<p>Рассмотрены Netflix, Crunchyroll и Shikimori как продукты, близкие по сценариям discovery / watch / персонализация.</p>
<p class="table-caption no-indent">Таблица 1 — Сравнение аналогов (UX клиента)</p>
<table><thead><tr><th>Критерий</th><th>Netflix</th><th>Crunchyroll</th><th>Shikimori</th><th>AniHex</th></tr></thead>
<tbody>
<tr><td>SPA в браузере</td><td>Да</td><td>Да</td><td>Частично</td><td>Да</td></tr>
<tr><td>Каталог с фильтрами</td><td>Да</td><td>Да</td><td>Да</td><td>Да</td></tr>
<tr><td>Плеер с выбором качества</td><td>Адаптивный HLS</td><td>Да</td><td>Нет</td><td>Несколько MP4</td></tr>
<tr><td>Пропуск OP/ED</td><td>Редко</td><td>Частично</td><td>Нет</td><td>Да</td></tr>
<tr><td>Избранное и «продолжить»</td><td>Да</td><td>Да</td><td>Списки</td><td>Да</td></tr>
<tr><td>Тёмная тема UI</td><td>Да</td><td>Да</td><td>Да</td><td>Да</td></tr>
<tr><td>Адаптивная вёрстка</td><td>Да</td><td>Да</td><td>Частично</td><td>Да (Tailwind)</td></tr>
<tr><td>Админ-интерфейс</td><td>Закрытый</td><td>Закрытый</td><td>Модерация</td><td>Маршрут /admin</td></tr>
</tbody></table>
<p>Вывод: для AniHex целесообразны карточный каталог, полноэкранный watch-режим, персональные списки и пропуск заставок — как у стримингов, плюс открытый учебный стек React/Vite.</p>
</div>

<div class="doc-page page-num">
<p class="section-title">1.3. Требования к разрабатываемой информационной системе</p>
<p><strong>Функциональные требования (клиент):</strong></p>
<ol>
<li>Отображение каталога и карточки аниме с сериями.</li>
<li>Регистрация, вход, выход, редактирование профиля.</li>
<li>Воспроизведение серии в плеере с горячими клавишами и сменой качества.</li>
<li>Избранное, коллекция просмотра, оценки (при авторизации).</li>
<li>Поиск и фильтры с сохранением состояния в URL.</li>
<li>Очередь просмотра и автопереход к следующей серии.</li>
</ol>
<p><strong>Нефункциональные требования:</strong></p>
<ol>
<li>Отклик интерфейса при загрузке каталога — не более 2 с (с skeleton).</li>
<li>Адаптивность для ширины 360–1280 px.</li>
<li>Токен в localStorage, пароль не хранится на клиенте.</li>
<li>Минимальный объём повторных запросов (кэш fetch).</li>
</ol>
</div>

<div class="doc-page page-num">
<p class="section-title">1.4. Определение ролей пользователей программного продукта</p>
<p><strong>Гость</strong> — просмотр каталога и серий без синхронизации с сервером (локальный прогресс до входа).</p>
<p><strong>Зарегистрированный пользователь</strong> — избранное, коллекция, настройки, синхронизация с API.</p>
<p><strong>Администратор</strong> — отдельный маршрут /admin (интерфейс одногруппника); пользовательский клиент не смешивает adm_-токен.</p>
</div>

<div class="doc-page page-num">
<p class="section-title">1.5. Обоснование выбора технологического стека</p>
<p><strong>Тип приложения</strong> — веб (SPA), доступ через браузер.</p>
<p><strong>Язык и фреймворки:</strong> JavaScript, React 19, React Router 7, Vite 8, Tailwind CSS 4 — быстрая разработка UI, code splitting, HMR.</p>
<p><strong>СУБД на клиенте</strong> — не используется; данные с сервера PostgreSQL через REST.</p>
<p><strong>Обмен данными:</strong> Fetch API, JSON, Bearer token; dev-прокси Vite на /api и /media.</p>
</div>'''

DOCKER_CH1 = '''<div class="doc-page page-num"><p class="chapter-title">ГЛАВА 1. ОПИСАНИЕ ПРЕДМЕТНОЙ ОБЛАСТИ</p>

<p class="section-title">1.1. Идентификация предметной области</p>
<p>Предметная область — эксплуатация и доставка веб-платформы AniHex для просмотра аниме: воспроизводимый запуск стека PostgreSQL, API и статики на одном хосте, сохранность медиаданных, единая точка входа для пользователя (HTTP/HTTPS).</p>
<p>Основные функции инфраструктурного контура: контейнеризация сервисов db, api, web; автоматическая сборка образов; обратный прокси nginx; персистентные тома для БД и видео; документированный сценарий локального запуска и переноса на VPS.</p>
<p>Без контейнеризации разработчики сталкиваются с разными версиями Node/Postgres на машинах; compose снимает эту проблему и сокращает время подготовки демонстрации на защите.</p>
</div>

<div class="doc-page page-num">
<p class="section-title">1.2. Анализ существующих аналогов</p>
<p class="table-caption no-indent">Таблица 1 — Сравнение подходов к развёртыванию</p>
<table><thead><tr><th>Критерий</th><th>Ручная установка</th><th>Виртуальные машины</th><th>Docker Compose</th><th>Kubernetes (учебный контекст)</th></tr></thead>
<tbody>
<tr><td>Воспроизводимость</td><td>Низкая</td><td>Средняя</td><td>Высокая</td><td>Избыточна для 1 VPS</td></tr>
<tr><td>Время старта</td><td>Часы</td><td>Часы</td><td>Минуты</td><td>Дни настройки</td></tr>
<tr><td>Перенос данных</td><td>Ручное копирование</td><td>Диски ВМ</td><td>Том docker-data</td><td>PV в кластере</td></tr>
<tr><td>Единая точка входа</td><td>Несколько портов</td><td>Настройка вручную</td><td>nginx :80</td><td>Ingress</td></tr>
<tr><td>CI/CD</td><td>Нет</td><td>Возможен</td><td>Описан в теории</td><td>GitHub Actions</td></tr>
</tbody></table>
<p>Для AniHex выбран Docker Compose на одном узле — баланс простоты и соответствия масштабу диплома.</p>
</div>

<div class="doc-page page-num">
<p class="section-title">1.3. Требования к разрабатываемой информационной системе</p>
<p><strong>Функциональные:</strong> запуск всего стека одной командой; сохранение данных при перезапуске; доступ к сайту по одному порту; загрузка видео через админку с перекодированием ffmpeg; перенос окружения копированием docker-data.</p>
<p><strong>Нефункциональные:</strong> API и СУБД не публикуются наружу; время старта стека после сборки — минуты; документированный DEPLOY.md; возможность смены WEB_PORT при конфликте порта 80.</p>
</div>

<div class="doc-page page-num">
<p class="section-title">1.4. Определение ролей пользователей программного продукта</p>
<p><strong>Разработчик</strong> — собирает образы, правит compose и .env.</p>
<p><strong>Администратор контента</strong> — наполняет каталог через /admin (клиент соавтора).</p>
<p><strong>Зритель</strong> — использует сайт по HTTP; не взаимодействует с Docker напрямую.</p>
<p><strong>Оператор VPS</strong> — разворачивает compose, настраивает DNS/TLS и бэкапы.</p>
</div>

<div class="doc-page page-num">
<p class="section-title">1.5. Обоснование выбора технологического стека</p>
<p><strong>Тип решения</strong> — контейнеризованное веб-приложение на Linux-хосте (VPS или ПК).</p>
<p><strong>Стек:</strong> Docker Engine, Docker Compose, образы node:22-alpine и nginx:alpine, PostgreSQL 16, ffmpeg в образе api. Альтернатива Ansible/GitHub Actions описана как этап CI/CD (внедрение в перспективе).</p>
<p><strong>СУБД</strong> — PostgreSQL в контейнере db с томом на хосте; схема из server/db/schema.sql.</p>
</div>'''

WEB_CH2_INTRO = '''<div class="doc-page page-num"><p class="chapter-title">ГЛАВА 2. ПРОЕКТИРОВАНИЕ И РАЗРАБОТКА ПРОГРАММНОГО ПРОДУКТА</p>

<p class="section-title">2.1. Программирование frontend-части программного продукта</p>
<p class="section-title">2.1.1. Макет главной страницы и навигация</p>
<p>Главная страница (HomePage): горизонтальные ряды баннеров (GET /api/home-banners), блок «продолжить просмотр», рекомендации. Navbar: логотип, поиск (SearchOverlay), очередь (PlaybackQueueBar), вход/профиль. Footer на non-watch страницах.</p>
<p class="section-title">2.1.2. Страницы каталога, просмотра и авторизации</p>
<p>CatalogPage — фильтры (жанр, год, тип, статус), URL-state, skeleton при загрузке. AnimeDetailPage — описание, рейтинг, список серий, EpisodeModal. WatchPage — полноэкранный VideoPlayer. AuthPage, FavoritesPage, CollectionsPage, ProfileSettingsPage — формы и списки с AuthContext.</p>
<p class="section-title">2.1.3. User journey mapping</p>
<p>Сценарий «новый зритель»: главная → каталог → карточка → просмотр → регистрация → синхронизация коллекции. Сценарий «возврат»: профиль → «продолжить просмотр» → watch с сохранённой позицией. Маршруты: /, /catalog, /anime/:id, /watch/:animeId/:episodeId, /auth, /favorites, /collection.</p>
<p class="section-title">2.1.4. Реализация интерфейса (детализация)</p>
'''

WEB_CH2_BACKEND = '''
</div>
<div class="doc-page page-num">
<p class="section-title">2.2. Взаимодействие с backend</p>
<p>Распределение: frontend (автор) — UI; backend (одногруппник) — REST API. В dev Vite proxy перенаправляет /api и /media на localhost:3001. В production nginx обеспечивает единый origin. Формат JSON, Authorization: Bearer.</p>
<pre class="code-block no-indent">const res = await fetch('/api/me', {
  headers: { Authorization: `Bearer ${token}` },
});</pre>
'''

WEB_CH2_ADAPTIVE = '''
</div>
<div class="doc-page page-num">
<p class="section-title">2.3. Реализация адаптивной вёрстки для различных устройств</p>
<p>Breakpoints Tailwind sm/md/lg: на mobile фильтры в drawer, увеличенные touch-targets, WatchPage на 100dvh. Проверено на 360 px (смартфон), 768 px (планшет), 1280 px (ПК). Тёмная тема для длительного просмотра.</p>
'''

DOCKER_CH2_INTRO = '''<div class="doc-page page-num"><p class="chapter-title">ГЛАВА 2. ПРОЕКТИРОВАНИЕ И РАЗРАБОТКА ПРОГРАММНОГО ПРОДУКТА</p>

<p class="section-title">2.1. Автоматизация развёртывания и обновления локального окружения</p>
<p>Ниже приведена детализация реализации compose, Dockerfile и nginx.</p>
'''

DOCKER_CH2_DEPLOY = '''
</div>
<div class="doc-page page-num">
<p class="section-title">2.2. Деплой, эксплуатация и публикация</p>
<p>Развёртывание production-ready приложения: принципы 12-factor (конфиг в env, данные в томах), nginx как reverse proxy, мониторинг через docker compose logs и df -h. Публикация: локально http://localhost; на VPS — DNS, HTTPS (Certbot). Ссылки на работающий продукт приводятся на защите. Перспектива: GitHub Actions, Ansible.</p>
'''

WEB_TOC = '''<div class="doc-page no-page-num"><p class="struct-heading no-indent">СОДЕРЖАНИЕ</p>
<ul class="toc no-indent">
  <li><span>ВВЕДЕНИЕ</span><span class="toc-dots"></span><span>3</span></li>
  <li><span>ГЛАВА 1. ОПИСАНИЕ ПРЕДМЕТНОЙ ОБЛАСТИ</span><span class="toc-dots"></span><span>8</span></li>
  <li><span>&nbsp;&nbsp;1.1. Идентификация предметной области</span><span class="toc-dots"></span><span>8</span></li>
  <li><span>&nbsp;&nbsp;1.2. Анализ существующих аналогов</span><span class="toc-dots"></span><span>12</span></li>
  <li><span>&nbsp;&nbsp;1.3. Требования к разрабатываемой информационной системе</span><span class="toc-dots"></span><span>16</span></li>
  <li><span>&nbsp;&nbsp;1.4. Определение ролей пользователей программного продукта</span><span class="toc-dots"></span><span>20</span></li>
  <li><span>&nbsp;&nbsp;1.5. Обоснование выбора технологического стека</span><span class="toc-dots"></span><span>24</span></li>
  <li><span>ГЛАВА 2. ПРОЕКТИРОВАНИЕ И РАЗРАБОТКА ПРОГРАММНОГО ПРОДУКТА</span><span class="toc-dots"></span><span>28</span></li>
  <li><span>&nbsp;&nbsp;2.1. Программирование frontend-части программного продукта</span><span class="toc-dots"></span><span>28</span></li>
  <li><span>&nbsp;&nbsp;2.2. Взаимодействие с backend</span><span class="toc-dots"></span><span>48</span></li>
  <li><span>&nbsp;&nbsp;2.3. Реализация адаптивной вёрстки для различных устройств</span><span class="toc-dots"></span><span>54</span></li>
  <li><span>ЗАКЛЮЧЕНИЕ</span><span class="toc-dots"></span><span>60</span></li>
  <li><span>СПИСОК ИСПОЛЬЗОВАННЫХ ИСТОЧНИКОВ</span><span class="toc-dots"></span><span>62</span></li>
  <li><span>ПРИЛОЖЕНИЕ 1</span><span class="toc-dots"></span><span>64</span></li>
  <li><span>ПРИЛОЖЕНИЕ 2</span><span class="toc-dots"></span><span>66</span></li>
</ul></div>'''

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


def find_chapter1_start(html: str) -> int:
    for pat in (
        '<p class="chapter-title">ГЛАВА 1',
        '<div class="chapter-title">ГЛАВА 1',
        '<p class="chapter-title">Глава 1',
    ):
        i = html.find(pat)
        if i >= 0:
            # начало doc-page с главой
            page = html.rfind('<div class="doc-page', 0, i)
            return page if page >= 0 else i
    raise ValueError('Глава 1 не найдена')


def find_conclusion_start(html: str) -> int:
    for pat in (
        '<h1 class="struct-heading">Заключение</h1>',
        '<h2 class="struct-heading">Заключение</h2>',
    ):
        i = html.find(pat)
        if i >= 0:
            page = html.rfind('<div class="doc-page', 0, i)
            return page if page >= 0 else i
    raise ValueError('Заключение не найдено')


def find_chapter2_start(html: str) -> int:
    for pat in (
        'ГЛАВА 2. ПРОЕКТИРОВАНИЕ',
        'ГЛАВА 2. ПРАКТИЧЕСКАЯ',
        'Глава 2. Практическая',
    ):
        i = html.find(pat)
        if i >= 0:
            page = html.rfind('<div class="doc-page', 0, i)
            return page if page >= 0 else i
    raise ValueError('Глава 2 не найдена')


def strip_section_titles(fragment: str) -> str:
    return re.sub(
        r'<(?:div|p) class="section-title">[^<]+</(?:div|p)>',
        '',
        fragment,
        flags=re.DOTALL,
    ).strip()


def extract_ch2_practice(html: str, ch2_start: int, conclusion_start: int,
                         stop_before: str | None = None) -> str:
    """Тело практики главы 2 без заголовков разделов."""
    frag = html[ch2_start:conclusion_start]
    if stop_before:
        idx = frag.find(stop_before)
        if idx > 0:
            frag = frag[:idx]
    # web: отрезать дублирующий 2.2 backend и 2.3 adaptive в конце
    for cut in (
        '2.2. Взаимодействие с backend',
        '2.2 Взаимодействие с backend',
        '2.3. Реализация адаптивной',
        '2.3. Реализация адаптивной вёрстки',
    ):
        idx = frag.find(cut)
        if idx > 0:
            # ищем начало тега section-title перед этим
            st = frag.rfind('section-title', 0, idx)
            if st > 0:
                tag_start = frag.rfind('<', 0, st)
                frag = frag[:tag_start]
            break
    return strip_section_titles(frag)


def patch_intro_structure(head: str, old_phrase: str, new_phrase: str) -> str:
    if old_phrase in head:
        head = head.replace(old_phrase, new_phrase)
    return head


def patch_tail_appendices(tail: str, appendices_block: str) -> str:
    tail = re.sub(
        r'<div class="doc-page page-num"><p class="struct-heading no-indent">ПРИЛОЖЕНИЕ 1</p>.*?(?=<p class="no-print|$)',
        f'<div class="doc-page page-num">{appendices_block}\n',
        tail,
        count=1,
        flags=re.S,
    )
    tail = re.sub(
        r'Приложение [АВБ]\s*—',
        '',
        tail,
    )
    return tail


def restructure_web(path: Path):
    html = path.read_text(encoding='utf-8')
    ch1s = find_chapter1_start(html)
    ch2s = find_chapter2_start(html)
    cons = find_conclusion_start(html)

    head = html[:ch1s]
    head = re.sub(
        r'<div class="doc-page no-page-num"><p class="struct-heading no-indent">СОДЕРЖАНИЕ</p>.*?</ul></div>',
        WEB_TOC,
        head,
        count=1,
        flags=re.S,
    )
    head = patch_intro_structure(
        head,
        'Первая глава раскрывает теоретические основы SPA, React, UX стриминговых сайтов и браузерных видеоплееров. Вторая глава описывает практическую реализацию клиентской части AniHex: технологический стек, маршрутизацию, контексты, каталог, VideoPlayer, интерфейс авторизации, механизмы загрузки и результаты.',
        'Первая глава описывает предметную область, аналоги, требования, роли пользователей и технологический стек. Вторая глава — проектирование и разработка: frontend (2.1), взаимодействие с backend (2.2), адаптивная вёрстка (2.3).',
    )

    practice = extract_ch2_practice(html, ch2s, cons)
    tail = html[cons:]
    tail = patch_tail_appendices(tail, '''<p class="struct-heading no-indent">ПРИЛОЖЕНИЕ 1</p>
<p class="no-indent">Структура каталогов src/, перечень маршрутов App.jsx.</p>
<p class="struct-heading no-indent" style="margin-top:2em;">ПРИЛОЖЕНИЕ 2</p>
<p class="no-indent">Фрагменты: App.jsx, VideoPlayer.jsx, apiCache.js.</p>
<div class="figure-block"><div class="screenshot-placeholder">Скриншот: главная, каталог, watch, auth</div></div>
''')

    backend_part = ''
    idx = html.find('2.2. Взаимодействие с backend')
    if idx < 0:
        idx = html.find('2.2 Взаимодействие с backend')
    if idx >= 0:
        st = html.rfind('<', ch2s, idx)
        adaptive_idx = html.find('2.3. Реализация адаптивной', idx)
        if adaptive_idx < 0:
            adaptive_idx = html.find('2.7 Результаты', idx)
        if adaptive_idx < 0:
            adaptive_idx = cons
        backend_part = strip_section_titles(html[st:adaptive_idx])

    adaptive_part = ''
    aidx = html.find('2.3. Реализация адаптивной', ch2s)
    if aidx >= 0:
        st = html.rfind('<', ch2s, aidx)
        adaptive_part = strip_section_titles(html[st:cons])

    new_html = (
        head + WEB_CH1 + WEB_CH2_INTRO + practice
        + WEB_CH2_BACKEND + (backend_part or '<p>См. таблицу 1 в тексте и api.js.</p>')
        + WEB_CH2_ADAPTIVE + (adaptive_part or '<p>См. раздел 2.7 о проверке на 360/768/1280 px.</p>')
        + tail
    )
    path.write_text(new_html, encoding='utf-8')
    print('OK web')


def restructure_docker(path: Path):
    html = path.read_text(encoding='utf-8')
    ch1s = find_chapter1_start(html)
    ch2s = find_chapter2_start(html)
    cons = find_conclusion_start(html)

    head = html[:ch1s]
    head = re.sub(
        r'<div class="doc-page no-page-num"><p class="struct-heading no-indent">СОДЕРЖАНИЕ</p>.*?</ul></div>',
        DOCKER_TOC,
        head,
        count=1,
        flags=re.S,
    )
    head = patch_intro_structure(
        head,
        'Первая глава раскрывает понятийный аппарат Docker, Compose, CI/CD, nginx и VPS. Вторая глава посвящена конкретной реализации для AniHex.',
        'Первая глава — описание предметной области, аналоги, требования, роли и стек. Вторая — автоматизация локального окружения (2.1) и деплой с публикацией (2.2).',
    )

    # 2.1 body: from ch2 to section 2.5 or 2.2 deploy
    frag21 = html[ch2s:cons]
    cut = frag21.find('2.5. Документация DEPLOY')
    if cut < 0:
        cut = frag21.find('2.2. Деплой')
    practice21 = strip_section_titles(frag21[:cut] if cut > 0 else frag21)

    deploy_body = ''
    if cut > 0:
        deploy_body = strip_section_titles(frag21[cut:])

    tail = html[cons:]
    tail = patch_tail_appendices(tail, '''<p class="struct-heading no-indent">ПРИЛОЖЕНИЕ 1</p>
<p class="no-indent">docker-compose.yml, server/Dockerfile, Dockerfile, deploy/nginx.conf.</p>
<p class="struct-heading no-indent" style="margin-top:2em;">ПРИЛОЖЕНИЕ 2</p>
<p class="no-indent">Фрагмент DEPLOY.md.</p>
''')

    new_html = head + DOCKER_CH1 + DOCKER_CH2_INTRO + practice21 + DOCKER_CH2_DEPLOY + deploy_body + tail
    path.write_text(new_html, encoding='utf-8')
    print('OK docker')


def main():
    restructure_web(ROOT / '02-web' / 'diploma.html')
    restructure_docker(ROOT / '03-docker' / 'diploma.html')


if __name__ == '__main__':
    main()

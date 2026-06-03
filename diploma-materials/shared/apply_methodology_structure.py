#!/usr/bin/env python3
"""Перестройка diploma.html по методичке (гл. 1 общая, гл. 2 по ролям). Титул не трогаем."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# ——— Сервер (Олег): полная структура ———

SERVER_TOC = '''<div class="doc-page no-page-num"><p class="struct-heading no-indent">СОДЕРЖАНИЕ</p>
<ul class="toc no-indent">
  <li><span>ВВЕДЕНИЕ</span><span class="toc-dots"></span><span>3</span></li>
  <li><span>ГЛАВА 1. ОПИСАНИЕ ПРЕДМЕТНОЙ ОБЛАСТИ</span><span class="toc-dots"></span><span>8</span></li>
  <li><span>&nbsp;&nbsp;1.1. Идентификация предметной области</span><span class="toc-dots"></span><span>8</span></li>
  <li><span>&nbsp;&nbsp;1.2. Анализ существующих аналогов</span><span class="toc-dots"></span><span>12</span></li>
  <li><span>&nbsp;&nbsp;1.3. Требования к разрабатываемой информационной системе</span><span class="toc-dots"></span><span>16</span></li>
  <li><span>&nbsp;&nbsp;1.4. Определение ролей пользователей программного продукта</span><span class="toc-dots"></span><span>20</span></li>
  <li><span>&nbsp;&nbsp;1.5. Обоснование выбора технологического стека</span><span class="toc-dots"></span><span>24</span></li>
  <li><span>ГЛАВА 2. ПРОЕКТИРОВАНИЕ И РАЗРАБОТКА ПРОГРАММНОГО ПРОДУКТА</span><span class="toc-dots"></span><span>28</span></li>
  <li><span>&nbsp;&nbsp;2.1. Реализация модели базы данных</span><span class="toc-dots"></span><span>28</span></li>
  <li><span>&nbsp;&nbsp;2.2. Программирование backend-части программного продукта</span><span class="toc-dots"></span><span>38</span></li>
  <li><span>&nbsp;&nbsp;&nbsp;&nbsp;2.2.1. Реакция программного продукта на действия пользователей</span><span class="toc-dots"></span><span>38</span></li>
  <li><span>&nbsp;&nbsp;&nbsp;&nbsp;2.2.2. Реализация механизмов безопасности и аутентификации</span><span class="toc-dots"></span><span>44</span></li>
  <li><span>&nbsp;&nbsp;&nbsp;&nbsp;2.2.3. Подключение и управление базой данных</span><span class="toc-dots"></span><span>50</span></li>
  <li><span>&nbsp;&nbsp;2.3. Взаимодействие с frontend</span><span class="toc-dots"></span><span>56</span></li>
  <li><span>ЗАКЛЮЧЕНИЕ</span><span class="toc-dots"></span><span>62</span></li>
  <li><span>СПИСОК ИСПОЛЬЗОВАННЫХ ИСТОЧНИКОВ</span><span class="toc-dots"></span><span>64</span></li>
  <li><span>ПРИЛОЖЕНИЕ 1</span><span class="toc-dots"></span><span>66</span></li>
  <li><span>ПРИЛОЖЕНИЕ 2</span><span class="toc-dots"></span><span>68</span></li>
</ul></div>'''

SERVER_CH1_NEW = '''<div class="doc-page page-num"><p class="chapter-title">ГЛАВА 1. ОПИСАНИЕ ПРЕДМЕТНОЙ ОБЛАСТИ</p>

<p class="section-title">1.1. Идентификация предметной области</p>

<p>Предметная область настоящей работы — веб-платформа для потокового просмотра японских мультипликационных сериалов (аниме) в браузере. Программный продукт AniHex решает задачи централизованного каталога сериального контента, персонализации опыта зрителя и административного наполнения медиатеки без прямого доступа к файловой системе сервера.</p>

<p>Основные функции продукта с точки зрения серверной подсистемы: хранение и выдача метаданных тайтлов и эпизодов; учёт зарегистрированных пользователей (регистрация, сессии, профиль); избранное, коллекция «продолжить просмотр», оценки и прогресс по сериям; административный контур CRUD над каталогом, баннерами витрины и учётными записями; приём и перекодирование видеофайлов; безопасная раздача медиа по HTTP. Эти задачи важны, поскольку зритель ожидает стабильный каталог и синхронизацию прогресса между сеансами, а владелец платформы — регулярное обновление эпизодов без ручного редактирования JSON на диске.</p>

<p>Иерархия данных: «аниме — эпизод — варианты качества (episode_sources)». Удаление тайтла должно каскадно удалять связанные серии и источники. Персональные данные (прогресс, избранное) отделены от канонического каталога: действия зрителя не изменяют общие метаданные тайтла.</p>

<p>Автор работы в командном дипломном проекте отвечает за backend (Node.js, Express, PostgreSQL, REST API, админ-маршруты, обработку видео). Клиентское SPA и контейнерное развёртывание реализованы одногруппниками; в главе 2.3 описано только взаимодействие по HTTP.</p>

</div>

<div class="doc-page page-num">

<p class="section-title">1.2. Анализ существующих аналогов</p>

<p>Для обоснования проектных решений рассмотрены три программных продукта, близких по предметной области: легальный стриминг Crunchyroll, каталог и сообщество Shikimori, учебно-демонстрационная платформа AniLibria (как пример русскоязычного агрегатора каталога). Сравнение не претендует на полноту рынка, но покрывает типичные функции каталога, просмотра и учёта пользователя.</p>

<p class="table-caption no-indent">Таблица 1 — Сравнительная характеристика аналогов (фрагмент)</p>
<table>
  <thead>
    <tr><th>Характеристика</th><th>Crunchyroll</th><th>Shikimori</th><th>AniLibria</th><th>AniHex (цель)</th></tr>
  </thead>
  <tbody>
    <tr><td>Просмотр в браузере</td><td>Да, DRM</td><td>Нет (каталог)</td><td>Частично</td><td>Да, MP4 без DRM</td></tr>
    <tr><td>Каталог с фильтрами</td><td>Да</td><td>Да, расширенный</td><td>Да</td><td>Да</td></tr>
    <tr><td>Регистрация и профиль</td><td>Да</td><td>Да</td><td>Да</td><td>Да</td></tr>
    <tr><td>Прогресс просмотра</td><td>Да</td><td>Списки</td><td>Да</td><td>Да, sync с API</td></tr>
    <tr><td>Оценки сообщества</td><td>Ограничено</td><td>Да</td><td>Да</td><td>Да, 1–10</td></tr>
    <tr><td>Админка контента</td><td>Закрытая</td><td>Модерация</td><td>Закрытая</td><td>REST API adm_</td></tr>
    <tr><td>Открытый API для ВКР</td><td>Нет</td><td>Ограничен</td><td>Нет</td><td>Да, REST</td></tr>
    <tr><td>Самохостинг</td><td>Нет</td><td>Нет</td><td>Нет</td><td>Да</td></tr>
    <tr><td>Несколько качеств эпизода</td><td>Адаптивный HLS</td><td>—</td><td>Да</td><td>Да, MP4</td></tr>
    <tr><td>Метки OP/ED</td><td>Редко</td><td>—</td><td>Частично</td><td>Да, в БД</td></tr>
  </tbody>
</table>

<p>Вывод: для дипломного проекта целесообразно взять у аналогов развитый каталог и персонализацию (Shikimori, стриминги), у Crunchyroll — ориентацию на просмотр в браузере, а отличительной чертой AniHex сделать прозрачный REST API, самохостинг, отдельный административный контур с токенами adm_ и поддержку нескольких качеств одного эпизода с метками опенинга/эндинга — без претензии на масштаб коммерческого DRM.</p>

</div>

<div class="doc-page page-num">

<p class="section-title">1.3. Требования к разрабатываемой информационной системе</p>

<p>Ниже сформулированы функциональные (ФТ) и нефункциональные (НФТ) требования к серверной части AniHex. Требования согласованы с ролью backend-разработчика и покрывают контуры, реализованные в репозитории vite-project.</p>

<p><strong>Функциональные требования:</strong></p>
<ol>
  <li>ФТ-1. Система должна предоставлять публичный REST API каталога аниме (список, карточка тайтла, эпизод, рейтинг).</li>
  <li>ФТ-2. Пользователь должен иметь возможность зарегистрироваться, войти, выйти и управлять профилем (настройки, аватар).</li>
  <li>ФТ-3. Авторизованный пользователь должен сохранять избранное, коллекцию просмотра и прогресс по сериям.</li>
  <li>ФТ-4. Пользователь должен выставлять оценку тайтлу в диапазоне 1–10.</li>
  <li>ФТ-5. Администратор должен выполнять CRUD над тайтлами, эпизодами, баннерами главной и учётными записями пользователей через /api/admin/*.</li>
  <li>ФТ-6. Администратор должен загружать постеры, видео серий и изображения баннеров (multipart).</li>
  <li>ФТ-7. Система должна перекодировать загруженное видео в MP4 H.264/AAC при наличии ffmpeg (опционально).</li>
  <li>ФТ-8. Система должна раздавать медиафайлы по /media с защитой от path traversal.</li>
  <li>ФТ-9. Прямое скачивание эпизода через API должно быть запрещено (403).</li>
</ol>

<p><strong>Нефункциональные требования:</strong></p>
<ol>
  <li>НФТ-1. Время отклика GET каталога при работе с PostgreSQL — не более 2 с на учебном наборе данных.</li>
  <li>НФТ-2. Пароли пользователей и администратора хранятся в виде хеша (scrypt), не в открытом виде.</li>
  <li>НФТ-3. Доступ к административным операциям только при валидном токене с префиксом adm_.</li>
  <li>НФТ-4. Целостность данных обеспечивается внешними ключами и CHECK-ограничениями PostgreSQL.</li>
  <li>НФТ-5. Конфигурация (порты, DATABASE_URL, пароли) задаётся переменными окружения, не в репозитории.</li>
  <li>НФТ-6. Допускается JSON-режим хранения без СУБД для локальной отладки разработчика.</li>
</ol>

</div>

<div class="doc-page page-num">

<p class="section-title">1.4. Определение ролей пользователей программного продукта</p>

<p><strong>Гость (неавторизованный зритель)</strong> — посетитель без учётной записи. Возможности: просмотр каталога и карточек аниме, воспроизведение доступных серий, просмотр агрегированного рейтинга; персональный прогресс и избранное — только локально в браузере до регистрации.</p>

<p><strong>Зарегистрированный пользователь</strong> — клиент с токеном в user_sessions. Возможности: все функции гостя плюс синхронизация избранного, коллекции, прогресса и оценок с сервером; настройки плеера; загрузка аватара; удаление аккаунта.</p>

<p><strong>Администратор</strong> — сотрудник, наполняющий платформу. Возможности: отдельный вход /api/admin/login; CRUD каталога; загрузка видео и постеров; управление баннерами и CMS страницы входа; просмотр и модерация пользователей. Не использует пользовательский токен для привилегированных операций — только adm_.</p>

<p>Разделение ролей на уровне API исключает эскалацию привилегий: middleware requireAdmin и userMiddleware применяются к разным наборам маршрутов.</p>

</div>

<div class="doc-page page-num">

<p class="section-title">1.5. Обоснование выбора технологического стека</p>

<p><strong>Тип приложения</strong> — веб-приложение: сервер предоставляет REST API и статическую раздачу медиа; клиент — SPA на React (разработка одногруппника). Обоснование: единая кодовая база JavaScript, доступ из браузера без установки клиента.</p>

<p><strong>Язык и фреймворк:</strong> Node.js (ES-модули) и Express 5 — асинхронный I/O для одновременных запросов каталога и фонового ffmpeg; зрелая экосистема (multer, pg). Альтернатива Python/Django отклонена из-за разделения стека с frontend-командой.</p>

<p><strong>СУБД:</strong> PostgreSQL 16 — реляционная модель с JSONB для жанров и категорий витрины; каскадные FK; драйвер pg. JSON-файлы (library.json, users.json) — режим отладки без DATABASE_URL. Сравнение с MongoDB: для JOIN и ограничений уникальности login/email PostgreSQL предпочтительнее.</p>

<p><strong>Стиль API:</strong> REST — предсказуемые CRUD для админки, тестирование через Postman, кэширование GET каталога. GraphQL не внедрялся из-за избыточной сложности для учебного MVP.</p>

<p><strong>Вспомогательные средства:</strong> Multer (загрузка файлов), ffmpeg (перекодирование), scrypt (пароли).</p>

<p class="table-caption no-indent">Таблица 2 — Технологический стек серверной части</p>
<table>
  <thead><tr><th>Компонент</th><th>Технология</th><th>Назначение</th></tr></thead>
  <tbody>
    <tr><td>Среда</td><td>Node.js ESM</td><td>Сервер API</td></tr>
    <tr><td>HTTP</td><td>Express 5</td><td>Маршруты, middleware</td></tr>
    <tr><td>СУБД</td><td>PostgreSQL 16</td><td>Каталог, пользователи, сессии</td></tr>
    <tr><td>Драйвер</td><td>pg</td><td>Пул соединений</td></tr>
    <tr><td>Файлы</td><td>Multer, fs</td><td>Загрузка и раздача медиа</td></tr>
    <tr><td>Видео</td><td>ffmpeg</td><td>H.264/AAC MP4</td></tr>
  </tbody>
</table>

</div>'''

SERVER_CH2_HEADER = '''<div class="doc-page page-num"><p class="chapter-title">ГЛАВА 2. ПРОЕКТИРОВАНИЕ И РАЗРАБОТКА ПРОГРАММНОГО ПРОДУКТА</p>

<p class="section-title">2.1. Реализация модели базы данных</p>

<p>Общая структура: объектно-реляционная СУБД PostgreSQL; схема в server/db/schema.sql; бинарные видео — файловое хранилище ANIME_DIR, в БД только пути в episode_sources. При DATABASE_URL отключён — fallback на JSON (library.json, users.json) с миграцией npm run db:migrate.</p>

<p>Центральные сущности: anime, episodes, episode_sources; users, user_sessions, favorites, collection_entries, collection_episode_progress, ratings; admin_sessions; home_banner_slides; auth_page_config. Каскад ON DELETE CASCADE для связей каталога.</p>

<div class="figure-block diagram-box">
  <p class="no-indent" style="text-align:center;font-weight:bold;margin-bottom:0.5em;">ER-диаграмма (логическая модель)</p>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 420" style="max-width:100%;height:auto;display:block;margin:0 auto;">
    <rect x="280" y="20" width="160" height="44" fill="#fff" stroke="#000" stroke-width="1"/>
    <text x="360" y="48" text-anchor="middle" font-family="Times New Roman" font-size="13">anime</text>
    <rect x="280" y="100" width="160" height="44" fill="#fff" stroke="#000" stroke-width="1"/>
    <text x="360" y="128" text-anchor="middle" font-family="Times New Roman" font-size="13">episodes</text>
    <rect x="280" y="180" width="180" height="44" fill="#fff" stroke="#000" stroke-width="1"/>
    <text x="370" y="208" text-anchor="middle" font-family="Times New Roman" font-size="12">episode_sources</text>
    <line x1="360" y1="64" x2="360" y2="100" stroke="#000" marker-end="url(#arr)"/>
    <line x1="360" y1="144" x2="370" y2="180" stroke="#000"/>
    <rect x="40" y="100" width="140" height="44" fill="#fff" stroke="#000"/>
    <text x="110" y="128" text-anchor="middle" font-family="Times New Roman" font-size="13">users</text>
    <rect x="40" y="180" width="160" height="40" fill="#fff" stroke="#000"/>
    <text x="120" y="205" text-anchor="middle" font-family="Times New Roman" font-size="11">user_sessions</text>
    <rect x="520" y="100" width="160" height="40" fill="#fff" stroke="#000"/>
    <text x="600" y="125" text-anchor="middle" font-family="Times New Roman" font-size="11">favorites</text>
    <rect x="520" y="160" width="180" height="40" fill="#fff" stroke="#000"/>
    <text x="610" y="185" text-anchor="middle" font-family="Times New Roman" font-size="10">collection_*</text>
    <line x1="180" y1="122" x2="280" y2="122" stroke="#000" stroke-dasharray="4"/>
    <line x1="110" y1="144" x2="120" y2="180" stroke="#000"/>
    <defs><marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#000"/></marker></defs>
  </svg>
  <p class="figure-caption no-indent">Рисунок 1 — ER-диаграмма основных сущностей AniHex</p>
</div>

<p class="table-caption no-indent">Таблица 3 — Основные таблицы PostgreSQL</p>
<table>
  <thead><tr><th>Таблица</th><th>Назначение</th><th>Связи</th></tr></thead>
  <tbody>
    <tr><td>anime</td><td>Тайтл, метаданные</td><td>PK id; → episodes</td></tr>
    <tr><td>episodes</td><td>Серии, OP/ED</td><td>FK anime_id CASCADE</td></tr>
    <tr><td>episode_sources</td><td>Качества видео</td><td>FK episode_id</td></tr>
    <tr><td>users</td><td>Зрители</td><td>UNIQUE login, email</td></tr>
    <tr><td>admin_sessions</td><td>Токены adm_*</td><td>Изолировано от users</td></tr>
  </tbody>
</table>

<p><strong>Примеры SQL-запросов</strong> (выполняются в psql или через pgAdmin после docker compose up):</p>

<p class="no-indent"><strong>Запрос 1</strong> — каталог с числом серий:</p>
<pre class="code-block no-indent">SELECT a.id, a.title, a.year, COUNT(e.id) AS episode_count
FROM anime a
LEFT JOIN episodes e ON e.anime_id = a.id
GROUP BY a.id, a.title, a.year
ORDER BY a.popularity DESC
LIMIT 20;</pre>

<p class="no-indent"><strong>Запрос 2</strong> — средний рейтинг тайтла:</p>
<pre class="code-block no-indent">SELECT anime_id, ROUND(AVG(score)::numeric, 2) AS avg_score, COUNT(*) AS votes
FROM ratings
WHERE anime_id = 'demo-anime'
GROUP BY anime_id;</pre>

<p><strong>Скриншоты реализации БД</strong> (вставьте в отчёт или приложение):</p>
<ul>
  <li>Рисунок 2 — список таблиц в pgAdmin или DBeaver: подключение к localhost:5432, база anicatalog (если порт db проброшен в docker-compose для отладки) либо <code>docker compose exec db psql -U anicatalog -d anicatalog -c "\\dt"</code>.</li>
  <li>Рисунок 3 — структура таблицы episodes (поля opening_start_seconds, duration_seconds) в GUI клиента.</li>
  <li>Рисунок 4 — результат запроса 1 в окне SQL.</li>
</ul>
<div class="figure-block">
  <div class="screenshot-placeholder">Вставьте скриншот: pgAdmin / DBeaver — дерево таблиц (anime, episodes, users, …)</div>
  <p class="figure-caption no-indent">Рисунок 2 — Таблицы базы данных AniHex в клиенте СУБД</p>
</div>
<div class="figure-block">
  <div class="screenshot-placeholder">Вставьте скриншот: выполнение SELECT с JOIN (запрос 1)</div>
  <p class="figure-caption no-indent">Рисунок 3 — Пример выборки каталога SQL-запросом</p>
</div>

<p>Целостность: PK/FK, UNIQUE (login, email), CHECK score 1–10; пароли — password_hash; разделение admin_sessions и user_sessions.</p>

<p class="section-title">2.2. Программирование backend-части программного продукта</p>

<p class="section-title">2.2.1. Реакция программного продукта на действия пользователей (ответы на запросы)</p>

'''

SERVER_CH2_FOOTER = '''

<p class="section-title">2.2.2. Реализация механизмов безопасности и аутентификации</p>

<p>MARKER_SECURITY</p>

<p class="section-title">2.2.3. Подключение и управление базой данных</p>

<p>MARKER_DATABASE</p>

<p class="section-title">2.3. Взаимодействие с frontend</p>

<p>MARKER_FRONTEND</p>

'''

SERVER_APPENDICES = '''<div class="doc-page page-num"><p class="struct-heading no-indent">ПРИЛОЖЕНИЕ 1</p>
<p class="no-indent">Фрагмент схемы PostgreSQL (server/db/schema.sql) — таблицы anime, episodes, episode_sources.</p>

<p class="struct-heading no-indent" style="margin-top:2em;">ПРИЛОЖЕНИЕ 2</p>
<p class="no-indent">Фрагмент модуля auth.js — генерация и проверка токенов adm_.</p>

<p class="struct-heading no-indent" style="margin-top:2em;">ПРИЛОЖЕНИЕ 3</p>
<p class="no-indent">Сводная таблица эндпоинтов /api/admin/* (server/index.js, adminRoutes.js).</p>

<p class="struct-heading no-indent" style="margin-top:2em;">ПРИЛОЖЕНИЕ 4</p>
<p class="no-indent">Скриншоты Postman: регистрация, admin login, загрузка эпизода.</p>
<div class="figure-block">
  <div class="screenshot-placeholder">Скриншот Postman: POST /api/auth/register — ответ 200</div>
</div>'''


def extract_between(html: str, start_pat: str, end_pat: str) -> str:
    m1 = re.search(start_pat, html, re.S)
    m2 = re.search(end_pat, html, re.S)
    if not m1 or not m2 or m2.start() <= m1.start():
        return ''
    return html[m1.start():m2.start()]


def restructure_server(path: Path) -> None:
    html = path.read_text(encoding='utf-8')

    # Сохранить титул + введение
    intro_end = html.find('<div class="doc-page page-num"><p class="chapter-title">')
    if intro_end < 0:
        raise SystemExit('Не найдено начало главы 1')
    head = html[:intro_end]

    # Извлечь блоки из старой гл.2 для вставки в новые разделы
    arch = extract_between(html, r'<p class="section-title">2\.1\. Архитектура', r'<p class="section-title">2\.2\.')
    db_old = extract_between(html, r'<p class="section-title">2\.2\. Проектирование схемы', r'<p class="section-title">2\.3\.')
    user_api = extract_between(html, r'<p class="section-title">2\.3\. Пользовательское API', r'<p class="section-title">2\.4\.')
    admin_api = extract_between(html, r'<p class="section-title">2\.4\. Административное API', r'<p class="section-title">2\.5\.')
    video_test = extract_between(html, r'<p class="section-title">2\.5\. Загрузка и перекодирование', r'<div class="doc-page page-num"><p class="struct-heading no-indent">ЗАКЛЮЧЕНИЕ</p>')

    # Безопасность: из 1.2 REST + user_api + admin части auth
    security_bits = extract_between(html, r'<p>Безопасность API включает', r'<p>REST не диктует версионирование')
    if not security_bits:
        security_bits = '<p>Хеширование паролей scrypt; токены Bearer; requireAdmin; path traversal при /media.</p>'

    db_manage = ''
    if db_old:
        db_manage = db_old
    pg_para = extract_between(html, r'<p>Каталог аниме с пользователями', r'<p>Таким образом, PostgreSQL в AniHex')
    if pg_para:
        db_manage += pg_para

    frontend_section = '''<p>Распределение обязанностей: frontend-разработчик (одногруппник) — UI на React/Vite; автор — REST API на порту 3001. Клиент обращается к /api/* и /media/*; в dev Vite proxy перенаправляет запросы на localhost:3001.</p>
<p>Формат обмена — JSON, заголовок Authorization: Bearer &lt;token&gt; для защищённых маршрутов. Пример запроса каталога:</p>
<pre class="code-block no-indent">GET /api/anime HTTP/1.1
Host: localhost:3001
Accept: application/json</pre>
<p>Пример регистрации (фрагмент клиента userApi.js):</p>
<pre class="code-block no-indent">const res = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ login, nickname, email, password, passwordConfirm }),
});</pre>
<p>Ответ сервера: { token, user: { id, login, nickname, ... } }. Админ-клиент использует отдельный токен adm_ для /api/admin/*. CORS настроен для origin dev-сервера Vite.</p>
<p class="table-caption no-indent">Таблица 4 — Распределение зон ответственности</p>
<table>
<thead><tr><th>Зона</th><th>Backend (автор)</th><th>Frontend (команда)</th></tr></thead>
<tbody>
<tr><td>Каталог, CRUD</td><td>store, adminRoutes</td><td>CatalogPage, админ-формы</td></tr>
<tr><td>Авторизация</td><td>auth, userStore</td><td>AuthContext, LoginPage</td></tr>
<tr><td>Плеер, OP/ED</td><td>Метаданные в episodes</td><td>VideoPlayer.jsx</td></tr>
<tr><td>Медиа URL</td><td>/media + enrichPublicAnime</td><td>src video, img poster</td></tr>
</tbody>
</table>'''

    ch2_body = SERVER_CH2_HEADER
    ch2_body += arch.replace('2.1. Архитектура серверного приложения AniHex', '').replace('<p class="section-title">2.1. Архитектура серверного приложения AniHex</p>', '')
    ch2_body += user_api.replace('2.3. Пользовательское API', '')
    ch2_body += admin_api.replace('2.4. Административное API', '')
    ch2_body += video_test.replace('2.5. Загрузка и перекодирование', '')

    ch2_body += SERVER_CH2_FOOTER
    ch2_body = ch2_body.replace('<p>MARKER_SECURITY</p>', security_bits + extract_between(html, r'<p>Пароли не хранятся в открытом виде', r'<p>Публичный каталог остаётся доступен')[:2000] if 'Пароли не хранятся' in html else '<p>См. реализацию auth.js, userMiddleware, requireAdmin.</p>')
    ch2_body = ch2_body.replace('<p>MARKER_DATABASE</p>', db_manage[:8000] if db_manage else '<p>store + db/*, isPgEnabled(), migrate-from-json.js</p>')
    ch2_body = ch2_body.replace('<p>MARKER_FRONTEND</p>', frontend_section)

    # Заключение и далее
    tail_start = html.find('<div class="doc-page page-num"><p class="struct-heading no-indent">ЗАКЛЮЧЕНИЕ</p>')
    if tail_start < 0:
        tail_start = html.find('ЗАКЛЮЧЕНИЕ')
    tail = html[tail_start:]
    tail = re.sub(r'<p class="struct-heading no-indent">ПРИЛОЖЕНИЯ</p>.*?</div>\s*</body>', SERVER_APPENDICES + '\n</body>', tail, flags=re.S)

    # Обновить введение — структура
    head = re.sub(
        r'Первая глава раскрывает теоретические основы.*?Во второй главе описаны проектные решения',
        'Первая глава описывает предметную область, аналоги, требования, роли и стек. Во второй главе — модель БД и программирование backend',
        head,
    )
    head = re.sub(
        r'<div class="doc-page no-page-num"><p class="struct-heading no-indent">СОДЕРЖАНИЕ</p>.*?</ul></div>',
        SERVER_TOC,
        head,
        count=1,
        flags=re.S,
    )

    new_html = head + SERVER_CH1_NEW + ch2_body + tail
    path.write_text(new_html, encoding='utf-8')
    print(f'OK server: {path}')


# ——— Web / Docker: только гл.1 заголовки + приложения ———

WEB_CH1_TITLES = [
    ('Глава 1. Теоретические основы разработки веб-клиента', 'ГЛАВА 1. ОПИСАНИЕ ПРЕДМЕТНОЙ ОБЛАСТИ'),
    ('1.1 Одностраничные приложения', '1.1. Идентификация предметной области'),
    ('1.2 Библиотека React', '1.2. Анализ существующих аналогов'),
    ('1.3 Пользовательский опыт', '1.3. Требования к разрабатываемой информационной системе'),
    ('1.4 Видеоплееры', '1.4. Определение ролей пользователей программного продукта'),
    ('1.5 Доступность', '1.5. Обоснование выбора технологического стека'),
]

DOCKER_CH1 = [
    ('Глава 1. Теоретические основы контейнеризации', 'ГЛАВА 1. ОПИСАНИЕ ПРЕДМЕТНОЙ ОБЛАСТИ'),
    ('1.1. Виртуализация', '1.1. Идентификация предметной области'),
    ('1.2. Платформа Docker', '1.2. Анализ существующих аналогов'),
    ('1.3. Оркестрация', '1.3. Требования к разрабатываемой информационной системе'),
    ('1.4. Обратный прокси nginx', '1.4. Определение ролей пользователей программного продукта'),
    ('1.5. CI/CD', '1.5. Обоснование выбора технологического стека'),
]


def patch_titles(html: str, pairs: list) -> str:
    for old, new in pairs:
        html = html.replace(old, new, 1)
    return html


def patch_appendices(html: str) -> str:
    html = re.sub(
        r'<p class="struct-heading no-indent">ПРИЛОЖЕНИЯ</p>|<h1 class="struct-heading">Приложения</h1>|<h2 class="struct-heading">Приложения</h2>',
        '<p class="struct-heading no-indent">ПРИЛОЖЕНИЕ 1</p>',
        html,
        count=1,
    )
    html = re.sub(r'<strong>Приложение ([А-Я])\.', r'<strong>Приложение \1 —', html)
    return html


def insert_after_section(html: str, section_title: str, insert_html: str) -> str:
    pat = re.escape(section_title)
    m = re.search(rf'(<p class="section-title">{pat}</p>|<div class="section-title">{pat}</div>)', html)
    if not m:
        return html
    # вставить после первого </div> или </p> блока section - проще после title line
    pos = m.end()
    return html[:pos] + insert_html + html[pos:]


WEB_ANALOG_BLOCK = '''
<p>Ниже — сравнение интерфейсов стриминговых сервисов (Netflix, Crunchyroll, VK Видео) по UX-критериям; для AniHex учтены удачные паттерны каталога и плеера.</p>
<p class="table-caption no-indent">Таблица 1 — Сравнение аналогов (UX, фрагмент)</p>
<table><thead><tr><th>Критерий</th><th>Netflix</th><th>Crunchyroll</th><th>AniHex</th></tr></thead>
<tbody>
<tr><td>Каталог с фильтрами</td><td>Да</td><td>Да</td><td>Да</td></tr>
<tr><td>SPA без перезагрузки</td><td>Да</td><td>Да</td><td>Да</td></tr>
<tr><td>Пропуск OP/ED</td><td>Редко</td><td>Частично</td><td>Да</td></tr>
<tr><td>Адаптивная вёрстка</td><td>Да</td><td>Да</td><td>Да (Tailwind)</td></tr>
</tbody></table>
'''

WEB_REQUIREMENTS = '''
<p><strong>Функциональные:</strong> просмотр каталога; поиск и фильтры; воспроизведение серии; избранное и коллекция после входа; админ-раздел (через API).</p>
<p><strong>Нефункциональные:</strong> отклик UI &lt; 2 с при skeleton; адаптивность mobile/desktop; token в localStorage.</p>
'''

WEB_ROLES = '''
<p><strong>Гость</strong> — каталог и просмотр. <strong>Пользователь</strong> — персональные списки. <strong>Администратор</strong> — раздел /admin (клиент одногруппника по API).</p>
'''

WEB_CH2_TITLE = [
    ('Глава 2. Практическая реализация клиентской части', 'ГЛАВА 2. ПРОЕКТИРОВАНИЕ И РАЗРАБОТКА ПРОГРАММНОГО ПРОДУКТА'),
    ('2.1 Технологический стек', '2.1. Программирование frontend-части программного продукта'),
    ('2.6 UX загрузки', '2.2. Взаимодействие с backend'),
    ('2.8 Вспомогательные', '2.3. Реализация адаптивной вёрстки для различных устройств'),
]


def patch_web(path: Path) -> None:
    html = path.read_text(encoding='utf-8')
    for a, b in WEB_CH1_TITLES + WEB_CH2_TITLE:
        html = html.replace(a, b, 1)
    html = insert_after_section(html, '1.2. Анализ существующих аналогов', WEB_ANALOG_BLOCK)
    html = insert_after_section(html, '1.3. Требования к разрабатываемой информационной системе', WEB_REQUIREMENTS)
    html = insert_after_section(html, '1.4. Определение ролей пользователей программного продукта', WEB_ROLES)
    html = patch_appendices(html)
    path.write_text(html, encoding='utf-8')
    print(f'OK web: {path}')


DOCKER_ANALOG = WEB_ANALOG_BLOCK.replace('UX', 'развёртывания').replace('Netflix', 'Docker Compose').replace('Crunchyroll', 'Kubernetes (учебный)').replace('AniHex', 'AniHex compose')

DOCKER_CH2 = [
    ('Глава 2. Практическая реализация контейнерного', 'ГЛАВА 2. ПРОЕКТИРОВАНИЕ И РАЗРАБОТКА ПРОГРАММНОГО ПРОДУКТА'),
    ('2.1. Цели контейнеризации', '2.1. Автоматизация развёртывания и обновления локального окружения'),
    ('2.5. Документация DEPLOY', '2.2. Деплой и эксплуатация'),
]


def patch_docker(path: Path) -> None:
    html = path.read_text(encoding='utf-8')
    for a, b in DOCKER_CH1 + DOCKER_CH2:
        html = html.replace(a, b, 1)
    html = insert_after_section(html, '1.2. Анализ существующих аналогов', DOCKER_ANALOG)
    html = patch_appendices(html)
    path.write_text(html, encoding='utf-8')
    print(f'OK docker: {path}')


def main():
    restructure_server(ROOT / '01-server' / 'diploma.html')
    patch_web(ROOT / '02-web' / 'diploma.html')
    patch_docker(ROOT / '03-docker' / 'diploma.html')


if __name__ == '__main__':
    main()

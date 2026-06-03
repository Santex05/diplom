# Развёртывание AniHex (Docker + PostgreSQL)

## Как устроено хранение

Все данные лежат в папке **`docker-data/`** на диске (не в git):

| Папка | Содержимое |
|-------|------------|
| `docker-data/postgres` | База PostgreSQL (аниме, пользователи, настройки) |
| `docker-data/anime` | Видео серий и постеры (после сжатия ffmpeg) |
| `docker-data/banners` | Баннеры главной |
| `docker-data/avatars` | Аватары пользователей |
| `docker-data/auth-page` | Медиа страницы входа |

При загрузке серии в админке API сохраняет файл в `docker-data/anime/...` и **перекодирует в MP4 H.264** (меньше размер, нормальное воспроизведение в браузере).

## Запуск

```bash
cp server/.env.example server/.env
docker compose up -d --build
```

Сайт: **http://localhost**  
Админка: **http://localhost/admin/login** (логин/пароль из `ADMIN_LOGIN` / `ADMIN_PASSWORD` в compose или `.env`).

## Перенос на другой ПК

1. Скопировать **весь проект** (код).
2. Скопировать папку **`docker-data/`** целиком (это и есть «все данные»).
3. На новом ПК: установить Docker, выполнить `docker compose up -d --build`.

Без `docker-data` сайт запустится **пустым** — это нормально для чистой установки.

## Переменные (опционально, в `.env` в корне проекта)

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| `WEB_PORT` | `80` | Порт сайта |
| `ADMIN_PASSWORD` | `1111` | Пароль админки |
| `VIDEO_TRANSCODE` | `1` | Сжатие серий при загрузке |
| `FFMPEG_CRF` | `28` | Качество/размер (больше = меньше файл) |
| `FFMPEG_PRESET` | `medium` | Скорость кодирования |

## Локальная разработка без Docker

```bash
cd server && npm install && npm run dev
npm run dev   # фронт, из корня
```

Без `DATABASE_URL` — JSON в `server/data/`.  
Видео по умолчанию в `anime/` (если не задан `ANIME_DIR`). Сжатие: установите ffmpeg и `VIDEO_TRANSCODE=1`.

## Роли в дипломе

| Участник | Часть | Артефакты |
|----------|-------|-----------|
| Вы | Сервер + веб-платформа | `server/`, `src/`, API, схема БД |
| Одногруппник | Docker и деплой | `docker-compose.yml`, `Dockerfile`, `deploy/` |

## VPS (кратко)

1. Docker + Docker Compose на сервере.
2. Клон репозитория + `docker-data` с бэкапа (или пустая установка).
3. `docker compose up -d --build`
4. Домен и HTTPS перед nginx (Certbot / Caddy).

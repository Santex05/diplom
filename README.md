# AniHex — веб-платформа для просмотра аниме

Учебный групповой проект: стриминговый каталог, просмотр серий в браузере, личный кабинет и админ-панель.

## Состав репозитория

| Часть | Каталог | Описание |
|-------|---------|----------|
| Клиент (SPA) | `src/` | React + Vite + Tailwind |
| Сервер (API) | `server/` | Node.js + Express + PostgreSQL |
| Инфраструктура | `docker-compose.yml`, `deploy/`, `Dockerfile` | Docker: db, api, web (nginx) |
| Материалы ВКР | `diploma-materials/` | HTML/Word/презентации по ролям |
| Медиа (локально) | `docker-data/`, `anime/` | Не в git — см. `.gitignore` |

## Быстрый старт (Docker)

```bash
cp server/.env.example server/.env
docker compose up -d --build
```

- Сайт: http://localhost  
- Админка: http://localhost/admin/login (по умолчанию `admin` / `1111`)

Подробнее: [DEPLOY.md](DEPLOY.md)

## Разработка без Docker

```bash
npm install
npm run dev:server   # API :3001
npm run dev          # клиент :5173
```

В `server/.env` укажите `DATABASE_URL` или работайте с JSON в `server/data/`.

## Тесты

```bash
npm run test
```

## Дипломные материалы

См. [diploma-materials/README.md](diploma-materials/README.md) — отдельные пояснительные записки для server / web / docker.

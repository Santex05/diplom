-- AniHex / AniCatalog — схема PostgreSQL
-- Применяется автоматически при первом запуске контейнера postgres

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ——— Каталог аниме ———
CREATE TABLE anime (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  genres JSONB NOT NULL DEFAULT '[]',
  categories JSONB NOT NULL DEFAULT '{"isNew":false,"isPopular":false,"isRecommended":false}',
  year INTEGER,
  age_rating TEXT,
  type TEXT NOT NULL DEFAULT 'TV',
  season TEXT,
  popularity INTEGER NOT NULL DEFAULT 50,
  poster TEXT,
  background_video TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE episodes (
  id TEXT PRIMARY KEY,
  anime_id TEXT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
  number INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  file_legacy TEXT,
  duration_seconds DOUBLE PRECISION,
  opening_start_seconds DOUBLE PRECISION,
  opening_end_seconds DOUBLE PRECISION,
  ending_start_seconds DOUBLE PRECISION,
  ending_end_seconds DOUBLE PRECISION
);

CREATE INDEX idx_episodes_anime ON episodes(anime_id);

CREATE TABLE episode_sources (
  id SERIAL PRIMARY KEY,
  episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  quality TEXT NOT NULL DEFAULT 'Оригинал',
  file_path TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (episode_id, quality)
);

-- ——— Пользователи сайта ———
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  display_id INTEGER NOT NULL,
  login TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ
);

CREATE SEQUENCE IF NOT EXISTS users_display_id_seq;

CREATE TABLE user_sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE favorites (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  anime_id TEXT NOT NULL,
  PRIMARY KEY (user_id, anime_id)
);

CREATE TABLE collection_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  anime_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  cover TEXT,
  manual_status TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_collection_user ON collection_entries(user_id);

CREATE TABLE collection_episode_progress (
  collection_entry_id TEXT NOT NULL REFERENCES collection_entries(id) ON DELETE CASCADE,
  episode_id TEXT NOT NULL,
  number INTEGER,
  title TEXT,
  last_position_seconds DOUBLE PRECISION NOT NULL DEFAULT 0,
  duration_seconds DOUBLE PRECISION NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  last_watched_at TIMESTAMPTZ,
  PRIMARY KEY (collection_entry_id, episode_id)
);

CREATE TABLE ratings (
  anime_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score SMALLINT NOT NULL CHECK (score >= 1 AND score <= 10),
  PRIMARY KEY (anime_id, user_id)
);

CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ——— Админ-сессии (отдельно от пользователей) ———
CREATE TABLE admin_sessions (
  token TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ——— Баннеры главной ———
CREATE TABLE home_banner_slides (
  id TEXT PRIMARY KEY,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  type TEXT NOT NULL DEFAULT 'anime',
  anime_id TEXT,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  image TEXT,
  media_version BIGINT NOT NULL DEFAULT 0,
  tags JSONB NOT NULL DEFAULT '[]',
  buttons JSONB NOT NULL DEFAULT '[]'
);

-- ——— CMS страницы входа ———
CREATE TABLE auth_page_config (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  title TEXT NOT NULL DEFAULT 'AniHex',
  subtitle TEXT NOT NULL DEFAULT '',
  image TEXT
);

INSERT INTO auth_page_config (id, title, subtitle) VALUES (1, 'AniHex', '')
ON CONFLICT (id) DO NOTHING;

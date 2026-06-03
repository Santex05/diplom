FROM node:22-alpine

RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

COPY server/ ./
COPY authLimits.js /authLimits.js

RUN mkdir -p /data/anime /app/data/banners /app/data/avatars /app/data/auth-page

ENV NODE_ENV=production
ENV PORT=3001
ENV ANIME_DIR=/data/anime
ENV VIDEO_TRANSCODE=1
ENV FFMPEG_CRF=28
ENV FFMPEG_PRESET=medium

EXPOSE 3001

CMD ["node", "index.js"]

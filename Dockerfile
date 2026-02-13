# ビルドステージ: 依存関係のインストール
FROM node:24-alpine AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"

# hadolint ignore=DL3018
RUN apk add --no-cache libc6-compat && \
  npm install -g corepack@latest && \
  corepack enable

WORKDIR /app

COPY pnpm-lock.yaml ./

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch

COPY package.json tsconfig.json ./
COPY src src

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --offline && \
  pnpm approve-builds

# ランナーステージ: 実行環境
FROM zenika/alpine-chrome:with-puppeteer-xvfb AS runner

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"

# hadolint ignore=DL3002
USER root

# hadolint ignore=DL3018,DL3016
RUN apk upgrade --no-cache --available && \
  apk update && \
  apk add --update --no-cache tzdata x11vnc && \
  cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
  echo "Asia/Tokyo" > /etc/timezone && \
  apk del tzdata && \
  npm install -g corepack@latest && \
  corepack enable

WORKDIR /app

# builder ステージから必要なファイルのみをコピー
COPY --from=builder /app/package.json ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src

COPY entrypoint.sh ./
RUN chmod +x ./entrypoint.sh

ENV TZ=Asia/Tokyo
ENV NODE_ENV=production
ENV CONFIG_PATH=/data/config.json
ENV CHROMIUM_PATH=/usr/bin/chromium-browser
ENV LOG_DIR=/data/logs/
ENV USER_DATA_BASE=/data/userdata
ENV SCREENSHOT_DIR=/data/screenshots
ENV DIAGNOSTICS_DIR=/data/diagnostics

# rebrowser-patches 設定（Cloudflare 検出回避）
# alwaysIsolated: MutationObserver による検出を回避するため isolated context を使用
ENV REBROWSER_PATCHES_RUNTIME_FIX_MODE=alwaysIsolated

ENTRYPOINT ["tini", "--"]
CMD ["/app/entrypoint.sh"]

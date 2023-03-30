FROM alpine:3.17.2 as version-getter

# Git からバージョンとしてハッシュ値を取得

# hadolint ignore=DL3018
RUN apk update && \
  apk add --no-cache git

WORKDIR /app
COPY .git/ .git/
RUN git rev-parse --short HEAD > /app/VERSION

FROM node:18-slim

# hadolint ignore=DL3008
RUN apt-get update && \
  apt-get install --no-install-recommends -y dumb-init curl fontconfig fonts-noto-cjk && \
  fc-cache -fv && \
  apt-get install --no-install-recommends -y \
  chromium \
  libnss3 \
  libfreetype6 \
  libfreetype6-dev \
  libharfbuzz-bin \
  ca-certificates \
  fonts-freefont-ttf \
  xvfb \
  xauth \
  dbus \
  dbus-x11 \
  xvfb \
  xauth \
  dbus \
  dbus-x11 \
  x11vnc \
  && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn
COPY src/ src/
COPY tsconfig.json .

COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

COPY --from=version-getter /app/VERSION /app/VERSION

ENV DISPLAY :99
ENV CONFIG_PATH=/data/config.json
ENV CHROMIUM_PATH=/usr/bin/chromium
ENV USER_DATA_BASE=/data/userdata

ENTRYPOINT ["dumb-init", "--"]
CMD ["/app/entrypoint.sh"]
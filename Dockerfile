FROM alpine:3.17.2 as version-getter

# Git からバージョンとしてハッシュ値を取得

# hadolint ignore=DL3018
RUN apk update && \
  apk add --no-cache git

WORKDIR /app
COPY .git/ .git/
RUN git rev-parse --short HEAD > /app/VERSION

FROM node:20-alpine as builder

WORKDIR /app

COPY package.json yarn.lock ./

RUN echo network-timeout 600000 > .yarnrc && \
  yarn install --frozen-lockfile && \
  yarn cache clean

COPY src/ src/
COPY tsconfig.json .

RUN yarn package

FROM zenika/alpine-chrome:with-puppeteer-xvfb as runner

# hadolint ignore=DL3002
USER root

# hadolint ignore=DL3018
RUN apk upgrade --no-cache --available && \
  apk update && \
  apk add --no-cache \
  x11vnc \
  && \
  apk add --update --no-cache tzdata && \
  cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
  echo "Asia/Tokyo" > /etc/timezone && \
  apk del tzdata

WORKDIR /app

COPY package.json yarn.lock ./

RUN echo network-timeout 600000 > .yarnrc && \
  yarn install --frozen-lockfile && \
  yarn cache clean

COPY src/ src/
COPY tsconfig.json .

COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

COPY --from=version-getter /app/VERSION /app/VERSION

ENV TZ Asia/Tokyo
ENV DISPLAY :99
ENV CHROMIUM_PATH /usr/bin/chromium-browser
ENV CONFIG_PATH /data/config.json
ENV CHROMIUM_PATH /usr/bin/chromium
ENV USER_DATA_BASE /data/userdata

ENTRYPOINT ["tini", "--"]
CMD ["/app/entrypoint.sh"]
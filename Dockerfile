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

ENV DISPLAY :99
ENV CONFIG_PATH=/data/config.json
ENV CHROMIUM_PATH=/usr/bin/chromium
ENV USER_DATA_BASE=/data/userdata

ENTRYPOINT ["dumb-init", "--"]
CMD ["/app/entrypoint.sh"]
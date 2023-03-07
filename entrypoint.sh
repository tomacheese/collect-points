#!/bin/sh
rm /tmp/.X99-lock || true

Xvfb :99 -ac -screen 0 1920x1080x16 -listen tcp &
x11vnc -shared -forever -noxdamage -display :99 -nopw -loop -xkb &

rm -rf /data/userdata/*/Singleton* || true

while :
do
  rm -rf /data/userdata/Singleton* || true

  yarn start || true

  # wait 3 hour
  sleep 10800
done

kill -9 "$(pgrep -f "Xvfb" | awk '{print $2}')"
kill -9 "$(pgrep -f "x11vnc" | awk '{print $2}')"
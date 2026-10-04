#!/usr/bin/env bash
# Start / stop the local Groq + Tavily stub. Usage: scripts/stub.sh start|stop [ENV=...]
PIDFILE="${TMPDIR:-/tmp}/ideaguard-stub.pid"
case "$1" in
  start) node --import tsx "$(dirname "$0")/groq-stub.mts" > "${STUB_LOG:-/dev/null}" 2>&1 & echo $! > "$PIDFILE"; sleep 2 ;;
  stop) [ -f "$PIDFILE" ] && kill "$(cat "$PIDFILE")" 2>/dev/null; rm -f "$PIDFILE" ;;
esac

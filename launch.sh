#!/bin/bash
# vLLM Chat Client — llama.cpp-style chat window for vLLM on :8000
set -e

cd "$(dirname "$0")" || exit 1
PORT=3001
# runtime artifacts live next to the script (no absolute paths in the repo)
PIDFILE=".chat-client.pid"
LOGFILE=".chat-client.log"

# If the port is already serving (regardless of who started it), just open browser
if curl -s -o /dev/null --max-time 2 "http://localhost:$PORT/"; then
    xdg-open "http://localhost:$PORT" &>/dev/null &
    exit 0
fi

# Clean stale PID (server not running but old pid file may exist)
rm -f "$PIDFILE"

# Start server
python3 chat-server.py &> "$LOGFILE" &
PID=$!
echo $PID > "$PIDFILE"

# Wait for it — verify by port, not just process liveness
for i in 1 2 3 4 5 6 7 8 9 10; do
    sleep 0.5
    if curl -s -o /dev/null --max-time 2 "http://localhost:$PORT/"; then
        xdg-open "http://localhost:$PORT" &>/dev/null &
        exit 0
    fi
    if ! kill -0 "$PID" 2>/dev/null; then
        echo "ERROR: Server failed to start. Check $LOGFILE" >&2
        cat "$LOGFILE" >&2
        rm -f "$PIDFILE"
        exit 1
    fi
done

echo "ERROR: Server started but never answered on port $PORT. Check $LOGFILE" >&2
rm -f "$PIDFILE"
exit 1

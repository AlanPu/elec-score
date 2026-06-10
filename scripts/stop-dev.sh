#!/bin/bash
# 停止开发服务器

PID=$(lsof -ti:5173)

if [ -n "$PID" ]; then
  echo "Stopping dev server (PID: $PID)..."
  kill "$PID"
  echo "Dev server stopped."
else
  echo "No dev server running on port 5173."
fi

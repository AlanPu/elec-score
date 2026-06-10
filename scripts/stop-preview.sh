#!/bin/bash
# 停止生产预览服务器

PID=$(lsof -ti:4173)

if [ -n "$PID" ]; then
  echo "Stopping preview server (PID: $PID)..."
  kill "$PID"
  echo "Preview server stopped."
else
  echo "No preview server running on port 4173."
fi

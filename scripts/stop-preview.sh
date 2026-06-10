#!/bin/bash
# 停止生产预览服务器 + API 服务

PREVIEW_PID=$(lsof -ti:4173)
API_PID=$(lsof -ti:3001)

if [ -n "$PREVIEW_PID" ]; then
  echo "Stopping preview server (PID: $PREVIEW_PID)..."
  kill "$PREVIEW_PID"
  echo "Preview server stopped."
else
  echo "No preview server running on port 4173."
fi

if [ -n "$API_PID" ]; then
  echo "Stopping API server (PID: $API_PID)..."
  kill "$API_PID"
  echo "API server stopped."
else
  echo "No API server running on port 3001."
fi

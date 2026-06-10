#!/bin/bash
# 停止所有服务（开发服务器 + 预览服务器 + API 服务）

DEV_PID=$(lsof -ti:5173)
PREVIEW_PID=$(lsof -ti:4173)
API_PID=$(lsof -ti:3001)

if [ -n "$DEV_PID" ]; then
  echo "Stopping dev server (PID: $DEV_PID)..."
  kill "$DEV_PID"
  echo "Dev server stopped."
else
  echo "No dev server running on port 5173."
fi

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

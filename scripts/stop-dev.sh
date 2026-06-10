#!/bin/bash
# 停止开发服务器 + API 服务

DEV_PID=$(lsof -ti:5173)
API_PID=$(lsof -ti:3001)

if [ -n "$DEV_PID" ]; then
  echo "Stopping dev server (PID: $DEV_PID)..."
  kill "$DEV_PID"
  echo "Dev server stopped."
else
  echo "No dev server running on port 5173."
fi

if [ -n "$API_PID" ]; then
  echo "Stopping API server (PID: $API_PID)..."
  kill "$API_PID"
  echo "API server stopped."
else
  echo "No API server running on port 3001."
fi

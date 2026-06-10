#!/bin/bash
# 启动开发服务器（暴露到局域网）+ API 服务

cd "$(dirname "$0")/.." || exit 1

# 启动 API 服务（后台运行）
echo "Starting API server on port 3001..."
DATA_DIR=./data node server/index.mjs &
API_PID=$!
echo "API server started (PID: $API_PID)"

# 启动前端开发服务器
echo "Starting dev server with --host..."
npm run dev -- --host

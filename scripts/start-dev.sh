#!/bin/bash
# 启动开发服务器（暴露到局域网）

cd "$(dirname "$0")/.." || exit 1

echo "Starting dev server with --host..."
npm run dev -- --host

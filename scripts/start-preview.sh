#!/bin/bash
# 启动生产预览服务器（暴露到局域网）

cd "$(dirname "$0")/.." || exit 1

echo "Starting preview server with --host..."
npm run preview -- --host

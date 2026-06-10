FROM node:alpine

# 安装 nginx
RUN apk add --no-cache nginx && \
    sed -i 's/application\/javascript js;/application\/javascript js mjs;/' /etc/nginx/mime.types

# 复制前端构建产物
COPY dist /usr/share/nginx/html

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/http.d/default.conf

# 复制 API 服务
COPY server /app/server

# 创建数据目录
RUN mkdir -p /data/settings

# 创建启动脚本
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'cd /app/server && node index.mjs &' >> /start.sh && \
    echo 'nginx -g "daemon off;"' >> /start.sh && \
    chmod +x /start.sh

EXPOSE 4173

# 数据持久化目录
VOLUME /data

CMD ["/start.sh"]

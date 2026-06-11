# Docker + Alpine Nginx 部署踩坑记录

## 问题背景

本项目使用 Docker 部署，架构为：**Alpine Nginx（前端 SPA + 反向代理）+ Node.js API 服务**。在群晖 NAS（AMD64 架构）上运行。

```
浏览器 → Nginx(:4173) → 前端静态文件 (/usr/share/nginx/html)
                      → API 代理 (/api/) → Node.js(:3001)
```

Dockerfile 基于 `node:alpine`，安装 nginx 作为前端服务器和 API 反向代理。

## Alpine Nginx 主配置结构

这是理解后续所有问题的关键前提。Alpine nginx 的主配置 `/etc/nginx/nginx.conf` 结构如下：

```
user nginx;
worker_processes auto;
include /etc/nginx/modules/*.conf;

# ⚠️ conf.d 在 http 块外！只能放 root 级别的指令
include /etc/nginx/conf.d/*.conf;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # ✅ http.d 在 http 块内！可以放 server/location 等指令
    include /etc/nginx/http.d/*.conf;
}
```

**关键区别**：
- `conf.d/` — 在 `http {}` 块**外部**，只能放 `load_module` 等 root 级别指令，**不能放 `server`、`types` 等指令**
- `http.d/` — 在 `http {}` 块**内部**，可以放 `server`、`location`、`types` 等指令

> **非 Alpine 的 nginx（如 Debian nginx）** 主配置结构不同，`conf.d/` 通常在 `http {}` 块内部，所以网上很多教程用 `conf.d/` 没问题，但在 Alpine 上会报错。

## 踩坑记录

### 问题 1: `"types" directive is not allowed here`

**场景**：在 nginx.conf 文件顶层（server 块外）放置了 `types` 块：

```nginx
# ❌ 错误：types 不能在 server 块外
types {
    application/javascript mjs;
}

server { ... }
```

**原因**：`types` 指令只能在 `http` 或 `server` 块内使用。当配置文件被 include 到 `http.d/`（在 http 块内）时，文件顶层就等同于 http 块内，`types` 理论上可以放在 server 块外。但为了安全，**始终将 `types` 放在 `server` 块内**。

**解决**：将 `types` 块移入 `server` 块内部。

### 问题 2: `"server" directive is not allowed here`

**场景**：将 nginx.conf 复制到 `/etc/nginx/conf.d/default.conf`。

**原因**：Alpine nginx 的 `conf.d/` 在主配置的 `http {}` 块**外部**（见上方结构图），`server` 指令只能在 `http` 块内使用。

**解决**：将配置文件复制到 `/etc/nginx/http.d/default.conf`（在 http 块内部）。

```dockerfile
# ❌ 错误
COPY nginx.conf /etc/nginx/conf.d/default.conf

# ✅ 正确
COPY nginx.conf /etc/nginx/http.d/default.conf
```

### 问题 3: `"http" directive is duplicate`

**场景**：为了解决问题 2，在 nginx.conf 中手动包裹了 `http {}` 块：

```nginx
# ❌ 错误：http 块重复
http {
    server { ... }
}
```

**原因**：主配置 `/etc/nginx/nginx.conf` 已经有 `http {}` 块，`http.d/` 中的文件被 include 到该 http 块内部，再写 `http {}` 就是重复。

**解决**：不要在 nginx.conf 中添加 `http {}` 块，直接写 `server {}` 即可。

### 问题 4: 访问页面变成下载文件

**场景**：nginx 启动正常，但浏览器访问页面时不是渲染 HTML，而是下载了一个文件。

**原因**：`types` 块是**替换语义**，不是追加语义。以下配置会覆盖所有继承的 MIME 类型映射：

```nginx
# ❌ 错误：types 块覆盖了所有 MIME 类型
server {
    types {
        application/javascript mjs;  # 只有 mjs 有类型，其他全变成 application/octet-stream
    }
}
```

导致 HTML、CSS、JS 等文件的 Content-Type 都变成 `application/octet-stream`，浏览器就会下载而不是渲染。

**解决**：在 `types` 块前先 `include /etc/nginx/mime.types` 加载完整 MIME 表，再用 `types` 块追加：

```nginx
# ✅ 正确：先加载完整 MIME 表，再追加
server {
    include /etc/nginx/mime.types;

    types {
        application/javascript mjs;  # 在已有类型基础上追加
    }
}
```

### 问题 5: `unknown directive "application/javascript" in /etc/nginx/mime.types`

**场景**：尝试在 Dockerfile 中用 `echo` 追加 MIME 类型到 mime.types 文件：

```dockerfile
# ❌ 错误：追加到 types {} 块外部
RUN echo 'application/javascript mjs;' >> /etc/nginx/mime.types
```

**原因**：`/etc/nginx/mime.types` 文件结构是 `types { ... }`，追加到文件末尾意味着写到了 `types {}` 块外部，nginx 会把 `application/javascript` 当作一个指令来解析，导致报错。

改用 `sed` 修改已有行也有风险：

```dockerfile
# ⚠️ 可行但不推荐：依赖 mime.types 文件内容格式
RUN sed -i 's/application\/javascript js;/application\/javascript js mjs;/' /etc/nginx/mime.types
```

**解决**：不在 Dockerfile 中修改 mime.types，而是在 nginx.conf 的 `server` 块内用 `include` + `types` 块处理（见问题 4 的正确方案）。

### 问题 6: PDF.js worker 加载失败

**场景**：浏览器控制台报错 `Failed to fetch dynamically imported module: http://xxx/assets/pdf.worker.min-CrMmvqMo.mjs`。

**原因**：Vite 构建时给 worker 文件名加了内容哈希（如 `pdf.worker.min-CrMmvqMo.mjs`），动态 import 时：

1. 如果页面设置了 `Cross-Origin-Embedder-Policy: require-corp`，浏览器会拦截跨源模块加载
2. 即使没有 COEP，带哈希的文件名在 Docker 重新构建后可能变化，导致缓存问题

```typescript
// ❌ 错误：Vite 会生成带哈希的文件名
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
```

**解决**：将 worker 文件放到 `public/assets/` 目录下，使用固定路径：

```typescript
// ✅ 正确：使用固定路径
pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.mjs';
```

`public/` 目录下的文件会被 Vite 原样复制到构建输出，不会添加哈希。

### 问题 7: API 设置无法保存（CORS header 重复）

**场景**：API 请求被浏览器拦截，设置无法保存。

**原因**：Node.js 服务端设置了 `Access-Control-Allow-Origin: *`，nginx 又用 `add_header` 添加了一次，导致响应头中出现：

```
Access-Control-Allow-Origin: *, *
```

浏览器看到重复的 CORS header 会直接拒绝响应。

**解决**：如果 nginx 和后端都设置了 CORS header，需要在 nginx 中用 `proxy_hide_header` 先隐藏后端的 header：

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_hide_header Access-Control-Allow-Origin;
    add_header Access-Control-Allow-Origin "*";
}
```

**更好的方案**：对于同源请求（前端和 API 在同一域名端口下），根本不需要 CORS header。

### 问题 8: API 设置仍无法保存（COEP 阻止同源 API）

**场景**：修复了 CORS 重复问题后，API 仍然无法保存。

**原因**：nginx 的 `/` 和 `/assets/` location 设置了 `Cross-Origin-Embedder-Policy: require-corp`（为了 PDF.js worker），但 `/api/` 的响应没有 `Cross-Origin-Resource-Policy` header。浏览器在 COEP 策略下会**静默拦截**所有没有 CORP header 的响应，包括同源请求。

```nginx
# ❌ COEP 会阻止没有 CORP header 的 API 响应
location / {
    add_header Cross-Origin-Embedder-Policy require-corp;
}
location /api/ {
    # 缺少 Cross-Origin-Resource-Policy header → 浏览器拦截
}
```

**关键认知**：`Cross-Origin-Embedder-Policy: require-corp` 是一个极其严格的策略，它要求**所有**子资源（包括同源 API 响应）都必须携带 `Cross-Origin-Resource-Policy: same-site` 或 `Cross-Origin-Resource-Policy: same-origin` header。

**解决**：本项目不使用 SharedArrayBuffer，不需要 COEP/COOP。移除所有 COEP/COOP header：

```nginx
# ✅ 正确：不需要 COEP 的项目不要加
location / {
    try_files $uri $uri/ /index.html;
    # 不加 COEP/COOP
}
```

> **注意**：原始版本（使用 `conf.d` 目录）虽然配置了 COEP header，但因为 `conf.d` 在 http 块外导致 nginx 报错，COEP 实际上**从未生效**。切换到 `http.d` 后 COEP 真正生效了，反而暴露了这个问题。

### 问题 9: nginx 默认请求体限制 1MB

**场景**：上传 PDF 文件时请求被拒绝（HTTP 413）。

**原因**：Alpine nginx 主配置默认 `client_max_body_size 1m`，而 PDF 文件 base64 编码后约为原文件的 1.33 倍，很容易超过 1MB。

**解决**：在 server 块中设置 `client_max_body_size`：

```nginx
server {
    # 允许上传大文件（PDF base64 编码后约为原文件 1.33 倍）
    client_max_body_size 50m;
}
```

## 最终方案

### nginx.conf

```nginx
server {
    include /etc/nginx/mime.types;

    types {
        application/javascript mjs;
    }

    listen 4173;
    listen [::]:4173;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # 允许上传大文件（PDF base64 编码后约为原文件 1.33 倍）
    client_max_body_size 50m;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
}
```

### Dockerfile

```dockerfile
FROM node:alpine

# 安装 nginx（使用镜像源解决 TLS 问题）
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
    apk add --no-cache nginx

# 复制前端构建产物
COPY dist /usr/share/nginx/html

# 复制 nginx 配置（必须用 http.d，不能用 conf.d）
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
```

## 关键注意事项

### 1. Alpine nginx 目录结构

| 目录 | 在主配置中的位置 | 可放置的指令 |
|------|----------------|------------|
| `/etc/nginx/conf.d/` | `http {}` 块外（root 级别） | `load_module` 等 root 级别指令 |
| `/etc/nginx/http.d/` | `http {}` 块内 | `server`、`types`、`location` 等 |

**永远不要把 server 配置放到 `conf.d/`**。

### 2. nginx `types` 指令是替换语义

`types {}` 块会**完全替换**继承的 MIME 类型映射，而不是追加。使用前必须先 `include /etc/nginx/mime.types`。

### 3. COEP/COOP 的影响范围

`Cross-Origin-Embedder-Policy: require-corp` 会要求**所有**子资源（包括同源 API 响应）携带 `Cross-Origin-Resource-Policy` header。除非确实需要 SharedArrayBuffer，否则不要添加 COEP/COOP。

### 4. 同源请求不需要 CORS header

前端和 API 在同一域名端口下时，浏览器不会执行同源策略检查。添加 CORS header 反而可能因为重复或配置错误导致问题。

### 5. Vite 构建产物与 public 目录

- `src/` 下的资源：Vite 会添加内容哈希到文件名，适合缓存但不适合作固定引用
- `public/` 下的资源：Vite 原样复制，文件名不变，适合需要固定路径引用的场景（如 Web Worker）

### 6. nginx 请求体大小限制

Alpine nginx 默认 `client_max_body_size 1m`，上传文件时务必根据业务需求调大。

### 7. Docker 镜像构建网络问题

Docker Desktop 在某些网络环境下 `apk add` 会遇到 TLS 错误，可使用国内镜像源解决：

```dockerfile
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
    apk add --no-cache nginx
```

# elec-score
乐谱翻页器

一个基于 React + TypeScript + Vite 构建的电子乐谱翻页应用，专为音乐练习和演奏设计。

## 功能特性

- **PDF 乐谱导入** - 支持从本地导入 PDF 格式的乐谱文件
- **自动翻页** - 支持三种翻页模式：按时间、按节拍、按速度预设
- **屏幕常亮** - 使用 Wake Lock API 保持屏幕常亮，适合长时间练习
- **小节高亮** - 播放时高亮显示当前演奏小节
- **多端适配** - 支持桌面端和移动端操作

### 操作方式

| 操作 | 说明 |
|------|------|
| `←` / `→` | 键盘左右箭头翻页 |
| `Ctrl + 滚轮` | 缩放乐谱 |
| 双指捏合 | 移动端缩放 |
| 单指拖动 | 缩放后拖动浏览 |

## 技术栈

- **框架**: React 19 + TypeScript
- **构建工具**: Vite 8
- **PDF 处理**: PDF.js (pdfjs-dist)
- **屏幕常亮**: NoSleep.js
- **数据存储**: IndexedDB + localStorage
- **样式**: CSS3

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

启动开发服务器，访问 http://localhost:5173

**局域网访问**

若需在局域网内其他设备（如手机、平板）访问开发服务器，使用 `--host` 参数：

```bash
npm run dev -- --host
```

服务器将监听所有网络接口，其他设备可通过本机 IP 地址访问（如 `http://192.168.1.100:5173`）。

### 生产构建

```bash
npm run build
```

### 预览构建结果

```bash
npm run preview
```

**局域网预览**

```bash
npm run preview -- --host
```

### 使用启动脚本

项目提供了便捷的启动脚本，位于 `scripts/` 目录：

| 脚本 | 说明 |
|------|------|
| `scripts/start-dev.sh` | 启动开发服务器（带 `--host`）+ API 服务 |
| `scripts/start-preview.sh` | 启动预览服务器（带 `--host`）+ API 服务 |
| `scripts/stop-dev.sh` | 停止开发服务器 + API 服务 |
| `scripts/stop-preview.sh` | 停止预览服务器 + API 服务 |
| `scripts/stop-all.sh` | 停止所有服务（开发 + 预览 + API） |

使用方式：

```bash
# 启动开发环境（前端 + API）
./scripts/start-dev.sh

# 停止开发环境
./scripts/stop-dev.sh
```

### API 服务

项目包含可选的 Node.js API 服务，用于乐谱数据的服务端存储。

**独立启动 API 服务：**

```bash
DATA_DIR=./data node server/index.mjs
```

**环境变量：**
- `DATA_DIR`: 数据存储目录，默认 `/data`
- 服务端口：默认 `3001`

**API 服务功能：**
- 乐谱列表管理（增删查）
- PDF 数据存储
- 翻页设置持久化

## 项目结构

```
├── src/
│   ├── components/          # React 组件
│   │   ├── ScoreLibrary.tsx    # 乐谱库列表
│   │   ├── ScoreReader.tsx     # 乐谱阅读器
│   │   ├── PageControls.tsx    # 翻页控制
│   │   ├── SettingsPanel.tsx   # 设置面板
│   │   ├── MeasureHighlight.tsx # 小节高亮
│   │   └── PdfImporter.tsx     # PDF 导入器
│   ├── hooks/               # 自定义 Hooks
│   │   ├── useAutoPageTurn.ts  # 自动翻页逻辑
│   │   └── useScreenWakeLock.ts # 屏幕唤醒锁
│   ├── utils/               # 工具函数
│   │   ├── pdfImporter.ts      # PDF 导入处理
│   │   └── storage.ts          # 数据存储
│   ├── types/               # TypeScript 类型定义
│   │   └── score.ts            # 乐谱相关类型
│   ├── App.tsx              # 应用入口组件
│   └── main.tsx             # 应用启动文件
├── server/                  # 服务端（可选）
├── public/                  # 静态资源
└── docs/                    # 文档
```

## 翻页模式说明

### 1. 按时间模式 (Time)
根据固定时间间隔自动翻页，默认 30 秒每页。

### 2. 按节拍模式 (Beat)
根据 BPM（每分钟节拍数）和每小节拍数计算翻页时间，适合跟随节拍练习。

### 3. 按速度模式 (Speed)
提供慢速、中速、快速三种预设，快速入门使用。

## 配置说明

应用支持以下配置项：
- `pageTurnMode`: 翻页模式（time/beat/speed）
- `timeInterval`: 时间间隔（秒）
- `bpm`: 节拍速度
- `measuresPerPage`: 默认每页数
- `beatsPerMeasure`: 每小节拍数

## 许可证

MIT License
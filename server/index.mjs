import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 3001;
const DATA_DIR = process.env.DATA_DIR || '/data';
const SETTINGS_DIR = path.join(DATA_DIR, 'settings');
const SCORES_DIR = path.join(DATA_DIR, 'scores');
const PDFS_DIR = path.join(DATA_DIR, 'pdfs');
const METAS_FILE = path.join(DATA_DIR, 'metas.json');

// 确保数据目录存在
[SETTINGS_DIR, SCORES_DIR, PDFS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 初始化元数据文件
if (!fs.existsSync(METAS_FILE)) {
  fs.writeFileSync(METAS_FILE, '[]', 'utf-8');
}

// --- 工具函数 ---

function safeId(id) {
  return id.replace(/[^a-zA-Z0-9_-]/g, '');
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// --- 元数据操作 ---

function loadMetas() {
  return readJson(METAS_FILE) || [];
}

function saveMetas(metas) {
  writeJson(METAS_FILE, metas);
}

// --- 路由处理 ---

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // --- 设置 API ---
    const settingsMatch = pathname.match(/^\/api\/settings\/(.+)$/);
    if (settingsMatch) {
      const scoreId = safeId(settingsMatch[1]);
      const filePath = path.join(SETTINGS_DIR, `${scoreId}.json`);

      if (req.method === 'GET') {
        if (!fs.existsSync(filePath)) {
          sendJson(res, 200, null);
          return;
        }
        sendJson(res, 200, readJson(filePath));
        return;
      }

      if (req.method === 'PUT') {
        const body = await readBody(req);
        const data = JSON.parse(body); // 验证并解析 JSON
        writeJson(filePath, data);
        sendJson(res, 200, { success: true });
        return;
      }
    }

    // --- 乐谱列表 API ---
    if (pathname === '/api/scores' && req.method === 'GET') {
      const metas = loadMetas();
      sendJson(res, 200, metas);
      return;
    }

    // --- 上传乐谱 API ---
    if (pathname === '/api/scores' && req.method === 'POST') {
      const body = await readBody(req);
      const data = JSON.parse(body);
      const { id, name, pdfData, thumbnail, pageCount, fileSize } = data;
      const safeScoreId = safeId(id);

      // 保存 PDF 数据到文件
      fs.writeFileSync(path.join(PDFS_DIR, `${safeScoreId}.base64`), pdfData, 'utf-8');

      // 保存元数据
      const metas = loadMetas();
      const meta = { id, name, thumbnail, pageCount, addedDate: Date.now(), fileSize };
      metas.unshift(meta);
      saveMetas(metas);

      sendJson(res, 200, metas);
      return;
    }

    // --- 获取乐谱 PDF 数据 API ---
    const pdfMatch = pathname.match(/^\/api\/scores\/(.+)\/pdf$/);
    if (pdfMatch && req.method === 'GET') {
      const scoreId = safeId(pdfMatch[1]);
      const filePath = path.join(PDFS_DIR, `${scoreId}.base64`);
      if (!fs.existsSync(filePath)) {
        sendJson(res, 404, { error: 'PDF not found' });
        return;
      }
      const pdfData = fs.readFileSync(filePath, 'utf-8');
      sendJson(res, 200, { pdfData });
      return;
    }

    // --- 删除乐谱 API ---
    const deleteMatch = pathname.match(/^\/api\/scores\/(.+)$/);
    if (deleteMatch && req.method === 'DELETE') {
      const scoreId = safeId(deleteMatch[1]);

      // 删除 PDF 文件
      const pdfPath = path.join(PDFS_DIR, `${scoreId}.base64`);
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }

      // 删除设置文件
      const settingsPath = path.join(SETTINGS_DIR, `${scoreId}.json`);
      if (fs.existsSync(settingsPath)) {
        fs.unlinkSync(settingsPath);
      }

      // 更新元数据
      const metas = loadMetas().filter((m) => m.id !== scoreId);
      saveMetas(metas);

      sendJson(res, 200, metas);
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error('Request error:', err);
    sendJson(res, 500, { error: 'Internal server error' });
  }
}

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
});

import * as pdfjsLib from 'pdfjs-dist';
import type { Score } from '../types/score';
import { v4 as uuidv4 } from 'uuid';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/**
 * 读取文件为 ArrayBuffer
 */
function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * ArrayBuffer 转 base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * 生成 PDF 首页缩略图
 */
async function generateThumbnail(
  pdfData: ArrayBuffer
): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 0.5 });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d')!;

  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  return canvas.toDataURL('image/png');
}

/**
 * 获取 PDF 页数
 */
async function getPdfPageCount(pdfData: ArrayBuffer): Promise<number> {
  const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
  return pdf.numPages;
}

/**
 * 导入 PDF 文件并返回 Score 对象
 */
export async function importPdfFile(file: File): Promise<Score> {
  if (file.type !== 'application/pdf') {
    throw new Error('仅支持 PDF 格式');
  }

  const arrayBuffer = await readFileAsArrayBuffer(file);
  const [thumbnail, pageCount] = await Promise.all([
    generateThumbnail(arrayBuffer.slice(0)),
    getPdfPageCount(arrayBuffer.slice(0)),
  ]);

  const pdfBase64 = arrayBufferToBase64(arrayBuffer);

  return {
    id: uuidv4(),
    name: file.name.replace(/\.pdf$/i, ''),
    pdfData: pdfBase64,
    thumbnail,
    pageCount,
    addedDate: Date.now(),
    fileSize: file.size,
  };
}

/**
 * 从 base64 加载 PDF 文档
 */
export async function loadPdfFromBase64(base64: string): Promise<pdfjsLib.PDFDocumentProxy> {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return pdfjsLib.getDocument({ data: bytes }).promise;
}

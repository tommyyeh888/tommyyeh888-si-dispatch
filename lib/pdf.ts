import { PDFDocument, rgb, PDFFont, PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import type { DispatchFormData } from './dispatch';

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 30;

let cachedFontBytes: Buffer | null = null;
function loadFontBytes(): Buffer {
  if (cachedFontBytes) return cachedFontBytes;
  const fontPath = path.join(process.cwd(), 'assets', 'NotoSansTC.ttf');
  cachedFontBytes = fs.readFileSync(fontPath);
  return cachedFontBytes;
}

interface Ctx { page: PDFPage; font: PDFFont; }

function t(ctx: Ctx, str: string, x: number, y: number, size = 9, bold = false) {
  if (!str) return;
  ctx.page.drawText(str, { x, y, size, font: ctx.font, color: rgb(0, 0, 0) });
}

function l(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, thickness = 0.6) {
  ctx.page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color: rgb(0, 0, 0) });
}

function r(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.page.drawRectangle({ x, y, width: w, height: h, borderColor: rgb(0, 0, 0), borderWidth: 0.6 });
}

function centerText(ctx: Ctx, str: string, x: number, y: number, w: number, size = 9, bold = false) {
  if (!str) return;
  const tw = ctx.font.widthOfTextAtSize(str, size);
  t(ctx, str, x + (w - tw) / 2, y, size, bold);
}

export async function generateDispatchPdf(data: DispatchFormData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const fontBytes = loadFontBytes();
  const font = await doc.embedFont(fontBytes, { subset: false });
  const page = doc.addPage([PAGE_W, PAGE_H]);
  const ctx: Ctx = { page, font };

  const CW = PAGE_W - MARGIN * 2;
  let y = PAGE_H - MARGIN;

  // ── 標頭 ──
  t(ctx, 'PTSI  聚英資訊', MARGIN, y, 14, true);
  const titleW = font.widthOfTextAtSize('保養維修單', 14);
  t(ctx, '保養維修單', MARGIN + CW / 2 - titleW / 2, y, 14, true);
  t(ctx, '區', MARGIN + CW / 2 + titleW / 2 + 30, y, 10);
  t(ctx, 'Order NO:', PAGE_W - MARGIN - 100, y, 9);
  // 底線 for Order NO
  l(ctx, PAGE_W - MARGIN - 40, y - 1, PAGE_W - MARGIN, y - 1);
  y -= 6;
  l(ctx, MARGIN, y, PAGE_W - MARGIN, y);
  y -= 2;

  // ── 第一列：日期 / 客戶名稱 / 分店 ──
  const row1H = 18;
  const col3 = CW / 3;
  r(ctx, MARGIN, y - row1H, CW, row1H);
  l(ctx, MARGIN + col3, y, MARGIN + col3, y - row1H);
  l(ctx, MARGIN + col3 * 2, y, MARGIN + col3 * 2, y - row1H);
  t(ctx, '日  期', MARGIN + 4, y - 13, 8, true);
  t(ctx, data.date || '', MARGIN + 40, y - 13, 9);
  t(ctx, '客戶名稱', MARGIN + col3 + 4, y - 13, 8, true);
  t(ctx, data.customerName || '', MARGIN + col3 + 40, y - 13, 9);
  t(ctx, '分店/', MARGIN + col3 * 2 + 4, y - 13, 8, true);
  t(ctx, data.branchName || '', MARGIN + col3 * 2 + 34, y - 13, 9);
  y -= row1H;

  // ── 第二列：Project ID / 出發 / 到達 / 保全到達 / 完修 ──
  const row2H = 16;
  const col5 = CW / 5;
  r(ctx, MARGIN, y - row2H, CW, row2H);
  [1, 2, 3, 4].forEach(i => l(ctx, MARGIN + col5 * i, y, MARGIN + col5 * i, y - row2H));
  const timeLabels = ['Project ID', '出發時間', '到達時間', '保全到達', '完修時間'];
  timeLabels.forEach((label, i) => {
    t(ctx, label, MARGIN + col5 * i + 3, y - 11, 7.5, true);
  });
  y -= row2H;

  // ── 機器序號 (6列) ──
  const mRowH = 16;
  const mCount = 6;
  const mBlockH = mRowH * mCount;
  const labelW = 52;
  const noW = 22;
  const mContentW = CW - labelW - noW;

  r(ctx, MARGIN, y - mBlockH, CW, mBlockH);
  // 左側合併欄
  r(ctx, MARGIN, y - mBlockH, labelW, mBlockH);
  const mlW = font.widthOfTextAtSize('機器序號', 9);
  t(ctx, '機器序號', MARGIN + (labelW - mlW) / 2, y - mBlockH / 2 - 3, 9, true);

  for (let i = 0; i < mCount; i++) {
    const rowY = y - i * mRowH;
    r(ctx, MARGIN + labelW, rowY - mRowH, noW, mRowH);
    centerText(ctx, `${i + 1}`, MARGIN + labelW, rowY - mRowH + 4, noW, 9);
    r(ctx, MARGIN + labelW + noW, rowY - mRowH, mContentW, mRowH);
    const no = data.machines[i]?.no || '';
    t(ctx, no, MARGIN + labelW + noW + 6, rowY - mRowH + 5, 9);
  }
  y -= mBlockH;

  // ── 維修/保養內容 ──
  const contentH = 100;
  r(ctx, MARGIN, y - contentH, CW, contentH);
  t(ctx, '維修/保養 內容:', MARGIN + 4, y - 12, 9, true);

  // 顯示勾選的選項
  const selectedOpts = data.selectedOptions || [];
  let optY = y - 24;
  selectedOpts.forEach((opt) => {
    t(ctx, `☑ ${opt}`, MARGIN + 8, optY, 9);
    optY -= 13;
  });

  // 補充文字
  if (data.content) {
    const lines = wrapText(data.content, font, 9, CW - 16);
    lines.slice(0, 3).forEach((ln) => {
      t(ctx, ln, MARGIN + 8, optY, 9);
      optY -= 13;
    });
  }

  // 報價收費那行
  t(ctx, '□ 報價收費  傳真:', MARGIN + 4, y - contentH + 8, 8);
  t(ctx, data.quoteFax || '_____________________', MARGIN + 80, y - contentH + 8, 8);
  t(ctx, '聯絡人:', MARGIN + CW / 2, y - contentH + 8, 8);
  t(ctx, `${data.contactPerson || '_________________'} ${data.contactTitle || '先生/小姐'}`, MARGIN + CW / 2 + 38, y - contentH + 8, 8);
  y -= contentH;

  // ── 零件表格 (固定6列,左右各一組) ──
  const pRowH = 14;
  const pHeaderH = 14;
  const pCount = 6;
  const pBlockH = pHeaderH + pCount * pRowH;
  r(ctx, MARGIN, y - pBlockH, CW, pBlockH);

  const halfW = CW / 2;
  const pCols = [
    { label: '零件編號', w: 0.22 },
    { label: '零件名稱', w: 0.38 },
    { label: '數量', w: 0.16 },
    { label: '使用<Y/N>', w: 0.24 },
  ];

  // 表頭
  for (const side of [0, 1]) {
    let cx = MARGIN + side * halfW;
    l(ctx, cx, y - pHeaderH, cx + halfW, y - pHeaderH);
    pCols.forEach((col) => {
      const colW = col.w * halfW;
      t(ctx, col.label, cx + 2, y - 10, 7, true);
      cx += colW;
      if (cx < MARGIN + (side + 1) * halfW) l(ctx, cx, y, cx, y - pBlockH);
    });
  }

  // 零件列
  for (let i = 0; i < pCount; i++) {
    const p = data.parts[i] || { partCode: '', partName: '', qty: '', used: '' };
    const ry = y - pHeaderH - i * pRowH;
    for (const side of [0, 1]) {
      const vals = side === 0 ? [p.partCode, p.partName, p.qty, p.used] : ['', '', '', ''];
      let cx = MARGIN + side * halfW;
      pCols.forEach((col) => {
        const colW = col.w * halfW;
        t(ctx, vals[pCols.indexOf(col)] || '', cx + 2, ry - pRowH + 4, 8);
        cx += colW;
      });
    }
    l(ctx, MARGIN, ry - pRowH, MARGIN + CW, ry - pRowH);
  }
  // 中間分隔線
  l(ctx, MARGIN + halfW, y, MARGIN + halfW, y - pBlockH);
  y -= pBlockH;

  // ── 簽名區 ──
  const sigH = 85;
  r(ctx, MARGIN, y - sigH, CW, sigH);
  l(ctx, MARGIN + CW / 2, y, MARGIN + CW / 2, y - sigH);
  t(ctx, '工程師簽名:', MARGIN + 6, y - 13, 9, true);
  t(ctx, '客戶簽名:', MARGIN + CW / 2 + 6, y - 13, 9, true);

  await embedSig(doc, page, data.engineerSignature, MARGIN + 50, y - sigH + 12, 130, 55);
  await embedSig(doc, page, data.customerSignature, MARGIN + CW / 2 + 50, y - sigH + 12, 130, 55);

  return await doc.save();
}

async function embedSig(doc: PDFDocument, page: PDFPage, dataUrl: string, x: number, y: number, maxW: number, maxH: number) {
  if (!dataUrl?.startsWith('data:image')) return;
  try {
    const base64 = dataUrl.split(',')[1];
    const bytes = Buffer.from(base64, 'base64');
    const isPng = dataUrl.includes('image/png');
    const img = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
    page.drawImage(img, { x, y, width: img.width * scale, height: img.height * scale });
  } catch { /* 略過 */ }
}

function wrapText(str: string, font: PDFFont, size: number, maxW: number): string[] {
  const lines: string[] = [];
  for (const para of str.split('\n')) {
    let cur = '';
    for (const ch of para) {
      if (font.widthOfTextAtSize(cur + ch, size) > maxW && cur) { lines.push(cur); cur = ch; }
      else cur += ch;
    }
    lines.push(cur);
  }
  return lines;
}

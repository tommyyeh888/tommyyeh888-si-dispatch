import { PDFDocument, rgb, PDFFont, PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import type { DispatchFormData } from './dispatch';

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 28;

let cachedFontBytes: Buffer | null = null;
function loadFontBytes(): Buffer {
  if (cachedFontBytes) return cachedFontBytes;
  cachedFontBytes = fs.readFileSync(path.join(process.cwd(), 'assets', 'NotoSansTC.ttf'));
  return cachedFontBytes;
}

interface Ctx { page: PDFPage; font: PDFFont; }

function t(ctx: Ctx, str: string, x: number, y: number, size = 9) {
  if (!str) return;
  ctx.page.drawText(str, { x, y, size, font: ctx.font, color: rgb(0, 0, 0) });
}
function l(ctx: Ctx, x1: number, y1: number, x2: number, y2: number) {
  ctx.page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.6, color: rgb(0, 0, 0) });
}
function r(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.page.drawRectangle({ x, y, width: w, height: h, borderColor: rgb(0, 0, 0), borderWidth: 0.6 });
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
  return lines.filter(l => l.length > 0);
}

export async function generateDispatchPdf(data: DispatchFormData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(loadFontBytes(), { subset: false });
  const page = doc.addPage([PAGE_W, PAGE_H]);
  const ctx: Ctx = { page, font };
  const CW = PAGE_W - MARGIN * 2;

  // ── 固定高度區塊 ──
  const headerH  = 20; // 標頭
  const row1H    = 18; // 日期/客戶/分店
  const row2H    = 15; // Project ID/時間
  const machineH = 15 * 6; // 機器序號 6 列
  const partH    = 14 + 13 * 6; // 零件表頭+6列
  const sigH     = 90; // 簽名區
  const faxRowH  = 18; // 報價傳真那一行
  const fixedH   = headerH + row1H + row2H + machineH + partH + sigH + faxRowH;

  // 維修保養內容動態高度：用剩下的空間
  const contentBodyH = PAGE_H - MARGIN * 2 - fixedH;
  const contentH = contentBodyH; // 撐滿剩餘空間

  let y = PAGE_H - MARGIN;

  // ── 標頭 ──
  t(ctx, 'PTSI  聚英資訊', MARGIN, y, 13);
  const titleW = font.widthOfTextAtSize('保養維修單', 13);
  t(ctx, '保養維修單', MARGIN + CW / 2 - titleW / 2, y, 13);
  t(ctx, '區', MARGIN + CW / 2 + titleW / 2 + 24, y, 9);
  t(ctx, 'Order NO:', PAGE_W - MARGIN - 110, y, 9);
  l(ctx, PAGE_W - MARGIN - 45, y - 1, PAGE_W - MARGIN, y - 1);
  y -= 5; l(ctx, MARGIN, y, PAGE_W - MARGIN, y); y -= 2;

  // ── 第一列：日期/客戶/分店 ──
  const c3 = CW / 3;
  r(ctx, MARGIN, y - row1H, CW, row1H);
  l(ctx, MARGIN + c3, y, MARGIN + c3, y - row1H);
  l(ctx, MARGIN + c3 * 2, y, MARGIN + c3 * 2, y - row1H);
  const mid1 = row1H / 2 - 3;
  t(ctx, '日  期', MARGIN + 3, y - mid1 - 3, 8);
  t(ctx, data.date || '', MARGIN + 36, y - mid1 - 3, 9);
  t(ctx, '客戶名稱', MARGIN + c3 + 3, y - mid1 - 3, 8);
  t(ctx, data.customerName || '', MARGIN + c3 + 40, y - mid1 - 3, 9);
  t(ctx, '分店/', MARGIN + c3 * 2 + 3, y - mid1 - 3, 8);
  t(ctx, data.branchName || '', MARGIN + c3 * 2 + 32, y - mid1 - 3, 9);
  y -= row1H;

  // ── 第二列：時間 ──
  const c5 = CW / 5;
  r(ctx, MARGIN, y - row2H, CW, row2H);
  [1,2,3,4].forEach(i => l(ctx, MARGIN + c5 * i, y, MARGIN + c5 * i, y - row2H));
  ['Project ID','出發時間','到達時間','保全到達','完修時間'].forEach((lb, i) => {
    t(ctx, lb, MARGIN + c5 * i + 3, y - row2H / 2 - 3, 7.5);
  });
  y -= row2H;

  // ── 機器序號（6列）──
  const mRH = 15; const mLW = 50; const mNW = 20;
  r(ctx, MARGIN, y - machineH, CW, machineH);
  r(ctx, MARGIN, y - machineH, mLW, machineH);
  const mlW = font.widthOfTextAtSize('機器序號', 9);
  t(ctx, '機器序號', MARGIN + (mLW - mlW) / 2, y - machineH / 2 - 3, 9);
  for (let i = 0; i < 6; i++) {
    const ry = y - i * mRH;
    r(ctx, MARGIN + mLW, ry - mRH, mNW, mRH);
    const nw = font.widthOfTextAtSize(`${i+1}`, 9);
    t(ctx, `${i+1}`, MARGIN + mLW + (mNW - nw) / 2, ry - mRH + 4, 9);
    r(ctx, MARGIN + mLW + mNW, ry - mRH, CW - mLW - mNW, mRH);
    t(ctx, data.machines[i]?.no || '', MARGIN + mLW + mNW + 4, ry - mRH + 4, 9);
  }
  y -= machineH;

  // ── 維修/保養內容（填滿剩餘空間）──
  r(ctx, MARGIN, y - contentH, CW, contentH);
  t(ctx, '維修/保養 內容:', MARGIN + 3, y - 11, 9);

  // 選項只顯示文字，不加符號
  const selectedOpts = data.selectedOptions || [];
  const noteLines = data.content ? wrapText(data.content, font, 9, CW - 16) : [];
  const allLines = [...selectedOpts, ...noteLines];
  let cy = y - 24;
  allLines.forEach(ln => { t(ctx, ln, MARGIN + 6, cy, 9); cy -= 13; });

  // 報價傳真那行（在內容區底部）
  const faxY = y - contentH + faxRowH - 4;
  l(ctx, MARGIN, faxY + faxRowH - 2, MARGIN + CW, faxY + faxRowH - 2); // 分隔線
  t(ctx, '□ 報價收費  傳真:', MARGIN + 3, faxY + 4, 8);
  t(ctx, data.quoteFax || '____________________', MARGIN + 80, faxY + 4, 8);
  t(ctx, '聯絡人:', MARGIN + CW / 2, faxY + 4, 8);
  t(ctx, `${data.contactPerson || '________________'} ${data.contactTitle || '先生/小姐'}`, MARGIN + CW / 2 + 38, faxY + 4, 8);
  y -= contentH;

  // ── 零件表格（空白，6列）──
  const pHH = 14; const pRH = 13; const hW = CW / 2;
  r(ctx, MARGIN, y - partH, CW, partH);
  l(ctx, MARGIN + hW, y, MARGIN + hW, y - partH);
  l(ctx, MARGIN, y - pHH, MARGIN + CW, y - pHH);
  const pCols = [
    { label: '零件編號', w: 0.22 }, { label: '零件名稱', w: 0.38 },
    { label: '數量', w: 0.16 }, { label: '使用<Y/N>', w: 0.24 }
  ];
  for (const side of [0, 1]) {
    let cx = MARGIN + side * hW;
    pCols.forEach(col => {
      t(ctx, col.label, cx + 2, y - 9, 7);
      cx += col.w * hW;
      if (cx < MARGIN + (side + 1) * hW - 1) l(ctx, cx, y, cx, y - partH);
    });
  }
  for (let i = 1; i <= 6; i++) l(ctx, MARGIN, y - pHH - i * pRH, MARGIN + CW, y - pHH - i * pRH);
  y -= partH;

  // ── 簽名區 ──
  r(ctx, MARGIN, y - sigH, CW, sigH);
  l(ctx, MARGIN + CW / 2, y, MARGIN + CW / 2, y - sigH);
  t(ctx, '工程師簽名:', MARGIN + 6, y - 13, 9);
  t(ctx, '客戶簽名:', MARGIN + CW / 2 + 6, y - 13, 9);
  await embedSig(doc, page, data.engineerSignature, MARGIN + 50, y - sigH + 15, 140, 60);
  await embedSig(doc, page, data.customerSignature, MARGIN + CW / 2 + 50, y - sigH + 15, 140, 60);

  return await doc.save();
}

async function embedSig(doc: PDFDocument, page: PDFPage, dataUrl: string, x: number, y: number, maxW: number, maxH: number) {
  if (!dataUrl?.startsWith('data:image')) return;
  try {
    const bytes = Buffer.from(dataUrl.split(',')[1], 'base64');
    const img = dataUrl.includes('image/png') ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
    page.drawImage(img, { x, y, width: img.width * scale, height: img.height * scale });
  } catch { /* 略過 */ }
}

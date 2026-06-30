import { PDFDocument, rgb, PDFFont, PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import type { DispatchFormData } from './dispatch';

const PAGE_W = 595.28; // A4 pt
const PAGE_H = 841.89;
const MARGIN = 36;

let cachedFontBytes: Buffer | null = null;
function loadFontBytes(): Buffer {
  if (cachedFontBytes) return cachedFontBytes;
  const fontPath = path.join(process.cwd(), 'assets', 'NotoSansTC.ttf');
  cachedFontBytes = fs.readFileSync(fontPath);
  return cachedFontBytes;
}

interface Ctx {
  page: PDFPage;
  font: PDFFont;
  fontBold: PDFFont;
}

function text(
  ctx: Ctx,
  str: string,
  x: number,
  y: number,
  size = 10,
  bold = false
) {
  if (!str) return;
  ctx.page.drawText(str, {
    x,
    y,
    size,
    font: bold ? ctx.fontBold : ctx.font,
    color: rgb(0, 0, 0),
  });
}

function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number) {
  ctx.page.drawLine({
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    thickness: 0.7,
    color: rgb(0, 0, 0),
  });
}

function rect(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.7,
  });
}

function labelField(
  ctx: Ctx,
  label: string,
  value: string,
  x: number,
  y: number,
  w: number,
  h: number,
  labelSize = 9
) {
  rect(ctx, x, y, w, h);
  const baseline = y + h / 2 - labelSize / 2.6;
  text(ctx, label, x + 4, baseline, labelSize, true);
  const labelWidth = ctx.font.widthOfTextAtSize(label, labelSize);
  text(ctx, value, x + 4 + labelWidth + 6, baseline, labelSize, false);
}

export async function generateDispatchPdf(
  data: DispatchFormData
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const fontBytes = loadFontBytes();
  const font = await doc.embedFont(fontBytes, { subset: false });
  const fontBold = font; // 單一字重，標籤用同字型加大處理即可

  const page = doc.addPage([PAGE_W, PAGE_H]);
  const ctx: Ctx = { page, font, fontBold };

  let y = PAGE_H - MARGIN;

  // 表頭
  text(ctx, '聚英資訊', MARGIN, y, 18, true);
  text(ctx, '保養維修單', MARGIN + 110, y, 18, true);
  text(ctx, `Order NO: ${data.projectId || ''}`, PAGE_W - MARGIN - 160, y, 9);
  y -= 30;

  const contentW = PAGE_W - MARGIN * 2;

  // 第一列：日期 / 客戶名稱 / 分店
  const row1H = 24;
  const col1W = contentW / 3;
  labelField(ctx, '日期', data.date || '', MARGIN, y - row1H, col1W, row1H);
  labelField(
    ctx,
    '客戶名稱',
    data.customerName || '',
    MARGIN + col1W,
    y - row1H,
    col1W,
    row1H
  );
  labelField(
    ctx,
    '分店',
    data.branchName || '',
    MARGIN + col1W * 2,
    y - row1H,
    col1W,
    row1H
  );
  y -= row1H;

  // 第二列：Project ID / 出發 / 到達 / 保全到達 / 完修
  const row2H = 24;
  const col2W = contentW / 5;
  const row2Labels: [string, string][] = [
    ['Project ID', data.projectId || ''],
    ['出發', data.departTime || ''],
    ['到達', data.arriveTime || ''],
    ['保全到達', data.securityArriveTime || ''],
    ['完修', data.finishTime || ''],
  ];
  row2Labels.forEach(([label, value], i) => {
    labelField(
      ctx,
      label,
      value,
      MARGIN + col2W * i,
      y - row2H,
      col2W,
      row2H,
      7.5
    );
  });
  y -= row2H;

  // 機器序號區塊
  const machineRowH = 16;
  const machineBlockH = Math.max(data.machines.length, 1) * machineRowH + 18;
  rect(ctx, MARGIN, y - machineBlockH, contentW, machineBlockH);
  text(ctx, '機器序號', MARGIN + 6, y - 14, 10, true);
  data.machines.forEach((m, i) => {
    const ry = y - 18 - (i + 1) * machineRowH + 4;
    text(ctx, `${i + 1}.`, MARGIN + 10, ry, 9);
    text(ctx, m.no || '', MARGIN + 32, ry, 9);
    line(
      ctx,
      MARGIN + 80,
      ry - 2,
      MARGIN + contentW - 10,
      ry - 2
    );
  });
  y -= machineBlockH;

  // 維修/保養內容
  const contentBlockH = 110;
  rect(ctx, MARGIN, y - contentBlockH, contentW, contentBlockH);
  text(ctx, '維修/保養內容:', MARGIN + 6, y - 14, 10, true);
  const contentLines = wrapText(data.content || '', font, 10, contentW - 16);
  contentLines.slice(0, 5).forEach((ln, i) => {
    text(ctx, ln, MARGIN + 6, y - 30 - i * 13, 10);
  });
  text(
    ctx,
    `報價收費傳真: ${data.quoteFax || '_______________'}    聯絡人: ${
      data.contactPerson || '_______________'
    } ${data.contactTitle || ''}`,
    MARGIN + 6,
    y - contentBlockH + 8,
    9
  );
  y -= contentBlockH;

  // 零件表格
  const partsHeaderH = 16;
  const partsRowH = 16;
  const partsBlockH =
    partsHeaderH + Math.max(data.parts.length, 1) * partsRowH;
  rect(ctx, MARGIN, y - partsBlockH, contentW, partsBlockH);

  const pCols = [
    { label: '零件編號', w: 0.18 },
    { label: '零件名稱', w: 0.32 },
    { label: '數量', w: 0.12 },
    { label: '使用<Y/N>', w: 0.18 },
  ];
  // 左右各一組
  const halfW = contentW / 2;
  for (const half of [0, 1]) {
    let cx = MARGIN + half * halfW;
    const colWidths = pCols.map((c) => c.w * halfW);
    pCols.forEach((c, i) => {
      text(ctx, c.label, cx + 2, y - 12, 7.5, true);
      cx += colWidths[i];
    });
    line(
      ctx,
      MARGIN + half * halfW,
      y - partsHeaderH,
      MARGIN + half * halfW + halfW,
      y - partsHeaderH
    );
  }

  data.parts.forEach((p, i) => {
    const ry = y - partsHeaderH - (i + 1) * partsRowH + 5;
    const rowVals = [p.partCode, p.partName, p.qty, p.used];
    for (const half of [0, 1]) {
      let cx = MARGIN + half * halfW;
      const colWidths = pCols.map((c) => c.w * halfW);
      // 左半 = 此筆零件本身；右半留白供現場手寫第二批，沿用同一筆資料於左側即可
      if (half === 0) {
        rowVals.forEach((v, ci) => {
          text(ctx, v || '', cx + 2, ry, 8);
          cx += colWidths[ci];
        });
      }
    }
  });
  y -= partsBlockH;

  // 簽名區
  const sigBlockH = 90;
  rect(ctx, MARGIN, y - sigBlockH, contentW, sigBlockH);
  text(ctx, '工程師簽名:', MARGIN + 10, y - 16, 10, true);
  text(ctx, '客戶簽名:', MARGIN + contentW / 2 + 10, y - 16, 10, true);

  await embedSignature(
    doc,
    page,
    data.engineerSignature,
    MARGIN + 90,
    y - sigBlockH + 15,
    140,
    50
  );
  await embedSignature(
    doc,
    page,
    data.customerSignature,
    MARGIN + contentW / 2 + 80,
    y - sigBlockH + 15,
    140,
    50
  );

  if (data.engineerName) {
    text(ctx, `(${data.engineerName})`, MARGIN + 90, y - sigBlockH + 4, 8);
  }

  const bytes = await doc.save();
  return bytes;
}

async function embedSignature(
  doc: PDFDocument,
  page: PDFPage,
  dataUrl: string,
  x: number,
  y: number,
  maxW: number,
  maxH: number
) {
  if (!dataUrl || !dataUrl.startsWith('data:image')) return;
  try {
    const base64 = dataUrl.split(',')[1];
    const bytes = Buffer.from(base64, 'base64');
    const isPng = dataUrl.includes('image/png');
    const img = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
    const w = img.width * scale;
    const h = img.height * scale;
    page.drawImage(img, { x, y, width: w, height: h });
  } catch {
    // 簽名圖片解析失敗時略過，不中斷整體 PDF 產生
  }
}

function wrapText(
  str: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  const paragraphs = str.split('\n');
  for (const para of paragraphs) {
    let current = '';
    for (const ch of para) {
      const test = current + ch;
      if (font.widthOfTextAtSize(test, size) > maxWidth && current) {
        lines.push(current);
        current = ch;
      } else {
        current = test;
      }
    }
    lines.push(current);
  }
  return lines;
}

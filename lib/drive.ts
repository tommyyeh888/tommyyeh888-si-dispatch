import { google } from 'googleapis';
import { Readable } from 'stream';

// 使用 Service Account 連接 Google Drive 共用雲端硬碟(Shared Drive)
// 環境變數:
//   GOOGLE_SERVICE_ACCOUNT_KEY  -> Service Account JSON 金鑰內容（整段 JSON 字串）
//   GOOGLE_SHARED_DRIVE_ID      -> 共用雲端硬碟的 ID

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error('缺少環境變數 GOOGLE_SERVICE_ACCOUNT_KEY');
  }
  const credentials = JSON.parse(raw);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
}

function getDriveClient() {
  const auth = getAuth();
  return google.drive({ version: 'v3', auth });
}

async function findOrCreateFolder(
  drive: ReturnType<typeof getDriveClient>,
  name: string,
  parentId: string,
  sharedDriveId: string
): Promise<string> {
  const q = [
    `name = '${escapeQ(name)}'`,
    `'${parentId}' in parents`,
    `mimeType = 'application/vnd.google-apps.folder'`,
    `trashed = false`,
  ].join(' and ');

  const res = await drive.files.list({
    q,
    fields: 'files(id, name)',
    corpora: 'drive',
    driveId: sharedDriveId,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id as string;
  }

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
    supportsAllDrives: true,
  });
  return created.data.id as string;
}

function escapeQ(s: string): string {
  return s.replace(/'/g, "\\'");
}

export interface UploadResult {
  fileId: string;
  fileName: string;
  webViewLink: string;
}

export async function uploadDispatchPdf(
  pdfBytes: Uint8Array,
  opts: { date: string; branchName: string; customerName: string }
): Promise<UploadResult> {
  const sharedDriveId = process.env.GOOGLE_SHARED_DRIVE_ID;
  if (!sharedDriveId) {
    throw new Error('缺少環境變數 GOOGLE_SHARED_DRIVE_ID');
  }
  const drive = getDriveClient();

  const d = new Date(opts.date);
  const yearMonth = isNaN(d.getTime())
    ? new Date().toISOString().slice(0, 7).replace('-', '年') + '月'
    : `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月`;

  // 月份資料夾建立在共用雲端硬碟的根目錄下
  const monthFolderId = await findOrCreateFolder(
    drive,
    yearMonth,
    sharedDriveId,
    sharedDriveId
  );

  const dateStr = opts.date || new Date().toISOString().slice(0, 10);
  const fileName = `${dateStr}_${opts.branchName || opts.customerName}_保養維修單.pdf`;

  const media = {
    mimeType: 'application/pdf',
    body: Readable.from(Buffer.from(pdfBytes)),
  };

  const created = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [monthFolderId],
    },
    media,
    fields: 'id, webViewLink',
    supportsAllDrives: true,
  });

  return {
    fileId: created.data.id as string,
    fileName,
    webViewLink: created.data.webViewLink || '',
  };
}

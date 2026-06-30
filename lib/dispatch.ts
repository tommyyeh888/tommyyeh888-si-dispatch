// 派工單核心資料結構與編碼/解碼工具
// 設計理念:不使用資料庫。後台建單時，把「店名、時間、欄位數設定」編碼進網址(base64url JSON)，
// 工程師打開連結時直接從網址解碼還原，送出後直接產生 PDF 上傳雲端硬碟，不落地存檔。

export interface DispatchSeed {
  // 由後台(PM)建立，工程師端為唯讀，並帶入表單
  customerName: string; // 客戶名稱
  branchName: string; // 分店
  date: string; // 日期 YYYY-MM-DD
  projectId?: string; // Project ID (選填)
  machineCount: number; // 機器序號欄位數，預設 2，可調整
  partCount: number; // 零件欄位數，預設 2，可調整
  createdAt: string; // ISO timestamp，用來決定要存進哪個年-月資料夾
}

export interface MachineEntry {
  no: string; // 機器序號
}

export interface PartEntry {
  partCode: string; // 零件編號
  partName: string; // 零件名稱
  qty: string; // 數量
  used: 'Y' | 'N' | ''; // 使用 Y/N
}

export interface DispatchFormData extends DispatchSeed {
  // 以下由工程師在現場填寫
  departTime: string; // 出發時間
  arriveTime: string; // 到達時間
  securityArriveTime: string; // 保全到達
  finishTime: string; // 完修時間
  machines: MachineEntry[];
  content: string; // 維修/保養內容
  quoteFax: string; // 報價收費傳真
  contactPerson: string; // 聯絡人
  contactTitle: '先生' | '小姐' | ''; // 先生/小姐
  parts: PartEntry[];
  engineerName: string; // 工程師姓名(文字)
  engineerSignature: string; // base64 png dataURL
  customerSignature: string; // base64 png dataURL
}

const DEFAULT_MACHINE_COUNT = 2;
const DEFAULT_PART_COUNT = 2;

export function createSeed(input: {
  customerName: string;
  branchName: string;
  date: string;
  projectId?: string;
  machineCount?: number;
  partCount?: number;
}): DispatchSeed {
  return {
    customerName: input.customerName,
    branchName: input.branchName,
    date: input.date,
    projectId: input.projectId || '',
    machineCount: input.machineCount ?? DEFAULT_MACHINE_COUNT,
    partCount: input.partCount ?? DEFAULT_PART_COUNT,
    createdAt: new Date().toISOString(),
  };
}

// base64url 編碼，避免網址中出現 + / = 等特殊字元
export function encodeSeed(seed: DispatchSeed): string {
  const json = JSON.stringify(seed);
  const base64 = Buffer.from(json, 'utf-8').toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeSeed(token: string): DispatchSeed | null {
  try {
    let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const json = Buffer.from(base64, 'base64').toString('utf-8');
    const seed = JSON.parse(json) as DispatchSeed;
    if (!seed.customerName || !seed.date) return null;
    return seed;
  } catch {
    return null;
  }
}

export function emptyMachines(count: number): MachineEntry[] {
  return Array.from({ length: count }, () => ({ no: '' }));
}

export function emptyParts(count: number): PartEntry[] {
  return Array.from({ length: count }, () => ({
    partCode: '',
    partName: '',
    qty: '',
    used: '',
  }));
}

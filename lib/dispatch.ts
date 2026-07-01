// 派工單核心資料結構與編碼/解碼工具
// 設計理念:不使用資料庫。後台建單時，把「店名、時間、欄位數設定」編碼進網址(base64url JSON)，
// 工程師打開連結時直接從網址解碼還原，送出後直接產生 PDF 上傳雲端硬碟，不落地存檔。

export interface DispatchSeed {
  customerName: string;
  branchName: string;
  customerId: string;
  projectId?: string;
  machineCount: number;
  partCount: number;
  createdAt: string;
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
  date: string;
  departTime: string;
  arriveTime: string;
  securityArriveTime: string;
  finishTime: string;
  machines: MachineEntry[];
  selectedOptions: string[];
  content: string;
  quoteFax: string;
  contactPerson: string;
  contactTitle: '先生' | '小姐' | '';
  parts: PartEntry[];
  engineerSignature: string;
  customerSignature: string;
}

const DEFAULT_MACHINE_COUNT = 6;
const DEFAULT_PART_COUNT = 6;

export function createSeed(input: {
  customerName: string;
  branchName: string;
  customerId: string;
  projectId?: string;
}): DispatchSeed {
  return {
    customerName: input.customerName,
    branchName: input.branchName,
    customerId: input.customerId,
    projectId: input.projectId || '',
    machineCount: DEFAULT_MACHINE_COUNT,
    partCount: DEFAULT_PART_COUNT,
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
    if (!seed.customerName) return null;
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

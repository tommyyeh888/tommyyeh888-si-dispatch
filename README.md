# 聚英資訊 派工簽單系統 (si-dispatch)

派工單電子化系統。後台建立派工單產生連結，工程師到現場用手機填寫內容、請客戶手指簽名，
送出後自動產生 PDF 並上傳到公司 Google 共用雲端硬碟，依年月自動分類資料夾。

## 技術架構

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- 不使用資料庫：派工單基本資料(店名/時間)以 base64 編碼存於網址中
- PDF 產生：pdf-lib + 內嵌 Noto Sans TC 字型（`assets/NotoSansTC.ttf`）
- 雲端儲存：Google Drive API，以 Service Account 連接公司共用雲端硬碟
- 部署：Vercel（免費方案）

## 環境變數設定

在 Vercel 專案的 Settings → Environment Variables 新增：

| 變數名稱 | 說明 |
|---|---|
| `ADMIN_PASSWORD` | 後台建單頁面的登入密碼，自行設定一組即可 |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Service Account 的 JSON 金鑰**整段內容**（貼上完整 JSON 字串） |
| `GOOGLE_SHARED_DRIVE_ID` | 公司共用雲端硬碟的 ID（從網址列取得，見下方說明） |

### 如何取得 GOOGLE_SHARED_DRIVE_ID

打開公司的共用雲端硬碟，網址會像：
`https://drive.google.com/drive/folders/0AbCdEfGhIjKlMnOpQ`
最後面那段 `0AbCdEfGhIjKlMnOpQ` 就是 Shared Drive ID。

### Service Account 設定步驟

1. 前往 https://console.cloud.google.com/ ，用公司 Google Workspace 帳號登入，建立新專案
2. 「API 和服務」→「程式庫」→ 搜尋並啟用 **Google Drive API**
3. 「API 和服務」→「憑證」→「建立憑證」→「服務帳號」，建立後進入「金鑰」分頁，新增 JSON 金鑰並下載
4. 打開下載的 JSON，複製 `client_email` 欄位的值（格式類似 `xxx@xxx.iam.gserviceaccount.com`）
5. 打開公司共用雲端硬碟 →「管理成員」→ 把該 email 加入，權限至少給「內容管理員」
6. 把整個 JSON 檔案內容貼到 Vercel 環境變數 `GOOGLE_SERVICE_ACCOUNT_KEY`

## 本機開發

```bash
npm install
cp .env.example .env.local   # 並填入上述三個環境變數
npm run dev
```

開啟 http://localhost:3000/admin 進入後台。

## 使用流程

1. 後台（`/admin`，需密碼登入）填寫客戶名稱、分店、日期，按「產生派工連結」
2. 把產生的連結傳給工程師（LINE 傳送即可）
3. 工程師打開連結，免登入，填寫派工內容並請客戶簽名
4. 送出後 PDF 自動上傳至共用雲端硬碟的「YYYY年MM月」資料夾，檔名為「日期_分店_保養維修單.pdf」

## 欄位調整

後台建單頁可調整「機器序號筆數」與「零件筆數」上限（預設各 2 筆），
工程師端會依此動態產生對應數量的欄位。

## 已知限制

- 不使用資料庫，因此後台無法查詢「歷史已建立但尚未送出」的派工單清單；
  所有已完成的派工單僅能透過 Google Drive 查詢
- PDF 因內嵌完整中文字型，單檔約 4-5MB（屬正常，不影響使用，Google Drive 容量足夠存放數千份）

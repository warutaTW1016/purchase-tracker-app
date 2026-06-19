# 代購作業台

這是一個手機優先的 PWA 代購管理工具，用來建立多個代購團、匯入賣貨便訂單 Excel、追蹤採購進度，並估算成本與獲利。

## 功能

- 建立多個獨立代購團。
- 新增代購團時先以匯入檔名作為預設名稱，後續可在作業台直接修改團名。
- 匯入 `.xlsx`，讀取 `非訂單匯入` 工作表。
- 依商品名稱彙整訂單單價、訂購數量與訂單筆數。
- 代購團可再次匯入 Excel 更新商品數量，並保留已設定的匯率、日幣原價與已代購數量。
- 手機版以商品卡片與詳情抽屜操作；桌面版提供高密度表格。
- 快速篩選：全部、待代購、已完成、缺成本、低利潤、本次新增。
- 可使用「全部回推日幣」依對客報價匯率批次補上尚未設定的日幣原價。
- 顯示匯入摘要、彙總 KPI、預估營收、預估成本、預估獲利與利潤率。
- 匯率輸入支援小數輸入過程，不會在輸入 `.` 或 `0.` 時重設游標。
- 支援資料備份 JSON 與單團清單匯出 JSON。
- 加入 `manifest.webmanifest` 與 `service-worker.js`，在正式網址或本機伺服器下可作為 PWA 安裝。

## 檔案結構

```text
purchase-tracker-app/
├─ index.html
├─ manifest.webmanifest
├─ service-worker.js
├─ src/
│  ├─ app.js
│  ├─ calculations.js
│  ├─ state.js
│  ├─ storage.js
│  ├─ xlsx-reader.js
│  ├─ assets/
│  │  └─ icon.svg
│  ├─ render/
│  │  ├─ dashboard.js
│  │  ├─ drawer.js
│  │  ├─ groups.js
│  │  └─ items.js
│  └─ styles/
│     └─ main.css
├─ README.md
└─ SPEC.md
```

## 使用方式

1. 用瀏覽器開啟 `index.html`，或用本機伺服器開啟專案資料夾。
2. 點選「新增代購團」。
3. 選擇賣貨便匯出的 `.xlsx` 檔案。
4. 視需要修改代購團名稱。
5. 輸入對客報價匯率與實際成本匯率。
6. 針對商品輸入或回推日幣原價。
7. 逐項填寫已代購數量，或在商品詳情中標記全數已買。
8. 後續訂單變動時，進入該團點選「更新此團訂單」並匯入新 Excel。

## 手機安裝

PWA 安裝與離線快取需要透過 `http://localhost` 或正式 `https` 網址開啟，直接用檔案方式開啟時仍可使用主要功能，但不會啟用 service worker。

若畫面看起來仍是舊版或局部空白，請先使用 `Ctrl + F5` 強制刷新；PWA 快取更新後，重新載入會取得新版 CSS 與 JS。

本機測試可在專案資料夾執行：

```powershell
python -m http.server 8080
```

然後用瀏覽器開啟：

```text
http://localhost:8080/
```

## 資料保存

目前資料保存在同一瀏覽器的 `localStorage`，並與舊版 `purchase-tracker-state-v2` 資料相容。

限制：
- 換手機、換瀏覽器或清除瀏覽器資料後，不會自動同步。
- 若要長期保存，請使用「備份資料」匯出 JSON。
- 未來若需要跨裝置同步，應新增後端與登入機制。

## 後續可串接後端

個人手機端第一版不需要後端；若需要跨裝置同步、多使用者、匯入歷史或自動備份，建議新增 API：

```text
GET    /api/groups
POST   /api/groups
GET    /api/groups/:id
PATCH  /api/groups/:id
POST   /api/groups/:id/imports
PATCH  /api/groups/:id/items/:itemId
GET    /api/groups/:id/export
```

## 維護流程

後續調整功能時，需先分析需求與影響範圍；若有不清楚且會影響資料模型、流程或公式的地方，先確認後再實作。

每次完成調整後，需同步更新：

- `SPEC.md`
- `README.md`

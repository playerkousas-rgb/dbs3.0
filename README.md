# DBS 3.0 多區版

DBS 3.0 多區版是由 **Scout System** 以中立第三方身份維護的多區專科徽章平台。筲箕灣區是首個已接入及實際使用本平台的地區，其他地區可按同一模板建立獨立後台接入。

- 前端：Next.js
- 區資料庫：Google Sheet
- 區後端：Google Apps Script
- 模式：**統一前端 + 各區獨立 Apps Script backend**

## 固定版權

```text
© 2026 Scout System
```

此項固定保留，不交由各區自行改動；各區仍自行擁有及維護本區 Google Sheet / Apps Script / 主考 / 旅團資料。

---

## 目前已完成

- 首頁先選區
- 記住區碼（localStorage）
- 全站 URL 帶 `d=`
- 前端以 `lib/district.ts` 維護各區 mapping
- 區接入教學頁：`/setup`
- 下載區：`/downloads`
- 更新公告頁：`/updates`
- 區接入申請頁：`/onboard`
- 現已使用地區頁：`/districts`
- Google Apps Script 多區模板：`gs/DBS_3_0_MULTI_DISTRICT.gs`
- 主考自動指派模式切換：`GROUP_PRIORITY` / `DISTRICT_PRIORITY`

---

## 本機開發

```bash
npm install
npm run dev
```

預設本機網址：

```text
http://localhost:3000
```

---

## 部署網址

```text
https://districtbadgesystem30.vercel.app
```

---

## 區接入流程

其他區只需：

1. 建立空白 Google Sheet
2. 開啟 Apps Script
3. 貼上 `gs/DBS_3_0_MULTI_DISTRICT.gs`
4. 執行 `setupSystem()`
5. 填寫 Config（包括 `EXAMINER_ASSIGNMENT_MODE`，亦可日後在秘書後台一鍵切換）
6. Deploy 為 Web App
7. 測試：
   ```text
   ?action=getHealthCheck
   ```
8. 到前端 `/onboard` 產生接入申請電郵草稿，寄給平台管理員指定電郵

---

## 主考指派模式

`Config` 內的 `EXAMINER_ASSIGNMENT_MODE` 控制自動派主考方式；秘書後台亦新增「⚖️ 主考機制」分頁可一鍵切換。

- `GROUP_PRIORITY`：旅團主考優先。系統先找同旅 G 旅團主考，再找 D 區主考。
- `DISTRICT_PRIORITY`：只用區主考（公平模式）。系統只會自動派 D 區主考；即使 D 主考本身是同旅團領袖，也視為 ADC 已授權的區主考。
- `NO_SAME_GROUP`：同旅團不能擔任主考。所有具該章資格的主考隨機分配，但排除與考生同旅團的主考；即使該人是 D 主考也不會派給同旅團成員。

此設定只影響之後批核 / 重新分配，不會重派已指派個案。

---

## District Mapping

前端 district mapping 位於：

```text
lib/district.ts
```

目前首個已接入地區：

- `SKW` → 筲箕灣區（首個使用地區）

日後每加入一區，只需在 `lib/district.ts` 新增一項：

```ts
ABC: {
  code: 'ABC',
  name: '某某區',
  apiBase: 'https://script.google.com/macros/s/.../exec',
  status: 'live',
}
```

---

## Apps Script 模板重點

`gs/DBS_3_0_MULTI_DISTRICT.gs` 已包括：

- `setupSystem()`：空白 Sheet 一鍵初始化
- `apiGetHealthCheck()`：接入檢查 API
- `DISTRICT_CODE`
- `DISTRICT_NAME`
- `FRONTEND_URL`
- `STAFF_TOKEN`
- `ADC_TOKEN`
- `EXAMINER_ASSIGNMENT_MODE`
- email links 自動帶 `d=`
- Application ID / 證書編號按區碼生成

---

## 環境變數（Vercel）

所有密鑰只存 Vercel 環境變數，不會進前端 JS、不會進 Google Sheet、不會入 Git。
範本見 `.env.example`，詳細說明見 `SUPER_ADMIN.md`。

| 名稱 | 需要 | 用途 |
| --- | --- | --- |
| `SUPER_KEY` | 必填 | 平台超管登入密碼（入口 `/super`） |
| `SUPER_SESSION_SECRET` | 選填 | 超管 session cookie 簽名 secret |
| `DBS_{區碼}_APIKEY` | 必填 | 各區 API Key，例如 `DBS_SKW_APIKEY` |
| `DBS_{區碼}_STAFF_KEY` | 選填 | 該區 STAFF_TOKEN；令超管免密鑰操作該區秘書後台 |
| `DBS_{區碼}_ADC_KEY` | 選填 | 該區 ADC_TOKEN；令超管免密鑰使用 ADC 審批 |

---

## 平台超管（/super）

超管為最高權限帳戶，全域通行所有已接入地區：

- 密碼只存 Vercel `SUPER_KEY`，於伺服器端（`/api/super/login`）以 timing-safe 方式比對
- 登入後簽發 HttpOnly + SameSite=Lax 簽名 session cookie（8 小時），密碼不會留在前端
- 平台總覽：各區連通狀態、health check、環境變數是否齊全（只顯示有無設定，不顯示金鑰）
- 秘書後台（全域）：切換任何一區使用完整後台功能，區的金鑰由伺服器端注入
- 未設定 `SUPER_KEY` 時一律拒絕登入（fail closed）

```text
/super   → 輸入 SUPER_KEY → 平台總覽 / 秘書後台（全域）
/admin   → 區秘書用該區 STAFF_TOKEN 登入（現有流程不變）
```

---

## 重要注意

- 前端版權固定保留 `© 2026 Scout System`
- Scout System 以中立第三方身份維護平台；筲箕灣區只是首個使用地區
- 各區自行維護本區 Sheet / Script / 主考 / 群組資料
- 若有新章更新，可另行提供 patch function，不一定要整份重貼

---

## 作者 / 維護

```text
Scout System
© 2026 Scout System
```

# DBS 3.0 — 平台超管（Super Admin）說明

平台超管是 Scout System 的最高權限帳戶：**全域通行所有已接入地區 + 全功能最高權限**。
超管密碼只存放於 **Vercel 環境變數 `SUPER_KEY`**，不會出現在前端 JS、Google Sheet 或 Git。

```text
入口網址：https://<你的網域>/super
頁尾亦有「🔐 平台超管」連結
```

---

## 1. 部署者在 Vercel 要做的設定

Vercel → 你的 Project → **Settings → Environment Variables** → 逐項新增 → 儲存後 **Redeploy**。

| 名稱 | 需要 | 用途 |
| --- | --- | --- |
| `SUPER_KEY` | **必填** | 超管登入密碼（建議 20 字以上） |
| `SUPER_SESSION_SECRET` | 選填（建議） | session cookie 簽名 secret；未設會用 `SUPER_KEY` 派生。可用 `openssl rand -hex 32` 產生 |
| `DBS_{區碼}_APIKEY` | 必填（現有） | 該區 API Key，例如 `DBS_SKW_APIKEY` |
| `DBS_{區碼}_STAFF_KEY` | 選填 | 該區 `STAFF_TOKEN`。設定後超管可**免密鑰**操作該區秘書後台 |
| `DBS_{區碼}_ADC_KEY` | 選填 | 該區 `ADC_TOKEN`。設定後超管可**免密鑰**使用 ADC 審批 |

> 未設定 `SUPER_KEY` 時，超管登入會回 503 並在畫面明確提示；系統屬 **fail closed**（無設定＝不能登入），不會出現「無密碼即可進入」。

---

## 2. 超管可以做什麼

- **🌐 平台總覽**：一次過檢查所有已接入區的連通狀態、health check、環境變數是否齊全（只顯示「有無設定」，不會顯示任何金鑰內容）。
- **📊 秘書後台（全域）**：切換任何一區，使用完整秘書後台功能 — 待批核／指派主考、主考機制切換、證書管理、列印清單、主考名單、專章代碼、說明。
- **其他角色頁面**：選區後會同步全站區碼，可直接使用報考、查詢、主考專區等功能；`/adc`、「證書列印」頁亦會自動以超管身份進入。

超管模式開啟時，畫面會顯示綠色「🌐 超管全域模式」提示。

---

## 3. 安全模型

| 項目 | 做法 |
| --- | --- |
| 密碼儲存 | 只在 Vercel 環境變數 `SUPER_KEY`（伺服器端 `process.env`），不進前端 bundle |
| 密碼比對 | 只在伺服器（Node runtime）進行，使用 `crypto.timingSafeEqual` 固定時間比較 |
| 登入憑證 | 簽名 session cookie：`HttpOnly` + `SameSite=Lax` + `Secure`（正式環境），HMAC-SHA256 簽名，**8 小時**到期 |
| 密碼去向 | 只 POST 一次到 `/api/super/login`；**不會**存 localStorage、不會入 URL、不會回傳給前端 |
| 暴力破解 | 同一 IP 10 分鐘內 6 次失敗即鎖（回 429） |
| CSRF | `SameSite=Lax` + 伺服器端檢查 `Origin` 必須同站 |
| 各區金鑰 | 超管操作任何區時，由 `/api/super/proxy` 於伺服器端注入 API Key／STAFF_KEY／ADC_KEY；前端完全不接觸 |
| 診斷端點 | `/api/proxy?...&action=proxyDebug` 已收緊為只限超管 session，並遮蔽 Key 前綴與 Apps Script URL |
| 區秘書不受影響 | 區秘書仍可用自己區的 `STAFF_TOKEN` 登入 `/admin`，權限與以往相同 |

---

## 4. 日常操作

- **登入**：到 `/super` 輸入 `SUPER_KEY`。
- **登出**：頁面右上「登出超管」，或後台內的「登出超管」按鈕。
- **想即刻踢走所有已登入的超管 session**：在 Vercel 改 `SUPER_KEY`（或 `SUPER_SESSION_SECRET`）後 Redeploy — 舊 cookie 的簽名會立即失效。
- **想免密鑰操作某區後台**：在 Vercel 加 `DBS_{區碼}_STAFF_KEY`（值 = 該區 Google Sheet `Config` 內的 `STAFF_TOKEN`）再 Redeploy。
- **未設定 `DBS_{區碼}_STAFF_KEY` 時**：該區的後台操作會失敗並顯示提示；可改用該區秘書帳號（`/admin` + STAFF_TOKEN），或超管在畫面手動輸入該區 token（只作後備，仍經伺服器端處理）。

---

## 5. 注意事項

- 超管密碼等於整個平台所有區的鑰匙，請用長密碼、唔好與其他服務共用、唔好寫在 Google Sheet 或聊天記錄內。
- 環境變數只會傳到 Vercel 的伺服器函數，不會被打包進前端 JS；但任何有 Vercel 專案權限的人都可以看到 `SUPER_KEY`，所以**請開啟 Vercel 帳戶的兩步驗證（2FA）並限制成員權限**。
- 於共用電腦登入後，請務必按「登出超管」。
- 本平台的 Apps Script 模板中，`apiSyncExaminers` 的權限檢查在原始版本被註解掉（方便開發測試）。建議各區在正式使用時取消註解並重新部署，避免有人可透過 API Key 觸發重建主考表。

```text
© 2026 Scout System
```

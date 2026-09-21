# 平台帳戶（後備通道）

**定位：平台管理員的後備通道。無入口、無頁面、無按鈕；只在必要時用。**

日常各區照舊：秘書用自己區的 STAFF_TOKEN、ADC 用自己區的 ADC_TOKEN。
平台管理員只需要記住**一組密碼**，就可以在任何一區登入。

---

## 一句話

> **在該區的登入欄，直接打你設在 Vercel 的 `SUPER_KEY` 就得。**

不用打帳號、不用任何前綴。

---

## 一、設定（兩處，各一次）

### 1. Vercel — 只加一個環境變數

```text
SUPER_KEY = 你的平台密碼     ← 建議 20 字以上
```

Settings → Environment Variables → 新增 → Redeploy。
**各區的 STAFF_TOKEN / ADC_TOKEN 不需要放上來。**

### 2. 各區 Google Sheet — 通常唔需要做

貼上新版 GS 模板 / 執行 `setupSystem()` 後，Config 會自動有：

```text
SUPER_ACCOUNT = sheep
```

這只是一個**標籤**，Config 內**冇、亦唔應該有密碼**。
清空它 ＝ 停用該區的後備通道（唔建議）。

> 換 `SUPER_KEY` 之後**唔需要**逐區重設 —— 改 Vercel 一處即全平台生效。

---

## 二、怎麼用

先選區 → 在該區入口的那一格輸入平台密碼：

| 想做什麼 | 去哪 | 在那欄輸入 |
| --- | --- | --- |
| 秘書後台（批核／派主考／證書／列印清單／主考名單） | 該區 `/admin` | 你的平台密碼 |
| ADC 主考審批 | 該區 `/adc` → ADC 審批後台 | 你的平台密碼 |
| ADC 說明文件 | 該區 `/adc` → 說明 | 你的平台密碼 |

換區就換另一區的入口，同一組密碼。

---

## 三、運作方式

```text
你在登入欄打平台密碼
      ↓
/api/proxy（Vercel 伺服器）比對 SUPER_KEY：正確？
      ↓ 是
刪除你打的密碼，改為在請求帶上 platformAdmin = true
      ↓
該區 Apps Script：見到 platformAdmin = true 且 Config 的 SUPER_ACCOUNT 非空 → 最高權限
```

| 項目 | 說明 |
| --- | --- |
| 密碼存哪 | 只在 Vercel 環境變數 `SUPER_KEY`（伺服器端 `process.env`） |
| 密碼去向 | 只送到 `/api/proxy`，比對後**立即丟棄**，永遠唔會轉發去 Google |
| 比對方式 | 明文直接比對（`timingSafeEqual` 固定時間比較，不用雜湊） |
| GS 見得到什麼 | 只有 `platformAdmin: true`；Config 內的 `sheep` 只是一個標籤 |
| 區方可否冒用 | 不可以：冇密碼就入唔到；密碼亦永遠唔會落到任何一區 |
| 偽造注入 | 客戶端自行送上的 `platformAdmin` 一律於代理層刪除，只有密碼核對成功才會注入 |
| 各區互通 | 唔會：SKW 的請求帶 SKW 的 apiKey；密碼唔會落到任何一區 |
| 外觀 | 前端零入口、零提示、零字眼，同未加之前一模一樣 |
| 緊急停用 | 改 `SUPER_KEY`（全平台即時失效）；或清空某區 `SUPER_ACCOUNT`（該區失效） |

> ⚠️ 平台密碼等同整個平台的鑰匙：請用長密碼、唔好同其他服務共用、唔好寫在 Google Sheet 或聊天記錄內。

---

## 四、保護 Vercel 帳戶（非常重要）

登入到 Vercel 帳戶 ＝ 睇得到 `SUPER_KEY` 及所有區的 API Key。
所以**「Vercel 帳戶安全」就等於「整個平台安全」**。

### 1. 開啟 2FA（雙重驗證）

2FA ＝ 登入時除密碼外，要多一重證明（驗證器 App 的 6 位數字，或指紋／Face ID 的 passkey）。
就算有人偷到你的 Email／密碼，都入唔到 Vercel。

```text
vercel.com → 右上角頭像 → Account Settings → Authentication
→ Two-Factor Authentication → Enable
```

官方直接連結：`https://vercel.com/account/settings/authentication`

- **Passkey**（推薦，最防釣魚）：按 Passkey → 用指紋／Face ID 登記
- **驗證器 App**：掃 QR Code → 輸入 App 顯示的 6 位數字
  （1Password / Google Authenticator / Microsoft Authenticator / Authy 均可）

⚠️ 開完務必抄低／下載 **備用碼（Recovery Codes）** 收好：換手機或洗機時靠它入返。

### 2. 把 `SUPER_KEY` 標為 Sensitive

Settings → Environment Variables → 編輯 `SUPER_KEY` → 勾選 **Sensitive**。
標記之後，在 Vercel 介面亦**睇唔返**該值（只可覆寫），減少被偷睇螢幕或截圖外洩的風險。

### 3. 定期檢查

- Account Settings → Tokens：刪走唔用／唔認識的 Access Token
- Team Settings → Members：只保留需要的人
- Team Settings → Security & Privacy：可開啟 **Two-Factor Authentication Enforcement**，強制所有成員開啟 2FA

### 4. 唔想開 2FA 的話（最低限度）

- `SUPER_KEY` 用 **20 字以上**隨機密碼（用密碼管理器產生），唔同其他服務共用
- 唔好把 `SUPER_KEY` 寫在 Google Sheet、聊天記錄、電郵或截圖
- 唔好把 Vercel 專案權限分享給唔需要的人

---

## 五、其他

- 平台帳戶只等於「該區最高權限」，仍會走 Apps Script 本身的業務邏輯（批核流程、主考指派模式等），亦只會操作你登入那一個區的資料。
- 登入欄打錯（唔係平台密碼）時，會照舊當作該區 staff/ADC 密鑰處理，所以區秘書嘅日常操作完全不受影響。
- `/api/proxy?...&action=proxyDebug`（診斷用）已收緊為需要 request header `x-dbs-super-key: <SUPER_KEY>`，否則一律 401。

```text
© 2026 Scout System
```

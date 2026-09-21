# 平台帳戶（後備通道）

**定位：平台管理員的後備通道。無入口、無頁面、無按鈕；只在必要時用。**

日常各區照舊：秘書用自己區的 STAFF_TOKEN、ADC 用自己區的 ADC_TOKEN。
平台管理員只需要記住**一組**帳號密碼，就可以在任何一區登入。

---

## 一分鐘理解

```text
帳號名（例如 sheep）  →  寫在各區 Google Sheet 的 Config（只是一個名，區方睇到都無用）
密碼                 →  只在 Vercel 環境變數 SUPER_KEY（唔會傳去 Google、唔會入前端）
```

- **登入方式**：在**該區**正常入口，於密鑰欄輸入 `帳號:密碼`（例：`sheep:你的密碼`）
- 密碼由 Vercel 伺服器直接比對（明文比對，不使用雜湊）；**密碼永遠唔會送到 Google Sheet**
- 核對成功後，Vercel 才在請求帶上 `superAccount`，各區 GS 只核對帳戶名
- 所以：區方最多只會見到「sheep」這個名，**冇密碼一樣登入唔到**，亦永遠拎唔到你的密碼

---

## 一、設定（兩處，各一次）

### 1. Vercel — 只加一個環境變數

```text
SUPER_KEY = 你的平台密碼     ← 建議 20 字以上
```

Settings → Environment Variables → 新增 → Redeploy。
**各區的 STAFF_TOKEN / ADC_TOKEN 不需要放上來**，所以環境變數只有：`SUPER_KEY` + 各區 `DBS_{區碼}_APIKEY`。

### 2. 各區 Google Sheet — 通常唔需要做

貼上新版 GS 模板 / 執行 `setupSystem()` 後，Config 會自動有：

```text
SUPER_ACCOUNT = sheep
```

想改名才需要：選單 → `🏕️ DBS 管理 → 🔐 設定平台帳戶`。

- 清空 `SUPER_ACCOUNT` ＝ **停用此區**的後備通道
- 區方改了自己的 `SUPER_ACCOUNT`，你在該區就要用該區的名字

> 換 `SUPER_KEY` 之後**唔需要**逐區重設（因為 GS 完全冇密碼）—— 改 Vercel 一處即全平台生效。

---

## 二、怎麼用

先選區 → 之後在該區的入口輸入 `帳號:密碼`：

| 想做什麼 | 去哪 | 在那欄輸入 |
| --- | --- | --- |
| 秘書後台（批核／派主考／證書／列印清單／主考名單） | 該區 `/admin` | STAFF_TOKEN = `sheep:你的密碼` |
| ADC 主考審批 | 該區 `/adc` → ADC 審批後台 | ADC 密鑰 = `sheep:你的密碼` |
| ADC 說明文件 | 該區 `/adc` → 說明 | ADC 密鑰 = `sheep:你的密碼` |

換區就換另一區的入口，同一組帳號密碼（只要該區 Config 的 `SUPER_ACCOUNT` 都是 `sheep`）。

---

## 三、安全設計

| 項目 | 做法 |
| --- | --- |
| 密碼存哪 | 只在 Vercel 環境變數 `SUPER_KEY`（伺服器端 `process.env`） |
| 密碼去向 | 只由瀏覽器 POST 到 `/api/proxy`，伺服器比對後**立即丟棄**，唔會轉發去 Google |
| 比對方式 | 明文直接比對（`timingSafeEqual` 固定時間比較），不使用雜湊 |
| 帳號名 | 存在各區 Config（`SUPER_ACCOUNT`）；區方見到都無法使用（冇密碼） |
| 偽造注入 | 客戶端自行送上的 `superAccount` 一律於代理層刪除，只有密碼核對成功才會補上 |
| 暴力破解 | 同一 IP 10 分鐘內 30 次錯誤 → 429；**只影響 `帳號:密碼` 形狀的嘗試，區自己的 token 不受影響** |
| 各區互通 | 唔會：SKW 的請求帶 SKW 的 apiKey，其他區唔通；密碼亦唔會落到任何一區 |
| 唔想俾人知 | 前端零入口、零提示、零字眼；外觀與未加之前完全一樣 |
| 緊急停用 | 改 `SUPER_KEY`（全平台即時失效）；或清空某區 `SUPER_ACCOUNT`（該區失效） |

> ⚠️ 請開啟 Vercel 帳戶的兩步驗證（2FA）並限制成員權限：有 Vercel 專案權限的人可以看到 `SUPER_KEY`。

---

## 四、其他

- 平台帳戶只等於「該區最高權限」，仍會走 Apps Script 本身的業務邏輯（批核流程、主考指派模式等），亦只會操作你登入那一個區的資料。
- `/api/proxy?...&action=proxyDebug`（診斷用）已收緊為需要 request header `x-dbs-super-key: <SUPER_KEY>`，否則一律 401。
- 如果覺得 `sheep:密碼` 打在同一個欄不方便，可以改成兩個欄（帳號 / 密碼），但會在前端多一格、較易被留意；現時做法係零外觀改動。

```text
© 2026 Scout System
```

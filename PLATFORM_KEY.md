# 平台帳戶（後備通道）

平台管理員的後備通道，只在必要時用。
各區日常照舊：秘書用自己區的 STAFF_TOKEN、ADC 用自己區的 ADC_TOKEN。

---

## (1) 一句話

> 在該區的登入欄，**直接打你設在 Vercel 的 `SUPER_KEY`** 就得。

不用打帳號、不用任何前綴。

---

## (2) 設定

就兩步，而且第 2 步通常唔需要做：

### 2-1　Vercel

```text
SUPER_KEY = 你的平台密碼
```

Settings → Environment Variables → 新增 → Redeploy。
各區的 STAFF_TOKEN / ADC_TOKEN **不需要**放上來。

### 2-2　各區 Google Sheet

**通常唔需要做。** 貼上新 GS 模板 / 跑 `setupSystem()` 後，Config 會自動有一行：

```text
SUPER_ACCOUNT = sheep     ← 只是一個標籤，Config 內冇、亦唔應該有密碼
```

- 想改名 → 選單 `🏕️ DBS 管理 → 🔐 設定平台帳戶標籤`
- 想停用某區 → 清空該格（唔建議）

---

## (3) 怎麼用

先選區 → 在該區入口那一格輸入平台密碼：

| 想做什麼 | 去哪 | 輸入 |
| --- | --- | --- |
| 秘書後台（批核／派主考／證書／列印清單） | 該區 `/admin` | 你的平台密碼 |
| ADC 主考審批 | 該區 `/adc` | 你的平台密碼 |

換區就換另一區入口，同一組密碼。

---

## (4) 運作方式

```text
你打平台密碼
   ↓
/api/proxy（Vercel）比對 SUPER_KEY：對？
   ↓ 對
丟掉你打的密碼，改為在請求帶上 platformAdmin = true
   ↓
該區 Apps Script 見到 platformAdmin + Config 有 SUPER_ACCOUNT → 最高權限
```

- 密碼只存在 Vercel 環境變數，**唔會傳去 Google**，各區永遠見唔到
- 區方見到 `sheep` 呢個標籤都無用，冇密碼入唔到
- 換 `SUPER_KEY` 唔需要逐區重設，改 Vercel 一處即全平台生效

---

## (5) 幾點提醒

- 平台密碼用長一點（20 字以上）、唔好同其他服務共用就夠；唔好寫在 Google Sheet 或群組訊息。
- 有 Vercel 專案權限的人睇得到 `SUPER_KEY`，所以 Vercel 帳戶只加自己人。
- 登入欄打錯（唔係平台密碼）時，會照舊當係該區 staff / ADC 密鑰，所以區秘書日常操作完全不受影響。
- `/api/proxy?...&action=proxyDebug`（診斷用）已改為需要 header `x-dbs-super-key: <SUPER_KEY>`，否則 401。

```text
© 2026 Scout System
```

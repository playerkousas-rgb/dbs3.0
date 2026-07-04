# Google Apps Script 模板

本資料夾包含 DBS 3.0 多區版的 Google Apps Script 模板：

```text
gs/DBS_3_0_MULTI_DISTRICT.gs
```

平台由 **Scout System** 以中立第三方身份維護；筲箕灣區是首個已接入及實際使用地區。

## 使用方式

1. 建立空白 Google Sheet
2. 開啟 Extensions → Apps Script
3. 貼上此檔內容
4. 執行：

```javascript
setupSystem()
```

5. 回到 Sheet 的 `Config` 工作表，填寫：
   - `DISTRICT_CODE`
   - `DISTRICT_NAME`
   - `EMAIL_REPLY_TO`
   - `ADC_EMAIL`
   - `FRONTEND_URL`
   - `STAFF_TOKEN`
   - `ADC_TOKEN`
   - `EXAMINER_ASSIGNMENT_MODE`（可稍後在秘書後台一鍵切換）
6. Deploy 為 Web App
7. 測試：

```text
https://script.google.com/macros/s/.../exec?action=getHealthCheck
```

## 主考指派模式

- `GROUP_PRIORITY`：同旅 G 旅團主考優先；沒有合適 G 時才派 D 區主考。
- `DISTRICT_PRIORITY`：只用 D 區主考（公平模式）；D 主考即使與考生同旅團亦可獲派。
- `NO_SAME_GROUP`：同旅團不能擔任主考；所有具該章資格的主考隨機，但排除與考生同旅團者。

設定位置：`Config → EXAMINER_ASSIGNMENT_MODE`，或前端「秘書後台 → ⚖️ 主考機制」。

## 說明

- 每區各自擁有獨立 Sheet / Script / 資料
- 前端平台則由 `lib/district.ts` 做區碼 mapping
- 所有 email links 會帶 `d=` 區碼，方便使用者從 email 直接回到對應地區前端

## 固定版權

```text
© 2026 Scout System
```

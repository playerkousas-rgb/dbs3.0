# Google Apps Script 模板

本資料夾包含 DBS 3.0 多區版的 Google Apps Script 模板：

```text
gs/DBS_3_0_MULTI_DISTRICT.gs
```

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
6. Deploy 為 Web App
7. 測試：

```text
https://script.google.com/macros/s/.../exec?action=getHealthCheck
```

## 說明

- 每區各自擁有獨立 Sheet / Script / 資料
- 前端平台則由 `lib/district.ts` 做區碼 mapping
- 所有 email links 會帶 `d=` 區碼，方便使用者從 email 直接回到對應地區前端

## 固定版權

```text
© 2026 SKWSCOUT SYSTEM
```

# DBS 3.0 多區版

DBS 3.0 多區版是 **SKWSCOUT SYSTEM** 建立的多區專科徽章平台。

- 前端：Next.js
- 區資料庫：Google Sheet
- 區後端：Google Apps Script
- 模式：**統一前端 + 各區獨立 Apps Script backend**

## 固定版權

```text
© 2026 SKWSCOUT SYSTEM
```

此項固定保留，不交由各區自行改動。

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
5. 填寫 Config
6. Deploy 為 Web App
7. 測試：
   ```text
   ?action=getHealthCheck
   ```
8. 到前端 `/onboard` 提交 URL

---

## District Mapping

前端 district mapping 位於：

```text
lib/district.ts
```

目前示例已接入：

- `SKW` → 筲箕灣區

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
- email links 自動帶 `d=`
- Application ID / 證書編號按區碼生成

---

## 重要注意

- 前端版權固定保留 `© 2026 SKWSCOUT SYSTEM`
- 各區自行維護本區 Sheet / Script / 主考 / 群組資料
- 若有新章更新，可另行提供 patch function，不一定要整份重貼

---

## 作者 / 維護

```text
SKWSCOUT SYSTEM
© 2026 SKWSCOUT SYSTEM
```

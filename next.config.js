/** @type {import('next').NextConfig} */
const nextConfig = {
  // ⚠️ 請勿啟用 output: 'export'
  // 本專案需要 app/api/proxy（在伺服器端注入 DBS_*_APIKEY / SUPER_KEY），
  // 而 Next.js 靜態匯出不支援 Route Handler，啟用後 build 會失敗：
  //   `export const dynamic = "force-dynamic" on page "/api/proxy" cannot be used with "output: export"`
  // 除此之外所有頁面已預先靜態化（next build 顯示 ○ Static），由 CDN 直接提供，不耗 Function CPU。

  // 圖片最佳化會額外產生 Serverless Function；本專案未使用 next/image 最佳化，關閉以節省用量。
  images: { unoptimized: true },

  // 不在回應標頭洩露框架版本
  poweredByHeader: false,
};

module.exports = nextConfig;

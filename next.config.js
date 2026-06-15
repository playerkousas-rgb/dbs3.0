/** @type {import('next').NextConfig} */
const nextConfig = {
  // 移除 output: 'export' — 因為動態路由 + Client-side data fetching 需要 SSR
  // output: 'export',
  
  // 註解掉或刪除下面這行，讓它恢復預設的 .next 資料夾
  // distDir: 'dist', 
  
  images: { unoptimized: true }
};

module.exports = nextConfig;

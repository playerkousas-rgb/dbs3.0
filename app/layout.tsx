import { Suspense } from 'react';
import DistrictShell from '@/components/DistrictShell';

export const metadata = {
  title: 'DBS 3.0 多區專科徽章平台',
  description: 'SKWSCOUT SYSTEM multi-district badge platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', background: '#f5f5f5' }}>
        <Suspense fallback={<main style={{ maxWidth: '1040px', margin: '0 auto', padding: '24px' }}>載入中...</main>}>
          <DistrictShell>{children}</DistrictShell>
        </Suspense>
      </body>
    </html>
  );
}

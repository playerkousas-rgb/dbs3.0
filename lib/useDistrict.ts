'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  DistrictCode,
  getDistrictInfo,
  getStoredDistrictCode,
  isDistrictCode,
  setStoredDistrictCode,
  withDistrictParam,
} from './district';

export function useDistrict() {
  const searchParams = useSearchParams();
  const [storedCode, setStoredCode] = useState<DistrictCode | null>(null);

  useEffect(() => {
    const queryCode = searchParams.get('d');
    if (isDistrictCode(queryCode)) {
      setStoredDistrictCode(queryCode);
      setStoredCode(queryCode);
      return;
    }
    setStoredCode(getStoredDistrictCode());
  }, [searchParams]);

  const districtCode = useMemo(() => {
    const queryCode = searchParams.get('d');
    if (isDistrictCode(queryCode)) return queryCode;
    return storedCode;
  }, [searchParams, storedCode]);

  const district = useMemo(() => getDistrictInfo(districtCode), [districtCode]);

  return {
    districtCode,
    district,
    hasDistrict: !!districtCode,
    withDistrict: (path: string) => withDistrictParam(path, districtCode),
  };
}

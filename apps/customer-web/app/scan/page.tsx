'use client';

import React from 'react';
import { HandoverQrView } from '../../components/HandoverQrView';

export default function WaybillScannerPage() {
  return <HandoverQrView initialMode="scan" />;
}


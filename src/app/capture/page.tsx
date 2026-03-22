import { Suspense } from 'react';
import CaptureClient from './CaptureClient';

export default function CapturePage() {
  return (
    <Suspense>
      <CaptureClient />
    </Suspense>
  );
}

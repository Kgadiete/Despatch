import { Suspense } from 'react';
import TruckClient from './TruckClient';

export default function TruckPage() {
  return (
    <Suspense>
      <TruckClient />
    </Suspense>
  );
}

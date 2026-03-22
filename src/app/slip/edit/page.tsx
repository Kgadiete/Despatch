import { Suspense } from 'react';
import EditClient from './EditClient';

export default function EditSlipPage() {
  return (
    <Suspense>
      <EditClient />
    </Suspense>
  );
}

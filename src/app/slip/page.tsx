import { Suspense } from 'react';
import SlipClient from './SlipClient';

export default function SlipPage() {
  return (
    <Suspense>
      <SlipClient />
    </Suspense>
  );
}

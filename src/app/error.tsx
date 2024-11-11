'use client'; // Error components must be Client Components

import * as React from 'react';
import { RiAlarmWarningFill } from 'react-icons/ri';

export default function Error({
  error,
}: {
  error: Error & { digest?: string };
}) {
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <main className='h-full'>
      <section className='h-full'>
        <div className='layout flex flex-col h-full items-center justify-center text-center text-white'>
          <RiAlarmWarningFill
            size={60}
            className='drop-shadow-glow animate-flicker text-red-500'
          />
          <h1 className='mt-8 mb-8 text-4xl md:text-6xl'>
            Something went wrong.
          </h1>
        </div>
      </section>
    </main>
  );
}

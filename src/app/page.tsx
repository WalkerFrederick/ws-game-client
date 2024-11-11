'use client';

import Head from 'next/head';
import * as React from 'react';
import '@/lib/env';

import TailwindHero from '@/components/hero/TailwindHero';

export default function HomePage() {
  return (
    <main className='h-full'>
      <Head>
        <title>Realm Champions</title>
      </Head>
      <section className='h-full'>
        <div className=' h-full relative flex flex-col items-center justify-center text-center'>
          <TailwindHero />
        </div>
      </section>
    </main>
  );
}

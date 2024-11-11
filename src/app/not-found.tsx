import { Metadata } from 'next';
import * as React from 'react';
import { RiAlarmWarningFill } from 'react-icons/ri';

export const metadata: Metadata = {
  title: 'Not Found',
};

export default function NotFound() {
  return (
    <main className='h-full'>
      <section className='h-full'>
        <div className='layout flex flex-col h-full items-center justify-center text-center text-white'>
          <RiAlarmWarningFill
            size={60}
            className='drop-shadow-glow animate-flicker text-red-500'
          />
          <h1 className='mt-8 mb-8 text-4xl md:text-6xl'>Page Not Found</h1>
          <a
            href='/'
            className='rounded-md bg-slate-600 px-6 py-4 text-xl font-semibold text-white shadow-sm hover:bg-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600'
          >
            HOME
          </a>
        </div>
      </section>
    </main>
  );
}

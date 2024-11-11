'use client';

import RealmChampsLogo from '@/components/svg/RealmChampsLogo';

export default function TailwindHeader() {
  return (
    <header className='absolute z-40 w-full border-b bg-slate-800 border-black '>
      <nav
        aria-label='Global'
        className='mx-auto flex max-w-7xl items-center justify-center p-6 lg:px-8'
      >
        <div className='absolute top-0'>
          <a href='/' className=''>
            <div className='w-36 mt-3'>
              <RealmChampsLogo />
            </div>
          </a>
        </div>
      </nav>
    </header>
  );
}
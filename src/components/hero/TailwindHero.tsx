'use client';

export default function TailwindHero() {
  return (
    <div className=''>
      <div className='relative isolate px-6 lg:px-8'>
        <div className='sm:py-18 lg:py-18 mx-auto max-w-2xl py-16'>
          <div className='text-center'>
            <h1 className='text-4xl font-bold tracking-tight text-white sm:text-6xl'>
              Realm Champions
            </h1>
            <p className='mt-6 text-lg leading-8 text-white'>
              It's a prototype!
            </p>
            <div className='mt-10 flex items-center justify-center gap-x-6'>
              <a
                href='/playgame'
                className='shadow rounded-md bg-indigo-600 px-6 py-4 text-xl font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
              >
                PLAY NOW
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

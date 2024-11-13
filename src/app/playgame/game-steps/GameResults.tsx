import { Player } from "@/app/playgame/types";

export function GameResultsUi(props: { winner?: Player }) {
  return (
    <>
      <h1 className='text-4xl md:text-7xl'>{props.winner && 'Winner!'}</h1>

      <div className='relative shadow bg-white rounded-md border-slate-900 border-4 my-4 mb-8'>
        <input
          disabled={true}
          tabIndex={-1}
          value={props?.winner?.username ?? ''}
          readOnly
          placeholder='TIE'
          className='text-center font-bold text-xl text-bold block w-full rounded-md border-0 py-4 text-gray-900 placeholder:text-gray-400'
        />
      </div>

      <button
        onClick={() => {
          window.location.reload();
        }}
        className='shadow rounded-md bg-indigo-600 px-6 py-4 text-xl font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
      >
        Play Again?
      </button>
    </>
  );
}

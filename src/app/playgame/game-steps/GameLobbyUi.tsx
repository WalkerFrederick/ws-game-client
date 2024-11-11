import { useEffect, useState } from 'react';

import { ButtonSpinner } from '@/components/ButtonSpinner';

interface GameLobbyUiProps {
  Player1: {
    name: string;
    ready: boolean;
  };
  Player2: {
    name: string;
    ready: boolean;
  };
  localPlayer: string;
  LobbyCode: string;
  onReady: () => void;
}

export function GameLobbyUi(props: GameLobbyUiProps) {
  const [localPlayerReady, setLocalPlayerReady] = useState<boolean>(false);

  const handleOnReady = () => {
    props.onReady();
  };

  useEffect(() => {
    if (props.Player1.ready && props.Player1.name === props.localPlayer) {
      setLocalPlayerReady(true);
    } else if (
      props.Player2.ready &&
      props.Player2.name === props.localPlayer
    ) {
      setLocalPlayerReady(true);
    } else {
      setLocalPlayerReady(false);
    }
  }, [props.Player1, props.Player2, props.localPlayer]);

  return (
    <>
      <div className='relative shadow bg-white rounded-md border-indigo-500 border-4 mb-2'>
        <div className='absolute top-[-47%] w-full flex justify-center'>
          <div className='bg-indigo-500 w-[60%] text-sm py-1 font-bold'>
            LOBBY CODE
          </div>
        </div>
        <input
          disabled={true}
          tabIndex={-1}
          value={props.LobbyCode}
          readOnly
          placeholder='undefined'
          className='text-center font-bold text-2xl text-bold block w-full rounded-md border-0 py-4 text-gray-900 placeholder:text-gray-400'
        />
      </div>
      <div className='w-full flex flex-col-reverse md:flex-row justify-center items-center my-12'>
        <div className='relative shadow bg-white rounded-md border-slate-900 border-4'>
          <div className='absolute top-[-47%] z-10 w-full flex justify-center'>
            <div
              className={`${
                props.Player1?.ready ? 'bg-green-500' : 'bg-red-500'
              } border-black border-4 rounded-t-md w-[60%] text-sm py-1 font-bold`}
            >
              {props.Player1?.ready ? 'READY' : 'NOT READY'}
            </div>
          </div>
          <input
            disabled={true}
            tabIndex={-1}
            value={props.Player1?.name ?? ''}
            readOnly
            placeholder='Waiting...'
            className='relative z-20 text-center font-bold text-xl text-bold block w-full rounded-md border-0 py-4 text-gray-900 placeholder:text-gray-400'
          />
        </div>
        <h1 className='px-6 py-4 pb-8 md:py-0 text-2xl md:text-8xl font-bold'>
          VS
        </h1>
        <div className='relative shadow bg-white rounded-md border-slate-900 border-4'>
          <div className='absolute top-[-47%] z-10 w-full flex justify-center'>
            <div
              className={`${
                props.Player2?.ready ? 'bg-green-500' : 'bg-red-500'
              } border-black border-4 rounded-t-md w-[60%] text-sm py-1 font-bold`}
            >
              {props.Player2?.ready ? 'READY' : 'NOT READY'}
            </div>
          </div>
          <input
            disabled={true}
            tabIndex={-1}
            value={props.Player2?.name ?? ''}
            readOnly
            placeholder='Waiting...'
            className='relative z-20 text-center font-bold text-xl text-bold block w-full rounded-md border-0 py-4 text-gray-900 placeholder:text-gray-400'
          />
        </div>
      </div>
      {props.Player1?.name.length === 0 || props.Player2?.name.length === 0 ? (
        <></>
      ) : (
        <>
          <button
            disabled={
              props.Player1?.name.length === 0 ||
              props.Player2?.name.length === 0
            }
            onClick={() => {
              handleOnReady();
            }}
            className='shadow rounded-md bg-indigo-600 px-6 py-4 text-xl font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
          >
            {localPlayerReady ||
            props.Player1?.name.length === 0 ||
            props.Player2?.name.length === 0 ? (
              <ButtonSpinner />
            ) : (
              'Ready?'
            )}
          </button>
        </>
      )}
    </>
  );
}

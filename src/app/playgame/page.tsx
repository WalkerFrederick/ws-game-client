'use client';

import { useSearchParams } from 'next/navigation';
import * as React from 'react';
import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import '@/lib/env';

import { useNotification } from '@/hooks/useNotification';
import { useOverlay } from '@/hooks/useOverlay';

import Notification from '@/components/notification';
import Overlay from '@/components/Overlay';
import RealmChampsLogo from '@/components/svg/RealmChampsLogo';

import { ConnectingToServerUi } from '@/app/playgame/game-steps/ConnectingToServerUi';
import { ConnectToLobbyFormUi } from '@/app/playgame/game-steps/ConnectToLobbyFormUi';
import { GameLobbyUi } from '@/app/playgame/game-steps/GameLobbyUi';
import { GameResultsUi } from '@/app/playgame/game-steps/GameResults';
import { GeneralErrorUi } from '@/app/playgame/game-steps/GeneralErrorUi';
let socket: any;

enum uiSteps {
  CONNECTING_TO_SERVER = 'CONNECTING_TO_SERVER',
  CONNECT_TO_LOBBY_FORM = 'CONNECT_TO_LOBBY_FORM',
  GAME_LOBBY = 'GAME_LOBBY',
  GAME = 'GAME',
  GAME_RESULTS = 'GAME_RESULTS',
  GENERAL_ERROR = 'GENERAL_ERROR',
}

interface Player {
  id: string;
  username: string;
  choice: choice; // Player's choice in the current round
  score: number; // Player's current score
  isReady: boolean; // Status indicating if the player is ready to start
  disconnected: boolean; // Indicates if player is currently disconnected
  reconnectTimeout?: NodeJS.Timeout | null; // Timer for reconnection countdown
}

type choice = 'rock' | 'paper' | 'scissors' | null;

type LatestResultType = {
  player1?: {
    id: string;
    choice: choice;
    score: number;
    isLocalPlayer?: boolean;
    wonRound: boolean;
  };
  player2?: {
    id: string;
    choice: choice;
    score: number;
    isLocalPlayer?: boolean;
    wonRound: boolean;
  };
};

interface Game {
  players: Player[]; // List of players in the game
  round: number; // Current round number
  timer: NodeJS.Timeout | null; // Timer for round timeouts
  isStarted: boolean; // Indicates if the game has started
  isPaused: boolean; // Indicates if the game is paused (e.g., due to disconnection)
  name: string;
  winner?: string;
}

export default function PlayGamePage() {
  //see if url has lobby and or name
  const searchParams = useSearchParams();
  const lobbySearchParam = searchParams.get('lobby') ?? '';
  const nameSearchParam = searchParams.get('name') ?? '';

  const { notification, showNotification, hideNotification } =
    useNotification();
  const { isOverlayVisible, showOverlay, hideOverlay } = useOverlay();

  const [uiStep, setUiStep] = useState<uiSteps>(uiSteps.CONNECTING_TO_SERVER);
  const [generalError, setGeneralError] = useState<string>(
    'Something Went Wrong!'
  );
  const [gameState, setGameState] = useState<Game | undefined>();

  const [matchStartTimer, setMatchStartTimer] = useState<number>(0);
  const [roundTimer, setRoundTimer] = useState<number>(0);
  const [roundBufferTimer, setRoundBufferTimer] = useState<number>(0);
  const [reconnectTimer, setReconnectTimer] = useState<number>(0);

  const [localPlayerUsername, setLocalPlayerUsername] = useState<string>('');
  const [choiceLocked, setChoiceLocked] = useState<boolean>(false);
  const [latestResult, setLatestResult] = useState<LatestResultType | null>();

  useEffect(() => {
    //connection buffer to add slight delay to connection message.
    let needConnectionBuffer = true;
    setTimeout(() => {
      needConnectionBuffer = false;
    }, 500);

    // Initialize socket connection
    socket = io('192.168.50.202:8080', {
      timeout: 3000,
      reconnection: true,
      reconnectionAttempts: 2, // Maximum number of reconnection attempts
    });

    socket.on('connect', () => {
      if (needConnectionBuffer) {
        setTimeout(() => {
          setUiStep(uiSteps.CONNECT_TO_LOBBY_FORM);
        }, 500);
      } else {
        setUiStep(uiSteps.CONNECT_TO_LOBBY_FORM);
      }
    });

    socket.io.on('reconnect_failed', () => {
      setGeneralError('No Connection To Server');
      setUiStep(uiSteps.GENERAL_ERROR);
    });

    socket.on('server:notification', (msg: any) => {
      console.log('server:notification', msg);
      showNotification(msg.message, msg.type);
    });

    socket.on('server:waiting-for-players', (game: Game) => {
      console.log('server:waiting-for-players', game);
      hideOverlay();
      setGameState(game);
      setUiStep(uiSteps.GAME_LOBBY);
    });

    socket.on('server:player-reconnected', (game: Game) => {
      console.log('server:player-reconnected', game);
      hideOverlay();
      setGameState(game);
      if (game.isStarted) {
        setUiStep(uiSteps.GAME);
      }
    });

    socket.on('server:waiting-for-ready', (game: Game) => {
      setGameState(game);
      console.log('server:waiting-for-ready', game);
    });

    socket.on('server:player-ready-status', (game: Game) => {
      console.log('server:player-ready-status', game);
      setGameState(game);
    });

    socket.on('server:countdown', (msg: any) => {
      showOverlay();
      console.log('server:countdown', msg);
      setMatchStartTimer(msg.countdown);
    });

    socket.on('server:start-round', (msg: any) => {
      console.log('server:start-round', msg);
      setChoiceLocked(false);
    });

    socket.on('server:round-countdown', (msg: any) => {
      console.log('server:round-countdown', msg);
      setRoundTimer(msg.countdown);
    });

    socket.on('server:round-result', (msg: LatestResultType) => {
      console.log('server:round-result', msg);
      if (msg.player1 && msg.player2) {
        if (msg.player1?.id === socket.id) msg.player1.isLocalPlayer = true;
        if (msg.player2?.id === socket.id) msg.player2.isLocalPlayer = true;
        setLatestResult(msg);
      }
    });

    socket.on('server:round-end-timer', (msg: any) => {
      console.log('server:round-end-timer', msg);
      setRoundBufferTimer(msg.countdown);
    });

    socket.on('server:game-over', (game: Game) => {
      console.log('server:game-over', game);
      setGameState(game);
      hideOverlay();
      setUiStep(uiSteps.GAME_RESULTS);
    });

    socket.on('server:reconnect-timer', (msg: any) => {
      console.log('server:reconnect-timer', msg);
      setReconnectTimer(msg.countdown);
      showOverlay();
    });

    socket.on('server:player-disconnected', (game: Game) => {
      console.log('server:player-disconnected', game);
      setGameState(game);
    });

    socket.on('server:game-countdown-starting', (msg: any) => {
      console.log('server:game-countdown-starting', msg);
    });

    socket.on('server:game-starting', (msg: any) => {
      console.log('server:game-starting', msg);
      hideOverlay();
      setUiStep(uiSteps.GAME);
    });

    // Clean up the socket connection when component unmounts
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [hideOverlay, showNotification, showOverlay]);

  const connectToLobby = (event: any) => {
    event.preventDefault();
    const target = event.target as typeof event.target & {
      name: { value: string };
      lobby: { value: string };
    };
    const data = {
      username: target.name.value,
      gameId: target.lobby.value,
    };
    setLocalPlayerUsername(data.username);
    socket.emit('client:join-game', data);
  };

  const sendReady = () => {
    const data = {
      gameId: gameState?.name,
    };
    socket.emit('client:player-ready', data);
  };

  const sendConcede = () => {
    const data = {
      gameId: gameState?.name,
    };
    socket.emit('client:concede', data);
  };

  const sendChoice = (choice: choice) => {
    setChoiceLocked(true);
    const data = {
      gameId: gameState?.name,
      choice: choice,
    };
    socket.emit('client:make-choice', data);
  };

  const uiStepComponents = (step: uiSteps) => {
    const componentMap = {
      [uiSteps.CONNECTING_TO_SERVER]: <ConnectingToServerUi />,
      [uiSteps.CONNECT_TO_LOBBY_FORM]: (
        <ConnectToLobbyFormUi
          showNotification={showNotification}
          defualtValues={{ name: nameSearchParam, lobby: lobbySearchParam }}
          onSubmit={(event) => {
            connectToLobby(event);
          }}
        />
      ),
      [uiSteps.GAME_LOBBY]: (
        <GameLobbyUi
          localPlayer={localPlayerUsername}
          Player1={{
            name: gameState?.players[0]?.username ?? '',
            ready: gameState?.players[0]?.isReady ?? false,
          }}
          Player2={{
            name: gameState?.players[1]?.username ?? '',
            ready: gameState?.players[1]?.isReady ?? false,
          }}
          LobbyCode={gameState?.name ?? ''}
          onReady={() => sendReady()}
        />
      ),
      [uiSteps.GAME]: (
        <GameUi
          sendConcede={() => sendConcede()}
          sendChoice={(choice) => {
            sendChoice(choice);
          }}
          roundTimer={roundTimer}
          roundBufferTimer={roundBufferTimer}
          choiceLocked={choiceLocked}
          latestResult={latestResult ?? null}
          localPlayerUsername={localPlayerUsername}
        />
      ),
      [uiSteps.GAME_RESULTS]: (
        <GameResultsUi winner={gameState?.winner ?? ''} />
      ),
      [uiSteps.GENERAL_ERROR]: <GeneralErrorUi message={generalError} />,
    };
    return componentMap[step];
  };

  return (
    <main>
      <section className=''>
        <div className='absolute top-0 bottom-0 left-0 right-0 flex flex-col items-center justify-center text-center'>
          {uiStepComponents(uiStep)}
          <div className='absolute top-[12%] w-full flex justify-center'>
            {notification && (
              <Notification
                message={notification.message}
                type={notification.type}
                onClose={hideNotification}
              />
            )}
            <Overlay
              disableClose
              isVisible={isOverlayVisible}
              onClose={hideOverlay}
            >
              {gameState?.isPaused && uiStep === uiSteps.GAME && (
                <>
                  <div>
                    <h1>PAUSED</h1>
                    <h3 className='font-light my-4'>
                      Opponent has {reconnectTimer} seconds to reconnect...
                    </h3>
                  </div>
                </>
              )}
              {uiStep === uiSteps.GAME_LOBBY && (
                <>
                  <div>
                    <h1 className='font-bold text-9xl'>{matchStartTimer}</h1>
                  </div>
                </>
              )}
            </Overlay>
          </div>
        </div>
      </section>
    </main>
  );
}

interface GameUiProps {
  sendConcede: () => void;
  sendChoice: (arg: choice) => void;
  roundTimer: number;
  roundBufferTimer: number;
  choiceLocked: boolean;
  latestResult: LatestResultType | null;
  localPlayerUsername: string;
}

export function GameUi(props: GameUiProps) {
  const [abilitiesOverlayVisible, setAbilitiesOverlayVisible] =
    useState<boolean>(false);
  const [itemsOverlayVisible, setItemsOverlayVisible] =
    useState<boolean>(false);
  const [championsOverlayVisible, setChampionsOverlayVisible] =
    useState<boolean>(false);
  const [settingsOverlayVisible, setSettingsOverlayVisible] =
    useState<boolean>(false);

  const [choice, setChoice] = useState<choice>(null);
  const [showResults, setShowResults] = useState<boolean>(false);

  useEffect(() => {
    console.log('latest result updated!', props.latestResult);
    if (props.latestResult) {
      setShowResults(true);
      setTimeout(() => {
        setShowResults(false);
      }, 4000);
    }
  }, [props.latestResult]);

  const closeAllOverlay = () => {
    setAbilitiesOverlayVisible(false);
    setItemsOverlayVisible(false);
    setChampionsOverlayVisible(false);
    setSettingsOverlayVisible(false);
  };

  const submitChoice = () => {
    closeAllOverlay();
    props.sendChoice(choice);
  };

  const abilitiesOverlay = () => {
    return (
      <Overlay
        isVisible={abilitiesOverlayVisible}
        onClose={() => closeAllOverlay()}
      >
        <div className='flex-col justify-center'>
          <div className=' border-white flex gap-3'>
            <button
              onClick={() => {
                setChoice('rock');
              }}
              className={`relative h-48 w-36 bg-white text-black hover:bg-neutral-200 hover:bottom-1 rounded ocus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500 border-4 ${choice === 'rock' && ' border-sky-700'
                }`}
            >
              ROCK
            </button>
            <button
              onClick={() => {
                setChoice('paper');
              }}
              className={`relative h-48 w-36 bg-white text-black hover:bg-neutral-200 hover:bottom-1 rounded ocus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500 border-4 ${choice === 'paper' && ' border-sky-700'
                }`}
            >
              PAPER
            </button>
            <button
              onClick={() => {
                setChoice('scissors');
              }}
              className={`relative h-48 w-36 bg-white text-black hover:bg-neutral-200 hover:bottom-1 rounded ocus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500 border-4 ${choice === 'scissors' && ' border-sky-700'
                }`}
            >
              SCISSORS
            </button>
          </div>
          <button
            disabled={props.choiceLocked || choice === null}
            onClick={() => {
              submitChoice();
            }}
            className='w-full shadow rounded-md bg-sky-600 disabled:bg-neutral-500 px-6 py-4 mb-4 mt-4 text-xl font-semibold text-white hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500'
          >
            Play Selected Card
          </button>
          <button
            onClick={() => {
              closeAllOverlay();
            }}
            className='w-full shadow rounded-md bg-red-600 px-6 py-4 mb-4 text-xl font-semibold text-white hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500'
          >
            Close Menu [ESC]
          </button>
        </div>
      </Overlay>
    );
  };

  const itemsOverlay = () => {
    return (
      <Overlay
        isVisible={itemsOverlayVisible}
        onClose={() => closeAllOverlay()}
      >
        <h1>ITEMS COMING SOON</h1>
      </Overlay>
    );
  };

  const championsOverlay = () => {
    return (
      <Overlay
        isVisible={championsOverlayVisible}
        onClose={() => closeAllOverlay()}
      >
        <h1>CHAMPS COMING SOON</h1>
      </Overlay>
    );
  };

  const settingsOverlay = () => {
    return (
      <Overlay
        isVisible={settingsOverlayVisible}
        onClose={() => closeAllOverlay()}
      >
        <div className='w-full max-w-[600px] bg-white p-6 shadow-xl rounded-md flex flex-col items-center'>
          <div className='w-[30%] mb-8'>
            <RealmChampsLogo />
          </div>
          <button className='w-full shadow rounded-md bg-neutral-400 px-6 py-4 mb-4 text-xl font-semibold text-white hover:bg-neutral-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500'>
            Coming Soon
          </button>
          <button className='w-full shadow rounded-md bg-neutral-400 px-6 py-4 mb-4 text-xl font-semibold text-white hover:bg-neutral-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500'>
            Coming Soon
          </button>
          <button
            onClick={() => {
              props.sendConcede();
            }}
            className='w-full shadow rounded-md bg-red-600 px-6 py-4 mb-4 text-xl font-semibold text-white hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500'
          >
            Concede Match
          </button>
          <div className='h-[1px] bg-neutral-400 w-full mb-4' />
          <button
            onClick={() => {
              closeAllOverlay();
            }}
            className='w-full shadow rounded-md bg-neutral-900 px-6 py-4 text-xl font-semibold text-white hover:bg-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500'
          >
            Close Menu [ESC]
          </button>
        </div>
      </Overlay>
    );
  };

  return (
    <div className='absolute top-0 bottom-0 left-0 right-0 flex justify-center items-center'>
      {abilitiesOverlay()}
      {itemsOverlay()}
      {championsOverlay()}
      {settingsOverlay()}
      <div className='absolute top-10 px-10 w-full h-24 flex justify-center items-center'>
        <div className='hidden h-full min-w-[15%] bg-white shadow rounded-md border-4 border-black'></div>
        <div className='h-full min-w-[50%] bg-white shadow rounded-md border-4 border-black mx-4'></div>
        <div className='hidden h-full min-w-[15%] bg-white shadow rounded-md border-4 border-black'></div>
      </div>
      <div>
        {!showResults && !props.choiceLocked && (
          <>
            <h3 className='mb-4'>CHOOSE YOUR CARD</h3>
          </>
        )}
        {!showResults && props.choiceLocked && (
          <>
            <h3 className='mb-4'>WAITING FOR OPPONENT...</h3>
          </>
        )}
        {props.latestResult && showResults && (
          <>
            <div className='flex justify-center gap-4'>
              <div className='relative flex flex-col justify-center items-center'>
                {props.latestResult?.player1?.wonRound && (
                  <>
                    <div className='absolute z-10 top-10 -left-3 bg-amber-500 rounded-full h-8 w-8 p-2'>
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        viewBox='0 0 128 122'
                        fill='none'
                      >
                        <path
                          d='M64 0L79.0424 46.2959H127.721L88.3392 74.9083L103.382 121.204L64 92.5917L24.6184 121.204L39.6608 74.9083L0.279213 46.2959H48.9576L64 0Z'
                          fill='white'
                        />
                      </svg>
                    </div>
                  </>
                )}
                <h3 className='mb-4'>
                  {props.latestResult?.player1?.isLocalPlayer
                    ? 'YOU'
                    : 'OPPONENT'}
                  ({props.latestResult?.player1?.score})
                </h3>
                <button
                  disabled
                  tabIndex={-1}
                  className='relative h-48 w-36 bg-white text-black rounded ocus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500 border-4'
                >
                  {props.latestResult?.player1?.choice}
                </button>
              </div>
              <div className='relative flex flex-col justify-center items-center'>
                {props.latestResult?.player2?.wonRound && (
                  <>
                    <div className='absolute z-10 top-10 -left-3 bg-amber-500 rounded-full h-8 w-8 p-2'>
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        viewBox='0 0 128 122'
                        fill='none'
                      >
                        <path
                          d='M64 0L79.0424 46.2959H127.721L88.3392 74.9083L103.382 121.204L64 92.5917L24.6184 121.204L39.6608 74.9083L0.279213 46.2959H48.9576L64 0Z'
                          fill='white'
                        />
                      </svg>
                    </div>
                  </>
                )}
                <h3 className='mb-4'>
                  {props.latestResult?.player2?.isLocalPlayer
                    ? 'YOU'
                    : 'OPPONENT'}
                  ({props.latestResult?.player2?.score})
                </h3>
                <button
                  disabled
                  tabIndex={-1}
                  className='relative h-48 w-36 bg-white text-black rounded ocus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500 border-4'
                >
                  {props.latestResult?.player2?.choice}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      <div className='absolute bottom-12 px-10 w-full h-48 flex justify-center items-center'>
        <div className='hidden min-w-[15%] h-24 bg-white shadow rounded-md border-4 border-black'></div>
        <div className='relative h-full min-w-[50%] bg-white shadow rounded-md border-4 border-black mx-4'>
          <div className='absolute top-[-20%] right-[50%] translate-x-[50%] rounded-full bg-white border-black border-4 w-16 h-16 flex justify-center items-center'>
            <h1 className='text-2xl text-black font-black'>
              {showResults ? '' : props.roundTimer}
            </h1>
          </div>
          <div className='py-3 px-5 h-full w-full grid grid-cols-2 grid-rows-2 gap-2'>
            <button
              onClick={() => {
                setAbilitiesOverlayVisible(true);
              }}
              className='shadow rounded-md bg-red-400 px-6 py-4 text-xl font-semibold text-white hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600'
            >
              Abilities
            </button>
            <button
              disabled
              onClick={() => {
                setItemsOverlayVisible(true);
              }}
              className='shadow rounded-md bg-amber-300 px-6 py-4 text-xl font-semibold text-white hover:bg-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500'
            >
              Coming Soon
            </button>
            <button
              disabled
              onClick={() => {
                setChampionsOverlayVisible(true);
              }}
              className='shadow rounded-md bg-green-400 px-6 py-4 text-xl font-semibold text-white hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600'
            >
              Coming Soon
            </button>
            <button
              onClick={() => {
                setSettingsOverlayVisible(true);
              }}
              className='shadow rounded-md bg-sky-600 px-6 py-4 text-xl font-semibold text-white hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600'
            >
              Settings
            </button>
          </div>
        </div>
        <div className='hidden min-w-[15%] h-24 bg-white shadow rounded-md border-4 border-black'></div>
      </div>
    </div>
  );
}

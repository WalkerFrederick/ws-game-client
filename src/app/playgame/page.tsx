'use client';

import { useSearchParams } from 'next/navigation';
import * as React from 'react';
import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import '@/lib/env';

import { useNotification } from '@/hooks/useNotification';
import { useOverlay } from '@/hooks/useOverlay';
import useWindowSize from '@/hooks/useWindowSize';

import Notification from '@/components/notification';
import Overlay from '@/components/Overlay';
import RealmChampsLogo from '@/components/svg/RealmChampsLogo';

import { ConnectingToServerUi } from '@/app/playgame/game-steps/ConnectingToServerUi';
import { ConnectToLobbyFormUi } from '@/app/playgame/game-steps/ConnectToLobbyFormUi';
import { GameLobbyUi } from '@/app/playgame/game-steps/GameLobbyUi';
import { GameResultsUi } from '@/app/playgame/game-steps/GameResults';
import { GeneralErrorUi } from '@/app/playgame/game-steps/GeneralErrorUi';
import { GameState, GameStatePlayerSnapshot, LatestRoundResult } from '@/app/playgame/types';
let socket: any;

enum uiSteps {
  CONNECTING_TO_SERVER = 'CONNECTING_TO_SERVER',
  CONNECT_TO_LOBBY_FORM = 'CONNECT_TO_LOBBY_FORM',
  GAME_LOBBY = 'GAME_LOBBY',
  GAME = 'GAME',
  GAME_RESULTS = 'GAME_RESULTS',
  GENERAL_ERROR = 'GENERAL_ERROR',
}

type choice = 'rock' | 'paper' | 'scissors' | null;

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
  const [gameState, setGameState] = useState<GameState | undefined>();

  const [matchStartTimer, setMatchStartTimer] = useState<number>(0);
  const [roundTimer, setRoundTimer] = useState<number>(0);
  const [roundBufferTimer, setRoundBufferTimer] = useState<number>(0);
  const [reconnectTimer, setReconnectTimer] = useState<number>(0);

  const [localPlayerUsername, setLocalPlayerUsername] = useState<string>('');
  const [choiceLocked, setChoiceLocked] = useState<boolean>(false);
  const [latestResult, setLatestResult] = useState<LatestRoundResult | null>();
  const [showResults, setShowResults] = useState<boolean>(false);

  const { width, height } = useWindowSize();

  useEffect(() => {
    //connection buffer to add slight delay to connection message.
    let needConnectionBuffer = true;
    setTimeout(() => {
      needConnectionBuffer = false;
    }, 500);

    // Initialize socket connection
    socket = io('localhost:8080', {
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

    socket.on('server:waiting-for-players', (game: GameState) => {
      console.log('server:waiting-for-players', game);
      hideOverlay();
      setGameState(game);
      setUiStep(uiSteps.GAME_LOBBY);
    });

    socket.on('server:player-reconnected', (game: GameState) => {
      console.log('server:player-reconnected', game);
      hideOverlay();
      setGameState(game);
      if (game.isStarted) {
        setUiStep(uiSteps.GAME);
      }
    });

    socket.on('server:waiting-for-ready', (game: GameState) => {
      setGameState(game);
      console.log('server:waiting-for-ready', game);
    });

    socket.on('server:player-ready-status', (game: GameState) => {
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
      setShowResults(false)
    });

    socket.on('server:round-countdown', (msg: any) => {
      console.log('server:round-countdown', msg);
      setRoundTimer(msg.countdown);
    });

    socket.on('server:round-result', (msg: LatestRoundResult) => {
      console.log('server:round-result', msg);
      setLatestResult(msg);
    });

    socket.on('server:round-end-timer', (msg: any) => {
      console.log('server:round-end-timer', msg);
      setRoundBufferTimer(msg.countdown);
    });

    socket.on('server:game-over', (game: GameState) => {
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

    socket.on('server:player-disconnected', (game: GameState) => {
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
    if (gameState?.isStarted) {
      setGameState(latestResult?.finalGameState)
      setShowResults(false)
    }
    const data = {
      gameId: gameState?.lobbyCode,
    };
    socket.emit('client:player-ready', data);
  };

  const sendConcede = () => {
    const data = {
      gameId: gameState?.lobbyCode,
    };
    socket.emit('client:concede', data);
  };

  const sendChoice = (choice: choice) => {
    setChoiceLocked(true);
    const data = {
      gameId: gameState?.lobbyCode,
      choice: choice,
    };
    socket.emit('client:make-choice', data);
  };

  const updateGameState = (gameStateSnapshot: GameStatePlayerSnapshot) => {
    //todo-merge a player snapshot with full gamestate
    const nextGameState = gameState
    if (nextGameState) nextGameState.players = gameStateSnapshot.players
    setGameState(nextGameState)
  };

  useEffect(() => {
    if (latestResult) {
      setShowResults(true);
    }
  }, [latestResult]);

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
            ready: gameState?.players[0]?.matchReady ?? false,
          }}
          Player2={{
            name: gameState?.players[1]?.username ?? '',
            ready: gameState?.players[1]?.matchReady ?? false,
          }}
          LobbyCode={gameState?.lobbyCode ?? ''}
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
          showResult={showResults}
          localPlayerUsername={localPlayerUsername}
          updateGameState={(gameState: GameStatePlayerSnapshot) => updateGameState(gameState)}
        />
      ),
      [uiSteps.GAME_RESULTS]: (
        <GameResultsUi winner={gameState?.winner ?? undefined} />
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
            <Overlay isVisible={width < 640 || height < 700} onClose={() => { }}>
              <div className='flex-col'>
                <h3 className='mb-8'>SCREEN SIZE TOO SMALL</h3>
                <a href='/' className='w-full shadow rounded-md bg-white px-6 py-4 text-xl font-semibold text-black hover:bg-neutral-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500'>
                  Home
                </a>
              </div>
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
  latestResult: LatestRoundResult | null;
  showResult: boolean;
  localPlayerUsername: string;
  updateGameState: (gameState: GameStatePlayerSnapshot) => void;
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
        {!props.showResult && !props.choiceLocked && (
          <>
            <h3 className='mb-4'>CHOOSE YOUR CARD</h3>
          </>
        )}
        {!props.showResult && props.choiceLocked && (
          <>
            <h3 className='mb-4'>WAITING FOR OPPONENT...</h3>
          </>
        )}
        {props.latestResult && props.showResult && (
          <>
            <div className='flex justify-center gap-4'>

            </div>
          </>
        )}
      </div>
      <div className='absolute bottom-12 px-10 w-full h-48 flex justify-center items-center'>
        <div className='relative h-full w-full bg-white shadow rounded-md border-4 border-black mx-4'>
          <div className='absolute top-[-20%] right-[50%] translate-x-[50%] rounded-full bg-white border-black border-4 w-16 h-16 flex justify-center items-center'>
            <h1 className='text-2xl text-black font-black'>
              {props.showResult ? '' : props.roundTimer}
            </h1>
          </div>

          {!(props.latestResult && props.showResult) ? <>
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
                onClick={() => {
                  setItemsOverlayVisible(true);
                }}
                className='shadow rounded-md bg-amber-300 px-6 py-4 text-xl font-semibold text-white hover:bg-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500'
              >
                Items (3/3)
              </button>
              <button
                onClick={() => {
                  setChampionsOverlayVisible(true);
                }}
                className='shadow rounded-md bg-green-400 px-6 py-4 text-xl font-semibold text-white hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600'
              >
                Champions (3/3)
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

          </> : <>
            <div className='text-black text-left h-full w-full leading-loose'>
              <ActionPlayer data={props.latestResult} handleNext={(gameState: GameStatePlayerSnapshot) => props.updateGameState(gameState)} />
              <a className='absolute bottom-2 right-4 text-gray-600'>
                <h4>NEXT [ENTER]</h4>
              </a>
            </div>
          </>}

        </div>
      </div>
    </div>
  );
}

const formatActionText = (text: string) => {
  // Capitalize the entire input string
  const formatted = text.toUpperCase();

  // Regex to match the patterns //d20=X, //magic=X, and //total=X, capturing the number after "="
  const rollPattern = /\/\/(D20|MAGIC|TOTAL)=(\d+)/g;

  // Array to store the result
  const result: (string | JSX.Element)[] = [];

  // Using `replace` with a function to process each match and surrounding text
  let lastIndex = 0;
  formatted.replace(rollPattern, (match, type, value, offset) => {
    // Add the text before the match as a string
    if (offset > lastIndex) {
      result.push(formatted.slice(lastIndex, offset));
    }

    // Add an empty inline div as the replacement for the match, with the number captured in `value`
    result.push(
      <div key={offset} className='inline border px-1 py-0.5 rounded ' data-type={type} data-value={value}>
        {type === 'D20' && (<div className='inline bg-red-800 text-white text-sm px-0.5 rounded mr-1 align-middle'>D20</div>)}
        {type === 'D6' && (<div className='inline bg-sky-800 text-white text-sm px-0.5 rounded mr-1 align-middle'>D6</div>)}
        {type === 'MAGIC' && (<div className='inline bg-purple-800 text-white text-sm px-0.5 rounded mr-1 align-middle'>MAGIC</div>)}
        {type === 'STRENGTH' && (<div className='inline bg-blue-800 text-white text-sm px-0.5 rounded mr-1 align-middle'>STRENGTH</div>)}
        {type === 'SPEED' && (<div className='inline bg-green-800 text-white text-sm px-0.5 rounded mr-1 align-middle'>SPEED</div>)}
        {type === 'TOTAL' && (<div className='inline bg-amber-800 text-white text-sm px-0.5 rounded mr-1 align-middle'>TOTAL</div>)}
        <h6 className='inline align-middle'>{value}</h6>
      </div>
    );

    // Update the last index to the end of the current match
    lastIndex = offset + match.length;

    return ""; // Return empty string for replacement (not used in result directly)
  });

  // Add any remaining text after the last match
  if (lastIndex < formatted.length) {
    result.push(formatted.slice(lastIndex));
  }

  return result;
}

const ActionPlayer = (props: { data: LatestRoundResult, handleNext: (gameState: GameStatePlayerSnapshot) => void }) => {
  const actions = props.data.actionsToPlayOut;
  const [currentActionIndex, setCurrentActionIndex] = useState(0);

  const nextAction = React.useCallback(() => {
    setCurrentActionIndex((prevIndex) => {
      if (prevIndex < actions.length - 1) {
        return prevIndex + 1;
      }
      return prevIndex; // Stay on the last action if no more actions are available
    });
  }, [actions.length]);

  // Set up a timer to move to the next action automatically after playtime
  useEffect(() => {
    if (currentActionIndex < actions.length - 1) {
      const timer = setTimeout(() => {
        props.handleNext(actions[currentActionIndex].gameStateSnapshot);
        nextAction();
      }, actions[currentActionIndex].playtime);

      return () => clearTimeout(timer);
    }
  }, [currentActionIndex, actions, nextAction]);

  // Set up event listener for Enter key press to skip
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        nextAction();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [nextAction]);

  const formattedMessage = formatActionText(actions[currentActionIndex].description);

  return (
    <div
      tabIndex={0}
      key={formattedMessage.toString() ?? ''}
      className='h-full w-full cursor-pointer p-6 pt-12 font-bold select-none animate-fadeUp'
      onClick={nextAction}
    >
      {formattedMessage}
    </div>
  );
};
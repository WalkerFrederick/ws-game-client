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
import { AbilityCardsEnum, ChampionCard as ChampionCardType, ChampionCardsEnum, GameState, GameStatePlayerSnapshot, ItemCardsEnum, LatestRoundResult, Player } from '@/app/playgame/types';
import { siteConfig } from '@/constant/config';
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
          gameState={gameState}
          sendConcede={() => sendConcede()}
          sendChoice={(choice) => {
            sendChoice(choice);
          }}
          sendReady={() => sendReady()}
          roundTimer={roundTimer}
          roundBufferTimer={roundBufferTimer}
          choiceLocked={choiceLocked}
          latestResult={latestResult ?? null}
          showResult={showResults}
          localPlayerUsername={localPlayerUsername}
          updateGameState={(gameState: GameStatePlayerSnapshot) => updateGameState(gameState)}
          gamePaused={!!gameState?.isPaused}
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
  sendReady: () => void;
  roundTimer: number;
  roundBufferTimer: number;
  choiceLocked: boolean;
  latestResult: LatestRoundResult | null;
  showResult: boolean;
  localPlayerUsername: string;
  updateGameState: (gameState: GameStatePlayerSnapshot) => void;
  gamePaused: boolean;
  gameState: GameState | undefined;
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

  const [localPlayer, setLocalPlayer] =
    useState<Player | undefined>();

  const [otherPlayer, setOtherPlayer] =
    useState<Player | undefined>();


  const [choice, setChoice] = useState<choice>(null);

  useEffect(() => {
    if (props.gameState?.players[0].username === props.localPlayerUsername) {
      setLocalPlayer(props.gameState.players[0])
      setOtherPlayer(props.gameState.players[1])
    } else if (props.gameState?.players[1].username === props.localPlayerUsername) {
      setLocalPlayer(props.gameState.players[1])
      setOtherPlayer(props.gameState.players[0])
    }
  }, [props.gameState, props.localPlayerUsername])



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
            {localPlayer && <>
              {localPlayer.cards?.activeChampion.abilityCards.map((ability) => (
                <button
                  className={`relative h-48 w-36 bg-white text-black hover:bg-neutral-200 hover:bottom-1 rounded ocus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500 border-4 `}
                >
                  {ability.cardName}
                  {ability.description}
                </button>
              ))}
            </>}
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
        <div className='flex-col justify-center items-center'>
          <div className=' border-white flex justify-center gap-3 w-full'>
            {localPlayer && <>
              {localPlayer.cards?.itemCards.map((itemCard) => (
                <button
                  className={'relative h-48 w-36 bg-white text-black hover:bg-neutral-200 hover:bottom-1 rounded ocus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500 border-4 break-words'}
                >
                  {itemCard.cardName}
                  {itemCard.description}
                </button>
              ))}
            </>}
          </div>
          <button
            disabled={props.choiceLocked || choice === null}
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
        </div>      </Overlay>
    );
  };

  const championsOverlay = () => {
    return (
      <Overlay
        isVisible={championsOverlayVisible}
        onClose={() => closeAllOverlay()}
      >

        <div className='flex-col justify-center'>
          <div className=' border-white flex gap-3'>
            {localPlayer && <>
              {localPlayer.cards?.activeChampion && <ChampionCard championCardData={localPlayer.cards?.activeChampion} infoWindowPos='cover' />
              }
              {localPlayer.cards?.championCards.map((champion) => (
                <ChampionCard championCardData={champion} infoWindowPos='cover' />
              ))}
            </>}
          </div>
          <button
            onClick={() => {
              closeAllOverlay();
            }}
            className='mt-4 w-full shadow rounded-md bg-red-600 px-6 py-4 mb-4 text-xl font-semibold text-white hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500'
          >
            Close Menu [ESC]
          </button>
        </div>
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
      <div className='h-full w-full pt-36 pb-72'>
        <div className='h-full w-full flex flex-col justify-between items-center'>
          {otherPlayer?.cards?.activeChampion && <>
            <ChampionCard championCardData={otherPlayer?.cards?.activeChampion} infoWindowPos='left' />
          </>}
          {localPlayer?.cards?.activeChampion && <>
            <ChampionCard championCardData={localPlayer?.cards?.activeChampion} infoWindowPos='left' />
          </>}
        </div>
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
              <ActionPlayer paused={props.gamePaused} data={props.latestResult} handleNext={(gameState: GameStatePlayerSnapshot) => props.updateGameState(gameState)} sendReady={props.sendReady} />
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

  // Regex to match patterns like //3d20=X, //1d6=X, //magic=X, capturing the type and value after "="
  const rollPattern = /\/\/(\d*D\d+|MAGIC|STRENGTH|SPEED|TOTAL)=(\d+)/g;

  // Array to store the result
  const result: (string | JSX.Element)[] = [];

  // Using `replace` with a function to process each match and surrounding text
  let lastIndex = 0;
  formatted.replace(rollPattern, (match, type, value, offset) => {
    // Add the text before the match as a string
    if (offset > lastIndex) {
      result.push(formatted.slice(lastIndex, offset));
    }

    // Determine color based on type
    let colorClass = '';
    if (type.includes('D20')) {
      colorClass = 'bg-red-800';
    } else if (type.includes('D6')) {
      colorClass = 'bg-sky-800';
    } else if (type === 'MAGIC') {
      colorClass = 'bg-purple-800';
    } else if (type === 'STRENGTH') {
      colorClass = 'bg-blue-800';
    } else if (type === 'SPEED') {
      colorClass = 'bg-green-800';
    } else if (type === 'TOTAL') {
      colorClass = 'bg-amber-800';
    }

    // Add an empty inline div as the replacement for the match, with the number captured in `value`
    result.push(
      <div key={offset} className='inline border px-1 py-0.5 rounded ' data-type={type} data-value={value}>
        <div className={`inline ${colorClass} text-white text-sm px-0.5 rounded mr-1 align-middle`}>{type}</div>
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
};


interface ActionPlayerProps {
  data: LatestRoundResult;
  handleNext: (gameState: GameStatePlayerSnapshot) => void;
  sendReady: () => void;
  paused: boolean
}
const ActionPlayer = (props: ActionPlayerProps) => {
  const actions = props.data.actionsToPlayOut;
  const [currentActionIndex, setCurrentActionIndex] = useState(0);

  const nextAction = React.useCallback(() => {
    setCurrentActionIndex((prevIndex) => {
      if (prevIndex < actions.length - 1) {
        return prevIndex + 1;
      }
      props.sendReady()
      return prevIndex; // Stay on the last action if no more actions are available
    });
  }, [actions.length]);

  // Set up a timer to move to the next action automatically after playtime if not paused
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;

    if (!props.paused && currentActionIndex < actions.length - 1) {
      timer = setTimeout(() => {
        props.handleNext(actions[currentActionIndex].gameStateSnapshot);
        nextAction();
      }, actions[currentActionIndex].playtime);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [currentActionIndex, actions, nextAction, props.paused]);

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

interface championCardProps {
  infoWindowPos: 'left' | 'right' | 'cover';
  championCardData: ChampionCardType;
}

const ChampionCard = (props: championCardProps) => {
  return (
    <div className='h-40 w-28 bg-black shadow-xl rounded-lg relative select-none'>
      <div className={`absolute h-full w-full p-1 bg-black bg-opacity-40 top-0 rounded-lg ${props.infoWindowPos === 'right' && '-right-[110%]'} ${props.infoWindowPos === 'left' && '-left-[110%]'}`}>
        <div className='w-full flex justify-center items-center'>
          <div className='font-bold'>{props.championCardData.cardName}</div>
        </div>
        <div className='w-full flex justify-between items-center'>
          <div className='px-0.5 text-xs text-white bg-red-700 rounded'>HEALTH</div>
          <div className='font-bold'>{props.championCardData.health}</div>
        </div>
        <div className='w-full flex justify-between items-center'>
          <div className='px-0.5 text-xs text-white bg-slate-600 rounded'>DEFENSE</div>
          <div className='font-bold'>{props.championCardData.defense}</div>
        </div>
        <div className='w-full flex justify-between items-center'>
          <div className='px-0.5 text-xs text-white bg-sky-800 rounded'>STRENGTH</div>
          <div className='font-bold'>{props.championCardData.strength}</div>
        </div>
        <div className='w-full flex justify-between items-center'>
          <div className='px-0.5 text-xs text-white bg-green-600 rounded'>SPEED</div>
          <div className='font-bold'>{props.championCardData.speed}</div>
        </div>
        <div className='w-full flex justify-between items-center'>
          <div className='px-0.5 text-xs text-white bg-purple-600 rounded'>MAGIC</div>
          <div className='font-bold'>{props.championCardData.magic}</div>
        </div>
      </div>
      <div className='h-full w-full bg-contain bg-center bg-no-repeat ' style={{ backgroundImage: `url(${siteConfig.url}/images/card-template.png)` }} ></div>
    </div>
  )
}





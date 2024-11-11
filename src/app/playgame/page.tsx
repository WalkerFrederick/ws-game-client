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
  choice: 'rock' | 'paper' | 'scissors' | null; // Player's choice in the current round
  score: number; // Player's current score
  isReady: boolean; // Status indicating if the player is ready to start
  disconnected: boolean; // Indicates if player is currently disconnected
  reconnectTimeout?: NodeJS.Timeout | null; // Timer for reconnection countdown
}

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

  useEffect(() => {
    //connection buffer to add slight delay to connection message.
    let needConnectionBuffer = true;
    setTimeout(() => {
      needConnectionBuffer = false;
    }, 500);

    // Initialize socket connection
    socket = io('http://192.168.50.202:8080', {
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
    });

    socket.on('server:round-countdown', (msg: any) => {
      console.log('server:round-countdown', msg);
      setRoundTimer(msg.countdown);
    });

    socket.on('server:round-result', (msg: any) => {
      console.log('server:round-result', msg);
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
  }, []);

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
        <button
          onClick={() => {
            sendConcede();
          }}
          className='shadow rounded-md bg-red-600 px-6 py-4 text-xl font-semibold text-white hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600'
        >
          SKIP and CONCENDE ({roundTimer}, {roundBufferTimer})
        </button>
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
                    <h3>{reconnectTimer}</h3>
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

export function GameUi() {
  return <></>;
}

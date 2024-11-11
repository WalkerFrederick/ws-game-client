import { useState } from 'react';

import { validateLobbyCode, validateName } from '@/lib/utils';
import { NotificationType } from '@/hooks/useNotification';

import { ButtonSpinner } from '@/components/ButtonSpinner';

interface ConnectToLobbyFormUiProps {
  defualtValues?: {
    name?: string;
    lobby?: string;
  };
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  showNotification: (message: string, type: NotificationType) => void;
}

export function ConnectToLobbyFormUi(props: ConnectToLobbyFormUiProps) {
  const [formLoading, setFormLoading] = useState<boolean>(false);
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormLoading(true);
    const target = event.target as typeof event.target & {
      name: { value: string };
      lobby: { value: string };
    };
    const name = target.name.value;
    const lobbyCode = target.lobby.value;

    if (
      validateLobbyCode(lobbyCode ?? '').valid &&
      validateName(name ?? '').valid
    ) {
      props.onSubmit(event);
    } else {
      if (validateName(name ?? '').message.length > 0) {
        props.showNotification(validateName(name ?? '').message, 'error');
      } else if (validateLobbyCode(lobbyCode ?? '').message.length > 0) {
        props.showNotification(
          validateLobbyCode(lobbyCode ?? '').message,
          'error'
        );
      } else {
        props.showNotification('Form Validation Failed', 'error');
      }
      setFormLoading(false);
    }
  };

  return (
    <>
      <h2>CREATE OR JOIN A LOBBY</h2>
      <form
        className='w-full max-w-[600px] px-6'
        onSubmit={(event) => {
          handleSubmit(event);
        }}
      >
        <div className='w-full'>
          <div className='mt-8 w-full'>
            <div className='w-full'>
              <label htmlFor='username' className='block font-medium '>
                Name
              </label>
              <div className='mt-2 w-full'>
                <input
                  disabled={formLoading}
                  id='name'
                  name='name'
                  type='text'
                  defaultValue={props.defualtValues?.name ?? ''}
                  placeholder='Name (required)'
                  className='shadow text-lg text-bold block w-full rounded-md border-0 py-4 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-green-500'
                />
              </div>
            </div>
          </div>
          <div className='mt-4'>
            <div className=''>
              <label htmlFor='lobby' className='block font-medium '>
                Lobby
              </label>
              <div className='mt-2'>
                <input
                  disabled={formLoading}
                  id='lobby'
                  name='lobby'
                  type='text'
                  defaultValue={props.defualtValues?.lobby ?? ''}
                  placeholder='Lobby Code (required)'
                  className='shadow text-lg text-bold block w-full rounded-md border-0 py-4 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-green-500'
                />
              </div>
            </div>
          </div>
          <div className='mt-8'>
            <button
              type='submit'
              className='w-full shadow rounded-md bg-neutral-900 px-6 py-4 text-xl font-semibold text-white hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500'
            >
              {formLoading ? <ButtonSpinner /> : 'Join or Create Lobby'}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}

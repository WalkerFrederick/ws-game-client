import clsx, { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface validationMessage {
  valid: boolean;
  message: string;
}

/** Merge classes with tailwind-merge with clsx full feature */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function validateLobbyCode(lobbyCode: string) {
  const validationMessage: validationMessage = {
    valid: false,
    message: '',
  };

  if (lobbyCode.length < 5) {
    validationMessage.message = 'lobby code must be at least 5 characters.';
  } else if (lobbyCode.length > 10) {
    validationMessage.message = 'lobby code must be less than 10 character';
  } else if (!/^[a-zA-Z0-9]+$/.test(lobbyCode)) {
    validationMessage.message =
      'lobby code must only contain letters and numbers';
  } else {
    validationMessage.valid = true;
  }

  return validationMessage;
}

export function validateName(name: string) {
  const validationMessage: validationMessage = {
    valid: false,
    message: '',
  };

  if (name.length < 1) {
    validationMessage.message = 'name must be at least 1 character';
  } else if (name.length > 32) {
    validationMessage.message = 'name must be less than 32 character';
  } else if (!/^[a-zA-Z0-9]+$/.test(name)) {
    validationMessage.message = 'name must only contain letters and numbers';
  } else {
    validationMessage.valid = true;
  }

  return validationMessage;
}

import { useSyncExternalStore } from 'react';

const eventName = 'moon-user-changed';
function readUser() {
  const id = Number(localStorage.getItem('moon_user_id'));
  return Number.isInteger(id) && id > 0 ? id : 1;
}
function subscribe(listener: () => void) {
  window.addEventListener(eventName, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(eventName, listener);
    window.removeEventListener('storage', listener);
  };
}

export function useUser() {
  const userId = useSyncExternalStore(subscribe, readUser, () => 1);
  const switchUser = (id: number) => {
    if (!Number.isInteger(id) || id < 1) return;
    localStorage.setItem('moon_user_id', String(id));
    window.dispatchEvent(new Event(eventName));
  };

  return { userId, switchUser };
}

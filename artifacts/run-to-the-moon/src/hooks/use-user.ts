import { useState, useEffect } from 'react';

export function useUser() {
  const [userId, setUserId] = useState<number>(1);

  useEffect(() => {
    const stored = localStorage.getItem('moon_user_id');
    if (stored) {
      setUserId(Number(stored));
    } else {
      localStorage.setItem('moon_user_id', '1');
    }
  }, []);

  const switchUser = (id: number) => {
    setUserId(id);
    localStorage.setItem('moon_user_id', String(id));
  };

  return { userId, switchUser };
}

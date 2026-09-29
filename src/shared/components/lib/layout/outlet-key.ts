import { useRef } from 'react';
import { NavigationType, useLocation, useNavigationType } from 'react-router-dom';

/**
 * Key of the page outlet: a new `location.state.assistantNav` (an assistant link with filters to
 * the page on show) remounts the page; later moves without it keep the key, except Back / Forward
 * on that page, which remount it so it reads the entry's URL again (and does not write the
 * assistant's filters into it)
 */
export const useOutletKey = () => {
  const { state, key: entry, pathname } = useLocation();
  const type = useNavigationType();
  const key = useRef<{ id?: number | string; path?: string }>({});
  const nav = (state as { assistantNav?: unknown } | null)?.assistantNav;
  if (typeof nav === 'number') key.current = { id: nav, path: pathname };
  else if (type === NavigationType.Pop && pathname === key.current.path) key.current.id = entry;
  return key.current.id;
};

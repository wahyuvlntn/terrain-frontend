import { Input } from '@digital-twin/components';
import { LocationFill, Navigate, Search } from '@digital-twin/icons';
import clsx from 'clsx';
import { KeyboardEvent, useMemo, useRef, useState } from 'react';

import styles from './walk.module.scss';

export type TeleportLocation = {
  id: string;
  name: string;
  /** depth in the location tree (indent) */
  depth: number;
  /** the rendered scope: teleporting there keeps the view */
  current: boolean;
};

export type TeleportEquipment = { id: string; name: string; tag?: string };

type TeleportMenuProps = {
  locations: TeleportLocation[];
  equipment: TeleportEquipment[];
  onLocation: (id: string) => void;
  onEquipment: (id: string) => void;
  onClose: () => void;
};

/**
 * Arrow keys of the menu: down from the filter to the first entry, up / down through the entries
 * (up from the first back to the filter), Home / End to the first / last entry. True when handled.
 */
export const moveMenuFocus = (
  key: string,
  filter: HTMLElement | null,
  items: HTMLElement[],
  active: Element | null
) => {
  const at = items.indexOf(active as HTMLElement);
  const inFilter = active === filter;
  let next: HTMLElement | null | undefined;
  if (key === 'ArrowDown') next = inFilter ? items[0] : at >= 0 ? items[at + 1] : undefined;
  else if (key === 'ArrowUp') next = at === 0 ? filter : at > 0 ? items[at - 1] : undefined;
  // in the filter Home / End move the caret
  else if (key === 'Home' && at >= 0) next = items[0];
  else if (key === 'End' && at >= 0) next = items[items.length - 1];
  if (!next) return false;
  next.focus();
  return true;
};

/**
 * Teleport menu of walk mode: the twin's 3D locations (their entry points; one outside the view
 * loads it first) and the equipment of the view (a free spot in front of it). The filter has the
 * focus when the menu opens; the arrow keys move through the entries, Tab goes on from there; Esc
 * closes it.
 */
export const TeleportMenu = ({
  locations,
  equipment,
  onLocation,
  onEquipment,
  onClose,
}: TeleportMenuProps) => {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const match = (...texts: (string | undefined)[]) =>
    !q || texts.some((t) => t?.toLowerCase().includes(q));
  const shownLocations = useMemo(
    () => locations.filter((l) => !q || l.name.toLowerCase().includes(q)),
    [locations, q]
  );
  const shownEquipment = equipment.filter((e) => match(e.name, e.tag));
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    const items = Array.from(listRef.current?.querySelectorAll<HTMLElement>('button') ?? []);
    const filter = e.currentTarget.querySelector('input');
    if (moveMenuFocus(e.key, filter, items, document.activeElement)) {
      // no page scroll, and no walking on (walk mode leaves the page's controls their arrows)
      e.preventDefault();
    }
  };

  return (
    <div
      className={clsx(styles['walk-panel'], styles['walk-menu'])}
      role="dialog"
      aria-label="Teleport"
      onKeyDown={onKeyDown}
    >
      <Input
        value={query}
        placeholder="Find a location or equipment"
        background="dark"
        prefix={<Search />}
        onChange={(e) => setQuery(e.target.value)}
        wrapperProps={{ className: styles['walk-menu__filter'] }}
        inputProps={{
          'aria-label': 'Find a location or equipment',
          autoFocus: true,
          onKeyDown: (e) => {
            // Enter goes to the first match
            if (e.key !== 'Enter') return;
            e.preventDefault();
            if (shownLocations[0]) onLocation(shownLocations[0].id);
            else if (shownEquipment[0]) onEquipment(shownEquipment[0].id);
          },
        }}
      />
      <div ref={listRef} className={styles['walk-menu__scroll']}>
        {shownLocations.length ? (
          <>
            <h5 className={styles['walk-menu__heading']}>Locations</h5>
            {shownLocations.map((l) => (
              <button
                key={l.id}
                type="button"
                className={styles['walk-menu__item']}
                style={{ paddingLeft: 10 + (q ? 0 : l.depth) * 14 }}
                onClick={() => onLocation(l.id)}
              >
                <LocationFill aria-hidden="true" />
                <span>{l.name}</span>
                {l.current ? <em>in view</em> : null}
              </button>
            ))}
          </>
        ) : null}
        {shownEquipment.length ? (
          <>
            <h5 className={styles['walk-menu__heading']}>Equipment in view</h5>
            {shownEquipment.map((e) => (
              <button
                key={e.id}
                type="button"
                className={styles['walk-menu__item']}
                onClick={() => onEquipment(e.id)}
              >
                <Navigate aria-hidden="true" />
                <span>{e.name}</span>
                {e.tag ? <em>{e.tag}</em> : null}
              </button>
            ))}
          </>
        ) : null}
        {!shownLocations.length && !shownEquipment.length ? (
          <div className={styles['walk-list__empty']}>Nothing matches “{query.trim()}”</div>
        ) : null}
      </div>
    </div>
  );
};

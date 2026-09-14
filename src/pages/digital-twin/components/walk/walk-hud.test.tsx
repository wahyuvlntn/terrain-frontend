import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TeleportMenu } from './teleport-menu';
import { keepControlKeys } from './walk-hud';

// the shared barrels load a UI library whose CSS vitest can't import
vi.mock('@digital-twin/components', () => import('../../testing/digital-twin-components.mock'));

afterEach(cleanup);

describe('keepControlKeys', () => {
  /** the twin page while walking: its controls, the 3D view, walk mode's document listener */
  const Page = () => {
    const view = useRef<HTMLDivElement>(null);
    return (
      <div onKeyDown={(e) => keepControlKeys(e, view.current)}>
        <button type="button">Exit walk</button>
        <div ref={view} tabIndex={0} data-testid="view">
          <canvas data-testid="canvas" />
        </div>
      </div>
    );
  };

  it('leaves Tab, Space and the arrows to a focused control, the view keeps them', () => {
    const walkKeys = vi.fn();
    document.addEventListener('keydown', walkKeys);
    try {
      render(<Page />);
      const button = screen.getByRole('button', { name: 'Exit walk' });
      for (const code of ['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])
        fireEvent.keyDown(button, { code });
      expect(walkKeys).not.toHaveBeenCalled();

      // letters stay walk keys everywhere (move, select, assistant, newest event, full screen)
      fireEvent.keyDown(button, { code: 'KeyW' });
      fireEvent.keyDown(button, { code: 'KeyG' });
      expect(walkKeys).toHaveBeenCalledTimes(2);

      // the 3D view (and anything in it) keeps Tab (teleport menu), Space (jump) and the arrows
      fireEvent.keyDown(screen.getByTestId('view'), { code: 'Tab' });
      fireEvent.keyDown(screen.getByTestId('canvas'), { code: 'Space' });
      expect(walkKeys).toHaveBeenCalledTimes(4);
    } finally {
      document.removeEventListener('keydown', walkKeys);
    }
  });
});

describe('TeleportMenu', () => {
  it('moves through the entries with the arrow keys and closes on Esc', () => {
    const onClose = vi.fn();
    render(
      <TeleportMenu
        locations={[
          { id: 'loc-8', name: 'CUB Central Utility Building', depth: 0, current: false },
          { id: 'loc-10', name: 'Chiller Plant Room', depth: 1, current: true },
        ]}
        equipment={[{ id: 'central-plant/ch-01', name: 'Chiller CH-01', tag: 'CH-01' }]}
        onLocation={vi.fn()}
        onEquipment={vi.fn()}
        onClose={onClose}
      />
    );
    const filter = screen.getByRole('textbox', { name: 'Find a location or equipment' });
    const building = screen.getByRole('button', { name: /CUB Central Utility Building/ });
    const plant = screen.getByRole('button', { name: /Chiller Plant Room/ });
    const chiller = screen.getByRole('button', { name: /Chiller CH-01/ });
    expect(document.activeElement).toBe(filter);

    const key = (k: string) => fireEvent.keyDown(document.activeElement as Element, { key: k });
    key('ArrowUp');
    expect(document.activeElement).toBe(filter);
    key('ArrowDown');
    expect(document.activeElement).toBe(building);
    key('ArrowDown');
    expect(document.activeElement).toBe(plant);
    key('ArrowDown');
    expect(document.activeElement).toBe(chiller);
    key('ArrowDown');
    expect(document.activeElement).toBe(chiller);
    key('Home');
    expect(document.activeElement).toBe(building);
    key('End');
    expect(document.activeElement).toBe(chiller);
    key('ArrowUp');
    key('ArrowUp');
    key('ArrowUp');
    expect(document.activeElement).toBe(filter);

    key('Escape');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { TwinToolbar } from './twin-toolbar';

// the shared barrels load a UI library whose CSS vitest can't import
vi.mock('@digital-twin/components', () => import('../testing/digital-twin-components.mock'));

// jsdom has no pointer events: a mouse event with a pointer id stands in
beforeAll(() => {
  if (window.PointerEvent) return;
  class TestPointerEvent extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
    }
  }
  window.PointerEvent = TestPointerEvent as unknown as typeof PointerEvent;
});

afterEach(cleanup);

const rect = (left: number, top: number, right: number, bottom: number) => () =>
  ({
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
    x: left,
    y: top,
  }) as DOMRect;

/** the toolbar at x 96..140, y 6..400; its Walk button at x 100..136, y 10..46 */
const setup = () => {
  const walk = {
    walking: false,
    onToggle: vi.fn(),
    onDrag: vi.fn(() => true),
    onDrop: vi.fn(),
    onCancel: vi.fn(),
  };
  render(
    <TwinToolbar
      walk={walk}
      isolate={false}
      showTags={false}
      labelsOnHover={false}
      statusTint={false}
      seeThrough
      onUp={vi.fn()}
      onReset={vi.fn()}
      onToggleIsolate={vi.fn()}
      onToggleTags={vi.fn()}
      onToggleLabelsOnHover={vi.fn()}
      onToggleStatusTint={vi.fn()}
      onToggleSeeThrough={vi.fn()}
      onToggleDashboard={vi.fn()}
      onToggleOverview={vi.fn()}
    />
  );
  const button = screen.getByRole('button', { name: /^Walk \(first person\)/ });
  button.getBoundingClientRect = rect(100, 10, 136, 46);
  button.setPointerCapture = vi.fn();
  const toolbar = button.closest('[data-twin-toolbar]') as HTMLElement;
  toolbar.getBoundingClientRect = rect(96, 6, 140, 400);
  const press = (x: number, y: number) =>
    fireEvent.pointerDown(button, { button: 0, pointerId: 1, clientX: x, clientY: y });
  const move = (x: number, y: number) =>
    fireEvent.pointerMove(button, { pointerId: 1, clientX: x, clientY: y });
  // a pointerup is followed by the click the browser dispatches on the (captured) button
  const release = (x: number, y: number) => {
    fireEvent.pointerUp(button, { pointerId: 1, clientX: x, clientY: y });
    fireEvent.click(button);
  };
  return { walk, press, move, release };
};

describe('See-through walls button', () => {
  const renderWith = (seeThrough: boolean) => {
    const onToggleSeeThrough = vi.fn();
    render(
      <TwinToolbar
        walk={{
          walking: false,
          onToggle: vi.fn(),
          onDrag: vi.fn(),
          onDrop: vi.fn(),
          onCancel: vi.fn(),
        }}
        isolate={false}
        showTags={false}
        labelsOnHover={false}
        statusTint={false}
        seeThrough={seeThrough}
        onUp={vi.fn()}
        onReset={vi.fn()}
        onToggleIsolate={vi.fn()}
        onToggleTags={vi.fn()}
        onToggleLabelsOnHover={vi.fn()}
        onToggleStatusTint={vi.fn()}
        onToggleSeeThrough={onToggleSeeThrough}
        onToggleDashboard={vi.fn()}
        onToggleOverview={vi.fn()}
      />
    );
    // the view's on / off choices are in the View options menu
    fireEvent.click(screen.getByRole('button', { name: 'View options' }));
    return {
      onToggleSeeThrough,
      button: screen.getByRole('button', { name: /^See-through walls/ }),
    };
  };

  it('shows the current choice and toggles it', () => {
    const { onToggleSeeThrough, button } = renderWith(true);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.getAttribute('aria-label')).toMatch(/on \(click for solid walls\)/);
    fireEvent.click(button);
    expect(onToggleSeeThrough).toHaveBeenCalledTimes(1);
  });

  it('says the walls are solid when it is off', () => {
    const { button } = renderWith(false);
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.getAttribute('aria-label')).toMatch(/walls are solid/);
  });
});

describe('View options menu', () => {
  it('opens beside the toolbar and closes on Esc without the key going further', () => {
    setup();
    const opener = screen.getByRole('button', { name: 'View options' });
    expect(screen.queryByRole('group', { name: 'View options' })).toBeNull();
    fireEvent.click(opener);
    expect(opener.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: /^Equipment names and status/ })).toBeTruthy();
    const outer = vi.fn();
    document.addEventListener('keydown', outer);
    try {
      fireEvent.keyDown(screen.getByRole('button', { name: /^Isolate selection/ }), {
        key: 'Escape',
      });
    } finally {
      document.removeEventListener('keydown', outer);
    }
    expect(outer).not.toHaveBeenCalled();
    expect(screen.queryByRole('group', { name: 'View options' })).toBeNull();
  });
});

describe('Walk button', () => {
  it('a press that drifts but is released on the button is a click', () => {
    const { walk, press, move, release } = setup();
    press(110, 20);
    move(110, 32);
    // over the toolbar: no landing preview of the view hidden behind it
    expect(walk.onDrag).not.toHaveBeenCalled();
    release(110, 32);
    expect(walk.onDrop).not.toHaveBeenCalled();
    expect(walk.onToggle).toHaveBeenCalledTimes(1);
  });

  it('a drag released elsewhere on the toolbar is cancelled, not dropped behind it', () => {
    const { walk, press, move, release } = setup();
    press(110, 20);
    move(400, 300);
    expect(walk.onDrag).toHaveBeenLastCalledWith(400, 300);
    move(120, 300);
    release(120, 300);
    expect(walk.onDrop).not.toHaveBeenCalled();
    expect(walk.onCancel).toHaveBeenCalled();
    expect(walk.onToggle).not.toHaveBeenCalled();
  });

  it('a drag released over the view lands there', () => {
    const { walk, press, move, release } = setup();
    press(110, 20);
    move(400, 300);
    release(400, 300);
    expect(walk.onDrop).toHaveBeenCalledWith(400, 300);
    expect(walk.onToggle).not.toHaveBeenCalled();
  });
});

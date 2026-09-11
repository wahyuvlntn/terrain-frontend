import { describe, expect, it } from 'vitest';

import { signalOf } from './digital-twin.signal';

describe('status signal towers', () => {
  it('show the SEMI E129 colours of the equipment status and alarms', () => {
    expect(signalOf({ status: 'RUNNING', condition: 'NORMAL' })).toBe('run');
    expect(signalOf({ status: 'RUNNING', condition: 'WARNING' })).toBe('run-warn');
    expect(signalOf({ status: 'RUNNING', condition: 'CRITICAL' })).toBe('run-alarm');
    expect(signalOf({ status: 'IDLE', condition: 'NORMAL' })).toBe('idle');
    expect(signalOf({ status: 'UNPLANNED DOWN', condition: 'CRITICAL' })).toBe('down');
    expect(signalOf({ status: 'PLANNED DOWN', condition: 'NORMAL' })).toBe('pm');
    expect(signalOf({ status: 'OFFLINE', condition: 'OFFLINE' })).toBe('off');
    expect(signalOf({ status: null, condition: null })).toBe('off');
  });
});

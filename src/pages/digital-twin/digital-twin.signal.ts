import type { TwinAsset } from './api/digital-twin.api';
import type { TwinSignal } from './viewer/twin-viewer';

/**
 * What an equipment's status signal tower (andon light, SEMI E129) shows: running green (with
 * amber / red while it has a warning / critical alarm), idle amber, tripped red (flashing), planned
 * maintenance blue, offline dark
 */
export const signalOf = (a: Pick<TwinAsset, 'status' | 'condition'>): TwinSignal => {
  switch (a.status) {
    case 'RUNNING':
      if (a.condition === 'CRITICAL') return 'run-alarm';
      return a.condition === 'WARNING' ? 'run-warn' : 'run';
    case 'IDLE':
      return 'idle';
    case 'UNPLANNED DOWN':
    case 'DOWN':
      return 'down';
    case 'PLANNED DOWN':
      return 'pm';
    default:
      return 'off';
  }
};

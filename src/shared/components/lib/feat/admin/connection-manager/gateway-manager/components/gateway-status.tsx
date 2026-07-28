// For conditional styling
import { t } from '@digital-twin/utils';
import clsx from 'clsx';
// React builtins
import { useMemo } from 'react';

// Hooks
import { useGatewayStatus } from '../hooks';
// Custom components
import { AdditionalInfo } from './gateway-form.additional-info';
// Style
import style from './gateway-status.module.scss';

// Constants
enum Status {
  DISCONNECTED = 'Disconnected',
  CONNECTED = 'Connected',
  ERROR = 'Error',
}

export const GatewayStatus = ({ gatewayAlias }: { gatewayAlias?: string }) => {
  const { data } = useGatewayStatus(gatewayAlias);

  const { status, duration, error } = useMemo(() => {
    if (!gatewayAlias || !data || !data.is_active) {
      return {
        status: Status.DISCONNECTED,
        duration: undefined,
        error: undefined,
      };
    }

    const duration = displayDuration((Date.now() - data.timestamp) / 1000);

    if (data.is_connected) {
      return {
        status: Status.CONNECTED,
        duration: duration,
        error: undefined,
      };
    } else {
      return {
        status: Status.ERROR,
        duration: duration,
        error: data.error,
      };
    }
  }, [gatewayAlias, data]);

  return (
    <div className={style['gateway-status']}>
      <div className={style['gateway-status__header']}>
        <div
          className={clsx(
            style['gateway-status__status'],
            status === Status.DISCONNECTED &&
              style['gateway-status__status--disconnected'],
            status === Status.CONNECTED &&
              style['gateway-status__status--connected'],
            status === Status.ERROR && style['gateway-status__status--error']
          )}
        >
          {t(`common.${status.toLowerCase()}`)}
        </div>
        {duration ? <span>{duration}</span> : null}
      </div>
      {error ? <AdditionalInfo value={error} monospace /> : null}
    </div>
  );
};

const displayDuration = (duration: number): string => {
  // calculate day
  const day = Math.round(duration / (3600 * 24));

  // calculate hour
  const modDay = duration % (3600 * 24);
  const hour = Math.round(modDay / 3600);

  // calculate hour
  const modHour = duration % 3600;
  const minute = Math.round(modHour / 60);

  return `${day}d : ${hour}h : ${minute}m`;
};

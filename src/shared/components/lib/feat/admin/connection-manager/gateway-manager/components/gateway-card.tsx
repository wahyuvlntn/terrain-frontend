import { TrashDelete } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import { ToggleSwitch } from '@digital-twin/reusables';
import { toast } from '@digital-twin/reusables';
import clsx from 'clsx';

import {
  useGatewayStatus,
  useTurnOffGateway,
  useTurnOnGateway,
} from '../hooks';
import modbusTcpIcon from '../images/MODBUS_TCP.png';
import mqttIcon from '../images/MQTT.png';
import mtconnectIcon from '../images/MTCONNECT.png';
import opcuaIcon from '../images/OPCUA.png';
import restIcon from '../images/REST.png';
import s7Icon from '../images/S7.png';
import {
  GatewayEntryType,
  gatewayProtocolName,
  GatewayProtocolType,
} from '../schemas';
import style from './gateway-card.module.scss';

// Utility functions
const gatewayProtocolIcon = (protocol: GatewayProtocolType): string => {
  switch (protocol) {
    case 'OPCUA':
      return opcuaIcon;
    case 'MQTT_SERVER':
    case 'MQTT_CLIENT':
      return mqttIcon;
    case 'REST_SERVER':
    case 'REST_CLIENT':
      return restIcon;
    case 'MODBUS_TCP':
    case 'MODBUS_RTU':
      return modbusTcpIcon;
    case 'S7':
      return s7Icon;
    case 'MTCONNECT':
      return mtconnectIcon;
    default:
      throw new Error('Invalid data source type');
  }
};

// Custom component
export const GatewayCard = ({
  isSelected,
  entry,
  onSelect,
  onDelete,
  showDelete,
}: {
  isSelected: boolean;
  entry: GatewayEntryType;
  onSelect: (entry: GatewayEntryType) => void;
  onDelete: (entry: GatewayEntryType) => void;
  showDelete?: boolean;
}) => {
  const { data } = useGatewayStatus(entry.alias);

  // For toggling a gateway ON/OFF
  const turnOnGateway = useTurnOnGateway();
  const turnOffGateway = useTurnOffGateway();

  const onToggle = (entry: GatewayEntryType) => {
    if (entry.is_active) {
      turnOffGateway.mutate(entry.alias, {
        onSuccess: () => {
          toast.success(
            t('common.data_source_successfully_turned_off', entry.name),
            {
              toastId: `success_turn_off_data_source_${entry.alias}`,
            }
          );
        },
      });
    } else {
      turnOnGateway.mutate(entry.alias, {
        onSuccess: () => {
          toast.success(
            t('common.data_source_successfully_turned_on', entry.name),
            {
              toastId: `success_turn_on_data_source_${entry.alias}`,
            }
          );
        },
      });
    }
  };

  return (
    <div
      className={clsx(
        style['gateway-card'],
        isSelected && style['gateway-card--selected']
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(entry);
      }}
    >
      <div
        className={clsx(
          style['gateway-card__header'],
          isSelected && style['gateway-card__header--selected']
        )}
      >
        <span
          className={clsx(
            style['gateway-card__header__name'],
            isSelected && style['gateway-card__header__name--selected']
          )}
          title={entry.name}
        >
          {entry.name}
        </span>
        <GatewayCardStatus gatewayAlias={entry.alias} isSelected={isSelected} />
        {showDelete ? (
          <TrashDelete
            className={style['gateway-card__delete']}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(entry);
            }}
          />
        ) : null}
      </div>
      <div
        className={clsx(
          style['gateway-card__body'],
          isSelected && style['gateway-card__body--selected']
        )}
      >
        <div
          className={clsx(
            style['gateway-card__type'],
            isSelected && style['gateway-card__type--selected']
          )}
        >
          <div
            className={style['gateway-card__type__icon']}
            style={{
              backgroundImage: `url('${gatewayProtocolIcon(entry.type)}')`,
            }}
          />
          <div
            className={clsx(
              style['gateway-card__key-value'],
              style['gateway-card__key-value--type']
            )}
          >
            <span className={style['gateway-card__key-value__key']}>
              {t('common.type')}:
            </span>
            <span
              className={style['gateway-card__key-value__value']}
              title={gatewayProtocolName(entry.type)}
            >
              {gatewayProtocolName(entry.type)}
            </span>
          </div>
        </div>
        <div
          className={clsx(
            style['gateway-card__description'],
            isSelected && style['gateway-card__description--selected']
          )}
        >
          <div className={style['gateway-card__key-value']}>
            <span className={style['gateway-card__key-value__key']}>
              {t('common.description')}:
            </span>
            <span
              className={style['gateway-card__key-value__value']}
              title={entry.description || undefined}
            >
              {entry.description || '---'}
            </span>
          </div>
        </div>
        <ToggleButton
          value={!!data?.is_active}
          onChange={(value) => {
            onToggle({ ...entry, is_active: !value });
          }}
          fontSize={32}
          toggleLoading={turnOffGateway.isPending || turnOnGateway.isPending}
        />
      </div>
    </div>
  );
};

export const ToggleButton = ({
  label,
  value,
  onChange,
  fontSize,
  toggleLoading,
}: {
  label?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  fontSize?: string | number;
  toggleLoading?: boolean;
}) => {
  return (
    <ToggleSwitch
      label={label}
      checked={value}
      onChange={(e) => {
        onChange(e.target.checked);
      }}
      wrapperClassName={style['toggle-switch']}
      wrapperStyles={{
        fontSize,
      }}
      loading={toggleLoading}
    />

    //   <div
    //     className={style['toggle-button']}
    //     onClick={(e) => {
    //       e.stopPropagation();
    //       onChange(!value);
    //     }}
    //   >
    //     {value ? (
    //       <ToggleOn
    //         className={clsx(
    //           style['toggle-on'],
    //           isSelected && style['toggle-on--selected']
    //         )}
    //         width={36}
    //       />
    //     ) : (
    //       <ToggleOff width={36} />
    //     )}
    //     {label ? (
    //       <span className={style['toggle-button__label']}>{label}</span>
    //     ) : null}
    //   </div>
  );
};

export const GatewayCardSimple = ({
  isSelected,
  alias,
  name,
  protocol_alias,
  onSelect,
}: {
  isSelected: boolean;
  alias: string;
  name: string;
  protocol_alias: string;
  onSelect: (alias: string) => void;
}) => {
  return (
    <div
      className={clsx(
        style['gateway-card'],
        isSelected && style['gateway-card--selected']
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(alias);
      }}
    >
      <div
        className={clsx(
          style['gateway-card__header'],
          isSelected && style['gateway-card__header--selected']
        )}
      >
        <span
          className={clsx(
            style['gateway-card__header__name'],
            isSelected && style['gateway-card__header__name--selected']
          )}
          title={name}
        >
          {name}
        </span>
      </div>
      <div
        className={clsx(
          style['gateway-card__body'],
          isSelected && style['gateway-card__body--selected']
        )}
      >
        <div
          className={clsx(
            style['gateway-card__type'],
            isSelected && style['gateway-card__type--selected']
          )}
        >
          <div
            className={style['gateway-card__type__icon']}
            style={{
              backgroundImage: `url('${gatewayProtocolIcon(
                protocol_alias as GatewayProtocolType
              )}')`,
            }}
          />
          <div
            className={clsx(
              style['gateway-card__key-value'],
              style['gateway-card__key-value--type']
            )}
          >
            <span className={style['gateway-card__key-value__key']}>
              {t('common.type')}
            </span>
            <span
              className={style['gateway-card__key-value__value']}
              title={gatewayProtocolName(protocol_alias as GatewayProtocolType)}
            >
              {gatewayProtocolName(protocol_alias as GatewayProtocolType)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const GatewayCardStatus = ({
  gatewayAlias,
  isSelected,
}: {
  gatewayAlias: string;
  isSelected?: boolean;
}) => {
  const { data } = useGatewayStatus(gatewayAlias);

  return (
    <div
      className={clsx(
        style['gateway-card__header__status'],
        isSelected && style['gateway-card__header__status--selected'],
        data?.is_active &&
          data?.is_connected &&
          style['gateway-card__header__status--connected'],
        !data?.is_active && style['gateway-card__header__status--disconnected'],
        data?.is_active &&
          !data?.is_connected &&
          style['gateway-card__header__status--error']
      )}
    >
      {data?.is_active
        ? data?.is_connected
          ? t('common.connected')
          : t('common.error')
        : t('common.disconnected')}
    </div>
  );
};

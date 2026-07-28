import { t, useLanguageSwitcher } from '@digital-twin/utils';
import { useMemo } from 'react';
import { Control, Controller } from 'react-hook-form';

import {
  Checkbox,
  Dropdown,
  DropdownOption,
  Input,
} from '../../../../../input';
import { GatewayDetailsType } from '../schemas';
import style from './gateway-form.module.scss';

// Constants
export const DefaultModbusParams = () => ({
  IP_ADDRESS: '127.0.0.1',
  PORT: '502',
  ZERO_BASED_ADDRESSING: 'false',
  DEFAULT_PAYLOAD_BYTE_ORDER: 'BIG_ENDIAN',
  DEFAULT_UNIT_IDENTIFIER: '1',
  TIMEOUT_S: '10',
  INTERVAL: '1',
});

enum DefaultPayloadByteOrder {
  BIG_ENDIAN = 'BIG_ENDIAN',
  LITTLE_ENDIAN = 'LITTLE_ENDIAN',
  BIG_ENDIAN_BYTE_SWAP = 'BIG_ENDIAN_BYTE_SWAP',
  LITTLE_ENDIAN_BYTE_SWAP = 'LITTLE_ENDIAN_BYTE_SWAP',
}

export const ModbusParams = ({
  control,
  inputBackground = 'default',
}: {
  control: Control<GatewayDetailsType>;
  inputBackground?: 'dark' | 'default';
}) => {
  const { currentLanguage } = useLanguageSwitcher();

  const defaultPayloadByteOrders: DropdownOption[] = useMemo(
    () => [
      {
        value: DefaultPayloadByteOrder.BIG_ENDIAN,
        label: t('common.big_endian'),
      },
      {
        value: DefaultPayloadByteOrder.LITTLE_ENDIAN,
        label: t('common.little_endian'),
      },
      {
        value: DefaultPayloadByteOrder.BIG_ENDIAN_BYTE_SWAP,
        label: t('common.big_endian_byte_swap'),
      },
      {
        value: DefaultPayloadByteOrder.LITTLE_ENDIAN_BYTE_SWAP,
        label: t('common.little_endian_byte_swap'),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentLanguage]
  );

  return (
    <>
      <div className={style['split-horizontal']}>
        <Controller
          name="params.IP_ADDRESS"
          control={control}
          render={({ field: { value, onChange } }) => (
            <Input
              key="modbus"
              wrapperProps={{ className: style['split-horizontal__item'] }}
              label={t('common.ip_address')}
              value={value || ''}
              onChange={onChange}
              placeholder="127.0.0.1"
              inputProps={{ required: true }}
              background={inputBackground}
            />
          )}
        />
        <Controller
          name="params.PORT"
          control={control}
          render={({ field: { value, onChange } }) => (
            <Input
              wrapperProps={{ className: style['split-horizontal__item'] }}
              label={t('common.port')}
              value={value || ''}
              onChange={onChange}
              type="number"
              placeholder="502"
              inputProps={{ required: true, max: 65535, min: 0 }}
              background={inputBackground}
            />
          )}
        />
      </div>
      <Controller
        name="params.ZERO_BASED_ADDRESSING"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Checkbox
            label={t('common.zero_based_addressing')}
            value={value === 'true'}
            onChange={(_, checked) => {
              onChange(String(checked));
            }}
            wrapperStyle={{ width: '100%' }}
            labelStyle={{ width: 0 }}
          />
        )}
      />
      <Controller
        name="params.DEFAULT_PAYLOAD_BYTE_ORDER"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Dropdown
            label={t('common.default_payload_byte_order') + ':'}
            options={defaultPayloadByteOrders}
            value={value}
            onChange={onChange}
            background={inputBackground}
          />
        )}
      />
      <Controller
        name="params.DEFAULT_UNIT_IDENTIFIER"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Input
            label={t('common.default_unit_identifier')}
            value={value || ''}
            onChange={onChange}
            placeholder="1"
            inputProps={{ required: true, min: 0, max: 255 }}
            background={inputBackground}
          />
        )}
      />
      <Controller
        name="params.TIMEOUT_S"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Input
            label={t('common.timeout_seconds')}
            value={value || ''}
            onChange={onChange}
            type="number"
            placeholder="10"
            inputProps={{ required: true, min: 1 }}
            background={inputBackground}
          />
        )}
      />
      <Controller
        name="params.INTERVAL"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Input
            label={t('common.interval_seconds')}
            value={value || ''}
            onChange={onChange}
            type="number"
            placeholder="1"
            inputProps={{ required: true, min: 1 }}
            background={inputBackground}
          />
        )}
      />
    </>
  );
};

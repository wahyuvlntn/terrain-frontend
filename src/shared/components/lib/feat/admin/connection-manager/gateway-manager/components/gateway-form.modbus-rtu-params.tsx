// For managing form
import { t } from '@digital-twin/utils';
import { Control, Controller } from 'react-hook-form';

// Reusables
import {
  Checkbox,
  Dropdown,
  DropdownOption,
  Input,
} from '../../../../../input';
// Schemas
import { GatewayDetailsType } from '../schemas';
// Style
import style from './gateway-form.module.scss';

// Constants
enum DataBits {
  BIT_7 = '7',
  BIT_8 = '8',
}

enum Parity {
  NONE = 'NONE',
  ODD = 'ODD',
  EVEN = 'EVEN',
}

enum StopBits {
  BIT_1 = '1',
  BIT_2 = '2',
}

enum DefaultPayloadByteOrder {
  BIG_ENDIAN = 'BIG_ENDIAN',
  LITTLE_ENDIAN = 'LITTLE_ENDIAN',
  BIG_ENDIAN_BYTE_SWAP = 'BIG_ENDIAN_BYTE_SWAP',
  LITTLE_ENDIAN_BYTE_SWAP = 'LITTLE_ENDIAN_BYTE_SWAP',
}

const dataBits: DropdownOption[] = [
  { value: DataBits.BIT_7, label: DataBits.BIT_7 },
  { value: DataBits.BIT_8, label: DataBits.BIT_8 },
];

const stopBits: DropdownOption[] = [
  { value: StopBits.BIT_1, label: StopBits.BIT_1 },
  { value: StopBits.BIT_2, label: StopBits.BIT_2 },
];

export const DefaultModbusRTUParams = () => ({
  SERIAL_PORT: 'COM1',
  BAUD_RATE: '9600',
  DATA_BITS: '8',
  PARITY: 'NONE',
  STOP_BITS: '2',
  ZERO_BASED_ADDRESSING: 'false',
  DEFAULT_PAYLOAD_BYTE_ORDER: 'BIG_ENDIAN',
  DEFAULT_UNIT_IDENTIFIER: '1',
  TIMEOUT_S: '10',
  INTERVAL_S: '1',
});

export const ModbusRTUParams = ({
  control,
  inputBackground = 'default',
}: {
  control: Control<GatewayDetailsType>;
  inputBackground?: 'dark' | 'default';
}) => {
  const parities: DropdownOption[] = [
    { value: Parity.NONE, label: t('common.none') },
    { value: Parity.EVEN, label: t('common.even') },
    { value: Parity.ODD, label: t('common.odd') },
  ];

  const defaultPayloadByteOrders: DropdownOption[] = [
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
  ];

  return (
    <>
      <Controller
        name="params.SERIAL_PORT"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Input
            wrapperProps={{ className: style['split-horizontal__item'] }}
            label={t('common.serial_port')}
            value={value || ''}
            onChange={onChange}
            placeholder="COM1"
            inputProps={{ required: true }}
            background={inputBackground}
          />
        )}
      />
      <Controller
        name="params.BAUD_RATE"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Input
            wrapperProps={{ className: style['split-horizontal__item'] }}
            label={t('common.baud_rate')}
            value={value || ''}
            onChange={onChange}
            type="number"
            placeholder="9600"
            inputProps={{ required: true, max: 65535, min: 0 }}
            background={inputBackground}
          />
        )}
      />
      <Controller
        name="params.DATA_BITS"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Dropdown
            label={t('common.data_bits') + ':'}
            options={dataBits}
            value={value}
            onChange={onChange}
            background={inputBackground}
          />
        )}
      />
      <Controller
        name="params.PARITY"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Dropdown
            label={t('common.parity') + ':'}
            options={parities}
            value={value}
            onChange={onChange}
            background={inputBackground}
          />
        )}
      />
      <Controller
        name="params.STOP_BITS"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Dropdown
            label={t('common.stop_bits') + ':'}
            options={stopBits}
            value={value}
            onChange={onChange}
            background={inputBackground}
          />
        )}
      />
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
            wrapperProps={{ className: style['split-horizontal__item'] }}
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
            wrapperProps={{ className: style['split-horizontal__item'] }}
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
        name="params.INTERVAL_S"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Input
            wrapperProps={{ className: style['split-horizontal__item'] }}
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

import { InformationCircle } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import { useLanguageSwitcher } from '@digital-twin/utils';
import { useEffect, useMemo } from 'react';

import { Dropdown, DropdownOption, Input } from '../../../../../input';
import { Popover, PopoverContent, PopoverTrigger } from '../../../../../others';
import style from './tag-address-input.module.scss';

const DEFAULT_VALUE = '-1';

type Tag = {
  address: string;
  dataType: string;
  unitIdentifier: string;
  byteOrder: string;
};

const DEFAULT_TAG: Tag = {
  address: '',
  dataType: '',
  unitIdentifier: '',
  byteOrder: DEFAULT_VALUE,
};

const dataTypes: DropdownOption[] = [
  { value: 'BOOL', label: 'BOOL - boolean' },
  { value: 'INT', label: 'INT - 16-bit signed integer' },
  { value: 'UINT', label: 'UINT - 16-bit unsigned integer' },
  { value: 'DINT', label: 'DINT - 32-bit signed integer' },
  { value: 'UDINT', label: 'UDINT - 32-bit unsigned integer' },
  { value: 'LINT', label: 'LINT - 64-bit signed integer' },
  { value: 'ULINT', label: 'ULINT - 64-bit unsigned integer' },
  { value: 'REAL', label: 'REAL - 32-bit floating point value' },
  { value: 'LREAL', label: 'LREAL - 64-bit floating point value' },
  { value: 'STRING', label: 'STRING - UTF-8 encoded string' },
];

const FULL_ADDRESS_REGEX =
  /(^([0134])\d*(?:\.\d*)?)?(?::([a-zA-Z_]+))?(?:\{(.*?)})?$/;
const KV_REGEX =
  /([\w\-_]+):\s*(-?\d+.\d+|-?\d+|"[^"]*"|'[^']*'|true|false),?/g;
const ADDRESS_REGEX = /^[0134]\d{0,5}(?:\.\d{0,3})?$/;

export const ModbusAddress = ({
  value,
  onChange,
  isError,
  useDefault = true,
}: {
  value: string;
  onChange: (value: string) => void;
  isError?: boolean;
  useDefault?: boolean;
}) => {
  const { currentLanguage } = useLanguageSwitcher();

  const byteOrders: DropdownOption[] = useMemo(
    () => [
      { value: DEFAULT_VALUE, label: t('common.default') },
      { value: 'BIG_ENDIAN', label: 'BIG_ENDIAN' },
      { value: 'LITTLE_ENDIAN', label: 'LITTLE_ENDIAN' },
      { value: 'BIG_ENDIAN_BYTE_SWAP', label: 'BIG_ENDIAN_BYTE_SWAP' },
      { value: 'LITTLE_ENDIAN_BYTE_SWAP', label: 'LITTLE_ENDIAN_BYTE_SWAP' },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentLanguage]
  );

  // Parse additional value, separating it to address & data type
  const tag: Tag = useMemo(() => {
    if (!value) {
      return DEFAULT_TAG;
    }

    // Match using ADDRESS_REGEX
    const match = FULL_ADDRESS_REGEX.exec(value);

    if (!match) {
      return DEFAULT_TAG;
    }

    // address capturing group
    const address = match[1] ?? '';

    // datatype capturing group
    const dataType = match[3] ?? 'INT';

    // config capturing group
    const config = match[4];

    let unitIdentifier = '';
    let byteOrder = DEFAULT_VALUE;

    if (config !== undefined) {
      for (
        let match = KV_REGEX.exec(config);
        match !== null;
        match = KV_REGEX.exec(config)
      ) {
        const key = match[1];
        const value = match[2];

        if (key !== undefined && value !== undefined) {
          switch (key) {
            case 'unit-id':
              unitIdentifier = value;
              break;
            case 'byte-order':
              // byte-order value has quote, so we need JSON.parse
              try {
                const parsed = JSON.parse(value);
                if (typeof parsed === 'string') {
                  byteOrder = parsed;
                }
              } catch (e) {
                // Ignore error
              }
              break;
          }
        }
      }
    }

    return {
      address,
      dataType,
      unitIdentifier,
      byteOrder,
    };
  }, [value]);

  const { address, dataType, unitIdentifier, byteOrder } = tag;

  const handleChange = (tag: Partial<Tag>) => {
    const addressValue = tag?.address ?? address;
    const dataTypeValue = tag?.dataType ?? dataType;
    const unitIdentifierValue = tag?.unitIdentifier ?? unitIdentifier;
    const byteOrderValue = tag?.byteOrder ?? byteOrder;

    const options: string[] = [];
    if (unitIdentifierValue || byteOrderValue !== DEFAULT_VALUE) {
      if (unitIdentifierValue) {
        options.push(`unit-id: ${unitIdentifierValue}`);
      }

      if (byteOrderValue !== DEFAULT_VALUE) {
        options.push(`byte-order: "${byteOrderValue}"`);
      }
    }
    const optionString = options.length > 0 ? `{${options.join(',')}}` : '';

    onChange(`${addressValue}:${dataTypeValue}${optionString}`);
  };

  // Set initial value
  useEffect(() => {
    if (useDefault && !dataType) {
      const timer = setTimeout(() => {
        handleChange({ dataType: 'INT' });
      }, 0);
      return () => {
        clearTimeout(timer);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useDefault, dataType]);

  return (
    <>
      <div className={style['row']}>
        <Input
          label={t('common.address') + ':'}
          value={address}
          placeholder="400001"
          onChange={(e) => {
            const { value } = e.target;

            if (value !== '' && !ADDRESS_REGEX.test(value)) {
              return;
            }

            handleChange({ address: value });
          }}
          inputProps={{ required: true }}
          wrapperProps={{
            className: style['column'],
          }}
          background="dark"
          isError={isError}
          prefix={
            <Popover offset={10} placement="bottom-start">
              <PopoverTrigger>
                <div className={style['info-icon-container']}>
                  <InformationCircle />
                </div>
              </PopoverTrigger>
              <PopoverContent className={style['info']}>
                <span className={style['info__title']}>
                  {t('common.address') + ':'}
                </span>
                <span>{`{memory-area}{start-address}[.{bit-offset | string-length}]`}</span>
                <span className={style['info__title']}>Memory Areas:</span>
                <span>{`Coil -> "0" - BOOLEAN`}</span>
                <span>{`Discrete Input -> "1" - BOOLEAN`}</span>
                <span>{`Input Register -> "3"`}</span>
                <span>{`Holding Register -> "4"`}</span>
                <span className={style['info__title']}>
                  {t('common.example')}:
                </span>
                <span>{`010001`}</span>
                <span>{`410001.1 (BOOLEAN - registers)`}</span>
                <span>{`410001.100 (STRING - registers)`}</span>
              </PopoverContent>
            </Popover>
          }
        />
      </div>
      <div className={style['row']}>
        <Dropdown
          label={t('common.data_type') + ':'}
          options={dataTypes}
          value={dataType}
          onChange={(value) => {
            handleChange({ dataType: value });
          }}
          wrapperClassName={style['column']}
          wrapperStyles={{ width: 0 }}
          background="dark"
        />
      </div>
      <div className={style['row']}>
        <Input
          label={t('common.unit_identifier') + ':'}
          value={unitIdentifier ?? ''}
          placeholder={t('common.default')}
          onChange={(e) => {
            handleChange({ unitIdentifier: e.target.value });
          }}
          inputProps={{ max: 255, min: 0 }}
          wrapperProps={{
            className: style['column'],
          }}
          background="dark"
          isError={isError}
          prefix={
            <Popover offset={10} placement="bottom-start">
              <PopoverTrigger>
                <div className={style['info-icon-container']}>
                  <InformationCircle />
                </div>
              </PopoverTrigger>
              <PopoverContent className={style['info']}>
                <span>0 - 255</span>
              </PopoverContent>
            </Popover>
          }
          type="number"
        />
      </div>
      <div className={style['row']}>
        <Dropdown
          label={t('common.payload_byte_order') + ':'}
          options={byteOrders}
          value={byteOrder ?? DEFAULT_VALUE}
          onChange={(value) => {
            handleChange({ byteOrder: value });
          }}
          wrapperClassName={style['column']}
          wrapperStyles={{ width: 0 }}
          background="dark"
        />
      </div>
    </>
  );
};

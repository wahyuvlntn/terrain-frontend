// React builtins
// Reusables
import { AddCircle, CriticalAlarm } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import { useMemo } from 'react';
// For managing form
import { Control, Controller, UseFormWatch } from 'react-hook-form';

import {
  Checkbox,
  Dropdown,
  DropdownOption,
  Input,
} from '../../../../../input';
// Schemas
import { GatewayDetailsType, keyValuesSchema } from '../schemas';
// Custom components
import { ExpectedOutput, Expression } from './gateway-form.expression';
// Style
import style from './gateway-form.module.scss';

// Constants
enum Method {
  GET = 'GET',
  POST = 'POST',
}

const methods: DropdownOption[] = [
  { value: Method.GET, label: Method.GET },
  { value: Method.POST, label: Method.POST },
];

export const DefaultRESTClientParams = () => ({
  URL: 'https://127.0.0.1:3000/path-to-api',
  METHOD: Method.GET,
  PARAM: '[]',
  HEADER: '[]',
  BODY: '[]',
  BASIC_AUTHENTICATION: 'true',
  USERNAME: 'admin',
  PASSWORD: 'admin',
  INTERVAL: '1',
  TIMEOUT: '10',
  CUSTOM_MAPPING: 'false',
  EXPRESSION: `/*
output type:
{
  "<address>":"string | string[] | {v: string, t: number, q: number} | {v: string, t: number, q: number}[]",
}

use "response" as REST response
*/

output = response`,
});

// Custom component
const KeyValues = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => {
  const keyValues = useMemo(() => {
    try {
      // Parse the JSON
      const parsed = JSON.parse(value);

      // Validate its schema
      return keyValuesSchema.parse(parsed);
    } catch (e) {
      return [];
    }
  }, [value]);

  return (
    <div className={style['key-values']}>
      <div className={style['key-values__header']}>
        <span className={style['key-values__header__label']}>{label}</span>
        <AddCircle
          className={style['key-values__header__add']}
          onClick={(e) => {
            e.stopPropagation();
            keyValues.push({ key: '', value: '' });
            onChange(JSON.stringify(keyValues));
          }}
        />
      </div>
      <div className={style['key-values__content']}>
        {keyValues.map((kv, i) => (
          <div key={i} className={style['key-value']}>
            <Input
              wrapperProps={{ className: style['key-value__input'] }}
              value={kv.key}
              onChange={(e) => {
                kv.key = e.target.value;
                onChange(JSON.stringify(keyValues));
              }}
              background="dark"
            />
            :
            <Input
              wrapperProps={{ className: style['key-value__input'] }}
              value={kv.value}
              onChange={(e) => {
                kv.value = e.target.value;
                onChange(JSON.stringify(keyValues));
              }}
              background="dark"
            />
            <CriticalAlarm
              className={style['key-value__delete']}
              onClick={(e) => {
                e.stopPropagation();
                onChange(
                  JSON.stringify(keyValues.filter((_kv, index) => index !== i))
                );
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export const RESTClientParams = ({
  control,
  watch,
  inputBackground = 'default',
}: {
  control: Control<GatewayDetailsType>;
  watch: UseFormWatch<GatewayDetailsType>;
  inputBackground?: 'dark' | 'default';
}) => {
  const method = watch('params.METHOD', Method.GET);
  const basicAuthentication = watch('params.BASIC_AUTHENTICATION', 'true');
  const customMapping = watch('params.CUSTOM_MAPPING', 'false');

  return (
    <>
      <Controller
        name="params.URL"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Input
            label="URL:"
            value={value || ''}
            onChange={onChange}
            placeholder="https://127.0.0.1:3000/path-to-api"
            inputProps={{ required: true }}
            background={inputBackground}
          />
        )}
      />
      <Controller
        name="params.METHOD"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Dropdown
            label={t('common.method') + ':'}
            options={methods}
            value={value}
            onChange={onChange}
            background={inputBackground}
          />
        )}
      />
      <Controller
        name="params.PARAM"
        control={control}
        render={({ field: { value, onChange } }) => (
          <KeyValues
            label={t('common.param') + ':'}
            value={value || '[]'}
            onChange={onChange}
          />
        )}
      />
      <Controller
        name="params.HEADER"
        control={control}
        render={({ field: { value, onChange } }) => (
          <KeyValues
            label={t('common.header') + ':'}
            value={value || '[]'}
            onChange={onChange}
          />
        )}
      />
      <Controller
        name="params.BODY"
        control={control}
        render={({ field: { value, onChange } }) =>
          method === Method.POST ? (
            <KeyValues
              label={t('common.body_json') + ':'}
              value={value || '[]'}
              onChange={onChange}
            />
          ) : (
            <></>
          )
        }
      />
      <Controller
        name="params.BASIC_AUTHENTICATION"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Checkbox
            label={t('common.basic_authentication')}
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
        name="params.USERNAME"
        control={control}
        render={({ field: { value, onChange } }) =>
          basicAuthentication === 'true' ? (
            <Input
              label={t('common.username') + ':'}
              value={value || ''}
              onChange={onChange}
              inputProps={{ required: true }}
              background={inputBackground}
            />
          ) : (
            <></>
          )
        }
      />
      <Controller
        name="params.PASSWORD"
        control={control}
        render={({ field: { value, onChange } }) =>
          basicAuthentication === 'true' ? (
            <Input
              label={t('common.password') + ':'}
              value={value || ''}
              onChange={onChange}
              inputProps={{ required: true }}
              type="password"
              background={inputBackground}
            />
          ) : (
            <></>
          )
        }
      />
      <Controller
        name="params.INTERVAL"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Input
            label={t('common.interval_seconds') + ':'}
            value={value || ''}
            onChange={onChange}
            type="number"
            placeholder="1"
            inputProps={{ required: true, min: 1 }}
            background={inputBackground}
          />
        )}
      />
      <Controller
        name="params.TIMEOUT"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Input
            label={t('common.timeout_seconds') + ':'}
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
        name="params.CUSTOM_MAPPING"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Checkbox
            label={t('common.custom_mapping')}
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
        name="params.EXPRESSION"
        control={control}
        render={({ field: { value, onChange } }) =>
          customMapping === 'true' ? (
            <Expression
              label={t('common.expression')}
              value={value || ''}
              onChange={onChange}
            />
          ) : (
            <></>
          )
        }
      />
      <ExpectedOutput />
    </>
  );
};

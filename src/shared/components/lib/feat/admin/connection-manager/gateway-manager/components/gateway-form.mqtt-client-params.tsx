// For managing form
import { t } from '@digital-twin/utils';
import { Control, Controller, UseFormWatch } from 'react-hook-form';

// Reusables
import { Checkbox, Input } from '../../../../../input';
// Schemas
import { GatewayDetailsType } from '../schemas';
// Custom components
import { ExpectedOutput, Expression } from './gateway-form.expression';

// Constants
export const DefaultMQTTClientParams = () => ({
  URL: 'mqtts://127.0.0.1:1221',
  CLIENT_ID: 'mqtt-112233',
  USE_AUTHENTICATION: 'true',
  USERNAME: 'admin',
  PASSWORD: 'admin',
  TOPIC: 'topic',
  KEEP_ALIVE: '60',
  RECONNECT_PERIOD: '60',
  CONNECT_TIMEOUT: '60',
  CUSTOM_MAPPING: 'false',
  EXPRESSION: `/*
output type:
{
  "<address>":"string | string[] | {v: string, t: number, q: number} | {v: string, t: number, q: number}[]",
}

use "response" as MQTT response
*/

output = response`,
});

export const MQTTClientParams = ({
  control,
  watch,
  inputBackground = 'default',
}: {
  control: Control<GatewayDetailsType>;
  watch: UseFormWatch<GatewayDetailsType>;
  inputBackground?: 'dark' | 'default';
}) => {
  const useAuthentication = watch('params.USE_AUTHENTICATION', 'true');
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
            placeholder="mqtts://127.0.0.1:1221"
            inputProps={{ required: true }}
            background={inputBackground}
          />
        )}
      />
      <Controller
        name="params.CLIENT_ID"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Input
            label={t('common.client_id')}
            value={value || ''}
            onChange={onChange}
            placeholder="mqtt-112233"
            inputProps={{ required: true }}
            background={inputBackground}
          />
        )}
      />
      <Controller
        name="params.USE_AUTHENTICATION"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Checkbox
            label={t('common.use_authentication')}
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
          useAuthentication === 'true' ? (
            <Input
              label={t('common.username')}
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
          useAuthentication === 'true' ? (
            <Input
              label={t('common.password')}
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
        name="params.TOPIC"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Input
            label={t('common.topic')}
            value={value || ''}
            onChange={onChange}
            placeholder="topic"
            inputProps={{ required: true }}
            background={inputBackground}
          />
        )}
      />
      <Controller
        name="params.KEEP_ALIVE"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Input
            label={t('common.keep_alive_seconds')}
            value={value || ''}
            onChange={onChange}
            type="number"
            placeholder="60"
            inputProps={{ required: true, min: 1 }}
            background={inputBackground}
          />
        )}
      />
      <Controller
        name="params.RECONNECT_PERIOD"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Input
            label={t('common.reconnect_period_seconds')}
            value={value || ''}
            onChange={onChange}
            type="number"
            placeholder="60"
            inputProps={{ required: true, min: 1 }}
            background={inputBackground}
          />
        )}
      />
      <Controller
        name="params.CONNECT_TIMEOUT"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Input
            label={t('common.connect_timeout_seconds')}
            value={value || ''}
            onChange={onChange}
            type="number"
            placeholder="60"
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

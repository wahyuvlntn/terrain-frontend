// For managing form
import { t } from '@digital-twin/utils';
import { Control, Controller, UseFormWatch } from 'react-hook-form';

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
enum Policy {
  NONE = 'None',
  BASIC_128_RSA_15 = 'Basic 128 Rsa 15',
  BASIC_256 = 'Basic 256',
  BASIC_256_SHA_256 = 'Basic 256 Sha 256',
}

enum Encryption {
  NONE = 'None',
  SIGN = 'Sign',
  SIGN_AND_ENCRYPT = 'Sign and Encrypt',
}

enum PublishType {
  ALL = 'ALL',
  ONLY_CHANGES = 'ONLY_CHANGES',
}

const policies: DropdownOption[] = [
  { value: Policy.NONE, label: Policy.NONE },
  { value: Policy.BASIC_128_RSA_15, label: Policy.BASIC_128_RSA_15 },
  { value: Policy.BASIC_256, label: Policy.BASIC_256 },
  { value: Policy.BASIC_256_SHA_256, label: Policy.BASIC_256_SHA_256 },
];

const encryptions: DropdownOption[] = [
  { value: Encryption.NONE, label: Encryption.NONE },
  { value: Encryption.SIGN, label: Encryption.SIGN },
  { value: Encryption.SIGN_AND_ENCRYPT, label: Encryption.SIGN_AND_ENCRYPT },
];

export const DefaultOPCUAParams = () => ({
  IP_ADDRESS: '127.0.0.1',
  PORT: '49320',
  SERVER_NAME: '',
  POLICY: Policy.NONE,
  ENCRYPTION: Encryption.NONE,
  USE_ANONYMOUS_LOGIN: 'true',
  USERNAME: 'admin',
  PASSWORD: 'admin',
  PUBLISH_TYPE: PublishType.ALL,
  INTERVAL: '1',
  PUBLISHING_INTERVAL: '500',
  LIFE_TIME_COUNT: '60',
  MAX_KEEP_ALIVE_COUNT: '10',
  MAX_NOTIFICATION_PER_PUBLISH: '10000',
  PRIORITY: '10',
  QUEUE_SIZE: '1',
  DISCARD_OLDEST: 'true',
});

export const OPCUAParams = ({
  control,
  watch,
  inputBackground = 'default',
}: {
  control: Control<GatewayDetailsType>;
  watch: UseFormWatch<GatewayDetailsType>;
  inputBackground?: 'dark' | 'default';
}) => {
  const policy = watch('params.POLICY', Policy.NONE);
  const useAnonymousLogin = watch('params.USE_ANONYMOUS_LOGIN', 'true');

  const publishTypes: DropdownOption[] = [
    { value: PublishType.ALL, label: t('common.all') },
    { value: PublishType.ONLY_CHANGES, label: t('common.only_changes') },
  ];

  return (
    <>
      <div className={style['split-horizontal']}>
        <Controller
          name="params.IP_ADDRESS"
          control={control}
          render={({ field: { value, onChange } }) => (
            <Input
              wrapperProps={{ className: style['split-horizontal__item'] }}
              label={t('common.ip_address') + ':'}
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
              label={t('common.port') + ':'}
              value={value || ''}
              onChange={onChange}
              type="number"
              placeholder="49320"
              inputProps={{ required: true, max: 65535, min: 0 }}
              background={inputBackground}
            />
          )}
        />
      </div>
      <Controller
        name="params.SERVER_NAME"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Input
            label={t('common.server_name') + ':'}
            value={value || ''}
            onChange={onChange}
            background={inputBackground}
          />
        )}
      />
      <Controller
        name="params.POLICY"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Dropdown
            label={t('common.policy') + ':'}
            options={policies}
            value={value}
            onChange={onChange}
            background={inputBackground}
          />
        )}
      />
      <Controller
        name="params.ENCRYPTION"
        control={control}
        render={({ field: { value, onChange } }) =>
          policy !== Policy.NONE ? (
            <Dropdown
              label={t('common.encryption') + ':'}
              options={encryptions}
              value={value}
              onChange={onChange}
              background={inputBackground}
            />
          ) : (
            <></>
          )
        }
      />
      <Controller
        name="params.USE_ANONYMOUS_LOGIN"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Checkbox
            label={t('common.use_anonymous_login')}
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
          useAnonymousLogin !== 'true' ? (
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
          useAnonymousLogin !== 'true' ? (
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
        name="params.PUBLISH_TYPE"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Dropdown
            label={t('common.publish_type') + ':'}
            options={publishTypes}
            value={value}
            onChange={onChange}
            background={inputBackground}
          />
        )}
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
        name="params.PUBLISHING_INTERVAL"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Input
            label={t('common.publishing_interval_ms') + ':'}
            value={value || ''}
            onChange={onChange}
            type="number"
            placeholder="500"
            inputProps={{ required: true, min: 1 }}
            background={inputBackground}
          />
        )}
      />
      <Controller
        name="params.LIFE_TIME_COUNT"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Input
            label={t('common.life_time_count') + ':'}
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
        name="params.MAX_KEEP_ALIVE_COUNT"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Input
            label={t('common.max_keep_alive_count') + ':'}
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
        name="params.MAX_NOTIFICATION_PER_PUBLISH"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Input
            label={t('common.max_notification_per_publish') + ':'}
            value={value || ''}
            onChange={onChange}
            type="number"
            placeholder="10000"
            inputProps={{ required: true, min: 1 }}
            background={inputBackground}
          />
        )}
      />
      <Controller
        name="params.PRIORITY"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Input
            label={t('common.priority') + ':'}
            value={value || ''}
            onChange={onChange}
            type="number"
            placeholder="10"
            inputProps={{ required: true, min: 0 }}
            background={inputBackground}
          />
        )}
      />
      <Controller
        name="params.QUEUE_SIZE"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Input
            label={t('common.queue_size') + ':'}
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
        name="params.DISCARD_OLDEST"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Checkbox
            label={t('common.discard_oldest')}
            value={value === 'true'}
            onChange={(_, checked) => {
              onChange(String(checked));
            }}
            wrapperStyle={{ width: '100%' }}
            labelStyle={{ width: 0 }}
          />
        )}
      />
    </>
  );
};

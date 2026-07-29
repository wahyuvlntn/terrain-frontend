// For managing form
import { t } from '@digital-twin/utils';
import { Control, Controller } from 'react-hook-form';

// Reusables
import { Input } from '../../../../../input';
// Schemas
import { GatewayDetailsType } from '../schemas';
// Style
import style from './gateway-form.module.scss';

// Constants
export const DefaultMTConnectParams = () => ({
  HOST: '127.0.0.1',
  PORT: '5610',
  DEVICE_NAME: 'Mazak',
  TIMEOUT: '10',
  INTERVAL: '1',
});

export const MTConnectParams = ({
  control,
  inputBackground = 'default',
}: {
  control: Control<GatewayDetailsType>;
  inputBackground?: 'dark' | 'default';
}) => {
  return (
    <>
      <div className={style['split-horizontal']}>
        <Controller
          name="params.HOST"
          control={control}
          render={({ field: { value, onChange } }) => (
            <Input
              wrapperProps={{ className: style['split-horizontal__item'] }}
              label={t('common.host') + ':'}
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
              placeholder="5610"
              inputProps={{ required: true, max: 65535, min: 0 }}
              background={inputBackground}
            />
          )}
        />
      </div>
      <Controller
        name="params.DEVICE_NAME"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Input
            label={t('common.device_name') + ':'}
            value={value || ''}
            onChange={onChange}
            placeholder="Mazak"
            inputProps={{ required: true }}
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
    </>
  );
};

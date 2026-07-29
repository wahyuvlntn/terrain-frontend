import { t } from '@digital-twin/utils';
import { Control, Controller } from 'react-hook-form';

import { Dropdown, DropdownOption, Input } from '../../../../../input';
import { GatewayDetailsType } from '../schemas';
import style from './gateway-form.module.scss';

// Constants
export const DefaultS7Params = () => ({
  IP_ADDRESS: '127.0.0.1',
  PORT: '102',
  LOCAL_RACK: '0',
  LOCAL_SLOT: '0',
  REMOTE_RACK: '0',
  REMOTE_SLOT: '0',
  PDU_SIZE: '1024',
  MAX_AMQ_CALLER: '8',
  MAX_AMQ_CALLEE: '8',
  CONTROLLER_TYPE: 'S7_300',
  INTERVAL: '1',
  FIRST_WORD_LOW: 'true',
  FIRST_DWORD_LOW: 'true',
});

const controllerTypes: DropdownOption[] = [
  { value: 'S7_300', label: 'S7-300' },
  { value: 'S7_400', label: 'S7-400' },
  { value: 'S7_1200', label: 'S7-1200' },
  { value: 'S7_1500', label: 'S7-1500' },
];

export const S7Params = ({
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
              placeholder="102"
              inputProps={{ required: true, max: 65535, min: 0 }}
              background={inputBackground}
            />
          )}
        />
      </div>
      <div className={style['split-horizontal']}>
        <Controller
          name="params.LOCAL_RACK"
          control={control}
          render={({ field: { value, onChange } }) => (
            <Input
              wrapperProps={{ className: style['split-horizontal__item'] }}
              label={t('common.local_rack') + ':'}
              value={value || ''}
              onChange={onChange}
              placeholder="0"
              inputProps={{ required: true, min: 0 }}
              background={inputBackground}
            />
          )}
        />
        <Controller
          name="params.LOCAL_SLOT"
          control={control}
          render={({ field: { value, onChange } }) => (
            <Input
              wrapperProps={{ className: style['split-horizontal__item'] }}
              label={t('common.local_slot') + ':'}
              value={value || ''}
              onChange={onChange}
              type="number"
              placeholder="0"
              inputProps={{ required: true, min: 0 }}
              background={inputBackground}
            />
          )}
        />
      </div>
      <div className={style['split-horizontal']}>
        <Controller
          name="params.REMOTE_RACK"
          control={control}
          render={({ field: { value, onChange } }) => (
            <Input
              wrapperProps={{ className: style['split-horizontal__item'] }}
              label={t('common.remote_rack') + ':'}
              value={value || ''}
              onChange={onChange}
              placeholder="0"
              inputProps={{ required: true, min: 0 }}
              background={inputBackground}
            />
          )}
        />
        <Controller
          name="params.REMOTE_SLOT"
          control={control}
          render={({ field: { value, onChange } }) => (
            <Input
              wrapperProps={{ className: style['split-horizontal__item'] }}
              label={t('common.remote_slot') + ':'}
              value={value || ''}
              onChange={onChange}
              type="number"
              placeholder="0"
              inputProps={{ required: true, min: 0 }}
              background={inputBackground}
            />
          )}
        />
      </div>
      <Controller
        name="params.PDU_SIZE"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Input
            label={t('common.pdu_size') + ':'}
            value={value || ''}
            onChange={onChange}
            type="number"
            placeholder="1024"
            inputProps={{ required: true, min: 1 }}
            background={inputBackground}
          />
        )}
      />
      <div className={style['split-horizontal']}>
        <Controller
          name="params.MAX_AMQ_CALLER"
          control={control}
          render={({ field: { value, onChange } }) => (
            <Input
              wrapperProps={{ className: style['split-horizontal__item'] }}
              label={t('common.max_amq_caller') + ':'}
              value={value || ''}
              onChange={onChange}
              placeholder="8"
              inputProps={{ required: true, min: 1 }}
              background={inputBackground}
            />
          )}
        />
        <Controller
          name="params.MAX_AMQ_CALLEE"
          control={control}
          render={({ field: { value, onChange } }) => (
            <Input
              wrapperProps={{ className: style['split-horizontal__item'] }}
              label={t('common.max_amq_callee') + ':'}
              value={value || ''}
              onChange={onChange}
              type="number"
              placeholder="8"
              inputProps={{ required: true, min: 0 }}
              background={inputBackground}
            />
          )}
        />
      </div>
      <Controller
        name="params.CONTROLLER_TYPE"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Dropdown
            label={t('common.controller_type') + ':'}
            options={controllerTypes}
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
    </>
  );
};

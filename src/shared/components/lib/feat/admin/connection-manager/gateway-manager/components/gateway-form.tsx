// For managing form
import { Sync } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import {
  Control,
  Controller,
  UseFormSetValue,
  UseFormWatch,
} from 'react-hook-form';

// Reusables
import { Dropdown, DropdownOption, Input, TextBox } from '../../../../../input';
// Schemas
import { GatewayDetailsType, gatewayProtocolName } from '../schemas';
import {
  DefaultModbusParams,
  ModbusParams,
} from './gateway-form.modbus-params';
import {
  DefaultModbusRTUParams,
  ModbusRTUParams,
} from './gateway-form.modbus-rtu-params';
// Style
import style from './gateway-form.module.scss';
import {
  DefaultMQTTClientParams,
  MQTTClientParams,
} from './gateway-form.mqtt-client-params';
import {
  DefaultMQTTServerParams,
  MQTTServerParams,
} from './gateway-form.mqtt-server-params';
import {
  DefaultMTConnectParams,
  MTConnectParams,
} from './gateway-form.mtconnect-params';
// Custom components
import { DefaultOPCUAParams, OPCUAParams } from './gateway-form.opcua-params';
import {
  DefaultRESTClientParams,
  RESTClientParams,
} from './gateway-form.rest-client-params';
import {
  DefaultRESTServerParams,
  RESTServerParams,
} from './gateway-form.rest-server-params';
import { DefaultS7Params, S7Params } from './gateway-form.s7-params';

// Constants
const types: DropdownOption[] = [
  { value: 'OPCUA', label: gatewayProtocolName('OPCUA') },
  { value: 'MQTT_SERVER', label: gatewayProtocolName('MQTT_SERVER') },
  { value: 'MQTT_CLIENT', label: gatewayProtocolName('MQTT_CLIENT') },
  { value: 'REST_SERVER', label: gatewayProtocolName('REST_SERVER') },
  { value: 'REST_CLIENT', label: gatewayProtocolName('REST_CLIENT') },
  { value: 'MODBUS_TCP', label: gatewayProtocolName('MODBUS_TCP') },
  { value: 'MODBUS_RTU', label: gatewayProtocolName('MODBUS_RTU') },
  { value: 'S7', label: gatewayProtocolName('S7') },
  { value: 'MTCONNECT', label: gatewayProtocolName('MTCONNECT') },
];

export const GatewayForm = ({
  control,
  watch,
  setValue,
  isEdit,
  isLoading,
  noData,
  refreshId,
}: {
  control: Control<GatewayDetailsType>;
  watch: UseFormWatch<GatewayDetailsType>;
  setValue: UseFormSetValue<GatewayDetailsType>;
  isEdit: boolean;
  isLoading?: boolean;
  noData?: boolean;
  refreshId?: () => void;
}) => {
  const type = watch('type');

  return (
    <div
      className={style['gateway-form']}
      style={{ visibility: isLoading ? 'hidden' : 'visible' }}
    >
      <div className={style['gateway-form__source-id']}>
        <div className={style['gateway-form__source-id__input']}>
          <Controller
            name="alias"
            control={control}
            render={({ field: { value, onChange }, fieldState: { error } }) =>
              noData ? (
                <Input
                  value="---"
                  label={t('common.data_source_id') + ':'}
                  readOnly
                  background="dark"
                />
              ) : isEdit ? (
                <Input
                  value={value || '---'}
                  label={t('common.data_source_id') + ':'}
                  readOnly
                  inputProps={{ required: true }}
                  background="dark"
                />
              ) : (
                <Input
                  label={t('common.data_source_id') + ':'}
                  value={value}
                  onChange={onChange}
                  isError={!!error}
                  detail={error?.message}
                  inputProps={{ required: true }}
                  readOnly
                  background={'dark'}
                />
              )
            }
          />
        </div>
        {!noData && !isEdit && (
          <div
            className={style['gateway-form__button']}
            onClick={(e) => {
              if (!noData && !isEdit) {
                e.stopPropagation();
                refreshId && refreshId();
              }
            }}
          >
            <Sync />
          </div>
        )}
      </div>
      <Controller
        name="name"
        control={control}
        render={({ field: { value, onChange }, fieldState: { error } }) =>
          noData ? (
            <Input
              label={t('common.data_source_name') + ':'}
              value="---"
              readOnly
              background="dark"
            />
          ) : (
            <Input
              label={t('common.data_source_name') + ':'}
              value={value}
              onChange={onChange}
              isError={!!error}
              detail={error?.message}
              inputProps={{ required: true }}
              background={isEdit ? 'dark' : 'dark'}
            />
          )
        }
      />
      <Controller
        name="type"
        control={control}
        render={({ field: { value, onChange }, fieldState: { error } }) =>
          noData ? (
            <Input
              label={t('common.data_source_type') + ':'}
              value="---"
              readOnly
              background="dark"
            />
          ) : isEdit ? (
            <Input
              label={t('common.data_source_type') + ':'}
              value={value ? gatewayProtocolName(value) : '---'}
              readOnly
              inputProps={{ required: true }}
              background="dark"
            />
          ) : (
            <Dropdown
              label={t('common.data_source_type') + ':'}
              options={types}
              value={value || ''}
              onChange={(value) => {
                // Reset params
                if (value === 'OPCUA') {
                  setValue('params', DefaultOPCUAParams());
                } else if (value === 'MQTT_SERVER') {
                  setValue('params', DefaultMQTTServerParams());
                } else if (value === 'MQTT_CLIENT') {
                  setValue('params', DefaultMQTTClientParams());
                } else if (value === 'REST_SERVER') {
                  setValue('params', DefaultRESTServerParams());
                } else if (value === 'REST_CLIENT') {
                  setValue('params', DefaultRESTClientParams());
                } else if (value === 'MODBUS_TCP') {
                  setValue('params', DefaultModbusParams());
                } else if (value === 'MODBUS_RTU') {
                  setValue('params', DefaultModbusRTUParams());
                } else if (value === 'S7') {
                  setValue('params', DefaultS7Params());
                } else if (value === 'MTCONNECT') {
                  setValue('params', DefaultMTConnectParams());
                } else {
                  return;
                }

                onChange(value);
              }}
              error={error?.message}
              background={'dark'}
            />
          )
        }
      />
      {noData ? null : type === 'OPCUA' ? (
        <OPCUAParams
          control={control}
          watch={watch}
          inputBackground={isEdit ? 'dark' : 'dark'}
        />
      ) : type === 'MQTT_SERVER' ? (
        <MQTTServerParams
          control={control}
          watch={watch}
          setValue={setValue}
          isEdit={isEdit}
        />
      ) : type === 'MQTT_CLIENT' ? (
        <MQTTClientParams
          control={control}
          watch={watch}
          inputBackground={isEdit ? 'dark' : 'dark'}
        />
      ) : type === 'REST_SERVER' ? (
        <RESTServerParams control={control} watch={watch} />
      ) : type === 'REST_CLIENT' ? (
        <RESTClientParams
          control={control}
          watch={watch}
          inputBackground={isEdit ? 'dark' : 'dark'}
        />
      ) : type === 'MODBUS_TCP' ? (
        <ModbusParams
          control={control}
          inputBackground={isEdit ? 'dark' : 'dark'}
        />
      ) : type === 'MODBUS_RTU' ? (
        <ModbusRTUParams
          control={control}
          inputBackground={isEdit ? 'dark' : 'dark'}
        />
      ) : type === 'S7' ? (
        <S7Params
          control={control}
          inputBackground={isEdit ? 'dark' : 'dark'}
        />
      ) : type === 'MTCONNECT' ? (
        <MTConnectParams
          control={control}
          inputBackground={isEdit ? 'dark' : 'dark'}
        />
      ) : null}
      <Controller
        name="description"
        control={control}
        render={({ field: { value, onChange } }) =>
          noData ? (
            <TextBox
              label={t('common.description') + ':'}
              value=""
              placeholder={t('common.placeholder_description_limit', '160')}
              maxLength={160}
              detail={`${value?.length || 0} / 160`}
              rows={4}
              readOnly
              background="dark"
            />
          ) : (
            <TextBox
              label={t('common.description') + ':'}
              value={value || ''}
              onChange={(value) => {
                onChange(value || null);
              }}
              placeholder={t('common.placeholder_description_limit', '160')}
              maxLength={160}
              // detail={`${value?.length || 0} / 160`}
              rows={4}
              background={isEdit ? 'dark' : 'dark'}
            />
          )
        }
      />
    </div>
  );
};

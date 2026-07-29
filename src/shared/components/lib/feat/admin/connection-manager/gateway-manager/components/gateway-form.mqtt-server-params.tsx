// React builtins
// Reusables
import { Reload } from '@digital-twin/icons';
import { ORG_ALIAS } from '@digital-twin/utils';
import { t } from '@digital-twin/utils';
import { useContext, useMemo } from 'react';
// For managing form
import {
  Control,
  Controller,
  UseFormSetValue,
  UseFormWatch,
} from 'react-hook-form';

import { Checkbox, Input } from '../../../../../input';
// Contexts
import { PrjCtx } from '../contexts';
// Hooks
import { useUpdateMQTTServerPassword } from '../hooks';
// Schemas
import { GatewayDetailsType } from '../schemas';
// Custom components
// import { AdditionalInfo } from './gateway-form.additional-info';
import { ExpectedOutput, Expression } from './gateway-form.expression';
// Style
import style from './gateway-form.module.scss';

// Constants
export const DefaultMQTTServerParams = () => ({
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

export const MQTTServerParams = ({
  control,
  watch,
  setValue,
  isEdit,
}: {
  control: Control<GatewayDetailsType>;
  watch: UseFormWatch<GatewayDetailsType>;
  setValue: UseFormSetValue<GatewayDetailsType>;
  isEdit: boolean;
}) => {
  const prj = useContext(PrjCtx);

  // Get current gateway's alias value
  const gatewayAlias = watch('alias') || '';

  // Watched parameters
  const customMapping = watch('params.CUSTOM_MAPPING', 'false');

  // Watched additionals
  const port = watch('additionals.port') || '';

  // Aliases; Used as the username & topic
  const aliases = useMemo(() => {
    return `${ORG_ALIAS()}.${prj}.${gatewayAlias}`;
  }, [prj, gatewayAlias]);

  return (
    <>
      {isEdit ? (
        <Input
          label={t('common.url') + ':'}
          value={`mqtts://${window.location.hostname}:${port}`}
          readOnly
          background="dark"
        />
      ) : null}
      <Input
        label={t('common.username') + ':'}
        value={aliases}
        readOnly
        background='dark'
      />
      {isEdit ? (
        <Controller
          name="additionals.password"
          control={control}
          render={({ field: { value } }) => (
            <Password
              gatewayAlias={gatewayAlias}
              value={value || '---'}
              onChange={(value) => {
                setValue('additionals.password', value, { shouldDirty: false });
              }}
            />
          )}
        />
      ) : (
        <Input
          readOnly
          background='dark'
          label={t('common.password') + ':'}
          value="---" />
      )}
      <Input
        readOnly
        background='dark'
        label={t('common.topic') + ':'}
        value={aliases} />
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
              onChange={(value) => {
                onChange(value);
              }}
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

const Password = ({
  gatewayAlias,
  value,
  onChange,
}: {
  gatewayAlias: string;
  value: string;
  onChange: (value: string) => void;
}) => {
  // For updating password
  const updatePassword = useUpdateMQTTServerPassword();

  return (
    <div className={style['additional-info']}>
      <span className={style['additional-info__label']}>
        {t('common.password') + ':'}
      </span>
      <div className={style['additional-info__content']}>
        <Input
          // className={style['additional-info__content__preview']}
          wrapperProps={{
            className: style['additional-info__content__preview']
          }}
          value={value}
          readOnly
        />
        <div className={style['additional-info__icon']}>
          <Reload
            color="white"
            height={17}
            width={17}
            onClick={(e) => {
              e.stopPropagation();

              if (updatePassword.isPending) {
                return;
              }

              updatePassword.mutate(gatewayAlias, {
                onSuccess: ({ new_password }) => {
                  onChange(new_password);
                },
              });
            }}
          />
        </div>
      </div>
    </div>
  );
};

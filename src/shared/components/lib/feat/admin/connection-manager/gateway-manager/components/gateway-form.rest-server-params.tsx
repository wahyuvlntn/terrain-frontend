// React builtins
import { SESSION_ID_HEADER } from '@digital-twin/utils';
import { ORG_ALIAS } from '@digital-twin/utils';
import { t } from '@digital-twin/utils';
import { useContext, useMemo } from 'react';
// For managing form
import { Control, Controller, UseFormWatch } from 'react-hook-form';

// Reusables
import { Checkbox, Input } from '../../../../../input';
// Contexts
import { PrjCtx } from '../contexts';
// Schemas
import { GatewayDetailsType } from '../schemas';
// Custom components
// import { AdditionalInfo } from './gateway-form.additional-info';
import { ExpectedOutput, Expression } from './gateway-form.expression';

// Constants
export const DefaultRESTServerParams = () => ({
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

export const RESTServerParams = ({
  control,
  watch,
}: {
  control: Control<GatewayDetailsType>;
  watch: UseFormWatch<GatewayDetailsType>;
}) => {
  const prj = useContext(PrjCtx);

  // Get current gateway's alias value
  const gatewayAlias = watch('alias') || '';

  // Watched parameters
  const customMapping = watch('params.CUSTOM_MAPPING', 'false');

  // URL for pushing data to this REST Server
  const url = useMemo(() => {
    return `${window.location.origin
      }/push-data/${ORG_ALIAS()}.${prj}.${gatewayAlias}`;
  }, [prj, gatewayAlias]);

  const token =
    localStorage.getItem(SESSION_ID_HEADER) || 'token';

  return (
    <>
      <Input readOnly background='dark' label="URL:" value={url} />
      <Input readOnly background='dark' label={t('common.method') + ':'} value="POST" />
      <Input readOnly background='dark'
        label={t('common.header') + ':'}
        value={JSON.stringify({ [SESSION_ID_HEADER]: token })}
        inputProps={{
          style: {
            fontFamily: 'monospace'
          }
        }}
      />
      <Controller
        name="params.CUSTOM_MAPPING"
        control={control}
        render={({ field: { value, onChange } }) => (
          <Checkbox
            label={t('common.custom_mapping') + ':'}
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
              label={t('common.expression') + ':'}
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

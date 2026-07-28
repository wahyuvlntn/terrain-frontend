import { zodResolver } from '@hookform/resolvers/zod';
import { SaveFill, UtilitySystemDetail } from '@digital-twin/icons';
import { t, useLanguageSwitcher } from '@digital-twin/utils';
import { toast } from '@digital-twin/reusables';
import { useContext } from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '../../../../../input';
import { Container } from '../../../../../layout';
import { Loading } from '../../../../../others';
import {
  AuthCtx,
  PermissionAliasEnum,
  PermissionGroupAliasEnum,
} from '../../../../auth';
import { useGatewayDetails, useUpdateGateway } from '../hooks';
import { gatewayDetailsSchema, GatewayDetailsType } from '../schemas';
import style from './gateway-details.module.scss';
import { GatewayForm } from './gateway-form';
import { GatewayStatus } from './gateway-status';

export const GatewayDetails = ({ gatewayAlias }: { gatewayAlias?: string }) => {
  useLanguageSwitcher();

  // Contexts
  const { hasPermission } = useContext(AuthCtx);

  // UAC
  const hasUpdatePermission = hasPermission(
    PermissionGroupAliasEnum.enum.datasourcemanager,
    PermissionAliasEnum.enum.update
  );

  const { data, isLoading } = useGatewayDetails(gatewayAlias);

  const updateGateway = useUpdateGateway();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isDirty },
  } = useForm<GatewayDetailsType>({
    defaultValues: {
      alias: '',
      name: '',
      type: undefined,
      params: {},
      description: null,
      additionals: {},
    },
    resolver: zodResolver(gatewayDetailsSchema),
  });

  useEffect(() => {
    if (!data) {
      return;
    }

    const timer = setTimeout(() => {
      reset(data);
    }, 0);

    return () => {
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const onSubmit = handleSubmit((form) => {
    if (!hasUpdatePermission) {
      return;
    }

    updateGateway.mutate(form, {
      onSuccess: (form) => {
        toast.success(t('common.data_source_successfully_updated', form.name), {
          toastId: `success_update_gateway_${form.alias}`,
        });
      },
    });
  });

  return (
    <Container
      icon={<UtilitySystemDetail />}
      title={t('common.data_source_information')}
      className={style['gateway-details']}
      background={'none'}
    >
      <form className={style['update-gateway-form']} onSubmit={onSubmit}>
        <Loading isLoading={isLoading} />
        <div className={style['update-gateway-form__inputs']}>
          <GatewayStatus gatewayAlias={gatewayAlias} />
          <GatewayForm
            control={control}
            watch={watch}
            setValue={setValue}
            isEdit={true}
            isLoading={isLoading}
            noData={!gatewayAlias}
          />
        </div>
        {hasUpdatePermission ? (
          <div className={style['update-gateway-form__save']}>
            <Button
              icon={<SaveFill />}
              color={'default-primary'}
              type={'submit'}
              disabled={
                isLoading ||
                updateGateway.isPending ||
                !gatewayAlias ||
                !isDirty
              }
            >
              {t('common.save')}
            </Button>
          </div>
        ) : null}
      </form>
    </Container>
  );
};

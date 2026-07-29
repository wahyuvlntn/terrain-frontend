import { zodResolver } from '@hookform/resolvers/zod';
import { SettingsPreferences } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import { toast } from '@digital-twin/reusables';
import { useContext, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Input, TextBox } from '../../../../../input';
import { ClosedBy, Drawer } from '../../../../../navigation';
import { PrjCtx } from '../contexts';
import { useUpdateGatewayTag } from '../hooks';
import {
  GatewayProtocolType,
  GatewayTagType,
  updateGatewayTagFormSchema,
  UpdateGatewayTagFormType,
} from '../schemas';
import style from './gateway-tag-drawer.module.scss';
import { TagAddressInput } from './tag-address-input';

export const UpdateGatewayTagDrawer = ({
  gatewayAlias,
  gatewayProtocol,
  updated,
  open,
  onClose,
}: {
  gatewayAlias?: string;
  gatewayProtocol?: GatewayProtocolType;
  updated?: GatewayTagType;
  open: boolean;
  onClose: () => void;
}) => {
  const prj = useContext(PrjCtx);

  const updateGatewayTag = useUpdateGatewayTag();

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<UpdateGatewayTagFormType>({
    defaultValues: {
      gateway_alias: '',
      current_tag_name: '',
      tag_name: '',
      tag_address: '',
      tag_description: '',
    },
    resolver: zodResolver(updateGatewayTagFormSchema),
  });

  const resetForm = (gatewayAlias?: string, updated?: GatewayTagType) => {
    reset({
      gateway_alias: gatewayAlias || '',
      current_tag_name: updated?.name || '',
      tag_name: updated?.name || '',
      tag_address: updated?.address || '',
      tag_description: updated?.description || null,
    });
  };

  useEffect(() => {
    resetForm(gatewayAlias, updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gatewayAlias, updated]);

  const onSubmit = handleSubmit((form) => {
    updateGatewayTag.mutate(form, {
      onSuccess: (form) => {
        toast.success(t('common.tag_successfully_updated', form.tag_name), {
          toastId: `success_update_gateway_tag_${form.gateway_alias}_${form.tag_name}}`,
        });
        onClose();
      },
    });
  });

  return (
    <Drawer
      icon={<SettingsPreferences />}
      title={t('common.update_data_source_tag')}
      open={open}
      onClose={onClose}
      afterClose={(closedBy) => {
        if (closedBy === ClosedBy.CANCEL) {
          resetForm(gatewayAlias, updated);
        }
      }}
      onSubmit={onSubmit}
      submitting={updateGatewayTag.isPending}
      disableSubmit={!isDirty}
      variant="save"
      background="dark"
    >
      <PrjCtx.Provider value={prj}>
        <div className={style['gateway-tag-drawer']}>
          <div className={style['gateway-tag-form']}>
            <Controller
              name="tag_name"
              control={control}
              render={({
                field: { value, onChange },
                fieldState: { error },
              }) => (
                <Input
                  label={t('common.name')}
                  value={value}
                  onChange={onChange}
                  isError={!!error}
                  detail={error?.message}
                  inputProps={{ required: true }}
                  background="dark"
                />
              )}
            />
            <Controller
              name="tag_address"
              control={control}
              render={({ field: { value, onChange } }) => (
                <TagAddressInput
                  //TODO: remove unused gatewayAlias
                  // gatewayAlias={gatewayAlias}
                  protocol={gatewayProtocol}
                  value={value}
                  onChange={onChange}
                  useDefault={false}
                />
              )}
            />
            <Controller
              name="tag_description"
              control={control}
              //TODO: remove unused value
              render={({ field: { onChange } }) => (
                <TextBox
                  onChange={(value) => {
                    onChange(value || null);
                  }}
                  placeholder={t('common.placeholder_description_limit', '160')}
                  maxLength={160}
                  // detail={`${value?.length || 0} / 160`}
                  rows={4}
                  background="dark"
                />
              )}
            />
          </div>
        </div>
      </PrjCtx.Provider>
    </Drawer>
  );
};

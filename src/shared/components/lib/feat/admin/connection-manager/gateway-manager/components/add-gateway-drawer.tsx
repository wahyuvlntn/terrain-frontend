import { zodResolver } from '@hookform/resolvers/zod';
import { SettingsPreferences } from '@digital-twin/icons';
import { t, useLanguageSwitcher } from '@digital-twin/utils';
import { toast } from '@digital-twin/reusables';
import { useContext } from 'react';
import { useForm } from 'react-hook-form';
import { v4 as uuidv4 } from 'uuid';

import { Drawer } from '../../../../../navigation';
import { PrjCtx } from '../contexts';
import { useAddGateway } from '../hooks';
import { gatewayDetailsSchema, GatewayDetailsType } from '../schemas';
import style from './add-gateway-drawer.module.scss';
import { GatewayForm } from './gateway-form';
import { DefaultOPCUAParams } from './gateway-form.opcua-params';

export const AddGatewayDrawer = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  useLanguageSwitcher();

  const prj = useContext(PrjCtx);

  const addGateway = useAddGateway();

  const { control, handleSubmit, reset, watch, setValue } =
    useForm<GatewayDetailsType>({
      defaultValues: {
        alias: `ds_${uuidv4().replaceAll('-', '_')}`,
        name: '',
        type: 'OPCUA',
        params: DefaultOPCUAParams(),
        description: null,
        additionals: {},
      },
      resolver: zodResolver(gatewayDetailsSchema),
    });

  const resetForm = () => {
    reset({
      alias: `ds_${uuidv4().replaceAll('-', '_')}`,
      name: '',
      type: 'OPCUA',
      params: DefaultOPCUAParams(),
      description: '',
      additionals: {},
    });
  };

  const onSubmit = handleSubmit((form) => {
    addGateway.mutate(form, {
      onSuccess: (form) => {
        toast.success(t('common.data_source_successfully_added', form.name), {
          toastId: `success_add_gateway_${form.alias}`,
        });
        onClose();
      },
    });
  });

  const refreshId = () => {
    setValue('alias', `ds_${uuidv4().replaceAll('-', '_')}`);
  };

  return (
    <Drawer
      icon={<SettingsPreferences />}
      title={t('common.add_industrial_data_source')}
      open={open}
      onClose={onClose}
      afterClose={resetForm}
      onSubmit={onSubmit}
      submitting={addGateway.isPending}
      variant="add"
      background="dark"
    >
      <PrjCtx.Provider value={prj}>
        <div className={style['add-gateway-drawer']}>
          <GatewayForm
            refreshId={refreshId}
            control={control}
            watch={watch}
            setValue={setValue}
            isEdit={false}
          />
        </div>
      </PrjCtx.Provider>
    </Drawer>
  );
};

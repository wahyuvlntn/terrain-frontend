import { zodResolver } from '@hookform/resolvers/zod';
import { SettingsPreferences } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import { toast } from '@digital-twin/reusables';
import { useContext, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Input, TextBox } from '../../../../../input';
import { Drawer } from '../../../../../navigation';
import { BaseModelsCtx, BrandsCtx, SeriesCtx, TypesCtx } from '../contexts';
import { useAddModel } from '../hooks/model';
import { addModelFormSchema, AddModelFormType } from '../schemas';
import style from './add-model-drawer.module.scss';
import { MasterDataDropdown } from './master-data-dropdown';

export const AddModelDrawer = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const { entries: baseModels, records: baseModelRecords } =
    useContext(BaseModelsCtx);
  const { entries: types } = useContext(TypesCtx);
  const { entries: brands } = useContext(BrandsCtx);
  const { entries: series } = useContext(SeriesCtx);

  const normalizedBaseModels = useMemo(() => {
    const unselected = { id: -1, name: '---' };

    if (!baseModels) {
      return [unselected];
    }

    return [unselected, ...baseModels];
  }, [baseModels]);

  const addModel = useAddModel();

  const { control, handleSubmit, reset, setValue } = useForm<AddModelFormType>({
    defaultValues: {
      name: '',
      base_model_id: null,
      type_id: undefined,
      brand_id: undefined,
      series_id: undefined,
      description: '',
    },
    resolver: zodResolver(addModelFormSchema),
  });

  const resetForm = () => {
    reset({
      name: '',
      base_model_id: null,
      type_id: undefined,
      brand_id: undefined,
      series_id: undefined,
      description: '',
    });
  };

  const onSubmit = handleSubmit((form) => {
    addModel.mutate(form, {
      onSuccess: (form) => {
        toast.success(t('common.model_successfully_added', form.name), {
          toastId: `success_add_model_${form.id}`,
        });
        onClose();
      },
    });
  });

  return (
    <Drawer
      icon={<SettingsPreferences />}
      title={t('common.add_model')}
      open={open}
      onClose={onClose}
      afterClose={resetForm}
      onSubmit={onSubmit}
      submitting={addModel.isPending}
      variant="add"
      background={'dark'}
    >
      <div className={style['add-model-drawer']}>
        <div className={style['add-model-form']}>
          <Controller
            name="name"
            control={control}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <Input
                label={t('common.model_name')}
                value={value}
                onChange={onChange}
                isError={!!error}
                detail={error?.message}
                inputProps={{ required: true }}
                background={'dark'}
              />
            )}
          />
          <Controller
            name="base_model_id"
            control={control}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <MasterDataDropdown
                label={t('common.base_model')}
                entries={normalizedBaseModels}
                value={value == null ? -1 : value}
                onChange={(value) => {
                  const baseModel = baseModelRecords?.[value];

                  if (baseModel) {
                    onChange(value);
                    setValue('type_id', baseModel.type_id);
                    setValue('brand_id', baseModel.brand_id);
                    setValue('series_id', baseModel.series_id);
                  } else {
                    onChange(null);
                  }
                }}
                error={error?.message}
                disableDefault
              />
            )}
          />
          <Controller
            name="type_id"
            control={control}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <MasterDataDropdown
                label={t('common.type')}
                entries={types}
                value={value}
                onChange={onChange}
                error={error?.message}
                disabled={!types || types.length === 0}
              />
            )}
          />
          <Controller
            name="brand_id"
            control={control}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <MasterDataDropdown
                label={t('common.brand')}
                entries={brands}
                value={value}
                onChange={onChange}
                error={error?.message}
                disabled={!brands || brands.length === 0}
              />
            )}
          />
          <Controller
            name="series_id"
            control={control}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <MasterDataDropdown
                label={t('common.series')}
                entries={series}
                value={value}
                onChange={onChange}
                error={error?.message}
                disabled={!series || series.length === 0}
              />
            )}
          />
          <Controller
            name="description"
            control={control}
            render={({ field: { value, onChange } }) => (
              <TextBox
                label={t('common.description')}
                value={value || ''}
                onChange={onChange}
                placeholder={t('common.placeholder_description_limit', '160')}
                maxLength={160}
                // detail={`${value?.length || 0} / 160`}
                rows={4}
                background={'dark'}
              />
            )}
          />
        </div>
      </div>
    </Drawer>
  );
};

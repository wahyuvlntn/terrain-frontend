import { zodResolver } from '@hookform/resolvers/zod';
import { Controls, SaveFill, Settings } from '@digital-twin/icons';
import { t, useLanguageSwitcher } from '@digital-twin/utils';
import { toast } from '@digital-twin/reusables';
import { useContext, useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Button, Input, TextBox } from '../../../../../input';
import { Container } from '../../../../../layout';
import { Loading } from '../../../../../others';
import { AuthCtx, PermissionAliasEnum, PermissionGroupAliasEnum } from '../../../../auth';
import { BaseModelsCtx, BrandsCtx, SeriesCtx, TypesCtx } from '../contexts';
import { useModelInformation, useUpdateModelInformation } from '../hooks/model';
import { ModelInformationType, modelInformationSchema } from '../schemas';
import { MasterDataDropdown } from './master-data-dropdown';
import style from './model-details.module.scss';

export const ModelInformation = ({ selectedId }: { selectedId: number | undefined }) => {
  useLanguageSwitcher();

  // Contexts
  const { records: baseModelRecords } = useContext(BaseModelsCtx);
  const { entries: types } = useContext(TypesCtx);
  const { entries: brands } = useContext(BrandsCtx);
  const { entries: series } = useContext(SeriesCtx);
  const { hasPermission } = useContext(AuthCtx);

  // UAC
  const hasUpdatePermission = hasPermission(
    PermissionGroupAliasEnum.enum.modelmanager,
    PermissionAliasEnum.enum.update
  );

  // Fetch info
  const modelInfo = useModelInformation(selectedId);

  // For updating model info
  const updateModelInfo = useUpdateModelInformation();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { isDirty },
  } = useForm<ModelInformationType>({
    defaultValues: {
      id: undefined,
      name: '',
      description: '',
      type_id: undefined,
      brand_id: undefined,
      series_id: undefined,
    },
    resolver: zodResolver(modelInformationSchema),
  });

  const onSubmit = handleSubmit((form) => {
    if (!hasUpdatePermission) {
      return;
    }

    updateModelInfo.mutate(form, {
      onSuccess: (form) => {
        toast.success(t('common.model_successfully_updated', form.name), {
          toastId: `success_update_model_info_${form.id}`,
        });
      },
    });
  });

  useEffect(() => {
    if (!modelInfo.data) {
      return;
    }

    reset(modelInfo.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelInfo.data]);

  const baseModel = useMemo(() => {
    if (!baseModelRecords || !modelInfo.data || !modelInfo.data.base_model_id) {
      return undefined;
    }

    return baseModelRecords[modelInfo.data.base_model_id];
  }, [modelInfo.data, baseModelRecords]);

  return (
    <Container
      icon={<Controls />}
      title={t('common.mo')}
      className={style['model-details-cell']}
      background={'none'}
    >
      <form className={style['model-information']} onSubmit={onSubmit}>
        <Loading isLoading={modelInfo.isLoading} />
        <div className={style['model-information-form']}>
          <div className={style['model-information-form__row']}>
            <Controller
              name="name"
              control={control}
              render={({ field: { value, onChange }, fieldState: { error } }) =>
                selectedId ? (
                  <Input
                    label={t('common.model_name')}
                    value={value}
                    onChange={onChange}
                    isError={!!error}
                    detail={error?.message}
                    inputProps={{ required: true }}
                    wrapperProps={{
                      className: style['model-information-form__row-item'],
                    }}
                    background={'dark'}
                  />
                ) : (
                  <Input
                    label={t('common.model_name')}
                    value="---"
                    readOnly
                    wrapperProps={{
                      className: style['model-information-form__row-item'],
                    }}
                    background={'dark'}
                  />
                )
              }
            />
            <Input
              label={t('common.base_model')}
              value={(selectedId && baseModel?.name) || '---'}
              readOnly
              wrapperProps={{
                className: style['model-information-form__row-item'],
              }}
              background={'dark'}
            />
          </div>
          <div className={style['model-information-form__row']}>
            <div className={style['model-information-form__row-item']}>
              <Controller
                name="type_id"
                control={control}
                render={({ field: { value, onChange }, fieldState: { error } }) =>
                  selectedId ? (
                    <MasterDataDropdown
                      label={t('common.type')}
                      entries={types}
                      value={value}
                      onChange={onChange}
                      error={error?.message}
                      disabled={!types || types.length === 0}
                    />
                  ) : (
                    <Input label={t('common.type')} value="---" readOnly background={'dark'} />
                  )
                }
              />
            </div>
            <div className={style['model-information-form__row-item']}>
              <Controller
                name="brand_id"
                control={control}
                render={({ field: { value, onChange }, fieldState: { error } }) =>
                  selectedId ? (
                    <MasterDataDropdown
                      label={t('common.brand') + ':'}
                      entries={brands}
                      value={value}
                      onChange={onChange}
                      error={error?.message}
                      disabled={!brands || brands.length === 0}
                    />
                  ) : (
                    <Input
                      label={t('common.brand') + ':'}
                      value="---"
                      readOnly
                      background={'dark'}
                    />
                  )
                }
              />
            </div>
            <div className={style['model-information-form__row-item']}>
              <Controller
                name="series_id"
                control={control}
                render={({ field: { value, onChange }, fieldState: { error } }) =>
                  selectedId ? (
                    <MasterDataDropdown
                      label={t('common.series') + ':'}
                      entries={series}
                      value={value}
                      onChange={onChange}
                      error={error?.message}
                      disabled={!series || series.length === 0}
                    />
                  ) : (
                    <Input
                      label={t('common.series') + ':'}
                      value="---"
                      readOnly
                      background={'dark'}
                    />
                  )
                }
              />
            </div>
          </div>
          <Controller
            name="description"
            control={control}
            render={({ field: { value, onChange } }) =>
              selectedId ? (
                <TextBox
                  label={t('common.description') + ':'}
                  value={value || ''}
                  onChange={onChange}
                  placeholder={t('common.placeholder_description_limit', '160')}
                  maxLength={160}
                  // detail={`${value?.length || 0} / 160`}
                  rows={4}
                  background={'dark'}
                />
              ) : (
                <TextBox
                  label={t('common.description') + ':'}
                  value=""
                  placeholder={t('common.placeholder_description_limit', '160')}
                  maxLength={160}
                  // detail={`${value?.length || 0} / 160`}
                  rows={4}
                  readOnly
                  background={'dark'}
                />
              )
            }
          />

          <div className={style['length-limit']}>{watch('description').length} / 160</div>
        </div>
        {hasUpdatePermission ? (
          <div className={style['model-information-form__save']}>
            <Button
              icon={<SaveFill />}
              color={'default-primary'}
              type={'submit'}
              disabled={!selectedId || modelInfo.isLoading || updateModelInfo.isPending || !isDirty}
            >
              {t('common.save')}
            </Button>
          </div>
        ) : null}
      </form>
    </Container>
  );
};

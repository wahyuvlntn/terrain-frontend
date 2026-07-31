import { zodResolver } from '@hookform/resolvers/zod';
import { Close, Controls, Edit1, Save, Sync, TrashDelete } from '@digital-twin/icons';
import { t, useLanguageSwitcher } from '@digital-twin/utils';
import { toast } from '@digital-twin/reusables';
import clsx from 'clsx';
import { useContext, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { SetURLSearchParams } from 'react-router-dom';

import { useToggle } from '../../../../../hooks';
import { Dropdown, DropdownOption, Input, Search } from '../../../../../input';
import { Container } from '../../../../../layout';
import { Popup } from '../../../../../navigation';
import { AddBulkImport, Loading, PopupDelete } from '../../../../../others';
import {
  AuthCtx,
  PermissionAliasEnum,
  PermissionGroupAliasEnum,
} from '../../../../auth';
import { GainsCtx, ParameterTypesCtx } from '../contexts';
import {
  useAddModelParameter,
  useDeleteModelParameter,
  useModelInformation,
  useSyncBaseModelParameters,
  useUpdateModelParameter,
} from '../hooks/model';
import { ReactComponent as DecimalDecrease } from '../icons/decimal-decrease.svg';
import { ReactComponent as DecimalIncrease } from '../icons/decimal-increase.svg';
import {
  ModelParameterType,
  upsertModelParameterFormSchema,
  UpsertModelParameterFormType,
} from '../schemas';
import { BulkImportModelParametersDrawer } from './bulk-import-model-parameters-drawer';
import style from './model-details.module.scss';

// Constants
const PREFIX = 'parameter_setup_';

export const ParameterSetup = ({
  modelId,
  search,
  setSearchParams,
  parameters,
  isLoading,
}: {
  modelId: number | undefined;
  search: string;
  setSearchParams: SetURLSearchParams;
  parameters: ModelParameterType[] | undefined;
  isLoading: boolean;
}) => {
  useLanguageSwitcher();

  // Contexts
  const { hasPermission } = useContext(AuthCtx);

  // UAC
  const hasCreatePermission = hasPermission(
    PermissionGroupAliasEnum.enum.modelmanager,
    PermissionAliasEnum.enum.create
  );

  const hasUpdatePermission = hasPermission(
    PermissionGroupAliasEnum.enum.modelmanager,
    PermissionAliasEnum.enum.update
  );

  const hasDeletePermission = hasPermission(
    PermissionGroupAliasEnum.enum.modelmanager,
    PermissionAliasEnum.enum.delete
  );

  // For bulk import parameters
  const [showBulkImport, toggleShowBulkImport] = useToggle(false);

  // For adding a parameter
  const [showNewParameter, setShowNewParameter] = useState(false);

  // For deleting a parameter
  const [deletedParameter, setDeletedParameter] =
    useState<ModelParameterType>();
  const [showDeleteConfirm, toggleShowDeleteConfirm] = useToggle(false);
  const deleteParameter = useDeleteModelParameter();

  // For syncing model parameters
  const [showSyncConfirm, toggleShowSyncConfirm] = useToggle(false);
  const syncParameters = useSyncBaseModelParameters();

  // Reset add form whenever the modelId changes
  useEffect(() => {
    setShowNewParameter(false);
  }, [modelId]);

  // Filter out parameters based on search
  const filteredParameters = useMemo(() => {
    if (!parameters) {
      return undefined;
    }

    return parameters.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [parameters, search]);

  const { data: info } = useModelInformation(modelId);

  return (
    <Container
      icon={<Controls />}
      title={t('common.variable_setup')}
      className={style['model-details-cell']}
      background={'none'}
    >
      <div className={style['parameter-setup-header']}>
        <Search
          value={search}
          onChange={(search) => {
            setSearchParams((prev) => {
              if (search) {
                prev.set(`${PREFIX}search`, search);
              } else {
                prev.delete(`${PREFIX}search`);
              }
              return new URLSearchParams(prev);
            });
          }}
          placeholder={t('common.search')}
          width="100%"
          background={'dark'}
        />
        {hasCreatePermission ? (
          <AddBulkImport
            onAdd={() => {
              setShowNewParameter(true);
            }}
            onBulkImport={toggleShowBulkImport}
            onSync={
              hasUpdatePermission && modelId && info && !info.base_model_id
                ? toggleShowSyncConfirm
                : undefined
            }
            disabled={!modelId || !parameters || isLoading || showNewParameter}
          />
        ) : null}
      </div>
      <div className={style['parameter-setup-body']}>
        <Loading isLoading={isLoading} />
        {hasCreatePermission && modelId && showNewParameter ? (
          <NewParameterCard
            modelId={modelId}
            onClose={() => {
              setShowNewParameter(false);
            }}
          />
        ) : null}
        {modelId && filteredParameters
          ? filteredParameters.map((parameter) => (
              <ParameterCard
                key={parameter.alias}
                modelId={modelId}
                parameter={parameter}
                onDelete={(parameter) => {
                  setDeletedParameter(parameter);
                  toggleShowDeleteConfirm();
                }}
                showUpdate={hasUpdatePermission}
                showDelete={hasDeletePermission}
              />
            ))
          : null}
      </div>
      {hasDeletePermission ? (
        <PopupDelete
          entityType={t('common.parameter')}
          entityName={deletedParameter?.name || '---'}
          open={showDeleteConfirm}
          onClose={toggleShowDeleteConfirm}
          onDelete={() => {
            if (!modelId || !deletedParameter) {
              return;
            }

            deleteParameter.mutate(
              { modelId, parameterAlias: deletedParameter.alias },
              {
                onSuccess: () => {
                  toast.success(
                    t(
                      'common.variable_successfully_deleted',
                      deletedParameter.name
                    ),
                    {
                      toastId: `success_delete_model_parameter_${modelId}_${deletedParameter.alias}`,
                    }
                  );
                  toggleShowDeleteConfirm();
                },
              }
            );
          }}
          deleting={deleteParameter.isPending}
        />
      ) : null}
      {hasUpdatePermission ? (
        <Popup
          icon={<Sync />}
          title={t('common.sync_model_variables')}
          open={showSyncConfirm}
          onClose={toggleShowSyncConfirm}
          onSubmit={() => {
            if (!modelId) {
              return;
            }

            syncParameters.mutate(modelId, {
              onSuccess: () => {
                toast.success(t('common.model_variables_successfully_synced'), {
                  toastId: `success_sync_model_parameters_${modelId}`,
                });
                toggleShowSyncConfirm();
              },
            });
          }}
          submitting={syncParameters.isPending}
          variant="sync"
          background="none"
        >
          <div className={style['confirm']}>
            <span className={style['confirm__info']}>
              {t('common.syncing_base_model')}
            </span>
          </div>
        </Popup>
      ) : null}
      {hasCreatePermission ? (
        <BulkImportModelParametersDrawer
          modelId={modelId}
          open={showBulkImport}
          onClose={toggleShowBulkImport}
        />
      ) : null}
    </Container>
  );
};

const NewParameterCard = ({
  modelId,
  onClose,
}: {
  modelId: number;
  onClose: () => void;
}) => {
  const { currentLanguage } = useLanguageSwitcher();

  const dataTypes: DropdownOption[] = useMemo(
    () => [
      { value: 'number', label: t('common.number') },
      { value: 'string', label: t('common.string') },
      { value: 'boolean', label: t('common.boolean') },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentLanguage]
  );
  dataTypes.reduce((record, { value, label }) => {
    record[value] = label;
    return record;
  }, {} as Record<string, string>);

  const { entries: gains } = useContext(GainsCtx);
  const { records: parameterTypeRecords } = useContext(ParameterTypesCtx);

  const addParameter = useAddModelParameter();

  const { control, handleSubmit, watch, setValue } =
    useForm<UpsertModelParameterFormType>({
      defaultValues: {
        model_id: modelId,
        alias: '',
        name: '',
        unit: '',
        data_type: parameterTypeRecords?.[1]?.data_type ?? 'number',
        scale: null,
        gain_id: 1,
        model_parameter_type_id: 1,
      },
      resolver: zodResolver(upsertModelParameterFormSchema),
    });

  const onSubmit = handleSubmit((form) => {
    addParameter.mutate(form, {
      onSuccess: (form) => {
        toast.success(t('common.variable_successfully_added', form.name), {
          toastId: `success_add_model_parameter_${form.model_id}_${form.alias}`,
        });
        onClose();
      },
    });
  });

  const dataType = watch('data_type');
  const modelParameterTypeId = watch('model_parameter_type_id');
  useMemo(() => {
    if (!modelParameterTypeId || !parameterTypeRecords || !gains) {
      return [];
    }

    const modelParameterTypeMd = parameterTypeRecords[modelParameterTypeId];

    if (!modelParameterTypeMd) {
      return [];
    }

    return gains.map(({ id, name }) => ({
      id,
      name: name + (modelParameterTypeMd.unit ?? ''),
    }));
  }, [modelParameterTypeId, parameterTypeRecords, gains]);

  return (
    <form
      className={clsx(
        style['parameter-card'],
        style['parameter-card--new'],
        dataType === 'number' && style['parameter-card--number']
      )}
      onSubmit={onSubmit}
    >
      <div className={style['parameter-card__inputs-wrapper']}>
        <div className={style['parameter-card__inputs']}>
          <Controller
            name="alias"
            control={control}
            render={({ field: { value, onChange } }) => (
              <Input
                placeholder={t('common.variable_name')}
                value={value}
                onChange={onChange}
                inputProps={{ required: true }}
                wrapperProps={{
                  style: { flex: '200 0 0', width: 0 },
                }}
                background="dark"
              />
            )}
          />
          <Controller
            name="name"
            control={control}
            render={({ field: { value, onChange } }) => (
              <Input
                placeholder={t('common.display_name')}
                value={value}
                onChange={onChange}
                inputProps={{ required: true }}
                wrapperProps={{
                  style: { flex: '200 0 0', width: 0 },
                }}
                background="dark"
              />
            )}
          />
          <Controller
            name="unit"
            control={control}
            render={({ field: { value, onChange } }) => (
              <Input
                placeholder={t('common.unit')}
                value={value}
                onChange={onChange}
                wrapperProps={{
                  style: { flex: '100 0 0', width: 0 },
                }}
                background="dark"
              />
            )}
          />
          <Controller
            name="data_type"
            control={control}
            render={({ field: { value, onChange } }) => (
              <Dropdown
                options={dataTypes}
                value={value}
                onChange={(value) => {
                  onChange(value);
                  setValue('scale', null);
                }}
                background="dark"
                wrapperStyles={{
                  flex: '180 0 0',
                  width: 0,
                }}
              />
            )}
          />
        </div>
        {dataType === 'number' ? (
          <div className={style['parameter-card__inputs']}>
            {dataType === 'number' ? (
              <Controller
                name="scale"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <ScaleInput
                    value={value}
                    onChange={onChange}
                    isNew
                    noExample={false}
                  />
                )}
              />
            ) : (
              <div style={{ flex: '1 0 0' }} />
            )}
          </div>
        ) : null}
      </div>
      <div className={style['parameter-card__actions']}>
        <button
          className={clsx(
            style['parameter-card__action'],
            style['parameter-card__action--new']
          )}
          onClick={(e) => {
            e.stopPropagation();
          }}
          disabled={addParameter.isPending}
          type="submit"
        >
          <Save />
        </button>
        <div
          className={clsx(
            style['parameter-card__action'],
            style['parameter-card__action--new']
          )}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <Close />
        </div>
      </div>
    </form>
  );
};

const ParameterCard = ({
  modelId,
  parameter,
  onDelete,
  showUpdate,
  showDelete,
}: {
  modelId: number;
  parameter: ModelParameterType;
  onDelete: (parameter: ModelParameterType) => void;
  showUpdate?: boolean;
  showDelete?: boolean;
}) => {
  const { currentLanguage } = useLanguageSwitcher();

  const dataTypes: DropdownOption[] = useMemo(
    () => [
      { value: 'number', label: t('common.number') },
      { value: 'string', label: t('common.string') },
      { value: 'boolean', label: t('common.boolean') },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentLanguage]
  );
  dataTypes.reduce((record, { value, label }) => {
    record[value] = label;
    return record;
  }, {} as Record<string, string>);

  const { entries: gains, records: gainRecords } = useContext(GainsCtx);
  const { records: parameterTypeRecords } = useContext(ParameterTypesCtx);

  const [isEdit, setIsEdit] = useState(false);

  const updateParameter = useUpdateModelParameter();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isDirty },
  } = useForm<UpsertModelParameterFormType>({
    defaultValues: { model_id: modelId, ...parameter },
    resolver: zodResolver(upsertModelParameterFormSchema),
  });

  const onSubmit = handleSubmit((form) => {
    if (!showUpdate) {
      return;
    }

    // If there are no differences, do nothing
    if (!isDirty) {
      setIsEdit(false);
      return;
    }

    updateParameter.mutate(form, {
      onSuccess: (form) => {
        toast.success(t('common.variable_successfully_updated', form.name), {
          toastId: `success_update_model_parameter_${form.model_id}_${form.alias}`,
        });
        setIsEdit(false);
      },
    });
  });

  const resetForm = (
    modelId: number | undefined,
    parameter: ModelParameterType
  ) => {
    reset({ model_id: modelId, ...parameter });
  };

  useEffect(() => {
    resetForm(modelId, parameter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId, parameter]);

  const dataType = watch('data_type');
  const gainId = watch('gain_id');
  const modelParameterTypeId = watch('model_parameter_type_id');
  useMemo(() => {
    if (!modelParameterTypeId || !parameterTypeRecords || !gains) {
      return [];
    }

    const modelParameterTypeMd = parameterTypeRecords[modelParameterTypeId];

    if (!modelParameterTypeMd) {
      return [];
    }

    return gains.map(({ id, name }) => ({
      id,
      name: name + (modelParameterTypeMd.unit ?? ''),
    }));
  }, [modelParameterTypeId, parameterTypeRecords, gains]);

  const normalizedUnit =
    (gainId && gainRecords ? gainRecords[gainId] ?? '' : '') + parameter.unit;

  return (
    <form
      className={clsx(
        style['parameter-card'],
        isEdit && dataType === 'number' && style['parameter-card--number']
      )}
      onSubmit={onSubmit}
    >
      {isEdit ? (
        <div className={style['parameter-card__inputs-wrapper']}>
          <div className={style['parameter-card__inputs']}>
            <Input
              placeholder={t('common.variable_name')}
              value={parameter.alias}
              readOnly
              wrapperProps={{
                style: { flex: '200 0 0', width: 0 },
              }}
              background="dark"
            />
            <Controller
              name="name"
              control={control}
              render={({ field: { value, onChange } }) => (
                <Input
                  placeholder={t('common.display_name')}
                  value={value}
                  onChange={onChange}
                  inputProps={{ required: true }}
                  wrapperProps={{
                    style: {
                      flex: '200 0 0',
                      width: 0,
                    },
                  }}
                  background="dark"
                />
              )}
            />
            <Controller
              name="unit"
              control={control}
              render={({ field: { value, onChange } }) => (
                <Input
                  placeholder={t('common.unit')}
                  value={value}
                  onChange={onChange}
                  wrapperProps={{
                    style: { flex: '100 0 0', width: 0 },
                  }}
                  background="dark"
                />
              )}
            />
            <Controller
              name="data_type"
              control={control}
              render={({ field: { value, onChange } }) => (
                <Dropdown
                  options={dataTypes}
                  value={value}
                  onChange={(value) => {
                    onChange(value);
                    setValue('scale', null);
                  }}
                  background="dark"
                  wrapperStyles={{
                    flex: '180 0 0',
                    width: 0,
                  }}
                />
              )}
            />
          </div>
          {dataType === 'number' ? (
            <div className={style['parameter-card__inputs']}>
              {dataType === 'number' ? (
                <Controller
                  name="scale"
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <ScaleInput
                      value={value}
                      onChange={onChange}
                      isNew
                      noExample={false}
                    />
                  )}
                />
              ) : (
                <div style={{ flex: '1 0 0' }} />
              )}
            </div>
          ) : null}
        </div>
      ) : (
        <div className={style['parameter-card__view']}>
          <span title={parameter.name}>{parameter.name}</span>
          {parameter.unit ? (
            <span title={normalizedUnit}>{`[${normalizedUnit}]`}</span>
          ) : null}
        </div>
      )}
      {showUpdate || showDelete ? (
        <div className={style['parameter-card__actions']}>
          {isEdit ? (
            <button
              className={clsx(
                style['parameter-card__action'],
                (!isDirty || updateParameter.isPending) &&
                  style['parameter-card__action--disabled']
              )}
              onClick={(e) => {
                e.stopPropagation();
              }}
              disabled={!isDirty || updateParameter.isPending}
              type="submit"
            >
              <Save />
            </button>
          ) : showUpdate ? (
            <div
              className={style['parameter-card__action']}
              onClick={(e) => {
                e.stopPropagation();
                setIsEdit(true);
              }}
            >
              <Edit1 />
            </div>
          ) : null}
          {isEdit ? (
            <div
              className={style['parameter-card__action']}
              onClick={(e) => {
                e.stopPropagation();
                setIsEdit(false);
                resetForm(modelId, parameter);
              }}
            >
              <Close />
            </div>
          ) : showDelete ? (
            <div
              className={style['parameter-card__action']}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(parameter);
              }}
            >
              <TrashDelete />
            </div>
          ) : null}
        </div>
      ) : null}
    </form>
  );
};

const ScaleInput = ({
  value,
  onChange,
  isNew,
  noExample,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  isNew?: boolean;
  noExample?: boolean;
}) => {
  const decimals = value != null ? value.toString() : '---';

  let example: string | null;

  if (value == null || value < 0) {
    example = null;
  } else {
    if (value === 0) {
      example = '1';
    } else {
      example = '0.';

      for (let i = 0; i < value; ++i) {
        example += i === value - 1 ? '1' : '0';
      }
    }
  }

  return (
    <>
      <div
        className={clsx(
          style['scale-input'],
          noExample && style['scale-input--no-example']
        )}
      >
        <DecimalDecrease
          className={clsx(
            style['scale-input__icon'],
            style['scale-input__icon--decrease']
          )}
          onClick={(e) => {
            e.stopPropagation();

            if (value == null) {
              return;
            }

            onChange(value === 0 ? null : Math.max(value - 1, 0));
          }}
        />
        <input
          className={style['scale-input__preview']}
          title={decimals}
          value={decimals}
          readOnly
        />
        <DecimalIncrease
          className={clsx(
            style['scale-input__icon'],
            style['scale-input__icon--increase']
          )}
          onClick={(e) => {
            e.stopPropagation();
            onChange(value == null ? 0 : Math.min(value + 1, 20));
          }}
        />
      </div>
      {noExample ? null : (
        <div
          className={clsx(
            style['scale-input-example'],
            isNew && style['scale-input-example--new']
          )}
          title={example || undefined}
        >
          {example ? `${t('common.example')}: ${example}` : null}
        </div>
      )}
    </>
  );
};

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowUndoReplyCircle,
  AssetV3Fill,
  InformationCircleFill,
  SaveFill,
  UtilitySystemDetail,
} from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import { toast } from '@digital-twin/reusables';
import { useContext, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

import {
  AuthCtx,
  Button,
  Container,
  Input,
  Loading,
  PermissionAliasEnum,
  PermissionGroupAliasEnum,
  Popup,
  useToggle,
} from '../../../../../..';
import { useEquipmentInfo, useUpdateEquipment } from '../hooks';
import { updateEquipmentFormSchema, UpdateEquipmentFormType } from '../schemas';
import { EpochDatePicker } from './epoch-date-picker';
import { EquipmentImage } from './equipment-image';
import style from './equipment-information.module.scss';
import { LicenseDropdown } from './license-dropdown';
import { LocationSelector } from './location-selector';
import { ModelDropdown } from './model-dropdown';

export const EquipmentInformation = ({
  alias,
}: {
  alias: string | undefined;
}) => {
  // Contexts
  const { hasPermission } = useContext(AuthCtx);

  // UAC
  const hasReadModelPermission = hasPermission(
    PermissionGroupAliasEnum.enum.modelmanager,
    PermissionAliasEnum.enum.read
  );

  const hasUpdatePermission = hasPermission(
    PermissionGroupAliasEnum.enum.equipmentmanager,
    PermissionAliasEnum.enum.update
  );

  const { data, isLoading } = useEquipmentInfo(alias);

  const updateEquipment = useUpdateEquipment();

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<UpdateEquipmentFormType>({
    defaultValues: {
      alias: '',
      name: '',
      image: { path: undefined, file: undefined },
      model_id: undefined,
      prev_model_id: undefined,
      created_at: undefined,
      location_id: undefined,
      license_id: null,
      prev_license_id: null,
    },
    resolver: zodResolver(updateEquipmentFormSchema),
  });

  useEffect(() => {
    if (!alias || !data) {
      return;
    }

    reset({
      alias: data.alias,
      name: data.name,
      image: { path: data.image_path, file: undefined },
      model_id: data.model_id,
      prev_model_id: data.model_id,
      created_at: data.created_at,
      location_id: data.location_id,
      license_id: data.license_id,
      prev_license_id: data.license_id,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alias, data]);

  const [showConfirm, toggleShowConfirm] = useToggle(false);

  const onSubmit = handleSubmit((form) => {
    if (!hasUpdatePermission) {
      return;
    }

    if (form.model_id !== form.prev_model_id) {
      toggleShowConfirm();
    } else {
      updateEquipment.mutate(form, {
        onSuccess: ({ alias, name }) => {
          toast.success(t('common.equipment_successfully_updated', name), {
            toastId: `successUpdateEquipment_${alias}`,
          });
        },
      });
    }
  });

  const onSubmitConfirm = handleSubmit((form) => {
    updateEquipment.mutate(form, {
      onSuccess: ({ alias, name }) => {
        toast.success(t('common.equipment_successfully_updated', name), {
          toastId: `successUpdateEquipment_${alias}`,
        });
        toggleShowConfirm();
      },
    });
  });

  return (
    <Container
      icon={<UtilitySystemDetail />}
      title={t('common.equipment_information')}
      className={style['equipment-information']}
      background={'none'}
    >
      <form className={style['form']} onSubmit={onSubmit}>
        <div className={style['form__inputs']}>
          <Loading isLoading={isLoading} />
          <div className={style['form__multi-columns']}>
            <div className={style['form__column']}>
              {alias ? (
                <Input
                  label={t('common.equipment_id') + ':'}
                  value={(alias && data?.alias) || '---'}
                  inputProps={{ required: true }}
                  readOnly
                  background="dark"
                />
              ) : (
                <Input
                  label={t('common.equipment_id')}
                  value="---"
                  readOnly
                  background="dark"
                />
              )}
            </div>
            <div className={style['form__column']}>
              <Controller
                name="name"
                control={control}
                render={({ field: { value, onChange } }) =>
                  alias ? (
                    <Input
                      label={t('common.equipment_name') + ':'}
                      value={value}
                      onChange={onChange}
                      inputProps={{ required: true }}
                      background="dark"
                    />
                  ) : (
                    <Input
                      label={t('common.equipment_name') + ':'}
                      value="---"
                      readOnly
                      background="dark"
                    />
                  )
                }
              />
            </div>
            {/* {data?.is_utility ? (
              <div className={style['form__utility']}>
                <AssetV3Fill className={style['form__utility__icon']} />
                <span className={style['form__utility__label']}>
                  {t('common.utility')}
                </span>
              </div>
            ) : null} */}
          </div>
          <div className={style['form__multi-columns']}>
            <Controller
              name="image"
              control={control}
              render={({ field: { value, onChange } }) => (
                <div className={style['form__image']}>
                  <span className={style['form__image__label']}>
                    {t('common.equipment_image')}:
                  </span>
                  <div className={style['form__image__input']}>
                    <EquipmentImage
                      value={value}
                      onChange={onChange}
                      className={style['form__column']}
                      alias={alias}
                    />
                  </div>
                </div>
              )}
            />
            <div className={style['form__metadata']}>
              <Controller
                name="model_id"
                control={control}
                render={({
                  field: { value, onChange },
                  fieldState: { error },
                }) => (
                  <ModelDropdown
                    value={value}
                    onChange={onChange}
                    error={error?.message}
                    noData={!alias}
                    background="dark"
                  />
                )}
              />
              <div className={style['form__multi-columns']}>
                <div className={style['form__column']}>
                  <Controller
                    name="created_at"
                    control={control}
                    render={({ field: { value, onChange } }) =>
                      alias ? (
                        <EpochDatePicker
                          label={t('common.installation_date') + ':'}
                          value={value}
                          onChange={onChange}
                          background="dark"
                        />
                      ) : (
                        <Input
                          label={t('common.installation_date') + ':'}
                          value="---"
                          inputProps={{ style: { height: 28 } }}
                          readOnly
                          background="dark"
                        />
                      )
                    }
                  />
                </div>
                <div className={style['form__column']}>
                  <Controller
                    name="location_id"
                    control={control}
                    render={({ field: { value, onChange } }) =>
                      alias ? (
                        <LocationSelector
                          value={value}
                          onChange={onChange}
                          background="dark"
                        />
                      ) : (
                        <Input
                          label={t('common.location') + ':'}
                          value="---"
                          inputProps={{ style: { height: 28 } }}
                          readOnly
                          background="dark"
                        />
                      )
                    }
                  />
                </div>
              </div>
            </div>
          </div>
          <Controller
            name="license_id"
            control={control}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <LicenseDropdown
                value={value}
                onChange={onChange}
                assignedLicenseId={data?.license_id}
                error={error?.message}
                noData={!alias}
                background="dark"
              />
            )}
          />
        </div>
        {hasReadModelPermission || hasUpdatePermission ? (
          <div className={style['form__save']}>
            {hasReadModelPermission ? (
              <Link to={`../model-manager?model_id=${data?.model_id}`}>
                <Button
                  color="default-secondary"
                  type="button"
                  disabled={!alias || isLoading || !data?.model_id}
                >
                  {t('common.model')}
                </Button>
              </Link>
            ) : null}
            {hasUpdatePermission ? (
              <Button
                icon={<SaveFill />}
                color={'default-primary'}
                type={'submit'}
                disabled={
                  isLoading || updateEquipment.isPending || !alias || !isDirty
                }
              >
                {t('common.save')}
              </Button>
            ) : null}
          </div>
        ) : null}
      </form>
      {hasUpdatePermission ? (
        <Popup
          icon={<InformationCircleFill />}
          title={t('common.changing_equipment_model')}
          open={showConfirm}
          onClose={toggleShowConfirm}
          onSubmit={onSubmitConfirm}
          submitting={updateEquipment.isPending}
          variant="save"
          background="none"
        >
          <div className={style['confirm']}>
            <span className={style['confirm__info']}>
              {t('common.changing_equipment_model')}
            </span>
          </div>
        </Popup>
      ) : null}
    </Container>
  );
};

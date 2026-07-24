import { zodResolver } from '@hookform/resolvers/zod';
import { SettingsPreferences, Sync } from '@digital-twin/icons';
import { t, useLanguageSwitcher } from '@digital-twin/utils';
import { toast } from '@digital-twin/reusables';
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { v4 as uuidv4 } from 'uuid';

import { Drawer, Input } from '../../../../../..';
import { ToggleButton } from '../../gateway-manager/components/gateway-card';
import { useAddEquipment } from '../hooks';
import { addEquipmentFormSchema, AddEquipmentFormType } from '../schemas';
import style from './add-equipment-drawer.module.scss';
import { EpochDatePicker } from './epoch-date-picker';
import { EquipmentImage } from './equipment-image';
import { LicenseDropdown } from './license-dropdown';
import { LocationSelector } from './location-selector';
import { ModelDropdown } from './model-dropdown';

export const AddEquipmentDrawer = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const addEquipment = useAddEquipment();

  const { currentLanguage } = useLanguageSwitcher();

  const addEquipmentFormZodSchema = useMemo(() => {
    return addEquipmentFormSchema;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLanguage]);

  const { control, handleSubmit, reset, setValue } =
    useForm<AddEquipmentFormType>({
      defaultValues: {
        alias: `eq_${uuidv4().replaceAll('-', '_')}`,
        name: '',
        image: { path: undefined, file: undefined },
        model_id: undefined,
        created_at: undefined,
        location_id: undefined,
        license_id: null,
        is_utility: false,
      },
      resolver: zodResolver(addEquipmentFormZodSchema),
    });

  const resetForm = () => {
    reset({
      alias: `eq_${uuidv4().replaceAll('-', '_')}`,
      name: '',
      image: { path: undefined, file: undefined },
      model_id: undefined,
      created_at: undefined,
      location_id: undefined,
      license_id: null,
      is_utility: false,
    });
  };

  const refreshId = () => {
    setValue('alias', `eq_${uuidv4().replaceAll('-', '_')}`);
  };

  const onSubmit = handleSubmit((form) => {
    addEquipment.mutate(form, {
      onSuccess: ({ alias, name }) => {
        // toast.success(`Equipment '${name}' successfully added`, {
        //   toastId: `successAddEquipment_${alias}`,
        // });
        toast.success(t('common.equipment_successfully_added', name), {
          toastId: `successAddEquipment_${alias}`,
        });
        onClose();
      },
    });
  });

  return (
    <Drawer
      icon={<SettingsPreferences />}
      // title="Add Equipment"
      title={t('common.add_equipment')}
      open={open}
      onClose={onClose}
      afterClose={resetForm}
      onSubmit={onSubmit}
      submitting={addEquipment.isPending}
      variant="add"
      background={'dark'}
    >
      <div className={style['form']}>
        <div className={style['form__image']}>
          <Controller
            name="image"
            control={control}
            render={({ field: { value, onChange } }) => (
              <EquipmentImage
                value={value}
                onChange={onChange}
                height={200}
                isAdd
                imageColor="dark"
                className={style['form__image__image']}
              />
            )}
          />
        </div>
        <div className={style['form__source-id']}>
          <div className={style['form__source-id__input']}>
            <Input
              label={t('common.equipment_id') + ':'}
              registered="alias"
              control={control}
              readOnly
              inputProps={{ required: true }}
              background={'dark'}
            />
          </div>
          <div
            className={style['form__button']}
            onClick={(e) => {
              e.stopPropagation();
              refreshId();
            }}
          >
            <Sync />
          </div>
        </div>
        <div className={style['name-container']}>
          <Input
            label={t('common.equipment_name') + ':'}
            registered="name"
            control={control}
            wrapperProps={{ style: { flex: '1 0 0' } }}
            inputProps={{ required: true }}
            background={'dark'}
          />
          <Controller
            name="is_utility"
            control={control}
            render={({ field: { value, onChange } }) => (
              <div
                className={style['name-container__button']}
                style={{ display: 'none' }}
              >
                <div className={style['utility-toggle']}>
                  <ToggleButton value={value} onChange={onChange} />
                  <span className={style['utility-toggle__label']}>
                    {t('common.utility')}
                  </span>
                </div>
              </div>
            )}
          />
        </div>
        <Controller
          name="model_id"
          control={control}
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <ModelDropdown
              value={value}
              onChange={onChange}
              error={error?.message}
              background={'dark'}
            />
          )}
        />
        <Controller
          name="created_at"
          control={control}
          render={({ field: { value, onChange } }) => (
            <EpochDatePicker
              label={t('common.installation_date') + ':'}
              value={value}
              onChange={onChange}
              background={'dark'}
            />
          )}
        />
        <Controller
          name="location_id"
          control={control}
          render={({ field: { value, onChange } }) => (
            <LocationSelector
              value={value}
              onChange={onChange}
              background={'dark'}
            />
          )}
        />
        <Controller
          name="license_id"
          control={control}
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <LicenseDropdown
              value={value}
              onChange={onChange}
              error={error?.message}
              background={'dark'}
            />
          )}
        />
      </div>
    </Drawer>
  );
};

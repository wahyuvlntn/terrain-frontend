import { zodResolver } from '@hookform/resolvers/zod';
import {
  AuthCtx,
  Button,
  Container,
  DropdownMultipleSelect,
  DropdownOptionCards,
  Loading,
  PermissionAliasEnum,
  PermissionGroupAliasEnum,
} from '@digital-twin/components';
import { ClipboardText, SaveFill } from '@digital-twin/icons';
import { toast } from '@digital-twin/reusables';
import { t } from '@digital-twin/utils';
import clsx from 'clsx';
import { useContext, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useBuildings, useEquipmentTypes } from '../api/master-data';
import { usePersonnelDetails, useUpdatePersonnelDetails } from '../api/personnel';
import { useExtractFilterPM } from '../filter/filter.extract';
import type { MasterDataEntryType } from '../schemas/master-data';
import type { UpdatePersonnelDetailsFormType } from '../schemas/personnel';
import { updatePersonnelDetailsFormSchema } from '../schemas/personnel';
import { CurrentMaintenanceOrder } from './current-maintenance-order';
import { KV } from './kv';
import styles from './pm-details.module.scss';
import { PMInfoTooltip } from './pm-info-tooltip';

const DEFAULT_FORM_VALUES: UpdatePersonnelDetailsFormType = {
  id: '',
  name: '',
  assignedBuildingIds: [],
  assignedEquipmentTypeIds: [],
};

interface PMDetailsProps {
  className?: string;
}

export const PMDetails = ({ className }: PMDetailsProps) => {
  // UAC
  const { hasPermission } = useContext(AuthCtx);
  const hasUpdatePermission = hasPermission(
    PermissionGroupAliasEnum.enum.personnelmanagement,
    PermissionAliasEnum.enum.update
  );

  const {
    filter: { selected: selectedPersonnelId },
  } = useExtractFilterPM();

  const { data: details, isLoading: isLoadingDetails } = usePersonnelDetails(selectedPersonnelId);
  const { data: buildings } = useBuildings();
  const { data: equipmentTypes } = useEquipmentTypes();

  const updateDetails = useUpdatePersonnelDetails();

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<UpdatePersonnelDetailsFormType>({
    defaultValues: DEFAULT_FORM_VALUES,
    resolver: zodResolver(updatePersonnelDetailsFormSchema),
  });

  const onSubmit = handleSubmit((form) => {
    updateDetails.mutate(form, {
      onSuccess: (form) => {
        toast.success(t('common.personnel_details_successfully_updated', form.name), {
          toastId: `success_update_personnel_details_${form.id}`,
        });
      },
    });
  });

  useEffect(() => {
    if (!details) {
      return;
    }
    reset(details);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details]);

  return (
    <Container
      className={clsx(styles['container'], className)}
      background="none"
      icon={<ClipboardText />}
      title={details?.name ?? t('common.personnel_details')}
      titleSuffixIcon={
        <PMInfoTooltip
          title={t('common.personnel_details')}
          content={t('common.personnel_details_info')}
        />
      }
      contentWrapperProps={{
        className: styles['content'],
      }}
    >
      <div className={styles['content__top']}>
        <KV
          k={t('common.created') + ':'}
          v={details?.createdAt ? formatTimestamp(details.createdAt) : '-'}
          textClassName={styles['kv-text']}
        />
        <KV
          k={t('common.updated') + ':'}
          v={details?.updatedAt ? formatTimestamp(details.updatedAt) : '-'}
          textClassName={styles['kv-text']}
        />
        <KV
          k={t('common.current_maintenance_order') + ':'}
          v={
            details?.currentMaintenanceOrder ? (
              <CurrentMaintenanceOrder orderName={details.currentMaintenanceOrder} />
            ) : (
              '-'
            )
          }
          textClassName={styles['kv-text']}
        />
      </div>
      <form className={styles['content__form']} onSubmit={onSubmit}>
        <div className={styles['content__form__inputs']}>
          <Loading isLoading={isLoadingDetails} />
          <Controller
            name="assignedBuildingIds"
            control={control}
            render={({ field: { value, onChange } }) => {
              const options = masterDataEntriesToOptions(buildings?.entries);
              return (
                <div className={styles['dropdown-container']}>
                  <DropdownMultipleSelect
                    label={t('common.assigned_building') + ':'}
                    value={value}
                    onChange={onChange}
                    options={options}
                    disabled={!selectedPersonnelId || details?.isDeleted}
                    placeholder={t('common.assigned_building_placeholder') + ':'}
                    selectedOptionsLabel={
                      t('common.assigned_building_selected_options_label') + ':'
                    }
                    selectedOptionsPlaceholder={t(
                      'common.assigned_building_selected_options_placeholder'
                    )}
                    selectedOptionsVariant="checkbox"
                    availableOptionsLabel={
                      t('common.assigned_building_available_options_label') + ':'
                    }
                    readOnly={!hasUpdatePermission}
                    required
                  />
                  <DropdownOptionCards
                    value={value}
                    onChange={onChange}
                    options={options}
                    readOnly={!hasUpdatePermission}
                    disabled={!selectedPersonnelId || details?.isDeleted}
                  />
                </div>
              );
            }}
          />
          <Controller
            name="assignedEquipmentTypeIds"
            control={control}
            render={({ field: { value, onChange } }) => {
              const options = masterDataEntriesToOptions(equipmentTypes?.entries);
              return (
                <div className={styles['dropdown-container']}>
                  <DropdownMultipleSelect
                    label={t('common.assigned_equipment_type') + ':'}
                    value={value}
                    onChange={onChange}
                    options={options}
                    disabled={!selectedPersonnelId || details?.isDeleted}
                    placeholder={t('common.assigned_equipment_type_placeholder') + ':'}
                    selectedOptionsLabel={
                      t('common.assigned_equipment_type_selected_options_label') + ':'
                    }
                    selectedOptionsPlaceholder={t(
                      'common.assigned_equipment_type_selected_options_placeholder'
                    )}
                    selectedOptionsVariant="checkbox"
                    availableOptionsLabel={
                      t('common.assigned_equipment_type_available_options_label') + ':'
                    }
                    readOnly={!hasUpdatePermission}
                    required
                  />
                  <DropdownOptionCards
                    value={value}
                    onChange={onChange}
                    options={options}
                    readOnly={!hasUpdatePermission}
                    disabled={!selectedPersonnelId || details?.isDeleted}
                  />
                </div>
              );
            }}
          />
        </div>
        {hasUpdatePermission ? (
          <div className={styles['content__form__buttons']}>
            <Button
              color="default-secondary"
              disabled={
                !selectedPersonnelId ||
                isLoadingDetails ||
                updateDetails.isPending ||
                !isDirty ||
                details?.isDeleted
              }
              onClick={() => {
                if (details) {
                  reset(details);
                }
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              icon={<SaveFill />}
              type="submit"
              disabled={
                !selectedPersonnelId ||
                isLoadingDetails ||
                updateDetails.isPending ||
                !isDirty ||
                details?.isDeleted
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

function formatTimestamp(timestamp: number) {
  return new Date(timestamp)
    .toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .replace(',', '');
}

function masterDataEntriesToOptions(entries: MasterDataEntryType[] | undefined) {
  if (!entries) {
    return [];
  }
  return entries.map(({ id, name }) => ({ value: id, label: name }));
}

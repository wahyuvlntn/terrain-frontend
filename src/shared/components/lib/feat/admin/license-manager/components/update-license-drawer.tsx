import { zodResolver } from '@hookform/resolvers/zod';
import { Edit1 } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import { toast } from '@digital-twin/reusables';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Input, TextBox } from '../../../../input';
import { ClosedBy, Drawer } from '../../../../navigation';
import { Loading } from '../../../../others';
import { LicenseStatus } from '../../connection-manager/model-manager/components/license-status';
import { LicenseType } from '../../connection-manager/model-manager/components/license-type';
import { useLicenseInfo, useUpdateLicense } from '../hooks';
import { updateLicenseFormSchema, UpdateLicenseFormType } from '../schemas';
import { LicenseFileStandardized } from './license-file-standardized';
import style from './update-license-drawer.module.scss';

export const UpdateLicenseDrawer = ({
  licenseKey,
  open,
  onClose,
}: {
  licenseKey?: string;
  open: boolean;
  onClose: () => void;
}) => {
  // For fetching license info
  const { data, isLoading } = useLicenseInfo(licenseKey, open);

  // For updating a license
  const updateLicense = useUpdateLicense();

  // Form
  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<UpdateLicenseFormType>({
    defaultValues: {
      license_key: '',
      license_name: '',
      license_file: null,
    },
    resolver: zodResolver(updateLicenseFormSchema),
  });

  useEffect(() => {
    if (!licenseKey || !data) {
      return;
    }

    reset({
      license_key: licenseKey,
      license_name: data.name,
      license_file: null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [licenseKey, data]);

  const onSubmit = handleSubmit((form) => {
    updateLicense.mutate(form, {
      onSuccess: (form) => {
        toast.success(
          `${t('common.license_success_updated', form.license_name)}`,
          {
            toastId: `success_update_license_${form.license_key}`,
          }
        );
        onClose();
      },
    });
  });

  // Calculate remaining days
  let expiredAt = '---';
  let remainingDays = '---';

  if (data?.expired_at) {
    expiredAt = new Date(data.expired_at).toLocaleString();

    const remainingMs = data.expired_at - Date.now();

    if (remainingMs > 0) {
      remainingDays = (
        Math.round((remainingMs / (24 * 3600 * 1000)) * 100) / 100
      ).toLocaleString();
    }
  }

  return (
    <Drawer
      icon={<Edit1 />}
      title={t('common.update_license')}
      open={open}
      onClose={onClose}
      afterClose={(closedBy) => {
        if (!licenseKey || !data) {
          return;
        }

        if (closedBy === ClosedBy.CANCEL) {
          reset({
            license_key: licenseKey,
            license_name: data.name,
            license_file: undefined,
          });
        }
      }}
      onSubmit={onSubmit}
      disableSubmit={!isDirty}
      submitting={updateLicense.isPending}
      variant="save"
      background="dark"
    >
      <div className={style['update-license-form']}>
        <Loading isLoading={isLoading} />
        <div className={style['columns']}>
          <div className={style['input-lookalike']}>
            <span>{t('common.status') + ':'}</span>
            <LicenseStatus
              isActive={data?.is_active}
              status={data?.status_message}
            />
          </div>
          <div className={style['input-lookalike']}>
            <span>{t('common.license_type') + ':'}</span>
            <LicenseType type={data?.type} />
          </div>
        </div>
        <Input
          label={t('common.license_key') + ':'}
          value={licenseKey}
          readOnly
          background="dark"
        />
        <Input
          label={t('common.license_name') + ':'}
          registered="license_name"
          control={control}
          inputProps={{ required: true }}
          background="dark"
        />
        <div className={style['columns']}>
          <Input
            label={t('common.expiry') + ':'}
            value={expiredAt}
            wrapperProps={{ className: style['column-item'] }}
            readOnly
            background="dark"
          />
          <Input
            label={t('common.remaining_days') + ':'}
            value={remainingDays}
            wrapperProps={{ className: style['column-item'] }}
            readOnly
            background="dark"
          />
        </div>
        <div className={style['columns']}>
          <Input
            label={t('common.total_equipment') + ':'}
            value={data?.total || '---'}
            wrapperProps={{ className: style['column-item'] }}
            readOnly
            background="dark"
          />
          <Input
            label={t('common.available') + ':'}
            value={data ? data.total - data.used.length : '---'}
            wrapperProps={{ className: style['column-item'] }}
            readOnly
            background="dark"
          />
          <Input
            label={t('common.used') + ':'}
            value={data ? data.used.length : '---'}
            wrapperProps={{ className: style['column-item'] }}
            readOnly
            background="dark"
          />
        </div>
        <TextBox
          label={t('common.description') + ':'}
          value={data?.description || '---'}
          readOnly
          rows={3}
          background="dark"
        />
        <hr className={style['separator']} />
        <Controller
          name="license_file"
          control={control}
          render={({ field: { value, onChange } }) => (
            <LicenseFileStandardized
              label={t('common.license_file') + ` (${t('common.optional')})`}
              value={value}
              onChange={onChange}
            />
          )}
        />
      </div>
    </Drawer>
  );
};

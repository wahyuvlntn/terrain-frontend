import { zodResolver } from '@hookform/resolvers/zod';
import { CloudUploadFill } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import { toast } from '@digital-twin/reusables';
import { Controller, useForm } from 'react-hook-form';

import { Input } from '../../../../input';
import { Drawer } from '../../../../navigation';
import { useSystemId, useUploadLicense } from '../hooks';
import {
  uploadLicenseFileFormSchema,
  UploadLicenseFileFormType,
} from '../schemas';
import { LicenseFileStandardized } from './license-file-standardized';
import style from './upload-license-drawer.module.scss';

export const UploadLicenseDrawer = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  // For fetching license system id
  const { data: systemId } = useSystemId();

  // For uploading a license
  const uploadLicense = useUploadLicense();

  // Form
  const { control, handleSubmit, reset } = useForm<UploadLicenseFileFormType>({
    defaultValues: {
      license_name: '',
      license_file: undefined,
    },
    resolver: zodResolver(uploadLicenseFileFormSchema),
  });

  const onSubmit = handleSubmit((form) => {
    uploadLicense.mutate(form, {
      onSuccess: (form) => {
        toast.success(
          `${t('common.license_success_added', form.license_name)}`,
          {
            toastId: `success_upload_license_${form.license_name}`,
          }
        );
        onClose();
      },
    });
  });

  return (
    <Drawer
      icon={<CloudUploadFill />}
      title={t('common.upload_license')}
      open={open}
      onClose={onClose}
      afterClose={() => {
        reset({ license_name: '', license_file: undefined });
      }}
      onSubmit={onSubmit}
      submitting={uploadLicense.isPending}
      variant="upload"
      background="dark"
    >
      <div className={style['upload-license-form']}>
        <Input
          label={t('common.system_id') + ':'}
          value={systemId || '---'}
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
        <Controller
          name="license_file"
          control={control}
          render={({ field: { value, onChange } }) => (
            <LicenseFileStandardized
              label={t('common.license_file') + ':'}
              value={value}
              onChange={onChange}
              required
            />
          )}
        />
      </div>
    </Drawer>
  );
};

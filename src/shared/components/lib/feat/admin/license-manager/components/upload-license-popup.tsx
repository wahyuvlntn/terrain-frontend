// import { zodResolver } from '@hookform/resolvers/zod';
// import { CloudUploadFill } from '@digital-twin/icons';
// import { toast } from '@digital-twin/reusables';
// import { Controller, useForm } from 'react-hook-form';
//
// import { Input } from '../../../../input';
// import { Popup } from '../../../../navigation';
// import { useSystemId, useUploadLicense } from '../hooks';
// import {
//   uploadLicenseFileFormSchema,
//   UploadLicenseFileFormType,
// } from '../schemas';
// import { LicenseFile } from './license-file';
// import style from './upload-license-popup.module.scss';

//TODO: remove this since it's not used anywhere
// export const UploadLicensePopup = ({
//   open,
//   onClose,
// }: {
//   open: boolean;
//   onClose: () => void;
// }) => {
//   // For fetching license system id
//   const { data: systemId } = useSystemId();
//
//   // For uploading a license
//   const uploadLicense = useUploadLicense();
//
//   // Form
//   const { control, handleSubmit, reset } = useForm<UploadLicenseFileFormType>({
//     defaultValues: {
//       license_name: '',
//       license_file: undefined,
//     },
//     resolver: zodResolver(uploadLicenseFileFormSchema),
//   });
//
//   const onSubmit = handleSubmit((form) => {
//     uploadLicense.mutate(form, {
//       onSuccess: (form) => {
//         toast.success(`License '${form.license_name}' successfully added`, {
//           toastId: `success_upload_license_${form.license_name}`,
//         });
//         onClose();
//         reset({ license_name: '', license_file: undefined });
//       },
//     });
//   });
//
//   return (
//     <Popup
//       icon={<CloudUploadFill />}
//       title="Upload License"
//       open={open}
//       onClose={onClose}
//       onSubmit={onSubmit}
//       submitting={uploadLicense.isPending}
//       variant="add"
//       background="none"
//     >
//       <div className={style['upload-license-form']}>
//         <Input label="System ID:" value={systemId || '---'} readOnly />
//         <Input
//           label="License Name:"
//           registered="license_name"
//           control={control}
//           inputProps={{ required: true }}
//         />
//         <Controller
//           name="license_file"
//           control={control}
//           render={({ field: { value, onChange } }) => (
//             <LicenseFile
//               label="License File:"
//               previewLabel="License Information:"
//               value={value}
//               onChange={onChange}
//               required
//             />
//           )}
//         />
//       </div>
//     </Popup>
//   );
// };

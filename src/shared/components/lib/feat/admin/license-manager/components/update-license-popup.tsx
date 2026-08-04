// // React builtins
// // For managing form
// import { zodResolver } from '@hookform/resolvers/zod';
// // Reusables
// import { Edit1 } from '@digital-twin/icons';
// // For showing toast notification
// import { toast } from '@digital-twin/reusables';
// import { useEffect } from 'react';
// import { Controller, useForm } from 'react-hook-form';
//
// import { Input, TextBox } from '../../../../input';
// import { ClosedBy, Popup } from '../../../../navigation';
// import { Loading } from '../../../../others';
// import { LicenseStatus } from '../../connection-manager/model-manager/components/license-status';
// import { LicenseType } from '../../connection-manager/model-manager/components/license-type';
// // Hooks
// import { useLicenseInfo, useUpdateLicense } from '../hooks';
// // Schemas
// import { updateLicenseFormSchema, UpdateLicenseFormType } from '../schemas';
// // Components
// import { LicenseFile } from './license-file';
// // Style
// import style from './update-license-popup.module.scss';

//TODO: remove this since it's not used anywhere
// export const UpdateLicensePopup = ({
//   licenseKey,
//   open,
//   onClose,
// }: {
//   licenseKey?: string;
//   open: boolean;
//   onClose: () => void;
// }) => {
//   // For fetching license info
//   const { data, isLoading } = useLicenseInfo(licenseKey, open);
//
//   // For updating a license
//   const updateLicense = useUpdateLicense();
//
//   // Form
//   const {
//     control,
//     handleSubmit,
//     reset,
//     formState: { isDirty },
//   } = useForm<UpdateLicenseFormType>({
//     defaultValues: {
//       license_key: '',
//       license_name: '',
//       license_file: null,
//     },
//     resolver: zodResolver(updateLicenseFormSchema),
//   });
//
//   useEffect(() => {
//     if (!licenseKey || !data) {
//       return;
//     }
//
//     reset({
//       license_key: licenseKey,
//       license_name: data.name,
//       license_file: null,
//     });
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [licenseKey, data]);
//
//   const onSubmit = handleSubmit((form) => {
//     updateLicense.mutate(form, {
//       onSuccess: (form) => {
//         toast.success(`License '${form.license_name}' successfully updated`, {
//           toastId: `success_update_license_${form.license_key}`,
//         });
//         onClose();
//       },
//     });
//   });
//
//   // Calculate remaining days
//   let expiredAt = '---';
//   let remainingDays = '---';
//
//   if (data?.expired_at) {
//     expiredAt = new Date(data.expired_at).toLocaleString();
//
//     const remainingMs = data.expired_at - Date.now();
//
//     if (remainingMs > 0) {
//       remainingDays = (
//         Math.round((remainingMs / (24 * 3600 * 1000)) * 100) / 100
//       ).toLocaleString();
//     }
//   }
//
//   return (
//     <Popup
//       icon={<Edit1 />}
//       title="Update License"
//       open={open}
//       onClose={onClose}
//       afterClose={(closedBy) => {
//         if (!licenseKey || !data) {
//           return;
//         }
//
//         if (closedBy === ClosedBy.CANCEL) {
//           reset({
//             license_key: licenseKey,
//             license_name: data.name,
//             license_file: undefined,
//           });
//         }
//       }}
//       onSubmit={onSubmit}
//       disableSubmit={!isDirty}
//       submitting={updateLicense.isPending}
//       variant="save"
//       background="none"
//     >
//       <div className={style['update-license-form']}>
//         <Loading isLoading={isLoading} />
//         <div className={style['columns']}>
//           <div className={style['input-lookalike']}>
//             <span>Status:</span>
//             <LicenseStatus
//               isActive={data?.is_active}
//               status={data?.status_message}
//             />
//           </div>
//           <div className={style['input-lookalike']}>
//             <span>License Type:</span>
//             <LicenseType type={data?.type} />
//           </div>
//         </div>
//         <Input label="License Key:" value={licenseKey} readOnly />
//         <Input
//           label="License Name:"
//           registered="license_name"
//           control={control}
//           inputProps={{ required: true }}
//         />
//         <div className={style['columns']}>
//           <Input
//             label="Expiry:"
//             value={expiredAt}
//             wrapperProps={{ className: style['column-item'] }}
//             readOnly
//           />
//           <Input
//             label="Remaining Days:"
//             value={remainingDays}
//             wrapperProps={{ className: style['column-item'] }}
//             readOnly
//           />
//         </div>
//         <div className={style['columns']}>
//           <Input
//             label="Total Equipments:"
//             value={data?.total || '---'}
//             wrapperProps={{ className: style['column-item'] }}
//             readOnly
//           />
//           <Input
//             label="Available:"
//             value={data ? data.total - data.used.length : '---'}
//             wrapperProps={{ className: style['column-item'] }}
//             readOnly
//           />
//           <Input
//             label="Used:"
//             value={data ? data.used.length : '---'}
//             wrapperProps={{ className: style['column-item'] }}
//             readOnly
//           />
//         </div>
//         <TextBox
//           label="Description:"
//           value={data?.description || '---'}
//           readOnly
//           rows={3}
//         />
//         <hr className={style['separator']} />
//         <Controller
//           name="license_file"
//           control={control}
//           render={({ field: { value, onChange } }) => (
//             <LicenseFile
//               label="License File (optional):"
//               previewLabel="License Information:"
//               value={value}
//               onChange={onChange}
//             />
//           )}
//         />
//       </div>
//     </Popup>
//   );
// };

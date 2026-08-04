// import { FolderFill, SuccessNormalCheckCircleFill } from '@digital-twin/icons';
// import clsx from 'clsx';
// import { useEffect, useId, useMemo, useState } from 'react';
//
// import { Input } from '../../../../input';
// import { useVerifyLicense } from '../hooks';
// import { LicenseContentType } from '../schemas';
// import style from './license-file.module.scss';

//TODO: Remove this since it's used only in UpdateLicensePopup (which is not used anywhere)
// export const LicenseFile = ({
//   label,
//   previewLabel,
//   value,
//   onChange,
//   required,
// }: {
//   label?: string;
//   previewLabel?: string;
//   value?: File | null;
//   onChange: (value: File) => void;
//   required?: boolean;
// }) => {
//   // Generate id for the file input
//   const id = useId();
//
//   // For verifying license file
//   const verifyLicense = useVerifyLicense();
//
//   // For displaying verification result
//   const [result, setResult] = useState<LicenseContentType>();
//
//   // Reset result whenever the file changes
//   useEffect(() => {
//     setResult(undefined);
//   }, [value]);
//
//   // Normalize result
//   const normalizedResult = useMemo(() => {
//     if (!result) {
//       return null;
//     }
//
//     // Capitalize first letter of the license type
//     const licenseType = result.type[0].toUpperCase() + result.type.slice(1);
//
//     // Calculate remaining days
//     let expiredAt = '---';
//     let remainingDays: number | string = '---';
//
//     if (result.expired_at) {
//       expiredAt = new Date(result.expired_at).toLocaleString();
//
//       const remainingMs = result.expired_at - Date.now();
//
//       if (remainingMs > 0) {
//         remainingDays =
//           Math.round((remainingMs / (24 * 3600 * 1000)) * 100) / 100;
//       }
//     }
//
//     return (
//       <div className={style['license-information']}>
//         {previewLabel ? (
//           <span className={style['license-information__label']}>
//             {previewLabel}
//           </span>
//         ) : null}
//         <div className={style['license-information__result']}>
//           <div className={style['license-information__result__kv']}>
//             <b>License Key:</b>
//             <span>{result.key}</span>
//           </div>
//           <div className={style['license-information__result__kv']}>
//             <b>Expiry:</b>
//             <span>{expiredAt}</span>
//           </div>
//           <div className={style['license-information__result__kv']}>
//             <b>Remaining Days:</b>
//             <span>{remainingDays}</span>
//           </div>
//           <div className={style['license-information__result__kv']}>
//             <b>Type:</b>
//             <span>{licenseType}</span>
//           </div>
//           <div className={style['license-information__result__kv']}>
//             <b>Description:</b>
//             <span>{result.description}</span>
//           </div>
//           <div className={style['license-information__result__kv']}>
//             <b>Total Equipments:</b>
//             <span>{result.asset_keys.length.toLocaleString()}</span>
//           </div>
//         </div>
//       </div>
//     );
//   }, [result, previewLabel]);
//
//   return (
//     <div className={style['license-file']}>
//       {label ? (
//         <span className={style['license-file__label']}>{label}</span>
//       ) : null}
//       <div className={style['license-file__input-container']}>
//         <Input
//           value={value ? value.name : ''}
//           wrapperProps={{ className: style['license-file__name'] }}
//           inputProps={{ required: required }}
//         />
//         <label htmlFor={id} className={style['license-file__label-file']}>
//           <div
//             className={clsx(
//               style['license-file__button'],
//               style['license-file__button--choose-file']
//             )}
//           >
//             <FolderFill />
//             <span>{value ? 'File' : 'Choose File'}</span>
//           </div>
//           <input
//             className={style['license-file__input-file']}
//             value=""
//             onChange={(e) => {
//               const file = e.target.files?.[0];
//
//               if (file) {
//                 onChange(file);
//               }
//             }}
//             id={id}
//             type="file"
//             accept=".bin"
//           />
//         </label>
//         {value ? (
//           <div
//             className={clsx(
//               style['license-file__button'],
//               style['license-file__button--verify'],
//               verifyLicense.isPending && style['license-file__button--disabled']
//             )}
//             onClick={(e) => {
//               e.stopPropagation();
//
//               if (verifyLicense.isPending) {
//                 return;
//               }
//
//               verifyLicense.mutate(
//                 { license_file: value },
//                 {
//                   onSuccess: setResult,
//                 }
//               );
//             }}
//           >
//             <SuccessNormalCheckCircleFill />
//             Verify
//           </div>
//         ) : null}
//       </div>
//       {normalizedResult}
//     </div>
//   );
// };

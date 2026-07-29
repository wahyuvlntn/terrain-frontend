// // React builtins
// // For managing form
// import { zodResolver } from '@hookform/resolvers/zod';
// // Reusables
// import { SettingsPreferences } from '@digital-twin/icons';
// import { t } from '@digital-twin/utils';
// // For showing toast notification
// import { toast } from '@digital-twin/reusables';
// import { useContext, useEffect } from 'react';
// import { Controller, useForm } from 'react-hook-form';
//
// import { Input, TextBox } from '../../../../../input';
// import { Drawer } from '../../../../../navigation';
// // Contexts
// import { PrjCtx } from '../contexts';
// // Hooks
// import { useAddGatewayTags } from '../hooks';
// // Schemas
// import {
//   addGatewayTagsFormSchema,
//   AddGatewayTagsFormType,
//   GatewayProtocolType,
// } from '../schemas';
// // Style
// import style from './gateway-tag-drawer.module.scss';
// // Components
// import { TagAddressInput } from './tag-address-input';

//TODO: remove this since it's not used anywhere
// export const AddGatewayTagDrawer = ({
//   gatewayAlias,
//   gatewayProtocol,
//   open,
//   onClose,
// }: {
//   gatewayAlias?: string;
//   gatewayProtocol?: GatewayProtocolType;
//   open: boolean;
//   onClose: () => void;
// }) => {
//   const prj = useContext(PrjCtx);
//
//   const addGatewayTags = useAddGatewayTags();
//
//   const { control, handleSubmit, reset } = useForm<AddGatewayTagsFormType>({
//     defaultValues: {
//       gateway_alias: '',
//       gateway_tags: [{ name: '', address: '', description: null }],
//     },
//     resolver: zodResolver(addGatewayTagsFormSchema),
//   });
//
//   const resetForm = (gatewayAlias?: string) => {
//     reset({
//       gateway_alias: gatewayAlias || '',
//       gateway_tags: [{ name: '', address: '', description: null }],
//     });
//   };
//
//   useEffect(() => {
//     resetForm(gatewayAlias);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [gatewayAlias]);
//
//   const onSubmit = handleSubmit((form) => {
//     addGatewayTags.mutate(form, {
//       onSuccess: () => {
//         toast.success(
//           t('common.tag_successfully_added', form.gateway_tags[0].name),
//           {
//             toastId: `success_add_gateway_tag_${form.gateway_alias}_${form.gateway_tags[0].name}}`,
//           }
//         );
//         onClose();
//       },
//     });
//   });
//
//   return (
//     <Drawer
//       icon={<SettingsPreferences />}
//       title={t('common.add_data_source_tag')}
//       open={open}
//       onClose={onClose}
//       afterClose={() => {
//         resetForm(gatewayAlias);
//       }}
//       onSubmit={onSubmit}
//       submitting={addGatewayTags.isPending}
//       variant="add"
//     >
//       <PrjCtx.Provider value={prj}>
//         <div className={style['gateway-tag-drawer']}>
//           <div className={style['gateway-tag-form']}>
//             <Controller
//               name="gateway_tags.0.name"
//               control={control}
//               render={({
//                 field: { value, onChange },
//                 fieldState: { error },
//               }) => (
//                 <Input
//                   label={t('common.name')}
//                   value={value}
//                   onChange={onChange}
//                   isError={!!error}
//                   detail={error?.message}
//                   inputProps={{ required: true }}
//                 />
//               )}
//             />
//             <Controller
//               name="gateway_tags.0.address"
//               control={control}
//               render={({ field: { value, onChange } }) => (
//                 <TagAddressInput
//                   gatewayAlias={gatewayAlias}
//                   protocol={gatewayProtocol}
//                   value={value}
//                   onChange={onChange}
//                 />
//               )}
//             />
//             <Controller
//               name="gateway_tags.0.description"
//               control={control}
//               render={({ field: { value, onChange } }) => (
//                 <TextBox
//                   label={t('common.description')}
//                   value={value || ''}
//                   onChange={(value) => {
//                     onChange(value || null);
//                   }}
//                   placeholder={t('common.placeholder_description_limit')}
//                   maxLength={160}
//                   detail={`${value?.length || 0} / 160`}
//                   rows={4}
//                 />
//               )}
//             />
//           </div>
//         </div>
//       </PrjCtx.Provider>
//     </Drawer>
//   );
// };

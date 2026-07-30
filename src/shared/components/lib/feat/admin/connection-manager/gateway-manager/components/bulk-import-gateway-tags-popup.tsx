// // For showing toast notification
// // Reusables
// import { SettingsPreferences } from '@digital-twin/icons';
// import { t } from '@digital-twin/utils';
// import { toast } from '@digital-twin/reusables';
//
// import { Column, Row } from '../../../../../data';
// import { BulkImportPopup } from '../../../../../others';
// // Hooks
// import { useImportGatewayTags } from '../hooks';
// // Schemas
// import { gatewayTagSchema, GatewayTagType } from '../schemas';

// Constants
// const TEMPLATE_HEADERS = ['name', 'address', 'description'];
// const TEMPLATE_DATA = ['<name>', '<address>', '<description>'];
// const TEMPLATE_PREFIX = 'import_data_source_tags';
//
// const COLUMNS: Column[] = [
//   { key: 'name', name: t('common.name'), width: 100 },
//   { key: 'address', name: t('common.address'), width: 100 },
//   { key: 'description', name: t('common.description'), width: 150 },
// ];

//TODO: remove this since it's not used anywhere
// export const BulkImportGatewayTagsPopup = ({
//   gatewayAlias,
//   open,
//   onClose,
// }: {
//   gatewayAlias?: string;
//   open: boolean;
//   onClose: () => void;
// }) => {
//   const importGatewayTags = useImportGatewayTags();
//
//   const onSubmit = (tags: GatewayTagType[]) => {
//     if (!gatewayAlias) {
//       return;
//     }
//
//     importGatewayTags.mutate(
//       { gateway_alias: gatewayAlias, gateway_tags: tags },
//       {
//         onSuccess: ({ gateway_alias, gateway_tags }) => {
//           toast.success(
//             t('common.tags_successfully_imported', String(gateway_tags.length)),
//             {
//               toastId: `success_import_gateway_tags_${gateway_alias}}`,
//             }
//           );
//           onClose();
//         },
//       }
//     );
//   };
//
//   return (
//     <BulkImportPopup
//       icon={<SettingsPreferences />}
//       title={t('common.import_data_source_tags')}
//       open={open}
//       onClose={onClose}
//       columns={COLUMNS}
//       parseRows={parseRows}
//       renderRow={renderRow}
//       onSubmit={onSubmit}
//       submitting={importGatewayTags.isPending}
//       templateHeaders={TEMPLATE_HEADERS}
//       templateData={TEMPLATE_DATA}
//       templatePrefix={TEMPLATE_PREFIX}
//     />
//   );
// };

// function parseRows(rows: unknown[]) {
//   return gatewayTagSchema.array().parse(rows);
// }
//
// function renderRow(row: GatewayTagType, index: number): Row {
//   return {
//     id: index.toString(),
//     name: row.name,
//     address: row.address,
//     description: row.description || '---',
//   };
// }

// import { SettingsPreferences } from '@digital-twin/icons';
// import { toast } from '@digital-twin/reusables';
//
// import { Column, Row } from '../../../../../data';
// import { t } from '../../../../../i18n';
// import { BulkImportPopup } from '../../../../../others';
// import { useImportModelParameters } from '../hooks/model';
// import {
//   modelParameterCsvRowSchema,
//   ModelParameterCsvRowType,
// } from '../schemas';

// // Constants
// const TEMPLATE_HEADERS = [
//   'variable_name',
//   'display_name',
//   'unit',
//   'data_type',
//   'decimals',
// ];
//
// const TEMPLATE_DATA = [
//   '<variable_name>',
//   '<display_name>',
//   '<unit>',
//   '<number | string | boolean>',
//   '<decimal digits (0 - 20, only for number; leave this empty to disable)>',
// ];
//
// const TEMPLATE_PREFIX = 'import_model_variables';
//
// const COLUMNS: Column[] = [
//   { key: 'variable_name', name: t('common.variable_name'), width: 200 },
//   { key: 'display_name', name: t('common.display_name'), width: 200 },
//   { key: 'unit', name: t('common.unit'), width: 100 },
//   { key: 'data_type', name: t('common.data_type'), width: 100 },
//   {
//     key: 'decimals',
//     name: t('common.decimals'),
//     width: 100,
//     alignment: 'center',
//   },
// ];

//TODO: remove this since it's not used anywhere
// export const BulkImportModelParametersPopup = ({
//   modelId,
//   open,
//   onClose,
// }: {
//   modelId?: number;
//   open: boolean;
//   onClose: () => void;
// }) => {
//   const importModelParameters = useImportModelParameters();
//
//   const onSubmit = (parameters: ModelParameterCsvRowType[]) => {
//     if (!modelId) {
//       return;
//     }
//
//     importModelParameters.mutate(
//       { model_id: modelId, parameters },
//       {
//         onSuccess: (model_id) => {
//           toast.success(
//             t(
//               'common.variables_successfully_imported',
//               String(parameters.length)
//             ),
//             {
//               toastId: `success_import_model_parameters_${model_id}`,
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
//       title={t('common.import_variables')}
//       open={open}
//       onClose={onClose}
//       columns={COLUMNS}
//       parseRows={parseRows}
//       renderRow={renderRow}
//       onSubmit={onSubmit}
//       submitting={importModelParameters.isPending}
//       templateHeaders={TEMPLATE_HEADERS}
//       templateData={TEMPLATE_DATA}
//       templatePrefix={TEMPLATE_PREFIX}
//       width={750}
//     />
//   );
// };

// function parseRows(rows: unknown[]) {
//   return modelParameterCsvRowSchema.array().parse(rows);
// }
//
// function renderRow(row: ModelParameterCsvRowType, index: number): Row {
//   if (row.data_type === 'number' && row.decimals) {
//     const parsed = parseInt(row.decimals);
//
//     return {
//       id: index.toString(),
//       variable_name: row.variable_name,
//       display_name: row.display_name,
//       unit: row.unit || '---',
//       data_type: row.data_type,
//       decimals: isNaN(parsed) ? '---' : parsed.toString(),
//     };
//   } else {
//     return {
//       id: index.toString(),
//       variable_name: row.variable_name,
//       display_name: row.display_name,
//       unit: row.unit || '---',
//       data_type: row.data_type,
//       decimals: '---',
//     };
//   }
// }

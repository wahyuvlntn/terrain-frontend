// // For showing toast notification
// // Reusables
// import { Code } from '@digital-twin/icons';
// import { toast } from '@digital-twin/reusables';
//
// import { Column, Row } from '../../../../../data';
// import { t } from '../../../../../i18n';
// import { BulkImportPopup } from '../../../../../others';
// // Hooks
// import { useImportModelDynamicAlarms } from '../hooks/model';
// // Schemas
// import {
//   modelDynamicAlarmCsvRowSchema,
//   ModelDynamicAlarmCsvRowType,
// } from '../schemas';
// // Style
// import style from './model-details.module.scss';
// // Constants
// const TEMPLATE_HEADERS = ['name', 'script'];
// const TEMPLATE_DATA = ['<alarm_group_name>', '<script>'];
// const TEMPLATE_PREFIX = 'import_model_dynamic_alarms';
//
// const COLUMNS: Column[] = [
//   { key: 'name', name: t('common.alarm_group'), width: 100 },
//   { key: 'script', name: t('common.script'), width: 300 },
// ];

//TODO: remove this since it's not used anywhere
// export const BulkImportModelDynamicAlarmsPopup = ({
//   modelId,
//   open,
//   onClose,
// }: {
//   modelId?: number;
//   open: boolean;
//   onClose: () => void;
// }) => {
//   const importModelDynamicAlarms = useImportModelDynamicAlarms();
//
//   const onSubmit = (alarms: ModelDynamicAlarmCsvRowType[]) => {
//     if (!modelId) {
//       return;
//     }
//
//     importModelDynamicAlarms.mutate(
//       { model_id: modelId, alarms },
//       {
//         onSuccess: (model_id) => {
//           toast.success(
//             t(
//               'common.dynamic_alarms_successfully_imported',
//               alarms.length.toLocaleString()
//             ),
//             {
//               toastId: `success_import_model_dynamic_alarms_${model_id}`,
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
//       icon={<Code />}
//       title={t('common.import_dynamic_alarms')}
//       open={open}
//       onClose={onClose}
//       columns={COLUMNS}
//       parseRows={parseRows}
//       renderRow={renderRow}
//       onSubmit={onSubmit}
//       submitting={importModelDynamicAlarms.isPending}
//       templateHeaders={TEMPLATE_HEADERS}
//       templateData={TEMPLATE_DATA}
//       templatePrefix={TEMPLATE_PREFIX}
//       width={750}
//     />
//   );
// };

// function parseRows(rows: unknown[]) {
//   return modelDynamicAlarmCsvRowSchema.array().parse(rows);
// }
//
// function renderRow(row: ModelDynamicAlarmCsvRowType, index: number): Row {
//   return {
//     id: index.toString(),
//     name: row.name,
//     script: (
//       <span className={style['status-definition__preview']} title={row.script}>
//         {row.script}
//       </span>
//     ),
//   };
// }

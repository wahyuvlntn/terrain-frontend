// import { CloseDownErrorCircle, Code, Warning } from '@digital-twin/icons';
// import { toast } from '@digital-twin/reusables';

import { Column } from '../../../../../data';
import { t } from '../../../../../i18n';
// import { BulkImportPopup } from '../../../../../others';
// import { useImportModelAlarms } from '../hooks/model';
// import { modelAlarmCsvRowSchema, ModelAlarmCsvRowType } from '../schemas';
// import { IconAndText } from './model-details.icon-and-text';
// import style from './model-details.module.scss';

// Constants
const TEMPLATE_HEADERS = [
  'name',
  'criticality',
  'issue_category',
  'issue',
  'message',
  'script',
];
TEMPLATE_HEADERS.filter(
  (header) => header !== 'issue_category' && header !== 'issue'
);

const TEMPLATE_DATA = [
  '<name>',
  '<warning | critical>',
  '<issue_category>',
  '<issue>',
  '<message>',
  '<script>',
];
TEMPLATE_DATA.filter(
  (data) => data !== '<issue_category>' && data !== '<issue>'
);

// const TEMPLATE_PREFIX = 'import_model_alarms';

const COLUMNS: Column[] = [
  { key: 'name', name: t('common.name'), width: 100 },
  { key: 'criticality', name: t('common.criticality'), width: 80 },
  { key: 'issue_category', name: t('common.issue_category'), width: 110 },
  { key: 'issue', name: t('common.issue'), width: 110 },
  { key: 'message', name: t('common.message'), width: 110 },
  { key: 'script', name: t('common.script'), width: 150 },
];
COLUMNS.filter(({ key }) => key !== 'issue_category' && key !== 'issue');

//TODO: remove this since it's not used anywhere
// export const BulkImportModelAlarmsPopup = ({
//   modelId,
//   open,
//   onClose,
// }: {
//   modelId?: number;
//   open: boolean;
//   onClose: () => void;
// }) => {
//   const importModelAlarms = useImportModelAlarms();
//
//   const onSubmit = (alarms: ModelAlarmCsvRowType[]) => {
//     if (!modelId) {
//       return;
//     }
//
//     importModelAlarms.mutate(
//       { model_id: modelId, alarms },
//       {
//         onSuccess: (model_id) => {
//           toast.success(
//             t(
//               'common.alarms_successfully_imported',
//               alarms.length.toLocaleString()
//             ),
//             {
//               toastId: `success_import_model_alarms_${model_id}`,
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
//       title={t('common.import_alarms')}
//       open={open}
//       onClose={onClose}
//       columns={COLUMNS}
//       parseRows={parseRows}
//       renderRow={renderRow}
//       onSubmit={onSubmit}
//       submitting={importModelAlarms.isPending}
//       templateHeaders={TEMPLATE_HEADERS}
//       templateData={TEMPLATE_DATA}
//       templatePrefix={TEMPLATE_PREFIX}
//       width={1000}
//     />
//   );
// };

// function parseRows(rows: unknown[]) {
//   return modelAlarmCsvRowSchema.array().parse(rows);
// }
//
// function renderRow(row: ModelAlarmCsvRowType, index: number): Row {
//   return {
//     id: index.toString(),
//     name: row.name,
//     criticality: (
//       <IconAndText
//         icon={
//           row.criticality === 'warning' ? <Warning /> : <CloseDownErrorCircle />
//         }
//         text={
//           row.criticality === 'warning'
//             ? t('common.warning')
//             : t('common.critical')
//         }
//         type={row.criticality === 'warning' ? 'idle' : 'down'}
//       />
//     ),
//     issue_category: row.issue_category,
//     issue: row.issue,
//     message: row.message,
//     script: (
//       <span className={style['status-definition__preview']} title={row.script}>
//         {row.script}
//       </span>
//     ),
//   };
// }

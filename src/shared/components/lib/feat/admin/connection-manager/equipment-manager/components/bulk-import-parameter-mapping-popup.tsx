// import { UtilityDataQueryExport } from '@digital-twin/icons';
// import { t } from '@digital-twin/utils';
// import { toast } from '@digital-twin/reusables';
// import { useCallback, useContext, useMemo } from 'react';
//
// import { BulkImportPopup, Checkbox, Column, Row } from '../../../../../..';
// import { EquipmentGatewaysCtx } from '../contexts';
// import { useParameterGains, useUpdateParameterMapping } from '../hooks';
// import {
//   NormalizedParameterMappingCsvRowType,
//   parameterMappingCsvRowSchema,
//   ParameterMappingType,
// } from '../schemas';
// import style from './select-tags-popup.module.scss';
//
// // Constants
// const TEMPLATE_HEADERS = ['parameter', 'data_source', 'tag', 'view', 'log'];
//
// const TEMPLATE_DATA = [
//   '<parameter_variable_name>',
//   '<data_source_name>',
//   '<tag_name>',
//   'true',
//   'false',
// ];
//
// const TEMPLATE_PREFIX = 'import_parameter_mapping';
//
// const COLUMNS: Column[] = [
//   { key: 'parameter_alias', name: t('common.parameter'), width: 150 },
//   { key: 'gateway_name', name: t('common.data_source'), width: 150 },
//   { key: 'tag', name: t('common.tag'), width: 150 },
//   {
//     key: 'is_displayed',
//     name: t('common.view'),
//     width: 50,
//     alignment: 'center',
//   },
//   { key: 'is_logged', name: t('common.log'), width: 50, alignment: 'center' },
// ];

//TODO: remove this since it's not used anywhere
// export const BulkImportParameterMappingPopup = ({
//   alias,
//   open,
//   onClose,
// }: {
//   alias?: string;
//   open: boolean;
//   onClose: () => void;
// }) => {
//   const { data: gains } = useParameterGains();
//   useMemo(() => {
//     if (!gains) {
//       return {};
//     }
//
//     return gains.reduce((ids, { id, name }) => {
//       ids[name] = id;
//       return ids;
//     }, {} as Record<string, number>);
//   }, [gains]);
//
//   const { aliases } = useContext(EquipmentGatewaysCtx);
//
//   const parseRows = useCallback(
//     (rows: unknown[]) =>
//       parameterMappingCsvRowSchema
//         .array()
//         .parse(rows)
//         .map(
//           ({
//             parameter,
//             data_source,
//             tag,
//             view,
//             log,
//             prefix,
//           }): NormalizedParameterMappingCsvRowType => {
//             const gateway_alias = aliases ? aliases[data_source] : undefined;
//
//             return {
//               parameter_alias: parameter,
//               gateway_alias: gateway_alias || null,
//               gateway_name: data_source || null,
//               tag: tag || null,
//               is_displayed: view.toLowerCase() === 'true',
//               is_logged: log.toLowerCase() === 'true',
//               prefix,
//             };
//           }
//         ),
//     [aliases]
//   );
//
//   const updateParameterMapping = useUpdateParameterMapping();
//
//   const onSubmit = (rows: NormalizedParameterMappingCsvRowType[]) => {
//     if (!alias) {
//       return;
//     }
//
//     // Convert mappings to records
//     const mappings = rows.reduce(
//       (
//         records,
//         { parameter_alias, gateway_alias, tag, is_displayed, is_logged }
//       ) => {
//         records[parameter_alias] = {
//           gateway_alias,
//           tag,
//           is_displayed,
//           is_logged,
//         };
//
//         return records;
//       },
//       {} as Record<string, ParameterMappingType>
//     );
//
//     updateParameterMapping.mutate(
//       { alias, mappings },
//       {
//         onSuccess: ({ alias, mappings }) => {
//           toast.success(
//             t(
//               'common.parameters_successfully_mapped',
//               String(Object.keys(mappings).length)
//             ),
//             // `${Object.keys(
//             //   mappings
//             // ).length.toLocaleString()} parameters successfully mapped`,
//             {
//               toastId: `success_import_parameter_mapping_${alias}}`,
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
//       icon={<UtilityDataQueryExport />}
//       title={t('common.import_parameter_mapping')}
//       open={open}
//       onClose={onClose}
//       columns={COLUMNS}
//       parseRows={parseRows}
//       renderRow={renderRow}
//       onSubmit={onSubmit}
//       submitting={updateParameterMapping.isPending}
//       templateHeaders={TEMPLATE_HEADERS}
//       templateData={TEMPLATE_DATA}
//       templatePrefix={TEMPLATE_PREFIX}
//     />
//   );
// };

// function renderRow(
//   row: NormalizedParameterMappingCsvRowType,
//   index: number
// ): Row {
//   return {
//     id: index.toString(),
//     parameter_alias: row.parameter_alias,
//     gateway_name: row.gateway_name || '---',
//     tag: row.tag || '---',
//     is_displayed: (
//       <div className={style['checkbox']}>
//         <Checkbox value={row.is_displayed} onChange={() => {}} />
//       </div>
//     ),
//     is_logged: (
//       <div className={style['checkbox']}>
//         <Checkbox value={row.is_logged} onChange={() => {}} />
//       </div>
//     ),
//   };
// }

// import { FolderFill } from '@digital-twin/icons';
// import { useVerticalLimit } from '@digital-twin/utils';
// import { toast } from '@digital-twin/reusables';
// import { ArticleFillIcon } from '@digital-twin/reusables';
// import clsx from 'clsx';
// import * as Papa from 'papaparse';
// import { ReactNode, useEffect, useId, useMemo, useState } from 'react';
// import { CSVLink } from 'react-csv';
// import { ZodError } from 'zod';

// import { Column, Row, Table } from '../data';
// import { Input } from '../input';
// import { Pagination2, Popup } from '../navigation';
// import style from './bulk-import-popup.module.scss';

// // Constants
// const ITEM_HEIGHT = 36;
// const OFFSET = 36;
//
// interface BulkImportPopupProps<T> {
//   icon: ReactNode;
//   title: string;
//   open: boolean;
//   onClose: () => void;
//   columns: Column[];
//   parseRows: (rows: unknown[]) => T[];
//   renderRow: (row: T, index: number) => Row;
//   onSubmit: (rows: T[]) => void;
//   submitting: boolean;
//   templateHeaders: string[];
//   templateData: string[];
//   templatePrefix: string;
//   width?: string | number;
// }

/*TODO: Remove this since it's used only in:
 BulkImportParameterMappingPopup, BulkImportGatewayTagsPopup, BulkImportModelAlarmsPopup, BulkImportModelDynamicAlarmsPopup, BulkImportModelParametersPopup
 (which is not used anywhere)
 */
// export const BulkImportPopup = <T,>({
//   icon,
//   title,
//   open,
//   onClose,
//   columns,
//   parseRows,
//   renderRow,
//   onSubmit,
//   submitting,
//   templateHeaders,
//   templateData,
//   templatePrefix,
//   width,
// }: BulkImportPopupProps<T>) => {
//   // For responsive limit
//   const [container, setContainer] = useState<HTMLDivElement | null>(null);
//
//   const limit = useVerticalLimit({
//     container,
//     itemHeight: ITEM_HEIGHT,
//     offset: OFFSET,
//   });
//
//   const [page, setPage] = useState(1);
//   const [csvFile, setCsvFile] = useState<File | null>(null);
//   const [parsed, setParsed] = useState<T[] | null>(null);
//
//   useEffect(() => {
//     setPage(1);
//
//     if (!csvFile) {
//       setParsed(null);
//       return;
//     }
//
//     Papa.parse(csvFile, {
//       worker: true,
//       header: true,
//       skipEmptyLines: true,
//       complete: (results) => {
//         if (results.errors.length > 0) {
//           toast.error(`Error parsing CSV: ${results.errors[0].message}`);
//           setParsed(null);
//           return;
//         }
//
//         try {
//           setParsed(parseRows(results.data));
//         } catch (e) {
//           if (e instanceof ZodError && e.issues.length > 0) {
//             // Get the first issue
//             const issue = e.issues[0];
//
//             if (issue.path.length > 1) {
//               toast.error(`Column '${issue.path[1]}': ${issue.message}`);
//             }
//           } else if (e instanceof Error) {
//             toast.error(`Error parsing rows: ${e.message}`);
//           }
//
//           setParsed(null);
//         }
//       },
//     });
//   }, [csvFile, parseRows]);
//
//   // Apply paging
//   const paged = useMemo(() => {
//     if (!parsed || !limit) {
//       return undefined;
//     }
//
//     return parsed.slice((page - 1) * limit, page * limit);
//   }, [parsed, page, limit]);
//
//   const rows = useMemo(() => {
//     if (!paged) {
//       return [];
//     }
//
//     return paged.map(renderRow);
//   }, [paged, renderRow]);
//
//   return (
//     <Popup
//       icon={icon}
//       title={title}
//       open={open}
//       onClose={onClose}
//       afterClose={() => {
//         setCsvFile(null);
//       }}
//       onSubmit={() => {
//         if (!parsed || parsed.length === 0) {
//           return;
//         }
//
//         onSubmit(parsed);
//       }}
//       submitting={submitting}
//       disableSubmit={!parsed || parsed.length === 0}
//       variant="save"
//       background="none"
//     >
//       <div className={style['container']} style={{ width }}>
//         <CsvFile
//           value={csvFile}
//           onChange={setCsvFile}
//           templateHeaders={templateHeaders}
//           templateData={templateData}
//           templatePrefix={templatePrefix}
//         />
//         <div className={style['preview']}>
//           <div className={style['preview__header']}>
//             <span className={style['preview__label']}>Preview:</span>
//             <span className={style['preview__label']}>{`Total: ${(
//               parsed?.length || 0
//             ).toLocaleString()}`}</span>
//           </div>
//           <div className={style['preview__value']}>
//             <div className={style['preview__table']} ref={setContainer}>
//               <Table width="100%" columns={columns} rows={rows} />
//             </div>
//             <div className={style['preview__pagination']}>
//               <Pagination2
//                 count={parsed?.length || 0}
//                 limit={limit || 1}
//                 page={page}
//                 onChange={setPage}
//                 variant="arrow"
//               />
//             </div>
//           </div>
//         </div>
//       </div>
//     </Popup>
//   );
// };

// export const CsvFile = ({
//   value,
//   onChange,
//   templateHeaders,
//   templateData,
//   templatePrefix,
// }: {
//   value?: File | null;
//   onChange: (value: File) => void;
//   templateHeaders: string[];
//   templateData: string[];
//   templatePrefix: string;
// }) => {
//   // Generate id for the file input
//   const id = useId();
//
//   return (
//     <div className={style['csv-file']}>
//       <span className={style['csv-file__label']}>CSV File:</span>
//       <div className={style['csv-file__input-container']}>
//         <Input
//           value={value ? value.name : ''}
//           wrapperProps={{ className: style['csv-file__name'] }}
//           inputProps={{ required: true }}
//           background="dark"
//         />
//         <label htmlFor={id} className={style['csv-file__label-file']}>
//           <div
//             className={clsx(
//               style['csv-file__button'],
//               style['csv-file__button--choose-file']
//             )}
//           >
//             <FolderFill />
//             <span>File</span>
//           </div>
//           <input
//             className={style['csv-file__input-file']}
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
//             accept=".csv"
//           />
//         </label>
//         <CSVLink
//           headers={templateHeaders}
//           data={[templateData]}
//           filename={`${templatePrefix}_template.csv`}
//         >
//           <div
//             className={clsx(
//               style['csv-file__button'],
//               style['csv-file__button--template']
//             )}
//           >
//             <ArticleFillIcon />
//             Template
//           </div>
//         </CSVLink>
//       </div>
//     </div>
//   );
// };

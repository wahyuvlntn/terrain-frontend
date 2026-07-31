import { CloseDownErrorCircle, Code, Warning } from '@digital-twin/icons';
import { ExcelReport, t, useLanguageSwitcher } from '@digital-twin/utils';
import { toast } from '@digital-twin/reusables';
import { useMemo } from 'react';

import { Column, Row } from '../../../../../data';
import { BulkImportSingleSheet } from '../../../../../others';
import { useImportModelAlarms } from '../hooks/model';
import { modelAlarmCsvRowSchema, ModelAlarmCsvRowType } from '../schemas';
import { IconAndText } from './model-details.icon-and-text';
import style from './model-details.module.scss';

// Constants
const SHEET_NAME = 'alarms';

const TEMPLATE_HEADERS = [
  'name',
  'criticality',
  // 'issue_category',
  // 'issue',
  'message',
  'script',
];
// TEMPLATE_HEADERS.filter(
//   (header) => header !== 'issue_category' && header !== 'issue'
// );

class ModelAlarmsTemplate extends ExcelReport {
  public fileName = () => t('common.model_alarms');
  public init = () => {
    const sheet = this.workbook.addWorksheet(SHEET_NAME);

    const TEMPLATE_DATA = [
      `<${t('common.name')}>`,
      '<warning | critical>',
      // `<${t('common.issue_category')}>`,
      // `<${t('common.issue')}>`,
      `<${t('common.message')}>`,
      `<${t('common.script')}>`,
    ];

    sheet.getCell('A1').value = TEMPLATE_HEADERS[0];
    sheet.getCell('B1').value = TEMPLATE_HEADERS[1];
    sheet.getCell('C1').value = TEMPLATE_HEADERS[2];
    sheet.getCell('D1').value = TEMPLATE_HEADERS[3];
    // sheet.getCell('E1').value = TEMPLATE_HEADERS[4];
    // sheet.getCell('F1').value = TEMPLATE_HEADERS[5];

    sheet.getCell('A2').value = TEMPLATE_DATA[0];
    sheet.getCell('B2').value = TEMPLATE_DATA[1];
    sheet.getCell('C2').value = TEMPLATE_DATA[2];
    sheet.getCell('D2').value = TEMPLATE_DATA[3];
    // sheet.getCell('E2').value = TEMPLATE_DATA[4];
    // sheet.getCell('F2').value = TEMPLATE_DATA[5];

    this.autoWidth(SHEET_NAME);
  };
}

export const BulkImportModelAlarmsDrawer = ({
  modelId,
  open,
  onClose,
}: {
  modelId?: number;
  open: boolean;
  onClose: () => void;
}) => {
  const { currentLanguage } = useLanguageSwitcher();

  const COLUMNS: Column[] = useMemo(
    () => [
      { key: 'name', name: t('common.name'), width: 100 },
      { key: 'criticality', name: t('common.criticality'), width: 80 },
      // { key: 'issue_category', name: t('common.issue_category'), width: 110 },
      // { key: 'issue', name: t('common.issue'), width: 110 },
      { key: 'message', name: t('common.message'), width: 110 },
      { key: 'script', name: t('common.script'), width: 150 },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentLanguage]
  );
  // useMemo(
  //   () =>
  //     COLUMNS.filter(({ key }) => key !== 'issue_category' && key !== 'issue'),
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  //   [COLUMNS]
  // );

  const importModelAlarms = useImportModelAlarms();

  const onSubmit = (alarms: ModelAlarmCsvRowType[]) => {
    if (!modelId) {
      return;
    }

    importModelAlarms.mutate(
      { model_id: modelId, alarms },
      {
        onSuccess: (model_id) => {
          toast.success(
            t(
              'common.alarms_successfully_imported',
              alarms.length.toLocaleString()
            ),
            {
              toastId: `success_import_model_alarms_${model_id}`,
            }
          );
          onClose();
        },
      }
    );
  };

  return (
    <BulkImportSingleSheet
      icon={<Code />}
      title={t('common.import_alarms')}
      open={open}
      onClose={onClose}
      columns={COLUMNS}
      parseRows={parseRows}
      renderRow={renderRow}
      onSubmit={onSubmit}
      submitting={importModelAlarms.isPending}
      instantiateTemplate={() => new ModelAlarmsTemplate()}
      templateHeaders={TEMPLATE_HEADERS}
      sheetName={SHEET_NAME}
      width={1000}
    />
  );
};

function parseRows(rows: unknown[]) {
  return modelAlarmCsvRowSchema.array().parse(rows);
}

function renderRow(row: ModelAlarmCsvRowType, index: number): Row {
  return {
    id: index.toString(),
    name: row.name,
    criticality: (
      <IconAndText
        icon={
          row.criticality === 'warning' ? <Warning /> : <CloseDownErrorCircle />
        }
        text={
          row.criticality === 'warning'
            ? t('common.warning')
            : t('common.critical')
        }
        type={row.criticality === 'warning' ? 'idle' : 'unplanned-down'}
      />
    ),
    // issue_category: row.issue_category,
    // issue: row.issue,
    message: row.message,
    script: (
      <span className={style['status-definition__preview']} title={row.script}>
        {row.script}
      </span>
    ),
  };
}

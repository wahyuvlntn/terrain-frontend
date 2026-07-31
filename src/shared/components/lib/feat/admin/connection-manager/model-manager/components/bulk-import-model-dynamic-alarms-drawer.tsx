import { Code } from '@digital-twin/icons';
import { ExcelReport, t, useLanguageSwitcher } from '@digital-twin/utils';
import { toast } from '@digital-twin/reusables';
import { useMemo } from 'react';

import { Column, Row } from '../../../../../data';
import { BulkImportSingleSheet } from '../../../../../others';
import { useImportModelDynamicAlarms } from '../hooks/model';
import {
  modelDynamicAlarmCsvRowSchema,
  ModelDynamicAlarmCsvRowType,
} from '../schemas';
import style from './model-details.module.scss';

// Constants
const SHEET_NAME = 'dynamic_alarms';

const TEMPLATE_HEADERS = ['name', 'script'];

class ModelDynamicAlarmsTemplate extends ExcelReport {
  public fileName = () => t('common.model_dynamic_alarms');
  public init = () => {
    const sheet = this.workbook.addWorksheet(SHEET_NAME);

    const TEMPLATE_DATA = [
      `<${t('common.alarm_group')}>`,
      `<${t('common.script')}>`,
    ];

    sheet.getCell('A1').value = TEMPLATE_HEADERS[0];
    sheet.getCell('B1').value = TEMPLATE_HEADERS[1];

    sheet.getCell('A2').value = TEMPLATE_DATA[0];
    sheet.getCell('B2').value = TEMPLATE_DATA[1];

    this.autoWidth(SHEET_NAME);
  };
}

export const BulkImportModelDynamicAlarmsDrawer = ({
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
      { key: 'name', name: t('common.alarm_group'), width: 100 },
      { key: 'script', name: t('common.script'), width: 300 },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentLanguage]
  );

  const importModelDynamicAlarms = useImportModelDynamicAlarms();

  const onSubmit = (alarms: ModelDynamicAlarmCsvRowType[]) => {
    if (!modelId) {
      return;
    }

    importModelDynamicAlarms.mutate(
      { model_id: modelId, alarms },
      {
        onSuccess: (model_id) => {
          toast.success(
            t(
              'common.dynamic_alarms_successfully_imported',
              alarms.length.toLocaleString()
            ),
            {
              toastId: `success_import_model_dynamic_alarms_${model_id}`,
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
      title={t('common.import_dynamic_alarms')}
      open={open}
      onClose={onClose}
      columns={COLUMNS}
      parseRows={parseRows}
      renderRow={renderRow}
      onSubmit={onSubmit}
      submitting={importModelDynamicAlarms.isPending}
      instantiateTemplate={() => new ModelDynamicAlarmsTemplate()}
      templateHeaders={TEMPLATE_HEADERS}
      sheetName={SHEET_NAME}
      width={750}
    />
  );
};

function parseRows(rows: unknown[]) {
  return modelDynamicAlarmCsvRowSchema.array().parse(rows);
}

function renderRow(row: ModelDynamicAlarmCsvRowType, index: number): Row {
  return {
    id: index.toString(),
    name: row.name,
    script: (
      <span className={style['status-definition__preview']} title={row.script}>
        {row.script}
      </span>
    ),
  };
}

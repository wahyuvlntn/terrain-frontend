import { InformationCircle, SettingsPreferences } from '@digital-twin/icons';
import { ExcelReport, t, useLanguageSwitcher } from '@digital-twin/utils';
import { toast } from '@digital-twin/reusables';
import { ReactNode, useMemo } from 'react';

import { Column, Row } from '../../../../../data';
import {
  BulkImportSingleSheet,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../../../../others';
import { useImportModelParameters } from '../hooks/model';
import {
  modelParameterCsvRowSchema,
  ModelParameterCsvRowType,
} from '../schemas';
import styles from './bulk-import-model-parameters-popup.module.scss';

// Constants
const SHEET_NAME = 'variables';

const TEMPLATE_HEADERS = [
  'variable_name',
  'display_name',
  'unit',
  'data_type',
  'decimals',
];

class ModelParametersTemplate extends ExcelReport {
  public fileName = () => t('common.model_variables');
  public init = () => {
    const sheet = this.workbook.addWorksheet(SHEET_NAME);

    sheet.getCell('A1').value = TEMPLATE_HEADERS[0];
    sheet.getCell('B1').value = TEMPLATE_HEADERS[1];
    sheet.getCell('C1').value = TEMPLATE_HEADERS[2];
    sheet.getCell('D1').value = TEMPLATE_HEADERS[3];
    sheet.getCell('E1').value = TEMPLATE_HEADERS[4];

    const TEMPLATE_DATA = [
      `<${t('common.variable_name')}>`,
      `<${t('common.display_name')}>`,
      `<${t('common.unit')}>`,
      '<number | string | boolean>',
      `<${t('common.decimals')}>`,
    ];

    sheet.getCell('A2').value = TEMPLATE_DATA[0];
    sheet.getCell('B2').value = TEMPLATE_DATA[1];
    sheet.getCell('C2').value = TEMPLATE_DATA[2];
    sheet.getCell('D2').value = TEMPLATE_DATA[3];
    sheet.getCell('E2').value = TEMPLATE_DATA[4];

    this.autoWidth(SHEET_NAME);
  };
}

export const BulkImportModelParametersDrawer = ({
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
      { key: 'variable_name', name: t('common.variable_name'), width: 200 },
      { key: 'display_name', name: t('common.display_name'), width: 200 },
      { key: 'unit', name: t('common.unit'), width: 100 },
      { key: 'data_type', name: t('common.data_type'), width: 100 },
      {
        key: 'decimals',
        name: t('common.decimals'),
        width: 100,
        alignment: 'center',
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentLanguage]
  );
  useMemo(
    () => [
      { key: 'variable_name', name: t('common.variable_name'), width: 200 },
      { key: 'display_name', name: t('common.display_name'), width: 200 },
      {
        key: 'parameter_type',
        name: (
          <div className={styles['header-with-icon']}>
            {t('common.parameter_type')}
            <PopoverInfo>
              <span className={styles['info__message']}>
                "Voltage", "Current", "Active Power", "Active Energy", "Other",
                ...
              </span>
            </PopoverInfo>
          </div>
        ),
        width: 200,
      },
      {
        key: 'prefix',
        name: (
          <div className={styles['header-with-icon']}>
            {t('common.prefix')}
            <PopoverInfo>
              <span className={styles['info__message']}>
                {t('common.valid_values', '"", "k", "M", "G", "m", "μ", "n"')}
              </span>
              <span className={styles['info__message']}>
                {t(
                  'common.only_applied_for_parameter_type',
                  '"Voltage", "Current", "Active/Reactive/Apparent Power/Energy", and "Frequency"'
                )}
              </span>
            </PopoverInfo>
          </div>
        ),
        width: 100,
      },
      {
        key: 'unit',
        name: (
          <div className={styles['header-with-icon']}>
            {t('common.unit')}
            <PopoverInfo>
              <span className={styles['info__message']}>
                {t('common.only_applied_for_parameter_type', '"Other"')}
              </span>
            </PopoverInfo>
          </div>
        ),
        width: 100,
      },
      {
        key: 'data_type',
        name: (
          <div className={styles['header-with-icon']}>
            {t('common.data_type')}
            <PopoverInfo>
              <span className={styles['info__message']}>
                {t('common.valid_values', '"string", "number", "boolean"')}
              </span>
              <span className={styles['info__message']}>
                {t('common.only_applied_for_parameter_type', '"Other"')}
              </span>
            </PopoverInfo>
          </div>
        ),
        width: 120,
      },
      {
        key: 'decimals',
        name: t('common.decimals'),
        width: 100,
        alignment: 'center',
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentLanguage]
  );

  const importModelParameters = useImportModelParameters();

  const onSubmit = (parameters: ModelParameterCsvRowType[]) => {
    if (!modelId) {
      return;
    }

    importModelParameters.mutate(
      { model_id: modelId, parameters },
      {
        onSuccess: (model_id) => {
          toast.success(
            t(
              'common.variables_successfully_imported',
              parameters.length.toLocaleString()
            ),
            {
              toastId: `success_import_model_parameters_${model_id}`,
            }
          );
          onClose();
        },
      }
    );
  };

  return (
    <BulkImportSingleSheet
      icon={<SettingsPreferences />}
      title={t('common.import_variables')}
      open={open}
      onClose={onClose}
      columns={COLUMNS}
      parseRows={parseRows}
      renderRow={renderRow}
      onSubmit={onSubmit}
      submitting={importModelParameters.isPending}
      instantiateTemplate={() => new ModelParametersTemplate()}
      templateHeaders={TEMPLATE_HEADERS}
      sheetName={SHEET_NAME}
      width={750}
    />
  );
};

function parseRows(rows: unknown[]) {
  return modelParameterCsvRowSchema.array().parse(rows);
}

function renderRow(row: ModelParameterCsvRowType, index: number): Row {
  if (row.data_type === 'number' && row.decimals) {
    const parsed = parseInt(row.decimals);

    return {
      id: index.toString(),
      variable_name: row.variable_name,
      display_name: row.display_name,
      unit: row.unit || '---',
      data_type: row.data_type,
      decimals: isNaN(parsed) ? '---' : parsed.toString(),
    };
  } else {
    return {
      id: index.toString(),
      variable_name: row.variable_name,
      display_name: row.display_name,
      unit: row.unit || '---',
      data_type: row.data_type,
      decimals: '---',
    };
  }
}

function PopoverInfo({ children }: { children: ReactNode }) {
  return (
    <Popover offset={5} placement="top">
      <PopoverTrigger>
        <div className={styles['info-icon-container']}>
          <InformationCircle />
        </div>
      </PopoverTrigger>
      <PopoverContent className={styles['info']}>{children}</PopoverContent>
    </Popover>
  );
}

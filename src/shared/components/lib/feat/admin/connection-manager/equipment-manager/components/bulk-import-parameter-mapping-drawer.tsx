import { InformationCircle, UtilityDataQueryExport } from '@digital-twin/icons';
import { ExcelReport, t, useLanguageSwitcher } from '@digital-twin/utils';
import { toast } from '@digital-twin/reusables';
import { ReactNode, useCallback, useContext, useMemo } from 'react';

import {
  BulkImportSingleSheet,
  Checkbox,
  Column,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Row,
} from '../../../../../..';
import { EquipmentGatewaysCtx } from '../contexts';
import { useParameterGains, useUpdateParameterMapping } from '../hooks';
import {
  NormalizedParameterMappingCsvRowType,
  parameterMappingCsvRowSchema,
  ParameterMappingType,
} from '../schemas';
import popupStyles from './bulk-import-parameter-mapping.popup.module.scss';
import style from './select-tags-popup.module.scss';

// Constants
const SHEET_NAME = 'parameter_mappings';

const TEMPLATE_HEADERS = ['parameter', 'data_source', 'tag', 'view', 'log'];

class EquipmentParameterMappingsTemplate extends ExcelReport {
  public fileName = () => t('common.equipment_parameter_mappings');
  public init = () => {
    const sheet = this.workbook.addWorksheet(SHEET_NAME);

    const TEMPLATE_DATA = [
      `<${t('common.variable_name')}>`,
      `<${t('common.data_source_name')}>`,
      `<${t('common.tag')}>`,
      'true',
      'false',
    ];

    sheet.getCell('A1').value = TEMPLATE_HEADERS[0];
    sheet.getCell('B1').value = TEMPLATE_HEADERS[1];
    sheet.getCell('C1').value = TEMPLATE_HEADERS[2];
    sheet.getCell('D1').value = TEMPLATE_HEADERS[3];
    sheet.getCell('E1').value = TEMPLATE_HEADERS[4];

    sheet.getCell('A2').value = TEMPLATE_DATA[0];
    sheet.getCell('B2').value = TEMPLATE_DATA[1];
    sheet.getCell('C2').value = TEMPLATE_DATA[2];
    sheet.getCell('D2').value = TEMPLATE_DATA[3];
    sheet.getCell('E2').value = TEMPLATE_DATA[4];

    this.autoWidth(SHEET_NAME);
  };
}

export const BulkImportParameterMappingDrawer = ({
  alias,
  open,
  onClose,
}: {
  alias?: string;
  open: boolean;
  onClose: () => void;
}) => {
  const { currentLanguage } = useLanguageSwitcher();

  const COLUMNS: Column[] = useMemo(
    () => [
      { key: 'parameter_alias', name: t('common.parameter'), width: 150 },
      { key: 'gateway_name', name: t('common.data_source'), width: 150 },
      { key: 'tag', name: t('common.tag'), width: 150 },
      {
        key: 'is_displayed',
        name: t('common.view'),
        width: 50,
        alignment: 'center',
      },
      {
        key: 'is_logged',
        name: t('common.log'),
        width: 50,
        alignment: 'center',
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentLanguage]
  );
  useMemo(
    () => [
      ...COLUMNS,
      {
        key: 'prefix',
        name: (
          <div className={popupStyles['header-with-icon']}>
            {t('common.prefix')}
            <PopoverInfo>
              <span className={popupStyles['info__message']}>
                {t('common.valid_values', '"", "k", "M", "G", "m", "μ", "n"')}
              </span>
              <span className={popupStyles['info__message']}>
                {t(
                  'common.only_applied_for_parameter_type',
                  '"Voltage", "Current", "Active/Reactive/Apparent Power/Energy", and "Frequency"'
                )}
              </span>
            </PopoverInfo>
          </div>
        ),
        width: 80,
        alignment: 'center',
      },
    ],
    [COLUMNS]
  );

  const { data: gains } = useParameterGains();
  useMemo(() => {
    if (!gains) {
      return {};
    }

    return gains.reduce((ids, { id, name }) => {
      ids[name] = id;
      return ids;
    }, {} as Record<string, number>);
  }, [gains]);

  const { aliases } = useContext(EquipmentGatewaysCtx);

  const parseRows = useCallback(
    (rows: unknown[]) =>
      parameterMappingCsvRowSchema
        .array()
        .parse(rows)
        .map(
          ({
            parameter,
            data_source,
            tag,
            view,
            log,
            prefix,
          }): NormalizedParameterMappingCsvRowType => {
            const gateway_alias = aliases ? aliases[data_source] : undefined;

            return {
              parameter_alias: parameter,
              gateway_alias: gateway_alias || null,
              gateway_name: data_source || null,
              tag: tag || null,
              is_displayed: view.toLowerCase() === 'true',
              is_logged: log.toLowerCase() === 'true',
              prefix,
            };
          }
        ),
    [aliases]
  );

  const updateParameterMapping = useUpdateParameterMapping();

  const onSubmit = (rows: NormalizedParameterMappingCsvRowType[]) => {
    if (!alias) {
      return;
    }

    // Convert mappings to records
    const mappings = rows.reduce(
      (
        records,
        { parameter_alias, gateway_alias, tag, is_displayed, is_logged }
      ) => {
        records[parameter_alias] = {
          gateway_alias,
          tag,
          is_displayed,
          is_logged,
        };

        return records;
      },
      {} as Record<string, ParameterMappingType>
    );

    updateParameterMapping.mutate(
      { alias, mappings },
      {
        onSuccess: ({ alias, mappings }) => {
          toast.success(
            t(
              'common.parameters_successfully_mapped',
              Object.keys(mappings).length.toLocaleString()
            ),
            {
              toastId: `success_import_parameter_mapping_${alias}}`,
            }
          );
          onClose();
        },
      }
    );
  };

  return (
    <BulkImportSingleSheet
      icon={<UtilityDataQueryExport />}
      title={t('common.import_parameter_mapping')}
      open={open}
      onClose={onClose}
      columns={COLUMNS}
      parseRows={parseRows}
      renderRow={renderRow}
      onSubmit={onSubmit}
      submitting={updateParameterMapping.isPending}
      instantiateTemplate={() => new EquipmentParameterMappingsTemplate()}
      templateHeaders={TEMPLATE_HEADERS}
      sheetName={SHEET_NAME}
    />
  );
};

function renderRow(
  row: NormalizedParameterMappingCsvRowType,
  index: number
): Row {
  return {
    id: index.toString(),
    parameter_alias: row.parameter_alias,
    gateway_name: row.gateway_name || '---',
    tag: row.tag || '---',
    is_displayed: (
      <div className={style['checkbox']}>
        <Checkbox value={row.is_displayed} onChange={() => {}} />
      </div>
    ),
    is_logged: (
      <div className={style['checkbox']}>
        <Checkbox value={row.is_logged} onChange={() => {}} />
      </div>
    ),
  };
}

function PopoverInfo({ children }: { children: ReactNode }) {
  return (
    <Popover offset={5} placement="top">
      <PopoverTrigger>
        <div className={popupStyles['info-icon-container']}>
          <InformationCircle />
        </div>
      </PopoverTrigger>
      <PopoverContent className={popupStyles['info']}>
        {children}
      </PopoverContent>
    </Popover>
  );
}

import { SettingsPreferences } from '@digital-twin/icons';
import { ExcelReport } from '@digital-twin/utils';
import { t, useLanguageSwitcher } from '@digital-twin/utils';
import { toast } from '@digital-twin/reusables';
import { useMemo } from 'react';

import { Column, Row } from '../../../../../data';
import { BulkImportSingleSheet } from '../../../../../others';
import { useImportGatewayTags } from '../hooks';
import { gatewayTagSchema, GatewayTagType } from '../schemas';

const SHEET_NAME = 'tags';

const TEMPLATE_HEADERS = ['name', 'address', 'description'];

class GatewayTagsTemplate extends ExcelReport {
  public fileName = () => t('common.data_source_tags');
  public init = () => {
    const sheet = this.workbook.addWorksheet(SHEET_NAME);

    sheet.getCell('A1').value = TEMPLATE_HEADERS[0];
    sheet.getCell('B1').value = TEMPLATE_HEADERS[1];
    sheet.getCell('C1').value = TEMPLATE_HEADERS[2];

    const TEMPLATE_DATA = [
      `<${t('common.name')}>`,
      `<${t('common.address')}>`,
      `<${t('common.description')}>`,
    ];

    sheet.getCell('A2').value = TEMPLATE_DATA[0];
    sheet.getCell('B2').value = TEMPLATE_DATA[1];
    sheet.getCell('C2').value = TEMPLATE_DATA[2];

    this.autoWidth(SHEET_NAME);
  };
}

export const BulkImportGatewayTagsExcel = ({
  gatewayAlias,
  open,
  onClose,
}: {
  gatewayAlias?: string;
  open: boolean;
  onClose: () => void;
}) => {
  const { currentLanguage } = useLanguageSwitcher();

  const COLUMNS: Column[] = useMemo(
    () => [
      { key: 'name', name: t('common.name'), width: 100 },
      { key: 'address', name: t('common.address'), width: 100 },
      { key: 'description', name: t('common.description'), width: 150 },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentLanguage]
  );

  const importGatewayTags = useImportGatewayTags();

  const onSubmit = (tags: GatewayTagType[]) => {
    if (!gatewayAlias) {
      return;
    }

    importGatewayTags.mutate(
      { gateway_alias: gatewayAlias, gateway_tags: tags },
      {
        onSuccess: ({ gateway_alias, gateway_tags }) => {
          toast.success(
            t('common.tags_successfully_imported', String(gateway_tags.length)),
            {
              toastId: `success_import_gateway_tags_${gateway_alias}}`,
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
      title={t('common.import_data_source_tags')}
      open={open}
      onClose={onClose}
      columns={COLUMNS}
      parseRows={parseRows}
      renderRow={renderRow}
      onSubmit={onSubmit}
      submitting={importGatewayTags.isPending}
      instantiateTemplate={() => new GatewayTagsTemplate()}
      templateHeaders={TEMPLATE_HEADERS}
      sheetName={SHEET_NAME}
    />
  );
};

function parseRows(rows: unknown[]) {
  return gatewayTagSchema.array().parse(rows);
}

function renderRow(row: GatewayTagType, index: number): Row {
  return {
    id: index.toString(),
    name: row.name,
    address: row.address,
    description: row.description || '---',
  };
}

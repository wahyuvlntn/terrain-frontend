import excel from 'exceljs';

import { formatDateExport, formatDateLongLong } from './date';
import { t } from './i18n';
import { PROJECT_ALIAS } from './org-prj';

type TExport = {
  fileName: string;
  start?: Date | null | undefined;
  end?: Date | null | undefined;
};

export type WorkSheet = {
  sheetName: string;
  rows: unknown[];
  skipHeader?: boolean;
  columns: ({ header?: string } & Omit<Partial<excel.Column>, 'header'>)[];
};

export type TCreateExcelWorkbookParams = {
  workSheets: WorkSheet[];
  fileName: string;
  start?: Date | null | undefined;
  end?: Date | null | undefined;
};

const autoWidth = (worksheet: excel.Worksheet, minimalWidth = 10) => {
  worksheet.columns.forEach((column) => {
    let maxColumnLength = 0;
    column?.eachCell?.({ includeEmpty: true }, (cell) => {
      maxColumnLength = Math.max(
        maxColumnLength,
        minimalWidth,
        cell.value ? cell.value.toString().length : 0
      );
    });
    column.width = maxColumnLength + 2;
  });
};

const createAndDownloadExcel = async (
  workbook: excel.Workbook,
  fileName: string
) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

const setupWorksheet = (
  worksheet: excel.Worksheet,
  columns: WorkSheet['columns'],
  period: string,
  skipHeader: boolean | undefined
) => {
  worksheet.getCell('A1').value = `${t('common.period')}: ${period}`;

  if (!skipHeader) {
    worksheet.getRow(2).values = columns.map((item) => item.header);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    worksheet.columns = columns.map(({ header, ...item }) => item);
  } else {
    worksheet.columns = columns;
  }
};

export const exportToExcel = async ({
  workSheets,
  start,
  end,
  fileName,
}: TCreateExcelWorkbookParams) => {
  let period = '';
  let periodFileName = '';

  if (fileName.includes('.')) {
    fileName = fileName.replaceAll('.', '_');
  }

  if (end != null && start != null) {
    period = `${formatDateLongLong(start)}-${formatDateLongLong(end)}`;

    periodFileName = `${formatDateExport(start)}__${formatDateExport(end)}`;
  }
  const workbook = new excel.Workbook();

  workSheets.forEach(({ sheetName, rows, skipHeader, columns }) => {
    const worksheet = workbook.addWorksheet(sheetName);

    setupWorksheet(worksheet, columns, period, skipHeader);

    rows.forEach((row) => {
      worksheet.addRow(row);
    });

    autoWidth(worksheet);
  });

  const formattedFileName = `${PROJECT_ALIAS().toUpperCase()} ${fileName}_${periodFileName}`;

  await createAndDownloadExcel(workbook, formattedFileName);
};

export class ExcelReport {
  protected workbook: excel.Workbook;

  constructor() {
    this.workbook = new excel.Workbook();
  }

  public export = async ({ fileName, start, end }: TExport) => {
    let periodFileName = '';
    if (end != null && start != null) {
      periodFileName = `${formatDateExport(start)}__${formatDateExport(end)}`;
    }

    if (fileName.includes('.')) {
      fileName = fileName.replaceAll('.', '_');
    }

    const formattedFileName = `${PROJECT_ALIAS().toUpperCase()} ${fileName}${
      periodFileName ? '_' : ''
    }${periodFileName}`;

    await createAndDownloadExcel(this.workbook, formattedFileName);
  };

  public autoWidth = (worksheetName: string) => {
    const ws = this.workbook.getWorksheet(worksheetName);
    if (ws) {
      autoWidth(ws);
    }
  };
}

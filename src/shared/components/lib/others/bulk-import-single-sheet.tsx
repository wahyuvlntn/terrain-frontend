import { ExcelReport, t } from '@digital-twin/utils';
import { Workbook } from 'exceljs';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { z } from 'zod';
import { ZodError } from 'zod';

import { Column, Row } from '../data';
import { BulkImport } from './bulk-import';

interface ITemplate extends ExcelReport {
  init: () => void;
  fileName: () => string;
}

interface BulkImportSingleSheetProps<T> {
  icon: ReactNode;
  title: string;
  open: boolean;
  onClose: () => void;
  columns: Column[];
  parseRows: (rows: unknown[]) => T[];
  renderRow: (row: T, index: number) => Row;
  onSubmit: (rows: T[]) => void;
  submitting: boolean;
  sheetName: string;
  instantiateTemplate: () => ITemplate;
  templateHeaders: string[];
  width?: number;
  itemHeight?: number;
  offset?: number;
}

const formSchema = z.object({
  file: z.instanceof(File).refine((file) => file.size > 0, {
    message: 'File is required',
  }),
});

type FormType = z.infer<typeof formSchema>;

type Sheet = {
  name: string;
  rows: Row[];
  columns: Column[];
};

export const BulkImportSingleSheet = <T,>({
  icon,
  title,
  open,
  onClose,
  columns,
  parseRows,
  renderRow,
  onSubmit,
  submitting,
  sheetName,
  instantiateTemplate,
  templateHeaders,
  width = 750,
  itemHeight = 40,
  offset = 44,
}: BulkImportSingleSheetProps<T>) => {
  const [parsed, setParsed] = useState<T[] | null>(null);

  const { control, reset, watch } = useForm<FormType>({});

  const handleDownloadTemplate = async () => {
    const template = instantiateTemplate();
    template.init();
    template.export({ fileName: template.fileName() });
  };

  const onReset = () => {
    reset({ file: undefined });
    setParsed(null);
  };

  const file = watch('file');

  useEffect(() => {
    if (!file) {
      setParsed(null);
      return;
    }

    (async () => {
      let rows: unknown[];

      try {
        rows = await parseExcelFile(file, sheetName, templateHeaders);
      } catch (e) {
        toast.error(
          `Error parsing file: ${e instanceof Error ? e.message : e}`
        );
        setParsed(null);
        return;
      }

      try {
        setParsed(parseRows(rows));
      } catch (e) {
        if (e instanceof ZodError && e.issues.length > 0) {
          // Get the first issue
          const issue = e.issues[0];

          if (issue.path.length > 1) {
            toast.error(`'${issue.path[1]}': ${issue.message}`);
          }
        } else if (e instanceof Error) {
          toast.error(`Error parsing rows: ${e.message}`);
        }
        setParsed(null);
      }
    })();
  }, [file, sheetName, templateHeaders, parseRows]);

  const sheets: Sheet[] = useMemo(() => {
    if (!parsed) {
      return [];
    }

    const sheet: Sheet = {
      name: sheetName,
      rows: parsed.map(renderRow),
      columns: columns,
    };

    return [sheet];
  }, [parsed, sheetName, columns, renderRow]);

  return (
    <BulkImport
      control={control}
      registered="file"
      isValid={parsed !== null && parsed.length > 0}
      open={open}
      onClose={onClose}
      onReset={onReset}
      onTemplateClick={handleDownloadTemplate}
      sheets={sheets}
      onSubmit={(e) => {
        e.preventDefault();

        if (!parsed || parsed.length === 0) {
          return;
        }

        onSubmit(parsed);
      }}
      width={width}
      ITEM_HEIGHT={itemHeight}
      OFFSET={offset}
      submitting={submitting}
      icon={icon}
      title={title}
    />
  );
};

async function parseExcelFile(
  file: File,
  sheetName: string,
  headers: string[]
) {
  let arrayBuffer: ArrayBuffer;

  try {
    arrayBuffer = await file.arrayBuffer();
  } catch (e) {
    if (!(e instanceof Error)) {
      throw e;
    }

    throw new Error(`Error converting file to ArrayBuffer: ${e.message}`);
  }

  const wb = new Workbook();

  try {
    await wb.xlsx.load(arrayBuffer);
  } catch (e) {
    if (!(e instanceof Error)) {
      throw e;
    }

    throw new Error(`Error parsing file as Workbook: ${e.message}`);
  }

  const worksheet = wb.getWorksheet(sheetName);

  if (!worksheet) {
    throw new Error(t('common.err_worksheet_not_found', sheetName));
  }

  const columnNumbers: Record<string, number> = {};

  for (const header of headers) {
    const column = worksheet.columns.find(
      (column) => column.values && column.values[1] === header
    );

    if (!column || column.number === undefined) {
      continue;
    }

    columnNumbers[header] = column.number;
  }

  const rows: unknown[] = [];

  worksheet.eachRow((row, rowNumber) => {
    // Skip header row
    if (rowNumber === 1) {
      return;
    }

    const value: Record<string, string> = {};

    for (const header in columnNumbers) {
      value[header] =
        row.getCell(columnNumbers[header])?.value?.toString() ?? '';
    }

    rows.push(value);
  });

  return rows;
}

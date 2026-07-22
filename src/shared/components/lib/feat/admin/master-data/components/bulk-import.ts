import { t } from '@digital-twin/utils';
import { Column, Row, Workbook, Worksheet } from 'exceljs';
import { z } from 'zod';

const COLUMN_NAMES = {
  CATEGORY: 'category',
  FIELD: 'field',
  FIELD_ID: 'field_id',
} as const;

const FieldSchema = z.object({
  category: z.string(),
  name: z.string(),
  field_id: z.string().optional(),
});

const SheetDataSchema = z.object({
  categories: z.array(z.string()),
  fields: z.array(FieldSchema),
});

const SendObjectSchema = z.object({
  feedback: SheetDataSchema.optional(),
  electricity: SheetDataSchema.optional(),
  production: SheetDataSchema.optional(),
  equipment: SheetDataSchema.optional(),
});

export type SendObjectType = z.infer<typeof SendObjectSchema>;

const findColumn = (
  worksheet: Worksheet,
  name: string
): Partial<Column> | undefined => {
  return worksheet.columns.find(
    (column) => column.values && column.values[1] === name
  );
};

const getCellValue = (
  row: Row,
  column: Partial<Column> | undefined
): string | undefined => {
  if (!column || column.number === undefined) return undefined;
  const cell = row.getCell(column.number);
  return cell.value?.toString();
};

const parseWorksheet = (
  worksheet: Worksheet,
  includeFieldId: boolean
): z.infer<typeof SheetDataSchema> => {
  const categoryColumn = findColumn(worksheet, COLUMN_NAMES.CATEGORY);
  const fieldColumn = findColumn(worksheet, COLUMN_NAMES.FIELD);
  const fieldIdColumn = includeFieldId
    ? findColumn(worksheet, COLUMN_NAMES.FIELD_ID)
    : undefined;

  if (!categoryColumn || !fieldColumn) {
    throw new Error(
      t(
        'common.err_column_not_found',
        COLUMN_NAMES.CATEGORY,
        COLUMN_NAMES.FIELD
      )
    );
  }

  const categories: string[] = [];
  const fields: z.infer<typeof FieldSchema>[] = [];

  worksheet.eachRow((row: Row, rowNumber: number) => {
    if (rowNumber === 1) return; // Skip header row

    const categoryValue = getCellValue(row, categoryColumn);
    const fieldValue = getCellValue(row, fieldColumn);

    if (categoryValue && fieldValue) {
      const fieldObject: z.infer<typeof FieldSchema> = {
        category: categoryValue,
        name: fieldValue,
      };

      if (includeFieldId && fieldIdColumn) {
        const fieldIdValue = getCellValue(row, fieldIdColumn);
        if (fieldIdValue) {
          fieldObject.field_id = fieldIdValue;
        }
      }

      fields.push(fieldObject);
      if (!categories.includes(categoryValue)) {
        categories.push(categoryValue);
      }
    }
  });

  return { categories, fields };
};

const parseExcelFile = async (file: File): Promise<SendObjectType> => {
  const arrayBuffer = await file.arrayBuffer();
  const wb = new Workbook();
  await wb.xlsx.load(arrayBuffer);

  const sendObject: Partial<SendObjectType> = {};
  const SHEET_NAMES = [
    { name: 'feedback', includeFieldId: true },
    { name: 'production', includeFieldId: false },
    { name: 'equipment', includeFieldId: false },
    { name: 'electricity', includeFieldId: false },
  ] as const;

  for (const { name: sheetName, includeFieldId } of SHEET_NAMES) {
    const worksheet = wb.getWorksheet(sheetName);
    
    // Skip if worksheet doesn't exist
    if (!worksheet) {
      console.warn(t('common.worksheet_not_found_skipping', sheetName));
      continue;
    }

    try {
      const sheetData = parseWorksheet(worksheet, includeFieldId);
      sendObject[sheetName] = sheetData;
    } catch (error) {
      console.error(
        t('common.error_parsing_worksheet', sheetName, (error as Error).message)
      );
      // Continue to next sheet instead of throwing
      continue;
    }
  }

  return SendObjectSchema.parse(sendObject);
};

export const bulkImport = async (data: {
  file: File;
}): Promise<SendObjectType> => {
  try {
    const { file } = data;
    if (!(file instanceof File)) {
      throw new Error(t('common.invalid_file_type'));
    }

    const sendObject = await parseExcelFile(file);

    return sendObject;
  } catch (error) {
    throw new Error(t('common.err_processing_file', (error as Error).message));
  }
};
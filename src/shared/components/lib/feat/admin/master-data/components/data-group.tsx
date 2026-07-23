import { CloudUploadFill, UtilityDataQueryExport } from '@digital-twin/icons';
import { ExcelReport, t } from '@digital-twin/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { z } from 'zod';

import { BulkImport, Button, Column, Container, Row } from '../../../../../index';
import { sendBulkImport } from '../api/master.api';
import { bulkImport, SendObjectType } from './bulk-import';
import styles from './data-group.module.scss';

class MasterDataTemplate extends ExcelReport {
  public generateTemplate = () => {
    // const feedback = this.workbook.addWorksheet('feedback');
    const equipment = this.workbook.addWorksheet('equipment');

    // Feedback sheet
    // feedback.getCell('A1').value = 'category';
    // feedback.getCell('B1').value = 'field';
    // feedback.getCell('C1').value = 'field_id';

    // Equipment sheet
    equipment.getCell('A1').value = 'category';
    equipment.getCell('B1').value = 'field';

    // Variant-specific sheet
    // const production = this.workbook.addWorksheet('production');
    // production.getCell('A1').value = 'category';
    // production.getCell('B1').value = 'field';

    const examples = this.workbook.addWorksheet('examples');

    // Examples sheet
    // examples.getCell('A1').value = 'Sheet: feedback';
    // examples.getCell('A1').font = {
    //   name: 'Arial Black',
    // };
    // examples.getCell('A2').value = 'category';
    // examples.getCell('B2').value = 'field';
    // examples.getCell('C2').value = 'field_id';
    // examples.getCell('A3').value = 'EXTERNAL';
    // examples.getCell('B3').value = 'EXTERNAL_FIELD';
    // examples.getCell('C3').value = 'EXTERNAL_FIELD_ID';

    examples.getCell('A5').value = 'Sheet: equipment';
    examples.getCell('A5').font = {
      name: 'Arial Black',
    };
    examples.getCell('A6').value = 'category';
    examples.getCell('B6').value = 'field';
    examples.getCell('A7').value = 'Note : this column may only contain Types, Brands, or Series';
    examples.getCell('A7').font = {
      color: { argb: 'FFFFFF' },
    };

    examples.getCell('A7').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF0000' },
    };
    examples.getCell('A8').value = 'Brands';
    examples.getCell('B8').value = 'Brand1';
    examples.getCell('A9').value = 'Series';
    examples.getCell('B9').value = 'Series1';
    examples.getCell('A10').value = 'Types';
    examples.getCell('B10').value = 'Type1';
    examples.getCell('A11').value = 'Alarms';
    examples.getCell('B11').value = '9999-ExampleAlarm';

    // examples.getCell('A12').value = 'Sheet: production';
    // examples.getCell('A12').font = {
    //   name: 'Arial Black',
    // };
    // examples.getCell('A13').value = 'category';
    // examples.getCell('B13').value = 'field';
    // examples.getCell('A14').value = 'PRODUCTION_CATEGORY';
    // examples.getCell('B14').value = 'PRODUCTION_FIELD';

    // this.autoWidth('feedback');
    this.autoWidth('equipment');
    // this.autoWidth('production');
    // this.autoWidth('electricity');
    this.autoWidth('examples');
  };
}

interface DataGroupProps {
  dataGroup: {
    id: number;
    name: string;
    count: number;
    alias: string;
  }[];
  handleSelectDataGroup: (id: number) => void;
  selectedDataGroup: number | null;
}

const formSchema = z.object({
  file: z.instanceof(File).refine((file) => file.size > 0, {
    message: 'common.err_file_required',
  }),
});
type FormType = z.infer<typeof formSchema>;

export function DataGroup({ dataGroup, handleSelectDataGroup, selectedDataGroup }: DataGroupProps) {
  const [searchParams] = useSearchParams();
  const group = searchParams.get('group');
  const categorySearchValue = searchParams.get('category_search') ?? '';
  const categorySchema = searchParams.get('category_schema');
  const categoryTable = searchParams.get('category_table');

  const categoryId = searchParams.get('category_id');
  const fieldSearchValue = searchParams.get('field_search') ?? '';
  const fieldSchema = searchParams.get('field_schema');
  const fieldTable = searchParams.get('field_table');

  const [showBulkImport, setShowBulkImport] = useState(false);
  const [importedData, setImportedData] = useState<SendObjectType | null>(null);
  const [isValid, setIsValid] = useState(false);
  const { control, handleSubmit, reset, watch } = useForm<FormType>({});
  const [sheets, setSheets] = useState<
    {
      name: string;
      rows: Row[];

      columns: Column[];
    }[]
  >([]);
  const queryClient = useQueryClient();

  const watchFile = watch('file');

  const { mutate } = useMutation({
    mutationKey: ['bulk-import-master'],
    mutationFn: async (data: { payload: string }) => {
      await sendBulkImport({ payload: data.payload });
    },
    onSuccess: () => {
      setShowBulkImport(false);
      reset({ file: undefined });

      queryClient.invalidateQueries({
        queryKey: ['getCategories', group, categorySearchValue, categorySchema, categoryTable],
      });

      queryClient.invalidateQueries({
        queryKey: ['getFields', categoryId, group, fieldSearchValue, fieldSchema, fieldTable],
      });

      queryClient.invalidateQueries({
        queryKey: ['getDatagroup'],
      });
      toast.success(t('common.success_file_import_processed'));
    },
  });

  const handleFormSubmit = handleSubmit(
    () => {
      try {
        if (importedData) {
          mutate({ payload: JSON.stringify(importedData) });
        }
      } catch (err) {
        const error = err as Error;
        toast.error(error.message);
      }
    },
    (errors) => toast.info(t('common.form_error') + errors.file)
  );

  const handleCloseDrawer = () => {
    setShowBulkImport(false);
    setIsValid(false);
    reset({ file: undefined });
  };

  const handleReset = () => {
    setIsValid(false);
    reset({ file: undefined });
    setSheets([]);
  };

  const handleDownloadTemplate = () => {
    const excel = new MasterDataTemplate();
    excel.generateTemplate();
    excel.export({ fileName: 'master_data_template' });
  };

  useEffect(() => {
    const transformSheet = (name: string, data: Row[], fields: string[]) => ({
      name,
      rows:
        (data?.map((field, idx) => ({
          id: idx.toString(),
          ...fields.reduce((acc, key) => ({ ...acc, [key]: field[key] }), {}),
        })) as Row[]) ?? ([] as Row[]),
      columns: fields.map((key) => ({
        name: key,
        key,
        alignment: 'center',
      })) as Column[],
    });

    (async () => {
      try {
        if (!watchFile) return;

        const parsedData = await bulkImport({ file: watchFile });

        console.log(parsedData);

        type SheetName = 'production' | 'equipment' | 'feedback' | 'electricity';

        const sheetDefinitions: { name: SheetName; fields: string[] }[] = [
          { name: 'equipment', fields: ['category', 'name'] },
        ];

        const transformedSheets = sheetDefinitions.map((def) =>
          transformSheet(
            def.name,
            (parsedData[def.name]?.fields.map((item, idx) => ({
              id: idx.toString(),
              ...item,
            })) as Row[]) || [],
            def.fields
          )
        );

        setSheets(transformedSheets);
        setImportedData(parsedData);
        setIsValid(true);
      } catch (err) {
        setIsValid(false);
        toast.error((err as Error).message);
      }
    })();
  }, [watchFile]);

  return (
    <Container
      className={styles['data-group-container']}
      title={t('common.data_group')}
      icon={<UtilityDataQueryExport />}
      background={'none'}
      rightTopComponent={
        <div className={styles['right-top-component']}>
          <Button icon={<CloudUploadFill />} onClick={() => setShowBulkImport((prev) => !prev)}>
            {t('common.upload')}
          </Button>
          <BulkImport
            title={t('common.import_master_data')}
            control={control}
            registered="file"
            isValid={isValid}
            open={showBulkImport}
            width={1000}
            onClose={handleCloseDrawer}
            onReset={handleReset}
            onTemplateClick={handleDownloadTemplate}
            sheets={sheets}
            onSubmit={handleFormSubmit}
            ITEM_HEIGHT={40}
            OFFSET={40}
          />
        </div>
      }
    >
      <div className={styles['item-container']}>
        {dataGroup.map((item) => (
          <div
            key={item.id}
            id={item.id.toString()}
            onClick={() => {
              handleSelectDataGroup(item.id);
            }}
            className={styles[`${selectedDataGroup === item.id ? 'item-selected' : 'item'}`]}
          >
            <div className={styles['item-icon']}>
              <UtilityDataQueryExport />
            </div>
            <div className={styles['item-label']}>
              <span title={item.name}>{item.name}</span>
            </div>
            <div className={styles['item-value']}>
              <span
                title={`${item.count} Dataset`}
                style={{
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                }}
              >{`${item.count}`}</span>
              <span title={`${item.count} Dataset`}>{t('common.dataset')}</span>
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}

import {
  CloudDownloadFill,
  CloudUploadFill,
  DatasetGridFill,
  FileXsl,
  FolderOpenFill,
  TrashDeleteFill,
} from '@digital-twin/icons';
import { useVerticalLimit } from '@digital-twin/utils';
import { t } from '@digital-twin/utils';
import {
  DownloadIcon,
  TabProduct,
  TabsProduct,
  UploadIcon,
} from '@digital-twin/reusables';
import clsx from 'clsx';
import { ReactNode, useEffect, useId, useState } from 'react';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';

import {
  COLOR,
  Column,
  Drawer,
  Pagination2,
  Popup,
  Row,
  Table,
} from '../../index';
import styles from './bulk-import.module.scss';

interface BulkImportProps<T extends FieldValues> {
  control: Control<T>;
  registered: Path<T>;
  open: boolean;
  sheets: {
    name: string;
    rows: Row[];
    columns: Column[];
  }[];
  width: number;
  isValid?: boolean;
  ITEM_HEIGHT?: number;
  OFFSET?: number;
  onClose: () => void;
  onTemplateClick: () => void;
  onSubmit: React.FormEventHandler<HTMLFormElement> | undefined;
  onReset?: () => void;
  title?: string;
  icon?: ReactNode;
  submitting?: boolean;
}

export const BulkImport = <T extends FieldValues>({
  registered,
  control,
  open,
  width,
  sheets,
  ITEM_HEIGHT = 36,
  OFFSET = 36,
  isValid = true,
  onClose,
  onSubmit,
  onReset,
  onTemplateClick,
  title = 'Import Master Data',
  icon,
  submitting,
}: BulkImportProps<T>) => {
  const id = useId();
  const [preview, setPreview] = useState(false);

  // For responsive limit
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [page, setPage] = useState<number>(1);
  const [tab, setTab] = useState(sheets.length > 0 ? sheets[0].name : '');

  const limit =
    useVerticalLimit({
      container,
      itemHeight: ITEM_HEIGHT,
      offset: OFFSET,
    }) ?? 1;

  const formatFileSizeText = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      // Less than 1 MB, show in KB
      return `${(bytes / 1024).toFixed(2)} KB`;
    } else {
      // 1 MB or greater, show in MB
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
  };

  useEffect(() => {
    if (sheets.length > 0) {
      setTab(sheets[0].name);
    }
  }, [sheets]);

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        icon={icon}
        onSubmit={onSubmit}
        title={title}
        variant="save"
        afterClose={() => {
          onReset && onReset();
        }}
        submitting={submitting}
      >
        <div className={styles.file__input}>
          <Controller
            control={control}
            name={registered}
            render={({ field: { value, onChange, ...field } }) => (
              <div className={styles.wrapper}>
                <input
                  {...field}
                  id={id}
                  type="file"
                  accept=".xlsx"
                  onChange={(event) => {
                    onChange(event.target.files?.[0]);
                  }}
                  className={styles.fileInput}
                />
                <div
                  className={clsx(
                    styles.icon,
                    value ? styles.icon__filled : ''
                  )}
                >
                  {!value || !isValid ? (
                    <UploadIcon width={100} height={100} />
                  ) : (
                    <FileXsl />
                  )}
                </div>
                <div className={styles.upload__text}>
                  <span>{t('common.import_master_data_placeholder')}</span>
                </div>
                {!value || !isValid ? (
                  <span className={styles.filetype__text}>
                    {t('common.file_type')} (.xlsx)
                  </span>
                ) : (
                  <div className={styles.description__text}>
                    <span>{value.name}</span>
                    <span>{formatFileSizeText(value.size)}</span>
                  </div>
                )}
                <div
                  style={{ display: 'flex', gap: 6, justifyContent: 'center' }}
                >
                  <label htmlFor={id} className={styles.input__label}>
                    {(!value || !isValid) && (
                      <div className={styles.action__button}>
                        <FolderOpenFill />
                        <span>{t('common.browse')}</span>
                      </div>
                    )}
                    {value && isValid && (
                      <div
                        className={styles.action__button}
                        onClick={(e) => {
                          e.preventDefault();
                          onChange(undefined);
                          onReset && onReset();
                          e.currentTarget.closest('form')?.reset();
                        }}
                      >
                        <TrashDeleteFill />
                        <span>{t('common.remove')}</span>
                      </div>
                    )}
                  </label>
                  <label className={styles.input__label}>
                    <div
                      className={styles.action__button}
                      onClick={onTemplateClick}
                    >
                      <DownloadIcon />
                      <span>{t('common.template')}</span>
                    </div>
                  </label>
                  {isValid && (
                    <label className={styles.input__label}>
                      <div
                        className={styles.action__button}
                        onClick={() => setPreview(true)}
                      >
                        <DatasetGridFill />
                        <span>{t('common.preview')}</span>
                      </div>
                    </label>
                  )}
                </div>
              </div>
            )}
          />
        </div>
      </Drawer>
      <Popup
        onClose={() => {
          setPreview(false);
        }}
        open={preview}
        title={t('common.preview')}
        background="none-without-padding"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            className={styles['container']}
            style={{ width: width, backgroundColor: COLOR.backgroundLowest }}
          >
            <TabsProduct
              onChange={(e) => {
                setPage(1);
                setTab(e);
              }}
              value={tab}
            >
              {sheets.map((sheet) => {
                return (
                  <TabProduct key={sheet.name} value={sheet.name}>
                    {sheet.name}
                  </TabProduct>
                );
              })}
            </TabsProduct>
            <div className={styles['preview']}>
              <div className={styles['preview__header']}>
                <span className={styles['preview__label']}>
                  {t('common.preview')}:
                </span>
                <span className={styles['preview__label']}>{`${t(
                  'common.total'
                )}: ${(
                  sheets.find((item) => item.name === tab)?.rows?.length || 0
                ).toLocaleString()}`}</span>
              </div>
              <div className={styles['preview__value']}>
                <div className={styles['preview__table']} ref={setContainer}>
                  <Table
                    width="100%"
                    columns={
                      sheets.find((item) => item.name === tab)?.columns ?? []
                    }
                    rows={(
                      sheets.find((item) => item.name === tab)?.rows ?? []
                    ).slice((page - 1) * limit, page * limit)}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className={styles['preview__pagination']}>
            <Pagination2
              count={
                sheets.find((item) => item.name === tab)?.rows?.length || 0
              }
              limit={limit}
              page={page}
              onChange={(e) => {
                setPage(e);
              }}
              variant="arrow"
            />
          </div>
        </div>
      </Popup>
    </>
  );
};

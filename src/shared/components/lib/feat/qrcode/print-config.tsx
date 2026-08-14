import { GridH } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import { GridViewIcon } from '@digital-twin/reusables';
import { useEffect, useState } from 'react';

import { Checkbox, COLOR, Drawer, Dropdown } from '../../../index';
import styles from './print-config.module.scss';
import QrCodePortal from './qrcode-portal';

interface PrintConfigProps {
  open: boolean;
  fileName: string;
  qrList: {
    firstField: {
      name: string;
      value: string;
      excluded: boolean;
    };
    secondField: {
      name: string;
      value: string;
      excluded: boolean;
    };
    thirdField: {
      name: string;
      value: string;
      excluded: boolean;
    };
    fourthField: {
      name: string;
      value: string;
      excluded: boolean;
    };
    fifthField: {
      name: string;
      value: string;
      excluded: boolean;
    };
    value: string;
  }[][];
  infoMessage?: React.ReactNode;
  backComponent?: React.ReactNode;
  onFinishDownload?: () => void;
  onCancel: () => void;
}

const DEFAULT_CONTINUOUS_LABEL = {
  Q1: { width: 70, height: 35 },
  Q2: { width: 80, height: 40 },
  Q3: { width: 100, height: 50 },
  Q4: { width: 200, height: 100 },
};
export const PAPER_SIZE = {
  A4: { width: 210, height: 297 },
  LETTER: { width: 215.9, height: 279.4 },
};
export type Orientation = 'l' | 'landscape' | 'p' | 'portrait';
export type PaperType = keyof typeof PAPER_SIZE;
export type ContinuousLabelType = keyof typeof DEFAULT_CONTINUOUS_LABEL;
export type PrintType = 'avery' | 'continuous';

interface PrintSelectionType {
  filterView: PrintType;
  setFilterView: (type: PrintType) => void;
}
export const PrintSelectionType = ({ filterView, setFilterView }: PrintSelectionType) => {
  return (
    <div className={styles['view-options']}>
      <div
        className={styles['option']}
        style={{
          backgroundColor:
            filterView === 'avery' ? COLOR.brandSurfaceDefaultPrimary : COLOR.backgroundLow,
          opacity: filterView === 'avery' ? 1 : 0.6,
          borderTopLeftRadius: 8,
          borderBottomLeftRadius: 8,
        }}
        onClick={() => {
          setFilterView('avery');
        }}
      >
        <GridViewIcon style={{ width: 20, height: 20 }} />
        <span>{t('common.avery_label')}</span>
      </div>
      <div
        className={styles['option']}
        style={{
          backgroundColor:
            filterView === 'continuous' ? COLOR.brandSurfaceDefaultPrimary : COLOR.backgroundLow,
          opacity: filterView === 'continuous' ? 1 : 0.6,
          borderTopRightRadius: 8,
          borderBottomRightRadius: 8,
        }}
        onClick={() => {
          setFilterView('continuous');
        }}
      >
        <GridH />
        <span>{t('common.continous_label')}</span>
      </div>
    </div>
  );
};

const PrintConfig = ({
  open,
  fileName,
  qrList,
  infoMessage,
  backComponent,
  onCancel,
  onFinishDownload,
}: PrintConfigProps) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedPrintType, setSelectedPrintType] = useState<PrintType>('avery');
  const [selectedPaperType, setSelectedPaperType] = useState<PaperType>('A4');
  const [selectedContinuousLabel, setContinuousLabel] = useState<ContinuousLabelType>('Q1');
  const [companyField, setCompanyField] = useState(true);
  const [initialQrList, setInitialQrList] = useState(qrList);

  const handleDownloadStart = () => {
    setPreviewOpen(false);
  };

  const handlePaperTypeChange = (e: string) => {
    setSelectedPaperType(e as PaperType);
  };

  const handleChangeConfig = (fieldName: string, isChecked: boolean) => {
    setInitialQrList((prev) => {
      return prev.map((qrRow) => {
        return qrRow.map((qrItem) => {
          if (qrItem.firstField.name === fieldName) {
            qrItem.firstField.excluded = !isChecked;
          }
          if (qrItem.secondField.name === fieldName) {
            qrItem.secondField.excluded = !isChecked;
          }
          if (qrItem.thirdField.name === fieldName) {
            qrItem.thirdField.excluded = !isChecked;
          }
          if (qrItem.fourthField.name === fieldName) {
            qrItem.fourthField.excluded = !isChecked;
          }
          if (qrItem.fifthField.name === fieldName) {
            qrItem.fifthField.excluded = !isChecked;
          }
          return qrItem;
        });
      });
    });
  };

  useEffect(() => {
    setInitialQrList(qrList);
  }, [qrList]);

  return (
    <>
      <Drawer
        icon={backComponent}
        onClose={onCancel}
        open={open}
        variant="print"
        title={t('common.print_configuration')}
        onSubmit={(e) => {
          e.preventDefault();
          setPreviewOpen(true);
        }}
        background={'dark'}
      >
        <div className={styles['print-config-container']}>
          {/* <div className={styles['print-type-selector']}>
            <Button
              className={
                selectedPrintType === 'avery'
                  ? styles['chosen']
                  : styles['not-chosen']
              }
              onClick={() => setSelectedPrintType('avery')}
              type="button"
            >
              {t('common.avery_label')}
            </Button>
            <Button
              className={
                selectedPrintType === 'continuous'
                  ? styles['chosen']
                  : styles['not-chosen']
              }
              style={{ marginLeft: '-6px' }}
              onClick={() => setSelectedPrintType('continuous')}
              type="button"
            >
              {t('common.continous_label')}
            </Button>
          </div> */}
          <PrintSelectionType filterView={selectedPrintType} setFilterView={setSelectedPrintType} />
          <div className={styles['print-config']}>
            {infoMessage && infoMessage}
            <div>
              {selectedPrintType === 'avery' && (
                <Dropdown
                  labelPosition="top"
                  label={t('common.select_label_type') + ' : '}
                  options={[
                    { label: '30 per sheet, A4', value: 'A4' },
                    { label: '27 per sheet, Letter', value: 'LETTER' },
                  ]}
                  value={selectedPaperType}
                  onChange={handlePaperTypeChange}
                  background="dark"
                />
              )}
              {selectedPrintType === 'continuous' && (
                <Dropdown
                  labelPosition="top"
                  label={t('common.select_label_type') + ' : '}
                  options={[
                    { label: '70 x 35 (WxH)', value: 'Q1' },
                    { label: '80 x 40 (WxH)', value: 'Q2' },
                    { label: '100 x 50 (WxH)', value: 'Q3' },
                    { label: '200 x 100 (WxH)', value: 'Q4' },
                  ]}
                  value={selectedContinuousLabel}
                  onChange={(e) => setContinuousLabel(e as ContinuousLabelType)}
                  background="dark"
                />
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, flexDirection: 'column' }}>
              <span>{t('common.customize_field_to_print') + ' : '}</span>
              <div>
                <div
                  style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}
                >
                  {qrList.map((qrRow, rowIndex) => {
                    return (
                      <div
                        key={rowIndex}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          flex: 1,
                          gap: 8,
                        }}
                      >
                        {qrRow[0] && <span>{`${t('common.field')} ${rowIndex + 1} :`}</span>}
                        {qrRow[0] && qrRow[0]?.firstField && qrRow[0]?.firstField.name && (
                          <Checkbox
                            label={t(qrRow[0]?.firstField.name)}
                            defaultChecked={true}
                            onClick={(e) =>
                              handleChangeConfig(
                                qrRow[0]?.firstField.name || '',
                                e.currentTarget.checked
                              )
                            }
                          />
                        )}
                        {qrRow[0] && qrRow[0]?.secondField && qrRow[0]?.secondField.name && (
                          <Checkbox
                            label={t(qrRow[0].secondField.name)}
                            defaultChecked={true}
                            onClick={(e) =>
                              handleChangeConfig(qrRow[0].secondField.name, e.currentTarget.checked)
                            }
                          />
                        )}
                        {qrRow[0] && qrRow[0]?.thirdField && qrRow[0]?.thirdField.name && (
                          <Checkbox
                            label={t(qrRow[0].thirdField.name)}
                            defaultChecked={true}
                            onClick={(e) =>
                              handleChangeConfig(qrRow[0].thirdField.name, e.currentTarget.checked)
                            }
                          />
                        )}
                        {qrRow[0] && qrRow[0]?.fourthField && qrRow[0]?.fourthField.name && (
                          <Checkbox
                            label={t(qrRow[0].fourthField.name)}
                            defaultChecked={true}
                            onClick={(e) =>
                              handleChangeConfig(qrRow[0].fourthField.name, e.currentTarget.checked)
                            }
                          />
                        )}
                        {qrRow[0] && qrRow[0]?.fifthField && qrRow[0]?.fifthField.name && (
                          <Checkbox
                            label={t(qrRow[0].fifthField.name)}
                            defaultChecked={true}
                            onClick={(e) =>
                              handleChangeConfig(qrRow[0].fifthField.name, e.currentTarget.checked)
                            }
                          />
                        )}
                        {rowIndex === 1 && (
                          <>
                            <span>{`${t('common.company_logo')} : `}</span>
                            <Checkbox
                              label={t('common.company_logo')}
                              value={companyField}
                              onChange={() => setCompanyField((prev) => !prev)}
                            />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Drawer>
      <QrCodePortal
        initialSelectedPrintType={selectedPrintType}
        initialSelectedPaperType={selectedPaperType}
        onDownloadStart={handleDownloadStart}
        fileName={fileName}
        qrList={initialQrList.flat()}
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        onFinishDownload={() => onFinishDownload && onFinishDownload()}
        initialCompanyField={companyField}
        initialContinuousWidth={DEFAULT_CONTINUOUS_LABEL[selectedContinuousLabel].width}
        initialContinuousHeight={DEFAULT_CONTINUOUS_LABEL[selectedContinuousLabel].height}
      />
    </>
  );
};

export default PrintConfig;

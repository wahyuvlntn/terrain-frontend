import { Download2, ExportNotes } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import { memo } from 'react';
import { createPortal } from 'react-dom';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';

import { Button, Dropdown, Input, Loading } from '../../../index';
import AveryView from './avery-view';
import ContinuousView from './continuous-view';
import { PAPER_SIZE, PaperType, PrintType } from './print-config';
import { useQRCodePortal } from './qrcode-portal.hook';
import styles from './qrcode-portal.module.scss';

interface QrCodePortalProps {
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
  }[];
  open: boolean;
  initialContinuousWidth: number;
  initialContinuousHeight: number;
  initialSelectedPrintType: PrintType;
  initialSelectedPaperType: PaperType;
  initialCompanyField: boolean;
  onDownloadStart: () => void;
  onFinishDownload: () => void;
  onError?: (e: Error) => void;
  onCancel: () => void;
}

const QrCodePortal = memo(
  ({
    fileName,
    qrList,
    open,
    initialContinuousWidth,
    initialContinuousHeight,
    initialSelectedPaperType,
    initialSelectedPrintType,
    initialCompanyField,
    onDownloadStart,
    onFinishDownload,
    onError,
    onCancel,
  }: QrCodePortalProps) => {
    const {
      pages,
      initQrList,
      itemCount,
      documentRefs,
      printType,
      orientation,
      LABEL_MAX_WIDTH,
      continuousHeight,
      continuousWidth,
      MINIMUM_HEIGHT,
      MINIMUM_WIDTH,
      transformComponentRef,
      paperType,
      companyField,
      logo,
      backgroundLowest,
      documentReady,
      setDocumentReady,
      handleContinuousHeightChange,
      handleContinuousWidthChange,
      handleExportPDF,
      handleOrientationChange,
      handlePaperTypeChange,
      handleFinishDrawing,
      handlePrintType,
    } = useQRCodePortal({
      fileName,
      initialSelectedPrintType,
      qrList,
      open,
      initialSelectedPaperType,
      initialCompanyField,
      initialContinuousWidth,
      initialContinuousHeight,
      onDownloadStart,
      onError,
      onFinishDownload,
    });

    return (
      <>
        {open &&
          createPortal(
            <div className={styles['export-modal']}>
              <div className={styles['preview-container']}>
                <div className={styles['header']}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4.5 }}>
                    <Download2 />
                    <span className={styles['header-label']}>{t('common.download_preview')}</span>
                  </div>
                  <div className={styles['options']}>
                    <Dropdown
                      label={t('common.print_type') + ' : '}
                      labelPosition="left"
                      options={[
                        { value: 'avery', label: 'Avery' },
                        { value: 'continuous', label: 'Continuous' },
                      ]}
                      value={printType}
                      onChange={handlePrintType}
                      background={'dark'}
                    />
                    {printType === 'continuous' && (
                      <>
                        <Input
                          wrapperProps={{ style: { width: 150 } }}
                          label={t('common.width') + ' : '}
                          labelPosition="left"
                          onChange={handleContinuousWidthChange}
                          value={continuousWidth}
                          type="number"
                          suffix="mm"
                          background={'dark'}
                        />
                        <Input
                          wrapperProps={{ style: { width: 150 } }}
                          label={t('common.height') + ' : '}
                          labelPosition="left"
                          onChange={handleContinuousHeightChange}
                          value={continuousHeight}
                          type="number"
                          suffix="mm"
                          background={'dark'}
                        />
                      </>
                    )}
                    {printType === 'avery' && (
                      <>
                        <Dropdown
                          label={t('common.paper') + ' : '}
                          labelPosition="left"
                          options={[
                            { value: 'A4', label: 'A4' },
                            { value: 'LETTER', label: 'Letter' },
                          ]}
                          value={paperType}
                          onChange={handlePaperTypeChange}
                          background={'dark'}
                        />
                        <Dropdown
                          label={t('common.orientation') + ' : '}
                          labelPosition="left"
                          options={[
                            { value: 'l', label: 'Landscape' },
                            { value: 'p', label: 'Portrait' },
                          ]}
                          value={orientation}
                          onChange={handleOrientationChange}
                          background={'dark'}
                        />
                      </>
                    )}
                  </div>
                </div>
                <div className={styles['main-layout']}>
                  <Loading isLoading={!documentReady} />
                  <TransformWrapper
                    panning={{
                      disabled: false,
                      velocityDisabled: false,
                      lockAxisX: false,
                      lockAxisY: false,
                      excluded: ['panningDisabled'],
                      allowMiddleClickPan: true,
                    }}
                    pinch={{ step: 5, excluded: ['pinchDisabled'] }}
                    disablePadding={false}
                    initialScale={1}
                    doubleClick={{ step: 0.7, disabled: false, excluded: [] }}
                    minScale={0.05}
                    maxScale={2}
                    wheel={{
                      step: 0.1,
                      smoothStep: 0.001,
                      disabled: false,
                      wheelDisabled: false,
                      touchPadDisabled: false,
                      excluded: ['wheelDisabled'],
                    }}
                    ref={transformComponentRef}
                  >
                    <TransformComponent
                      wrapperClass={styles['zoom-wrapper']}
                      contentStyle={{
                        padding: 96,
                        gap:
                          printType === 'continuous'
                            ? (16 * continuousHeight) / MINIMUM_HEIGHT
                            : 16,
                        justifyContent: printType === 'continuous' ? 'center' : '',
                      }}
                    >
                      {printType === 'avery' ? (
                        <AveryView
                          startDrawing={() => {
                            setDocumentReady(false);
                          }}
                          finishDrawing={handleFinishDrawing}
                          LABEL_MAX_WIDTH={LABEL_MAX_WIDTH}
                          documentRefs={documentRefs}
                          height={PAPER_SIZE[paperType].height}
                          width={PAPER_SIZE[paperType].width}
                          isPreview={true}
                          open={open}
                          itemCountPerPage={itemCount}
                          orientation={orientation}
                          pages={pages}
                          qrList={initQrList}
                          companyField={companyField}
                          logo={logo}
                          backgroundLowest={backgroundLowest}
                        />
                      ) : (
                        <ContinuousView
                          open={open}
                          startDrawing={() => {
                            setDocumentReady(false);
                          }}
                          finishDrawing={handleFinishDrawing}
                          LABEL_MAX_WIDTH={LABEL_MAX_WIDTH}
                          height={continuousHeight}
                          width={continuousWidth}
                          isPreview={true}
                          itemCountPerPage={itemCount}
                          pages={pages}
                          qrList={initQrList}
                          MINIMUM_HEIGHT={MINIMUM_HEIGHT}
                          MINIMUM_WIDTH={MINIMUM_WIDTH}
                          companyField={companyField}
                          documentRefs={documentRefs}
                          logo={logo}
                          backgroundLowest={backgroundLowest}
                        />
                      )}
                    </TransformComponent>
                  </TransformWrapper>
                </div>
                <div className={styles['actions']}>
                  <Button onClick={onCancel} color="default-secondary">
                    {t('common.cancel')}
                  </Button>
                  <Button
                    disabled={!documentReady}
                    onClick={handleExportPDF}
                    icon={<ExportNotes />}
                  >
                    {t('common.export')}
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )}
        <div></div>
      </>
    );
  },
  (prev, next) => {
    return JSON.stringify(prev) === JSON.stringify(next);
  }
);

export default QrCodePortal;

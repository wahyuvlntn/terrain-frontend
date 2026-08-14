import { t } from '@digital-twin/utils';
// import domtoimage from 'dom-to-image';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { v4 } from 'uuid';

import { ThemeContext } from '../admin';
import { ProgressBarContext } from '../progress-ctx';
import { Orientation, PAPER_SIZE, PaperType, PrintType } from './print-config';

interface TQRPortal {
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
  onError?: (err: Error) => void;
}

export const useQRCodePortal = ({
  fileName,
  initialSelectedPrintType,
  qrList,
  onDownloadStart,
  onFinishDownload,
  onError,
  open,
  initialContinuousWidth,
  initialContinuousHeight,
  initialCompanyField,
  initialSelectedPaperType,
}: TQRPortal) => {
  const [documentReady, setDocumentReady] = useState(false);
  const [paperType, setPaperType] = useState<PaperType>(
    initialSelectedPaperType
  );
  const [orientation, setOrientation] = useState<Orientation>('p');
  const [printType, setPrintType] = useState<PrintType>(
    initialSelectedPrintType
  );
  const [continuousWidth, setContinuousWidth] = useState(
    initialContinuousWidth
  );
  const [continuousHeight, setContinuousHeight] = useState(
    initialContinuousHeight
  );
  const [MINIMUM_HEIGHT, MINIMUM_WIDTH] = [31.75, 57.15];
  const [companyField, setCompanyField] = useState(initialCompanyField);
  const [initQrList, setInitQrList] = useState(qrList);
  const {
    logo,
    colors: { backgroundLowest },
  } = useContext(ThemeContext);

  const progContext = useContext(ProgressBarContext);

  useEffect(() => {
    setInitQrList(qrList);
  }, [qrList]);

  const LABEL_MAX_WIDTH =
    printType === 'continuous'
      ? continuousHeight > MINIMUM_HEIGHT
        ? (continuousHeight / MINIMUM_HEIGHT) * 440
        : 440
      : 440;

  const itemCount: number = useMemo(() => {
    if (printType === 'continuous') {
      return 1;
    }
    if (paperType === 'A4' && orientation === 'p') {
      return 30;
    } else if (orientation === 'l') {
      return 28;
    }
    return 27;
  }, [paperType, orientation, printType]);

  const pages: number[] = useMemo(() => {
    const pageLength = [];

    for (let k = 0; k < Math.ceil(qrList.length / itemCount); k++) {
      pageLength.push(k);
    }
    return pageLength;
  }, [qrList, itemCount]);

  const documentRefs = useRef<HTMLCanvasElement[]>([]);
  const transformComponentRef = useRef<ReactZoomPanPinchRef | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleExportPDF = useCallback(async () => {
    if (!progContext) return;

    const currentId = v4();

    const currentWorker = new Worker(
      new URL('./pdfWorker.ts', import.meta.url),
      {
        type: 'module',
        name: 'pdfWorker',
      }
    );

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    progContext.setWorker((prev) => {
      if (prev) {
        return [
          ...prev,
          {
            jobId: currentId,
            worker: currentWorker,
          },
        ];
      }

      return [
        {
          jobId: currentId,
          worker: currentWorker,
        },
      ];
    });

    const elementWidth =
      printType === 'avery'
        ? orientation === 'p'
          ? PAPER_SIZE[paperType].width
          : PAPER_SIZE[paperType].height
        : continuousWidth < MINIMUM_WIDTH || isNaN(continuousWidth)
        ? MINIMUM_WIDTH
        : continuousWidth;

    const elementHeight =
      printType === 'avery'
        ? orientation === 'p'
          ? PAPER_SIZE[paperType].height
          : PAPER_SIZE[paperType].width
        : continuousHeight < MINIMUM_HEIGHT || isNaN(continuousHeight)
        ? MINIMUM_HEIGHT
        : continuousHeight;

    try {
      progContext.setQueue((prev) => {
        if (!prev) {
          return [
            {
              id: currentId,
              progress: 0,
              target: Math.ceil(qrList.length / itemCount),
              baseMessage: `${t('common.generating')} QR `,
              isDownloading: true,
            },
          ];
        }

        return [
          ...prev,
          {
            id: currentId,
            progress: 0,
            target: Math.ceil(qrList.length / itemCount),
            baseMessage: `${t('common.generating')} QR `,
            isDownloading: true,
          },
        ];
      });

      if (!currentWorker) throw new Error('PDF Worker not initialize');
      currentWorker.onmessage = (event) => {
        if (event.data.type === 'complete') {
          const pdfBlob = new Blob([event.data.pdfBuffer], {
            type: 'application/pdf',
          });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(pdfBlob);
          link.download = `${fileName}.pdf`;
          link.click();
          onFinishDownload();
          progContext.setQueue((prev) => {
            if (prev) {
              return prev.filter((item) => item.id !== event.data.jobId);
            }

            return prev;
          });
          currentWorker.terminate();
        } else if (event.data.type === 'counter') {
          progContext.setQueue((prev) => {
            if (!prev) return prev;
            return prev.map((item) => {
              if (item.id === event.data.jobId) {
                return {
                  ...item,
                  progress: item.progress + 1,
                };
              }
              return item;
            });
          });
        } else if (event.data.type === 'error') {
          throw new Error(event.data.error);
        }
      };

      const transferables: ImageBitmap[] = [];

      for (let i = 0; i < pages.length; i++) {
        const canvas = documentRefs.current[i];
        const bitmap = await createImageBitmap(canvas);
        transferables.push(bitmap);
      }
      onDownloadStart();
      
      currentWorker.postMessage(
        {
          type: 'generatePDF',
          jobId: currentId,
          transferables,
          options: {
            orientation: printType === 'avery' ? orientation : 'l',
            unit: 'mm',
            format: [elementWidth, elementHeight],
            compress: true,
          },
        },
        transferables
      );
    } catch (error) {
      const err = error as Error;
      console.error('Error exporting PDF:', error);
      onError?.(err);
    } finally {
      if (signal.aborted) {
        currentWorker.terminate();
        progContext.setQueue((prev) => {
          if (prev) {
            return prev.filter((item) => item.id !== currentId);
          }
          return prev;
        });
        onFinishDownload();
      }
    }
  }, [
    fileName,
    qrList,
    printType,
    orientation,
    paperType,
    continuousWidth,
    continuousHeight,
    pages,
    MINIMUM_HEIGHT,
    MINIMUM_WIDTH,
    itemCount,
    progContext,
    onDownloadStart,
    onFinishDownload,
    onError,
  ]);

  const cancelExportPDF = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const handlePrintType = (e: string) => {
    setPrintType(e as PrintType);
    transformComponentRef.current?.resetTransform();
  };

  const handlePaperTypeChange = (e: string) => {
    setPaperType(e as PaperType);
  };

  const handleOrientationChange = (e: string) => {
    setOrientation(e as Orientation);
  };

  const handleContinuousWidthChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newWidth = parseInt(e.target.value);

    setContinuousHeight(newWidth / 2);
    setContinuousWidth(newWidth);
  };

  const handleContinuousHeightChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newHeight = parseInt(e.target.value);

    setContinuousHeight(newHeight);
    setContinuousWidth(newHeight * 2);
  };

  const handleFinishDrawing = () => {
    setDocumentReady(true);
  };

  const cleanupResources = useCallback(() => {
    if (documentRefs.current.length > 0) {
      documentRefs.current.forEach((canvas) => {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        canvas.width = 0;
        canvas.height = 0;
      });
      documentRefs.current = [];
    }
  }, []);

  useEffect(()=>{
    if(!open){
      cleanupResources();
    }
  },[open,cleanupResources])

  useEffect(() => {
    setPrintType(initialSelectedPrintType);
  }, [initialSelectedPrintType]);

  useEffect(() => {
    setContinuousWidth(initialContinuousWidth);
  }, [initialContinuousWidth]);

  useEffect(() => {
    setContinuousHeight(initialContinuousHeight);
  }, [initialContinuousHeight]);

  useEffect(() => {
    setPaperType(initialSelectedPaperType);
  }, [initialSelectedPaperType]);

  useEffect(() => {
    setCompanyField(initialCompanyField);
  }, [initialCompanyField]);

  return {
    initQrList,
    continuousHeight,
    continuousWidth,
    MINIMUM_HEIGHT,
    MINIMUM_WIDTH,
    pages,
    itemCount,
    documentRefs,
    printType,
    orientation,
    paperType,
    LABEL_MAX_WIDTH,
    transformComponentRef,
    companyField,
    logo,
    backgroundLowest,
    documentReady,
    setDocumentReady,
    handleExportPDF,
    handlePrintType,
    handlePaperTypeChange,
    handleOrientationChange,
    handleContinuousWidthChange,
    handleContinuousHeightChange,
    handleFinishDrawing,
    cancelExportPDF,
  };
};

import { ImagePlaceholder } from '@digital-twin/icons';
import AppIcon from '@digital-twin/images/app-icon.svg';
import { getURL } from '@digital-twin/utils';
import QRCode from 'qrcode';
import { memo, useCallback, useEffect } from 'react';

import styles from './avery-view.module.scss';

interface AveryViewProps {
  isPreview: boolean;
  pages: number[];
  documentRefs: React.MutableRefObject<HTMLCanvasElement[]>;
  orientation: 'p' | 'l' | 'landscape' | 'portrait';
  width: number;
  height: number;
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
  itemCountPerPage: number;
  LABEL_MAX_WIDTH: number;
  companyField: boolean;
  logo: string | null | undefined;
  backgroundLowest: string;
  open: boolean;
  startDrawing: () => void;
  finishDrawing: () => void;
}

const MM_TO_INCH = 25.4;
const DPI = 300;

const AveryView = memo(
  ({
    pages,
    documentRefs,
    orientation,
    width,
    open,
    height,
    qrList,
    itemCountPerPage,
    LABEL_MAX_WIDTH,
    companyField,
    logo,
    backgroundLowest,
    startDrawing,
    finishDrawing,
  }: AveryViewProps) => {
    const ADJUSTED_WIDTH = (width / MM_TO_INCH) * DPI;
    const ADJUSTED_HEIGHT = (height / MM_TO_INCH) * DPI;
    const scaleFactor = DPI / 300;

    // Calculate grid dimensions based on orientation
    const cols = orientation === 'l' ? 4 : 3;
    const rows = Math.ceil(itemCountPerPage / cols);

    const pageWidth = orientation === 'p' ? ADJUSTED_WIDTH : ADJUSTED_HEIGHT;
    const pageHeight = orientation === 'p' ? ADJUSTED_HEIGHT : ADJUSTED_WIDTH;

    const contentPadding = 100 * scaleFactor;
    const contentWidth = pageWidth - contentPadding * 2;
    const contentHeight = pageHeight - contentPadding * 2;

    // Label dimensions (grid cell size)
    const labelWidth = contentWidth / cols;
    const labelHeight = contentHeight / rows;

    const loadImage = useCallback(
      (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => {
            // Fallback to placeholder
            const placeholderImg = new Image();
            placeholderImg.src = ImagePlaceholder(backgroundLowest);
            placeholderImg.onload = () => resolve(placeholderImg);
            placeholderImg.onerror = reject;
          };
          img.src = src;
        });
      },
      [backgroundLowest]
    );

    const truncateText = useCallback(
      (
        ctx: CanvasRenderingContext2D,
        text: string,
        maxWidth: number
      ): string => {
        const metrics = ctx.measureText(text);
        if (metrics.width <= maxWidth) return text;

        let truncated = text;
        while (
          ctx.measureText(truncated + '...').width > maxWidth &&
          truncated.length > 0
        ) {
          truncated = truncated.slice(0, -1);
        }
        return truncated + '...';
      },
      []
    );

    const drawLabel = useCallback(
      async (
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        item: (typeof qrList)[0],
        signal: AbortSignal,
        logoImg: HTMLImageElement
      ) => {
        if (signal.aborted) return;

        const cardPadding = 32 * scaleFactor;
        const imageMaxWidth = 190 * scaleFactor;
        const qrSize = Math.min(imageMaxWidth, width * 0.4);

        // Company logo size
        const logoSize = qrSize * 0.3;
        const imageTextGap = width * 0.05;

        // Starting position with card padding
        const startX = x + cardPadding;
        const startY = y + cardPadding;

        try {
          const qrCanvas = document.createElement('canvas');
          await QRCode.toCanvas(qrCanvas, item.value, {
            width: qrSize,
            margin: 1,
            errorCorrectionLevel: 'M',
          });

          // Check if cancelled after QR generation
          if (signal.aborted) return;

          ctx.drawImage(qrCanvas, startX, startY, qrSize, qrSize);

          // Draw company logo if enabled
          if (companyField) {
            try {
              // Position logo at margin-left: auto
              const logoX = startX + qrSize - logoSize;
              const logoY = startY + qrSize + 12 * scaleFactor;

              // Apply grayscale and invert filter
              ctx.save();
              // ctx.filter = 'grayscale(1) invert(1)';
              ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
              ctx.restore();
            } catch (err) {
              console.error('Failed to load logo:', err);
            }
          }

          // Check if cancelled before drawing text
          if (signal.aborted) return;

          // Draw text fields
          const textX = startX + qrSize + imageTextGap;
          const textY = startY;
          const maxTextWidth = Math.min(
            LABEL_MAX_WIDTH * scaleFactor,
            width - qrSize - imageTextGap - cardPadding * 2
          );

          ctx.fillStyle = 'black';
          const fontSize = 24 * scaleFactor;
          ctx.font = `${fontSize}px Arial`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';

          let currentY = textY;
          const lineHeight = fontSize * 1.2;
          const textGap = lineHeight * 0.05;

          const fields = [
            item.firstField,
            item.secondField,
            item.thirdField,
            item.fourthField,
            item.fifthField,
          ];

          for (const field of fields) {
            if (!field.excluded && field.value) {
              const text = truncateText(ctx, field.value, maxTextWidth);
              ctx.fillText(text, textX, currentY);
              currentY += lineHeight + textGap;
            }
          }
        } catch (err) {
          console.error('Failed to draw label:', err);
        }
      },
      [
        LABEL_MAX_WIDTH,
        companyField,
        truncateText,
        scaleFactor,
      ]
    );

    useEffect(() => {
      const abortController = new AbortController();

      const drawLabels = async () => {
        if (!open) return;
        const logoImg = await loadImage(
          logo ? `${getURL()}${logo}` : AppIcon
        );
        for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
          if (abortController.signal.aborted) break;

          const canvas = documentRefs.current[pageIndex];
          if (!canvas) continue;

          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          // Clear canvas
          ctx.clearRect(0, 0, pageWidth, pageHeight);
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, pageWidth, pageHeight);

          // Get items for this page
          const pageItems = qrList.slice(
            pageIndex * itemCountPerPage,
            (pageIndex + 1) * itemCountPerPage
          );

          // Draw each label
          for (let idx = 0; idx < pageItems.length; idx++) {
            // Check if cancelled before each label
            if (abortController.signal.aborted) break;

            const item = pageItems[idx];
            const col = idx % cols;
            const row = Math.floor(idx / cols);

            // Position within content area
            const x = contentPadding + col * labelWidth;
            const y = contentPadding + row * labelHeight;

            await drawLabel(
              ctx,
              x,
              y,
              labelWidth,
              labelHeight,
              item,
              abortController.signal,
              logoImg
            );
          }
        }
      };

      startDrawing();

      drawLabels().then(() => {
        if (!abortController.signal.aborted) {
          finishDrawing();
        }
      });

      return () => {
        abortController.abort();
      };
    }, [
      qrList,
      pages,
      cols,
      contentPadding,
      documentRefs,
      drawLabel,
      itemCountPerPage,
      labelHeight,
      labelWidth,
      pageHeight,
      pageWidth,
      open,
      finishDrawing,
      startDrawing,
      loadImage,
      logo
    ]);

    return (
      <>
        {pages.map((_item, i) => (
          <canvas
            className={styles['paper-layout']}
            key={i}
            ref={(el) => {
              if (el) {
                documentRefs.current[i] = el;
              }
            }}
            width={pageWidth}
            height={pageHeight}
          />
        ))}
      </>
    );
  },
  (prev, next) => {
    const { documentRefs: _, ...restPrev } = prev;
    const { documentRefs: __, ...restNext } = next;
    return JSON.stringify(restPrev) === JSON.stringify(restNext);
  }
);

export default AveryView;

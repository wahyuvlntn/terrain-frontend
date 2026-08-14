import { ImagePlaceholder } from '@digital-twin/icons';
import AppIcon from '@digital-twin/images/app-icon.svg';
import { getURL } from '@digital-twin/utils';
import QRCode from 'qrcode';
import { memo, useCallback, useEffect } from 'react';

import styles from './continuous-view.module.scss';

interface ContinuousViewProps {
  isPreview: boolean;
  pages: number[];
  documentRefs: React.MutableRefObject<HTMLCanvasElement[]>;
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
  MINIMUM_WIDTH: number;
  MINIMUM_HEIGHT: number;
  open: boolean;
  companyField: boolean;
  logo: string | null | undefined;
  backgroundLowest: string;
  finishDrawing: () => void;
  startDrawing: () => void;
}

const MM_TO_INCH = 25.4;
const DPI = 300;

const ContinuousView = memo(
  ({
    isPreview,
    pages,
    documentRefs,
    width,
    height,
    qrList,
    open,
    itemCountPerPage,
    LABEL_MAX_WIDTH,
    MINIMUM_WIDTH,
    MINIMUM_HEIGHT,
    companyField,
    logo,
    backgroundLowest,
    finishDrawing,
    startDrawing,
  }: ContinuousViewProps) => {
    const scaleFactor = DPI / 300;

    // Adjusted width and height to inch and pixels
    const ADJUSTED_WIDTH =
      width < MINIMUM_WIDTH || isNaN(width)
        ? (MINIMUM_WIDTH / MM_TO_INCH) * DPI
        : (width / MM_TO_INCH) * DPI;

    const ADJUSTED_HEIGHT =
      width < MINIMUM_HEIGHT || isNaN(height)
        ? (MINIMUM_HEIGHT / MM_TO_INCH) * DPI
        : (height / MM_TO_INCH) * DPI;

    const ADJUSTED_FONT_SIZE =
      height > MINIMUM_HEIGHT
        ? (height / MINIMUM_HEIGHT) * 24 * scaleFactor
        : 24 * scaleFactor;

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
        logoImg: HTMLImageElement
      ) => {
        const imageWidth = width * 0.33;
        const textWidth = width * 0.67;

        // Gap between image and text
        const gap = width * 0.05;
        const qrSize = imageWidth;
        const logoSize = imageWidth * 0.3;

        try {
          const qrCanvas = document.createElement('canvas');
          await QRCode.toCanvas(qrCanvas, item.value, {
            width: qrSize,
            margin: 1,
            errorCorrectionLevel: 'M',
          });

          ctx.drawImage(qrCanvas, x, y, qrSize, qrSize);

          if (companyField) {
            try {
              const logoX = x + imageWidth - logoSize;
              const logoY = y + qrSize + 12 * scaleFactor;

              // Apply grayscale and invert filter
              ctx.save();
              // ctx.filter = 'grayscale(1) invert(1)';
              ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
              ctx.restore();
            } catch (err) {
              console.error('Failed to load logo:', err);
            }
          }

          // Draw text fields
          const textX = x + imageWidth + gap;
          const textY = y;
          const maxTextWidth = Math.min(
            LABEL_MAX_WIDTH * scaleFactor,
            textWidth - gap
          );

          ctx.fillStyle = 'black';
          ctx.font = `${ADJUSTED_FONT_SIZE}px Arial`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';

          let currentY = textY;
          const lineHeight = ADJUSTED_FONT_SIZE * 1.2;
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
        ADJUSTED_FONT_SIZE,
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
          ctx.clearRect(0, 0, ADJUSTED_WIDTH, ADJUSTED_HEIGHT);
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, ADJUSTED_WIDTH, ADJUSTED_HEIGHT);

          // Get items for this page
          const pageItems = qrList.slice(
            pageIndex * itemCountPerPage,
            (pageIndex + 1) * itemCountPerPage
          );

          // Content padding
          const contentPadding = ADJUSTED_WIDTH * 0.05;

          // Available width for label content
          const availableWidth = ADJUSTED_WIDTH - contentPadding * 2;
          const availableHeight = ADJUSTED_HEIGHT - contentPadding * 2;

          // Draw label
          if (pageItems.length > 0) {
            await drawLabel(
              ctx,
              contentPadding,
              contentPadding,
              availableWidth,
              availableHeight,
              pageItems[0],
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
      open,
      ADJUSTED_HEIGHT,
      ADJUSTED_WIDTH,
      documentRefs,
      drawLabel,
      itemCountPerPage,
      finishDrawing,
      startDrawing,
      loadImage,
      logo,
    ]);

    return (
      <>
        {pages.map((item, i) => (
          <canvas
            className={styles['paper-layout']}
            key={i}
            ref={(el) => {
              if (el) {
                documentRefs.current[i] = el;
              }
            }}
            width={ADJUSTED_WIDTH}
            height={ADJUSTED_HEIGHT}
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

export default ContinuousView;

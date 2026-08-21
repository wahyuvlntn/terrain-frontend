import { set } from 'date-fns';
import { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';
import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';

const ZOOM_LADDER = [
  0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.33, 1.5, 1.75, 2, 2.5, 3, 4, 5,
];
const MIN_ZOOM = ZOOM_LADDER[0];
const MAX_ZOOM = ZOOM_LADDER[ZOOM_LADDER.length - 1];

export type OutlineItem = {
  title: string;
  dest: string | any[] | null;
  items: OutlineItem[];
  page?: number;
};

const formatPercent = (val: number) => `${Math.round(val * 100)}%`;

export const usePdfViewer = (pdfUrl: string, pdfName: string) => {
  // --- State ---
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [showTableOfContents, setShowTableOfContents] = useState(false);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [displayScale, setDisplayScale] = useState('100%');

  const containerRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);

  const updateScale = useCallback((newScale: number) => {
    const clamped = Math.min(Math.max(newScale, MIN_ZOOM), MAX_ZOOM);
    setScale(clamped);
  }, []);

  // --- Effects ---
  useEffect(() => {
    setPdfDoc(null);
    setOutline([]);
    setPage(1);
    setShowTableOfContents(false);
    setScale(1);
    setDisplayScale('100%');
  }, [pdfUrl]);

  useEffect(() => {
    if (!pdfDoc) return;

    const updateOutline = async () => {
      const rawOutline = await pdfDoc.getOutline();
      const outlineWithPages = (items: any[]): Promise<OutlineItem[]> => {
        return Promise.all(
          items.map(async (item) => {
            const outlineItem: OutlineItem = {
              title: item.title,
              dest: item.dest,
              items: await outlineWithPages(item.items || []),
            };
            if (item.dest) {
              const destination =
                typeof item.dest === 'string' ? await pdfDoc.getDestination(item.dest) : item.dest;
              const pageIndex = destination ? await pdfDoc.getPageIndex(destination[0]) : undefined;
              if (pageIndex !== undefined) {
                outlineItem.page = pageIndex + 1;
              }
            }
            return outlineItem;
          })
        );
      };

      const processedOutline = await outlineWithPages(rawOutline);
      setOutline(processedOutline);
    };

    updateOutline();
  }, [pdfDoc]);

  // Sync display string when numerical scale changes (e.g. from buttons or fit-to-width)
  useEffect(() => {
    setDisplayScale(formatPercent(scale));
  }, [scale]);

  useEffect(() => {
    if (!isProgrammaticScroll.current) return;

    const targetPage = containerRef.current?.querySelector(`[data-page-number="${page}"]`);
    if (targetPage) {
      targetPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [page]);

  // --- Event Handlers ---
  const handleZoomIn = () => {
    const nextZoom = ZOOM_LADDER.find((z) => z > scale) ?? MAX_ZOOM;
    updateScale(nextZoom);
  };

  const handleZoomOut = () => {
    const prevZoom = [...ZOOM_LADDER].reverse().find((z) => z < scale) ?? MIN_ZOOM;
    updateScale(prevZoom);
  };

  const handleZoom = () => {
    const zoomStr = displayScale.replace(/%$/, '');
    const result = z.coerce.number().safeParse(zoomStr);

    if (result.success) {
      updateScale(result.data / 100);
    } else {
      // Revert to current scale if input is invalid
      setDisplayScale(formatPercent(scale));
    }
  };

  const handleNavigateContent = (page: number) => {
    isProgrammaticScroll.current = true;
    setPage(page);
  };

  const handleFitToWidth = () => {
    const firstPage = containerRef.current?.querySelector('.react-pdf__Page');
    if (!containerRef.current || !firstPage) return;

    const containerWidth = containerRef.current.clientWidth - 32;
    const pageWidth = firstPage.getBoundingClientRect().width / scale;
    updateScale(containerWidth / pageWidth);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = pdfName;
      link.click();

      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error('Download failed', e);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !pdfDoc) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isProgrammaticScroll.current) return;

        const mostVisible = entries.reduce((prev, current) => {
          return current.intersectionRatio > prev.intersectionRatio ? current : prev;
        });

        if (mostVisible.intersectionRatio > 0) {
          const pageNode = mostVisible.target as HTMLElement;
          const pageNumber = Number(pageNode.dataset.pageNumber);

          if (pageNumber && !Number.isNaN(pageNumber)) {
            setPage(pageNumber);
          }
        }
      },
      {
        root: container,
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1], // Trigger when 50% of the page is visible
      }
    );

    const pages = container.querySelectorAll('.react-pdf__Page');
    pages.forEach((p) => observer.observe(p));

    return () => observer.disconnect();
  }, [pdfDoc, scale]);

  return {
    // UI State
    pdfDoc,
    setPdfDoc,
    outline,
    hasOutline: outline.length > 0,
    showTableOfContents,
    page,
    scale,
    displayScale,
    containerRef,

    // Layout Actions
    handleShowTableOfContents: () => setShowTableOfContents(true),
    handleHideTableOfContents: () => setShowTableOfContents(false),
    handleFitToWidth,
    handleUserInteraction: () => {
      isProgrammaticScroll.current = false;
    },

    // Navigation Actions
    handlePageInputChange: (newPage: number) => {
      isProgrammaticScroll.current = true;
      setPage(newPage);
    },
    handleNavigateContent: handleNavigateContent,
    handleDownload,

    // Zoom Actions
    handleZoomIn,
    handleZoomOut,
    isZoomInDisabled: scale >= MAX_ZOOM,
    isZoomOutDisabled: scale <= MIN_ZOOM,
    handleZoomChange: (e: React.ChangeEvent<HTMLInputElement>) => setDisplayScale(e.target.value),
    handleBlur: handleZoom,
    handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleZoom(),
  };
};

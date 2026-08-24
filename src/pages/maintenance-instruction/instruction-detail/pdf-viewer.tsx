// import './pdf-viewer.css';
// import 'react-pdf/dist/Page/AnnotationLayer.css';
// import 'react-pdf/dist/Page/TextLayer.css';

// import { TreeItem, TreeItemContentProps, TreeItemProps, useTreeItem } from '@mui/x-tree-view';
// import { TreeView } from '@mui/x-tree-view/TreeView';
// import { Button, AppPaginationCore } from '@digital-twin/components';
// import {
//   ChevronDownFill,
//   ChevronRightFill,
//   Close,
//   Download2,
//   Fullscreen,
//   List,
//   Minimize,
//   Plus,
// } from '@digital-twin/icons';
// import { clsx } from 'clsx';
// import React, { useMemo } from 'react';
// import { Document, Page, pdfjs } from 'react-pdf';

// import { OutlineItem, usePdfViewer } from './pdf-viewer.hook';
// import styles from './pdf-viewer.module.scss';

// pdfjs.GlobalWorkerOptions.workerSrc = new URL(
//   'pdfjs-dist/build/pdf.worker.min.mjs',
//   import.meta.url
// ).toString();

// type PdfViewerProps = {
//   pdfUrl: string;
//   pdfName: string;
// };

// export const PdfViewer = ({ pdfUrl, pdfName }: PdfViewerProps) => {
//   const {
//     handleUserInteraction,
//     handleZoomChange,
//     handleDownload,
//     handleHideTableOfContents,
//     handleShowTableOfContents,
//     handleNavigateContent,
//     showTableOfContents,
//     handleZoomOut,
//     isZoomOutDisabled,
//     isZoomInDisabled,
//     handlePageInputChange,
//     page,
//     handleZoomIn,
//     handleFitToWidth,
//     pdfDoc,
//     setPdfDoc,
//     handleBlur,
//     outline,
//     hasOutline,
//     handleKeyDown,
//     displayScale,
//     scale,
//     containerRef,
//   } = usePdfViewer(pdfUrl, pdfName);

//   return (
//     <div className={styles.PdfViewer}>
//       <div className={styles.PdfViewer__Header}>
//         <div className={styles.PdfViewer__Name}>
//           {hasOutline ? (
//             <Button onClick={handleShowTableOfContents} className={styles.IconBtn}>
//               <List />
//             </Button>
//           ) : null}
//           <span className={styles.PdfViewer__NameLabel}>{pdfName}</span>
//         </div>
//         <div className={styles.PdfViewer__PaginationZoomContainer}>
//           <AppPaginationCore
//             page={page}
//             max={pdfDoc?.numPages ?? 1}
//             onChange={handlePageInputChange}
//             separator={'/'}
//           />
//           <div className={styles.PdfViewer__Zoom}>
//             <Button onClick={handleZoomOut} disabled={isZoomOutDisabled}>
//               <Minimize />
//             </Button>
//             <input
//               type={'string'}
//               value={displayScale}
//               onChange={handleZoomChange}
//               onBlur={handleBlur}
//               onKeyDown={handleKeyDown}
//             />
//             <Button onClick={handleZoomIn} disabled={isZoomInDisabled}>
//               <Plus />
//             </Button>
//           </div>
//         </div>
//         <div className={styles.PdfViewer__DownloadFitScreenContainer}>
//           <Button onClick={handleDownload} className={styles.IconBtn}>
//             <Download2 />
//           </Button>
//           <Button onClick={handleFitToWidth} className={styles.IconBtn}>
//             <Fullscreen />
//           </Button>
//         </div>
//       </div>
//       <div className={styles.PdfViewer__Body}>
//         <div
//           ref={containerRef}
//           className={styles.PdfViewer__Document}
//           onWheel={handleUserInteraction} // Mouse wheel / Trackpad
//           onTouchStart={handleUserInteraction} // Mobile touch
//           onMouseDown={handleUserInteraction} // Manual scrollbar click/drag
//         >
//           <Document key={pdfUrl} file={pdfUrl} onLoadSuccess={setPdfDoc} scale={scale}>
//             {Array.from(new Array(pdfDoc?.numPages ?? 0), (_el, index) => (
//               <Page
//                 key={index + 1}
//                 pageNumber={index + 1}
//                 renderAnnotationLayer={false}
//                 renderTextLayer={false}
//               />
//             ))}
//           </Document>
//         </div>

//         {showTableOfContents ? (
//           <TableOfContents
//             outline={outline}
//             onClose={handleHideTableOfContents}
//             onNavigateContent={handleNavigateContent}
//             className={styles.PdfViewer__TableOfContents}
//             page={page}
//           />
//         ) : null}
//       </div>
//     </div>
//   );
// };

// type TableOfContentsProps = {
//   outline: OutlineItem[];
//   onNavigateContent: (page: number) => void;
//   onClose: () => void;
//   className?: string;
//   page?: number;
// };

// const TableOfContents = ({
//   onNavigateContent,
//   outline,
//   onClose,
//   className,
//   page,
// }: TableOfContentsProps) => {
//   const renderTree = (outline: OutlineItem[]) => {
//     return outline.map((content) => {
//       return (
//         <CustomTreeItem
//           key={content.title}
//           nodeId={content.title}
//           label={content.title}
//           onNavigate={() => {
//             if (content.page) {
//               onNavigateContent(content.page);
//             }
//           }}
//         >
//           {renderTree(content.items)}
//         </CustomTreeItem>
//       );
//     });
//   };

//   const selected = useMemo(() => {
//     const findSelectedNodeId = (outline: OutlineItem[], page?: number): string | null => {
//       for (const item of outline) {
//         if (item.page === page) {
//           return item.title;
//         }
//         const found = findSelectedNodeId(item.items, page);
//         if (found) {
//           return found;
//         }
//       }
//       return null;
//     };

//     return findSelectedNodeId(outline, page);
//   }, [outline, page]);

//   return (
//     <div className={clsx(styles.TableOfContents, className)}>
//       <div className={styles.TableOfContents__Header}>
//         <span>Table of Contents</span>
//         <Button onClick={onClose} className={styles.IconBtn}>
//           <Close />
//         </Button>
//       </div>
//       <TreeView
//         defaultCollapseIcon={<ChevronDownFill />}
//         defaultExpandIcon={<ChevronRightFill />}
//         selected={selected}
//         className={styles.TableOfContents__Tree}
//       >
//         {renderTree(outline)}
//       </TreeView>
//     </div>
//   );
// };

// interface CustomContentProps extends TreeItemContentProps {
//   onNavigate?: () => void;
// }

// const CustomTreeItem = React.forwardRef(function CustomTreeItem(
//   props: TreeItemProps & {
//     onNavigate: () => void;
//   },
//   ref: React.Ref<HTMLLIElement>
// ) {
//   const { onNavigate, ...otherProps } = props;

//   return (
//     <TreeItem
//       ContentComponent={CustomContent as React.JSXElementConstructor<TreeItemContentProps>}
//       ContentProps={
//         {
//           onNavigate: onNavigate,
//         } as CustomContentProps
//       }
//       {...otherProps}
//       ref={ref}
//     />
//   );
// });

// const CustomContent = React.forwardRef(function CustomContent(props: CustomContentProps, ref) {
//   const {
//     classes,
//     className,
//     label,
//     nodeId,
//     icon: iconProp,
//     expansionIcon,
//     displayIcon,
//     onNavigate,
//   } = props;

//   const { disabled, expanded, selected, focused, handleExpansion, preventSelection } =
//     useTreeItem(nodeId);

//   const icon = iconProp || expansionIcon || displayIcon;

//   const handleMouseDown = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
//     preventSelection(event);
//   };

//   const handleExpansionClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
//     handleExpansion(event);
//   };

//   const handleSelectionClick = () => {
//     onNavigate?.();
//   };

//   return (
//     // eslint-disable-next-line jsx-a11y/no-static-element-interactions
//     <div
//       className={clsx(
//         className,
//         classes.root,
//         {
//           [classes.expanded]: expanded,
//           [classes.selected]: selected,
//           [styles.Selected]: selected,
//           [classes.focused]: focused,
//           [classes.disabled]: disabled,
//         },
//         styles.CustomContent
//       )}
//       onMouseDown={handleMouseDown}
//       ref={ref as React.Ref<HTMLDivElement>}
//     >
//       {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */}
//       <div onClick={handleExpansionClick} className={classes.iconContainer}>
//         {icon}
//       </div>
//       <div
//         onClick={handleSelectionClick}
//         className={clsx(classes.label, styles.CustomContent__Label)}
//         title={typeof label === 'string' ? label : undefined}
//       >
//         {label}
//       </div>
//     </div>
//   );
// });

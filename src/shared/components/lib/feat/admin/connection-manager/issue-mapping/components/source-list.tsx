/* eslint-disable simple-import-sort/imports */
import { Button, Container, FileInputPopup, Pagination, Search, useToggle } from '@digital-twin/components';
import { AlertAlarm, ImportNotes, UploadFile } from '@digital-twin/icons';
import { useVerticalLimit } from '@digital-twin/utils';
import { toast } from '@digital-twin/reusables';
import { motion, useAnimationControls } from 'framer-motion';
import { parse, unparse } from 'papaparse';
import { ReactNode, useContext, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import {
  useAddAlarm,
  useGetAlarm,
  useGetParameter,
  useIssueMappingParams,
  useSearchAndPaginate,
} from '../hooks';
import { MappingCtx } from '../issue-mapping';
import { alarmSchema, alarmType, parameterType } from '../schemas';
import styles from './source-list.module.scss';

// Node for drag alarm/parameter
type NodeProps = {
  children: ReactNode;
  type: string;
  data: string;
  disabled: boolean;
};
const Node = ({ children, data, type, disabled }: NodeProps) => {
  // state for rendering draggable item
  const ref = useRef<HTMLDivElement>(null);
  const [initialPos, setInitialPos] = useState<DOMRect>();
  useLayoutEffect(() => {
    setInitialPos(ref?.current?.getBoundingClientRect());
  }, []);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  // drag handler
  const onDrag = (e: React.DragEvent) => {
    if (e.clientX === 0 && e.clientY === 0) return;
    setCursorPos({ x: e.clientX, y: e.clientY });
  };
  const onDragEnd = async () => {
    setDragging(false);
    await controls.start({
      opacity: 0,
      scale: 0,
      transition: {
        duration: 0.15,
        ease: 'easeInOut',
      },
    });
  };
  const onDragStart = async (event: React.DragEvent) => {
    event.dataTransfer.setDragImage(new Image(), 0, 0);
    event.dataTransfer.setData(type, data);
    event.stopPropagation();
    // show overlay
    setDragging(true);
    setOffset({
      x: event.nativeEvent.offsetX,
      y: event.nativeEvent.offsetY,
    });
    // animation stuff
    controls.set({
      opacity: 0,
      scale: 0,
      transition: {
        duration: 0,
      },
    });
    await controls.start(
      {
        opacity: 1,
        scale: 1,
      },
      {
        duration: 0.15,
      }
    );
  };

  // overlay component
  const controls = useAnimationControls();
  const overlay = dragging
    ? createPortal(
        <motion.div
          initial={{
            position: 'absolute',
            zIndex: 1000,
          }}
          style={{
            top: initialPos?.top + 'px',
            left: initialPos?.left + 'px',
            minWidth: '320px',
            height: initialPos?.height + 'px',
            x: cursorPos.x - offset.x - (initialPos?.x || 0),
            y: cursorPos.y - offset.y - (initialPos?.y || 0),
            willChange: 'transform',
            pointerEvents: 'none',
            opacity: 0.7,
          }}
        >
          <div>{children}</div>
        </motion.div>,
        document.body
      )
    : undefined;

  const onPointerDown = (e: React.MouseEvent) => {
    setCursorPos({ x: e.clientX, y: e.clientY });
  };

  const component = dragging ? children : children; // consider remove children when drag
  return (
    <div
      draggable={!disabled}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDrag={onDrag}
      onPointerDown={onPointerDown}
      ref={ref}
      style={disabled ? { opacity: '0.5' } : { cursor: 'pointer' }}
    >
      {component}
      {overlay}
    </div>
  );
};

const Alarm = ({ alarm, disabled }: { alarm: alarmType; disabled: boolean }) => {
  return (
    <Node data={JSON.stringify(alarm)} type="alarm" disabled={disabled}>
      <div className={styles['item']}>
        <span className={styles['warning']}>!</span>
        <span>{alarm.code}</span>
        <span>-</span>
        <span>{alarm.name}</span>
      </div>
    </Node>
  );
};

const Parameter = ({ parameter, disabled }: { parameter: parameterType; disabled: boolean }) => {
  return (
    <Node data={JSON.stringify(parameter)} type="parameter" disabled={disabled}>
      <div className={styles['item']}>
        <span>{parameter.name}</span>
      </div>
    </Node>
  );
};
export const SourceList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showImportAlarm, toggleShowImportAlarm] = useToggle(false);
  const { data: alarmList } = useGetAlarm();
  const { data: parameterList } = useGetParameter();
  const {
    alarmSearch,
    changeSearchAlarm,
    alarmPage,
    parameterSearch,
    changeSearchParameter,
    parameterPage,
  } = useIssueMappingParams();

  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const limit = useVerticalLimit({
    container,
    itemHeight: 40,
    itemGap: 4,
  });
  const { paginatedData: paginatedAlarm } = useSearchAndPaginate(
    alarmList || [],
    alarmSearch,
    ['code', 'name'],
    limit || 12,
    alarmPage
  );

  const { paginatedData: paginatedParameter } = useSearchAndPaginate(
    parameterList || [],
    parameterSearch,
    ['name'],
    limit || 12,
    parameterPage
  );

  // handle import
  const [fileImport, setFileImport] = useState<File | undefined>(undefined);
  const [isPendingFile, setIsPendingFile] = useState(false);
  const [parsedData, setParsedData] = useState<alarmType[]>([]);
  const { onSubmit } = useAddAlarm();
  const mappingCtx = useContext(MappingCtx);
  if (!mappingCtx) {
    return;
  }
  const { source, target } = mappingCtx;
  return (
    <Container
      title="Source List"
      icon={<AlertAlarm />}
      className={styles['source-list']}
      background={'none'}
    >
      <Container title="Alarm Master Data" background="none" className={styles['container']}>
        <div className={styles['source']}>
          <div className={styles['header']}>
            <Search
              width="100%"
              placeholder="Search..."
              value={alarmSearch}
              onChange={changeSearchAlarm}
            />
            <Button
              icon={<UploadFile />}
              onClick={(e) => {
                e.stopPropagation();
                toggleShowImportAlarm();
              }}
            >
              Import
            </Button>

            {showImportAlarm && (
              <FileInputPopup
                title="Import Relation List"
                supportedFileTypes={['.csv']}
                onClose={toggleShowImportAlarm}
                open={showImportAlarm}
                onChange={(f) => {
                  setFileImport(f);
                  parse(f, {
                    worker: true,
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                      if (results.errors.length > 0) {
                        toast.error(`Error parsing CSV: ${results.errors[0].message}`);
                        setIsPendingFile(true);
                        return;
                      }
                      // parse data
                      const parsedImport = alarmSchema.array().safeParse(results.data);
                      if (parsedImport.success) {
                        setIsPendingFile(false);
                        setParsedData(parsedImport.data);
                      } else {
                        toast.error(`Error parsing rows: ${parsedImport.error.message}`);
                        setIsPendingFile(true);
                      }
                    },
                  });
                }}
                onDownloadTemplate={() => {
                  const template = [{ code: 1, name: 'alarm-name' }];
                  const csvTemplate = unparse(template);
                  const blob = new Blob([csvTemplate], {
                    type: 'text/csv;charset=utf-8;',
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'alarm.csv';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                icon={<ImportNotes />}
                isPending={isPendingFile}
                acceptMimeTypes={['text/csv']}
                uploadButtonLabel="Import"
                value={fileImport}
                onSubmit={() => {
                  toggleShowImportAlarm();
                  if (parsedData.length > 0) {
                    onSubmit(parsedData);
                  }
                }}
              ></FileInputPopup>
            )}
          </div>
          <div className={styles['list']} ref={setContainer}>
            {paginatedAlarm.map((alarm) => (
              <Alarm
                alarm={alarm}
                disabled={
                  source?.some((sc) => sc.type === 'alarm' && sc.meta.code === alarm.code) ||
                  target?.some((tg) => tg.code === alarm.code) ||
                  false
                }
              />
            ))}
          </div>
          <div className={styles['pagination']}>
            <Pagination
              count={15}
              limit={7}
              searchParamsPrefix="alarm_"
              searchParams={searchParams}
              setSearchParams={setSearchParams}
            />
          </div>
        </div>
      </Container>
      <Container title="Parameter" background="none" className={styles['container']}>
        <div className={styles['source']}>
          <div className={styles['header']}>
            <Search
              width="100%"
              placeholder="Search..."
              value={parameterSearch}
              onChange={changeSearchParameter}
            />
          </div>
          <div className={styles['list']}>
            {paginatedParameter.map((parameter) => (
              <Parameter
                parameter={parameter}
                disabled={
                  source?.some(
                    (sc) => sc.type === 'parameter' && sc.meta.name === parameter.name
                  ) || false
                }
              />
            ))}
          </div>
          <div className={styles['pagination']}>
            <Pagination
              count={15}
              limit={7}
              searchParamsPrefix="parameter_"
              searchParams={searchParams}
              setSearchParams={setSearchParams}
            />
          </div>
        </div>
      </Container>
    </Container>
  );
};

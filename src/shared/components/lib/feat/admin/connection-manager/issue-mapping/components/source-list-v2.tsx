/* eslint-disable simple-import-sort/imports */
import {
  Button,
  COLOR,
  Container,
  FileInputPopup,
  Loading,
  Pagination,
  Search,
  useToggle,
} from '@digital-twin/components';
import { AlertAlarm, ImportNotes, UploadFile } from '@digital-twin/icons';
// import { useVerticalLimit } from '@digital-twin/utils';
import { toast } from '@digital-twin/reusables';
import { parse, unparse } from 'papaparse';
import { useContext, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAddAlarm, useGetAlarm, useGetParameter, useIssueMappingParams } from '../hooks';

import { MappingCtx } from '../issue-mapping';
import { alarmSchema, alarmType, parameterType } from '../schemas';
import { WrapperNode } from './node';
import styles from './source-list-v2.module.scss';

const Alarm = ({ alarm }: { alarm: alarmType }) => {
  return (
    <WrapperNode data={JSON.stringify(alarm)} type="alarm">
      <div className={styles['item']} style={{ backgroundColor: COLOR.backgroundHighest }}>
        <span className={styles['warning']}>!</span>
        <span
          style={{
            display: 'inline',
            lineHeight: 1.5,
            width: 0,
            flexGrow: 1,
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >{`${alarm.code}-${alarm.name}`}</span>
      </div>
    </WrapperNode>
  );
};

const Parameter = ({ parameter }: { parameter: parameterType }) => {
  return (
    <WrapperNode data={JSON.stringify(parameter)} type="parameter">
      <div className={styles['item']} style={{ backgroundColor: COLOR.backgroundHighest }}>
        <span>{parameter.name}</span>
      </div>
    </WrapperNode>
  );
};
export const SourceListV2 = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showImportAlarm, toggleShowImportAlarm] = useToggle(false);
  const {
    alarmSearch,
    changeSearchAlarm,
    alarmPage,
    parameterSearch,
    changeSearchParameter,
    parameterPage,
    selectedModel,
  } = useIssueMappingParams();
  // const [container, setContainer] = useState<HTMLDivElement | null>(null);
  // const limit = useVerticalLimit({
  //   container,
  //   itemHeight: 40,
  //   itemGap: 4,
  // });

  const {
    data: alarmList,
    count: alarmCount,
    isLoading: isAlarmListLoading,
  } = useGetAlarm({
    search: alarmSearch,
    page: alarmPage,
    limit: 5,
  });
  const {
    data: parameterList,
    count: parameterCount,
    isLoading: isParameterListLoading,
  } = useGetParameter({
    model_id: selectedModel,
    search: parameterSearch,
    page: parameterPage,
    limit: 5,
  });

  // handle import
  const [fileImport, setFileImport] = useState<File | undefined>(undefined);
  const [isPendingFile, setIsPendingFile] = useState(false);
  const [parsedData, setParsedData] = useState<alarmType[]>([]);
  const { onSubmit } = useAddAlarm();
  const mappingCtx = useContext(MappingCtx);
  if (!mappingCtx) {
    return;
  }
  return (
    <Container
      title="Source List"
      icon={<AlertAlarm />}
      className={styles['source-list']}
      background={'none'}
    >
      <Container title="Alarm Master Data" background="none" className={styles['container']}>
        <Loading isLoading={isAlarmListLoading} />
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
          <div className={styles['list']}>
            {alarmList?.map((alarm) => (
              <Alarm alarm={alarm} key={alarm.code} />
            ))}
          </div>
          <div className={styles['pagination']}>
            <Pagination
              count={alarmCount}
              limit={5}
              searchParamsPrefix="alarm_"
              searchParams={searchParams}
              setSearchParams={setSearchParams}
            />
          </div>
        </div>
      </Container>
      <Container title="Parameter" background="none" className={styles['container']}>
        <Loading isLoading={isParameterListLoading} />
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
            {parameterList?.map((parameter) => (
              <Parameter parameter={parameter} key={parameter.name} />
            ))}
          </div>
          <div className={styles['pagination']}>
            <Pagination
              count={parameterCount}
              limit={5}
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

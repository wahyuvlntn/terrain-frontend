/* eslint-disable simple-import-sort/imports */
import {
  Button,
  Container,
  Drawer,
  Dropdown,
  FileInputPopup,
  Input,
  Pagination,
  Search,
  useToggle,
} from '@digital-twin/components';
import { ImportNotes, Plus, UploadFile, WindowList } from '@digital-twin/icons';
import { useVerticalLimit } from '@digital-twin/utils';
import { toast } from '@digital-twin/reusables';
import clsx from 'clsx';
import { parse, unparse } from 'papaparse';
import { useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useAddBulkRelationMapping,
  useAddRelation,
  useGetMapping,
  useGetModel,
  useGetRelation,
  useIssueMappingParams,
  useSearchAndPaginate,
} from '../hooks';
import { MappingCtx } from '../issue-mapping';
import { issueRelationType, relationMappingSchema, relationMappingType } from '../schemas';
import styles from './relation-list.module.scss';

const List = ({
  selectedRelation,
  changeSelectedRelation,
  relation,
}: {
  selectedRelation: string | undefined;
  changeSelectedRelation: (value?: string) => void;
  relation: issueRelationType;
}) => {
  return (
    <div
      className={clsx(styles['relation'], selectedRelation == relation.id && styles['selected'])}
      onClick={() => changeSelectedRelation(relation.id)}
    >
      <span className={styles['name']}>{relation.name}</span>
      <div className={styles['model']}>
        <span>Model:</span>
        <span>{relation.model_name}</span>
      </div>
    </div>
  );
};

export const RelationList = () => {
  const {
    selectedModel,
    changeSelectedModel,
    relationSearch,
    changeSearchRelation,
    selectedRelation,
    changeSelectedRelation,
    relationPage,
    navigatePageRelation,
  } = useIssueMappingParams();
  const [showAddDrawer, toggleShowAddDrawer] = useToggle(false);
  const [showImportRelation, toggleShowImportRelation] = useToggle(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: models } = useGetModel();
  useEffect(() => {
    if (models && models.length > 0) {
      changeSelectedModel(models[0].id);
    }
  }, [models]);
  useEffect(() => {
    // reset selected and page
    changeSelectedRelation();
    navigatePageRelation();
  }, [selectedModel]);
  const { data: relation } = useGetRelation(selectedModel);
  useEffect(() => {
    if (relation && relation.length > 0 && relationSearch == '') {
      changeSelectedRelation(relation[0].id);
      if (mappingCtx) {
        mappingCtx.setRelation(relation[0].name);
      }
    }
  }, [relation]);

  // Page the filtered list
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const limit = useVerticalLimit({
    container,
    itemHeight: 78,
    itemGap: 8,
  });
  const { paginatedData } = useSearchAndPaginate(
    relation?.map((relation) => ({
      ...relation,
      model_name: models?.find((model) => model.id === relation.model_id.toString())?.name || '',
    })) || [],
    relationSearch,
    ['name'],
    limit || 7,
    relationPage
  );
  const { data: currentMapping } = useGetMapping(selectedRelation);

  const mappingCtx = useContext(MappingCtx);
  useEffect(() => {
    if (mappingCtx && currentMapping) {
      const { setSource, setTarget, setDefaultSource, setDefaultTarget } = mappingCtx;
      setSource(currentMapping.source);
      setTarget(currentMapping.target);
      setDefaultSource(currentMapping.source);
      setDefaultTarget(currentMapping.target);
    }
  }, [currentMapping]);

  const { control, setValue, reset, onSubmit } = useAddRelation();
  useEffect(() => {
    if (selectedModel) setValue('model_id', Number(selectedModel));
  }, [selectedModel]);

  // handle import
  const [fileImport, setFileImport] = useState<File | undefined>(undefined);
  const [isPendingFile, setIsPendingFile] = useState(false);
  const [parsedData, setParsedData] = useState<relationMappingType[]>([]);
  const { onSubmit: onSubmitBulk } = useAddBulkRelationMapping();

  return (
    <Container
      title="Relation List"
      className={styles['relation-list']}
      icon={<WindowList />}
      background="none"
    >
      <div className={styles['content']}>
        <div className={styles['header']}>
          <Dropdown
            options={models?.map((model) => ({
              label: model.name,
              value: model.id,
            }))}
            value={selectedModel}
            onChange={(v) => changeSelectedModel(v)}
          />
          <div className={styles['search']}>
            <Search
              width="100%"
              placeholder="Search..."
              value={relationSearch}
              onChange={changeSearchRelation}
            />
            <Button
              icon={<Plus />}
              onClick={(e) => {
                e.stopPropagation();
                toggleShowAddDrawer();
              }}
            >
              Add
            </Button>
            <Button
              icon={<UploadFile />}
              onClick={(e) => {
                e.stopPropagation();
                toggleShowImportRelation();
              }}
            >
              Import
            </Button>

            {showImportRelation && (
              <FileInputPopup
                title="Import Relation List"
                supportedFileTypes={['.csv']}
                onClose={toggleShowImportRelation}
                open={showImportRelation}
                onChange={(f) => {
                  setFileImport(f);
                  parse(f, {
                    worker: true,
                    header: true,
                    delimiter: ';',
                    skipEmptyLines: true,
                    complete: (results) => {
                      if (results.errors.length > 0) {
                        toast.error(`Error parsing CSV: ${results.errors[0].message}`);
                        setIsPendingFile(true);
                        return;
                      }
                      const parsedImport = relationMappingSchema.array().safeParse(results.data);
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
                icon={<ImportNotes />}
                isPending={isPendingFile}
                acceptMimeTypes={['text/csv']}
                uploadButtonLabel="Import"
                value={fileImport}
                onDownloadTemplate={() => {
                  const template = [
                    {
                      name: 'Relation Name',
                      source_alarm_code: '1,2',
                      source_parameter: 'Parameter 1,Parameter 2',
                      target_alarm_code: '3,4',
                    },
                  ];
                  const csvTemplate = unparse(template, { delimiter: ';' });
                  const blob = new Blob([csvTemplate], {
                    type: 'text/csv;charset=utf-8;',
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'relation.csv';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                onSubmit={() => {
                  toggleShowImportRelation();
                  if (parsedData.length > 0) {
                    onSubmitBulk(parsedData);
                  }
                }}
              ></FileInputPopup>
            )}
          </div>
        </div>
        <div className={styles['list']} ref={setContainer}>
          {paginatedData.map((relation) => (
            <List
              {...{
                selectedRelation,
                changeSelectedRelation: (v) => {
                  changeSelectedRelation(v);
                  if (mappingCtx) {
                    mappingCtx.setRelation(relation.name);
                  }
                },
                relation,
              }}
              key={relation.id}
            />
          ))}
        </div>
        <div className={styles['pagination']}>
          <Pagination
            count={relation?.length || 0}
            limit={limit || 7}
            searchParamsPrefix="relation_"
            searchParams={searchParams}
            setSearchParams={setSearchParams}
          />
        </div>
        {showAddDrawer && (
          <Drawer
            icon={<WindowList />}
            title="Add Relation"
            variant="add"
            open={showAddDrawer}
            onClose={() => {
              reset();
              toggleShowAddDrawer();
            }}
            onSubmit={() => {
              onSubmit();
              toggleShowAddDrawer();
            }}
          >
            <div className={styles['add']}>
              <Input
                label={'Model' + ':'}
                readOnly
                value={models?.find((model) => model.id === selectedModel)?.name || ''}
                inputProps={{ required: true }}
                background={'dark'}
              />
              <Input
                label={'Name' + ':'}
                control={control}
                registered="name"
                inputProps={{ required: true }}
                background={'dark'}
              />
            </div>
          </Drawer>
        )}
      </div>
    </Container>
  );
};

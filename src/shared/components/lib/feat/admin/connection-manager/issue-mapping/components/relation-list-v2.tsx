/* eslint-disable simple-import-sort/imports */
import {
  Button,
  Container,
  Drawer,
  Dropdown,
  Input,
  Loading,
  Pagination,
  Popup,
  PopupDelete,
  Search,
  useToggle,
} from '@digital-twin/components';
import { Duplicate, Plus, SaveFill, TrashDelete, WindowList } from '@digital-twin/icons';
import { useVerticalLimit } from '@digital-twin/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { deleteRelation, duplicateFromModel } from '../api/issue-mapping';
import {
  useAddRelation,
  useGetMapping,
  useGetModel,
  useGetRelation,
  useIssueMappingParams,
} from '../hooks';
import { MappingCtx } from '../issue-mapping';
import styles from './relation-list.module.scss';

type RelationItem = { id: string; name: string; model_name: string };

const List = ({
  selectedRelation,
  changeSelectedRelation,
  relation,
  onDeleteClick,
}: {
  selectedRelation: string | undefined;
  changeSelectedRelation: (value?: string) => void;
  relation: RelationItem;
  onDeleteClick: (relation: RelationItem) => void;
}) => {
  const isSelected = selectedRelation == relation.id;
  return (
    <div
      className={clsx(styles['relation'], isSelected && styles['selected'])}
      onClick={() => changeSelectedRelation(relation.id)}
    >
      <div className={styles['relation-content']}>
        <div className={styles['relation-info']}>
          <span className={styles['name']}>{relation.name}</span>
          <div className={styles['model']}>
            <span>Model:</span>
            <span>{relation.model_name}</span>
          </div>
        </div>
        {isSelected && (
          <div
            className={styles['delete-icon']}
            onClick={(e) => {
              e.stopPropagation();
              onDeleteClick(relation);
            }}
          >
            <TrashDelete width={24} height={24} />
          </div>
        )}
      </div>
    </div>
  );
};

export const RelationListV2 = () => {
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
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: models } = useGetModel();
  useEffect(() => {
    if (models && models.length > 0 && !selectedModel) {
      changeSelectedModel(models[0].id);
    }
  }, [models]);
  useEffect(() => {
    // reset selected and page
    changeSelectedRelation();
    navigatePageRelation();
  }, [selectedModel]);
  // Page the filtered list
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const limit = useVerticalLimit({
    container,
    itemHeight: 78,
    itemGap: 8,
  });
  const {
    data: relation,
    count: relationCount,
    isLoading,
  } = useGetRelation({
    model_id: selectedModel,
    search: relationSearch,
    page: relationPage,
    limit: limit || 7,
  });
  useEffect(() => {
    if (relation && relation.length > 0 && relationSearch == '') {
      changeSelectedRelation(relation[0].id);
      if (mappingCtx) {
        mappingCtx.setRelation(relation[0].name);
      }
    }
  }, [relation]);
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

  const { control, setValue, onSubmit } = useAddRelation({
    onSuccess: () => toggleShowAddDrawer(),
  });
  useEffect(() => {
    if (selectedModel) setValue('model_id', Number(selectedModel));
  }, [selectedModel]);

  // Delete relation
  const [relationToDelete, setRelationToDelete] = useState<RelationItem | null>(null);
  const queryClient = useQueryClient();
  const { mutate: deleteRelationMutation } = useMutation({
    mutationFn: (relationId: number) => deleteRelation({ relation_id: relationId }),
    onSuccess: () => {
      setRelationToDelete(null);
      queryClient.invalidateQueries({
        queryKey: ['issueMappingRelation'],
      });
      // Clear selection if deleted relation was selected
      if (relationToDelete && selectedRelation === relationToDelete.id) {
        changeSelectedRelation();
      }
    },
    meta: {
      toastId: 'delete_issue_relation',
    },
  });

  // Duplicate from model
  const [showDuplicatePopup, setShowDuplicatePopup] = useState(false);
  const [sourceModelId, setSourceModelId] = useState<string | undefined>(undefined);
  const { mutate: duplicateFromModelMutation } = useMutation({
    mutationFn: (input: { source_model_id: number; target_model_id: number }) =>
      duplicateFromModel(input),
    onSuccess: () => {
      setShowDuplicatePopup(false);
      setSourceModelId(undefined);
      queryClient.invalidateQueries({
        queryKey: ['issueMappingRelation'],
      });
    },
    meta: {
      toastId: 'duplicate_issue_relation',
    },
  });

  const handleDuplicate = () => {
    if (sourceModelId && selectedModel) {
      duplicateFromModelMutation({
        source_model_id: Number(sourceModelId),
        target_model_id: Number(selectedModel),
      });
    }
  };

  return (
    <Container
      title="Relation List"
      className={styles['relation-list']}
      style={{ width: '360px' }}
      icon={<WindowList />}
      background="none"
      rightTopComponent={
        <div style={{ display: 'flex', flex: '1 0 0', justifyContent: 'flex-end' }}>
          <Button icon={<Duplicate />} onClick={() => setShowDuplicatePopup(true)}>
            Duplicate
          </Button>
        </div>
      }
    >
      <Loading isLoading={isLoading} />
      <div className={styles['content']}>
        <div className={styles['header']}>
          <Dropdown
            options={models?.map((model) => ({
              label: model.name,
              value: model.id,
            }))}
            label="Equipment Model:"
            value={selectedModel}
            onChange={(v) => changeSelectedModel(v)}
            searchable={true}
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
          </div>
        </div>
        <div className={styles['list']} ref={setContainer}>
          {relation?.map((item) => (
            <List
              {...{
                selectedRelation,
                changeSelectedRelation: (v) => {
                  changeSelectedRelation(v);
                  if (mappingCtx) {
                    mappingCtx.setRelation(item.name);
                  }
                },
                relation: item,
                onDeleteClick: (rel) => setRelationToDelete(rel),
              }}
              key={item.id}
            />
          ))}
        </div>
        <div className={styles['pagination']}>
          <Pagination
            count={relationCount}
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
              setValue('name', '');
              toggleShowAddDrawer();
            }}
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
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
        <PopupDelete
          open={!!relationToDelete}
          onClose={() => setRelationToDelete(null)}
          onDelete={() => {
            if (relationToDelete) {
              deleteRelationMutation(Number(relationToDelete.id));
            }
          }}
          entityType="Relation"
        />
        <Popup
          title="Duplicate Relations from Model"
          open={showDuplicatePopup}
          onClose={() => {
            setShowDuplicatePopup(false);
            setSourceModelId(undefined);
          }}
          icon={<Duplicate />}
          background="none"
          variant="custom"
          submitButtonLabel="Save"
          submitButtonIcon={<SaveFill />}
          onSubmit={handleDuplicate}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Dropdown
              options={models
                ?.filter((model) => model.id !== selectedModel)
                .map((model) => ({
                  label: model.name,
                  value: model.id,
                }))}
              label="Source Model:"
              placeholder="Select source model to duplicate from"
              value={sourceModelId}
              onChange={(v) => setSourceModelId(v)}
              searchable={true}
            />
            <div style={{ fontSize: '14px', color: '#e7e7e7' }}>
              This will duplicate all relations from the selected source model to the current model
              ({models?.find((m) => m.id === selectedModel)?.name}).
            </div>
          </div>
        </Popup>
      </div>
    </Container>
  );
};

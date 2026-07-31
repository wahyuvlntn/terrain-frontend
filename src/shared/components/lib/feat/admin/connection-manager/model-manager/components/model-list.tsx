import { Plus, WindowList } from '@digital-twin/icons';
import { t, useLanguageSwitcher, useVerticalLimit } from '@digital-twin/utils';
import { toast } from '@digital-twin/reusables';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { SetURLSearchParams } from 'react-router-dom';

import { useToggle } from '../../../../../hooks';
import { Button, Search } from '../../../../../input';
import { Container } from '../../../../../layout';
import { Pagination } from '../../../../../navigation';
import { Loading, PopupDelete } from '../../../../../others';
import {
  AuthCtx,
  PermissionAliasEnum,
  PermissionGroupAliasEnum,
} from '../../../../auth';
import { useDeleteModel, useModelList } from '../hooks/model';
import { ModelEntryType } from '../schemas';
import { AddModelDrawer } from './add-model-drawer';
import { ModelCard } from './model-card';
import style from './model-list.module.scss';

// Constants
const PREFIX = 'model_list_';
const ITEM_HEIGHT = 111.781;
const ITEM_GAP = 10;

export const ModelList = ({
  search,
  page,
  selectedId,
  onSelect,
  searchParams,
  setSearchParams,
}: {
  search: string;
  page: number;
  selectedId: number | undefined;
  onSelect: (id: number | null) => void;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
}) => {
  const { currentLanguage } = useLanguageSwitcher();

  // Refs
  const isAutoPaged = useRef(false);

  // Contexts
  const { hasPermission } = useContext(AuthCtx);

  // UAC
  const hasCreatePermission = hasPermission(
    PermissionGroupAliasEnum.enum.modelmanager,
    PermissionAliasEnum.enum.create
  );

  const hasDeletePermission = hasPermission(
    PermissionGroupAliasEnum.enum.modelmanager,
    PermissionAliasEnum.enum.delete
  );

  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  const limit = useVerticalLimit({
    container,
    itemHeight: ITEM_HEIGHT,
    itemGap: ITEM_GAP,
  });

  // For fetching model list
  const { data, isLoading } = useModelList();

  // Filter models
  const filtered = useMemo(() => {
    if (!data) {
      return undefined;
    }

    const normalizedSearch = search.toLowerCase();

    return data.filter(
      ({ name, brand, series, base_model }) =>
        !normalizedSearch ||
        name.toLowerCase().includes(normalizedSearch) ||
        brand.toLowerCase().includes(normalizedSearch) ||
        series.toLowerCase().includes(normalizedSearch) ||
        (base_model || '').toLowerCase().includes(normalizedSearch)
    );
  }, [data, search]);

  // Apply paging
  const paged = useMemo(() => {
    if (!limit || !filtered) {
      return undefined;
    }

    return filtered.slice((page - 1) * limit, page * limit);
  }, [filtered, page, limit]);

  // For adding a model
  const [showAddDrawer, toggleShowAddDrawer] = useToggle(false);

  // For deleting a model
  const [deletedModel, setDeletedModel] = useState<ModelEntryType>();
  const [showDeleteConfirm, toggleShowDeleteConfirm] = useToggle(false);
  const deleteModel = useDeleteModel();

  useEffect(() => {
    if (isLoading || limit == null || filtered?.length == null) {
      return;
    }

    const totalPage = Math.ceil(filtered.length / limit);

    if (page > totalPage) {
      setSearchParams((prev) => {
        prev.delete(`${PREFIX}page`);
        return new URLSearchParams(prev);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filtered?.length, limit, isLoading]);

  useEffect(() => {
    if (isAutoPaged.current || !filtered || !selectedId || !limit) {
      return;
    }

    isAutoPaged.current = true;

    const index = filtered.findIndex(({ id }) => id === selectedId);

    if (index !== -1) {
      const page = Math.ceil((index + 1) / limit);

      setSearchParams((prev) => {
        prev.set(`${PREFIX}page`, page.toString());
        return new URLSearchParams(prev);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, selectedId, limit]);

  // Set default selectedId
  useEffect(() => {
    if (!filtered || isLoading || selectedId) {
      return;
    }

    if (filtered.length === 0) {
      return;
    }

    setSearchParams((prev) => {
      prev.set('model_id', filtered[0].id.toString());
      return new URLSearchParams(prev);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, isLoading, selectedId]);

  const entries = useMemo(() => {
    if (!paged) {
      return null;
    }

    return paged.map((entry) => (
      <ModelCard
        key={entry.id}
        isSelected={entry.id === selectedId}
        entry={entry}
        onSelect={(entry) => {
          onSelect(entry.id);
        }}
        onDelete={(entry) => {
          setDeletedModel(entry);
          toggleShowDeleteConfirm();
        }}
        showDelete={hasDeletePermission}
      />
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paged, selectedId, hasDeletePermission, currentLanguage]);

  return (
    <Container
      icon={<WindowList />}
      title={t('common.model_list')}
      className={style['model-list']}
      background={'none'}
    >
      <div className={style['model-list-header']}>
        <Search
          value={search}
          onChange={(search) => {
            setSearchParams((prev) => {
              if (search) {
                prev.set(`${PREFIX}search`, search);
              } else {
                prev.delete(`${PREFIX}search`);
              }
              return new URLSearchParams(prev);
            });
          }}
          placeholder={t('common.search')}
          width="100%"
          background={'dark'}
        />
        {hasCreatePermission ? (
          <Button
            icon={<Plus />}
            onClick={(e) => {
              e.stopPropagation();
              toggleShowAddDrawer();
            }}
            style={{ whiteSpace: 'nowrap' }}
          >
            {t('common.add')}
          </Button>
        ) : null}
      </div>
      <div className={style['model-list-body']} ref={setContainer}>
        <Loading isLoading={isLoading} />
        {entries}
      </div>
      <div className={style['pagination-container']}>
        <Pagination
          searchParams={searchParams}
          setSearchParams={setSearchParams}
          count={filtered?.length ?? 0}
          limit={limit || 1}
          variant="arrow"
          searchParamsPrefix={PREFIX}
        />
      </div>

      {hasCreatePermission ? (
        <AddModelDrawer open={showAddDrawer} onClose={toggleShowAddDrawer} />
      ) : null}

      {hasDeletePermission ? (
        <PopupDelete
          entityType={t('common.model')}
          entityName={deletedModel?.name || '---'}
          open={showDeleteConfirm}
          onClose={toggleShowDeleteConfirm}
          onDelete={() => {
            if (!deletedModel) {
              return;
            }

            const { id, name } = deletedModel;

            deleteModel.mutate(id, {
              onSuccess: () => {
                // If deleted model is the currently selected model, reset the selected model
                if (id === selectedId) {
                  onSelect(null);
                }

                toast.success(t('common.model_successfully_deleted', name), {
                  toastId: `success_delete_model_${id}`,
                });
                toggleShowDeleteConfirm();
              },
            });
          }}
          deleting={deleteModel.isPending}
        />
      ) : null}
    </Container>
  );
};

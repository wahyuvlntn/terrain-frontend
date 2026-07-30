import { Edit1, Sync, TrashDelete, TrashDeleteFill } from '@digital-twin/icons';
import { useLanguageSwitcher, useVerticalLimit } from '@digital-twin/utils';
import { t } from '@digital-twin/utils';
import { toast } from '@digital-twin/reusables';
import clsx from 'clsx';
import { useContext, useEffect, useMemo, useState } from 'react';
import { SetURLSearchParams } from 'react-router-dom';

import { Column, Table } from '../../../../../data';
import { useToggle } from '../../../../../hooks';
import { Button, Search } from '../../../../../input';
import { Pagination } from '../../../../../navigation';
import { AddBulkImport, Loading, PopupDelete } from '../../../../../others';
import {
  AuthCtx,
  PermissionAliasEnum,
  PermissionGroupAliasEnum,
} from '../../../../auth';
import {
  useDeleteGatewayTag,
  useDeleteGatewayTags,
  useGatewayDetails,
  useGatewayTags,
  useReadTagsOnDemand,
} from '../hooks';
import { GatewayTagType, ReadResultType } from '../schemas';
import { AddGatewayTagsPopup } from './add-gateway-tags-popup';
import { BulkImportGatewayTagsExcel } from './bulk-import-gateway-tags-excel';
import style from './gateway-tags.module.scss';
import { UpdateGatewayTagDrawer } from './update-gateway-tag-drawer';

// Constants
const PREFIX = 'tags_';
const ITEM_HEIGHT = 40;
const OFFSET = 44;

export const GatewayTags = ({
  gatewayAlias,
  search,
  page,
  sortKey,
  order,
  searchParams,
  setSearchParams,
}: {
  gatewayAlias?: string;
  search: string;
  page: number;
  sortKey: string;
  order: string;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
}) => {
  // Contexts
  const { hasPermission } = useContext(AuthCtx);
  const { currentLanguage } = useLanguageSwitcher();

  // UAC
  const hasCreatePermission = hasPermission(
    PermissionGroupAliasEnum.enum.datasourcemanager,
    PermissionAliasEnum.enum.create
  );

  const hasUpdatePermission = hasPermission(
    PermissionGroupAliasEnum.enum.datasourcemanager,
    PermissionAliasEnum.enum.update
  );

  const hasDeletePermission = hasPermission(
    PermissionGroupAliasEnum.enum.datasourcemanager,
    PermissionAliasEnum.enum.delete
  );

  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  const limit = useVerticalLimit({
    container,
    itemHeight: ITEM_HEIGHT,
    offset: OFFSET,
  });

  // For bulk import tags
  const [showBulkImport, toggleShowBulkImport] = useToggle(false);

  // For adding a tag
  const [showAddTag, toggleShowAddTag] = useToggle(false);

  // For updating a tag
  const [updatedTag, setUpdatedTag] = useState<GatewayTagType>();
  const [showUpdateTag, toggleShowUpdateTag] = useToggle(false);

  // For deleting a tag
  const [deletedTag, setDeletedTag] = useState<GatewayTagType>();
  const [showDeleteConfirm, toggleShowDeleteConfirm] = useToggle(false);
  const deleteGatewayTag = useDeleteGatewayTag();

  // For reading tags
  const [readResult, setReadResult] = useState<ReadResultType>({});
  const readTags = useReadTagsOnDemand();

  // For deleting multiple tags to be deleted
  const [deletedTags, setDeletedTags] = useState<string[]>([]);
  const [showDeleteMultipleConfirm, toggleShowDeleteMultipleConfirm] =
    useToggle(false);
  const deleteGatewayTags = useDeleteGatewayTags();

  // Reset states
  useEffect(() => {
    setReadResult({});
    setDeletedTags([]);
  }, [gatewayAlias]);

  // Hooks
  const { data: details } = useGatewayDetails(gatewayAlias);
  const { data, isLoading } = useGatewayTags(gatewayAlias);

  // Sort tags by its name
  const orderedTags = useMemo(() => {
    if (!data) {
      return undefined;
    }

    const copied = [...data];

    let compareFn: (a: GatewayTagType, b: GatewayTagType) => number;

    if (sortKey === 'address' && order === 'desc') {
      compareFn = (a, b) => -1 * a.address.localeCompare(b.address);
    } else if (sortKey === 'address' && order === 'asc') {
      compareFn = (a, b) => a.address.localeCompare(b.address);
    } else if (sortKey === 'description' && order === 'desc') {
      compareFn = (a, b) =>
        -1 * (a.description || '').localeCompare(b.description || '');
    } else if (sortKey === 'description' && order === 'asc') {
      compareFn = (a, b) =>
        (a.description || '').localeCompare(b.description || '');
    } else if (sortKey === 'name' && order === 'desc') {
      compareFn = (a, b) => -1 * a.name.localeCompare(b.name);
    } else {
      compareFn = (a, b) => a.name.localeCompare(b.name);
    }

    copied.sort(compareFn);
    return copied;
  }, [data, sortKey, order]);

  // Filter tags by its name, address, or description
  const filteredTags = useMemo(() => {
    if (!orderedTags) {
      return undefined;
    }

    const normalizedSearch = search.toLowerCase();

    return orderedTags.filter(
      ({ name, address, description }) =>
        !normalizedSearch ||
        name.toLowerCase().includes(normalizedSearch) ||
        address.toLowerCase().includes(normalizedSearch) ||
        (description || '').toLowerCase().includes(normalizedSearch)
    );
  }, [orderedTags, search]);

  useEffect(() => {
    if (isLoading || !limit || filteredTags == null) {
      return;
    }

    const totalPage = Math.ceil(filteredTags.length / limit);

    if (page > totalPage) {
      setSearchParams((prev) => {
        prev.delete(`${PREFIX}page`);
        return new URLSearchParams(prev);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filteredTags?.length, limit, isLoading]);

  // Apply paging
  const pagedTags = useMemo(() => {
    if (!limit || !filteredTags) {
      return undefined;
    }

    return filteredTags.slice((page - 1) * limit, page * limit);
  }, [filteredTags, page, limit]);

  // Convert tags to rows
  const rows = useMemo(
    () => {
      if (!gatewayAlias || !pagedTags) {
        return [];
      }

      return pagedTags.map((tag) => {
        const { name, address, description } = tag;

        return {
          id: name,
          name: name,
          address: address,
          description: description || '---',
          data_lookup: (
            <DataLookup
              gatewayAlias={gatewayAlias}
              address={address}
              value={readResult[address]}
              onChange={(value) => {
                setReadResult((prev) => ({ ...prev, [address]: value }));
              }}
              isLoading={readTags.isPending}
            />
          ),
          actions:
            hasUpdatePermission || hasDeletePermission ? (
              <div className={style['gateway-tag-actions']}>
                {hasUpdatePermission ? (
                  <Edit1
                    className={style['gateway-tag-action']}
                    onClick={(e) => {
                      e.stopPropagation();
                      setUpdatedTag(tag);
                      toggleShowUpdateTag();
                    }}
                  />
                ) : null}
                {hasDeletePermission ? (
                  <TrashDelete
                    className={style['gateway-tag-action']}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletedTag(tag);
                      toggleShowDeleteConfirm();
                    }}
                  />
                ) : null}
              </div>
            ) : undefined,
        };
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      pagedTags,
      readResult,
      gatewayAlias,
      readTags.isPending,
      deletedTags,
      hasUpdatePermission,
      hasDeletePermission,
    ]
  );

  const columns = useMemo(() => {
    const columns: Column[] = [
      {
        key: 'name',
        name: t('common.name'),
        width: 116,
        showOrderIcon: true,
        sortState:
          sortKey === 'name' && order === 'asc'
            ? true
            : sortKey === 'name' && order === 'desc'
            ? false
            : undefined,
      },
      {
        key: 'address',
        name: t('common.address'),
        width: 117,
        showOrderIcon: true,
        sortState:
          sortKey === 'address' && order === 'asc'
            ? true
            : sortKey === 'address' && order === 'desc'
            ? false
            : undefined,
      },
      {
        key: 'description',
        name: t('common.description'),
        width: 110,
        showOrderIcon: true,
        sortState:
          sortKey === 'description' && order === 'asc'
            ? true
            : sortKey === 'description' && order === 'desc'
            ? false
            : undefined,
      },
      {
        key: 'data_lookup',
        name: t('common.data_lookup'),
        alignment: 'center',
        width: 111,
      },
    ];

    if (hasUpdatePermission || hasDeletePermission) {
      columns.push({
        key: 'actions',
        name: t('common.actions'),
        alignment: 'center',
        width: 70,
      });
    }

    return columns;
  }, [
    sortKey,
    order,
    hasUpdatePermission,
    hasDeletePermission,
    currentLanguage,
  ]);

  return (
    <div className={style['gateway-tags']}>
      <div className={style['gateway-tags-header']}>
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
          <AddBulkImport
            onAdd={toggleShowAddTag}
            onBulkImport={toggleShowBulkImport}
            disabled={!gatewayAlias || !details}
          />
        ) : null}
        <Button
          icon={<Sync />}
          onClick={(e) => {
            e.stopPropagation();

            if (!gatewayAlias || !data) {
              return;
            }

            readTags.mutate(
              {
                gateway_alias: gatewayAlias,
                gateway_tag_addresses: data.map(({ address }) => address),
              },
              {
                onSuccess: (result) => {
                  setReadResult((prev) => ({ ...prev, ...result }));
                },
              }
            );
          }}
          disabled={!gatewayAlias || !data || readTags.isPending}
          className={style.refresh}
          style={{ whiteSpace: 'nowrap' }}
        >
          {t('common.refresh')}
        </Button>
        {hasDeletePermission && gatewayAlias && deletedTags.length > 0 ? (
          <Button
            icon={<TrashDeleteFill />}
            onClick={(e) => {
              e.stopPropagation();
              toggleShowDeleteMultipleConfirm();
            }}
            color="error"
            style={{ whiteSpace: 'nowrap' }}
          >
            {t('common.delete')}
          </Button>
        ) : null}
      </div>
      <div className={style['tag-table']} ref={setContainer}>
        <Loading isLoading={isLoading} />
        <Table
          width="100%"
          columns={columns}
          rows={rows}
          sortable
          handleSortColumn={(sortKey, isAscending) => {
            setSearchParams((prev) => {
              if (isAscending == null) {
                prev.delete('tags_sort_key');
                prev.delete('tags_order');
              } else {
                prev.set('tags_sort_key', sortKey);
                prev.set('tags_order', isAscending ? 'asc' : 'desc');
              }
              return new URLSearchParams(prev);
            });
          }}
          selectedRowIds={deletedTags}
          onSelectRow={(rowId, selected) => {
            setDeletedTags((prev) =>
              selected ? [...prev, rowId] : prev.filter((tag) => tag !== rowId)
            );
          }}
          checkedAll={data && deletedTags.length >= data.length}
          onSelectAllClick={(checked) => {
            if (checked) {
              setDeletedTags(data ? data.map(({ name }) => name) : []);
            } else {
              setDeletedTags([]);
            }
          }}
          selectable={hasDeletePermission}
        />
      </div>
      <Pagination
        searchParams={searchParams}
        setSearchParams={setSearchParams}
        count={filteredTags?.length || 0}
        limit={limit || 1}
        variant="arrow"
        searchParamsPrefix={PREFIX}
      />
      {hasCreatePermission ? (
        <>
          <AddGatewayTagsPopup
            gatewayAlias={gatewayAlias}
            gatewayProtocol={details?.type}
            open={showAddTag}
            onClose={toggleShowAddTag}
          />
          <BulkImportGatewayTagsExcel
            gatewayAlias={gatewayAlias}
            open={showBulkImport}
            onClose={toggleShowBulkImport}
          />
        </>
      ) : null}
      {hasUpdatePermission ? (
        <UpdateGatewayTagDrawer
          gatewayAlias={gatewayAlias}
          gatewayProtocol={details?.type}
          updated={updatedTag}
          open={showUpdateTag}
          onClose={toggleShowUpdateTag}
        />
      ) : null}
      {hasDeletePermission ? (
        <>
          <PopupDelete
            entityType={t('common.tag')}
            entityName={deletedTag?.name || '---'}
            open={showDeleteConfirm}
            onClose={toggleShowDeleteConfirm}
            onDelete={() => {
              if (!gatewayAlias || !deletedTag) {
                return;
              }

              deleteGatewayTag.mutate(
                { gateway_alias: gatewayAlias, tag_name: deletedTag.name },
                {
                  onSuccess: ({ gateway_alias, tag_name }) => {
                    toast.success(
                      t('common.tag_successfully_deleted', tag_name),
                      {
                        toastId: `success_delete_gateway_tag_${gateway_alias}_${tag_name}`,
                      }
                    );
                    toggleShowDeleteConfirm();
                    setDeletedTag(undefined);
                    setDeletedTags((prev) =>
                      prev.filter((tag) => tag !== tag_name)
                    );
                  },
                }
              );
            }}
            deleting={deleteGatewayTag.isPending}
          />
          <PopupDelete
            entityType={t('common.tags')}
            entityName={deletedTags}
            open={showDeleteMultipleConfirm}
            onClose={toggleShowDeleteMultipleConfirm}
            onDelete={() => {
              if (!gatewayAlias || deletedTags.length === 0) {
                return;
              }

              deleteGatewayTags.mutate(
                { gateway_alias: gatewayAlias, tags: deletedTags },
                {
                  onSuccess: ({ gateway_alias, tags }) => {
                    toast.success(
                      t(
                        'common.tags_successfully_deleted',
                        String(tags.length)
                      ),
                      {
                        toastId: `success_delete_gateway_tags_${gateway_alias}`,
                      }
                    );
                    toggleShowDeleteMultipleConfirm();
                    setDeletedTags([]);
                  },
                }
              );
            }}
            deleting={deleteGatewayTags.isPending}
          />
        </>
      ) : null}
    </div>
  );
};

const DataLookup = ({
  gatewayAlias,
  address,
  value,
  onChange,
  isLoading,
}: {
  gatewayAlias: string;
  address: string;
  value?: string;
  onChange: (value: string) => void;
  isLoading?: boolean;
}) => {
  const readTag = useReadTagsOnDemand();

  const isDisabled = isLoading || readTag.isPending;

  return (
    <div className={style['data-lookup']}>
      <span className={style['data-lookup__value']} title={value}>
        {(value ?? '') || '---'}
      </span>
      <div
        className={clsx(
          style['data-lookup__icon'],
          isDisabled && style['data-lookup__icon--disabled']
        )}
        onClick={(e) => {
          e.stopPropagation();

          if (isDisabled) {
            return;
          }

          readTag.mutate(
            {
              gateway_alias: gatewayAlias,
              gateway_tag_addresses: [address],
            },
            {
              onSuccess: (result) => {
                onChange(result[address]);
              },
            }
          );
        }}
      >
        <Sync />
      </div>
    </div>
  );
};

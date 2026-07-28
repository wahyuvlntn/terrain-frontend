import { Navigate, Plus } from '@digital-twin/icons';
import { useVerticalLimit } from '@digital-twin/utils';
import { t, useLanguageSwitcher } from '@digital-twin/utils';
import { toast } from '@digital-twin/reusables';
import { useContext } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { useDeleteGateway, useGatewayList } from '../hooks';
import { GatewayEntryType } from '../schemas';
import { AddGatewayDrawer } from './add-gateway-drawer';
import { GatewayCard } from './gateway-card';
import style from './gateway-list.module.scss';

// Constants
const PREFIX = 'list_';
const ITEM_HEIGHT = 131;
const ITEM_GAP = 10;

export const GatewayList = ({
  search,
  page,
  selected,
  onSelect,
  searchParams,
  setSearchParams,
}: {
  search: string;
  page: number;
  selected?: string;
  onSelect: (alias: string) => void;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
}) => {
  useLanguageSwitcher();

  // Refs
  const isAutoPaged = useRef(false);

  // Contexts
  const { hasPermission } = useContext(AuthCtx);

  // UAC
  const hasCreatePermission = hasPermission(
    PermissionGroupAliasEnum.enum.datasourcemanager,
    PermissionAliasEnum.enum.create
  );

  const hasDeletePermission = hasPermission(
    PermissionGroupAliasEnum.enum.datasourcemanager,
    PermissionAliasEnum.enum.delete
  );

  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  const limit = useVerticalLimit({
    container,
    itemHeight: ITEM_HEIGHT,
    itemGap: ITEM_GAP,
  });

  // For adding a gateway
  const [showAddDrawer, toggleShowAddDrawer] = useToggle(false);

  // For deleting a gateway
  const [deletedGateway, setDeletedGateway] = useState<GatewayEntryType>();
  const [showDeleteConfirm, toggleShowDeleteConfirm] = useToggle(false);
  const deleteGateway = useDeleteGateway();

  // For fetching gateways
  const { data, isLoading } = useGatewayList();

  // Sort gateways by its name
  const orderedGateways = useMemo(() => {
    if (!data) {
      return undefined;
    }

    const copied = [...data];
    copied.sort((a, b) => a.name.localeCompare(b.name));
    return copied;
  }, [data]);

  // Filter gateways by its name
  const filteredGateways = useMemo(() => {
    if (!orderedGateways) {
      return undefined;
    }

    return orderedGateways.filter((gateway) =>
      gateway.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [orderedGateways, search]);

  // Set default selected
  useEffect(() => {
    if (!filteredGateways || filteredGateways.length === 0 || selected) {
      return;
    }

    onSelect(filteredGateways[0].alias);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredGateways, selected]);

  useEffect(() => {
    if (isLoading || !limit || filteredGateways == null) {
      return;
    }

    const totalPage = Math.ceil(filteredGateways.length / limit);

    if (page > totalPage) {
      setSearchParams((prev) => {
        prev.delete(`${PREFIX}page`);
        return new URLSearchParams(prev);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filteredGateways?.length, limit, isLoading]);

  useEffect(() => {
    if (isAutoPaged.current || !filteredGateways || !selected || !limit) {
      return;
    }

    isAutoPaged.current = true;

    const index = filteredGateways.findIndex(({ alias }) => alias === selected);

    if (index !== -1) {
      const page = Math.ceil((index + 1) / limit);

      setSearchParams((prev) => {
        prev.set(`${PREFIX}page`, page.toString());
        return new URLSearchParams(prev);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredGateways, selected, limit]);

  // Apply paging
  const pagedGateways = useMemo(() => {
    if (!limit || !filteredGateways) {
      return undefined;
    }

    return filteredGateways.slice((page - 1) * limit, page * limit);
  }, [filteredGateways, page, limit]);

  const gatewayCards = (() => {
    if (!pagedGateways) {
      return null;
    }

    return pagedGateways.map((gateway) => (
      <GatewayCard
        key={gateway.alias}
        isSelected={gateway.alias === selected}
        entry={gateway}
        onSelect={(entry) => {
          onSelect(entry.alias);
        }}
        onDelete={(entry) => {
          setDeletedGateway(entry);
          toggleShowDeleteConfirm();
        }}
        showDelete={hasDeletePermission}
      />
    ));
  })();

  return (
    <Container
      icon={<Navigate />}
      title={t('common.industrial_data_source')} // t('industrial_data_source')
      className={style['gateway-list']}
      background={'none'}
    >
      <div className={style['gateway-list-header']}>
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
      <div className={style['gateway-list-body']} ref={setContainer}>
        <Loading isLoading={isLoading} />
        {gatewayCards}
      </div>
      <div className={style['pagination-container']}>
        <Pagination
          searchParams={searchParams}
          setSearchParams={setSearchParams}
          count={filteredGateways?.length || 0}
          limit={limit || 1}
          variant="arrow"
          searchParamsPrefix={PREFIX}
        />
      </div>

      {hasCreatePermission ? (
        <AddGatewayDrawer open={showAddDrawer} onClose={toggleShowAddDrawer} />
      ) : null}

      {hasDeletePermission ? (
        <PopupDelete
          entityType={t('common.data_source')}
          entityName={deletedGateway?.name || '---'}
          open={showDeleteConfirm}
          onClose={toggleShowDeleteConfirm}
          onDelete={() => {
            if (!deletedGateway) {
              return;
            }

            deleteGateway.mutate(deletedGateway.alias, {
              onSuccess: () => {
                if (deletedGateway.alias === selected) {
                  setSearchParams((prev) => {
                    prev.delete('selected');
                    return new URLSearchParams(prev);
                  });
                }

                toast.success(
                  t(
                    'common.data_source_successfully_deleted',
                    deletedGateway.name
                  ),
                  {
                    toastId: `success_delete_gateway_${deletedGateway.alias}`,
                  }
                );
                toggleShowDeleteConfirm();
              },
            });
          }}
          deleting={deleteGateway.isPending}
        />
      ) : null}
    </Container>
  );
};

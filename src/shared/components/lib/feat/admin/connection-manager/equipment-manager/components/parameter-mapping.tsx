import {
  Edit1,
  SortAscending,
  SortDescending,
  UtilityDataQueryExport,
} from '@digital-twin/icons';
import { t, useLanguageSwitcher, useVerticalLimit } from '@digital-twin/utils';
import clsx from 'clsx';
import { useContext, useMemo, useState, useEffect } from 'react';
import { SetURLSearchParams } from 'react-router-dom';

import {
  AddBulkImport,
  AuthCtx,
  Checkbox,
  Container,
  Loading,
  PermissionAliasEnum,
  PermissionGroupAliasEnum,
  useToggle,
  Search,
  Pagination2,
} from '../../../../../..';
import { EquipmentGatewaysCtx } from '../contexts';
import { useParameterGains } from '../hooks';
import { useEquipmentParameters, useEquipmentVtqcs } from '../hooks';
import { EquipmentParameterType } from '../schemas';
import { BulkImportParameterMappingDrawer } from './bulk-import-parameter-mapping-drawer';
import style from './parameter-mapping.module.scss';
import { SelectTagPopup, SelectTagsPopup } from './select-tags-popup';

// Constants
const PREFIX = 'parameter_setup_';
const ITEM_HEIGHT = 76;
const ITEM_GAP = 10;

type ParameterEntry = {
  parameter: EquipmentParameterType;
  name: string;
  protocol: string | null;
  gateway: string | null;
  tag: string | null;
  unit: string;
  value: string | null;
  timestamp: Date | null;
  quality: number | null;
};

export const ParameterMapping = ({
  alias,
  sortKey,
  order,
  setSearchParams,
}: {
  alias: string | undefined;
  sortKey: string;
  order: string;
  setSearchParams: SetURLSearchParams;
}) => {
  useLanguageSwitcher();

  const { data: gains } = useParameterGains();

  const gainNames = useMemo(() => {
    if (!gains) {
      return {};
    }

    return gains.reduce((names, { id, name }) => {
      names[id] = name;
      return names;
    }, {} as Record<number, string>);
  }, [gains]);

  // Contexts
  const { hasPermission } = useContext(AuthCtx);

  // UAC
  const hasUpdatePermission = hasPermission(
    PermissionGroupAliasEnum.enum.equipmentmanager,
    PermissionAliasEnum.enum.update
  );

  const { records } = useContext(EquipmentGatewaysCtx);

  // For bulk import tags
  const [showBulkImport, toggleShowBulkImport] = useToggle(false);

  const [updated, setUpdated] = useState<EquipmentParameterType>();

  const [showSelectTag, toggleShowSelectTag] = useToggle(false);
  const [showSelectTags, toggleShowSelectTags] = useToggle(false);

  const { data, isLoading } = useEquipmentParameters(alias);

  const { data: vtqcs } = useEquipmentVtqcs(alias, 5000);

  const [parameters, mappedCount] = useMemo(() => {
    if (!alias || !data) {
      return [undefined, undefined] as const;
    }

    let mappedCount = 0;

    const parameters: {
      parameter: EquipmentParameterType;
      name: string;
      protocol: string | null;
      gateway: string | null;
      tag: string | null;
      unit: string;
      value: string | null;
      timestamp: Date | null;
      quality: number | null;
    }[] = [];

    data.forEach((parameter) => {
      const {
        alias,
        name,
        gateway_alias,
        tag,
        unit,
        data_type,
        scale,
        gain_id,
      } = parameter;

      let value: string | null = null;
      let timestamp: Date | null = null;
      let quality: number | null = null;

      if (vtqcs) {
        const vtqc = vtqcs[alias];

        if (vtqc && vtqc.t > 0) {
          value = vtqc.v;
          timestamp = new Date(vtqc.t);
          quality = vtqc.q;

          if (
            data_type === 'number' &&
            scale != null &&
            (scale >= 0 || scale <= 20)
          ) {
            const num = Number(value);

            if (!isNaN(num)) {
              value = parseFloat(num.toFixed(scale)).toString();
            }
          }
        }
      }

      let protocol: string | null = null;
      let gateway: string | null = null;

      if (gateway_alias) {
        ++mappedCount;

        if (records) {
          const metadata = records[gateway_alias];

          if (metadata) {
            protocol = metadata.protocol_name;
            gateway = metadata.name;
          }
        }
      }

      let prefixedUnit = unit;

      if (gain_id) {
        prefixedUnit = (gainNames[gain_id] ?? '') + unit;
      }

      parameters.push({
        parameter,
        name,
        protocol,
        gateway,
        tag,
        unit: prefixedUnit,
        value,
        timestamp,
        quality,
      });
    });

    return [parameters, mappedCount] as const;
  }, [alias, data, vtqcs, records, gainNames]);

  // Filter states
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Filter parameters based on search
  const filtered = useMemo(() => {
    if (!parameters) {
      return undefined;
    }

    const normalizedSearch = search.toLowerCase();

    return parameters.filter(({ name }) =>
      name.toLowerCase().includes(normalizedSearch)
    );
  }, [parameters, search]);

  const ordered = useMemo(() => {
    if (!filtered) {
      return undefined;
    }

    const copied = [...filtered];

    let compareFn: (a: ParameterEntry, b: ParameterEntry) => number;

    if (sortKey === 'parameter' && order === 'desc') {
      compareFn = (a, b) => -1 * a.name.localeCompare(b.name);
    } else {
      compareFn = (a, b) => a.name.localeCompare(b.name);
    }

    copied.sort(compareFn);
    return copied;
  }, [filtered, sortKey, order]);

  // Apply paging
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const limit = useVerticalLimit({
    container,
    itemHeight: ITEM_HEIGHT,
    itemGap: ITEM_GAP,
  });
  const paged = useMemo(() => {
    if (!ordered || !limit) {
      return undefined;
    }
    return ordered.slice((page - 1) * limit, page * limit);
  }, [ordered, page, limit]);

  // Reset page when it is outside of range
  useEffect(() => {
    if (isLoading || filtered?.length == null || !limit) {
      return;
    }

    const totalPage = Math.ceil(filtered.length / limit);

    if (page > totalPage) {
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered?.length, page, limit, isLoading]);

  const sortIcon = (() => {
    if (sortKey === 'parameter' && order === 'desc') {
      return (
        <SortDescending
          className={style['parameter-mapping__body__header__parameter__sort']}
          onClick={(e) => {
            e.stopPropagation();
            setSearchParams((prev) => {
              prev.set(`${PREFIX}sort_key`, 'parameter');
              prev.set(`${PREFIX}order`, 'asc');
              return new URLSearchParams(prev);
            });
          }}
        />
      );
    } else {
      return (
        <SortAscending
          className={style['parameter-mapping__body__header__parameter__sort']}
          onClick={(e) => {
            e.stopPropagation();
            setSearchParams((prev) => {
              prev.set(`${PREFIX}sort_key`, 'parameter');
              prev.set(`${PREFIX}order`, 'desc');
              return new URLSearchParams(prev);
            });
          }}
        />
      );
    }
  })();

  return (
    <Container
      icon={<UtilityDataQueryExport />}
      title={t('common.parameter_mapping')}
      className={style['container']}
      contentWrapperProps={{ style: { background: 'transparent' } }}
      rightTopComponent={
        hasUpdatePermission ? (
          <AddBulkImport
            onAdd={toggleShowSelectTags}
            onBulkImport={toggleShowBulkImport}
            disabled={!alias}
            variant="setup"
          />
        ) : null
      }
      background={'none'}
    >
      <div className={style['parameter-mapping']}>
        <div className={style['parameter-mapping__header']}>
          <h3
            className={style['parameter-mapping__header__title']}
            title={t('common.parameter_list')}
          >
            {t('common.parameter_list')}
          </h3>
          <div
            className={style['parameter-mapping__header__used-parameters']}
            title={`${t('common.parameter_used')}: ${(
              mappedCount || 0
            ).toLocaleString()} / ${(
              parameters?.length || 0
            ).toLocaleString()}`}
          >
            <span>{t('common.parameter_used')}:</span>
            <span>{`${(mappedCount || 0).toLocaleString()} / ${(
              parameters?.length || 0
            ).toLocaleString()}`}</span>
          </div>
        </div>
        <Search
          value={search}
          onChange={setSearch}
          placeholder={t('common.search')}
          width="100%"
          background="dark"
        />
        <div className={style['parameter-mapping__body']}>
          <div className={style['parameter-mapping__body__header']}>
            <div
              className={style['parameter-mapping__body__header__parameter']}
            >
              <span>{t('common.parameter')}</span>
              {sortIcon}
            </div>
            <div className={style['parameter-mapping__body__header__vtq']}>
              <span
                className={style['parameter-mapping__body__header__vtq__v']}
              >
                Value
              </span>
              <span
                className={style['parameter-mapping__body__header__vtq__t']}
              >
                Timestamp
              </span>
              <span
                className={style['parameter-mapping__body__header__vtq__q']}
              >
                Quality
              </span>
              {hasUpdatePermission ? <div style={{ width: 28 }} /> : null}
            </div>
          </div>
          <div
            className={style['parameter-mapping__body__list']}
            ref={setContainer}
          >
            <Loading isLoading={isLoading} />
            {paged
              ? paged.map((parameter) => (
                  <ParameterCard
                    key={parameter.name}
                    {...parameter}
                    onEdit={() => {
                      setUpdated(parameter.parameter);
                      toggleShowSelectTag();
                    }}
                    showEdit={hasUpdatePermission}
                  />
                ))
              : null}
          </div>
        </div>
      </div>
      <div className={style['pagination-container']}>
        <Pagination2
          count={filtered?.length || 0}
          limit={limit || 1}
          page={page}
          onChange={setPage}
          variant="arrow"
        />
      </div>
      {hasUpdatePermission ? (
        <>
          <SelectTagsPopup
            alias={alias}
            open={showSelectTags}
            onClose={toggleShowSelectTags}
          />
          <SelectTagPopup
            alias={alias}
            parameter={updated}
            open={showSelectTag}
            onClose={toggleShowSelectTag}
          />
          <BulkImportParameterMappingDrawer
            alias={alias}
            open={showBulkImport}
            onClose={toggleShowBulkImport}
          />
        </>
      ) : null}
    </Container>
  );
};

const ParameterCard = ({
  name,
  unit,
  gateway,
  tag,
  value,
  timestamp,
  quality,
  onEdit,
  showEdit,
}: {
  name: string;
  unit: string;
  gateway: string | null;
  tag: string | null;
  value: string | null;
  timestamp: Date | null;
  quality: number | null;
  onEdit: () => void;
  showEdit?: boolean;
}) => {
  const unitText = unit ? `[${unit}] ` : '';

  const mappingText = gateway && tag ? `${gateway}.${tag}` : '---';

  // // Dummy data
  // value = '123.23132';
  // timestamp = new Date();

  return (
    <div className={style['parameter-card']}>
      <div className={style['parameter-card__left']}>
        <div className={style['parameter-card__top']}>
          <span className={style['parameter-card__name']} title={name}>
            {name}
          </span>
        </div>
        <div className={style['parameter-card__bottom']}>
          <span
            className={style['parameter-card__unit-and-mapping']}
            title={`${unitText}${mappingText}`}
          >{`${unitText}${mappingText}`}</span>
        </div>
      </div>
      <div className={style['parameter-card__right']}>
        <div className={style['parameter-card__vtq']}>
          <span
            className={clsx(
              style['parameter-card__vtq__v'],
              value == null && style['parameter-card__vtq__v--null']
            )}
            title={value != null ? value : undefined}
          >
            {value != null ? value : '---'}
          </span>

          <span
            className={style['parameter-card__vtq__t']}
            title={timestamp ? showTimestamp(timestamp) : undefined}
          >
            {showTimestamp(timestamp)}
          </span>
          <div className={style['parameter-card__vtq__q']}>
            <Checkbox value={quality === 0} />
          </div>
          {showEdit ? (
            <div
              className={style['parameter-card__actions']}
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Edit1 height={28} width={28} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

function showTimestamp(timestamp: Date | null) {
  if (!timestamp) {
    return '---';
  }
  return timestamp
    .toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .replace(',', '');
}

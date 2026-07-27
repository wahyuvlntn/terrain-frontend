import { zodResolver } from '@hookform/resolvers/zod';
import { UtilityDataQueryExport } from '@digital-twin/icons';
import { t, useVerticalLimit } from '@digital-twin/utils';
import { toast } from '@digital-twin/reusables';
import clsx from 'clsx';
import { useContext, useEffect, useMemo, useState } from 'react';
import { Control, useForm } from 'react-hook-form';

import {
  Checkbox,
  ClosedBy,
  Column,
  Loading,
  Pagination2,
  Popup,
  Search,
  Table,
} from '../../../../../..';
import { GatewayCardSimple } from '../../gateway-manager/components/gateway-card';
import { EquipmentGatewaysCtx } from '../contexts';
import {
  useEquipmentParameters,
  useGatewayTags,
  useParameterGains,
  useUpdateParameterMapping,
} from '../hooks';
import {
  EquipmentParameterType,
  updateParameterMappingFormSchema,
  UpdateParameterMappingFormType,
} from '../schemas';
import style from './select-tags-popup.module.scss';

// Constants
const ITEM_HEIGHT = 44;
const OFFSET = 44;

export const SelectTagsPopup = ({
  alias,
  open,
  onClose,
}: {
  alias?: string;
  open: boolean;
  onClose: () => void;
}) => {
  // States
  const [selectedParameter, setSelectedParameter] = useState<string>();

  useEffect(() => {
    setSelectedParameter(undefined);
  }, [alias]);

  // Custom hooks
  const parameters = useEquipmentParameters(alias);
  const updateMappings = useUpdateParameterMapping();

  // Form
  const {
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isDirty },
    control,
  } = useForm<UpdateParameterMappingFormType>({
    defaultValues: {
      alias: '',
      mappings: {},
    },
    resolver: zodResolver(updateParameterMappingFormSchema),
  });

  const resetForm = (alias?: string, parameters?: EquipmentParameterType[]) => {
    if (!alias || !parameters) {
      return;
    }

    reset({
      alias,
      mappings: parameters.reduce(
        (
          mappings,
          { alias, gateway_alias, tag, is_displayed, is_logged, gain_id }
        ) => {
          mappings[alias] = {
            gateway_alias,
            tag,
            is_displayed,
            is_logged,
            gain_id,
          };
          return mappings;
        },
        {} as Record<
          string,
          {
            gateway_alias: string | null;
            tag: string | null;
            is_displayed: boolean;
            is_logged: boolean;
            gain_id?: number;
          }
        >
      ),
    });
  };

  const onSubmit = handleSubmit((form) => {
    updateMappings.mutate(form, {
      onSuccess: ({ alias }) => {
        toast.success(t('common.parameter_mappings_successfully_updated'), {
          toastId: `success_update_parameter_mappings_${alias}`,
        });
        onClose();
      },
    });
  });

  // Initialize form
  useEffect(() => {
    resetForm(alias, parameters.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alias, parameters.data]);

  const mappings = { ...watch('mappings') };
  const mapping = selectedParameter
    ? watch(`mappings.[${selectedParameter}]`)
    : undefined;

  const gatewayAlias = mapping?.gateway_alias || null;
  const tag = mapping?.tag || null;

  return (
    <Popup
      icon={<UtilityDataQueryExport />}
      title={t('common.select_tags')}
      open={open}
      onClose={onClose}
      afterClose={(closedBy) => {
        if (closedBy === ClosedBy.CANCEL) {
          resetForm(alias, parameters.data);
        }

        setSelectedParameter(undefined);
      }}
      onSubmit={onSubmit}
      submitting={updateMappings.isPending}
      disableSubmit={!isDirty}
      variant="save"
      background="none"
    >
      <div className={clsx(style['container'])}>
        <div
          className={clsx(
            style['outer-container'],
            style['outer-container--parameters'],
            style['section--parameters']
          )}
        >
          <ParameterList
            parameters={parameters.data}
            isLoading={parameters.isLoading}
            mappings={mappings}
            selected={selectedParameter}
            onSelect={setSelectedParameter}
            control={control}
          />
        </div>
        <TagSelector
          gatewayAlias={gatewayAlias}
          tag={tag}
          onChangeGateway={(gatewayAlias) => {
            if (!selectedParameter) {
              return;
            }

            setValue(
              `mappings.[${selectedParameter}].gateway_alias`,
              gatewayAlias,
              { shouldDirty: true }
            );
            setValue(`mappings.[${selectedParameter}].tag`, null, {
              shouldDirty: true,
            });
          }}
          onChangeTag={(tag) => {
            if (!selectedParameter) {
              return;
            }

            setValue(`mappings.[${selectedParameter}].tag`, tag, {
              shouldDirty: true,
            });
          }}
        />
      </div>
    </Popup>
  );
};

export const SelectTagPopup = ({
  alias,
  parameter,
  open,
  onClose,
}: {
  alias?: string;
  parameter?: EquipmentParameterType;
  open: boolean;
  onClose: () => void;
}) => {
  // Custom hooks
  const updateMappings = useUpdateParameterMapping();

  // Form
  const {
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isDirty },
    control,
  } = useForm<UpdateParameterMappingFormType>({
    defaultValues: {
      alias: '',
      mappings: {},
    },
    resolver: zodResolver(updateParameterMappingFormSchema),
  });

  const resetForm = (alias?: string, parameter?: EquipmentParameterType) => {
    if (!alias || !parameter) {
      return;
    }

    reset({
      alias,
      mappings: {
        [parameter.alias]: {
          gateway_alias: parameter.gateway_alias,
          tag: parameter.tag,
          is_displayed: parameter.is_displayed,
          is_logged: parameter.is_logged,
          gain_id: parameter.gain_id,
        },
      },
    });
  };

  const onSubmit = handleSubmit((form) => {
    updateMappings.mutate(form, {
      onSuccess: ({ alias }) => {
        toast.success(
          t(
            'common.parameter_mapping_successfully_updated',
            parameter?.name ?? ''
          ),
          {
            toastId: `success_update_parameter_mapping_${alias}_${parameter?.alias}`,
          }
        );
        onClose();
      },
    });
  });

  // Initialize form
  useEffect(() => {
    resetForm(alias, parameter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alias, parameter]);

  const mapping = parameter
    ? watch(`mappings.[${parameter.alias}]`)
    : undefined;

  const gatewayAlias = mapping?.gateway_alias || null;
  const tag = mapping?.tag || null;

  return (
    <Popup
      icon={<UtilityDataQueryExport />}
      title={`${t('common.select_tag')}: ${parameter?.name}`}
      open={open}
      onClose={onClose}
      afterClose={(closedBy) => {
        if (closedBy === ClosedBy.CANCEL) {
          resetForm(alias, parameter);
        }
      }}
      onSubmit={onSubmit}
      submitting={updateMappings.isPending}
      disableSubmit={!isDirty}
      variant="save"
      background="none"
    >
      <div className={clsx(style['container'], style['container--singular'])}>
        <div className={style['container--singular__tag-selector']}>
          <TagSelector
            gatewayAlias={gatewayAlias}
            tag={tag}
            onChangeGateway={(gatewayAlias) => {
              if (!parameter) {
                return;
              }

              setValue(
                `mappings.[${parameter.alias}].gateway_alias`,
                gatewayAlias,
                { shouldDirty: true }
              );
              setValue(`mappings.[${parameter.alias}].tag`, null, {
                shouldDirty: true,
              });
            }}
            onChangeTag={(tag) => {
              if (!parameter) {
                return;
              }

              setValue(`mappings.[${parameter.alias}].tag`, tag, {
                shouldDirty: true,
              });
            }}
          />
        </div>
        {parameter ? (
          <div className={clsx(style['checkbox'], style['checkbox--left'])}>
            <Checkbox
              label={t('common.view')}
              registered={`mappings.[${parameter.alias}].is_displayed`}
              control={control}
            />
            <Checkbox
              label={t('common.log')}
              registered={`mappings.[${parameter.alias}].is_logged`}
              control={control}
            />
          </div>
        ) : null}
      </div>
    </Popup>
  );
};

const ParameterList = ({
  parameters,
  isLoading,
  mappings,
  selected,
  onSelect,
  control,
}: {
  parameters?: EquipmentParameterType[];
  isLoading: boolean;
  mappings?: Record<
    string,
    { gateway_alias: string | null; tag: string | null }
  >;
  selected?: string;
  onSelect: (parameterAlias: string) => void;
  control: Control<UpdateParameterMappingFormType>;
}) => {
  const { data: gains } = useParameterGains();

  // Contexts
  const { records: gatewayRecords } = useContext(EquipmentGatewaysCtx);

  // For responsive limit
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  const limit = useVerticalLimit({
    container,
    itemHeight: ITEM_HEIGHT,
    offset: OFFSET,
  });

  // States
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Select first parameter (if not already)
  useEffect(() => {
    if (!parameters || selected) {
      return;
    }

    if (parameters.length > 0) {
      onSelect(parameters[0].alias);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parameters, selected]);

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

  // Apply paging
  const paged = useMemo(() => {
    if (!filtered || !limit) {
      return undefined;
    }

    return filtered.slice((page - 1) * limit, page * limit);
  }, [filtered, page, limit]);

  // Convert paged data to table rows
  const rows = useMemo(() => {
    if (!paged) {
      return [];
    }

    return paged.map(({ alias, name }) => {
      const mapping = mappings?.[alias];
      const gatewayAlias = mapping?.gateway_alias;

      let gatewayName: string | undefined;

      if (gatewayAlias) {
        gatewayName = gatewayRecords?.[gatewayAlias]?.name;
      }

      const tag = mapping?.tag;

      let assignedTag: string;

      if (gatewayName && tag) {
        assignedTag = `${gatewayName}.${tag}`;
      } else {
        assignedTag = '---';
      }

      return {
        id: alias,
        name: name,
        assignedTag: assignedTag,
        is_displayed: (
          <div className={style['checkbox']}>
            <Checkbox
              registered={`mappings.[${alias}].is_displayed`}
              control={control}
            />
          </div>
        ),
        is_logged: (
          <div className={style['checkbox']}>
            <Checkbox
              registered={`mappings.[${alias}].is_logged`}
              control={control}
            />
          </div>
        ),
      };
    });
  }, [paged, mappings, gatewayRecords, control, gains]);

  const columns = useMemo(() => {
    const columns: Column[] = [
      { key: 'name', name: t('common.parameter_name'), width: 130 },
      {
        key: 'assignedTag',
        name: t('common.assigned_tag'),
        width: 175,
      },
      {
        key: 'is_displayed',
        name: t('common.view'),
        width: 60,
        alignment: 'center',
      },
      {
        key: 'is_logged',
        name: t('common.log'),
        width: 60,
        alignment: 'center',
      },
    ];

    return columns;
  }, []);

  return (
    <div className={clsx(style['section'], style['section--parameters'])}>
      <span className={style['section__title']}>
        {t('common.parameter_list')}
      </span>
      <div className={style['section__body']}>
        <Search
          value={search}
          onChange={setSearch}
          placeholder={t('common.search')}
          width="100%"
          background="dark"
        />
        <div className={style['table']} ref={setContainer}>
          <Loading isLoading={isLoading} />
          <Table
            width="100%"
            columns={columns}
            rows={rows}
            selectedRowIds={selected ? [selected] : []}
            onSelectRow={(parameterAlias) => {
              onSelect(parameterAlias);
            }}
            selectable
            selectVariant="highlight"
            rowHeight={ITEM_HEIGHT}
          />
        </div>
      </div>
      <div className={style['section__pagination']}>
        <Pagination2
          count={filtered?.length || 0}
          limit={limit || 1}
          page={page}
          onChange={setPage}
          variant="arrow"
        />
      </div>
    </div>
  );
};

const TagSelector = ({
  gatewayAlias,
  tag,
  onChangeGateway,
  onChangeTag,
}: {
  parameterAlias?: string;
  gatewayAlias?: string | null;
  onChangeGateway: (gatewayAlias: string | null) => void;
  tag?: string | null;
  onChangeTag: (tag: string | null) => void;
}) => {
  return (
    <div
      className={clsx(style['section--tag-selector'], style['outer-container'])}
    >
      <span className={style['outer-container__title']}>
        {t('common.tag_mapping')}
      </span>
      <div className={style['tag-selector']}>
        <GatewayList
          selected={gatewayAlias || undefined}
          onSelect={onChangeGateway}
        />
        <TagList
          gatewayAlias={gatewayAlias || undefined}
          selected={tag || undefined}
          onSelect={onChangeTag}
        />
      </div>
    </div>
  );
};

const GatewayList = ({
  selected,
  onSelect,
}: {
  selected?: string;
  onSelect: (gatewayAlias: string | null) => void;
}) => {
  // Contexts
  const { entries, isLoading } = useContext(EquipmentGatewaysCtx);

  // For responsive limit
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  const limit = useVerticalLimit({
    container,
    itemHeight: 131,
    itemGap: 14,
  });

  // States
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Filter parameters based on search
  const filtered = useMemo(() => {
    if (!entries) {
      return undefined;
    }

    const normalizedSearch = search.toLowerCase();

    return entries.filter(({ name }) =>
      name.toLowerCase().includes(normalizedSearch)
    );
  }, [entries, search]);

  useEffect(() => {
    if (!filtered || !selected || !limit) {
      return;
    }

    if (selected) {
      const index = filtered.findIndex(({ alias }) => alias === selected);

      if (index !== -1) {
        const page = Math.ceil((index + 1) / limit);
        setPage(page);
      }
    }
  }, [filtered, selected, limit]);

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

  // Apply paging
  const paged = useMemo(() => {
    if (!filtered || !limit) {
      return undefined;
    }

    return filtered.slice((page - 1) * limit, page * limit);
  }, [filtered, page, limit]);

  // Convert paged data to table rows
  const list = paged
    ? paged.map(({ alias, name, protocol_alias }) => {
        return (
          <GatewayCardSimple
            isSelected={alias === selected}
            alias={alias}
            name={name}
            protocol_alias={protocol_alias}
            onSelect={() => {
              if (alias === selected) {
                onSelect(null);
              } else {
                onSelect(alias);
              }
            }}
          />
        );
      })
    : null;

  return (
    <div className={clsx(style['section'], style['section--data-sources'])}>
      <span className={style['section__title']}>
        {t('common.data_source_list')}
      </span>
      <div className={style['section__body']}>
        <Search
          value={search}
          onChange={setSearch}
          placeholder={t('common.search')}
          width="100%"
          background="dark"
        />
        <div className={style['list']} ref={setContainer}>
          <Loading isLoading={isLoading} />
          {list}
        </div>
      </div>
      <div className={style['section__pagination']}>
        <Pagination2
          count={filtered?.length || 0}
          limit={limit || 1}
          page={page}
          onChange={setPage}
          variant="arrow"
        />
      </div>
    </div>
  );
};

const TagList = ({
  gatewayAlias,
  selected,
  onSelect,
}: {
  gatewayAlias?: string;
  selected?: string;
  onSelect: (tag: string | null) => void;
}) => {
  // Contexts
  const { data, isLoading } = useGatewayTags(gatewayAlias);

  // For responsive limit
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  const limit = useVerticalLimit({
    container,
    itemHeight: ITEM_HEIGHT,
    offset: OFFSET,
  });

  // States
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Filter parameters based on search
  const filtered = useMemo(() => {
    if (!gatewayAlias || !data) {
      return undefined;
    }

    const normalizedSearch = search.toLowerCase();

    return data.filter(({ name }) =>
      name.toLowerCase().includes(normalizedSearch)
    );
  }, [gatewayAlias, data, search]);

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

  // Sort tags by name
  const ordered = useMemo(() => {
    if (!filtered) {
      return undefined;
    }

    const copied = [...filtered];
    copied.sort((a, b) => a.name.localeCompare(b.name));
    return copied;
  }, [filtered]);

  useEffect(() => {
    if (!ordered || !selected || !limit) {
      return;
    }

    if (selected) {
      const index = ordered.findIndex(({ name }) => name === selected);

      if (index !== -1) {
        const page = Math.ceil((index + 1) / limit);
        setPage(page);
      }
    }
  }, [ordered, selected, limit]);

  // Apply paging
  const paged = useMemo(() => {
    if (!ordered || !limit) {
      return undefined;
    }

    return ordered.slice((page - 1) * limit, page * limit);
  }, [ordered, page, limit]);

  // Convert paged data to table rows
  const rows = useMemo(() => {
    if (!paged) {
      return [];
    }

    return paged.map(({ name, address, description }) => ({
      id: name,
      name: name,
      address: address || '---',
      description: description || '---',
    }));
  }, [paged]);

  return (
    <div className={clsx(style['section'], style['section--tags'])}>
      <span className={style['section__title']}>{t('common.tag_list')}</span>
      <div className={style['section__body']}>
        <Search
          value={search}
          onChange={setSearch}
          placeholder={t('common.search')}
          width="100%"
          background="dark"
        />
        <div className={style['table']} ref={setContainer}>
          <Loading isLoading={isLoading} />
          <Table
            width="100%"
            columns={[
              { key: 'name', name: t('common.name'), width: 100 },
              { key: 'address', name: t('common.address'), width: 100 },
              { key: 'description', name: t('common.description'), width: 100 },
            ]}
            rows={rows}
            selectedRowIds={selected ? [selected] : []}
            onSelectRow={(tag, selected) => {
              onSelect(selected ? tag : null);
            }}
            selectable
            selectVariant="highlight"
            rowHeight={ITEM_HEIGHT}
          />
        </div>
      </div>
      <div className={style['section__pagination']}>
        <Pagination2
          count={filtered?.length || 0}
          limit={limit || 1}
          page={page}
          onChange={setPage}
          variant="arrow"
        />
      </div>
    </div>
  );
};

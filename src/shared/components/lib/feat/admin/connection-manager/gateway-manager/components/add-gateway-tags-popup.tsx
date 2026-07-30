import { zodResolver } from '@hookform/resolvers/zod';
import {
  Plus,
  SettingsPreferences,
  SortAscending,
  SortDefault,
  SortDescending,
  TrashDelete,
} from '@digital-twin/icons';
import { t, useVerticalLimit } from '@digital-twin/utils';
import { toast } from '@digital-twin/reusables';
import clsx from 'clsx';
import { useContext, useEffect, useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';

import { Input, Search, TextBox } from '../../../../../input';
import { Pagination2, Popup } from '../../../../../navigation';
import { PrjCtx } from '../contexts';
import { useAddGatewayTags } from '../hooks';
import {
  addGatewayPlcTagsFormSchema,
  addGatewayTagsFormSchema,
  AddGatewayTagsFormType,
  GatewayProtocolType,
  GatewayTagType,
  TagNodeType,
} from '../schemas';
import style from './add-gateway-tags-popup.module.scss';
import { BrowseTags, TagAddressInput } from './tag-address-input';

// Constants
const ITEM_HEIGHT = 267.55;
const ITEM_HEIGHT_MODBUS = 478.72;
const GAP = 10;

export const AddGatewayTagsPopup = ({
  gatewayAlias,
  gatewayProtocol,
  open,
  onClose,
}: {
  gatewayAlias?: string;
  gatewayProtocol?: GatewayProtocolType;
  open: boolean;
  onClose: () => void;
}) => {
  const prj = useContext(PrjCtx);

  const isBrowsable =
    gatewayProtocol === 'OPCUA' || gatewayProtocol === 'MTCONNECT';

  // For responsive limit
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  const itemHeight =
    gatewayProtocol === 'MODBUS_TCP' || gatewayProtocol === 'MODBUS_RTU'
      ? ITEM_HEIGHT_MODBUS
      : ITEM_HEIGHT;

  const limit = useVerticalLimit({
    container,
    itemHeight: itemHeight,
    itemGap: GAP,
  });

  // States
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [order, setOrder] = useState<'asc' | 'desc'>();
  const [draggedNode, setDraggedNode] = useState<{
    tag: TagNodeType;
    parentNames?: string;
  }>();

  const addGatewayTags = useAddGatewayTags();

  const { control, handleSubmit, reset, watch, trigger } =
    useForm<AddGatewayTagsFormType>({
      defaultValues: {
        gateway_alias: '',
        gateway_tags: [{ name: '', address: '', description: null }],
      },
      resolver: async (data, context, options) => {
        const anyResolver = zodResolver(
          gatewayProtocol === 'MODBUS_TCP' ||
            gatewayProtocol === 'S7' ||
            gatewayProtocol === 'MODBUS_RTU'
            ? addGatewayPlcTagsFormSchema
            : addGatewayTagsFormSchema
        );

        // you can debug your validation schema here
        // console.log('formData', data);
        // console.log(
        //   'validation result',
        //   await anyResolver(data, context, options)
        // );
        return anyResolver(data, context, options);
      },
    });

  const {
    fields: tags,
    prepend,
    remove,
    update,
    replace,
  } = useFieldArray({
    control,
    name: 'gateway_tags',
  });

  const resetForm = (gatewayAlias?: string) => {
    reset({
      gateway_alias: gatewayAlias || '',
      gateway_tags: [{ name: '', address: '', description: null }],
    });
    setSearch('');
    setPage(1);
    setOrder(undefined);
    setDraggedNode(undefined);
  };

  useEffect(() => {
    resetForm(gatewayAlias);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gatewayAlias]);

  const onSubmit = handleSubmit(
    (form) => {
      addGatewayTags.mutate(form, {
        onSuccess: () => {
          toast.success(
            t(
              'common.successfully_added_tags',
              String(form.gateway_tags.length)
            ),
            {
              toastId: `success_add_gateway_tags_${form.gateway_alias}`,
            }
          );
          onClose();
        },
      });
    },
    (errors) => {
      const toastId = `error_add_gateway_tags_${gatewayAlias}`;

      const { gateway_alias, gateway_tags } = errors;

      if (gateway_alias) {
        toast.error(gateway_alias.message ?? '', { toastId });
        return;
      }

      if (gateway_tags) {
        if (gateway_tags.root) {
          toast.error(gateway_tags.root.message ?? '', { toastId });
          return;
        }

        if (Array.isArray(gateway_tags) && gateway_tags.length > 0) {
          // Get first error index
          let index: number | null = null;

          for (let i = 0; i < gateway_tags.length; ++i) {
            if (!gateway_tags[i]) {
              continue;
            }

            index = i;
          }

          if (index === null) {
            return;
          }

          // Calculate which page it is based on the index
          if (!limit) {
            return;
          }

          setPage(Math.ceil((index + 1) / limit));
        }
      }
    }
  );

  // Filter tags based on search
  const filtered = useMemo(() => {
    if (!tags) {
      return undefined;
    }

    const normalizedSearch = search.toLowerCase();

    return tags
      .map((tag, index) => ({ index, ...tag }))
      .filter(
        (_tag, index) =>
          !normalizedSearch ||
          watch(`gateway_tags.${index}.name`)
            .toLowerCase()
            .includes(normalizedSearch) ||
          watch(`gateway_tags.${index}.address`)
            .toLowerCase()
            .includes(normalizedSearch) ||
          (watch(`gateway_tags.${index}.description`) || '')
            .toLowerCase()
            .includes(normalizedSearch)
      );
  }, [tags, search, watch]);

  // Reset page when it is outside of range
  useEffect(() => {
    if (filtered?.length == null || !limit) {
      return;
    }

    const totalPage = Math.ceil(filtered.length / limit);

    if (page > totalPage) {
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered?.length, page, limit]);

  // Apply paging
  const paged = useMemo(() => {
    if (!filtered || !limit) {
      return undefined;
    }

    return filtered.slice((page - 1) * limit, page * limit);
  }, [filtered, page, limit]);

  // Render paged tags
  const rendered = useMemo(() => {
    if (!paged) {
      return null;
    }

    return paged.map((tag) => (
      <div className={style['entry']} key={tag.id}>
        <div
          className={style['entry__delete']}
          onClick={(e) => {
            e.stopPropagation();
            remove(tag.index);
          }}
        >
          <TrashDelete className={style['entry__delete__icon']} />
        </div>
        <Controller
          name={`gateway_tags.${tag.index}.name`}
          control={control}
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <Input
              label={t('common.name')}
              value={value}
              onChange={onChange}
              isError={!!error}
              inputProps={{ required: true }}
              background="dark"
            />
          )}
        />
        <Controller
          name={`gateway_tags.${tag.index}.address`}
          control={control}
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <TagAddressInput
              //TODO: remove unused gatewayAlias
              // gatewayAlias={gatewayAlias}
              protocol={gatewayProtocol}
              value={value}
              onChange={onChange}
              isError={!!error}
            />
          )}
        />
        <Controller
          name={`gateway_tags.${tag.index}.description`}
          control={control}
          render={({ field: { value, onChange } }) => (
            <TextBox
              label={t('common.description')}
              value={value || ''}
              onChange={(value) => {
                onChange(value || null);
              }}
              placeholder={t('common.placeholder_description_limit', '160')}
              maxLength={160}
              // detail={`${value?.length || 0} / 160`}
              rows={4}
              background="dark"
            />
          )}
        />
      </div>
    ));
  }, [paged, gatewayAlias, gatewayProtocol, control, remove]);

  return (
    <Popup
      icon={<SettingsPreferences />}
      title={t('common.add_data_source_tags')}
      open={open}
      onClose={onClose}
      afterClose={() => {
        resetForm(gatewayAlias);
      }}
      onSubmit={onSubmit}
      submitting={addGatewayTags.isPending}
      disableSubmit={tags.length === 0}
      variant="add"
      background="dark"
    >
      <PrjCtx.Provider value={prj}>
        <div
          className={clsx(
            style['container'],
            isBrowsable && style['container--browsable']
          )}
        >
          {isBrowsable ? (
            <>
              <div className={style['browse']}>
                <BrowseTags
                  gatewayAlias={gatewayAlias}
                  perLevelRefresh={gatewayProtocol === 'OPCUA'}
                  onDragStart={setDraggedNode}
                />
              </div>
              <hr className={style['separator']} />
            </>
          ) : null}
          <div className={style['form']}>
            <div className={style['header']}>
              <Search
                value={search}
                onChange={setSearch}
                placeholder="Search..."
                width="100%"
                background="dark"
              />
              <div
                className={clsx(style['button'], style['button--add'])}
                onClick={(e) => {
                  e.stopPropagation();
                  prepend({ name: '', address: '', description: null });
                }}
              >
                <Plus
                  className={clsx(
                    style['button__icon'],
                    style['button__icon--add']
                  )}
                />
              </div>
              <div
                className={clsx(style['button'], style['button--sort'])}
                onClick={(e) => {
                  e.stopPropagation();
                  const nextOrder = order === 'asc' ? 'desc' : 'asc';
                  setOrder(nextOrder);

                  const copied = [...watch('gateway_tags')];

                  if (nextOrder === 'desc') {
                    copied.sort((a, b) => -1 * a.name.localeCompare(b.name));
                  } else {
                    copied.sort((a, b) => a.name.localeCompare(b.name));
                  }

                  replace(copied);
                  trigger('gateway_tags');
                }}
              >
                {order === 'asc' ? (
                  <SortAscending
                    className={clsx(
                      style['button__icon'],
                      style['button__icon--sort']
                    )}
                  />
                ) : order === 'desc' ? (
                  <SortDescending
                    className={clsx(
                      style['button__icon'],
                      style['button__icon--sort']
                    )}
                  />
                ) : (
                  <SortDefault
                    className={clsx(
                      style['button__icon'],
                      style['button__icon--sort']
                    )}
                  />
                )}
              </div>
            </div>
            <div
              className={style['list']}
              ref={setContainer}
              onDrop={() => {
                if (!draggedNode) {
                  return;
                }

                const droppedTags: GatewayTagType[] = [];

                let normalizeAddress:
                  | ((address: string) => string)
                  | undefined = undefined;

                if (gatewayProtocol === 'MTCONNECT') {
                  normalizeAddress = (address) => {
                    return (
                      address.split(
                        '[tag | value | _attribute.<attribute>]'
                      )[0] + 'value'
                    );
                  };
                }

                generateTagsFromTagNode(
                  draggedNode.tag,
                  draggedNode.parentNames,
                  droppedTags,
                  normalizeAddress
                );

                const currentTags: Record<
                  string,
                  {
                    name: string;
                    address: string;
                    description: string | null;
                    index: number;
                  }
                > = {};

                watch('gateway_tags').forEach((tag, index) => {
                  currentTags[tag.name] = { ...tag, index };
                });

                const newTags: GatewayTagType[] = [];

                for (const tag of droppedTags) {
                  const currentTag = currentTags[tag.name];

                  if (currentTag) {
                    update(currentTag.index, {
                      name: currentTag.name,
                      address: tag.address,
                      description: currentTag.description,
                    });
                  } else {
                    newTags.push(tag);
                  }
                }

                if (newTags.length > 0) {
                  prepend(newTags);
                }

                setDraggedNode(undefined);
              }}
              onDragOver={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              {rendered}
            </div>
            <div className={style['pagination']}>
              <Pagination2
                count={filtered?.length || 0}
                limit={limit || 1}
                page={page}
                onChange={setPage}
                variant="arrow"
              />
            </div>
          </div>
        </div>
      </PrjCtx.Provider>
    </Popup>
  );
};

function generateTagsFromTagNode(
  node: TagNodeType,
  parentNames: string | undefined,
  tags: GatewayTagType[],
  normalizeAddress?: (address: string) => string
) {
  const names = parentNames ? `${parentNames}.${node.name}` : node.name;

  if (node.children) {
    for (const child of node.children) {
      generateTagsFromTagNode(child, names, tags, normalizeAddress);
    }
  } else {
    let normalizedAddress: string;

    if (normalizeAddress) {
      normalizedAddress = normalizeAddress(node.address);
    } else {
      normalizedAddress = node.address;
    }

    tags.push({
      name: names,
      address: normalizedAddress,
      description: null,
    });
  }
}

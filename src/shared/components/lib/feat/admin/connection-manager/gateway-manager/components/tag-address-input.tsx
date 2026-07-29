import { TreeItem, TreeView } from '@mui/x-tree-view';
import {
  ChevronDownFill,
  ChevronRightFill,
  FolderFill,
  InformationCircle,
  Sync,
  TagFill,
} from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import { toast } from '@digital-twin/reusables';
import clsx from 'clsx';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { Dropdown, DropdownOption, Input } from '../../../../../input';
import {
  Loading,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../../../../others';
import {
  useBrowseAllTags,
  useBrowseTags,
  useBrowseTagsPerLevel,
} from '../hooks';
import { GatewayProtocolType, TagNodeType } from '../schemas';
import { ModbusAddress } from './tag-addres-input.modbus';
import style from './tag-address-input.module.scss';

export const TagAddressInput = ({
  //TODO: remove unused gatewayAlias
  // gatewayAlias,
  protocol,
  value,
  onChange,
  isError,
  useDefault = true,
}: {
  // gatewayAlias?: string;
  protocol?: GatewayProtocolType;
  value: string;
  onChange: (value: string) => void;
  isError?: boolean;
  useDefault?: boolean;
}) => {
  switch (protocol) {
    case 'REST_CLIENT':
    case 'REST_SERVER':
    case 'MQTT_CLIENT':
    case 'MQTT_SERVER':
      return (
        <JsonAddress value={value} onChange={onChange} isError={isError} />
      );
    case 'OPCUA':
      return (
        <OpcuaAddress
          //TODO: remove unused gatewayAlias
          // gatewayAlias={gatewayAlias}
          value={value}
          onChange={onChange}
          isError={isError}
        />
      );
    case 'MTCONNECT':
      return (
        <MtconnectAddress
          //TODO: remove unused gatewayAlias
          // gatewayAlias={gatewayAlias}
          value={value}
          onChange={onChange}
          isError={isError}
        />
      );
    case 'MODBUS_RTU':
    case 'MODBUS_TCP':
      return (
        <ModbusAddress
          value={value}
          onChange={onChange}
          isError={isError}
          useDefault={useDefault}
        />
      );
    case 'S7':
      return (
        <S7Address
          value={value}
          onChange={onChange}
          isError={isError}
          useDefault={useDefault}
        />
      );
    default:
      return (
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
          }}
          inputProps={{ required: true }}
          wrapperProps={{ style: { width: '100%' } }}
          isError={isError}
          background="dark"
        />
      );
  }
};

const JsonAddress = ({
  value,
  onChange,
  isError,
}: {
  value: string;
  onChange: (value: string) => void;
  isError?: boolean;
}) => {
  return (
    <Input
      label={t('common.address') + ':'}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
      }}
      inputProps={{ required: true }}
      wrapperProps={{ style: { width: '100%' } }}
      isError={isError}
      background="dark"
      prefix={
        <Popover offset={10} placement="bottom-start">
          <PopoverTrigger>
            <div className={style['info-icon-container']}>
              <InformationCircle />
            </div>
          </PopoverTrigger>
          <PopoverContent className={style['info']}>
            <span className={style['info__message']}>
              {t('common.json_address_format')}
            </span>
            <span className={style['info__title']}>{t('common.schema')}:</span>
            <span className={style['info__schema']}>{`{
  [address: string]:
    | string
    | string[]
    | {v: string, t: number, q: number}
    | {v: string, t: number, q: number}[]
}`}</span>
          </PopoverContent>
        </Popover>
      }
    />
  );
};

const OpcuaAddress = ({
  //TODO: remove unused gatewayAlias
  // gatewayAlias,
  value,
  onChange,
  isError,
}: {
  // gatewayAlias?: string;
  value: string;
  onChange: (value: string) => void;
  isError?: boolean;
}) => {
  return (
    <Input
      label={t('common.address') + ':'}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
      }}
      inputProps={{ required: true }}
      wrapperProps={{ style: { width: '100%' } }}
      isError={isError}
      background="dark"
      prefix={
        <Popover offset={10} placement="bottom-start">
          <PopoverTrigger>
            <div className={style['info-icon-container']}>
              <InformationCircle />
            </div>
          </PopoverTrigger>
          <PopoverContent className={style['info']}>
            <span className={style['info__message']}>
              {t('common.the_address_should_be_valid_opcua_id')}
            </span>
            <span className={style['info__title']}>
              {t('common.example') + ':'}
            </span>
            <span
              className={style['info__schema']}
            >{`ns=2;s=Channel1.Device1.Tag0`}</span>
          </PopoverContent>
        </Popover>
      }
    />
  );
};

const MtconnectAddress = ({
  //TODO: remove unused gatewayAlias
  // gatewayAlias,
  value,
  onChange,
  isError,
}: {
  // gatewayAlias?: string;
  value: string;
  onChange: (value: string) => void;
  isError?: boolean;
}) => {
  return (
    <Input
      label={t('common.address') + ':'}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
      }}
      inputProps={{ required: true }}
      wrapperProps={{ style: { flex: '1 0 0', width: 0 } }}
      isError={isError}
      background="dark"
      prefix={
        <Popover offset={10} placement="bottom-start">
          <PopoverTrigger>
            <div className={style['info-icon-container']}>
              <InformationCircle />
            </div>
          </PopoverTrigger>
          <PopoverContent className={style['info']}>
            <span className={style['info__title']}>
              {t('common.address') + ':'}
            </span>
            <span
              className={style['info__schema']}
            >{`<id>.[tag | value | _attribute.<attribute>]`}</span>
            <span className={style['info__title']}>
              {t('common.example') + ':'}
            </span>
            <span
              className={style['info__schema']}
            >{`<AxisFeedrate dataItemId="xf" name="Xfrt">0</AxisFeedrate>`}</span>
            <span
              className={style['info__schema']}
            >{`xf.tag = "AxisFeedRate"`}</span>
            <span className={style['info__schema']}>{`xf.value = "0"`}</span>
            <span
              className={style['info__schema']}
            >{`xf._attribute.name = "Xfrt"`}</span>
          </PopoverContent>
        </Popover>
      }
    />
  );
};

const S7Address = ({
  value,
  onChange,
  isError,
  useDefault = true,
}: {
  value: string;
  onChange: (value: string) => void;
  isError?: boolean;
  useDefault?: boolean;
}) => {
  return (
    <PlcAddress
      value={value}
      onChange={onChange}
      isError={isError}
      useDefault={useDefault}
      leftIcon={
        <Popover offset={10} placement="bottom-start">
          <PopoverTrigger>
            <div className={style['info-icon-container']}>
              <InformationCircle />
            </div>
          </PopoverTrigger>
          <PopoverContent className={clsx(style['info'], style['info--s7'])}>
            <span className={style['info__title']}>
              {t('common.address') + ':'}
            </span>
            <span>{`{memory-area}{start-address}`}</span>
            <span>{`{memory-area}{start-address}.{bit-offset} - BOOL; bit-offset = 0 - 7`}</span>
            <span className={style['info__title']}>
              {t('common.memory_areas') + ':'}
            </span>
            <span>{`Inputs -> "I"`}</span>
            <span>{`Outputs -> "Q"`}</span>
            <span>{`Flag Memory -> "M"`}</span>
            <span>{`Timers -> "T"`}</span>
            <span>{`Counters -> "C"`}</span>
            <span className={style['info__title']}>
              DB {t('common.address') + ':'}
            </span>
            <span>{`DB{num}:{start-address}`}</span>
            <span>{`DB{num}:{start-address}.{bit-offset} - BOOL; bit-offset = 0 - 7`}</span>
            <span>{`DB{num}:{start-address}.{string-length} - STRING; string-length = 1 - 254`}</span>
            <span className={style['info__title']}>
              {t('common.example') + ':'}
            </span>
            <span>{`I0`}</span>
            <span>{`I0.0 - BOOL; bit-offset = 0`}</span>
            <span>{`DB1:0.0 - BOOL; bit-offset = 0`}</span>
            <span>{`DB1:0.4 - STRING; string-length = 4`}</span>
          </PopoverContent>
        </Popover>
      }
    />
  );
};

const dataTypes: DropdownOption[] = [
  { value: 'BOOL', label: 'BOOL - boolean' },
  { value: 'SINT', label: 'SINT - 8-bit signed integer' },
  { value: 'USINT', label: 'USINT - 8-bit unsigned integer' },
  { value: 'INT', label: 'INT - 16-bit signed integer' },
  { value: 'UINT', label: 'UINT - 16-bit unsigned integer' },
  { value: 'DINT', label: 'DINT - 32-bit signed integer' },
  { value: 'UDINT', label: 'UDINT - 32-bit unsigned integer' },
  { value: 'LINT', label: 'LINT - 64-bit signed integer' },
  { value: 'ULINT', label: 'ULINT - 64-bit unsigned integer' },
  { value: 'REAL', label: 'REAL - 32-bit floating point value' },
  { value: 'LREAL', label: 'LREAL - 64-bit floating point value' },
  { value: 'STRING', label: 'STRING - UTF-8 encoded string' },
];

const PlcAddress = ({
  value,
  onChange,
  leftIcon,
  isError,
  useDefault = true,
}: {
  value: string;
  onChange: (value: string) => void;
  leftIcon?: ReactNode;
  isError?: boolean;
  useDefault?: boolean;
}) => {
  // Parse additional value, separating it to address & data type
  const { address, dataType } = useMemo(() => {
    if (!value) {
      return { address: '', dataType: '' };
    }

    const splitted = value.split(':');

    return {
      address: splitted.slice(0, -1).join(':'),
      dataType: splitted.at(-1) || '',
    };
  }, [value]);

  // Set initial value
  useEffect(() => {
    if (useDefault && !dataType) {
      const timer = setTimeout(() => {
        onChange && onChange(`${address}:INT`);
      }, 0);
      return () => {
        clearTimeout(timer);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useDefault, dataType]);

  return (
    <>
      <div className={style['row']}>
        <Input
          label={t('common.address') + ':'}
          value={address}
          onChange={(e) => {
            onChange(`${e.target.value}:${dataType}`);
          }}
          inputProps={{ required: true }}
          wrapperProps={{
            className: style['column'],
          }}
          isError={isError}
          prefix={leftIcon}
          background="dark"
        />
        <Dropdown
          label={t('common.data_type') + ':'}
          options={dataTypes}
          value={dataType}
          onChange={(value) => {
            onChange(`${address}:${value}`);
          }}
          wrapperClassName={style['column']}
          wrapperStyles={{ width: 0 }}
          background="dark"
        />
      </div>
      <div className={style['row']}></div>
    </>
  );
};

export const BrowseTags = ({
  gatewayAlias,
  perLevelRefresh,
  onDragStart,
}: {
  gatewayAlias?: string;
  perLevelRefresh?: boolean;
  onDragStart: (args: { tag: TagNodeType; parentNames?: string }) => void;
}) => {
  const [selected, setSelected] = useState('');

  const { data, isLoading } = useBrowseTags(gatewayAlias, !!gatewayAlias);

  const browseAll = useBrowseAllTags();

  const nodes = useMemo(() => {
    if (!gatewayAlias || !data) {
      return null;
    }

    return data.map((tag) => (
      <TagNode
        key={tag.name}
        gatewayAlias={gatewayAlias}
        tag={tag}
        onSelect={setSelected}
        onDragStart={onDragStart}
        perLevelRefresh={perLevelRefresh}
      />
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gatewayAlias, data, perLevelRefresh]);

  return (
    <div className={style['browse-tags']}>
      <Input
        label={t('common.address') + ':'}
        value={selected}
        readOnly
        background="dark"
      />
      <div className={style['tag-tree-container']}>
        <Loading isLoading={isLoading} />
        {gatewayAlias && perLevelRefresh ? (
          <BrowseAllButton
            onClick={() => {
              browseAll.mutate(gatewayAlias);
            }}
            loading={browseAll.isPending}
          />
        ) : null}
        <TreeView
          aria-label="tree-view"
          defaultCollapseIcon={<ChevronDownFill />}
          defaultExpandIcon={<ChevronRightFill />}
          selected={selected || ''}
        >
          {nodes}
        </TreeView>
      </div>
    </div>
  );
};

const TagNode = ({
  gatewayAlias,
  tag,
  onSelect,
  onDragStart,
  parentNames,
  perLevelRefresh,
}: {
  gatewayAlias: string;
  tag: TagNodeType;
  onSelect: (address: string) => void;
  onDragStart: (args: { tag: TagNodeType; parentNames?: string }) => void;
  parentNames?: string;
  perLevelRefresh?: boolean;
}) => {
  const { address, name, children } = tag;

  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  const isFolder = !!children;

  const names = parentNames ? `${parentNames}.${name}` : name;

  const childNodes = useMemo(() => {
    if (!children || children.length === 0) {
      return null;
    }

    return children.map((child) => {
      const childNames = `${names}.${child.name}`;

      return (
        <TagNode
          key={childNames}
          gatewayAlias={gatewayAlias}
          tag={child}
          onSelect={onSelect}
          onDragStart={onDragStart}
          parentNames={names}
          perLevelRefresh={perLevelRefresh}
        />
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gatewayAlias, children, names, perLevelRefresh]);

  const browseTagsPerLevel = useBrowseTagsPerLevel();

  const [debouncedLoading, setDebouncedLoading] = useState(
    browseTagsPerLevel.isPending
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedLoading(browseTagsPerLevel.isPending);
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [browseTagsPerLevel.isPending]);

  return (
    <TreeItem
      className={style['tag-node']}
      nodeId={isFolder ? names : address}
      onFocusCapture={(e) => e.stopPropagation()}
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        // console.log(tag, parentNames);

        onDragStart({ tag, parentNames });
      }}
      label={
        <div
          className={style['tag-node-label']}
          style={{
            cursor: !isFolder ? 'pointer' : undefined,
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();

            if (!isFolder) {
              onSelect(address);
            }
          }}
        >
          {isFolder ? (
            <FolderFill height={16} width={16} />
          ) : (
            <TagFill height={16} width={16} />
          )}
          {name}
          {isFolder && perLevelRefresh ? (
            <div
              className={style['tag-node-label__refresh']}
              onClick={(e) => {
                e.stopPropagation();

                if (browseTagsPerLevel.isPending) {
                  return;
                }

                browseTagsPerLevel.mutate(
                  { gateway_alias: gatewayAlias, node_id: address },
                  {
                    onSuccess: ({ children }) => {
                      if (children.length === 0) {
                        toast.info(`${name} is empty`, {
                          toastId: `browse_tags_opc_per_level_${gatewayAlias}_${address}`,
                        });
                      }
                    },
                  }
                );
              }}
            >
              <Sync
                className={clsx(
                  style['tag-node-label__refresh__icon'],
                  debouncedLoading &&
                    style['tag-node-label__refresh__icon--loading']
                )}
              />
            </div>
          ) : null}
        </div>
      }
    >
      {childNodes}
    </TreeItem>
  );
};

const BrowseAllButton = ({
  onClick,
  loading,
}: {
  onClick: () => void;
  loading: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [debouncedLoading, setDebouncedLoading] = useState(loading);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedLoading(loading);
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [loading]);

  return (
    <Popover open={open} offset={5} placement="top">
      <PopoverTrigger asChild>
        <div
          className={style['browse-all']}
          onClick={(e) => {
            e.stopPropagation();

            if (loading || debouncedLoading) {
              return;
            }

            onClick();
          }}
          onMouseEnter={() => {
            setOpen(true);
          }}
          onMouseLeave={() => {
            setOpen(false);
          }}
        >
          <Sync
            className={clsx(
              style['browse-all__icon'],
              debouncedLoading && style['browse-all__icon--loading']
            )}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className={style['browse-all__tooltip']}>
        {t('common.browse_all')}
      </PopoverContent>
    </Popover>
  );
};

import { TreeItem, TreeView } from '@mui/x-tree-view';
import { ChevronDownFill, ChevronRightFill, Map, Open } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import { toast } from '@digital-twin/reusables';
import clsx from 'clsx';
import { useContext, useEffect, useMemo, useState } from 'react';

import { Input } from '../../../../../..';
import { Loading, Popup, Search, useToggle } from '../../../../../..';
import { EquipmentLocationsCtx } from '../contexts';
import { useEquipmentLocations } from '../hooks';
import { LocationNodeType } from '../schemas';
import style from './location-selector.module.scss';

export const LocationSelector = ({
  value,
  onChange,
  background = 'default',
  className,
  readOnly,
  disabled,
}: {
  value: number | undefined;
  onChange: (value: number) => void;
  background?: 'dark' | 'default';
  className?: string;
  readOnly?: boolean;
  disabled?: boolean;
}) => {
  // States
  const [locationNames, setLocationNames] = useState<string>();

  // For toggling location popup
  const [showPopup, toggleShowPopup] = useToggle(false);

  return (
    <>
      <Input
        label={t('common.location') + ':'}
        value={locationNames || ''}
        background={background}
        readOnly={readOnly}
        disabled={disabled}
        wrapperProps={{
          className,
        }}
        suffix={
          <div
            className={clsx(
              style['location-selector__content__icon'],
              (readOnly || disabled) &&
                style['location-selector__content__icon--disabled']
            )}
            onClick={(e) => {
              e.stopPropagation();

              if (readOnly || disabled) {
                return;
              }

              toggleShowPopup();
            }}
          >
            <Open />
          </div>
        }
      />
      <LocationSelectorPopup
        open={showPopup}
        onClose={toggleShowPopup}
        locationId={value}
        onChangeLocationId={onChange}
        onChangeLocationNames={setLocationNames}
      />
    </>
  );
};

const LocationSelectorPopup = ({
  open,
  onClose,
  locationId,
  onChangeLocationId,
  onChangeLocationNames,
}: {
  open: boolean;
  onClose: () => void;
  locationId: number | undefined;
  onChangeLocationId: (locationId: number) => void;
  onChangeLocationNames: (locationNames: string | undefined) => void;
}) => {
  const [search, setSearch] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState(locationId);

  const { tree } = useContext(EquipmentLocationsCtx);

  useEffect(() => {
    if (!tree || locationId) {
      return;
    }

    if (tree.length > 0) {
      setTimeout(() => {
        onChangeLocationId(tree[0].id);
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree, locationId]);

  useEffect(() => {
    if (!tree || !locationId) {
      return;
    }

    const locationNames = getLocationNames(locationId, tree);

    if (locationNames) {
      onChangeLocationNames(locationNames.join(' > '));
    } else {
      onChangeLocationNames(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree, locationId]);

  const { data, isLoading } = useEquipmentLocations(search);

  const nodes = useMemo(() => {
    if (!data) {
      return null;
    }

    return data.map(({ id, name, childs }) => (
      <LocationNode
        key={id}
        selectedId={selectedLocationId}
        id={id}
        name={name}
        childs={childs}
        onSelect={setSelectedLocationId}
      />
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, selectedLocationId, locationId]);

  return (
    <Popup
      icon={<Map />}
      title={t('common.select_location')}
      open={open}
      onClose={onClose}
      afterClose={() => {
        setSearch('');
        setSelectedLocationId(locationId);
      }}
      onSubmit={() => {
        if (!selectedLocationId) {
          toast.warning(t('common.please_select_location'), {
            toastId: 'error_select_equipment_location',
          });
          return;
        }

        onChangeLocationId(selectedLocationId);
        onClose();
      }}
      disableSubmit={locationId === selectedLocationId}
      variant="apply"
      background="none-without-padding"
    >
      <div className={style['location-tree-container']}>
        <Search
          value={search}
          onChange={setSearch}
          placeholder={t('common.search')}
          width="100%"
          background="dark"
        />
        <div className={style['location-tree-container__tree']}>
          <Loading isLoading={isLoading} />
          <TreeView
            aria-label="tree-view"
            defaultCollapseIcon={<ChevronDownFill />}
            defaultExpandIcon={<ChevronRightFill />}
            selected={selectedLocationId ? selectedLocationId.toString() : ''}
          >
            {nodes}
          </TreeView>
        </div>
      </div>
    </Popup>
  );
};

const LocationNode = ({
  selectedId,
  id,
  name,
  childs,
  onSelect,
}: {
  selectedId: number | undefined;
  id: number;
  name: string;
  childs?: LocationNodeType[];
  onSelect: (locationId: number) => void;
}) => {
  const childNodes = useMemo(() => {
    if (!childs) {
      return null;
    }

    return childs.map((child) => (
      <LocationNode
        key={child.id}
        selectedId={selectedId}
        id={child.id}
        name={child.name}
        childs={child.childs}
        onSelect={onSelect}
      />
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childs, selectedId]);

  return (
    <TreeItem
      className={style['location-node']}
      nodeId={id.toString()}
      label={
        <div
          className={style['location-node__label']}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(id);
          }}
        >
          <span className={style['location-node__label__text']} title={name}>
            {name}
          </span>
        </div>
      }
    >
      {childNodes}
    </TreeItem>
  );
};

const getLocationNames = (
  id: number,
  nodes: LocationNodeType[],
  parentNames?: string[]
): string[] | undefined => {
  for (const node of nodes) {
    const names = parentNames ? [...parentNames, node.name] : [node.name];

    if (id === node.id) {
      return names;
    }

    if (node.childs) {
      const names = getLocationNames(
        id,
        node.childs,
        parentNames ? [...parentNames, node.name] : [node.name]
      );

      if (names) {
        return names;
      }
    }
  }

  return undefined;
};

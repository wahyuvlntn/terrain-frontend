import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { TreeView } from '@mui/x-tree-view/TreeView';
import {
  ChevronDownFill as ChevronDownIcon,
  ChevronRightFill as ChevronRightIcon,
  Edit as EditIcon,
  FilterFunnelFill,
  Plus as AddPlusIcon,
  QrCode,
  Search,
  TrashDelete as TrashDeleteIcon,
} from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import { ArrowBackIcon } from '@digital-twin/reusables';
import { useQuery } from '@tanstack/react-query';
import React, { useContext, useRef, useState } from 'react';
import { toast } from 'react-toastify';

import {
  AuthCtx,
  Button,
  COLOR,
  Container,
  Drawer,
  Filter,
  FilterCtx,
  FilterDrawerToggleButton,
  FilterTree,
  Input,
  ThemeContext,
  useGetFilter,
} from '../../../../../..';
import { FilterDrawerContainer } from '../../../../filter/filter--drawer';
import { CoreFilterProvider, CoreFilterProviderRef } from '../../../../filter/filter-data';
import PrintConfig from '../../../../qrcode/print-config';
import { getGeneratedQRInformation, TreeNode } from '../api/location-manager';
import styles from './location-tree.module.scss';

interface TreeItemProps {
  id: number;
  name: string;
  selectedLocationNode: number;
  hasCreate: boolean;
  hasUpdate: boolean;
  hasDelete: boolean;
  role: string;
  isFetchingLocationDetails: boolean;
  addLocationClickHandler: () => Promise<void>;
  editLocationClickHandler: () => Promise<void>;
  deleteLocationHandler: () => void;
  locationTree: TreeNode[];
  level: number;
}

const MAX_LEVEL = 4;

const TreeItemLabel = ({
  id,
  name,
  selectedLocationNode,
  hasCreate,
  hasUpdate,
  hasDelete,
  role,
  isFetchingLocationDetails,
  addLocationClickHandler,
  editLocationClickHandler,
  deleteLocationHandler,
  locationTree,
  level,
}: TreeItemProps) => {
  const isSelected = selectedLocationNode === id || name === 'Location';
  const isLocationRoot = name === 'Location';
  const isSuperUser = role === 'superuser';
  const isBasicUser = role === 'basic';

  const renderActionButtons = () => {
    if (!isSelected) return null;
    return (
      <div draggable={false} className={styles['tree-item-action']}>
        {renderCreateButton()}
        {!isLocationRoot && renderEditButton()}
        {level > 1 && !isLocationRoot && renderDeleteButton()}
      </div>
    );
  };

  const renderCreateButton = () => {
    if ((hasCreate && isSuperUser) || (hasCreate && isBasicUser && !isLocationRoot)) {
      return (
        <ActionButton
          icon={<AddPlusIcon />}
          onClick={addLocationClickHandler}
          disabled={isFetchingLocationDetails}
        />
      );
    }
    return null;
  };

  const renderEditButton = () => {
    return (
      hasUpdate && (
        <ActionButton
          icon={<EditIcon />}
          onClick={editLocationClickHandler}
          disabled={isFetchingLocationDetails}
        />
      )
    );
  };

  const renderDeleteButton = () => {
    return (
      hasDelete && (
        <ActionButton
          icon={<TrashDeleteIcon />}
          onClick={deleteLocationHandler}
          disabled={isFetchingLocationDetails}
        />
      )
    );
  };

  return (
    <div draggable={false} id={id.toString()} className={styles['tree-item-label']}>
      <span draggable={false} title={name} id={id.toString()}>
        {name}
      </span>
      {renderActionButtons()}
    </div>
  );
};

interface ActionButtonProps {
  icon: React.ReactNode;
  onClick: React.MouseEventHandler<HTMLButtonElement> | undefined;
  disabled: boolean;
}

const ActionButton = ({ icon, onClick, disabled }: ActionButtonProps) => (
  <Button
    draggable={false}
    className={styles['tree-action-button']}
    icon={icon}
    disabled={disabled}
    onClick={onClick}
  />
);

interface LocationTreeProps {
  showTargetBox: string[];
  selectedLocationNode: string | null;
  locationTree: TreeNode[] | null;
  locationSearchInput: string | number | readonly string[] | undefined;
  expandedItems: string[];
  isFetchingLocationDetails: boolean;
  locationSearchInputChangeHandler: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedLocationNodeHandler: (
    _event: React.SyntheticEvent<Element, Event>,
    nodeIds: string
  ) => void;
  addLocationClickHandler: () => Promise<void>;
  editLocationClickHandler: () => Promise<void>;
  deleteLocationHandler: () => void;
  onDragStart: (e: React.MouseEvent<HTMLLIElement, MouseEvent>, id: number) => void;
  onDrop?: React.DragEventHandler<HTMLLIElement> | undefined;
  onDragOver: (e: React.DragEvent<HTMLLIElement>, id: string) => void;
  onDragEnd: () => void;
  expandItem: React.MouseEventHandler<HTMLSpanElement>;
  collapseItem: React.MouseEventHandler<HTMLSpanElement>;
}

export default function LocationTree({
  expandedItems,
  selectedLocationNode,
  locationTree,
  locationSearchInput,
  isFetchingLocationDetails,
  locationSearchInputChangeHandler,
  selectedLocationNodeHandler,
  addLocationClickHandler,
  editLocationClickHandler,
  deleteLocationHandler,
  onDragStart,
  onDrop,
  onDragOver,
  onDragEnd,
  expandItem,
  collapseItem,
}: LocationTreeProps) {
  const printQRDate = new Date();
  const {
    colors: { neutralTextTitleHeading },
  } = useContext(ThemeContext);
  const { hasPermission, userData } = useContext(AuthCtx);
  const { hasCreate, hasRead, hasUpdate, hasDelete } = {
    hasCreate: hasPermission('locationmanager', 'create'),
    hasRead: hasPermission('locationmanager', 'read'),
    hasUpdate: hasPermission('locationmanager', 'update'),
    hasDelete: hasPermission('locationmanager', 'delete'),
  };
  const scrollableContainerRef = useRef<HTMLDivElement>(null);
  const [printModal, setPrintModal] = useState(false);
  const { data, setFilter } = useGetFilter({});

  const { assetIds, locationIds } = data;

  const { data: qrList } = useQuery({
    queryKey: ['QR_LOCATION_EQUIPMENT', assetIds, locationIds],
    queryFn: async () => {
      const locationInput =
        locationIds && locationIds.length > 0 ? `{${locationIds.map(Number).join(',')}}` : null;
      const equipmentInput =
        assetIds && assetIds.length > 0 ? `{${assetIds.map(Number).join(',')}}` : null;
      const data = await getGeneratedQRInformation({
        locationIds: locationInput,
        assetIds: equipmentInput,
      });

      return data;
    },
    enabled: hasRead && printModal,
    meta: {
      toastId: ['QR_LOCATION_EQUIPMENT', assetIds, locationIds],
    },
  });

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>) => {
    const { clientY } = e;
    if (scrollableContainerRef && scrollableContainerRef.current) {
      const rect = scrollableContainerRef.current.getBoundingClientRect();
      const isNearTop = clientY < rect.top + 100;
      const isNearBottom = clientY > rect.bottom - 100;

      if (isNearTop) {
        scrollableContainerRef.current.scrollTop -= 5;
      } else if (isNearBottom) {
        scrollableContainerRef.current.scrollTop += 5;
      }
    }
  };

  const generateTree = (
    node: TreeNode,
    selectedLocationNode: string | null,
    locationTree: TreeNode[],
    level: number = 0
  ) => {
    const { id, name, childs } = node;

    return (
      <div key={id}>
        <TreeItem
          onMouseDown={(e) => name !== 'Location' && onDragStart(e, id)}
          onFocusCapture={(e) => e.stopPropagation()}
          draggable={name !== 'Location' && hasUpdate}
          onDragOver={(e) => {
            handleDragOver(e);
            e.preventDefault();
            const targetElement = e.target as HTMLLIElement;
            if (parseInt(targetElement.id) === id) {
              e.currentTarget.style.transition = 'background-color 0.5s ease';
              e.currentTarget.style.background = COLOR.backgroundLow;
            }
            onDragOver(e, id.toString());
          }}
          onDragLeave={(e) => {
            e.currentTarget.style.background = '';
          }}
          collapseIcon={
            <span
              className={styles.expand__collapse__icon}
              id={id.toString()}
              onClick={collapseItem}
            >
              <ChevronDownIcon />
            </span>
          }
          expandIcon={
            <span className={styles.expand__collapse__icon} id={id.toString()} onClick={expandItem}>
              <ChevronRightIcon />
            </span>
          }
          onDragEnd={() => onDragEnd()}
          onDrop={(e) => {
            e.currentTarget.style.background = '';
            onDrop && onDrop(e);
          }}
          sx={{
            '& .Mui-selected': {
              backgroundColor:
                name !== 'Location'
                  ? `${COLOR.backgroundHigh} !important`
                  : 'transparent !important',
              height: 30,
              color: neutralTextTitleHeading,
              borderRadius: 2,
              border: `2px solid ${COLOR.brandBorderDefaultPrimary}`,
            },
            '&   .MuiTreeItem-content': {
              color: neutralTextTitleHeading,
              height: 30,
              cursor: 'auto !!important',
            },
            '&   .MuiTreeItem-content:hover': {
              backgroundColor:
                name !== 'Location'
                  ? `${COLOR.backgroundHigh} !important`
                  : 'transparent !important',
              height: 30,
              color: neutralTextTitleHeading,
              borderRadius: 2,
            },
          }}
          key={id}
          nodeId={id.toString()}
          label={
            <TreeItemLabel
              id={id}
              isFetchingLocationDetails={isFetchingLocationDetails}
              name={name}
              role={userData?.role ?? 'basic'}
              selectedLocationNode={parseInt(selectedLocationNode!)}
              hasUpdate={hasUpdate}
              hasDelete={hasDelete}
              hasCreate={hasCreate}
              editLocationClickHandler={editLocationClickHandler}
              deleteLocationHandler={deleteLocationHandler}
              addLocationClickHandler={addLocationClickHandler}
              locationTree={locationTree}
              level={level}
            />
          }
        >
          {childs &&
            childs.map((child) =>
              generateTree(child, selectedLocationNode, locationTree, level + 1)
            )}
        </TreeItem>
      </div>
    );
  };

  const ref = useRef<CoreFilterProviderRef>(null);

  const handleApplySelectLocPrint = () => {
    if (!ref.current) return;

    const data = ref.current.getData();
    setFilter((prev) => ({
      ...prev,
      data,
    }));

    if (data.locationIds && data.locationIds.length === 0 && data.assetIds?.length === 0) {
      toast.error('Please select at least one location!');
      return;
    }
    setPrintModal(true);
  };

  return (
    <Filter onDataChange={() => { }} setFilter={() => { }} data={data} isReady={true as boolean}>
      <Container
        background={'none'}
        title={t('common.location')}
        icon
        className={styles['location-container']}
        rightTopComponent={
          hasRead && (
            <>
              <FilterDrawerToggleButton>
                <Button icon={<QrCode />}>{t('common.print_qr')}</Button>
              </FilterDrawerToggleButton>
              <FilterCtx.Consumer>
                {(ctx) => {
                  if (ctx === null) throw Error('Null FilterCtx');

                  const { open, setOpen, data } = ctx;
                  return (
                    <Drawer
                      //TODO: translate this
                      title={'Select Location & Equipment'}
                      icon={<FilterFunnelFill />}
                      open={open}
                      onClose={() => setOpen(false)}
                      variant={'apply'}
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleApplySelectLocPrint();
                      }}
                    >
                      <FilterDrawerContainer>
                        <CoreFilterProvider data={data} ref={ref}>
                          <FilterTree />
                        </CoreFilterProvider>
                      </FilterDrawerContainer>
                    </Drawer>
                  );
                }}
              </FilterCtx.Consumer>
            </>
          )
        }
      >
        <div className={styles['location-search']}>
          <Input
            suffix={<Search />}
            placeholder={t('common.search')}
            value={locationSearchInput}
            onChange={locationSearchInputChangeHandler}
            wrapperProps={{
              className: styles.search,
            }}
            background="dark"
          />
        </div>
        <div ref={scrollableContainerRef} className={styles['location-tree']}>
          <TreeView
            className={styles['tree-view']}
            selected={selectedLocationNode}
            expanded={expandedItems}
            onNodeSelect={selectedLocationNodeHandler}
          >
            {locationTree &&
              locationTree.map((node) => generateTree(node, selectedLocationNode, locationTree))}
          </TreeView>
        </div>
        <FilterCtx.Consumer>
          {(ctx) => {
            if (ctx === null) throw Error('Null FilterCtx');

            const { setOpen } = ctx;

            return (
              <PrintConfig
                backComponent={
                  <ArrowBackIcon
                    onClick={() => setPrintModal(false)}
                    style={{ cursor: 'pointer' }}
                  />
                }
                infoMessage={
                  <div>
                    <span>
                      {t(
                        'common.select_location_equipment_info',
                        String(qrList && qrList.length > 0 ? qrList[0].length : 0),
                        String(qrList && qrList.length > 0 ? qrList[1].length : 0)
                      )}
                    </span>
                  </div>
                }
                fileName={`Location_and_Equipment_Barcode_Print_${printQRDate
                  .toLocaleDateString('en-GB')
                  .replace(/\//g, '')}`}
                onCancel={() => {
                  setPrintModal(false);
                  setOpen(false);
                  setFilter((prev) => ({
                    ...prev,
                    data: {
                      locationIds: null,
                      assetIds: [],
                    },
                  }));
                }}
                open={printModal}
                qrList={qrList ?? []}
              />
            );
          }}
        </FilterCtx.Consumer>
      </Container>
    </Filter>
  );
}

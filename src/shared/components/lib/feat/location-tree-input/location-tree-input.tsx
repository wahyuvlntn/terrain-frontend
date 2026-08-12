import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { TreeView } from '@mui/x-tree-view/TreeView';
import {
  ChevronDown as ChevronDownIcon,
  ChevronRight as ChevronRightIcon,
  SaveFill as SaveFillIcon,
  Search,
} from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import { useContext } from 'react';

import {
  Button,
  COLOR,
  Input,
  Popup,
  ThemeContext,
} from '../../..';
import { TreeNode } from './location-tree-input.api';
import { useLocationTree } from './location-tree-input.hook';
import styles from './location-tree-input.module.scss';

interface LocationTreeInputProps {
  title: string;
  icon: React.ReactNode;
  open: boolean;
  submitting?: boolean;
  locationId?: number | null;
  initialExpandedItems?: string[];
  initialSelectedNode?: string;
  initialSelectedParent?: string;
  withMaster?: boolean;
  onClose: () => void;
  onSave: () => void;
  onSubmit?: () => void;
}

export const LocationTreeInput = ({
  title,
  icon,
  open,
  submitting,
  locationId,
  initialExpandedItems,
  initialSelectedNode,
  initialSelectedParent,
  withMaster,
  onClose,
  onSave,
  onSubmit,
}: LocationTreeInputProps) => {
  const {
    locationTree,
    expandedItems,
    selectedLocationNode,
    locationSearchInput,
    locationSearchInputChangeHandler,
    expandNode,
    collapseNode,
    selectedLocationNodeHandler,
  } = useLocationTree(
    initialExpandedItems,
    initialSelectedNode,
    initialSelectedParent,
    locationId
  );

  const masterTree: TreeNode[] | null | undefined = [
    { id: -1, name: 'Location', childs: locationTree ?? undefined },
  ];

  const {
    colors: { neutralTextTitleHeading },
  } = useContext(ThemeContext);

  const generateTree = (
    node: TreeNode,
    selectedLocationNode: string | null | undefined
  ) => {
    const { id, name, childs } = node;
    return (
      <div key={id}>
        <TreeItem
          collapseIcon={
            <ChevronDownIcon
              id={id ? id.toString() : ''}
              onClick={expandNode}
            />
          }
          expandIcon={
            <ChevronRightIcon
              id={id ? id.toString() : ''}
              onClick={collapseNode}
            />
          }
          style={{
            cursor: 'pointer',
          }}
          sx={{
            '& .Mui-selected': {
              backgroundColor: `${COLOR.backgroundLow} !important`,
              height: 30,
              color: neutralTextTitleHeading,
              borderRadius: 2,
              border: `2px solid ${COLOR.brandSurfaceDefaultPrimary}`,
            },
            '&   .MuiTreeItem-content': {
              color: neutralTextTitleHeading,
              height: 30,
              cursor: 'auto !!important',
            },
            '&   .MuiTreeItem-content:hover': {
              backgroundColor: `${COLOR.backgroundLow} !important`,
              height: 30,
              color: neutralTextTitleHeading,
              borderRadius: 2,
            },
          }}
          key={id}
          nodeId={id ? id.toString() : ''}
          label={
            <div
              id={id ? id.toString() : ''}
              className={styles['tree-item-label']}
            >
              <span title={name} id={id ? id.toString() : ''}>
                {name}
              </span>
            </div>
          }
        >
          {childs &&
            childs.map((child) => generateTree(child, selectedLocationNode))}
        </TreeItem>
      </div>
    );
  };

  return (
    <Popup
      title={title}
      icon={icon}
      onClose={onClose}
      open={open}
      onSubmit={onSubmit}
      submitting={submitting}
      background="none-without-padding"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className={styles['location-tree-input']}>
          <div className={styles['location-search']}>
            <Input
              suffix={<Search />}
              placeholder={t('common.search')}
              value={locationSearchInput}
              onChange={locationSearchInputChangeHandler}
            />
          </div>
          <TreeView
            className={styles['tree-view']}
            selected={selectedLocationNode}
            expanded={expandedItems}
            onNodeSelect={selectedLocationNodeHandler}
          >
            {withMaster
              ? masterTree &&
                masterTree.map((node) =>
                  generateTree(node, selectedLocationNode)
                )
              : locationTree &&
                locationTree.map((node) =>
                  generateTree(node, selectedLocationNode)
                )}
          </TreeView>
        </div>
        <div
          style={{
            display: 'flex',
            width: '100%',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          <Button
            onClick={(e) => {
              e.preventDefault();
              onSave();
            }}
            icon={<SaveFillIcon />}
            className={styles['save-location-input']}
          >
            <span>{t('common.save')}</span>
          </Button>
        </div>
      </div>
    </Popup>
  );
};

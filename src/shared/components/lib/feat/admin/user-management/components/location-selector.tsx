/* eslint-disable simple-import-sort/imports */
import styles from './location-selector.module.scss';
import { ChevronDown, ChevronRight } from '@digital-twin/icons';
// import { useState } from 'react';
import { TreeView } from '@mui/x-tree-view/TreeView';
import { useLocationSelector } from './location-selector.hooks';

import { COLOR } from '../../../../color';
import { SelectedLocations, TreeNode } from './type';
import RenderTree from './render-tree';
import { Search } from '@digital-twin/components';
import { useEffect, useState } from 'react';

const LocationSelector = (props: {
  onClose: () => void /* Popup close handler */;
  open: boolean /* Popup state (if true, than opened) */;
  initialLocations: SelectedLocations[] /* Initial selected location */;
  handleSave: (locations: SelectedLocations[]) => void /* Save handler */;
  locationTree: TreeNode[] /* Tree data state */;
  search: string;
  onSearchChange: (value: string) => void;
}) => {
  const hooks = useLocationSelector(
    props.initialLocations,
    props.open,
    props.handleSave,
    props.onClose,
    props.locationTree
  );

  return (
    // <Popup
    //   title="Select Location"
    //   open={props.open}
    //   onClose={props.onClose}
    //   icon={<Map />}
    // >

    // </Popup>
    <div
      className={styles['content']}
      onClick={(e) => {
        e.stopPropagation();
      }}
      ref={hooks.containerRef}
    >
      <Search
        placeholder="Search..."
        timeoutMs={400}
        onChange={props.onSearchChange}
        value={props.search}
      />
      {/* Show the tree data when it's not empty */}
      {hooks.treeData.length > 0 && (
        <TreeView
          defaultCollapseIcon={<ChevronDown />}
          defaultExpandIcon={<ChevronRight />}
          expanded={hooks.expanded}
          onNodeToggle={hooks.handleToggle}
          className={styles['tree-view']}
          sx={{
            /* Overwrite tree component style */
            '& .Mui-selected': {
              backgroundColor: `${COLOR.backgroundLowest} !important`,
              height: 30,
              color: COLOR.neutralTextTitleHeading,
              borderRadius: 2,
            },
            '&   .MuiTreeItem-content': {
              color: COLOR.neutralTextTitleHeading,
              height: 30,
              cursor: 'auto !!important',
            },
            '&   .MuiTreeItem-content:hover': {
              backgroundColor: `${COLOR.backgroundLowest} !important`,
              height: 30,
              color: COLOR.neutralTextTitleHeading,
              borderRadius: 2,
            },
          }}
        >
          {/* Map the data recursively */}
          {hooks.treeData.map((data) => (
            <RenderTree
              key={data.id}
              node={data}
              handleCheckboxChange={hooks.handleCheckboxChange}
              handleDescendantsCheckboxChange={
                hooks.handleDescendantsCheckboxChange
              }
            />
          ))}
        </TreeView>
      )}
      {/* <div className={styles['buttons']}>
        <Button
          color="default-primary"
          icon={<SaveFill />}
          onClick={hooks.onSave}
        >
          {t('common.save')}
        </Button>
      </div> */}
    </div>
  );
};

export default LocationSelector;

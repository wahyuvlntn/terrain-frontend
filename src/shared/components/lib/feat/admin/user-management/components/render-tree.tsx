/* eslint-disable simple-import-sort/imports */
import { memo } from 'react';
import { TreeNode } from './type';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import styles from './location-selector.module.scss';
import { Checkbox } from '../../../../input';

interface RenderTreeProps {
  node: TreeNode;
  handleCheckboxChange: (id: string, checked: boolean) => void;
  handleDescendantsCheckboxChange: (id: string, checked: boolean) => void;
}

const RenderTree = memo(
  ({
    node,
    handleCheckboxChange,
    handleDescendantsCheckboxChange,
  }: RenderTreeProps) => {
    const childChecks = node?.children?.map((child) => child.checked);

    const hasAtLeastOneChildChecked = childChecks?.some((val) => val === true);
    const allChildChecked = childChecks?.every((val) => val === true);
    const partialChildChecked = hasAtLeastOneChildChecked && !allChildChecked;

    return (
      <TreeItem
        nodeId={node.id}
        label={
          <div
            className={styles['tree-node-label']}
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              value={node?.checked || false}
              indeterminate={partialChildChecked}
              onChange={(_, checked) =>
                handleDescendantsCheckboxChange(node.id, checked)
              }
            />
            <div>{node?.label}</div>
          </div>
        }
      >
        {node?.children &&
          node.children.map((data) => (
            <RenderTree
              key={data.id}
              node={data}
              handleCheckboxChange={handleCheckboxChange}
              handleDescendantsCheckboxChange={handleDescendantsCheckboxChange}
            />
          ))}
      </TreeItem>
    );
  }
);

RenderTree.displayName = 'RenderTree';

export default RenderTree;

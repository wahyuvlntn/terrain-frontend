import {
  TreeItem,
  TreeItemContentProps,
  TreeItemProps,
  useTreeItem,
} from '@mui/x-tree-view/TreeItem';
import { RadioButton } from '@digital-twin/reusables';
import clsx from 'clsx';
import React, { forwardRef, Ref } from 'react';

import { Checkbox } from '../../input';
import styles from './filter--tree-item.module.scss';

export type Selector = 'checkbox' | 'radio' | 'none';
export type SelectorWithAll = Selector | `${Selector}-all`;

const CustomContent = forwardRef(function CustomContent(
  {
    checked,
    selector = 'checkbox',
    ...props
  }: TreeItemContentProps & {
    checked?: boolean;
    onCheckedChange?: (key: string, checked: boolean) => void;
    selector?: Selector;
  },
  ref
) {
  const {
    classes,
    className,
    label,
    nodeId,
    icon: iconProp,
    expansionIcon,
    displayIcon,
  } = props;

  const { disabled, expanded, handleExpansion, preventSelection } =
    useTreeItem(nodeId);

  const icon = iconProp || expansionIcon || displayIcon;

  const handleMouseDown = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    preventSelection(event);
  };

  const handleExpansionClick = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    handleExpansion(event);
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className={clsx(className, styles['custom-content-root'], classes.root, {
        [classes.expanded]: expanded,
        [classes.disabled]: disabled,
      })}
      onMouseDown={handleMouseDown}
      ref={ref as React.Ref<HTMLDivElement>}
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */}
      <div onClick={handleExpansionClick} className={classes.iconContainer}>
        {icon}
      </div>
      <div className={clsx(classes.label, styles['custom-content'])}>
        {selector === 'checkbox' && (
          <Checkbox
            indeterminate={checked === undefined}
            onChange={(_name, checked) =>
              props.onCheckedChange?.(nodeId, checked)
            }
            value={checked ?? false}
          />
        )}
        {selector === 'radio' && (
          <RadioButton
            onChange={(e) => props.onCheckedChange?.(nodeId, e.target.checked)}
            checked={checked ?? true}
          />
        )}

        <span
          title={typeof label === 'string' ? label : undefined}
          className={styles.label}
        >
          {label}
        </span>
      </div>
    </div>
  );
});

export const CustomTreeItem = forwardRef(function CustomTreeItem(
  {
    onCheckedChange,
    selector = 'checkbox',
    ...props
  }: TreeItemProps & {
    checked?: boolean;
    onCheckedChange?: (key: string, checked: boolean) => void;
    selector?: Selector;
  },
  ref: Ref<HTMLLIElement>
) {
  return (
    <TreeItem
      ContentComponent={CustomContent}
      ContentProps={{
        // @ts-expect-error: checked props
        checked: props.checked,
        onCheckedChange: onCheckedChange,
        selector,
      }}
      {...props}
      className={clsx(props.className, 'filter-tree-item')}
      ref={ref}
    />
  );
});

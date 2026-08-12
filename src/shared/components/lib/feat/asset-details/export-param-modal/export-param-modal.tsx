import './export-param-modal.scss';

import { TreeView } from '@mui/x-tree-view';
import {
  TreeItem,
  TreeItemContentProps,
  TreeItemProps,
  useTreeItem,
} from '@mui/x-tree-view/TreeItem';
import {
  Button,
  Checkbox,
  DateTimePicker,
  Input,
  Popup,
} from '@digital-twin/components';
import { t } from '@digital-twin/utils';
import clsx from 'clsx';
import { forwardRef, Ref } from 'react';

import { useExportParamModal } from './export-param-modal.hook';
import styles from './export-param-modal.module.scss';

const CustomContent = forwardRef(function CustomContent(
  {
    checked,
    ...props
  }: TreeItemContentProps & {
    checked?: boolean;
    onCheckedChange?: (key: string, checked: boolean) => void;
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

  const {
    disabled,
    expanded,
    handleExpansion,
    handleSelection,
    preventSelection,
  } = useTreeItem(nodeId);

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

  const handleSelectionClick = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    handleSelection(event);
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
      <div
        onClick={handleSelectionClick}
        className={clsx(classes.label, styles['custom-content'])}
      >
        <Checkbox
          indeterminate={checked === undefined}
          onChange={(_name, checked) =>
            props.onCheckedChange?.(nodeId, checked)
          }
          value={checked ?? false}
        />

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

const CustomTreeItem = forwardRef(function CustomTreeItem(
  {
    onCheckedChange,
    ...props
  }: TreeItemProps & {
    checked?: boolean;
    onCheckedChange?: (key: string, checked: boolean) => void;
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
      }}
      {...props}
      ref={ref}
    />
  );
});

type ExportParamModalProps = {
  open: boolean;
  onClose: () => void;
  assetName: string;
  date: string;
  onExport: (selectedParams: number[]) => void;
};

export const ExportParamModal = ({
  open,
  onClose,
  date,
  assetName,
  onExport,
}: ExportParamModalProps) => {
  const { data, setSelectedParams, selectedParams } = useExportParamModal(open);
  return (
    <Popup
      title={t('common.select_parameter')}
      open={open}
      onClose={onClose}
      width={521}
      background={'none-without-padding'}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className={styles['export-param']}>
          <div className={styles.inputs}>
            <Input
              label={t('common.equipment_name') + ':'}
              readOnly
              value={assetName}
              wrapperProps={{ style: { width: '100%' } }}
            />
            <DateTimePicker
              label={t('common.period') + ':'}
              readOnly
              value={date}
              width={'100%'}
              innerContainerStyle={{
                boxSizing: 'border-box',
                height: 36,
              }}
            />
          </div>
          <TreeView
            expanded={['root']}
            className={clsx(styles.tree, 'export-param-modal')}
          >
            <CustomTreeItem
              nodeId={'root'}
              label={t('common.parameters')}
              checked={
                selectedParams.length === data?.length
                  ? true
                  : selectedParams.length === 0
                  ? false
                  : undefined
              }
              onCheckedChange={(_, checked) =>
                setSelectedParams(
                  checked ? data?.map((item) => item.id) ?? [] : []
                )
              }
            >
              {data?.map(({ id, name }) => (
                <CustomTreeItem
                  key={id}
                  nodeId={id.toString()}
                  label={name}
                  checked={selectedParams.includes(id)}
                  onCheckedChange={(key, checked) =>
                    setSelectedParams((prev) =>
                      checked
                        ? [...prev, id]
                        : prev.filter((item) => id !== item)
                    )
                  }
                />
              ))}
            </CustomTreeItem>
          </TreeView>
        </div>
        <div className={styles.buttons}>
          <Button onClick={onClose} color={'default-secondary'}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => onExport(selectedParams)}>
            {t('common.export')}
          </Button>
        </div>
      </div>
    </Popup>
  );
};

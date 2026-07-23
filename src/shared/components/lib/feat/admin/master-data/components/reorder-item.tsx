import {
  Edit1,
  SixDots,
  TrashDelete,
  UtilityDataQueryExport,
} from '@digital-twin/icons';

import styles from './reorder-item.module.scss';

interface ReorderItemProps {
  hasCreate: boolean;
  hasRead: boolean;
  hasUpdate: boolean;
  hasDelete: boolean;
  label: string;
  id: string;
  orderId: string;
  isDragging: boolean;
  isSelected: boolean;
  editable: boolean;
  reorderEnabled: boolean;
  visible: boolean;
  onSelect: (
    id: string,
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => void;
  onChange: (orderId: string, id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onClick?: (id: string) => void;
}

export function ReorderItem({
  hasCreate,
  hasRead,
  hasUpdate,
  hasDelete,
  label,
  isSelected,
  isDragging,
  id,
  orderId,
  reorderEnabled,
  editable,
  visible,
  onSelect,
  onChange,
  onEdit,
  onDelete,
  onClick,
}: ReorderItemProps) {
  return (
    <div
      id={id}
      onClick={() => onClick && onClick(id)}
      onMouseUp={() => {
        onChange(orderId, id);
      }}
      style={{
        opacity: visible ? 1 : 0.5,
        cursor: isDragging ? 'grabbing' : 'pointer',
      }}
      className={
        styles[
          `${
            !editable && isSelected
              ? 'reorder-item-selected-disabled'
              : !editable && !isSelected
              ? 'reorder-item-disabled'
              : isSelected
              ? 'reorder-item-selected'
              : 'reorder-item'
          }`
        ]
      }
    >
      <div
        id={orderId}
        onMouseDown={(e) =>
          !isDragging && reorderEnabled && editable && onSelect(orderId, e)
        }
        className={styles['reorder-icon']}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        {editable ? (
          <SixDots />
        ) : (
          <UtilityDataQueryExport style={{ width: 32, height: 32 }} />
        )}
      </div>
      <div className={styles['label']}>
        <span
          draggable={false}
          style={{ userSelect: isDragging ? 'none' : 'auto' }}
          title={label}
        >
          {label}
        </span>
      </div>
      {editable &&
        label !== 'Status' &&
        label !== 'MACHINE' &&
        label !== 'MAN' &&
        label !== 'METHOD' &&
        label !== 'MATERIAL' &&
        label !== 'Source' &&
        label !== 'Distribution' &&
        label !== 'Load' && (
          <div className={styles['actions']}>
            {hasUpdate && (
              <Edit1
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(id);
                }}
              />
            )}
            {hasDelete && (
              <TrashDelete
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(id);
                }}
              />
            )}
          </div>
        )}
    </div>
  );
}

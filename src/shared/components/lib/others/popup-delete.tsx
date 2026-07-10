import { TrashDeleteFill } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import clsx from 'clsx';

import { Popup } from '../navigation';
import styles from './popup-delete.module.scss';

interface PopupDeleteProps {
  entityType: string;
  entityName?: string | string[];
  open: boolean;
  onClose: () => void;
  onDelete: () => void;
  deleting?: boolean;
  variant?:
    | 'none'
    | 'reset'
    | 'delete'
    | 'upload'
    | 'apply'
    | 'save'
    | 'add'
    | 'enable'
    | 'sync';
}

export const PopupDelete = ({
  entityType,
  entityName,
  open,
  onClose,
  onDelete,
  deleting,
  variant,
}: PopupDeleteProps) => {
  return (
    <Popup
      icon={<TrashDeleteFill />}
      title={`${t('common.delete')} ${entityType}`}
      open={open}
      onClose={onClose}
      onSubmit={onDelete}
      submitting={deleting}
      variant={variant || 'delete'}
      background="none"
      swapButtonPosition
    >
      <div className={styles['wrapper']}>
        <div
          className={clsx(
            styles['popup-delete'],
            Array.isArray(entityName) && styles['popup-delete--multiples']
          )}
        >
          {Array.isArray(entityName) ? (
            <div className={styles['popup-delete__multiples']}>
              {entityName.map((name, i) => (
                <div key={i} className={styles['popup-delete__row']}>
                  •
                  <span
                    key={i}
                    title={name}
                    className={clsx(
                      styles['popup-delete__entity-name'],
                      styles['ellipsis'],
                      styles['grow-horizontal']
                    )}
                  >
                    {name}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            entityName && (
              <span
                title={entityName}
                className={clsx(
                  styles['popup-delete__entity-name'],
                  styles['ellipsis']
                )}
              >
                "{entityName}"
              </span>
            )
          )}
          <span>
            {`${
              Array.isArray(entityName) && entityName.length > 1
                ? `${t(
                    'common.delete_multiple_confirmation',
                    entityType.toLocaleLowerCase()
                  )}`
                : `${t(
                    'common.delete_single_confirmation',
                    entityType.toLocaleLowerCase()
                  )}`
            }`}
          </span>
        </div>
      </div>
    </Popup>
  );
};

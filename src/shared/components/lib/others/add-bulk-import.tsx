// For cascading classnames
// Icons
import { ChevronDown, Plus, SettingsFill } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import clsx from 'clsx';

// Style
import style from './add-bulk-import.module.scss';
// Components
import { Popover, PopoverContent, PopoverTrigger } from './popover';

interface AddBulkImportProps {
  onAdd: () => void;
  onBulkImport: () => void;
  onSync?: () => void;
  disabled?: boolean;
  variant?: 'add' | 'setup';
}

export const AddBulkImport = ({
  onAdd,
  onBulkImport,
  onSync,
  disabled,
  variant = 'add',
}: AddBulkImportProps) => {
  return (
    <div className={style['container']}>
      <button
        className={clsx(
          style['button'],
          style['button--add'],
          disabled && style['button--disabled']
        )}
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
        disabled={disabled}
        type="button"
      >
        {variant === 'setup' ? (
          <SettingsFill className={style['icon']} />
        ) : (
          <Plus className={style['icon']} />
        )}
        <span style={{ whiteSpace: 'nowrap' }}>
          {variant === 'setup' ? t('common.setup') : t('common.add')}
        </span>
      </button>
      <Popover placement="bottom-end">
        <PopoverTrigger>
          <button
            className={clsx(
              style['button'],
              style['button--more'],
              disabled && style['button--disabled']
            )}
            disabled={disabled}
            type="button"
          >
            <ChevronDown className={style['icon']} />
          </button>
        </PopoverTrigger>
        <PopoverContent className={style['actions']}>
          <div
            className={style['action']}
            onClick={(e) => {
              e.stopPropagation();
              onBulkImport();
            }}
          >
            {t('common.bulk_import')}
          </div>
          {onSync ? (
            <div
              className={style['action']}
              onClick={(e) => {
                e.stopPropagation();
                onSync();
              }}
            >
              {t('common.sync_to_all_extended_models')}
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
};

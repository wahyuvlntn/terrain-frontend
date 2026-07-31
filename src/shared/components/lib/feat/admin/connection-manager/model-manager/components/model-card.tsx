import { TrashDelete } from '@digital-twin/icons';
import { t, useLanguageSwitcher } from '@digital-twin/utils';
import { Card } from '@digital-twin/reusables';
import clsx from 'clsx';
import { useContext } from 'react';

import { ThemeContext } from '../../../theme-editor';
import { ModelEntryType } from '../schemas';
import style from './model-card.module.scss';

// Custom component
export const ModelCard = ({
  isSelected,
  entry,
  onSelect,
  onDelete,
  showDelete,
}: {
  isSelected: boolean;
  entry: ModelEntryType;
  onSelect: (entry: ModelEntryType) => void;
  onDelete: (entry: ModelEntryType) => void;
  showDelete?: boolean;
}) => {
  useLanguageSwitcher();

  return (
    <Card
      type="strip"
      className={clsx(
        style['model-card'],
        isSelected && style['model-card--selected']
      )}
      isSelected={isSelected}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(entry);
      }}
    >
      <div className={style['model-card__body']}>
        <div className={style['model-card__row']}>
          <span className={style['model-card__name']} title={entry.name}>
            {entry.name}
          </span>
          {showDelete ? (
            <TrashDelete
              className={style['model-card__delete']}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(entry);
              }}
            />
          ) : null}
        </div>
        <div className={style['model-card__row']}>
          <span
            className={style['model-card__row__item']}
            title={`${t('common.brand')}: ${entry.brand}`}
          >{`${t('common.brand')}: ${entry.brand}`}</span>
          <span
            className={clsx(
              style['model-card__row__item'],
              style['model-card__row__item--right']
            )}
            title={`${t(
              'common.equipment'
            )}: ${entry.equipment_counts.toLocaleString()}`}
          >{`${t(
            'common.equipment'
          )}: ${entry.equipment_counts.toLocaleString()}`}</span>
        </div>
        <div className={style['model-card__row']}>
          <span
            className={style['model-card__row__item']}
            title={`${t('common.series')}: ${entry.series}`}
          >{`${t('common.series')}: ${entry.series}`}</span>
          <span
            className={clsx(
              style['model-card__row__item'],
              style['model-card__row__item--right']
            )}
            title={`${t('common.base_model')}: ${entry.base_model || '---'}`}
          >{`${t('common.base_model')}: ${entry.base_model || '---'}`}</span>
        </div>
      </div>
    </Card>

    // <div
    //   className={style['model-card']}
    //   onClick={(e) => {
    //     e.stopPropagation();
    //     onSelect(entry);
    //   }}
    // >
    //   <div
    //     className={clsx(
    //       style['model-card__body'],
    //       isSelected && style['model-card__body--selected']
    //     )}
    //   >
    //     <div className={style['model-card__row']}>
    //       <span className={style['model-card__name']} title={entry.name}>
    //         {entry.name}
    //       </span>
    //       {showDelete ? (
    //         <TrashDelete
    //           className={style['model-card__delete']}
    //           onClick={(e) => {
    //             e.stopPropagation();
    //             onDelete(entry);
    //           }}
    //         />
    //       ) : null}
    //     </div>
    //     <div className={style['model-card__row']}>
    //       <span
    //         className={style['model-card__row__item']}
    //         title={`Brand: ${entry.brand}`}
    //       >{`Brand: ${entry.brand}`}</span>
    //       <span
    //         className={clsx(
    //           style['model-card__row__item'],
    //           style['model-card__row__item--right']
    //         )}
    //         title={`Equipment: ${entry.equipment_counts.toLocaleString()}`}
    //       >{`Equipment: ${entry.equipment_counts.toLocaleString()}`}</span>
    //     </div>
    //     <div className={style['model-card__row']}>
    //       <span
    //         className={style['model-card__row__item']}
    //         title={`Series: ${entry.series}`}
    //       >{`Series: ${entry.series}`}</span>
    //       <span
    //         className={clsx(
    //           style['model-card__row__item'],
    //           style['model-card__row__item--right']
    //         )}
    //         title={`Base Model: ${entry.base_model || '---'}`}
    //       >{`Base Model: ${entry.base_model || '---'}`}</span>
    //     </div>
    //   </div>
    // </div>
  );
};

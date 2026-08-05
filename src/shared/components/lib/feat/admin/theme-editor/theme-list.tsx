import { Edit1, Paint, Plus, Reload } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import { InfiniteData } from '@tanstack/react-query';
import { FormEventHandler, useState } from 'react';

import { Button, COLOR, Loading, PopupDelete, Search } from '../../../..';
import { TGetThemes } from './api';
import { ThemeCard } from './theme-card';
import styles from './theme-list.module.scss';

type ThemeListProps = {
  data?: InfiniteData<TGetThemes>;
  onLoadMore: () => void;
  selectedThemeId: number;
  selectedThemeIsEditable: boolean;
  onThemeClick: (id: number) => void;
  onNewBtnClick: () => void;
  onDeleteClick: () => Promise<void>;
  onEditBtnClick: () => void;
  onResetBtnClick: () => void;
  search: string;
  onSearchChange: (search: string) => void;
  onApply: FormEventHandler<HTMLFormElement>;
  isPending: boolean;
  isLoading: boolean;
  isPendingSubmit: boolean;
  isPendingReset: boolean;
  hasDeletePermission: boolean;
  hasEditPermission: boolean;
  hasCreatePermission: boolean;
};

export const ThemeList = ({
  data,
  selectedThemeId,
  selectedThemeIsEditable,
  onThemeClick,
  onNewBtnClick,
  onDeleteClick,
  onEditBtnClick,
  onResetBtnClick,
  onLoadMore,
  search,
  onSearchChange,
  onApply,
  isPending,
  isLoading,
  isPendingSubmit,
  isPendingReset,
  hasDeletePermission,
  hasCreatePermission,
  hasEditPermission,
}: ThemeListProps) => {
  const [openDelete, setOpenDelete] = useState({
    open: false,
    name: '',
  });

  return (
    <>
      <PopupDelete
        entityType={'Theme'}
        entityName={openDelete.name}
        open={openDelete.open}
        onClose={() =>
          setOpenDelete({
            open: false,
            name: '',
          })
        }
        onDelete={() => {
          onDeleteClick().then(() => setOpenDelete({ open: false, name: '' }));
        }}
        deleting={isPending}
      />
      <form className={styles['theme-list']} onSubmit={onApply}>
        <div className={styles.search}>
          <Search
            width={'100%'}
            placeholder={t('common.search')}
            value={search}
            onChange={onSearchChange}
            background={'dark'}
            wrapperClassName={styles['bg-dark']}
          />
          {hasCreatePermission ? (
            <Button
              type={'button'}
              onClick={onNewBtnClick}
              icon={<Plus />}
              className={styles['button-new']}
            >
              {t('common.new')}
            </Button>
          ) : null}
        </div>
        <div
          className={styles.list}
          onScroll={(e) => {
            const target = e.target as HTMLDivElement;
            const bottom =
              target.scrollHeight - target.scrollTop === target.clientHeight;
            if (bottom) {
              onLoadMore();
            }
          }}
        >
          <Loading isLoading={isLoading} />
          {data?.pages.map(({ data }) =>
            data.map((theme) => (
              <ThemeCard
                key={theme.id}
                name={theme.name}
                colors={theme.colors}
                selected={theme.id === selectedThemeId}
                onClick={() => onThemeClick(theme.id)}
                onDelete={
                  theme.id === selectedThemeId && theme.isEditable
                    ? () => setOpenDelete({ open: true, name: theme.name })
                    : undefined
                }
                hasDeletePermission={hasDeletePermission}
              />
            ))
          )}
        </div>
        <div className={styles.buttons}>
          {hasEditPermission ? (
            <Button
              type={'button'}
              onClick={onResetBtnClick}
              icon={<Reload />}
              color='default-secondary'
              style={{
                color: COLOR.neutralTextTitleHeading,
              }}
              disabled={isPendingReset}
            >
              {t('common.reset')}
            </Button>
          ) : null}
          <div className={styles['edit-apply-buttons']}>
            {selectedThemeId && selectedThemeIsEditable && hasEditPermission ? (
              <Button
                type={'button'}
                onClick={onEditBtnClick}
                icon={<Edit1 />}
                color={'default-secondary'}
              >
                {t('common.edit')}
              </Button>
            ) : null}
            {hasEditPermission ? (
              <Button
                type={'submit'}
                icon={<Paint />}
                disabled={isPendingSubmit}
              >
                {t('common.apply')}
              </Button>
            ) : null}
          </div>
        </div>
      </form>
    </>
  );
};

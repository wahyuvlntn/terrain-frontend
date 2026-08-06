import { Image, Layout, Palette } from '@digital-twin/icons';
import { useTranslate } from '@digital-twin/utils';
import clsx from 'clsx';
import { ComponentType, LazyExoticComponent, useRef, useState } from 'react';

import { Container } from '../../../layout';
import { Preview } from './preview';
import {
  ChangeColorsHandle,
  ThemeDetails,
  THideStatusColors,
} from './theme-details';
import { useThemeEditor } from './theme-editor.hook';
import styles from './theme-editor.module.scss';
import { ThemeList } from './theme-list';
import { UploadLogo } from './upload-logo';

export type ThemeEditorProps = {
  PreviewWebContent: LazyExoticComponent<ComponentType<{ onLoad: () => void }>>;
  hideStatusColors?: THideStatusColors;
};

export const ThemeEditor = ({
  PreviewWebContent,
  hideStatusColors,
}: ThemeEditorProps) => {
  const {
    data,
    fetchNextPage,
    setActiveTheme,
    selectedThemeId,
    selectedThemeIsEditable,
    onReset,
    onSubmit,
    onResetLogo,
    control,
    onDelete,
    search,
    handleSearchChange,
    isPending,
    isLoading,
    isPendingReset,
    onPreviewLoaded,
    hasDeletePermission,
    hasEditPermission,
    hasCreatePermission,
    isPendingSubmit,
  } = useThemeEditor();
  const [mode, setMode] = useState<'EDIT' | 'ADD' | 'READ'>('READ');
  const { t } = useTranslate();
  const themeDetailsRef = useRef<ChangeColorsHandle>(null);
  const handleOnPreviewLoaded = () => {
    if (mode === 'READ') onPreviewLoaded();
    else themeDetailsRef.current?.changeColors();
  };
  const handleBackNavClick = () => {
    setMode('READ');
    onPreviewLoaded();
  };

  return (
    <div className={styles['theme-editor']}>
      <Container className={styles.setup} background={'none'}>
        <div className={styles['field-container']}>
          <div className={styles['field-header']}>
            <Image />
            <span>{t('common.company_logo')}</span>
          </div>
          <UploadLogo
            onResetLogo={onResetLogo}
            control={control}
            registered={'logo'}
            hasEditPermission={hasEditPermission ?? false}
          />
        </div>
        <div className={clsx(styles['field-container'], styles['theme-list'])}>
          <div className={styles['field-header']}>
            <Palette />
            <span>{t('common.color_palette')}</span>
          </div>
          {mode === 'READ' ? (
            <ThemeList
              data={data}
              onLoadMore={fetchNextPage}
              selectedThemeId={selectedThemeId}
              selectedThemeIsEditable={selectedThemeIsEditable ?? false}
              onThemeClick={setActiveTheme}
              onNewBtnClick={() => setMode('ADD')}
              onDeleteClick={async () => {
                await onDelete(selectedThemeId);
              }}
              onEditBtnClick={() => setMode('EDIT')}
              onResetBtnClick={onReset}
              search={search}
              onSearchChange={handleSearchChange}
              onApply={onSubmit}
              isPending={isPending}
              isLoading={isLoading}
              isPendingSubmit={isPendingSubmit}
              isPendingReset={isPendingReset}
              hasDeletePermission={hasDeletePermission ?? false}
              hasEditPermission={hasEditPermission ?? false}
              hasCreatePermission={hasCreatePermission ?? false}
            />
          ) : (
            <ThemeDetails
              onBackNavClick={handleBackNavClick}
              id={mode === 'EDIT' ? selectedThemeId : undefined}
              ref={themeDetailsRef}
              hideStatusColors={hideStatusColors}
            />
          )}
        </div>
      </Container>

      <Container
        className={styles.preview}
        background={'none'}
        title={t('common.preview')}
        icon={<Layout />}
      >
        <Preview
          onLoad={handleOnPreviewLoaded}
          WebContent={PreviewWebContent}
        />
      </Container>
    </div>
  );
};

import { Location } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';

import { Drawer, Input, PopupDelete } from '../../../../../index';
import { useDataCategory } from './data-category.hook';
import styles from './data-category.module.scss';
import { ReorderableList } from './reorderable-list';

export function DataCategory() {
  const {
    hasCreate,
    hasRead,
    hasUpdate,
    hasDelete,
    control,
    showForm,
    showDelete,
    categorySearch,
    categoryList,
    categoryListRef,
    categoryRef,
    selectedCategory,
    selectedDragCategory,
    isDragging,
    isPending,
    isAddPending,
    isDeletePending,
    inputDisabled,
    group,
    setShowForm,
    setShowDelete,
    handleCategoryClick,
    handleChangeOrder,
    handleCancelSelection,
    handleSearchInputChange,
    showEditForm,
    handleFormSubmit,
    showDeleteModal,
    confirmDelete,
    showAddForm,
  } = useDataCategory();
  return (
    <>
      <ReorderableList
        hasCreate={hasCreate}
        hasRead={hasRead}
        hasUpdate={hasUpdate}
        hasDelete={hasDelete}
        title={t('common.data_categories')}
        reorderEnabled={hasUpdate}
        icon={<Location />}
        editable={group !== 'asset' && group !== 'electricity'}
        searchInputValue={categorySearch ?? ''}
        inputDisabled={inputDisabled}
        onAdd={showAddForm}
        list={categoryList}
        onEdit={showEditForm}
        onDelete={showDeleteModal}
        listContainerRef={categoryListRef}
        selectedListRef={categoryRef}
        selectedItem={selectedCategory}
        selectedDraggedList={selectedDragCategory!}
        isDragging={isDragging}
        onDragStart={handleCategoryClick}
        onSearchInputChange={handleSearchInputChange}
        handleChangeOrder={handleChangeOrder}
        handleCancelSelection={handleCancelSelection}
      />
      <Drawer
        icon={null}
        onClose={() => setShowForm((prev) => !prev)}
        onSubmit={handleFormSubmit}
        submitting={isPending || isAddPending}
        open={showForm}
        title={t('common.field')}
      >
        <div className={styles['edit-form']}>
          <Input
            readOnly
            registered="groupName"
            control={control}
            type={'string'}
            label={t('common.group') + ':'}
          />
          <Input
            registered="categoryName"
            control={control}
            type={'string'}
            label={t('common.category') + ':'}
          />
        </div>
      </Drawer>

      <PopupDelete
        deleting={isDeletePending}
        entityName={
          categoryList.find((category) => category.id === selectedCategory)
            ?.name ?? ''
        }
        entityType="Category"
        onClose={() => setShowDelete((prev) => !prev)}
        onDelete={confirmDelete}
        open={showDelete}
      />
    </>
  );
}

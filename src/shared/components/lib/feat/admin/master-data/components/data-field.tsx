import { UtilityDataQueryExport } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';

import { Drawer, Input, PopupDelete } from '../../../../../index';
import { useDataField } from './data-field.hook';
import styles from './data-field.module.scss';
import { ReorderableList } from './reorderable-list';

export function DataField() {
  const {
    hasCreate,
    hasRead,
    hasUpdate,
    hasDelete,
    showForm,
    showDelete,
    control,
    selectedField,
    selectedDragField,
    isDragging,
    fieldSearch,
    fieldList,
    fieldRef,
    fieldListRef,
    isPending,
    isDeletePending,
    inputDisabled,
    group,
    handleChangeOrder,
    handleFieldDrag,
    handleFieldInputChange,
    showEditForm,
    handleFormSubmit,
    showDeleteModal,
    showAddForm,
    confirmDelete,
    handleCancelSelection,
    setShowForm,
    setShowDelete,
  } = useDataField();
  return (
    <>
      <ReorderableList
        hasCreate={hasCreate}
        hasRead={hasRead}
        hasUpdate={hasUpdate}
        hasDelete={hasDelete}
        title={t('common.data_fields')}
        list={fieldList}
        icon={<UtilityDataQueryExport />}
        editable
        onEdit={showEditForm}
        onDelete={showDeleteModal}
        inputDisabled={inputDisabled}
        onAdd={showAddForm}
        searchInputValue={fieldSearch ?? ''}
        reorderEnabled={fieldList && fieldList.length > 1}
        listContainerRef={fieldListRef}
        selectedListRef={fieldRef}
        selectedItem={selectedField}
        selectedDraggedList={selectedDragField!}
        isDragging={isDragging}
        onDragStart={handleFieldDrag}
        onSearchInputChange={handleFieldInputChange}
        handleChangeOrder={handleChangeOrder}
        handleCancelSelection={handleCancelSelection}
      />
      <Drawer
        icon={null}
        onClose={() => setShowForm((prev) => !prev)}
        onSubmit={handleFormSubmit}
        submitting={isPending}
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
            readOnly
            registered="categoryName"
            control={control}
            type={'string'}
            label={t('common.category') + ':'}
          />
          <Input
            registered="fieldName"
            control={control}
            type={'string'}
            label={t('common.field') + ':'}
          />
          {group === 'feedback' && (
            <Input
              registered="fieldIdName"
              control={control}
              type={'string'}
              label={t('common.field') + ' ID:'}
            />
          )}
        </div>
      </Drawer>
      <PopupDelete
        entityName={
          fieldList.find((field) => field.id === selectedField)?.name ?? ''
        }
        entityType="Field"
        onClose={() => setShowDelete((prev) => !prev)}
        onDelete={confirmDelete}
        open={showDelete}
        deleting={isDeletePending}
      />
    </>
  );
}

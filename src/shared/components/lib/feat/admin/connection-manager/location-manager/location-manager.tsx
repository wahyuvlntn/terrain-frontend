import { t } from '@digital-twin/utils';

import { Loading, PopupDelete } from '../../../../../index';
import AddLocationForm from './components/add-location-form';
import EditLocationForm from './components/edit-location-form';
import EquipmentList from './components/equipment-list';
import LocationTree from './components/location-tree';
import { useLocationManager } from './location-manager.hooks';
import styles from './location-manager.module.scss';

export const LocationManager = () => {
  const {
    showDeleteModal,
    showTargetBox,
    locationDetails,
    addDrawerOpen,
    editDrawerOpen,
    selectedLocationNode,
    locationTree,
    locationSearchInput,
    expandedItems,
    isPending,
    isFetchingLocation,
    isFetchingLocationDetails,
    locationSearchInputChangeHandler,
    selectedLocationNodeHandler,
    addLocationClickHandler,
    editLocationClickHandler,
    deleteLocationHandler,
    deleteConfirmHandler,
    onDragStart,
    onDrop,
    onDragOver,
    onDragEnd,
    refetchLocation,
    expandItem,
    collapseItem,
    setExpandedItems,
    setShowDeleteModal,

    selectedLocationChildsDel,
    isFetchingSelectedLocationChildsDel,
  } = useLocationManager();

  return (
    <div className={styles['location-manager-container']}>
      <Loading
        isLoading={
          isPending ||
          isFetchingLocation ||
          isFetchingLocationDetails ||
          isFetchingSelectedLocationChildsDel
        }
      />
      <PopupDelete
        entityType={t('common.location')}
        entityName={`${
          selectedLocationChildsDel && selectedLocationChildsDel.length > 0
            ? selectedLocationChildsDel
            : ''
        }`}
        onClose={() => setShowDeleteModal((prev) => !prev)}
        open={showDeleteModal}
        onDelete={deleteConfirmHandler}
        deleting={isPending}
      />
      <LocationTree
        onDragStart={onDragStart}
        showTargetBox={showTargetBox}
        expandedItems={expandedItems}
        expandItem={expandItem}
        collapseItem={collapseItem}
        selectedLocationNode={selectedLocationNode}
        locationSearchInput={locationSearchInput}
        locationTree={locationTree}
        locationSearchInputChangeHandler={locationSearchInputChangeHandler}
        selectedLocationNodeHandler={selectedLocationNodeHandler}
        addLocationClickHandler={addLocationClickHandler}
        editLocationClickHandler={editLocationClickHandler}
        deleteLocationHandler={deleteLocationHandler}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        isFetchingLocationDetails={isFetchingLocationDetails}
      />
      <EquipmentList editFormState={editDrawerOpen} />
      <AddLocationForm
        addLocationClickHandler={addLocationClickHandler}
        selectedLocationNode={selectedLocationNode}
        onClose={addLocationClickHandler}
        open={addDrawerOpen}
        refetchLocation={refetchLocation}
        locationDetails={locationDetails}
        setExpandedItems={setExpandedItems}
      />
      <EditLocationForm
        editLocationClickHandler={editLocationClickHandler}
        onClose={editLocationClickHandler}
        open={editDrawerOpen}
        expandedItems={expandedItems}
        refetchLocation={refetchLocation}
        locationDetails={locationDetails}
        selectedLocationNode={selectedLocationNode}
      />
    </div>
  );
};

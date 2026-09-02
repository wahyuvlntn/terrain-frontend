import { FilterDrawer, FilterDrawerShortcuts, FilterTree } from '@digital-twin/components';
import { BuildingShortcut, BuildingTree } from './filter.building';
import { CapacityShortcut, CapacityTree } from './filter.capacity';
import styles from './filter.drawer.module.scss';
import { EquipmentTypeShortcut, EquipmentTypeTree } from './filter.equipment-type';

export const PMFilterDrawer = () => {
  return (
    <FilterDrawer>
      <FilterDrawerShortcuts>
        <BuildingShortcut />
        <EquipmentTypeShortcut />
        <CapacityShortcut />
      </FilterDrawerShortcuts>
      <FilterTree className={styles['filter-tree']}>
        <BuildingTree />
        <EquipmentTypeTree />
        <CapacityTree />
      </FilterTree>
    </FilterDrawer>
  );
};

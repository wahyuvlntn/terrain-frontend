import {
  FilterDrawerToggleButton,
  FilterShortcut,
  FilterShortcutContainer,
} from '@digital-twin/components';
import { BuildingShortcut } from './filter.building';
import { CapacityShortcut } from './filter.capacity';
import { EquipmentTypeShortcut } from './filter.equipment-type';

export const PMFilterShortcut = () => {
  return (
    <FilterShortcutContainer>
      <FilterDrawerToggleButton />
      <FilterShortcut>
        <BuildingShortcut />
        <EquipmentTypeShortcut />
        <CapacityShortcut />
      </FilterShortcut>
    </FilterShortcutContainer>
  );
};

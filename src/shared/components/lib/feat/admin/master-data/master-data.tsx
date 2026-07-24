import { DataCategory } from './components/data-category';
import { DataField } from './components/data-field';
import { DataGroup } from './components/data-group';
import { useMasterData } from './master-data.hook';
import styles from './master-data.module.scss';

export function MasterData() {
  const { dataGroup, selectedDataGroup, handleSelectDataGroup } =
    useMasterData();
  return (
    <div className={styles['master-data-container']}>
      <DataGroup
        dataGroup={dataGroup}
        selectedDataGroup={selectedDataGroup}
        handleSelectDataGroup={handleSelectDataGroup}
      />
      <DataCategory />
      <DataField />
    </div>
  );
}

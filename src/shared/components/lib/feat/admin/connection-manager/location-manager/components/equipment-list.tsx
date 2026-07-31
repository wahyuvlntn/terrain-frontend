import { FlowsheetFill as FlowsheetFillIcon } from '@digital-twin/icons';
import { createTranslationKey, t } from '@digital-twin/utils';

import {
  COLOR,
  Container,
  DropdownMultiple,
  Pagination,
  Table,
} from '../../../../../../index';
import { useEquipmentList } from './equipment-list.hooks';
import styles from './equipment-list.module.scss';
import HighlightedColumn from './highlighted-column';

interface EquipmentListProps {
  editFormState: boolean;
}

export default function EquipmentList({ editFormState }: EquipmentListProps) {
  const {
    sortedColumns,
    equipmentList,
    brandDropdown,
    modelDropdown,
    assetDropdown,
    licenseDropdown,
    selectedLicenses,
    selectedBrands,
    selectedModels,
    selectedAssets,
    searchParams,
    handleModelChange,
    handleBrandChange,
    handleAssetChange,
    handleSortColumn,
    handleLicenseChange,
    setSearchParams,
  } = useEquipmentList(editFormState);
  return (
    <div className={styles['equipment-list-main']}>
      <Container
        title={t('common.equipment_list')}
        icon={<FlowsheetFillIcon />}
        className={styles['equipment-list-container']}
        background={'none'}
      >
        <div className={styles['filters']}>
          <DropdownMultiple
            options={modelDropdown ?? []}
            value={selectedModels}
            label={t('common.model') + ':'}
            labelPosition="left"
            onChange={handleModelChange}
            wrapperClassName={styles.dropdown}
          />
          <DropdownMultiple
            options={brandDropdown ?? []}
            value={selectedBrands}
            label={t('common.brand') + ':'}
            labelPosition="left"
            onChange={handleBrandChange}
            wrapperClassName={styles.dropdown}
          />
          {/* <DropdownMultiple label="Industrial Gateway" labelPosition="left" /> */}
          <DropdownMultiple
            options={licenseDropdown ?? []}
            value={selectedLicenses}
            label={t('common.license') + ':'}
            labelPosition="left"
            onChange={handleLicenseChange}
            wrapperClassName={styles.dropdown}
          />
          <DropdownMultiple
            options={assetDropdown ?? []}
            value={selectedAssets}
            label={t('common.equipment_id') + ':'}
            labelPosition="left"
            onChange={handleAssetChange}
            wrapperClassName={styles.dropdown}
          />
        </div>
        <div className={styles['equipment-list-table']}>
          <Table
            sortable
            handleSortColumn={handleSortColumn}
            columns={sortedColumns}
            rows={
              equipmentList
                ? equipmentList.map((item, idx) => {
                    return {
                      id: item.assetId.toString(),
                      location: item.locationName,
                      equipmentID: item.assetName,
                      // industrialGateway: (
                      //   <div style={{display:'flex',gap:6,justifyContent:'center'}}>
                      //     <HighlightedColumn
                      //       key={idx + item.industrialGateway + 'label'}
                      //       labels={[
                      //         {
                      //           value: item.industrialGateway,
                      //           width: 150,
                      //           color: BORDER.strokeAxisPrimaryDarker,
                      //           radius : 6
                      //         },
                      //       ]}
                      //     />
                      //     <HighlightedColumn
                      //       key={idx + item.industrialGateway + 'placeholder'}
                      //       labels={[
                      //         {
                      //           value: "2+",
                      //           width: 36,
                      //           color: BORDER.strokeAxisPrimaryDarker,
                      //           radius:10
                      //         },
                      //       ]}
                      //     />
                      //   </div>
                      // ),
                      model: item.modelName,
                      brand: item.brandName,
                      series: item.seriesName,
                      license: (
                        <HighlightedColumn
                          key={idx + item.license}
                          labels={[
                            {
                              value: item.license,
                              label: t(
                                `common.${createTranslationKey(item.license)}`
                              ),
                              width: 126,
                              color:
                                item.license === 'Base'
                                  ? COLOR.pelorous500
                                  : '#8E8EFF',
                              radius: 6,
                              isActive: item.isLicenseActive,
                            },
                          ]}
                        />
                      ),
                    };
                  })
                : []
            }
          />
        </div>
        <div className={styles['pagination']}>
          <Pagination
            searchParams={searchParams}
            setSearchParams={setSearchParams}
            variant="arrow"
            count={
              equipmentList && equipmentList.length > 0
                ? equipmentList[0].count
                : 0
            }
            limit={15}
          />
        </div>
      </Container>
    </div>
  );
}

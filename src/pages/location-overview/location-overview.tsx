import { Input, InputDuration, LastUpdated, Loading, Pagination } from '@digital-twin/components';
import { Search } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import { addYears } from 'date-fns';

import { LocationCard } from './components/location-card';
import LocationLegend from './components/location-legend';
import { useLocationOverview } from './location-overview.hook';
import styles from './location-overview.module.scss';

export const LocationOverview = () => {
  const {
    searchInput,
    selectedStartDate,
    selectedEndDate,
    locationDetails,
    searchParams,
    isFetching,
    setSearchParams,
    handleSelectLocation,
    handleDateChange,
    handleSearchInputChange,
  } = useLocationOverview();

  // const { loading, handleExportFile } = useLocationOverviewExport();

  return (
    <div className={styles['location-overview']}>
      <div className={styles['location-filters']}>
        <div className={styles['location-breadcrumbs']}>
          <LocationLegend />
          {/* {locationHistory && JSON.parse(locationHistory).length > 0 ? (
            <>
              <Factory
                className={styles['breadcrumb-icon']}
                style={{ cursor: 'pointer', minWidth: 24 }}
                //TODO: remove e since it's not used
                onClick={(_e) => {
                  handleSelectBreadCrumb(null);
                }}
              />
              <ChevronRight
                className={styles['breadcrumb-icon']}
                style={{
                  height: 18,
                  width: 18,
                  minWidth: 18,
                }}
              />
              {firstBreadcrumbsLoc && (
                <span
                  key={firstBreadcrumbsLoc.locationId}
                  style={{ whiteSpace: 'nowrap' }}
                  className={styles['location-crumb']}
                  //TODO: remove e since it's not used
                  onClick={(_e) => {
                    handleSelectBreadCrumb(
                      firstBreadcrumbsLoc.locationId?.toString() || null
                    );
                  }}
                >
                  {firstBreadcrumbsLoc.locationName}
                </span>
              )}
            </>
          ) : (
            <Factory
              className={styles['breadcrumb-icon']}
              style={{ cursor: 'pointer', minWidth: 24 }}
            />
          )}
          {hiddenBreadcrumbsLoc.length > 0 && (
            <div className={styles['breadcrumb-hidden']}>
              <ChevronRight
                style={{
                  height: 18,
                  width: 18,
                  minWidth: 18,
                }}
              />
              <div
                className={styles['breadcrumb-hidden__icon']}
                onClick={(e) => {
                  const posHiddenParent =
                    e.currentTarget.getBoundingClientRect();
                  setPosHiddenParent((prev) => ({
                    ...prev,
                    show: !prev.show,
                    x: posHiddenParent.x,
                    y: posHiddenParent.y + 50,
                  }));
                }}
              >
                <SvgMoreVertIcon />
              </div>
              {posHiddenParent.show && (
                <div
                  ref={refHiddenParent}
                  className={styles['breadcrumb-hidden__data']}
                  style={{
                    left: posHiddenParent.x,
                    top: posHiddenParent.y,
                  }}
                >
                  <div className={styles['breadcrumb-hidden__data__content']}>
                    {hiddenBreadcrumbsLoc.map((el, key) => (
                      <div
                        className={
                          styles['breadcrumb-hidden__data__content__arrow']
                        }
                      >
                        <ChevronRight
                          style={{
                            height: 18,
                            width: 18,
                            minWidth: 18,
                          }}
                        />
                        <span
                          className={
                            styles['breadcrumb-hidden__data__content__list']
                          }
                          key={key}
                          //TODO: remove e since it's not used
                          onClick={(_e) => {
                            handleSelectBreadCrumb(
                              el.locationId?.toString() || null
                            );
                            setPosHiddenParent({
                              show: false,
                              x: 0,
                              y: 0,
                            });
                          }}
                        >
                          {el.locationName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )} */}

          {/* <div className={styles['breadcrumb-data']}>
            {locationHistory &&
              breadCrumbsLoc.map((location, idx) => {
                if (idx === breadCrumbsLoc.length - 1) {
                  return (
                    <>
                      <ChevronRight
                        style={{
                          height: 18,
                          width: 18,
                          minWidth: 18,
                        }}
                      />
                      <span key={idx} style={{ whiteSpace: 'nowrap' }}>
                        {location.locationName}
                      </span>
                    </>
                  );
                }
                return (
                  <div
                    key={idx}
                    style={{
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <ChevronRight
                      style={{
                        height: 18,
                        width: 18,
                        minWidth: 18,
                      }}
                    />
                    <span
                      key={location.locationId?.toString()}
                      className={styles['location-crumb']}
                      //TODO: remove e since it's not used
                      onClick={(_e) => {
                        handleSelectBreadCrumb(
                          location.locationId?.toString() || null
                        );
                      }}
                    >
                      {location.locationName}
                    </span>
                  </div>
                );
              })}
          </div> */}
        </div>
        <div
          className={'ribbon-item'}
          style={{ overflow: 'auto', minWidth: '700px', justifyContent: 'flex-end' }}
        >
          <Input
            value={searchInput}
            onChange={handleSearchInputChange}
            placeholder={t('common.search_location')}
            suffix={<Search />}
            wrapperProps={{ style: { minWidth: 235 } }}
          />
          {selectedEndDate && selectedStartDate && (
            <InputDuration
              type="daterange"
              onChange={handleDateChange}
              endDate={new Date(selectedEndDate + 'T00:00:00.000')}
              startDate={new Date(selectedStartDate + 'T00:00:00.000')}
              yearOffset={5}
              minDate={addYears(new Date(), -1)}
              maxDate={new Date()}
              DaterangePickerProps={{ weekStartsOn: 1 }}
            />
          )}

          {/* <Button
            icon={<ExportNotes />}
            onClick={handleExportFile}
            disabled={loading}
          >
            {t('common.export')}
          </Button> */}
          <LastUpdated />
        </div>
      </div>
      <div
        style={{
          gridAutoRows: `minmax(350px, ${
            locationDetails && locationDetails.data && locationDetails.data.length <= 3
              ? '0.5fr'
              : '1fr'
          })`,
          marginBottom:
            locationDetails && locationDetails.data && locationDetails.data.length <= 3
              ? 16
              : undefined,
        }}
        className={styles['location-overview-grid']}
      >
        <Loading isLoading={isFetching} />
        {locationDetails &&
          locationDetails.data &&
          locationDetails.data.map((location, idx) => (
            <LocationCard
              key={idx}
              locationId={location.locationId}
              locationName={location.locationName}
              locationImagePath={location.locationImagePath}
              totalAsset={location.totalAsset}
              totalCriticalAsset={location.totalCriticalAsset}
              totalIdleAsset={location.totalIdleAsset}
              totalNormalAsset={location.totalNormalAsset}
              totalPlannedDownAsset={location.totalPlannedDownAsset}
              totalRunningAsset={location.totalRunningAsset}
              totalUnplannedDownAsset={location.totalUnplannedDownAsset}
              totalOfflineAsset={location.totalOfflineAsset}
              totalWarningAsset={location.totalWarningAsset}
              availabilityTh={location.availabilityTh}
              qualityTh={location.qualityTh}
              performanceTh={location.performanceTh}
              oeeLimit={
                (location.availabilityTh * location.performanceTh * location.qualityTh) / 10000
              }
              isLastChild={location.isLastChild}
              handleSelectLocation={handleSelectLocation}
              isPreview={false}
            />
          ))}
      </div>
      <div className={styles['location-overview-pagination']}>
        <Pagination
          count={locationDetails?.count ?? 0}
          limit={6}
          variant="arrow"
          searchParams={searchParams}
          setSearchParams={setSearchParams}
        />
      </div>
    </div>
  );
};
